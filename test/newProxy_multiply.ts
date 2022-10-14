import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { ethers } from "hardhat";
import { getMultiplyParams } from "@oasisdex/multiply";
import {
  AccountFactory,
  AccountImplementation,
  IMPAProxy,
  ManagerLike,
  McdViewLike,
} from "../typechain-types";
import BigNumber from "bignumber.js";
import { Signer } from "ethers";
import { HardhatUtils } from "./../scripts/common/hardhat.utils";
import {
  ensureBigNumber,
  forgeUnoswapCalldata,
  getETHPrice,
} from "../scripts/common/utils";
import { ONE_INCH_V4_ROUTER } from "../scripts/common/addresses";

const CDP_MANAGER = "0x5ef30b9986345249bc32d8928B7ee64DE9435E39";
const AUTOMATION_SERVICE_REGISTRY =
  "0x9b4Ae7b164d195df9C4Da5d08Be88b2848b2EaDA";
const MULTIPLY_PROXY_ACTIONS_ADDRESS =
  "0x2a49eae5cca3f050ebec729cf90cc910fadaf7a2";
const ETH_A_ILK =
  "0x4554482D41000000000000000000000000000000000000000000000000000000";
const MCD_VIEW = "0x55Dc2Be8020bCa72E58e665dC931E03B749ea5E0";
const hardhatUtils = new HardhatUtils(hre);
const oasisFee = new BigNumber(0.002);

