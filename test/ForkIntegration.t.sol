// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test, console2} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import {ClubFactory} from "../src/ClubFactory.sol";
import {ClubVault} from "../src/ClubVault.sol";
import {IPonsFactory, IFeeEscrow, TokenParams} from "../src/interfaces/IPonsV2.sol";

/**
 * @notice Integration tests against LIVE Robinhood Chain state.
 *
 *  These do not use mocks. They fork mainnet and exercise the real Pons factory, the real
 *  NVDA stock token, and the real fee escrow. Everything here would happen for real on a
 *  broadcast; the only thing a fork cannot prove is that a signed transaction lands.
 *
 *  Run:  forge test --match-path test/ForkIntegration.t.sol -vv
 *  Skip: forge test --no-match-path 'test/ForkIntegration.t.sol'   (offline)
 */
contract ForkIntegrationTest is Test {
    address constant NVDA   = 0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC;
    address constant PONS   = 0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e;
    address constant ESCROW = 0xd3AFEB2a57f70eF218Aa82451c51B2fb0416Ac9e;
    /// @dev the NVDA/USDG 0.05% Uniswap pool, which holds ~10.6k NVDA
    address constant WHALE  = 0xd4EB21209C4D6093f80B5b84f5C45cc093EA14a3;

    uint256 constant FORK_BLOCK = 50475281;
    uint256 constant LAUNCH_FEE = 0.0005 ether;

    ClubFactory factory;
    address owner    = makeAddr("owner");
    address treasury = makeAddr("treasury");
    address guardian = makeAddr("guardian");

    uint256 userPk = 0xB0B;
    address user;

    function setUp() public {
        vm.createSelectFork("rh_mainnet", FORK_BLOCK);
        user = vm.addr(userPk);

        factory = new ClubFactory(IPonsFactory(PONS), treasury, guardian, owner);
        vm.prank(owner);
        factory.setMinSeed(NVDA, 1e18);

        vm.prank(WHALE);
        IERC20(NVDA).transfer(user, 200e18);
        vm.deal(user, 1 ether);
    }

    function _params(string memory name_, string memory sym_) internal view returns (TokenParams memory p) {
        p.name = name_;
        p.symbol = sym_;
        p.creatorTaxBps = 1000; // 10%, the Pons maximum
        p.buybackEnabled = true;
        p.salt = keccak256(abi.encode(name_, block.number, address(this)));
    }

    // ------------------------------------------------------------------ the premise

    function test_Fork_NvdaIsARegisteredPonsPairAsset() public view {
        (uint256 phantom, uint256 threshold, uint8 dec) = IPonsFactory(PONS).pairTokenEconomics(NVDA);
        assertEq(phantom, 16.64e18, "phantom quote");
        assertEq(threshold, 41.6e18, "graduation threshold");
        assertEq(dec, 18, "decimals");
        console2.log("NVDA graduates at (wei):", threshold);
    }

    function test_Fork_RealVaultCanCustodyRealNvda() public {
        (address v,) = _open("Custody Test", "CUST", 25e18);
        ClubVault vault = ClubVault(payable(v));

        assertEq(IERC20(NVDA).balanceOf(v), 25e18, "the jar holds real NVDA");
        assertEq(vault.totalAssets(), 25e18);

        // a second depositor joins
        vm.startPrank(user);
        IERC20(NVDA).approve(v, 50e18);
        uint256 shares = vault.deposit(50e18, user);
        vm.stopPrank();
        assertGt(shares, 0);
        assertEq(IERC20(NVDA).balanceOf(v), 75e18);

        // and leaves again
        uint256 before = IERC20(NVDA).balanceOf(user);
        vm.prank(user);
        vault.redeem(shares, user, user);
        uint256 got = IERC20(NVDA).balanceOf(user) - before;
        assertApproxEqRel(got, 49.75e18, 1e16, "out, minus the 0.5% exit fee");
    }

    // ------------------------------------------------------------------ the real launch

    function test_Fork_CreateClubLaunchesARealMascotBoundToTheVault() public {
        (address v, address mascot) = _open("Jensens Leather Jacket", "GPU", 25e18);

        assertTrue(mascot != address(0), "Pons returned a mascot address");
        assertGt(mascot.code.length, 0, "the mascot is a deployed contract");
        console2.log("vault ", v);
        console2.log("mascot", mascot);

        // Ask Pons who receives this token's creator fees. We do not rely on a guessed struct
        // layout - we read the record raw and assert the vault address appears in it.
        (bool ok, bytes memory rec) = PONS.staticcall(abi.encodeWithSignature("getLaunchedToken(address)", mascot));
        assertTrue(ok && rec.length >= 32, "getLaunchedToken returned a record");
        assertTrue(_contains(rec, v), "the vault is the creator fee recipient on the live record");
    }

    function test_Fork_MascotIsPricedInNvdaSoFeesArriveAsNvda() public {
        (address v, address mascot) = _open("Pair Check", "PAIR", 20e18);

        // The escrow keys balances by (recipient, quote asset). Nothing has traded yet, so the
        // vault's NVDA-denominated fee balance must exist and read zero rather than revert.
        uint256 pending = IFeeEscrow(ESCROW).balanceOfToken(v, NVDA);
        assertEq(pending, 0, "no fees yet");
        assertEq(ClubVault(payable(v)).pendingFees(), 0, "vault agrees with the escrow");
        assertEq(ClubVault(payable(v)).currentMascot(), mascot);
    }

    // ------------------------------------------------------------------ permit, real token

    function test_Fork_DepositWithPermitAgainstTheRealNvdaToken() public {
        (address v,) = _open("Permit Check", "PRMT", 20e18);
        ClubVault vault = ClubVault(payable(v));

        uint256 amount = 40e18;
        uint256 deadline = block.timestamp + 1 hours;

        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"),
                user, v, amount, IERC20Permit(NVDA).nonces(user), deadline
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", IERC20Permit(NVDA).DOMAIN_SEPARATOR(), structHash));
        (uint8 sv, bytes32 sr, bytes32 ss) = vm.sign(userPk, digest);

        assertEq(IERC20(NVDA).allowance(user, v), 0, "no approval beforehand");

        vm.prank(user);
        uint256 shares = vault.depositWithPermit(amount, user, deadline, sv, sr, ss);

        assertGt(shares, 0, "permit deposit worked on the live token");
        assertEq(IERC20(NVDA).balanceOf(v), 60e18);
    }

    // ------------------------------------------------------------------ issuer powers, live

    /**
     * @notice The whole product depends on a never-KYC'd contract being able to hold this token.
     * @dev isBlocked(address) is present in the implementation bytecode but REVERTS on the live
     *      token, so it proves nothing. This asserts the thing that actually matters instead:
     *      NVDA moves into a vault deployed seconds ago, and back out again.
     */
    function test_Fork_ArbitraryFreshContractCanCustodyTheToken() public {
        (address v,) = _open("Custody Proof", "PROOF", 10e18);
        assertGt(v.code.length, 0, "vault deployed in this test");
        assertEq(IERC20(NVDA).balanceOf(v), 10e18, "a brand new contract holds real NVDA");

        vm.prank(user);
        IERC20(NVDA).transfer(v, 5e18);
        assertEq(IERC20(NVDA).balanceOf(v), 15e18, "and can receive more, from an EOA, unguarded");

        (bool ok, bytes memory out) = NVDA.staticcall(abi.encodeWithSignature("paused()"));
        assertTrue(ok, "paused() is callable");
        assertFalse(abi.decode(out, (bool)), "token is not paused");
    }

    function test_Fork_HarvestOnAnIdleClubGivesOurErrorNotPons() public {
        (address v,) = _open("Idle Club", "IDLE", 10e18);
        // The live escrow reverts NoBalance(); our pre-check must surface NothingToHarvest instead.
        vm.expectRevert(ClubVault.NothingToHarvest.selector);
        ClubVault(payable(v)).harvest();
    }

    function test_Fork_UiMultiplierDoesNotMoveRawAccounting() public {
        (address v,) = _open("ERC8056 Check", "UI", 30e18);
        (, bytes memory m) = NVDA.staticcall(abi.encodeWithSignature("uiMultiplier()"));
        uint256 mult = abi.decode(m, (uint256));
        assertGt(mult, 0, "ERC-8056 multiplier is live");
        // We account in raw balances, so totalAssets must equal the raw balance exactly.
        assertEq(ClubVault(payable(v)).totalAssets(), IERC20(NVDA).balanceOf(v));
        console2.log("live NVDA uiMultiplier:", mult);
    }

    // ------------------------------------------------------------------ helpers

    function _open(string memory name_, string memory sym_, uint256 seed)
        internal
        returns (address vault, address mascot)
    {
        vm.startPrank(user);
        IERC20(NVDA).approve(address(factory), type(uint256).max);
        (vault, mascot) = factory.createClub{value: LAUNCH_FEE}(
            NVDA, seed, string.concat(name_, " Club"), "cNVDA", 1000, _params(name_, sym_), 0
        );
        vm.stopPrank();
    }

    function _contains(bytes memory haystack, address needle) internal pure returns (bool) {
        bytes20 n = bytes20(needle);
        for (uint256 i = 0; i + 20 <= haystack.length; i++) {
            bool hit = true;
            for (uint256 j = 0; j < 20; j++) {
                if (haystack[i + j] != n[j]) { hit = false; break; }
            }
            if (hit) return true;
        }
        return false;
    }
}

