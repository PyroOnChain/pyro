// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test, console2} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ClubVault} from "../src/ClubVault.sol";
import {ClubFactory} from "../src/ClubFactory.sol";
import {IPonsFactory, IFeeEscrow, TokenParams, Socials} from "../src/interfaces/IPonsV2.sol";
import {MockStockToken, MockFeeEscrow, MockPonsFactory} from "./Mocks.sol";

contract ClubVaultTest is Test {
    MockStockToken nvda;
    MockFeeEscrow escrow;
    MockPonsFactory pons;
    ClubFactory factory;
    ClubVault vault;
    address mascot;

    address owner    = makeAddr("owner");
    address treasury = makeAddr("treasury");
    address guardian = makeAddr("guardian");
    address creator  = makeAddr("creator");
    address alice    = makeAddr("alice");
    address bob      = makeAddr("bob");
    address keeper   = makeAddr("keeper");
    address feePayer = makeAddr("feePayer");

    uint256 constant SEED = 10e18;
    uint256 constant LAUNCH_FEE = 0.0005 ether;

    function setUp() public {
        nvda = new MockStockToken();
        escrow = new MockFeeEscrow();
        pons = new MockPonsFactory(address(escrow));
        pons.enablePair(address(nvda), 41.6e18); // matches mainnet pairTokenEconomics(NVDA)

        factory = new ClubFactory(IPonsFactory(address(pons)), treasury, guardian, owner);
        vm.prank(owner);
        factory.setMinSeed(address(nvda), 1e18);

        for (uint256 i; i < 5; i++) {
            address[5] memory who = [creator, alice, bob, keeper, feePayer];
            nvda.mint(who[i], 10_000e18);
            vm.deal(who[i], 1 ether);
        }

        vm.startPrank(creator);
        nvda.approve(address(factory), type(uint256).max);
        (address v, address m) = factory.createClub{value: LAUNCH_FEE}(
            address(nvda), SEED, "NVDA Club", "cNVDA", 1000, _params(), 0
        );
        vm.stopPrank();
        vault = ClubVault(payable(v));
        mascot = m;

        vm.prank(feePayer);
        nvda.approve(address(escrow), type(uint256).max);
    }

    function _params() internal pure returns (TokenParams memory p) {
        p.name = "Jensen";
        p.symbol = "JENSEN";
        p.creatorTaxBps = 1000;
        p.buybackEnabled = true;
    }

    function _accrueFees(uint256 amt) internal {
        vm.prank(feePayer);
        escrow.accrue(address(vault), address(nvda), amt);
    }

    function _deposit(address who, uint256 amt) internal returns (uint256 shares) {
        vm.startPrank(who);
        nvda.approve(address(vault), amt);
        shares = vault.deposit(amt, who);
        vm.stopPrank();
    }

    // ------------------------------------------------------------------ basics

    function test_ClubCreation_BindsMascotFeesToVault() public view {
        assertEq(pons.feeRecipientOf(mascot), address(vault), "mascot fees must route to the jar");
        assertEq(vault.currentMascot(), mascot);
        assertEq(vault.totalAssets(), SEED);
        assertEq(nvda.balanceOf(address(vault)), SEED);
        assertGt(vault.balanceOf(creator), 0, "creator holds the seed shares");
    }

    function test_CreateClub_RevertsIfPairNotSupportedByPons() public {
        MockStockToken other = new MockStockToken();
        vm.prank(owner);
        factory.setMinSeed(address(other), 1e18);
        other.mint(creator, 100e18);

        vm.startPrank(creator);
        other.approve(address(factory), type(uint256).max);
        vm.expectRevert(ClubFactory.PairNotSupported.selector);
        factory.createClub{value: LAUNCH_FEE}(address(other), 10e18, "X", "X", 1000, _params(), 0);
        vm.stopPrank();
    }

    function test_DepositThenRedeem_RoundTripsMinusExitFee() public {
        uint256 shares = _deposit(alice, 100e18);
        vm.prank(alice);
        uint256 out = vault.redeem(shares, alice, alice);
        // 0.5% exit fee stays in the jar
        assertApproxEqRel(out, 99.5e18, 1e15);
        assertGt(vault.totalAssets(), SEED, "exit fee lifted NAV for everyone who stayed");
    }

    // ------------------------------------------------------------------ the drip

    /// @notice THE test. Deposit -> harvest -> withdraw atomically must not be profitable.
    function test_CannotSnipeHarvestInSameBlock() public {
        _deposit(alice, 1_000e18);
        _accrueFees(500e18); // a fat pending harvest

        uint256 before = nvda.balanceOf(bob);
        vm.startPrank(bob);
        nvda.approve(address(vault), 1_000e18);
        uint256 shares = vault.deposit(1_000e18, bob);
        vault.harvest();
        vault.redeem(shares, bob, bob);
        vm.stopPrank();

        assertLt(nvda.balanceOf(bob), before, "atomic sandwich of a harvest must lose money");
    }

    function test_HarvestDoesNotMoveNavInstantly_ThenDripsOverADay() public {
        _deposit(alice, 1_000e18);
        uint256 navBefore = vault.totalAssets();

        _accrueFees(100e18);
        vm.prank(keeper);
        vault.harvest();

        assertEq(vault.totalAssets(), navBefore, "NAV must not jump in the harvest block");
        assertGt(vault.lockedProfit(), 0);

        vm.warp(block.timestamp + 12 hours);
        uint256 mid = vault.totalAssets();
        assertGt(mid, navBefore);
        assertLt(mid, navBefore + 100e18);

        vm.warp(block.timestamp + 12 hours + 1);
        assertEq(vault.lockedProfit(), 0, "fully dripped after 24h");
        assertGt(vault.totalAssets(), navBefore);
    }

    // ------------------------------------------------------------------ fee splits

    function test_HarvestSplitsFeesAndPaysKeeperBounty() public {
        vm.prank(owner);
        factory.setProtocolFeeBps(100); // 1%

        _deposit(alice, 1_000e18);
        _accrueFees(100e18);

        uint256 tBefore = nvda.balanceOf(treasury);
        uint256 cBefore = nvda.balanceOf(creator);
        uint256 kBefore = nvda.balanceOf(keeper);

        vm.prank(keeper);
        vault.harvest();

        assertEq(nvda.balanceOf(treasury) - tBefore, 1e18,    "protocol 1%");
        assertEq(nvda.balanceOf(creator)  - cBefore, 10e18,   "creator 10%");
        assertEq(nvda.balanceOf(keeper)   - kBefore, 0.25e18, "bounty 0.25%");
    }

    function test_HarvestRevertsWhenNothingAccrued() public {
        vm.expectRevert(ClubVault.NothingToHarvest.selector);
        vault.harvest();
    }

    function test_HarvestSweepsFeesFromEveryMascotAtOnce() public {
        // Escrow keys balances by (recipient, quoteToken), so a relaunched club needs no extra loop.
        vm.prank(creator);
        vault.addMascot(makeAddr("mascot2"));
        _accrueFees(40e18);
        vm.prank(keeper);
        uint256 net = vault.harvest();
        assertGt(net, 0);
        assertEq(vault.mascotCount(), 2);
    }

    // ------------------------------------------------------------------ solvency

    /// @notice The issuer holds burn(). If it fires, NAV must fall for everyone simultaneously
    ///         rather than letting the first exiter drain the remainder.
    function test_IssuerBurn_SocializesLossAndDoesNotLetFirstExiterDrainVault() public {
        _deposit(alice, 1_000e18);
        _deposit(bob, 1_000e18);

        nvda.burn(address(vault), nvda.balanceOf(address(vault)) / 2); // issuer halves the jar

        uint256 aliceShares = vault.balanceOf(alice);
        uint256 bobShares = vault.balanceOf(bob);

        uint256 aliceOut = vault.previewRedeem(aliceShares);
        assertApproxEqRel(aliceOut, 500e18, 2e16, "alice eats ~half, not zero and not everything");

        vm.prank(alice);
        vault.redeem(aliceShares, alice, alice);

        // Bob must still be able to exit with roughly his share -- the vault is not insolvent.
        uint256 bobOut = vault.previewRedeem(bobShares);
        assertApproxEqRel(bobOut, 500e18, 5e16, "bob still gets his half");
        vm.prank(bob);
        vault.redeem(bobShares, bob, bob);
    }

    function test_InflationAttack_FirstDepositorCannotStealSecondDeposit() public {
        MockStockToken t = new MockStockToken();
        pons.enablePair(address(t), 41.6e18);
        vm.prank(owner);
        factory.setMinSeed(address(t), 1);
        t.mint(creator, 10_000e18);
        t.mint(bob, 10_000e18);

        vm.startPrank(creator);
        t.approve(address(factory), type(uint256).max);
        (address v,) = factory.createClub{value: LAUNCH_FEE}(address(t), 1, "X", "X", 0, _params(), 0);
        vm.stopPrank();
        ClubVault fresh = ClubVault(payable(v));

        vm.prank(creator);
        t.transfer(address(fresh), 1_000e18); // donation to inflate share price

        vm.startPrank(bob);
        t.approve(address(fresh), 100e18);
        uint256 shares = fresh.deposit(100e18, bob);
        vm.stopPrank();

        assertGt(shares, 0, "virtual shares must keep the second depositor from rounding to zero");
        assertGt(fresh.previewRedeem(shares), 90e18, "bob keeps the bulk of his deposit");
    }

    function test_PausedStockToken_BlocksExitButDoesNotCorruptAccounting() public {
        _deposit(alice, 100e18);
        uint256 navBefore = vault.totalAssets();
        uint256 aliceShares = vault.balanceOf(alice);

        nvda.pause();
        vm.prank(alice);
        vm.expectRevert(bytes("paused"));
        vault.redeem(aliceShares, alice, alice);

        nvda.unpause();
        assertEq(vault.totalAssets(), navBefore, "accounting survives a pause window");
        vm.prank(alice);
        vault.redeem(aliceShares, alice, alice);
    }

    function test_UiMultiplierChange_DoesNotAffectRawAccounting() public {
        _deposit(alice, 100e18);
        uint256 nav = vault.totalAssets();
        nvda.setUiMultiplier(1.05e18); // a dividend accrues
        assertEq(vault.totalAssets(), nav, "raw accounting is unmoved by ERC-8056 multiplier");
        assertGt(nvda.balanceOfUI(address(vault)), nvda.balanceOf(address(vault)));
    }

    // ------------------------------------------------------------------ escape hatch

    function test_FeeRecipientChange_IsGuardianGatedAndTimelocked() public {
        address newR = makeAddr("newRecipient");

        vm.prank(alice);
        vm.expectRevert(ClubVault.NotGuardian.selector);
        vault.queueFeeRecipientChange(mascot, newR);

        vm.prank(guardian);
        vault.queueFeeRecipientChange(mascot, newR);

        vm.prank(guardian);
        vm.expectRevert(ClubVault.TimelockPending.selector);
        vault.executeFeeRecipientChange(mascot, newR);

        vm.warp(block.timestamp + 3 days + 1);
        vm.prank(guardian);
        vault.executeFeeRecipientChange(mascot, newR);
        assertEq(pons.feeRecipientOf(mascot), newR);
    }

    function test_CreatorCanVetoAQueuedFeeRedirect() public {
        address newR = makeAddr("newRecipient");
        vm.prank(guardian);
        vault.queueFeeRecipientChange(mascot, newR);

        vm.prank(creator);
        vault.cancelFeeRecipientChange(mascot, newR);

        vm.warp(block.timestamp + 3 days + 1);
        vm.prank(guardian);
        vm.expectRevert(ClubVault.NotQueued.selector);
        vault.executeFeeRecipientChange(mascot, newR);
        assertEq(pons.feeRecipientOf(mascot), address(vault), "fees stayed with the jar");
    }

    function test_GuardianCannotSweepTheJarAsset() public {
        vm.prank(guardian);
        vm.expectRevert(ClubVault.CannotSweepAsset.selector);
        vault.sweep(address(nvda));
    }

    // ------------------------------------------------------------------ fuzz

    function testFuzz_DepositRedeemNeverMintsValue(uint96 a, uint96 b, uint96 fees) public {
        a = uint96(bound(a, 1e15, 5_000e18));
        b = uint96(bound(b, 1e15, 5_000e18));
        fees = uint96(bound(fees, 0, 1_000e18));

        _deposit(alice, a);
        _deposit(bob, b);
        if (fees > 0) {
            _accrueFees(fees);
            vm.prank(keeper);
            vault.harvest();
            vm.warp(block.timestamp + 25 hours);
        }

        uint256 totalOut = vault.previewRedeem(vault.balanceOf(alice))
            + vault.previewRedeem(vault.balanceOf(bob))
            + vault.previewRedeem(vault.balanceOf(creator));

        assertLe(totalOut, nvda.balanceOf(address(vault)) + 1, "vault can always pay everyone");
    }
}

