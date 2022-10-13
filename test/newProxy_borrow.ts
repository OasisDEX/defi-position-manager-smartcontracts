import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { AccountGuard } from "../typechain-types/contracts/AccountGuard";
import {
  AccountFactory,
  AccountImplementation,
  IDssProxyActions,
  ManagerLike,
} from "../typechain-types";
import { Dummy } from "../typechain-types/contracts/test";
import { Signer } from "ethers";
import { McdViewLike } from "../typechain-types/contracts/interfaces/McdViewLike";

const CDP_MANAGER = "0x5ef30b9986345249bc32d8928B7ee64DE9435E39";
const AUTOMATION_SERVICE_REGISTRY =
  "0x9b4Ae7b164d195df9C4Da5d08Be88b2848b2EaDA";
const PROXY_ACTIONS_ADDRESS = "0x82ecD135Dce65Fbc6DbdD0e4237E0AF93FFD5038";
const ETH_A_ILK =
  "0x4554482D41000000000000000000000000000000000000000000000000000000";
const MCD_JUG = "0x19c0976f590D67707E62397C87829d896Dc0f1F1";
const ETH_JOIN = "0x2F0b23f53734252Bda2277357e97e1517d6B042A";
const DAI_JOIN = "0x9759A6Ac90977b93B58547b4A71c78317f391A28";
const MCD_VIEW = "0x55Dc2Be8020bCa72E58e665dC931E03B749ea5E0";

describe("Borrow - new Proxy", function () {
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
      "IDssProxyActions",
      PROXY_ACTIONS_ADDRESS
    );
    const cdpManager = await ethers.getContractAt("ManagerLike", CDP_MANAGER);
    const mcdView = await ethers.getContractAt("McdViewLike", MCD_VIEW);
    await guard.setWhitelist(await proxyAction.address, true);
  
    return { guard, factory, dummy, proxyAction, cdpManager, mcdView };
  }

  let guard: AccountGuard;
  let cdpManager: ManagerLike;
  let factory: AccountFactory;
  let dummy: Dummy;
  let proxyAction: IDssProxyActions;
  let user1: Signer;
  let user2: Signer;
  let user1Proxy: AccountImplementation;
  let user2Proxy: AccountImplementation;
  let mcdView: McdViewLike;

  async function executeProxy(
    proxy: AccountImplementation,
    methodName: any,
    args: any,
    overrides: any = undefined
  ) {
    const data = proxyAction.interface.encodeFunctionData(methodName, args);
    overrides
      ? await proxy.execute(PROXY_ACTIONS_ADDRESS, data, overrides)
      : await proxy.execute(PROXY_ACTIONS_ADDRESS, data);
  }

  this.beforeAll(async function () {
    user1 = ethers.provider.getSigner(2);
    user2 = ethers.provider.getSigner(3);
    ({ guard, factory, dummy, proxyAction, cdpManager, mcdView } =
      await loadFixture(deployFreshFactory));
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
    it("Open of empty vault should not fail", async function () {
      const lastCrpIdBefore = await cdpManager.cdpi();

      await executeProxy(user1Proxy.connect(user1), "open", [
        CDP_MANAGER,
        ETH_A_ILK,
        await user1.getAddress(),
      ]);

      const lastCrpIdAfter = await cdpManager.cdpi();
      expect(lastCrpIdBefore).to.be.equal(lastCrpIdAfter - 1);

      const address = await cdpManager.owns(lastCrpIdAfter);
      expect(address).to.be.equal(await user1.getAddress());
    });

    it("Open of non empty vault should not fail", async function () {
      const startBalance = ethers.utils.formatEther(
        await ethers.provider.getBalance(await user1.getAddress())
      );

      await executeProxy(
        user1Proxy.connect(user1),
        "openLockETHAndDraw",
        [CDP_MANAGER, MCD_JUG, ETH_JOIN, DAI_JOIN, ETH_A_ILK, 0],
        {
          value: ethers.utils.parseEther("10"),
        }
      );

      const remainingBalance = ethers.utils.formatEther(
        await ethers.provider.getBalance(await user1.getAddress())
      );

      const diff = parseFloat(startBalance) - parseFloat(remainingBalance);

      const cdpId = await cdpManager.cdpi();
      console.log("cdpId", cdpId.toString());
      const data = await mcdView.getVaultInfo(cdpId.toString());

      expect(ethers.utils.formatEther(data[0])).to.be.equal("10.0");
      expect(ethers.utils.formatEther(data[1])).to.be.equal("0.0");
      expect(parseFloat(remainingBalance)).to.be.below(9990);

      expect(diff).to.be.below(10.001);
      expect(diff).to.be.above(9.999);
    });

    it("Open non empty vault and DAI withdraw should not fail", async function () {
      const startBalance = ethers.utils.formatEther(
        await ethers.provider.getBalance(await user1.getAddress())
      );

      await executeProxy(
        user1Proxy.connect(user1),
        "openLockETHAndDraw",
        [
          CDP_MANAGER,
          MCD_JUG,
          ETH_JOIN,
          DAI_JOIN,
          ETH_A_ILK,
          ethers.utils.parseEther("20000"),
        ],
        {
          value: ethers.utils.parseEther("100"),
        }
      );

      const remainingBalance = ethers.utils.formatEther(
        await ethers.provider.getBalance(await user1.getAddress())
      );

      const diff = parseFloat(startBalance) - parseFloat(remainingBalance);
      const cdpId = await cdpManager.cdpi();
      console.log("cdpId", cdpId.toString());
      const data = await mcdView.getVaultInfo(cdpId.toString());

      expect(ethers.utils.formatEther(data[0])).to.be.equal("100.0");
      expect(parseFloat(ethers.utils.formatEther(data[1]))).to.be.equal(20000);
      expect(diff).to.be.below(100.001);
      expect(diff).to.be.above(99.999);
    });
  });
});