/// @notice Overpaying the Pons launch fee must not silently donate the excess.
contract ForkRefundTest is Test {
    address constant NVDA  = 0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC;
    address constant PONS  = 0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e;
    address constant WHALE = 0xd4EB21209C4D6093f80B5b84f5C45cc093EA14a3;

    ClubFactory factory;
    address user = makeAddr("payer");

    function setUp() public {
        vm.createSelectFork("rh_mainnet", 50475281);
        address owner = makeAddr("owner");
        factory = new ClubFactory(IPonsFactory(PONS), makeAddr("t"), makeAddr("g"), owner);
        vm.prank(owner);
        factory.setMinSeed(NVDA, 1e18);
        vm.prank(WHALE);
        IERC20(NVDA).transfer(user, 100e18);
        vm.deal(user, 10 ether);
    }

    function test_Fork_OverpaidLaunchFeeIsRefunded() public {
        TokenParams memory p;
        p.name = "Refund"; p.symbol = "RFND"; p.creatorTaxBps = 1000; p.buybackEnabled = true;
        p.salt = keccak256("refund");

        uint256 fee = IPonsFactory(PONS).launchFee();
        uint256 before = user.balance;

        vm.startPrank(user);
        IERC20(NVDA).approve(address(factory), type(uint256).max);
        factory.createClub{value: 1 ether}(NVDA, 10e18, "Refund Club", "cNVDA", 1000, p, 0);
        vm.stopPrank();

        assertEq(before - user.balance, fee, "only the launch fee left the wallet");
    }

    function test_Fork_UnderpaidLaunchFeeRevertsCleanly() public {
        TokenParams memory p;
        p.name = "Under"; p.symbol = "UNDR"; p.creatorTaxBps = 1000; p.salt = keccak256("under");
        vm.startPrank(user);
        IERC20(NVDA).approve(address(factory), type(uint256).max);
        vm.expectRevert(ClubFactory.InsufficientLaunchFee.selector);
        factory.createClub{value: 0}(NVDA, 10e18, "Under Club", "cNVDA", 1000, p, 0);
        vm.stopPrank();
    }
}
