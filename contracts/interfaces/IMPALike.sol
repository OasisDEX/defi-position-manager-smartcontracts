// SPDX-License-Identifier: MIT

pragma solidity ^0.8.1;

struct CdpData {
    address gemJoin;
    address payable fundsReceiver;
    uint256 cdpId;
    bytes32 ilk;
    uint256 requiredDebt;
    uint256 borrowCollateral;
    uint256 withdrawCollateral;
    uint256 withdrawDai;
    uint256 depositDai;
    uint256 depositCollateral;
    bool skipFL;
    string methodName;
}

struct ExchangeData {
    address fromTokenAddress;
    address toTokenAddress;
    uint256 fromTokenAmount;
    uint256 toTokenAmount;
    uint256 minToTokenAmount;
    address exchangeAddress;
    bytes _exchangeCalldata;
}

struct AddressRegistry {
    address jug;
    address manager;
    address multiplyProxyActions;
    address lender;
    address exchange;
}

interface IMPAProxy {
    function openMultiplyVault(
        ExchangeData calldata exchangeData,
        CdpData memory cdpData,
        AddressRegistry calldata addressRegistry
    ) external payable;

    function increaseMultipleDepositCollateral(
        ExchangeData calldata exchangeData,
        CdpData memory cdpData,
        AddressRegistry calldata addressRegistry
    ) external payable;

    function increaseMultipleDepositDai(
        ExchangeData calldata exchangeData,
        CdpData memory cdpData,
        AddressRegistry calldata addressRegistry
    ) external payable;

    function increaseMultiple(
        ExchangeData calldata exchangeData,
        CdpData memory cdpData,
        AddressRegistry calldata addressRegistry
    ) external;

    function decreaseMultiple(
        ExchangeData calldata exchangeData,
        CdpData memory cdpData,
        AddressRegistry calldata addressRegistry
    ) external;

    function decreaseMultipleWithdrawCollateral(
        ExchangeData calldata exchangeData,
        CdpData memory cdpData,
        AddressRegistry calldata addressRegistry
    ) external;

    function decreaseMultipleWithdrawDai(
        ExchangeData calldata exchangeData,
        CdpData memory cdpData,
        AddressRegistry calldata addressRegistry
    ) external payable;

    function closeVaultExitCollateral(
        ExchangeData calldata exchangeData,
        CdpData memory cdpData,
        AddressRegistry calldata addressRegistry
    ) external;

    function closeVaultExitDai(
        ExchangeData calldata exchangeData,
        CdpData memory cdpData,
        AddressRegistry calldata addressRegistry
    ) external;
}
