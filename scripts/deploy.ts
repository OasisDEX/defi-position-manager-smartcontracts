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

  const AccountImplementation = await ethers.getContractFactory(
    "AccountImplementation"
  );
  const implementationInstance = await AccountImplementation.deploy(
    guardInstance.address
  );

  await implementationInstance.deployed();

  const AccountFactory = await ethers.getContractFactory("AccountFactory");
  const accountFactoryInstance = await AccountFactory.deploy(
    guardInstance.address
  );
  await accountFactoryInstance.deployed();
  
  await guardInstance.transferOwnership("0x060c23F67FEBb04F4b5d5c205633a04005985a94");
  console.log("AccountFactory deployed to:", accountFactoryInstance.address);
  console.log("AccountImplementation deployed to:", implementationInstance.address);
  console.log("AccountGuard deployed to:", guardInstance.address);

}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