describe("Multiply - new Proxy", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployFreshFactory() {
    const Dummy = await ethers.getContractFactory("Dummy");
    const dummy = await (await Dummy.deploy()).deployed();

    const Guard = await ethers.getContractFactory("AccountGuard");
    const guard = await (await Guard.deploy()).deployed();

    const Account = await ethers.getContractFactory("AccountImplementation");
    const account = await Account.deploy(guard.address);

    const AccountFactory = await ethers.getContractFactory("AccountFactory");
    const factory = await AccountFactory.deploy(
      account.address,
      guard.address,
      AUTOMATION_SERVICE_REGISTRY
    );

    const proxyAction = await ethers.getContractAt(
      "IMPAProxy",
      MULTIPLY_PROXY_ACTIONS_ADDRESS
    );
    const cdpManager = await ethers.getContractAt("ManagerLike", CDP_MANAGER);
    const mcdView = await ethers.getContractAt("McdViewLike", MCD_VIEW);
    await guard.setWhitelist(MULTIPLY_PROXY_ACTIONS_ADDRESS, true);

    return { guard, factory, dummy, proxyAction, cdpManager, mcdView };
  }

  let cdpManager: ManagerLike;
  let factory: AccountFactory;
  let proxyAction: IMPAProxy;
  let admin: Signer;
  let user1: Signer;
  let user2: Signer;
  let user1Proxy: AccountImplementation;
  let user2Proxy: AccountImplementation;
  let mcdView: McdViewLike;
  let price: any;

  function buildExchangeDataIncrease(
    requiredDebt: string,
    borrowCollateral: string,
    oasisFee: BigNumber
  ) {
    const exchangeData = {
      fromTokenAddress: hardhatUtils.addresses.DAI,
      toTokenAddress: hardhatUtils.addresses.WETH,
      fromTokenAmount: new BigNumber(requiredDebt).toFixed(0),
      toTokenAmount: borrowCollateral,
      minToTokenAmount: borrowCollateral,
      exchangeAddress: ONE_INCH_V4_ROUTER,
      _exchangeCalldata: forgeUnoswapCalldata(
        hardhatUtils.addresses.DAI,
        new BigNumber(requiredDebt).minus(oasisFee).toFixed(0),
        borrowCollateral,
        false
      ),
    };
    return exchangeData;
  }

  function buildCdpData(
    receiverAddress: string,
    cdpId: number,
    debtDelta: BigNumber,
    collateralDelta: BigNumber
  ) {
    const cdpData = {
      gemJoin: hardhatUtils.addresses.MCD_JOIN_ETH_A,
      fundsReceiver: receiverAddress,
      cdpId: cdpId,
      ilk: ETH_A_ILK,
      requiredDebt: debtDelta.abs().toFixed(0),
      borrowCollateral: collateralDelta.abs().toFixed(0),
      withdrawCollateral: 0,
      withdrawDai: 0,
      depositDai: 0,
      depositCollateral: 0,
      skipFL: false,
      methodName: "",
    };

    return cdpData;
  }

  async function computeDeltas(
    debt: BigNumber,
    collateral: BigNumber,
    newCollateral: BigNumber,
    collRatio: BigNumber,
    targetRatio: BigNumber
  ) {
    const oraclePrice = ensureBigNumber(
      await mcdView.getNextPrice(ETH_A_ILK)
    ).shiftedBy(-18);
    const ethPrice = (await getETHPrice()).multipliedBy(1.01); //account for slippage

    const { collateralDelta, debtDelta, oazoFee, skipFL } = getMultiplyParams(
      {
        oraclePrice: oraclePrice,
        marketPrice: ethPrice,
        OF: oasisFee,
        FF: new BigNumber(0),
        slippage: new BigNumber(0),
      },
      {
        currentDebt: new BigNumber(debt.toString()).shiftedBy(-18),
        currentCollateral: new BigNumber(collateral.toString()).shiftedBy(-18),
        minCollRatio: new BigNumber(collRatio.toString()),
      },
      {
        requiredCollRatio: targetRatio,
        providedCollateral: newCollateral,
        providedDai: new BigNumber(0),
        withdrawDai: new BigNumber(0),
        withdrawColl: new BigNumber(0),
      }
    );
    return { collateralDelta, debtDelta, oazoFee, skipFL, oraclePrice };
  }

  async function executeProxy(
    proxy: AccountImplementation,
    methodName: any,
    args: any,
    overrides: any = undefined
  ) {
    const data = proxyAction.interface.encodeFunctionData(methodName, args);
    return overrides
      ? await proxy.execute(MULTIPLY_PROXY_ACTIONS_ADDRESS, data, overrides)
      : await proxy.execute(MULTIPLY_PROXY_ACTIONS_ADDRESS, data);
  }

  this.beforeAll(async function () {
    user1 = ethers.provider.getSigner(2);
    user2 = ethers.provider.getSigner(3);

    price = ethers.utils.parseEther("20");

    admin = await hardhatUtils.impersonate(
      "0x12348c699adc022be55602ef389de5d8a3b25e3d"
    );

    ({ factory, proxyAction, cdpManager, mcdView } = await loadFixture(
      deployFreshFactory
    ));

    await mcdView
      .connect(admin)
      .approve(await ethers.provider.getSigner(0).getAddress(), true);
    await factory.connect(user1)["createAccount()"]();
    await factory.connect(user2)["createAccount()"]();
    const Account = await ethers.getContractFactory("AccountImplementation");
    user1Proxy = Account.attach(
      await factory.accounts(await user1.getAddress(), 0)
    );
    user2Proxy = Account.attach(
      await factory.accounts(await user2.getAddress(), 0)
    );
  });

  describe("create New vault", function () {
    it("Open 200% coll ratio vault", async function () {
      const lastCrpIdBefore = await cdpManager.cdpi();

      const reciverAddress = await user1.getAddress();

      const { collateralDelta, debtDelta, oazoFee, oraclePrice } =
        await computeDeltas(
          new BigNumber(0),
          new BigNumber(0),
          ensureBigNumber(price),
          new BigNumber(1.99),
          new BigNumber(2)
        );

      const exchangeData = buildExchangeDataIncrease(
        debtDelta.toFixed(0),
        collateralDelta.toFixed(0),
        oazoFee
      );

      const cdpData = buildCdpData(
        reciverAddress,
        0,
        debtDelta,
        collateralDelta
      );

      const tx = await executeProxy(
        user1Proxy.connect(user1),
        "openMultiplyVault",
        [exchangeData, cdpData, hardhatUtils.mpaServiceRegistry()],
        {
          value: price,
          gasLimit: "5000000",
        }
      );

      const receipt = await tx.wait();
      const abi = [
        "event MultipleActionCalled(string methodName, uint indexed cdpId, uint swapMinAmount, uint swapOptimistAmount, uint collateralLeft, uint daiLeft)",
      ];
      const iface = new ethers.utils.Interface(abi);
      const events = receipt?.events?.filter((x: any) => {
        return x.topics[0] === iface.getEventTopic("MultipleActionCalled");
      });

      const logs = events!.map((x) => iface.parseLog(x) as any);
      const ratio = ensureBigNumber(
        await mcdView.getRatio(logs[0].args.cdpId.toString(), false)
      ).shiftedBy(-18);

      expect(ratio.toNumber()).to.be.greaterThan(1.9);
      expect(ratio.toNumber()).to.be.lessThan(2.1);
    });
  });
});
