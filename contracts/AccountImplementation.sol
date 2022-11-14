// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

// Uncomment this line to use console.log
// import "hardhat/console.sol";
import "./AccountGuard.sol";

contract AccountImplementation {
    AccountGuard public immutable guard;

    modifier authAndWhitelisted(address target) {
        (bool canCall, bool isWhitelisted) = guard.canCallAndWhitelisted(
            address(this),
            msg.sender,
            target
        );
        require(
            canCall,
            "account-guard/not-owner"
        );
        require(
            isWhitelisted,
            "account-guard/illegal-target"
        );
        _;
    }

    constructor(AccountGuard _guard) {
        guard = _guard;
    }

    function send(address _target, bytes calldata _data) external payable authAndWhitelisted(_target) {
        (bool status, ) = (_target).call{value: msg.value}(_data);
        require(status, "account-guard/call-failed");
    }

    function execute(address _target, bytes memory /* code do not compile with calldata */ _data)
        external
        payable
        authAndWhitelisted(_target)
        returns (bytes32 response)
    {
        // call contract in current context
        assembly {
            let succeeded := delegatecall(
                sub(gas(), 5000),
                _target,
                add(_data, 0x20),
                mload(_data),
                0,
                32
            )
            returndatacopy(0, 0, returndatasize())
            switch succeeded
            case 1 {
                // throw if delegatecall failed
                revert(0, returndatasize())
            }
            default {
                response := mload(0)
            }
        }
    }
}
