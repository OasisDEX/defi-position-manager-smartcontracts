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

contract AccountFactory is Constants {
    IServiceRegistry public immutable serviceRegistry;

    struct Account {
        address proxy;
        uint32 protocolIdentifier; //Maybe not needed
        uint64 vaultId;
    }

    mapping(address => Account[]) public accounts;
    mapping(address => address) public migrated;

    address public immutable proxyTemplate;
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
    }

    function createAccount(uint32 protocolIdentifier) public returns (address) {
        accountsGlobalCounter++;
        address clone = Clones.clone(proxyTemplate);
        accounts[msg.sender].push(
            Account(clone, protocolIdentifier, accountsGlobalCounter)
        );
        guard.permit(msg.sender, clone, true);
        emit AccountCreated(
            clone,
            msg.sender,
            protocolIdentifier,
            accountsGlobalCounter
        );
        return clone;
    }

    function accountsCount(address user) public view returns (uint256) {
        return accounts[user].length;
    }

    function getMakerProxy(address _user) public view returns (address) {
        IProxyRegistry mcdRegistry = IProxyRegistry(
            serviceRegistry.getRegisteredService(PROXY_REGISTRY_KEY)
        );
        address proxyAddr = mcdRegistry.proxies(_user);
        if (migrated[_user] != address(0)) {
            return migrated[_user];
        }

        return proxyAddr;
    }

    function migrateMaker(uint256[] calldata cdpIds) public returns (address) {
        require(migrated[msg.sender] == address(0), "factory/already-migrated");
        IManager manager = IManager(
            serviceRegistry.getRegisteredService(CDP_MANAGER_KEY)
        );
        // protocol identifier set as 0 for maker (?)
        address newProxy = createAccount(0);
        uint256[] memory _cdpIds = cdpIds;
        uint256 length = _cdpIds.length;
        for (uint256 i; i < length; i++) {
            manager.give(_cdpIds[i], newProxy);
        }

        return newProxy;
    }

    function migrateAdditionalVaults(uint256[] calldata cdpIds)
        public
        returns (address)
    {
        IManager manager = IManager(
            serviceRegistry.getRegisteredService(CDP_MANAGER_KEY)
        );

        address newProxy = accounts[msg.sender][0].proxy;
        uint256[] memory _cdpIds = cdpIds;
        uint256 length = _cdpIds.length;

        for (uint256 i; i < length; i++) {
            manager.give(_cdpIds[i], newProxy);
        }

        return newProxy;
    }

    event AccountCreated(
        address proxy,
        address user,
        uint32 protocolIdentifier,
        uint64 vaultId
    );
}
