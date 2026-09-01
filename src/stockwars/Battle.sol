// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IPonsFactory, IFeeEscrow, TokenParams} from "../interfaces/IPonsV2.sol";
import {IPonsCurve} from "../interfaces/IPonsCurve.sol";

/**
 * @title Battle
 * @notice One Stock Wars match: two memecoins launched in the same block, priced
 *         against the same tokenized stock, competing for an hour on market cap.
 *         The side that reached the higher peak takes BOTH tokens' creator fees,
 *         paid out in that stock, forever.
 *
 * @dev Three things drive the shape of this contract.
 *
 *      ONE, custody. The arena buys with `recipient = address(this)` and holds the
 *      meme tokens, crediting an internal position instead. A transferable ERC-20
 *      in a user's own wallet cannot be time-weighted on chain: there is no holder
 *      enumeration and no historical balanceOf. Owning the ledger removes the need
 *      for an off-chain merkle root and the trusted publisher that comes with it.
 *
 *      TWO, one contract per match. The Pons escrow pays a lump sum per
 *      (recipient, quote asset). A shared arena holding fee rights for many matches
 *      would receive one undifferentiated pile of stock with no way to attribute it,
 *      so each match gets its own address and its own escrow balance.
 *
 *      THREE, fees keep arriving after the bell. The pot is not a snapshot, so payouts
 *      use an accumulator rather than dividing a fixed balance. A player's weight is
 *      frozen at the deadline; what grows is the amount owed per unit of weight.
 */
