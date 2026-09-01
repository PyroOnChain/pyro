// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {BattleFactory} from "../src/stockwars/BattleFactory.sol";
import {Battle} from "../src/stockwars/Battle.sol";
import {IPonsFactory, TokenParams} from "../src/interfaces/IPonsV2.sol";
import {MockPons, MockEscrow, MockCurve} from "../test/stockwars/Mocks.sol";
import {MockStockToken} from "../test/Mocks.sol";

/**
 * @notice Stands the whole arena up on a local chain so the frontend can be driven.
 * @dev Pons is mocked here only because anvil cannot fork Robinhood Chain. The real
 *      integration is covered by test/stockwars/Fork.t.sol against live mainnet.
 */
contract LocalStockWars is Script {
    function run() external {
        uint256 pk = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80; // anvil #0
        address me = vm.addr(pk);
        vm.startBroadcast(pk);

        MockStockToken nvda = new MockStockToken();
        MockEscrow escrow = new MockEscrow();
        MockPons pons = new MockPons(address(escrow), 16.64e18, 1_000_000);

        BattleFactory factory = new BattleFactory(IPonsFactory(address(pons)), me);
        factory.setMinSeed(address(nvda), 1e18);

        nvda.mint(me, 100_000e18);
        nvda.approve(address(factory), type(uint256).max);

        // a live fight, mid-hour, with one side clearly ahead
        address live = _start(factory, nvda, "Jensen's Jacket", "JACKET", "Cook's Turtleneck", "NECK");
        nvda.approve(live, type(uint256).max);
        Battle(payable(live)).enter(1, 40e18, 0);
        Battle(payable(live)).enter(2, 26e18, 0);
        MockCurve(address(Battle(payable(live)).curveA())).outsideBuy(180e18);
        Battle(payable(live)).poke();

        // a second live fight, much closer
        address close = _start(factory, nvda, "Bull Run", "BULL", "Bear Market", "BEAR");
        nvda.approve(close, type(uint256).max);
        Battle(payable(close)).enter(1, 18e18, 0);
        Battle(payable(close)).enter(2, 17e18, 0);

        vm.stopBroadcast();

        console2.log("NVDA      ", address(nvda));
        console2.log("FACTORY   ", address(factory));
        console2.log("live      ", live);
        console2.log("close     ", close);
        console2.log("deployer  ", me);
    }

    function _start(BattleFactory f, MockStockToken s, string memory an, string memory asym, string memory bn, string memory bsym)
        internal
        returns (address)
    {
        TokenParams memory a;
        a.name = an;
        a.symbol = asym;
        a.creatorTaxBps = 1000;
        a.salt = keccak256(abi.encode(an, block.timestamp));
        TokenParams memory b;
        b.name = bn;
        b.symbol = bsym;
        b.creatorTaxBps = 1000;
        b.salt = keccak256(abi.encode(bn, block.timestamp));
        return f.startBattle{value: 0.01 ether}(IERC20(address(s)), a, b, 0, 2e18, 0);
    }
}
