// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {IPonsFactory, IFeeEscrow} from "./interfaces/IPonsV2.sol";

interface IClubFactory {
    function protocolFeeBps() external view returns (uint16);
    function treasury() external view returns (address);
    function guardian() external view returns (address);
}

/**
 * @title ClubVault
 * @notice A group jar for one tokenized stock.
 *
 *  Deposit NVDA -> receive transferable share tokens.
 *  The club's mascot memecoin is launched on Pons PAIRED AGAINST NVDA, with this vault set as
 *  `creatorFeeRecipient`. Mascot trades therefore accrue creator fees denominated in NVDA.
 *  harvest() pulls them into the jar. Every share is worth more NVDA than before.
 *
 *  There is no swap anywhere in this contract. That is the whole point of pairing against the
 *  stock instead of ETH: no DEX dependency, no oracle, no slippage, no sandwich risk.
 *
 * @dev ACCOUNTING NOTE. The stock token implements ERC-8056 (Scaled UI Amount): dividends and
 *      splits move `uiMultiplier()`, while raw `balanceOf` never changes. We account exclusively
 *      in RAW balances. Dividends therefore accrue pro-rata to all shareholders for free, and the
 *      frontend is responsible for multiplying by uiMultiplier() for display.
 *
 * @dev SOLVENCY NOTE. The issuer holds mint/burn/pause on the stock token and can upgrade it via
 *      a shared beacon. totalAssets() therefore reads the LIVE balance every time and never a
 *      cached counter. If the issuer burns from this vault, NAV falls for everyone at once
 *      instead of letting whoever exits first drain the remainder.
 */
