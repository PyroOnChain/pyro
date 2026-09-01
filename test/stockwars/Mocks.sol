// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {TokenParams} from "../../src/interfaces/IPonsV2.sol";

contract MockMeme is ERC20 {
    address public curve;

    constructor(string memory n, string memory s) ERC20(n, s) {
        curve = msg.sender;
    }

    function mint(address to, uint256 amt) external {
        require(msg.sender == curve, "only curve");
        _mint(to, amt);
    }

    function burn(address from, uint256 amt) external {
        require(msg.sender == curve, "only curve");
        _burn(from, amt);
    }
}

/**
 * @notice A bonding curve stand-in with a flat exchange rate.
 *
 * @dev The real curve prices along a bonding function; this one is linear, which is
 *      fine because nothing under test depends on the pricing shape. What does matter
 *      and is reproduced faithfully: buy takes an arbitrary recipient, and the reserve
 *      moves whether or not the arena was the buyer. `outsideBuy` exists so tests can
 *      push the market cap around from outside the platform, which is the case the
 *      peak mechanic has to survive.
 */
contract MockCurve {
    MockMeme public meme;
    IERC20 public quote;
    uint256 public reserve;
    uint256 public rate; // meme tokens per unit of quote

    constructor(string memory n, string memory s, address quote_, uint256 phantom, uint256 rate_) {
        meme = new MockMeme(n, s);
        quote = IERC20(quote_);
        reserve = phantom;
        rate = rate_;
    }

    function buy(uint256 quoteIn, uint256 minTokensOut, address recipient) external payable returns (uint256 out) {
        quote.transferFrom(msg.sender, address(this), quoteIn);
        out = quoteIn * rate;
        require(out >= minTokensOut, "slippage");
        reserve += quoteIn;
        meme.mint(recipient, out);
    }

    function sell(uint256 tokensIn, uint256 minQuoteOut, address recipient) external returns (uint256 out) {
        meme.burn(msg.sender, tokensIn);
        out = tokensIn / rate;
        require(out >= minQuoteOut, "slippage");
        reserve -= out;
        quote.transfer(recipient, out);
    }

    /// @notice Someone buying on Pons directly, not through the arena.
    function outsideBuy(uint256 quoteIn) external {
        reserve += quoteIn;
    }

    /// @notice And selling again, so a peak can be passed and then given back.
    function outsideSell(uint256 quoteOut) external {
        reserve -= quoteOut;
    }

    function quoteReserve() external view returns (uint256) {
        return reserve;
    }

    function graduated() external pure returns (bool) {
        return false;
    }

    function token() external view returns (address) {
        return address(meme);
    }

    function pairToken() external view returns (address) {
        return address(quote);
    }
}

contract MockEscrow {
    mapping(address => mapping(address => uint256)) public bal;

    function accrue(address recipient, address token, uint256 amt) external {
        bal[recipient][token] += amt;
        IERC20(token).transferFrom(msg.sender, address(this), amt);
    }

    /// @dev Mirrors the live escrow: msg.sender-scoped, and one lump per quote asset
    ///      covering every token that names this recipient. That is exactly why each
    ///      match needs its own address.
    function claimToken(address token) external {
        uint256 amt = bal[msg.sender][token];
        bal[msg.sender][token] = 0;
        if (amt > 0) IERC20(token).transfer(msg.sender, amt);
    }

    function claim() external {}

    function balanceOf(address r) external view returns (uint256) {
        return bal[r][address(0)];
    }

    function balanceOfToken(address r, address t) external view returns (uint256) {
        return bal[r][t];
    }
}

contract MockPons {
    address public escrowAddr;
    uint256 public rate;
    uint256 public phantom;
    mapping(address => address) public curveOf;
    mapping(address => address) public feeRecipientOf;

    constructor(address escrow_, uint256 phantom_, uint256 rate_) {
        escrowAddr = escrow_;
        phantom = phantom_;
        rate = rate_;
    }

    function feeEscrow() external view returns (address) {
        return escrowAddr;
    }

    function launchFee() external pure returns (uint256) {
        return 0.0005 ether;
    }

    function maxCreatorTaxBps() external pure returns (uint16) {
        return 1000;
    }

    function pairTokenEconomics(address) external view returns (uint256, uint256, uint8) {
        return (phantom, phantom * 25 / 10, 18);
    }

    function launchToken(TokenParams calldata p, uint256, address pair)
        external
        payable
        returns (address token, address curve)
    {
        MockCurve c = new MockCurve(p.name, p.symbol, pair, phantom, rate);
        token = c.token();
        curve = address(c);
        curveOf[token] = curve;
        feeRecipientOf[token] = p.creatorFeeRecipient;
    }

    function transferCreatorFeeRecipient(address token, address newRecipient) external {
        require(msg.sender == feeRecipientOf[token], "not recipient");
        feeRecipientOf[token] = newRecipient;
    }
}
