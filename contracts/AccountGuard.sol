// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";
import "@openzeppelin/contracts/proxy/Proxy.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract AccountGuard is Ownable {
    address factory = address(0);
    mapping(address => mapping(address => bool)) private allowed;
    mapping(address => bool) private whitelisted;
    mapping(address => address) private owners;

    function isWhitelisted(address target) public view returns (bool) {
        return whitelisted[target];
    }

    function setWhitelist(address target, bool status) public onlyOwner {
        whitelisted[target] = status;
    }

    function canCall(address proxy, address operator)
        external
        view
        returns (bool)
    {
        return allowed[operator][proxy];
    }

    function initializeFactory() public {
        require(factory == address(0), "account-guard/factory-set");
        factory = msg.sender;
    }

    function permit(
        address caller,
        address target,
        bool allowance
    ) external {
        require(
            allowed[msg.sender][target] || msg.sender == factory,
            "account-guard/not-owner"
        );
        if (msg.sender == factory && allowance) {
            owners[target] = caller;
        } else {
            require(owners[target] != caller, "account-guard/cant-deny-owner");
        }
        allowed[caller][target] = allowance;
    }

    function changeOwner(address newOwner, address target) external {
        require(owners[target] == msg.sender, "account-guard/only-proxy-owner");
        owners[target] = newOwner;
    }
}
