// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {BattleFactory} from "../src/stockwars/BattleFactory.sol";
import {IPonsFactory} from "../src/interfaces/IPonsV2.sol";

/**
 * @notice Deploys Stock Wars and configures the stocks matches can be fought in.
 *
 * @dev Deploys as msg.sender and only hands ownership over at the end. Configuring
 *      first and transferring last avoids the trap VaultTube hit, where the factory
 *      was constructed owned by someone else and then immediately failed its own
 *      owner-only setters.
 *
 *  forge script script/DeployStockWars.s.sol:DeployStockWars \
 *    --rpc-url rh_mainnet --broadcast --account <keystore>
 */
contract DeployStockWars is Script {
    address constant PONS = 0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e;

    struct Stock {
        string symbol;
        address token;
        uint256 minSeed;
    }

    function run() external {
        address owner = vm.envOr("OWNER", msg.sender);

        Stock[4] memory stocks = [
            Stock("NVDA", 0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC, 0.01e18),
            Stock("AAPL", 0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9, 0.01e18),
            Stock("TSLA", 0x322F0929c4625eD5bAd873c95208D54E1c003b2d, 0.01e18),
            Stock("AMZN", 0x12f190a9F9d7D37a250758b26824B97CE941bF54, 0.01e18)
        ];

        vm.startBroadcast();

        BattleFactory factory = new BattleFactory(IPonsFactory(PONS), msg.sender);
        for (uint256 i; i < stocks.length; i++) {
            factory.setMinSeed(stocks[i].token, stocks[i].minSeed);
        }

        if (owner != msg.sender) factory.transferOwnership(owner);

        vm.stopBroadcast();

        console2.log("FACTORY        ", address(factory));
        console2.log("IMPLEMENTATION ", factory.implementation());
        console2.log("duration (s)   ", factory.duration());
        for (uint256 i; i < stocks.length; i++) {
            console2.log(stocks[i].symbol, stocks[i].token, factory.minSeed(stocks[i].token));
        }
        if (owner != msg.sender) {
            console2.log("");
            console2.log("ownership offered to", owner);
            console2.log("that address must call acceptOwnership() to take it");
        }
    }
}
