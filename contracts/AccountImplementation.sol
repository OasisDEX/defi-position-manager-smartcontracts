// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

// Uncomment this line to use console.log
// import "hardhat/console.sol";
import "./AccountGuard.sol";

contract AccountImplementation {
    AccountGuard public immutable guard;

    modifier authAndWhitelisted() {
        (bool isWhitelisted, bool canCall) = guard.canCallAndWhitelisted(
            address(this),
            msg.sender
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

    function send(address _target, bytes memory _data) public payable authAndWhitelisted {
        (bool status, ) = (_target).call{value: msg.value}(_data);
        require(status, "account-guard/call-failed");
    }

    function execute(address _target, bytes memory _data)
        public
        payable
        authAndWhitelisted
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
            response := mload(0) // load delegatecall output
            switch iszero(succeeded)
            case 1 {
                // throw if delegatecall failed
                revert(0, 0)
            }
        }
    }
}
