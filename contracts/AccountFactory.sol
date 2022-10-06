// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";
import {ImmutableProxy} from "./ImmutableProxy.sol";
import {AccountGuard} from "./AccountGuard.sol";
import {IProxyRegistry} from "./interfaces/IProxyRegistry.sol";
import {IManager} from "./interfaces/IManager.sol";
import {IServiceRegistry} from "./interfaces/IServiceRegistry.sol";
import {Constants} from "./utils/Constants.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import "hardhat/console.sol";

contract AccountFactory is Constants {
    IServiceRegistry public immutable serviceRegistry;

    struct Account {
        address proxy;
        uint32 protocolIdentifier; //Maybe not needed
        uint64 vaultId;
    }

    mapping(address => Account[]) public accounts;

    address public immutable proxyTemplate;
    address public immutable self;
    AccountGuard public guard;
    uint64 public accountsGlobalCounter;
    uint64 public constant STARTING_INDEX = 10**10;

    constructor(
        address _implementation,
        address _guard,
        IServiceRegistry _serviceRegistry
    ) {
        proxyTemplate = address(new ImmutableProxy(_implementation));
        accountsGlobalCounter = STARTING_INDEX;
        guard = AccountGuard(_guard);
        serviceRegistry = _serviceRegistry;
        self = address(this);
    }

    function createAccount(uint32 protocolIdentifier)
        public
        returns (address clone)
    {
        clone = createAccount(protocolIdentifier, msg.sender);
        return clone;
    }

    function createAccount(uint32 protocolIdentifier, address user)
        public
        returns (address)
    {
        accountsGlobalCounter++;
        address clone = Clones.clone(proxyTemplate);
        accounts[user].push(
            Account(clone, protocolIdentifier, accountsGlobalCounter)
        );
        guard.permit(user, clone, true);
        emit AccountCreated(
            clone,
            user,
            protocolIdentifier,
            accountsGlobalCounter
        );
        return clone;
    }

    function accountsCount(address user) public view returns (uint256) {
        return accounts[user].length;
    }

    event AccountCreated(
        address proxy,
        address user,
        uint32 protocolIdentifier,
        uint64 vaultId
    );
}
