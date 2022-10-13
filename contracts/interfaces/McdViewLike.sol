//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface McdViewLike {
    function getVaultInfo(uint256 _vaultId)
        external
        view
        returns (uint256, uint256);

    function approve(address _allowedReader, bool isApproved) external;

    function getRatio(uint256 vaultId, bool useNextPrice)
        external
        view
        returns (uint256);

    function getPrice(bytes32 ilk) external view returns (uint256);

    function getNextPrice(bytes32 ilk) external view returns (uint256);
}
