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

    modifier onlyDelegate() {
        require(address(this) != self, "bot/only-delegate");
        _;
    }

    /// @dev Returns the correct user proxy depending on the migration status
    /// @param user address of the user
    /// @return proxyAddr address of the users proxy
    function getMakerProxy(address user)
        public
        view
        returns (address proxyAddr)
    {
        IProxyRegistry mcdRegistry = IProxyRegistry(
            serviceRegistry.getRegisteredService(PROXY_REGISTRY_KEY)
        );
        proxyAddr = mcdRegistry.proxies(user);
        if (migrated[user] != address(0)) {
            return migrated[user];
        }

        return proxyAddr;
    }

    /// @dev transfers ownership of all CdpIds to the newly created Oasis proxy
    /// @param cdpIds list of user owned cdpIds
    /// @return newProxy address of the users Oasis proxy
    function migrateMaker(uint256[] calldata cdpIds)
        public
        onlyDelegate
        returns (address newProxy)
    {
        require(migrated[msg.sender] == address(0), "factory/already-migrated");
        IManager manager = IManager(
            serviceRegistry.getRegisteredService(CDP_MANAGER_KEY)
        );
        AccountFactory _factory = AccountFactory(
            serviceRegistry.getRegisteredService(ACCOUNT_FACTORY_KEY)
        );
        newProxy = _factory.createAccount(msg.sender);
        uint256[] memory _cdpIds = cdpIds;
        uint256 length = _cdpIds.length;
        for (uint256 i; i < length; i++) {
            manager.give(_cdpIds[i], newProxy);
        }

        return newProxy;
    }

    /// @dev transfers ownership of all CdpIds to the existing Oasis proxy
    /// @param cdpIds list of user owned cdpIds
    /// @return newProxy address of the users Oasis proxy
    function migrateAdditionalVaults(uint256[] calldata cdpIds)
        public
        onlyDelegate
        returns (address newProxy)
    {
        require(migrated[msg.sender] != address(0), "factory/already-migrated");
        IManager manager = IManager(
            serviceRegistry.getRegisteredService(CDP_MANAGER_KEY)
        );
        // assume the first proxy from new factory is the dedicated maker migration one
        newProxy = migrated[msg.sender];
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
        uint64 vaultId
    );
}
