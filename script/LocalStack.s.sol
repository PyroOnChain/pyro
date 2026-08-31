// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ClubFactory} from "../src/ClubFactory.sol";
import {ClubVault} from "../src/ClubVault.sol";
import {IPonsFactory, TokenParams} from "../src/interfaces/IPonsV2.sol";
import {MockStockToken, MockFeeEscrow, MockPonsFactory} from "../test/Mocks.sol";

/**
 * @notice Stands up the whole stack on a local chain so the frontend can be driven end to end.
 * @dev The Pons pieces are mocks here ONLY because anvil cannot fork Robinhood Chain (its Orbit
 *      block headers carry no excessBlobGas, which anvil's Cancun block env requires). The real
 *      Pons integration is covered separately by test/ForkIntegration.t.sol, which runs against
 *      live mainnet state. The ClubFactory and ClubVault deployed here are the real contracts.
 *
 *  forge script script/LocalStack.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
 */
contract LocalStack is Script {
    function run() external {
        uint256 pk = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80; // anvil #0, public test key
        address me = vm.addr(pk);

        vm.startBroadcast(pk);

        MockStockToken nvda = new MockStockToken();
        MockFeeEscrow escrow = new MockFeeEscrow();
        MockPonsFactory pons = new MockPonsFactory(address(escrow));
        pons.enablePair(address(nvda), 41.6e18);

        ClubFactory factory = new ClubFactory(IPonsFactory(address(pons)), me, me, me);
        factory.setMinSeed(address(nvda), 1e18);

        nvda.mint(me, 5_000e18);
        nvda.approve(address(factory), type(uint256).max);
        nvda.approve(address(escrow), type(uint256).max);

        address[3] memory vaults;
        string[3] memory names = ["Jensens Leather Jacket", "Cybertruck Windows", "One More Thing"];
        string[3] memory syms  = ["GPU", "WATT", "BITTEN"];
        uint256[3] memory seeds = [uint256(1284e18), 902e18, 744e18];
        uint16[3] memory cuts = [uint16(1000), 800, 1000];

        for (uint256 i; i < 3; i++) {
            TokenParams memory p;
            p.name = names[i];
            p.symbol = syms[i];
            p.creatorTaxBps = 1000;
            p.buybackEnabled = true;
            p.salt = keccak256(abi.encode(i));
            (address v,) = factory.createClub{value: 0.0005 ether}(
                address(nvda), seeds[i], string.concat(syms[i], " Club"), "cNVDA", cuts[i], p, 0
            );
            vaults[i] = v;
        }

        // Give two clubs some accrued mascot fees so harvest() has something to do.
        escrow.accrue(vaults[0], address(nvda), 2.8815e18);
        escrow.accrue(vaults[1], address(nvda), 1.2040e18);

        // And let one club show a real harvest already dripping.
        ClubVault(payable(vaults[2])).addMascot(address(0xBEEF));
        escrow.accrue(vaults[2], address(nvda), 4.5e18);
        ClubVault(payable(vaults[2])).harvest();

        vm.stopBroadcast();

        console2.log("NVDA      ", address(nvda));
        console2.log("FACTORY   ", address(factory));
        console2.log("club GPU  ", vaults[0]);
        console2.log("club WATT ", vaults[1]);
        console2.log("club BITTN", vaults[2]);
        console2.log("deployer  ", me);
    }
}
