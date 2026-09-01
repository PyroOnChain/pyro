// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @notice A Pons v2 bonding curve.
 *
 * @dev Signatures were not taken from documentation. Each selector below was
 *      confirmed present in the bytecode of a live curve
 *      (0x350AB0c8B8BFA6E6076A7E2334e3C877A2650215) and the argument order was
 *      read back off real mainnet transactions:
 *
 *        buy   0x59a87bc1  tx 0x1d82b1d6...f151  (3e15 quoteIn, minOut, recipient)
 *        sell  0xd04c6983  tx 0xe39c5f2e...39db  (tokensIn, minQuoteOut, recipient)
 *
 *      The third argument being an arbitrary recipient is the whole basis for
 *      Stock Wars custody: the arena buys and holds the tokens itself, which is
 *      what makes time-weighted holdings computable on chain.
 */
interface IPonsCurve {
    /// @param quoteIn        amount of the pair asset to spend
    /// @param minTokensOut   slippage floor
    /// @param recipient      who receives the meme tokens; may be any address
    function buy(uint256 quoteIn, uint256 minTokensOut, address recipient) external payable returns (uint256);

    /// @param tokensIn       amount of the meme token to sell
    /// @param minQuoteOut    slippage floor
    /// @param recipient      who receives the pair asset
    function sell(uint256 tokensIn, uint256 minQuoteOut, address recipient) external returns (uint256);

    /// @notice Pair asset sitting on the curve, phantom liquidity included.
    /// @dev This is the market cap proxy Stock Wars competes on. Pre-graduation the
    ///      price is a deterministic function of it, so "higher market cap" and
    ///      "more stock bought" are the same statement.
    function quoteReserve() external view returns (uint256);

    function graduated() external view returns (bool);
    function token() external view returns (address);
    function pairToken() external view returns (address);
}
