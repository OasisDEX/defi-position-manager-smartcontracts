import { Signer } from "ethers";
import { ethers } from "hardhat";

async function cancelTx(nonce: number, gasPriceInGwei: number, signer: Signer) {
  console.log(`🛰 Replacing tx with nonce ${nonce}`)
  const tx = await signer.sendTransaction({
      value: 0,
      gasPrice: gasPriceInGwei * 1000_000_000,
      to: await signer.getAddress(),
      nonce: nonce
  })
  console.log(`🛰 Tx sent ${tx.hash}`)
}


async function main() {
  const [deployer] = await ethers.getSigners();

  
  console.log("Deploying contracts with the account:", deployer.address);
  await new Promise((res,rej)=>{
    setTimeout(res, 10000);
  });
  console.log("deploying Guard")
  const Guard = await ethers.getContractFactory("AccountGuard");
  const guardInstance = await Guard.deploy();

  await guardInstance.deployed();
  console.log("whitelisting OperationRunner")
  await guardInstance.setWhitelist("0xA946f00b58a934824215C1D91346AebbD8702FD4", true);
  await guardInstance.setWhitelistSend("0xA946f00b58a934824215C1D91346AebbD8702FD4", true);
  await guardInstance.setWhitelist("0x2010D2d932b467928313F86653b28E22A9d6889b", true);
  await guardInstance.setWhitelistSend("0x2010D2d932b467928313F86653b28E22A9d6889b", true);

  console.log("deploying AccountFactory")
  const AccountFactory = await ethers.getContractFactory("AccountFactory");
  const accountFactoryInstance = await AccountFactory.deploy(
    guardInstance.address
  );
  await accountFactoryInstance.deployed();
  
  console.log("AccountFactory deployed to:", accountFactoryInstance.address);
  console.log("AccountGuard deployed to:", guardInstance.address);

}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
