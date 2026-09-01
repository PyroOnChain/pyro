// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test, console2} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Battle} from "../../src/stockwars/Battle.sol";
import {BattleFactory} from "../../src/stockwars/BattleFactory.sol";
import {IPonsFactory, IFeeEscrow, TokenParams} from "../../src/interfaces/IPonsV2.sol";
import {IPonsCurve} from "../../src/interfaces/IPonsCurve.sol";

/**
 * @notice Stock Wars against LIVE Robinhood Chain state. No mocks.
 *
 *  The unit tests use a linear stand-in curve. This file exists because two things
 *  in the design are assumptions until a real curve executes them:
 *
 *    1. that `buy` on a STOCK-paired curve pulls the quote asset by transferFrom
 *       rather than expecting msg.value, so a contract can spend on a user's behalf
 *    2. that the arena can hold the tokens it buys, which is what makes time-weighted
 *       holdings computable without an off-chain merkle
 *
 *  Run:  forge test --match-path test/stockwars/Fork.t.sol -vv
 */
contract StockWarsForkTest is Test {
    address constant NVDA = 0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC;
    address constant PONS = 0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e;
    address constant ESCROW = 0xd3AFEB2a57f70eF218Aa82451c51B2fb0416Ac9e;
    /// @dev the NVDA/USDG 0.05% Uniswap pool, which holds ~10.6k NVDA
    address constant WHALE = 0xd4EB21209C4D6093f80B5b84f5C45cc093EA14a3;

    /// @dev Deliberately unpinned. This RPC keeps only ~5k blocks of state, so any
    ///      pinned block stops being fetchable within hours. VaultTube's fork test
    ///      still passes only because Foundry has that block cached locally; clear the
    ///      cache and it fails too. Forking at head is the honest option here.

    BattleFactory factory;
    Battle battle;

    /// @dev Cached deliberately. `battle.enter(A, ...)` evaluates the
    ///      getter first, which swallows the vm.prank and runs the entry as the test
    ///      contract instead of the intended user.
    uint8 A;
    uint8 B;

    address owner = makeAddr("owner");
    address starter = makeAddr("starter");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    function setUp() public {
        vm.createSelectFork("rh_mainnet");

        factory = new BattleFactory(IPonsFactory(PONS), owner);
        vm.prank(owner);
        factory.setMinSeed(NVDA, 1e18);

        address[3] memory who = [starter, alice, bob];
        for (uint256 i; i < who.length; i++) {
            vm.prank(WHALE);
            IERC20(NVDA).transfer(who[i], 60e18);
            vm.deal(who[i], 1 ether);
            vm.prank(who[i]);
            IERC20(NVDA).approve(address(factory), type(uint256).max);
        }

        vm.prank(starter);
        battle = Battle(payable(_start()));

        for (uint256 i; i < who.length; i++) {
            vm.prank(who[i]);
            IERC20(NVDA).approve(address(battle), type(uint256).max);
        }

        A = battle.SIDE_A();
        B = battle.SIDE_B();
    }

    function _params(string memory n, string memory s) internal view returns (TokenParams memory p) {
        p.name = n;
        p.symbol = s;
        p.creatorTaxBps = 1000; // the Pons maximum
        p.buybackEnabled = true;
        p.salt = keccak256(abi.encode(n, block.number, address(this)));
    }

    function _start() internal returns (address) {
        return factory.startBattle{value: 0.01 ether}(
            IERC20(NVDA), _params("Bulls", "BULL"), _params("Bears", "BEAR"), 0, 2e18, 0
        );
    }

    // ------------------------------------------------------------------ the premise

    function test_Fork_TwoRealTokensLaunchAgainstNvdaInOneTransaction() public view {
        assertTrue(battle.tokenA().code.length > 0, "A is a real deployed token");
        assertTrue(battle.tokenB().code.length > 0, "B is a real deployed token");
        assertTrue(battle.tokenA() != battle.tokenB(), "two distinct tokens");

        assertEq(IPonsCurve(address(battle.curveA())).pairToken(), NVDA, "A is priced in NVDA");
        assertEq(IPonsCurve(address(battle.curveB())).pairToken(), NVDA, "B is priced in NVDA");

        // Ask Pons who receives each token's creator fees, reading the record raw
        // rather than trusting a guessed struct layout.
        (bool okA, bytes memory recA) =
            PONS.staticcall(abi.encodeWithSignature("getLaunchedToken(address)", battle.tokenA()));
        (bool okB, bytes memory recB) =
            PONS.staticcall(abi.encodeWithSignature("getLaunchedToken(address)", battle.tokenB()));
        assertTrue(okA && okB, "both records readable");
        assertTrue(_contains(recA, address(battle)), "A pays the arena");
        assertTrue(_contains(recB, address(battle)), "B pays the arena");
    }

    /// The assumption the whole custody design rests on.
    function test_Fork_ArenaBuysOnARealCurveAndHoldsTheTokens() public {
        uint256 before = IERC20(battle.tokenA()).balanceOf(address(battle));

        vm.prank(alice);
        uint256 out = battle.enter(A, 5e18, 0);

        assertGt(out, 0, "the real curve sold us tokens");
        assertEq(
            IERC20(battle.tokenA()).balanceOf(address(battle)) - before, out, "and the arena is holding them"
        );
        assertEq(IERC20(battle.tokenA()).balanceOf(alice), 0, "not the buyer");

        (uint256 tokens,,,) = battle.positions(A, alice);
        assertEq(tokens, out, "credited as an internal position instead");
    }

    function test_Fork_RealBuyingMovesTheRealMarketCap() public {
        uint256 p0 = battle.peakA();

        vm.prank(alice);
        battle.enter(A, 5e18, 0);

        assertGt(battle.peakA(), p0, "peak tracks the live curve reserve");
        assertEq(battle.peakA(), IPonsCurve(address(battle.curveA())).quoteReserve(), "and matches it exactly");
    }

    function test_Fork_AWholeMatchRunsEndToEnd() public {
        vm.prank(alice);
        battle.enter(A, 10e18, 0);

        vm.warp(block.timestamp + 30 minutes);
        vm.prank(bob);
        battle.enter(B, 4e18, 0);

        vm.warp(battle.endAt());
        battle.settle();

        assertEq(battle.winner(), A, "the side that bought more won");
        assertGt(battle.winningWeight(), 0, "and has weight behind it");

        // Weight is written lazily, so read the synced view rather than storage.
        assertGt(battle.weightOf(A, alice), 0, "alice accrued weight");
        assertEq(battle.sideWeight(A), battle.winningWeight(), "side total matches what settled");
    }

    function test_Fork_LosersGetTheirTokensBack() public {
        vm.prank(bob);
        uint256 out = battle.enter(B, 3e18, 0);

        vm.prank(alice);
        battle.enter(A, 9e18, 0);

        vm.warp(battle.endAt());
        battle.settle();
        assertEq(battle.winner(), A);

        vm.prank(bob);
        battle.withdraw(B, out);
        assertEq(IERC20(battle.tokenB()).balanceOf(bob), out, "bob keeps his tokens, just not the fees");
    }

    /// @dev Does a 32-byte-aligned scan for an address inside an abi-encoded record.
    function _contains(bytes memory haystack, address needle) internal pure returns (bool) {
        for (uint256 i = 0; i + 32 <= haystack.length; i += 32) {
            bytes32 w;
            assembly {
                w := mload(add(add(haystack, 32), i))
            }
            if (address(uint160(uint256(w))) == needle) return true;
        }
        return false;
    }
}
