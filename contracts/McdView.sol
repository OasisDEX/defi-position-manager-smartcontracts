// SPDX-License-Identifier: AGPL-3.0-or-later

/// McdView.sol

// Copyright (C) 2021-2021 Oazo Apps Limited

// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.
pragma solidity 0.8.17;
import "./interfaces/ManagerLike.sol";
import "./interfaces/IProxyRegistry.sol";
import "./interfaces/IServiceRegistry.sol";

import "./interfaces/SpotterLike.sol";
import "./interfaces/VatLike.sol";
import "./interfaces/OsmMomLike.sol";
import "./interfaces/OsmLike.sol";
import "./external/DSMath.sol";
import "./MakerMigrationsActions.sol";

/// @title Getter contract for Vault info from Maker protocol
contract McdView is DSMath {
    IServiceRegistry public immutable serviceRegistry;

    ManagerLike public manager;
    VatLike public vat;
    SpotterLike public spotter;
    OsmMomLike public osmMom;
    address public owner;
    mapping(address => bool) public whitelisted;

    constructor(
        address _vat,
        address _manager,
        address _spotter,
        address _mom,
        address _owner,
        IServiceRegistry _serviceRegistry
    ) {
        manager = ManagerLike(_manager);
        vat = VatLike(_vat);
        spotter = SpotterLike(_spotter);
        osmMom = OsmMomLike(_mom);
        owner = _owner;
        serviceRegistry = _serviceRegistry;
    }

    function approve(address _allowedReader, bool isApproved) external {
        require(msg.sender == owner, "mcd-view/not-authorised");
        whitelisted[_allowedReader] = isApproved;
    }

    /// @notice Gets Vault info (collateral, debt)
    /// @param vaultId Id of the Vault
    function getVaultInfo(uint256 vaultId)
        public
        view
        returns (uint256, uint256)
    {
        address urn = manager.urns(vaultId);
        bytes32 ilk = manager.ilks(vaultId);

        (uint256 collateral, uint256 debt) = vat.urns(ilk, urn);
        (, uint256 rate, , , ) = vat.ilks(ilk);

        return (collateral, rmul(debt, rate));
    }

    /// @notice Gets a price of the asset
    /// @param ilk Ilk of the Vault
    function getPrice(bytes32 ilk) public view returns (uint256) {
        (, uint256 mat) = spotter.ilks(ilk);
        (, , uint256 spot, , ) = vat.ilks(ilk);

        return div(rmul(rmul(spot, spotter.par()), mat), 10**9);
    }

    /// @notice Gets oracle next price of the asset
    /// @param ilk Ilk of the Vault
    function getNextPrice(bytes32 ilk) public view returns (uint256) {
        require(whitelisted[msg.sender], "mcd-view/not-whitelisted");
        OsmLike osm = OsmLike(osmMom.osms(ilk));
        (bytes32 val, bool status) = osm.peep();
        require(status, "mcd-view/osm-price-error");
        return uint256(val);
    }

    /// @notice Gets Vaults ratio
    /// @param vaultId Id of the Vault
    function getRatio(uint256 vaultId, bool useNextPrice)
        public
        view
        returns (uint256)
    {
        bytes32 ilk = manager.ilks(vaultId);
        uint256 price = useNextPrice ? getNextPrice(ilk) : getPrice(ilk);
        (uint256 collateral, uint256 debt) = getVaultInfo(vaultId);
        if (debt == 0) return 0;
        return wdiv(wmul(collateral, price), debt);
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
            serviceRegistry.getRegisteredService("PROXY_REGISTRY_KEY")
        );
        MakerMigrationsActions makerMigrationsActions = MakerMigrationsActions(
            serviceRegistry.getRegisteredService("MAKER_MIGRATION_ACTIONS_KEY")
        );
        proxyAddr = mcdRegistry.proxies(user);
        if (makerMigrationsActions.migrated(user) != address(0)) {
            return makerMigrationsActions.migrated(user);
        }
        return proxyAddr;
    }
}
