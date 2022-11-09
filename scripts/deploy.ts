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
  const Guard = await ethers.getContractFactory("AccountGuard");
  const guardInstance = await Guard.deploy();

  const receipt = await guardInstance.deployed();
  console.log("Guard gas ", receipt.deployTransaction.gasLimit.toString());

  const AccountImplementation = await ethers.getContractFactory(
    "AccountImplementation"
  );
  const implementationInstance = await AccountImplementation.deploy(
    guardInstance.address
  );

  const receipt2 = await implementationInstance.deployed();
  console.log(
    "AccountImplementation gas ",
    receipt2.deployTransaction.gasLimit.toString()
  );

  const AccountFactory = await ethers.getContractFactory("AccountFactory");
  const accountFactoryInstance = await AccountFactory.deploy(
    guardInstance.address
  );

  const receipt3 = await accountFactoryInstance.deployed();
  
  console.log(
    "AccountFactory gas ",
    receipt3.deployTransaction.gasLimit.toString()
  );

}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
