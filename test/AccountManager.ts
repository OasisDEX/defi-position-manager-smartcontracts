import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { AccountGuard } from "../typechain-types/contracts/AccountGuard";
import { AccountFactory } from "../typechain-types";
import { Dummy } from "../typechain-types/contracts/test";
import { Signer, utils } from "ethers";
import hre from "hardhat";

describe("Accounts Manager", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployFreshFactory() {
    const Dummy = await ethers.getContractFactory("Dummy");
    const dummy = await (await Dummy.deploy()).deployed();

    const Guard = await ethers.getContractFactory("AccountGuard");
    const guard = await (await Guard.deploy()).deployed();

    await guard.setWhitelist(await dummy.address, true);

    const AccountFactory = await ethers.getContractFactory("AccountFactory");
    const factory = await AccountFactory.deploy(guard.address);

    return { guard, factory, dummy };
  }

  let guard: AccountGuard;
  let factory: AccountFactory;
  let dummy: Dummy;
  let user1: Signer;
  let user2: Signer;

  this.beforeAll(async function () {
    user1 = ethers.provider.getSigner(2);
    user2 = ethers.provider.getSigner(3);
    ({ guard, factory, dummy } = await loadFixture(deployFreshFactory));
    const tx = await factory["createAccount()"]();
    const receipt = await tx.wait();
  });

  describe("guard", function () {
    it("Should have owner set to deployer", async function () {
      const owner = await guard.owner();
      expect(owner).to.be.equal(
        await ethers.provider.getSigner(0).getAddress()
      );
    });

    it("Should allow seting whitelist by owner", async function () {
      const testAddress = await user1.getAddress();
      const initialStatus = await guard.isWhitelisted(testAddress);
      await guard.setWhitelist(testAddress, !initialStatus);
      const statusAfterFirstChange = await guard.isWhitelisted(testAddress);
      expect(statusAfterFirstChange).to.be.not.equal(initialStatus);
      await guard.setWhitelist(testAddress, initialStatus);
      const statusAfterSecondChange = await guard.isWhitelisted(testAddress);
      expect(statusAfterSecondChange).to.be.equal(initialStatus);
    });

    it("Should deny seting whitelist by not owner", async function () {
      const testAddress = await user1.getAddress();
      const initialStatus = await guard.isWhitelisted(testAddress);
      const tx = guard
        .connect(user1)
        .setWhitelist(testAddress, !initialStatus, { gasLimit: 2000000 });
      await expect(tx).to.be.revertedWith("Ownable: caller is not the owner");
    });
    describe("Account access", function () {
      let acc1: string;
      let user1Address: string;
      let user2Address: string;
      let snapshotId: any;

      this.beforeAll(async function () {
        user1Address = await user1.getAddress();
        user2Address = await user2.getAddress();
        const receipt = await (
          await factory.connect(user1)["createAccount()"]()
        ).wait();
        await guard
          .connect(user1)
          .permit(user2Address, receipt.events![1].args!.proxy, true);
        acc1 = receipt.events![1].args!.proxy;
      });

      beforeEach(async () => {
        snapshotId = await hre.ethers.provider.send("evm_snapshot", []);
      });

      afterEach(async () => {
        await hre.ethers.provider.send("evm_revert", [snapshotId]);
      });

      it("should allow proxy owner, to change proxy ownership", async function () {
        await guard.connect(user1).changeOwner(user2Address, acc1);
        expect(await guard.owners(acc1)).to.be.equal(user2Address);
      });

      it("should deny allowed proxy non-owner, to change proxy ownership", async function () {
        let tx = guard.connect(user2).changeOwner(user2Address, acc1);
        await expect(tx).to.be.revertedWith("account-guard/only-proxy-owner");
        expect(await guard.owners(acc1)).to.be.equal(user1Address);
      });

      it("should revert if permit revoked from owner by other permited account", async function () {
        let tx = guard.connect(user2).permit(user1Address, acc1, false);
        expect(tx).to.be.revertedWith("account-guard/cant-deny-owner");
        expect(await guard.owners(acc1)).to.be.equal(user1Address);
        expect(await guard.canCall(acc1, user1Address)).to.be.equal(true);
      });
    });
  });

  describe("factory", function () {
    it("Should create account", async function () {
      const tx = await factory["createAccount()"]();
      const receipt = await tx.wait();
      console.log("Gas used", receipt.cumulativeGasUsed.toNumber());
    });

    it("should be assigned to right owner", async function () {
      const receipt = await (
        await factory.connect(user1)["createAccount()"]()
      ).wait();

      let acc1Counter = 0;
      let acc2Counter = 0;
      const addr1 = await user1.getAddress();
      const addr2 = await user2.getAddress();

      receipt.events?.forEach((event) => {
        if (event.event === "AccountCreated") {
          if (event.args?.user.toLowerCase() === addr1.toLowerCase()) {
            acc1Counter++;
          }
          if (event.args?.user.toLowerCase() === addr2.toLowerCase()) {
            acc2Counter++;
          }
        }
      });
      expect(acc1Counter).to.equal(1);
      expect(acc2Counter).to.equal(0);
    });

    it("should emit AccountCreated event", async function () {
      const receipt = await (
        await factory.connect(user1)["createAccount()"]()
      ).wait();
      expect(receipt.events?.length).to.equal(2);
      expect(receipt.events![1].eventSignature).to.equal(
        "AccountCreated(address,address,uint256)"
      );
      expect(receipt.events![1].args!.user).to.equal(await user1.getAddress());
    });
  });

  describe("Account", async function () {
    it("should be able to call Dummy logic", async function () {
      const receipt = await (
        await factory.connect(user1)["createAccount()"]()
      ).wait();
      const account = await ethers.getContractAt(
        "AccountImplementation",
        receipt.events![1].args!.proxy
      );
      const data = dummy.interface.encodeFunctionData("call1");
      await account.connect(user1).execute(dummy.address, data);
    });
    it("should be able to recive Ether", async function () {
      const receipt = await (
        await factory.connect(user1)["createAccount()"]()
      ).wait();
      const account = await ethers.getContractAt(
        "AccountImplementation",
        receipt.events![1].args!.proxy
      );
      await user1.sendTransaction({
        to: account.address,
        value: ethers.utils.parseEther("1.0"),
      });
    });
    it("should be able to call Dummy logic and retrieve return data", async function () {
      const receipt = await (
        await factory.connect(user1)["createAccount()"]()
      ).wait();
      const account = await ethers.getContractAt(
        "AccountImplementation",
        receipt.events![1].args!.proxy
      );
      const data = dummy.interface.encodeFunctionData("call1");
      const staticData = await account
        .connect(user1)
        .callStatic.execute(dummy.address, data);
      await account.connect(user1).execute(dummy.address, data);
      expect(staticData).to.be.equal(
        "0x0000000000000000000000000000000000000000000000000000000000000001"
      );
    });
    it("should fail if calling not whitelisted address", async function () {
      const receipt = await (
        await factory.connect(user1)["createAccount()"]()
      ).wait();

      const account = await ethers.getContractAt(
        "AccountImplementation",
        receipt.events![1].args!.proxy
      );

      const data = dummy.interface.encodeFunctionData("call1");
      let tx = account.connect(user1).execute(guard.address, data);
      await expect(tx).to.be.revertedWith("account-guard/illegal-target");
      tx = account.connect(user1).execute(await user2.getAddress(), data);

      await expect(tx).to.be.revertedWith("account-guard/illegal-target");
    });

    it("should emit Narf event if executed", async function () {
      const validAddress = await user1.getAddress();
      const receipt0 = await (
        await factory.connect(user1)["createAccount()"]()
      ).wait();

      const account = await ethers.getContractAt(
        "AccountImplementation",
        receipt0.events![1].args!.proxy
      );

      const data = dummy.interface.encodeFunctionData("call1");
      const receipt = await (
        await account.connect(user1).execute(dummy.address, data)
      ).wait();
      const iface = new utils.Interface([
        "event Narf(address sender, address thisAddress, address self)",
      ]);
      expect(receipt.events?.length).to.equal(1);
      const details = iface.decodeEventLog(
        "Narf",
        receipt.events![0].data,
        receipt.events![0].topics
      );
      expect(details.sender).to.equal(validAddress);
      expect(details.thisAddress).to.equal(account.address);
      expect(details.self).to.equal(dummy.address);
    });

    it("should emit Narf event if called", async function () {
      await guard.setWhitelistSend(dummy.address, true);
      const receipt0 = await (
        await factory.connect(user1)["createAccount()"]()
      ).wait();

      const account = await ethers.getContractAt(
        "AccountImplementation",
        receipt0.events![1].args!.proxy
      );

      const data = dummy.interface.encodeFunctionData("call1");
      const receipt = await (
        await account.connect(user1).send(dummy.address, data)
      ).wait();
      await guard.setWhitelistSend(dummy.address, false);
      const iface = new utils.Interface([
        "event Narf(address sender, address thisAddress, address self)",
      ]);
      expect(receipt.events?.length).to.equal(1);
      const details = iface.decodeEventLog(
        "Narf",
        receipt.events![0].data,
        receipt.events![0].topics
      );
      expect(details.sender).to.equal(account.address);
      expect(details.thisAddress).to.equal(dummy.address);
      expect(details.self).to.equal(dummy.address);
    });

    it("should revert if called by not owner", async function () {
      const receipt = await (
        await factory.connect(user1)["createAccount()"]()
      ).wait();
      const validAddress = await user1.getAddress();

      const account = await ethers.getContractAt(
        "AccountImplementation",
        receipt.events![1].args!.proxy
      );

      const data = dummy.interface.encodeFunctionData("call1");
      const tx = account.connect(user2).execute(dummy.address, data);
      expect(tx).to.be.revertedWith("account-guard/not-owner");
    });
  });
});
