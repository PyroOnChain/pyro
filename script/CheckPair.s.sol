// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {IPonsFactory} from "../src/interfaces/IPonsV2.sol";

/// @notice Is a given stock token usable as a Pons pair asset?
///      forge script script/CheckPair.s.sol --rpc-url rh_mainnet
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
