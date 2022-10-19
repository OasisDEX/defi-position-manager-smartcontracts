import { ethers } from "hardhat";

async function main() {
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
    implementationInstance.address,
    guardInstance.address
  );

  const receipt3 = await accountFactoryInstance.deployed();
  console.log(
    "AccountFactory gas ",
    receipt3.deployTransaction.gasLimit.toString()
  );

  const tx = await accountFactoryInstance["createAccount(uint32)"](0);
  const txReceipt = await tx.wait();
  console.log("first account ", txReceipt.gasUsed.toString());

  const tx2 = await accountFactoryInstance["createAccount(uint32)"](0);
  const txReceipt2 = await tx2.wait();
  console.log("second account ", txReceipt2.gasUsed.toString());

  const tx3 = await accountFactoryInstance
    .connect(await ethers.provider.getSigner(2))
    ["createAccount(uint32)"](1);
  const txReceipt3 = await tx3.wait();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
