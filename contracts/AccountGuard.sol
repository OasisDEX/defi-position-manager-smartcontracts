// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";
import "@openzeppelin/contracts/proxy/Proxy.sol";

contract AccountGuard {
    address factory = address(0);
    mapping(address => mapping(address => bool)) allowed;

    function canCall(address proxy, address operator)
        external
        view
        returns (bool)
    {
        return allowed[operator][proxy];
    }

    function initializeFactory() public{
        require(factory == address(0),"account-guard/factory-set");
        factory = msg.sender;
    }

    function permit(
        address caller,
        address target,
        bool allowance
    ) external {
        require(allowed[msg.sender][target] || msg.sender == factory, "account-guard/not-owner");
        allowed[caller][target] = allowance;
    }
}