contract ClubVault is ERC4626, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant BPS = 10_000;
    uint256 public constant DRIP_DURATION = 24 hours;
    uint256 public constant MAX_CREATOR_FEE_BPS = 2_000; // 20%
    uint256 public constant MAX_EXIT_FEE_BPS = 200;      // 2%
    uint256 public constant MAX_BOUNTY_BPS = 100;        // 1%
    uint256 public constant RECIPIENT_TIMELOCK = 3 days;

    IClubFactory public immutable clubFactory;
    IPonsFactory public immutable pons;
    IFeeEscrow public immutable escrow;

    address public immutable creator;
    uint16 public immutable creatorFeeBps;   // creator's share of each harvest
    uint16 public immutable exitFeeBps;      // stays in the jar, for the people who stayed
    uint16 public immutable harvestBountyBps; // paid to whoever calls harvest()

    address[] public mascots;
    mapping(address => bool) public isMascot;

    /// @dev Undripped harvest. Excluded from totalAssets and released linearly over DRIP_DURATION
    ///      so nobody can deposit seconds before a harvest, capture it, and leave.
    uint192 public lastLockedProfit;
    uint64 public lastHarvestAt;

    mapping(bytes32 => uint256) public recipientChangeQueuedAt;

    event Harvested(address indexed caller, uint256 gross, uint256 net, uint256 protocolCut, uint256 creatorCut, uint256 bounty);
    event MascotAdded(address indexed mascot);
    event RecipientChangeQueued(address indexed token, address indexed newRecipient, uint256 executableAt);
    event RecipientChangeExecuted(address indexed token, address indexed newRecipient);
    event RecipientChangeCancelled(address indexed token, address indexed newRecipient);

    error NotFactory();
    error NotCreator();
    error NotGuardian();
    error NothingToHarvest();
    error FeeTooHigh();
    error AlreadyMascot();
    error CannotSweepAsset();
    error TimelockPending();
    error NotQueued();

    modifier onlyGuardian() {
        if (msg.sender != clubFactory.guardian()) revert NotGuardian();
        _;
    }

    constructor(
        IERC20 asset_,
        string memory name_,
        string memory symbol_,
        address creator_,
        uint16 creatorFeeBps_,
        uint16 exitFeeBps_,
        uint16 harvestBountyBps_,
        IPonsFactory pons_,
        IFeeEscrow escrow_
    ) ERC20(name_, symbol_) ERC4626(asset_) {
        if (
            creatorFeeBps_ > MAX_CREATOR_FEE_BPS || exitFeeBps_ > MAX_EXIT_FEE_BPS
                || harvestBountyBps_ > MAX_BOUNTY_BPS
        ) revert FeeTooHigh();

        clubFactory = IClubFactory(msg.sender);
        creator = creator_;
        creatorFeeBps = creatorFeeBps_;
        exitFeeBps = exitFeeBps_;
        harvestBountyBps = harvestBountyBps_;
        pons = pons_;
        escrow = escrow_;
    }

    /// @dev Pons pays native ETH via a full-gas call{value:} for ETH-paired launches. We pair
    ///      against the stock token, so this should never fire -- but a reverting receive() on a
    ///      fee recipient is a classic way to brick a protocol, so we accept it and let the
    ///      guardian sweep it out.
    receive() external payable {}

    // ---------------------------------------------------------------- accounting

    /// @dev Virtual shares. Blocks the classic ERC-4626 first-depositor / donation inflation attack.
    function _decimalsOffset() internal pure override returns (uint8) {
        return 3;
    }

    function lockedProfit() public view returns (uint256) {
        uint256 locked = lastLockedProfit;
        if (locked == 0) return 0;
        uint256 elapsed = block.timestamp - lastHarvestAt;
        if (elapsed >= DRIP_DURATION) return 0;
        unchecked {
            return (locked * (DRIP_DURATION - elapsed)) / DRIP_DURATION;
        }
    }

    /// @dev Always the live balance. Never a cached counter -- see SOLVENCY NOTE above.
    function totalAssets() public view override returns (uint256) {
        uint256 bal = IERC20(asset()).balanceOf(address(this));
        uint256 locked = lockedProfit();
        return bal > locked ? bal - locked : 0;
    }

    // ---------------------------------------------------------------- exit fee
    // The fee is simply not transferred out, so it stays in the jar and lifts NAV for everyone
    // who did not leave. No transfer, no recipient, nothing to misconfigure.

    function _feeOnTotal(uint256 assets, uint256 bps) internal pure returns (uint256) {
        return Math.mulDiv(assets, bps, bps + BPS, Math.Rounding.Ceil);
    }

    function _feeOnRaw(uint256 assets, uint256 bps) internal pure returns (uint256) {
        return Math.mulDiv(assets, bps, BPS, Math.Rounding.Ceil);
    }

    function previewRedeem(uint256 shares) public view override returns (uint256) {
        uint256 assets = super.previewRedeem(shares);
        return assets - _feeOnTotal(assets, exitFeeBps);
    }

    function previewWithdraw(uint256 assets) public view override returns (uint256) {
        return super.previewWithdraw(assets + _feeOnRaw(assets, exitFeeBps));
    }

    function maxWithdraw(address owner) public view override returns (uint256) {
        return previewRedeem(balanceOf(owner));
    }

    /**
     * @notice Deposit in ONE transaction, using the stock token's ERC-2612 permit.
     * @dev The stock token implements permit (verified on mainnet: permit/nonces/
     *      DOMAIN_SEPARATOR/eip712Domain are all present), so there is no reason to make
     *      depositors send a separate approve.
     *      The permit call is wrapped in try/catch on purpose: anyone can watch the mempool,
     *      front-run the signature by submitting the permit themselves, and make permit()
     *      revert on nonce reuse. That would brick an honest deposit. Swallowing the revert
     *      is safe because the transferFrom inside deposit() still enforces the allowance.
     */
    function depositWithPermit(
        uint256 assets,
        address receiver,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external returns (uint256 shares) {
        try IERC20Permit(asset()).permit(msg.sender, address(this), assets, deadline, v, r, s) {} catch {}
        return deposit(assets, receiver);
    }

    // ---------------------------------------------------------------- harvest

    /**
     * @notice Pull accrued mascot creator fees out of the Pons escrow and into the jar.
     * @dev Permissionless by design, with a bounty, so keeper bots do it for free.
     *      The escrow's claim functions are msg.sender-scoped -- there is no claimFor(recipient) --
     *      so the VAULT has to be the caller. That is why this function exists at all.
     *      The escrow keys balances by (recipient, quoteToken), so a single claimToken() sweeps
     *      the fees of every mascot this club has ever launched. No per-mascot loop needed.
     */
    function harvest() external nonReentrant returns (uint256 net) {
        IERC20 a = IERC20(asset());

        // The live Pons escrow reverts with NoBalance() rather than no-opping on a zero
        // balance (confirmed against mainnet). Check first so a keeper polling an idle club
        // gets our own error instead of an opaque one from someone else's contract.
        if (escrow.balanceOfToken(address(this), address(a)) == 0) revert NothingToHarvest();

        uint256 before = a.balanceOf(address(this));
        escrow.claimToken(address(a));

        uint256 gained = a.balanceOf(address(this)) - before;
        if (gained == 0) revert NothingToHarvest();

        uint256 protocolCut = (gained * clubFactory.protocolFeeBps()) / BPS;
        uint256 creatorCut = (gained * creatorFeeBps) / BPS;
        uint256 bounty = (gained * harvestBountyBps) / BPS;

        if (protocolCut != 0) a.safeTransfer(clubFactory.treasury(), protocolCut);
        if (creatorCut != 0) a.safeTransfer(creator, creatorCut);
        if (bounty != 0) a.safeTransfer(msg.sender, bounty);

        net = gained - protocolCut - creatorCut - bounty;

        // Add to the undripped pile rather than jumping NAV in one block.
        lastLockedProfit = uint192(lockedProfit() + net);
        lastHarvestAt = uint64(block.timestamp);

        emit Harvested(msg.sender, gained, net, protocolCut, creatorCut, bounty);
    }

    function pendingFees() external view returns (uint256) {
        return escrow.balanceOfToken(address(this), asset());
    }

    // ---------------------------------------------------------------- mascots

    function addMascot(address mascot) external {
        if (msg.sender != address(clubFactory) && msg.sender != creator) revert NotFactory();
        if (isMascot[mascot]) revert AlreadyMascot();
        isMascot[mascot] = true;
        mascots.push(mascot);
        emit MascotAdded(mascot);
    }

    function mascotCount() external view returns (uint256) {
        return mascots.length;
    }

    function currentMascot() external view returns (address) {
        uint256 n = mascots.length;
        return n == 0 ? address(0) : mascots[n - 1];
    }

    // ------------------------------------------------------- fee-recipient escape hatch
    // Pons allows ONLY the current recipient to call transferCreatorFeeRecipient. Since this
    // vault is the recipient, without a passthrough the setting would be frozen forever and a
    // Pons-side migration would strand the club. But an instant passthrough is also the single
    // most dangerous function here -- it can redirect depositors' entire yield stream. So it is
    // guardian-gated AND timelocked, and the club creator can veto.

    function queueFeeRecipientChange(address token, address newRecipient) external onlyGuardian {
        bytes32 k = keccak256(abi.encode(token, newRecipient));
        recipientChangeQueuedAt[k] = block.timestamp;
        emit RecipientChangeQueued(token, newRecipient, block.timestamp + RECIPIENT_TIMELOCK);
    }

    function executeFeeRecipientChange(address token, address newRecipient) external onlyGuardian {
        bytes32 k = keccak256(abi.encode(token, newRecipient));
        uint256 q = recipientChangeQueuedAt[k];
        if (q == 0) revert NotQueued();
        if (block.timestamp < q + RECIPIENT_TIMELOCK) revert TimelockPending();
        delete recipientChangeQueuedAt[k];
        pons.transferCreatorFeeRecipient(token, newRecipient);
        emit RecipientChangeExecuted(token, newRecipient);
    }

    /// @notice Either the guardian or the club's own creator can veto a queued redirect.
    function cancelFeeRecipientChange(address token, address newRecipient) external {
        if (msg.sender != creator && msg.sender != clubFactory.guardian()) revert NotCreator();
        bytes32 k = keccak256(abi.encode(token, newRecipient));
        if (recipientChangeQueuedAt[k] == 0) revert NotQueued();
        delete recipientChangeQueuedAt[k];
        emit RecipientChangeCancelled(token, newRecipient);
    }

    /// @notice Rescue tokens that are not the jar asset (stray mascot dust, airdrops, ETH).
    function sweep(address token) external onlyGuardian {
        if (token == asset()) revert CannotSweepAsset();
        address to = clubFactory.treasury();
        if (token == address(0)) {
            (bool ok,) = to.call{value: address(this).balance}("");
            require(ok, "eth sweep failed");
        } else {
            IERC20(token).safeTransfer(to, IERC20(token).balanceOf(address(this)));
        }
    }
}
