// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {IPonsFactory, TokenParams} from "../interfaces/IPonsV2.sol";
import {Battle} from "./Battle.sol";

/**
 * @title BattleFactory
 * @notice Starts Stock Wars matches.
 *
 * @dev Every match is a fresh clone, never a shared contract. The Pons escrow pays a
 *      lump sum per (recipient, quote asset), so one arena holding fee rights for
 *      several matches would receive a single undifferentiated pile of stock that
 *      could not be split between them. A separate address per match keeps each
 *      escrow balance attributable.
 */
contract BattleFactory is Ownable2Step {
    IPonsFactory public immutable pons;
    address public immutable implementation;

    /// @notice Match length. One hour by default; bounded so a match cannot be
    ///         configured to run for a minute or a decade.
    uint64 public duration = 1 hours;
    uint64 public constant MIN_DURATION = 10 minutes;
    uint64 public constant MAX_DURATION = 7 days;

    /// @notice Least stock a starter must put behind each side, so a match cannot
    ///         open with two empty curves nobody can price.
    mapping(address => uint256) public minSeed;

    address[] public battles;
    mapping(address => bool) public isBattle;

    /// @notice Anyone may start a match. This exists only so a spam wave at launch
    ///         can be stopped without redeploying; it cannot touch matches already
    ///         running, whose settlement and payouts stay permissionless.
    bool public paused;

    event BattleStarted(
        address indexed battle, address indexed stock, address tokenA, address tokenB, uint64 endAt
    );
    event DurationSet(uint64 duration);
    event PausedSet(bool paused);
    event MinSeedSet(address indexed stock, uint256 amount);

    error BadDuration();
    error Paused();
    error StockNotConfigured();
    error SeedTooSmall(uint256 given, uint256 required);
    error InsufficientLaunchFee(uint256 given, uint256 required);
    error RefundFailed();

    constructor(IPonsFactory pons_, address owner_) Ownable(owner_) {
        pons = pons_;
        implementation = address(new Battle());
    }

    /**
     * @notice Launch two memecoins against the same stock and open the match.
     * @param stock     the tokenized stock both sides are priced in
     * @param a         Pons params for side A (creatorFeeRecipient is overwritten)
     * @param b         Pons params for side B
     * @param seedEach  stock to spend seeding each side, taken from the caller
     */
    function startBattle(
        IERC20 stock,
        TokenParams calldata a,
        TokenParams calldata b,
        uint256 launchConfigId,
        uint256 seedEach,
        uint256 minTokensOutEach
    ) external payable returns (address battle) {
        if (paused) revert Paused();
        uint256 required = minSeed[address(stock)];
        if (required == 0) revert StockNotConfigured();
        if (seedEach < required) revert SeedTooSmall(seedEach, required);

        // Two launches, so two launch fees. Forward exactly that and refund the rest
        // rather than letting an overpayment sit here.
        uint256 fee = pons.launchFee() * 2;
        if (msg.value < fee) revert InsufficientLaunchFee(msg.value, fee);

        battle = Clones.clone(implementation);
        Battle(payable(battle)).initialize{value: fee}(pons, stock, a, b, launchConfigId, duration);

        // Seed both sides on the starter's behalf so neither curve opens empty.
        uint256 total = seedEach * 2;
        IERC20(stock).transferFrom(msg.sender, address(this), total);
        IERC20(stock).approve(battle, total);
        Battle(payable(battle)).enterFor(Battle(payable(battle)).SIDE_A(), msg.sender, seedEach, minTokensOutEach);
        Battle(payable(battle)).enterFor(Battle(payable(battle)).SIDE_B(), msg.sender, seedEach, minTokensOutEach);

        battles.push(battle);
        isBattle[battle] = true;

        uint256 refund = msg.value - fee;
        if (refund > 0) {
            (bool ok,) = msg.sender.call{value: refund}("");
            if (!ok) revert RefundFailed();
        }

        emit BattleStarted(battle, address(stock), Battle(payable(battle)).tokenA(), Battle(payable(battle)).tokenB(), uint64(block.timestamp) + duration);
    }

    function battlesLength() external view returns (uint256) {
        return battles.length;
    }

    function allBattles() external view returns (address[] memory) {
        return battles;
    }

    // ------------------------------------------------------------------ admin

    function setDuration(uint64 d) external onlyOwner {
        if (d < MIN_DURATION || d > MAX_DURATION) revert BadDuration();
        duration = d;
        emit DurationSet(d);
    }

    function setPaused(bool p) external onlyOwner {
        paused = p;
        emit PausedSet(p);
    }

    function setMinSeed(address stock, uint256 amount) external onlyOwner {
        minSeed[stock] = amount;
        emit MinSeedSet(stock, amount);
    }

    receive() external payable {}
}