contract Battle is ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint8 public constant SIDE_A = 1;
    uint8 public constant SIDE_B = 2;
    uint256 private constant ACC = 1e27;

    // ------------------------------------------------------------------ config
    IPonsFactory public pons;
    IFeeEscrow public escrow;
    IERC20 public stock; // the tokenized stock both tokens are priced against

    address public tokenA;
    address public tokenB;
    IPonsCurve public curveA;
    IPonsCurve public curveB;

    uint64 public startAt;
    uint64 public endAt;

    // ------------------------------------------------------------------ contest
    uint256 public peakA;
    uint256 public peakB;

    /// @notice 0 while unsettled or on a draw, otherwise SIDE_A / SIDE_B.
    uint8 public winner;
    bool public settled;

    /// @dev Sum of the winning side's weights, fixed at settlement. On a draw both
    ///      sides win and this is the sum of the two.
    uint256 public winningWeight;

    /// @dev Stock owed per unit of weight, scaled by ACC. Grows on every harvest.
    uint256 public accPerWeight;
    uint256 public totalHarvested;

    struct SideState {
        uint256 tokens; // meme tokens the arena custodies for this side
        uint256 weight; // Σ tokens × seconds, accrued only inside the window
        uint64 lastSync;
    }

    struct Position {
        uint256 tokens;
        uint256 weight;
        uint64 lastSync;
        uint256 claimed; // stock already paid out to this position
    }

    mapping(uint8 => SideState) public sides;
    mapping(uint8 => mapping(address => Position)) public positions;

    // ------------------------------------------------------------------ events
    event Entered(uint8 indexed side, address indexed who, uint256 stockIn, uint256 tokensOut);
    event Deposited(uint8 indexed side, address indexed who, uint256 tokens);
    event Withdrawn(uint8 indexed side, address indexed who, uint256 tokens);
    event Peak(uint8 indexed side, uint256 reserve);
    event Settled(uint8 winner, uint256 peakA, uint256 peakB, uint256 winningWeight);
    event Harvested(uint256 amount, uint256 accPerWeight);
    event Claimed(address indexed who, uint256 amount);

    error AlreadyInitialized();
    error NotStarted();
    error Over();
    error NotOver();
    error AlreadySettled();
    error NotSettled();
    error BadSide();
    error NothingToClaim();
    error NotAWinner();
    error ZeroAmount();
    error NoWeight();

    bool private _init;

    // ------------------------------------------------------------------ setup

    /**
     * @notice Launch both memecoins and open the match.
     * @dev Called once by the factory on a fresh clone. Both tokens are launched from
     *      here so this contract is their creator-fee recipient, and both land in the
     *      same transaction so neither side gets a head start.
     */
    function initialize(
        IPonsFactory pons_,
        IERC20 stock_,
        TokenParams memory a,
        TokenParams memory b,
        uint256 launchConfigId,
        uint64 duration
    ) external payable {
        if (_init) revert AlreadyInitialized();
        _init = true;

        pons = pons_;
        escrow = IFeeEscrow(pons_.feeEscrow());
        stock = stock_;

        uint256 fee = pons_.launchFee();
        a.creatorFeeRecipient = address(this);
        b.creatorFeeRecipient = address(this);

        (address ta, address ca) = pons_.launchToken{value: fee}(a, launchConfigId, address(stock_));
        (address tb, address cb) = pons_.launchToken{value: fee}(b, launchConfigId, address(stock_));

        tokenA = ta;
        tokenB = tb;
        curveA = IPonsCurve(ca);
        curveB = IPonsCurve(cb);

        startAt = uint64(block.timestamp);
        endAt = uint64(block.timestamp) + duration;
        sides[SIDE_A].lastSync = startAt;
        sides[SIDE_B].lastSync = startAt;

        _samplePeaks();

        // Hand back anything the launch fee did not consume rather than stranding it.
        uint256 left = address(this).balance;
        if (left > 0) {
            (bool ok,) = msg.sender.call{value: left}("");
            ok; // a factory that refuses ETH should not brick a match
        }
    }

    // ------------------------------------------------------------------ playing

    /// @notice Spend stock on one side. The arena buys and custodies the tokens.
    function enter(uint8 side, uint256 stockIn, uint256 minTokensOut) external nonReentrant returns (uint256) {
        return _enter(side, msg.sender, stockIn, minTokensOut);
    }

    /// @notice Enter on someone else's behalf: the caller pays, the beneficiary holds
    ///         the position. The factory uses this to seed both sides for whoever
    ///         started the match.
    function enterFor(uint8 side, address beneficiary, uint256 stockIn, uint256 minTokensOut)
        external
        nonReentrant
        returns (uint256)
    {
        return _enter(side, beneficiary, stockIn, minTokensOut);
    }

    function _enter(uint8 side, address beneficiary, uint256 stockIn, uint256 minTokensOut)
        internal
        returns (uint256 out)
    {
        _live(side);
        if (stockIn == 0) revert ZeroAmount();

        stock.safeTransferFrom(msg.sender, address(this), stockIn);

        (address tok, IPonsCurve curve) = _side(side);
        uint256 before = IERC20(tok).balanceOf(address(this));
        stock.forceApprove(address(curve), stockIn);
        curve.buy(stockIn, minTokensOut, address(this));
        stock.forceApprove(address(curve), 0);
        out = IERC20(tok).balanceOf(address(this)) - before;

        _credit(side, beneficiary, out);
        _samplePeaks();
        emit Entered(side, beneficiary, stockIn, out);
    }

    /// @notice Join with tokens bought anywhere else. Weight starts accruing now.
    function deposit(uint8 side, uint256 tokens) external nonReentrant {
        _live(side);
        if (tokens == 0) revert ZeroAmount();

        (address tok,) = _side(side);
        IERC20(tok).safeTransferFrom(msg.sender, address(this), tokens);

        _credit(side, msg.sender, tokens);
        _samplePeaks();
        emit Deposited(side, msg.sender, tokens);
    }

    /// @notice Take your tokens back. Allowed at any time; weight simply stops accruing.
    function withdraw(uint8 side, uint256 tokens) external nonReentrant {
        if (side != SIDE_A && side != SIDE_B) revert BadSide();
        if (tokens == 0) revert ZeroAmount();

        _syncSide(side);
        _syncPosition(side, msg.sender);

        Position storage p = positions[side][msg.sender];
        p.tokens -= tokens;
        sides[side].tokens -= tokens;

        (address tok,) = _side(side);
        IERC20(tok).safeTransfer(msg.sender, tokens);

        if (block.timestamp <= endAt) _samplePeaks();
        emit Withdrawn(side, msg.sender, tokens);
    }

    /// @notice Record the current market caps. Anyone may call, and each side is
    ///         motivated to call it at its own high point.
    function poke() external {
        if (block.timestamp > endAt) revert Over();
        _samplePeaks();
    }

    // ------------------------------------------------------------------ settling

    /// @notice Close the match and decide who takes the fee streams.
    function settle() external {
        if (block.timestamp < endAt) revert NotOver();
        if (settled) revert AlreadySettled();

        _syncSide(SIDE_A);
        _syncSide(SIDE_B);

        if (peakA > peakB) winner = SIDE_A;
        else if (peakB > peakA) winner = SIDE_B;
        else winner = 0; // a draw pays both sides

        winningWeight = winner == SIDE_A
            ? sides[SIDE_A].weight
            : winner == SIDE_B ? sides[SIDE_B].weight : sides[SIDE_A].weight + sides[SIDE_B].weight;

        settled = true;
        emit Settled(winner, peakA, peakB, winningWeight);
    }

    /// @notice Pull creator fees for both tokens out of the Pons escrow into the pot.
    /// @dev Permissionless. The escrow is msg.sender-scoped, so this contract has to
    ///      make the call itself; a keeper cannot do it on our behalf.
    function harvest() external nonReentrant returns (uint256 gained) {
        if (!settled) revert NotSettled();
        if (winningWeight == 0) revert NoWeight();

        uint256 before = stock.balanceOf(address(this));
        escrow.claimToken(address(stock));
        gained = stock.balanceOf(address(this)) - before;
        if (gained == 0) return 0;

        totalHarvested += gained;
        accPerWeight += (gained * ACC) / winningWeight;
        emit Harvested(gained, accPerWeight);
    }

    /// @notice Take your share of everything harvested so far.
    function claim(uint8 side) external nonReentrant returns (uint256 owed) {
        if (!settled) revert NotSettled();
        if (winner != 0 && side != winner) revert NotAWinner();
        if (side != SIDE_A && side != SIDE_B) revert BadSide();

        Position storage p = positions[side][msg.sender];
        _syncPosition(side, msg.sender); // clamped at endAt, so this is final

        owed = (p.weight * accPerWeight) / ACC - p.claimed;
        if (owed == 0) revert NothingToClaim();

        p.claimed += owed;
        stock.safeTransfer(msg.sender, owed);
        emit Claimed(msg.sender, owed);
    }

    // ------------------------------------------------------------------ views

    /// @notice A position's weight brought up to date.
    /// @dev Weight is only written when a position is touched, so the stored value
    ///      lags until the holder next interacts. Readers need the synced number:
    ///      the UI shows it live during a match, and it is final once the bell rings.
    function weightOf(uint8 side, address who) public view returns (uint256) {
        Position storage p = positions[side][who];
        uint64 t = _clock();
        uint64 last = p.lastSync == 0 ? t : p.lastSync;
        return t > last ? p.weight + p.tokens * (t - last) : p.weight;
    }

    /// @notice Side totals brought up to date, for showing live odds.
    function sideWeight(uint8 side) public view returns (uint256) {
        SideState storage sd = sides[side];
        uint64 t = _clock();
        return t > sd.lastSync ? sd.weight + sd.tokens * (t - sd.lastSync) : sd.weight;
    }

    function claimable(uint8 side, address who) external view returns (uint256) {
        if (!settled) return 0;
        if (winner != 0 && side != winner) return 0;
        return (weightOf(side, who) * accPerWeight) / ACC - positions[side][who].claimed;
    }

    function timeLeft() external view returns (uint256) {
        return block.timestamp >= endAt ? 0 : endAt - block.timestamp;
    }

    // ------------------------------------------------------------------ internals

    function _side(uint8 side) internal view returns (address tok, IPonsCurve curve) {
        if (side == SIDE_A) return (tokenA, curveA);
        if (side == SIDE_B) return (tokenB, curveB);
        revert BadSide();
    }

    function _live(uint8 side) internal view {
        if (side != SIDE_A && side != SIDE_B) revert BadSide();
        if (block.timestamp < startAt) revert NotStarted();
        if (block.timestamp >= endAt) revert Over();
    }

    /// @dev Weight only accrues inside the window, so the clock stops at the bell.
    function _clock() internal view returns (uint64) {
        return block.timestamp < endAt ? uint64(block.timestamp) : endAt;
    }

    function _syncSide(uint8 side) internal {
        SideState storage s = sides[side];
        uint64 t = _clock();
        if (t > s.lastSync) {
            s.weight += s.tokens * (t - s.lastSync);
            s.lastSync = t;
        }
    }

    function _syncPosition(uint8 side, address who) internal {
        Position storage p = positions[side][who];
        uint64 t = _clock();
        if (p.lastSync == 0) p.lastSync = t;
        if (t > p.lastSync) {
            p.weight += p.tokens * (t - p.lastSync);
            p.lastSync = t;
        }
    }

    function _credit(uint8 side, address who, uint256 tokens) internal {
        _syncSide(side);
        _syncPosition(side, who);
        positions[side][who].tokens += tokens;
        sides[side].tokens += tokens;
    }

    function _samplePeaks() internal {
        uint256 ra = curveA.quoteReserve();
        uint256 rb = curveB.quoteReserve();
        if (ra > peakA) {
            peakA = ra;
            emit Peak(SIDE_A, ra);
        }
        if (rb > peakB) {
            peakB = rb;
            emit Peak(SIDE_B, rb);
        }
    }

    receive() external payable {}
}
