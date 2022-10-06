//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface McdViewLike {
    function getVaultInfo(uint256 _vaultId) external view returns (uint256, uint256) ;
}
