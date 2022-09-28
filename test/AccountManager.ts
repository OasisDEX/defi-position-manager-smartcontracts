import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { AccountGuard } from "../typechain-types/contracts/AccountGuard";
import { AccountFactory } from "../typechain-types";
import { Dummy } from "../typechain-types/contracts/test";
import { Signer } from "ethers";
import { AbiCoder } from "@ethersproject/abi";

describe("Accounts Manager", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployFreshFactory() {
    const Dummy = await ethers.getContractFactory("Dummy");
    const dummy = await(await Dummy.deploy()).deployed();

    const Guard = await ethers.getContractFactory("AccountGuard");
    const guard = await(await Guard.deploy()).deployed();
    
    const Account = await ethers.getContractFactory("AccountImplementation");
    const account = await Account.deploy(guard.address);

    const AccountFactory = await ethers.getContractFactory("AccountFactory");
    const factory = await AccountFactory.deploy(account.address, guard.address);
  
    return { guard, factory, dummy };
  }

  const protocolId = 123;
  
  let guard : AccountGuard;
  let factory : AccountFactory;
  let dummy : Dummy;
  let user1 : Signer;
  let user2 : Signer;

  this.beforeAll(async function () {
    user1 = ethers.provider.getSigner(2);
    user2 = ethers.provider.getSigner(3);
    ({ guard, factory, dummy }  = await loadFixture(deployFreshFactory));
  })

  describe("factory", function () {


    it("Should create account", async function () {
      await factory.createAccount(protocolId);
    });

    it("should be assigned to right owner", async function () {
      const acountCountBefore = await factory.accountsCount(await user1.getAddress());
      const acountCountBefore2 = await factory.accountsCount(await user2.getAddress());

      const receipt = await (await factory.connect(user1).createAccount(protocolId)).wait();

      const acountCountAfter = await factory.accountsCount(await user1.getAddress());
      const acountCountAfter2 = await factory.accountsCount(await user2.getAddress());

      expect(acountCountBefore+1).to.equal(acountCountAfter);
      expect(acountCountBefore2).to.equal(acountCountAfter2);
    });

    it("should emit AccountCreated event",async function () {
      const receipt = await (await factory.connect(user1).createAccount(protocolId)).wait();
      expect(receipt.events?.length).to.equal(1);
      expect(receipt.events![0].eventSignature).to.equal('AccountCreated(address,address,uint32,uint64)');
      expect(receipt.events![0].args!.user).to.equal(await user1.getAddress())
    })

  });

  describe("Account", async function () {
    it("should be able to call Dummy logic", async function () {
      await (await factory.connect(user1).createAccount(protocolId)).wait();
      const validAddress = await user1.getAddress();
      const len = await factory.accountsCount(validAddress);
      const accountRecord = await factory.accounts(validAddress,len-1);
      const account = await ethers.getContractAt("AccountImplementation",accountRecord.proxy);
      const data = dummy.interface.encodeFunctionData("call1");
      await account.connect(user1).execute(dummy.address, data);
    })
    it("should revert if called by not owner", async function () {
      await (await factory.connect(user1).createAccount(protocolId)).wait();
      const validAddress = await user1.getAddress();
      const len = await factory.accountsCount(validAddress);
      const accountRecord = await factory.accounts(validAddress,len-1);
      const account = await ethers.getContractAt("AccountImplementation",accountRecord.proxy);
      const data = dummy.interface.encodeFunctionData("call1");
      const tx = account.connect(user2).execute(dummy.address, data);
      expect(tx).to.be.revertedWith('account-guard/not-owner');
    })
  })
});