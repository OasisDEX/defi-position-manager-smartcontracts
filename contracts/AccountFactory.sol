// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";
import {ImmutableProxy} from "./ImmutableProxy.sol";
import {AccountGuard} from "./AccountGuard.sol";
import {IProxyRegistry} from "./interfaces/IProxyRegistry.sol";
import {ManagerLike} from "./interfaces/ManagerLike.sol";
import {IServiceRegistry} from "./interfaces/IServiceRegistry.sol";
import {Constants} from "./utils/Constants.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import "hardhat/console.sol";

contract AccountFactory is Constants {
    IServiceRegistry public immutable serviceRegistry;

    mapping(address => address[]) public accounts; //owner => proxy address
    mapping(uint256 => address) public positionsToAccounts;
    mapping(address => address) public migrated;

    address public immutable proxyTemplate;
    address public immutable self;
    AccountGuard public guard;
    uint64 public accountsGlobalCounter;

    constructor(
        address _implementation,
        address _guard,
        IServiceRegistry _serviceRegistry
    ) {
        proxyTemplate = address(new ImmutableProxy(_implementation));
        accountsGlobalCounter = 0;
        guard = AccountGuard(_guard);
        serviceRegistry = _serviceRegistry;
        self = address(this);
        guard.initializeFactory();
    }

    function createAccount()
        public
        returns (address clone)
    {
        clone = createAccount(msg.sender);
        return clone;
    }

    function createAccount(address user)
        public
        returns (address)
    {
        accountsGlobalCounter++;
        address clone = Clones.clone(proxyTemplate);
        positionsToAccounts[accountsGlobalCounter] = clone;
        accounts[user].push(
            clone
        );
        guard.permit(user, clone, true);
        emit AccountCreated(
            clone,
            user,
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
        uint64 vaultId
    );
}
