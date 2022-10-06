import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { AccountGuard } from "../typechain-types/contracts/AccountGuard";
import { AccountFactory, AccountImplementation, IDssProxyActions } from "../typechain-types";
import { Dummy } from "../typechain-types/contracts/test";
import { Signer } from "ethers";


const CDP_MANAGER= '0x5ef30b9986345249bc32d8928B7ee64DE9435E39';
const AUTOMATION_SERVICE_REGISTRY= '0x9b4Ae7b164d195df9C4Da5d08Be88b2848b2EaDA';
const PROXY_ACTIONS_ADDRESS= '0x82ecD135Dce65Fbc6DbdD0e4237E0AF93FFD5038';


describe("Borrow - new Proxy", function () {
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
    const factory = await AccountFactory.deploy(account.address, guard.address, AUTOMATION_SERVICE_REGISTRY);

    const ProxyActionFactory = await ethers.getContractFactory("IDssProxyActions");
    
    const proxyAction = await ProxyActionFactory.attach(PROXY_ACTIONS_ADDRESS);
  
    return { guard, factory, dummy, proxyAction };
  }

  
  let guard : AccountGuard;
  let factory : AccountFactory;
  let dummy : Dummy;
  let proxyAction : IDssProxyActions;
  let user1 : Signer;
  let user2 : Signer;
  let user1Proxy : AccountImplementation;
  let user2Proxy : AccountImplementation;

  async function executeProxy(proxy : AccountImplementation, methodName : any, args:any){
    const data = proxyAction.interface.encodeFunctionData(methodName,args);
    console.log("Data ", data);
    await proxy.execute(PROXY_ACTIONS_ADDRESS, data );
  }

  this.beforeAll(async function () {
    user1 = ethers.provider.getSigner(2);
    user2 = ethers.provider.getSigner(3);
    ({ guard, factory, dummy, proxyAction }  = await loadFixture(deployFreshFactory));
    await factory.connect(user1)['createAccount()']();
    await factory.connect(user2)['createAccount()']();
    const Account = await ethers.getContractFactory("AccountImplementation");
    user1Proxy = Account.attach(await factory.accounts(await user1.getAddress(),0));
    user2Proxy = Account.attach(await factory.accounts(await user2.getAddress(),0));

  })

  describe("create New vault", function () {

    it("Open of empty vault should not fail", async function () {
      await executeProxy(user1Proxy, "open",["CDP_MANAGER","0x4554482D41000000000000000000000000000000000000000000000000000000",await user1.getAddress()]);
      
    });


  });

  describe("deposit to vault", async function () {
    
  })

  describe("withdraw from vault", async function () {
    
  })
});
