// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {TokenParams, IPonsFactory} from "../src/interfaces/IPonsV2.sol";

/// @dev Mirrors the real Robinhood stock token: OZ ERC20 + issuer mint/burn/pause + blocklist,
///      plus ERC-8056 uiMultiplier that does NOT affect raw balances.
contract MockStockToken is ERC20, ERC20Permit {
    address public issuer;
    bool public paused;
    uint256 public uiMultiplier = 1e18;
    mapping(address => bool) public isBlocked;

    constructor() ERC20("NVIDIA / Robinhood Token", "NVDA") ERC20Permit("NVIDIA / Robinhood Token") {
        issuer = msg.sender;
    }

    function mint(address to, uint256 amt) external { _mint(to, amt); }
    function burn(address from, uint256 amt) external { _burn(from, amt); }
    function pause() external { paused = true; }
    function unpause() external { paused = false; }
    function setUiMultiplier(uint256 m) external { uiMultiplier = m; }
    function balanceOfUI(address a) external view returns (uint256) {
        return balanceOf(a) * uiMultiplier / 1e18;
    }

    function _update(address from, address to, uint256 value) internal override(ERC20) {
        require(!paused, "paused");
        require(!isBlocked[from] && !isBlocked[to], "blocked");
        super._update(from, to, value);
    }
}

contract MockMascot is ERC20 {
    constructor() ERC20("Mascot", "MASCOT") {}
}

/// @dev Pull-based, msg.sender-scoped. Exactly like the real Pons FeeEscrow.
contract MockFeeEscrow {
    mapping(address => mapping(address => uint256)) public bal;

    function accrue(address recipient, address token, uint256 amt) external {
        bal[recipient][token] += amt;
        IERC20(token).transferFrom(msg.sender, address(this), amt);
    }

    function claimToken(address token) external {
        uint256 amt = bal[msg.sender][token];
        bal[msg.sender][token] = 0;
        if (amt != 0) IERC20(token).transfer(msg.sender, amt);
    }

    function claim() external {}
    function balanceOf(address r) external view returns (uint256) { return bal[r][address(0)]; }
    function balanceOfToken(address r, address t) external view returns (uint256) { return bal[r][t]; }
}

contract MockPonsFactory {
    address public feeEscrowAddr;
    mapping(address => uint256) public thresholds;
    mapping(address => address) public feeRecipientOf;
    address public lastLaunched;

    constructor(address escrow_) { feeEscrowAddr = escrow_; }

    function enablePair(address token, uint256 threshold) external { thresholds[token] = threshold; }
    function feeEscrow() external view returns (address) { return feeEscrowAddr; }
    function maxCreatorTaxBps() external pure returns (uint16) { return 1000; }
    function launchFee() external pure returns (uint256) { return 0.0005 ether; }

    function pairTokenEconomics(address t) external view returns (uint256, uint256, uint8) {
        uint256 th = thresholds[t];
        return th == 0 ? (0, 0, 0) : (th * 2 / 5, th, 18);
    }

    function launchToken(TokenParams calldata params, uint256, address)
        external payable returns (address token, address curve)
    {
        token = address(new MockMascot());
        feeRecipientOf[token] = params.creatorFeeRecipient;
        lastLaunched = token;
        return (token, address(0));
    }

    function launchAndBuy(TokenParams calldata, uint256, address, uint256, uint256, address, address[] calldata)
        external payable returns (address, address, uint256) { return (address(0), address(0), 0); }

    function transferCreatorFeeRecipient(address token, address newRecipient) external {
        require(msg.sender == feeRecipientOf[token], "not recipient");
        feeRecipientOf[token] = newRecipient;
    }
}
