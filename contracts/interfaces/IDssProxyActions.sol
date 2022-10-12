//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IDssProxyActions {
    function transfer(
        address gem,
        address dst,
        uint256 wad
    ) external;

    function ethJoin_join(address apt, address urn) external payable;

    function gemJoin_join(
        address apt,
        address urn,
        uint256 wad,
        bool transferFrom
    ) external;

    function hope(address obj, address usr) external;

    function nope(address obj, address usr) external;

    function open(
        address manager,
        bytes32 ilk,
        address usr
    ) external;

    function give(
        address manager,
        uint256 cdp,
        address usr
    ) external;

    function giveToProxy(
        address proxyRegistry,
        address manager,
        uint256 cdp,
        address dst
    ) external;

    function cdpAllow(
        address manager,
        uint256 cdp,
        address usr,
        uint256 ok
    ) external;

    function urnAllow(
        address manager,
        address usr,
        uint256 ok
    ) external;

    function flux(
        address manager,
        uint256 cdp,
        address dst,
        uint256 wad
    ) external;

    function move(
        address manager,
        uint256 cdp,
        address dst,
        uint256 rad
    ) external;

    function frob(
        address manager,
        uint256 cdp,
        int256 dink,
        int256 dart
    ) external;

    function quit(
        address manager,
        uint256 cdp,
        address dst
    ) external;

    function enter(
        address manager,
        address src,
        uint256 cdp
    ) external;

    function shift(
        address manager,
        uint256 cdpSrc,
        uint256 cdpOrg
    ) external;

    function makeGemBag(address gemJoin) external returns (address bag);

    function lockETH(
        address manager,
        address ethJoin,
        uint256 cdp
    ) external payable;

    function safeLockETH(
        address manager,
        address ethJoin,
        uint256 cdp,
        address owner
    ) external payable;

    function lockGem(
        address manager,
        address gemJoin,
        uint256 cdp,
        uint256 wad,
        bool transferFrom
    ) external;

    function safeLockGem(
        address manager,
        address gemJoin,
        uint256 cdp,
        uint256 wad,
        bool transferFrom,
        address owner
    ) external;

    function freeETH(
        address manager,
        address ethJoin,
        uint256 cdp,
        uint256 wad
    ) external;

    function freeGem(
        address manager,
        address gemJoin,
        uint256 cdp,
        uint256 wad
    ) external;

    function exitETH(
        address manager,
        address ethJoin,
        uint256 cdp,
        uint256 wad
    ) external;

    function exitGem(
        address manager,
        address gemJoin,
        uint256 cdp,
        uint256 wad
    ) external;

    function draw(
        address manager,
        address jug,
        address daiJoin,
        uint256 cdp,
        uint256 wad
    ) external;

    function wipe(
        address manager,
        address daiJoin,
        uint256 cdp,
        uint256 wad
    ) external;

    function safeWipe(
        address manager,
        address daiJoin,
        uint256 cdp,
        uint256 wad,
        address owner
    ) external;

    function wipeAll(
        address manager,
        address daiJoin,
        uint256 cdp
    ) external;

    function safeWipeAll(
        address manager,
        address daiJoin,
        uint256 cdp,
        address owner
    ) external;

    function lockETHAndDraw(
        address manager,
        address jug,
        address ethJoin,
        address daiJoin,
        uint256 cdp,
        uint256 wadD
    ) external payable;

    function openLockETHAndDraw(
        address manager,
        address jug,
        address ethJoin,
        address daiJoin,
        bytes32 ilk,
        uint256 wadD
    ) external payable;

    function lockGemAndDraw(
        address manager,
        address jug,
        address gemJoin,
        address daiJoin,
        uint256 cdp,
        uint256 wadC,
        uint256 wadD,
        bool transferFrom
    ) external;

    function openLockGemAndDraw(
        address manager,
        address jug,
        address gemJoin,
        address daiJoin,
        bytes32 ilk,
        uint256 wadC,
        uint256 wadD,
        bool transferFrom
    ) external;

    function openLockGNTAndDraw(
        address manager,
        address jug,
        address gntJoin,
        address daiJoin,
        bytes32 ilk,
        uint256 wadC,
        uint256 wadD
    ) external;

    function wipeAndFreeETH(
        address manager,
        address ethJoin,
        address daiJoin,
        uint256 cdp,
        uint256 wadC,
        uint256 wadD
    ) external;

    function wipeAllAndFreeETH(
        address manager,
        address ethJoin,
        address daiJoin,
        uint256 cdp,
        uint256 wadC
    ) external;

    function wipeAndFreeGem(
        address manager,
        address gemJoin,
        address daiJoin,
        uint256 cdp,
        uint256 wadC,
        uint256 wadD
    ) external;

    function wipeAllAndFreeGem(
        address manager,
        address gemJoin,
        address daiJoin,
        uint256 cdp,
        uint256 wadC
    ) external;
}
