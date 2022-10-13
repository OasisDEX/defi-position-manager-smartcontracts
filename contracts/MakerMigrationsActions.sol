// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";
import {ManagerLike} from "./interfaces/ManagerLike.sol";
import {IServiceRegistry} from "./interfaces/IServiceRegistry.sol";
import {Constants} from "./utils/Constants.sol";
import {AccountFactory} from "./AccountFactory.sol";

contract MakerMigrationsActions is Constants {
    IServiceRegistry public immutable serviceRegistry;

    mapping(address => address) public migrated;

    address public immutable self;

    constructor(IServiceRegistry _serviceRegistry) {
        serviceRegistry = _serviceRegistry;
        self = address(this);
    }

    modifier onlyDelegate() {
        require(address(this) != self, "maker-migrations-actions/only-delegate");
        _;
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
        ManagerLike manager = ManagerLike(
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
        ManagerLike manager = ManagerLike(
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
}
