// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {ClubFactory} from "../src/ClubFactory.sol";
import {IPonsFactory} from "../src/interfaces/IPonsV2.sol";

/// forge script script/Deploy.s.sol --rpc-url rh_mainnet --broadcast
contract Deploy is Script {
    // Verified live on Robinhood Chain mainnet (chainId 4663). See ADDRESSES.md.
    address constant PONS_FACTORY = 0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e;
    address constant NVDA         = 0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC;
    address constant AAPL         = 0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9;
    address constant TSLA         = 0x322F0929c4625eD5bAd873c95208D54E1c003b2d;
    address constant AMZN         = 0x12f190a9F9d7D37a250758b26824B97CE941bF54;

    function run() external {
        address treasury = vm.envAddress("TREASURY");
        address guardian = vm.envAddress("GUARDIAN");
        address owner    = vm.envAddress("OWNER");

        // Minimum seed to open a club, per ticker. Roughly $200-worth at the prices these
        // traded at when this was written; adjust before deploying if they have moved.
        address[4] memory tokens = [NVDA, AAPL, TSLA, AMZN];
        uint256[4] memory minSeeds = [uint256(1e18), 1e18, 1e18, 1e18];

        vm.startBroadcast();
        ClubFactory factory = new ClubFactory(IPonsFactory(PONS_FACTORY), treasury, guardian, owner);

        // Only enable a ticker Pons actually supports as a pair asset. Verified on mainnet:
        // NVDA (41.6), AAPL (24.2), TSLA (26.0), AMZN (29.33) all return non-zero economics.
        for (uint256 i; i < tokens.length; i++) {
            (, uint256 threshold,) = IPonsFactory(PONS_FACTORY).pairTokenEconomics(tokens[i]);
            require(threshold != 0, "ticker is not a Pons pair asset");
            factory.setMinSeed(tokens[i], minSeeds[i]);
        }

        vm.stopBroadcast();

        console2.log("ClubFactory:", address(factory));
        console2.log("owner      :", owner);
        console2.log("guardian   :", guardian);
        console2.log("treasury   :", treasury);
        console2.log("");
        console2.log("Next: NEXT_PUBLIC_CLUB_FACTORY=%s", address(factory));
    }
}

/// @dev Standalone check: is a given stock token usable as a Pons pair asset?
///      forge script script/Deploy.s.sol:CheckPair --rpc-url rh_mainnet
contract CheckPair is Script {
    function run() external view {
        IPonsFactory pons = IPonsFactory(0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e);
        address[4] memory toks = [
            0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC,
            0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9,
            0x322F0929c4625eD5bAd873c95208D54E1c003b2d,
            0x12f190a9F9d7D37a250758b26824B97CE941bF54
        ];
        for (uint256 i; i < toks.length; i++) {
            (uint256 phantom, uint256 threshold,) = pons.pairTokenEconomics(toks[i]);
            console2.log(toks[i], phantom, threshold);
        }
    }
}
