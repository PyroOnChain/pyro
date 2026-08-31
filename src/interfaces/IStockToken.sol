// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice A Robinhood tokenized stock (e.g. NVDA 0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC).
/// @dev Verified on mainnet: OZ upgradeable ERC20 + Permit + Pausable + blocklist, behind a
///      BeaconProxy whose beacon is the shared AccessControlsRegistry.
///      Implements ERC-8056 (Scaled UI Amount): dividends and splits move `uiMultiplier`,
///      raw balanceOf NEVER changes. Account in RAW. Display in UI.
interface IStockToken is IERC20 {
    /// @dev NOTE: isBlocked(address) appears in the implementation bytecode but REVERTS with
    ///      empty returndata when called on the live token. Do not depend on it. What actually
    ///      matters is proven by fork test: a transfer into a freshly deployed, never-KYC'd
    ///      contract succeeds, so there is no allowlist standing between us and custody.
    function paused() external view returns (bool);

    // ERC-8056 -- display only, never used for accounting
    function uiMultiplier() external view returns (uint256);
    function balanceOfUI(address account) external view returns (uint256);
}
