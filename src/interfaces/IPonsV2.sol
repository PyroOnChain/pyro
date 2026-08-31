// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @notice Pons v2 launch parameters. Field order taken verbatim from docs.ponsfamily.com/v2.
struct Socials {
    string twitter;
    string telegram;
    string discord;
    string website;
    string farcaster;
}

struct TokenParams {
    string name;
    string symbol;
    string logo;
    string description;
    Socials socials;
    address creatorFeeRecipient; // <-- the club vault goes here
    uint16 creatorTaxBps;        // <-- capped by maxCreatorTaxBps(), verified == 1000 (10%)
    bool buybackEnabled;
    bytes32 expectedEconomics;
    bytes32 salt;
}

/// @dev Pons v2 factory: 0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e
interface IPonsFactory {
    function launchToken(TokenParams calldata params, uint256 launchConfigId, address pairToken)
        external
        payable
        returns (address token, address curve);

    /// @dev Callable ONLY by the current recipient. If the vault is the recipient and has no
    ///      passthrough to this, the fee stream is frozen at that address forever.
    function transferCreatorFeeRecipient(address token, address newRecipient) external;

    function pairTokenEconomics(address pairToken)
        external
        view
        returns (uint256 phantomQuote, uint256 graduationThreshold, uint8 decimals);

    function maxCreatorTaxBps() external view returns (uint16);

    /// @dev Custom error the factory reverts with when msg.value < launchFee(). Selector 0x7e6d78a5.
    ///      Confirmed by simulating launchToken against mainnet with no fee attached.
    function launchFee() external view returns (uint256);
    function feeEscrow() external view returns (address);
}

/// @dev FeeEscrow: 0xd3AFEB2a57f70eF218Aa82451c51B2fb0416Ac9e
///      IMPORTANT: every claim function is msg.sender-scoped. No claimFor(recipient) exists.
///      A keeper cannot claim on the vault's behalf; the vault must call this itself.
interface IFeeEscrow {
    function claim() external;                                   // native
    function claimToken(address token) external;                 // ERC-20 quote asset
    function balanceOf(address recipient) external view returns (uint256);
    function balanceOfToken(address recipient, address token) external view returns (uint256);
}

/**
 * @dev launchAndBuy does NOT live on the Pons factory. It is a separate contract at
 *      0xe33E9E479dF8802cb0866d5d05258bEc4cF62948.
 *      Verified: the selector for this exact signature (0xf85f8e41) is present in that
 *      contract's bytecode and absent from the factory's.
 */
interface IPonsLaunchAndBuy {
    function launchAndBuy(
        TokenParams calldata params,
        uint256 launchConfigId,
        address pairToken,
        uint256 quoteIn,
        uint256 minTokensOut,
        address recipient,
        address[] calldata snipeTaxExemptions
    ) external payable returns (address token, address curve, uint256 tokensOut);
}
