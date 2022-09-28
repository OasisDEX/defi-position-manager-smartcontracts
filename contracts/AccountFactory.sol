// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";
import "./ImmutableProxy.sol";
import "./AccountGuard.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";

contract AccountFactory {
    struct Account{
        address proxy;
        uint32 protocolIdentifier;//Maybe not needed
        uint64 vaultId;
    }
    mapping(address => Account[]) public accounts;
    address public immutable proxyTemplate;
    AccountGuard public guard;
    uint64 public accountsGlobalCounter;
    uint64 public constant STARTING_INDEX = 10;


    constructor(address _implementation, address _guard) {
        proxyTemplate = address(new ImmutableProxy(_implementation));
        accountsGlobalCounter = STARTING_INDEX;
        guard = AccountGuard(_guard);
    }

    function createAccount(uint32 protocolIdentifier) public{
        accountsGlobalCounter++;
        address clone =  Clones.clone(proxyTemplate);
        accounts[msg.sender].push(Account(clone, protocolIdentifier, accountsGlobalCounter));
        guard.permit(msg.sender, clone, true);
        emit AccountCreated(clone, msg.sender, protocolIdentifier, accountsGlobalCounter);
    }
    
    event AccountCreated(address proxy, address user, uint32 protocolIdentifier, uint64 vaultId);
}
