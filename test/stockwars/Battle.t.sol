// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Battle} from "../../src/stockwars/Battle.sol";
import {BattleFactory} from "../../src/stockwars/BattleFactory.sol";
import {IPonsFactory, TokenParams} from "../../src/interfaces/IPonsV2.sol";
import {MockPons, MockEscrow, MockCurve} from "./Mocks.sol";
import {MockStockToken} from "../Mocks.sol";

contract BattleTest is Test {
    MockStockToken stock;
    MockEscrow escrow;
    MockPons pons;
    BattleFactory factory;
    Battle battle;

    address owner = address(0xB0B);
    address starter = address(0x5747);
    address alice = address(0xA11CE);
    address bob = address(0xB0B2);
    address carol = address(0xCA401);

    uint256 constant PHANTOM = 16.64e18;
    uint256 constant RATE = 1_000_000; // meme tokens per unit of stock
    uint64 constant HOUR = 1 hours;

    function setUp() public {
        stock = new MockStockToken();
        escrow = new MockEscrow();
        pons = new MockPons(address(escrow), PHANTOM, RATE);
        factory = new BattleFactory(IPonsFactory(address(pons)), owner);

        vm.prank(owner);
        factory.setMinSeed(address(stock), 1e18);

        address[4] memory actors = [starter, alice, bob, carol];
        for (uint256 i; i < actors.length; i++) {
            stock.mint(actors[i], 10_000e18);
            vm.deal(actors[i], 10 ether);
            vm.prank(actors[i]);
            stock.approve(address(factory), type(uint256).max);
        }

        vm.prank(starter);
        battle = Battle(payable(_start()));

        for (uint256 i; i < actors.length; i++) {
            vm.prank(actors[i]);
            stock.approve(address(battle), type(uint256).max);
        }
    }

    function _start() internal returns (address) {
        TokenParams memory a;
        a.name = "Bulls";
        a.symbol = "BULL";
        a.creatorTaxBps = 1000;
        TokenParams memory b;
        b.name = "Bears";
        b.symbol = "BEAR";
        b.creatorTaxBps = 1000;
        return factory.startBattle{value: 0.01 ether}(IERC20(address(stock)), a, b, 0, 1e18, 0);
    }

    function _curve(uint8 side) internal view returns (MockCurve) {
        return MockCurve(side == 1 ? address(battle.curveA()) : address(battle.curveB()));
    }

    // ---------------------------------------------------------------- the setup

    function test_BothTokensLaunchTogetherWithTheArenaAsFeeRecipient() public view {
        assertTrue(battle.tokenA() != address(0), "A launched");
        assertTrue(battle.tokenB() != address(0), "B launched");
        assertTrue(battle.tokenA() != battle.tokenB(), "two distinct tokens");
        assertEq(pons.feeRecipientOf(battle.tokenA()), address(battle), "A pays the arena");
        assertEq(pons.feeRecipientOf(battle.tokenB()), address(battle), "B pays the arena");
        assertEq(battle.endAt() - battle.startAt(), HOUR, "one hour");
    }

    function test_EachMatchGetsItsOwnAddress() public {
        vm.prank(starter);
        address second = _start();
        assertTrue(second != address(battle), "separate arena per match");
    }

    // ---------------------------------------------------------------- the contest

    /// The property the peak rule exists for: leading early beats closing strong.
    function test_HighestPeakWinsEvenIfTheOtherSideClosesHigher() public {
        _curve(1).outsideBuy(100e18); // A spikes
        battle.poke();
        _curve(1).outsideSell(90e18); // and gives it all back

        vm.warp(block.timestamp + 50 minutes);
        _curve(2).outsideBuy(60e18); // B finishes higher than A ends
        battle.poke();

        vm.warp(battle.endAt());
        battle.settle();

        assertGt(battle.peakA(), battle.peakB(), "A's high water mark stands");
        assertEq(battle.winner(), battle.SIDE_A(), "A wins on peak, not on close");
    }

    /// A last-second buy cannot steal a match it never led.
    function test_LastSecondBuyCannotFlipTheResult() public {
        _curve(1).outsideBuy(500e18);
        battle.poke();

        vm.warp(battle.endAt() - 1);
        _curve(2).outsideBuy(400e18); // big, but never beats A's peak
        battle.poke();

        vm.warp(battle.endAt());
        battle.settle();
        assertEq(battle.winner(), battle.SIDE_A(), "the snipe fails");
    }

    function test_PokeIsRejectedAfterTheBell() public {
        vm.warp(battle.endAt() + 1);
        vm.expectRevert(Battle.Over.selector);
        battle.poke();
    }

    // ---------------------------------------------------------------- weighting

    /// The reason time-weighting was chosen: piling into the obvious winner late
    /// must not pay the same as backing it from the start.
    function test_EarlyHolderOutEarnsLateHolderForTheSameStake() public {
        vm.prank(alice);
        battle.enter(1, 100e18, 0); // in at minute 0

        vm.warp(block.timestamp + 45 minutes);
        vm.prank(bob);
        battle.enter(1, 100e18, 0); // same stake, 45 minutes later

        _curve(1).outsideBuy(1000e18);
        battle.poke();

        vm.warp(battle.endAt());
        battle.settle();

        _accrueFees(100e18);
        battle.harvest();

        vm.prank(alice);
        uint256 aliceGot = battle.claim(1);
        vm.prank(bob);
        uint256 bobGot = battle.claim(1);

        assertGt(aliceGot, bobGot, "the early holder earns more");
        // alice held 60 min, bob 15, so roughly 4:1 on equal token counts
        assertApproxEqRel(aliceGot, bobGot * 4, 0.05e18, "roughly proportional to time held");
    }

    function test_WithdrawingStopsWeightAccruing() public {
        vm.prank(alice);
        battle.enter(1, 100e18, 0);
        vm.prank(bob);
        battle.enter(1, 100e18, 0);

        vm.warp(block.timestamp + 30 minutes);
        (uint256 aliceTokens,,,) = battle.positions(1, alice);
        vm.prank(alice);
        battle.withdraw(1, aliceTokens); // alice leaves halfway

        vm.warp(battle.endAt());
        battle.settle();
        _accrueFees(100e18);
        battle.harvest();

        vm.prank(alice);
        uint256 aliceGot = battle.claim(1);
        vm.prank(bob);
        uint256 bobGot = battle.claim(1);

        assertApproxEqRel(bobGot, aliceGot * 2, 0.02e18, "bob held twice as long");
        assertEq(IERC20(battle.tokenA()).balanceOf(alice), aliceTokens, "and alice has her tokens");
    }

    // ---------------------------------------------------------------- payouts

    function test_LosersCannotClaim() public {
        vm.prank(alice);
        battle.enter(1, 100e18, 0);
        vm.prank(bob);
        battle.enter(2, 100e18, 0);

        _curve(1).outsideBuy(500e18);
        battle.poke();

        vm.warp(battle.endAt());
        battle.settle();
        assertEq(battle.winner(), battle.SIDE_A());

        _accrueFees(50e18);
        battle.harvest();

        vm.prank(bob);
        vm.expectRevert(Battle.NotAWinner.selector);
        battle.claim(2);
    }

    function test_FeesArrivingLaterAreStillClaimable() public {
        vm.prank(alice);
        battle.enter(1, 100e18, 0);
        _curve(1).outsideBuy(500e18);
        battle.poke();

        vm.warp(battle.endAt());
        battle.settle();

        _accrueFees(30e18);
        battle.harvest();
        vm.prank(alice);
        uint256 first = battle.claim(1);

        // more trading happens weeks later
        vm.warp(block.timestamp + 21 days);
        _accrueFees(70e18);
        battle.harvest();
        vm.prank(alice);
        uint256 second = battle.claim(1);

        assertGt(second, 0, "the stream keeps paying");

        // the match starter seeded this side too, so the pot is split with them
        vm.prank(starter);
        uint256 seeded = battle.claim(1);
        assertApproxEqRel(first + second + seeded, 100e18, 0.001e18, "everything harvested reaches the winners");
    }

    function test_NoDoubleClaim() public {
        vm.prank(alice);
        battle.enter(1, 100e18, 0);
        _curve(1).outsideBuy(500e18);
        battle.poke();
        vm.warp(battle.endAt());
        battle.settle();
        _accrueFees(40e18);
        battle.harvest();

        vm.prank(alice);
        battle.claim(1);
        vm.prank(alice);
        vm.expectRevert(Battle.NothingToClaim.selector);
        battle.claim(1);
    }

    function test_DrawPaysBothSides() public {
        vm.prank(alice);
        battle.enter(1, 100e18, 0);
        vm.prank(bob);
        battle.enter(2, 100e18, 0);

        vm.warp(battle.endAt());
        battle.settle();
        assertEq(battle.winner(), 0, "identical peaks is a draw");

        _accrueFees(100e18);
        battle.harvest();

        vm.prank(alice);
        uint256 a = battle.claim(1);
        vm.prank(bob);
        uint256 b = battle.claim(2);
        assertApproxEqRel(a, b, 0.01e18, "split evenly");

        // the starter seeded both sides, and on a draw both sides pay
        vm.prank(starter);
        uint256 sa = battle.claim(1);
        vm.prank(starter);
        uint256 sb = battle.claim(2);
        assertApproxEqRel(a + b + sa + sb, 100e18, 0.001e18, "and fully");
    }

    function test_CannotSettleEarlyOrTwice() public {
        vm.expectRevert(Battle.NotOver.selector);
        battle.settle();

        vm.warp(battle.endAt());
        battle.settle();
        vm.expectRevert(Battle.AlreadySettled.selector);
        battle.settle();
    }

    function test_EnteringAfterTheBellReverts() public {
        vm.warp(battle.endAt());
        vm.prank(alice);
        vm.expectRevert(Battle.Over.selector);
        battle.enter(1, 1e18, 0);
    }

    // ---------------------------------------------------------------- helpers

    /// @dev Credit the arena with creator fees the way the real escrow would.
    function _accrueFees(uint256 amount) internal {
        stock.mint(address(this), amount);
        stock.approve(address(escrow), amount);
        escrow.accrue(address(battle), address(stock), amount);
    }
}
