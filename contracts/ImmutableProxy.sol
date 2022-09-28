// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";
import "@openzeppelin/contracts/proxy/Proxy.sol";

contract ImmutableProxy is Proxy{

    address public immutable implementation;

    constructor(address _implementation) {
        implementation = _implementation;
    }

    function _implementation() override internal view virtual returns (address){
        return implementation;
    }
    
}