contract PermitDepositTest is Test {
    MockStockToken nvda;
    MockFeeEscrow escrow;
    MockPonsFactory pons;
    ClubFactory factory;
    ClubVault vault;

    uint256 alicePk = 0xA11CE;
    address alice;
    uint256 constant LAUNCH_FEE = 0.0005 ether;

    function setUp() public {
        alice = vm.addr(alicePk);
        nvda = new MockStockToken();
        escrow = new MockFeeEscrow();
        pons = new MockPonsFactory(address(escrow));
        pons.enablePair(address(nvda), 41.6e18);
        factory = new ClubFactory(IPonsFactory(address(pons)), address(0xBEEF), address(0xCAFE), address(this));
        factory.setMinSeed(address(nvda), 1e18);

        address creator = makeAddr("creator");
        nvda.mint(creator, 100e18);
        nvda.mint(alice, 100e18);
        vm.deal(creator, 1 ether);

        TokenParams memory p;
        p.name = "Jensen"; p.symbol = "GPU"; p.creatorTaxBps = 1000;
        vm.startPrank(creator);
        nvda.approve(address(factory), type(uint256).max);
        (address v,) = factory.createClub{value: LAUNCH_FEE}(address(nvda), 10e18, "NVDA Club", "cNVDA", 1000, p, 0);
        vm.stopPrank();
        vault = ClubVault(payable(v));
    }

    function _sign(uint256 value, uint256 deadline) internal view returns (uint8 v, bytes32 r, bytes32 s) {
        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"),
                alice, address(vault), value, nvda.nonces(alice), deadline
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", nvda.DOMAIN_SEPARATOR(), structHash));
        (v, r, s) = vm.sign(alicePk, digest);
    }

    function test_DepositWithPermit_NeedsNoSeparateApproval() public {
        uint256 amount = 25e18;
        uint256 deadline = block.timestamp + 1 hours;
        (uint8 v, bytes32 r, bytes32 s) = _sign(amount, deadline);

        assertEq(nvda.allowance(alice, address(vault)), 0, "no approval beforehand");

        vm.prank(alice);
        uint256 shares = vault.depositWithPermit(amount, alice, deadline, v, r, s);

        assertGt(shares, 0);
        assertEq(vault.balanceOf(alice), shares);
        assertApproxEqRel(vault.previewRedeem(shares), amount, 1e16);
    }

    /// @notice A griefer front-running the permit must not be able to brick the deposit.
    function test_DepositWithPermit_SurvivesFrontRunOfTheSignature() public {
        uint256 amount = 25e18;
        uint256 deadline = block.timestamp + 1 hours;
        (uint8 v, bytes32 r, bytes32 s) = _sign(amount, deadline);

        // attacker submits the permit first, consuming alice's nonce
        vm.prank(makeAddr("griefer"));
        nvda.permit(alice, address(vault), amount, deadline, v, r, s);
        assertEq(nvda.allowance(alice, address(vault)), amount, "allowance already set by the front-run");

        // alice's own call must still go through
        vm.prank(alice);
        uint256 shares = vault.depositWithPermit(amount, alice, deadline, v, r, s);
        assertGt(shares, 0, "deposit must not revert on a consumed nonce");
    }
}
