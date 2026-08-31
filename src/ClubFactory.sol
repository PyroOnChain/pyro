// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ClubVault} from "./ClubVault.sol";
import {IPonsFactory, IFeeEscrow, TokenParams} from "./interfaces/IPonsV2.sol";

/**
 * @title ClubFactory
 * @notice Opens a club: deploys the jar, launches the mascot on Pons paired against the stock,
 *         and binds the mascot's creator fees to the jar. One transaction.
 *
 * @dev Clubs are permissionless and many clubs may exist for the same ticker. Enforcing one club
 *      per ticker just means somebody squats NVDA on day one; let the frontend rank by TVL.
 */
contract ClubFactory is Ownable2Step {
    using SafeERC20 for IERC20;

    uint256 public constant BPS = 10_000;
    uint16 public constant MAX_PROTOCOL_FEE_BPS = 1_000; // hard ceiling, cannot be raised

    IPonsFactory public immutable pons;
    IFeeEscrow public immutable escrow;

    address public treasury;
    address public guardian;
    uint16 public protocolFeeBps;      // cut of each harvest; starts at 0
    uint16 public defaultExitFeeBps;
    uint16 public defaultBountyBps;

    /// @notice Minimum seed deposit to open a club, per stock token. Zero == that asset is not enabled.
    mapping(address => uint256) public minSeed;

    address[] public allClubs;
    mapping(address => address[]) public clubsByAsset;

    event ClubCreated(
        address indexed vault,
        address indexed asset,
        address indexed creator,
        address mascot,
        uint256 seed,
        uint16 creatorFeeBps
    );
    event MinSeedSet(address indexed asset, uint256 minSeed);
    event ProtocolFeeSet(uint16 bps);
    event TreasurySet(address treasury);
    event GuardianSet(address guardian);

    error AssetNotEnabled();
    error SeedTooSmall();
    error FeeTooHigh();
    error ZeroAddress();
    error PairNotSupported();
    error InsufficientLaunchFee();
    error RefundFailed();

    constructor(IPonsFactory pons_, address treasury_, address guardian_, address owner_) Ownable(owner_) {
        if (treasury_ == address(0) || guardian_ == address(0)) revert ZeroAddress();
        pons = pons_;
        escrow = IFeeEscrow(pons_.feeEscrow());
        treasury = treasury_;
        guardian = guardian_;
        defaultExitFeeBps = 50;  // 0.5%, stays in the jar
        defaultBountyBps = 25;   // 0.25% to whoever calls harvest()
        protocolFeeBps = 0;      // we take nothing at launch
    }

    /**
     * @notice Open a club.
     * @param asset      the tokenized stock (e.g. NVDA 0xd0601C...). Must also be a supported
     *                   Pons pair token -- verified on-chain for NVDA.
     * @param seed       creator's opening deposit, minted to them as shares.
     * @param params     Pons TokenParams. `creatorFeeRecipient` is overwritten with the new vault.
     * @param creatorFeeBps creator's share of each harvest, capped at 20% by the vault.
     */
    function createClub(
        address asset,
        uint256 seed,
        string calldata clubName,
        string calldata clubSymbol,
        uint16 creatorFeeBps,
        TokenParams memory params,
        uint256 launchConfigId
    ) external payable returns (address vault, address mascot) {
        uint256 min = minSeed[asset];
        if (min == 0) revert AssetNotEnabled();
        if (seed < min) revert SeedTooSmall();

        // The mascot must be priced in the stock itself -- that is what makes creator fees arrive
        // as NVDA and removes the swap from the harvest path entirely.
        (, uint256 threshold,) = pons.pairTokenEconomics(asset);
        if (threshold == 0) revert PairNotSupported();

        ClubVault v = new ClubVault(
            IERC20(asset),
            clubName,
            clubSymbol,
            msg.sender,
            creatorFeeBps,
            defaultExitFeeBps,
            defaultBountyBps,
            pons,
            escrow
        );
        vault = address(v);

        // Seed the jar first, so the club is never live with an empty vault.
        IERC20(asset).safeTransferFrom(msg.sender, address(this), seed);
        IERC20(asset).forceApprove(vault, seed);
        v.deposit(seed, msg.sender);

        // Bind the mascot's fee stream to the jar at birth.
        // Forward exactly the launch fee and hand back any excess: Pons keeps whatever it is
        // sent, so blindly forwarding msg.value silently donates a fat-fingered overpayment.
        uint256 fee = pons.launchFee();
        if (msg.value < fee) revert InsufficientLaunchFee();
        params.creatorFeeRecipient = vault;
        (mascot,) = pons.launchToken{value: fee}(params, launchConfigId, asset);

        uint256 refund = msg.value - fee;
        if (refund != 0) {
            (bool sent,) = msg.sender.call{value: refund}("");
            if (!sent) revert RefundFailed();
        }

        v.addMascot(mascot);

        allClubs.push(vault);
        clubsByAsset[asset].push(vault);

        emit ClubCreated(vault, asset, msg.sender, mascot, seed, creatorFeeBps);
    }

    // ---------------------------------------------------------------- views

    function allClubsLength() external view returns (uint256) {
        return allClubs.length;
    }

    function clubsByAssetLength(address asset) external view returns (uint256) {
        return clubsByAsset[asset].length;
    }

    // ---------------------------------------------------------------- admin

    function setMinSeed(address asset, uint256 amount) external onlyOwner {
        minSeed[asset] = amount;
        emit MinSeedSet(asset, amount);
    }

    function setProtocolFeeBps(uint16 bps) external onlyOwner {
        if (bps > MAX_PROTOCOL_FEE_BPS) revert FeeTooHigh();
        protocolFeeBps = bps;
        emit ProtocolFeeSet(bps);
    }

    function setTreasury(address t) external onlyOwner {
        if (t == address(0)) revert ZeroAddress();
        treasury = t;
        emit TreasurySet(t);
    }

    function setGuardian(address g) external onlyOwner {
        if (g == address(0)) revert ZeroAddress();
        guardian = g;
        emit GuardianSet(g);
    }

    function setDefaults(uint16 exitFeeBps_, uint16 bountyBps_) external onlyOwner {
        defaultExitFeeBps = exitFeeBps_;
        defaultBountyBps = bountyBps_;
    }
}
