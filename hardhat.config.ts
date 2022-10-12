import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from 'dotenv'
dotenv.config()

const blockNumber = 15687400

const config: HardhatUserConfig = {
  solidity: "0.8.17",
  networks:{
    local: {
      url: 'http://127.0.0.1:8545',
      timeout: 100000,
    },
    
    hardhat: {
      forking: {
          url: process.env.ALCHEMY_NODE!,
          blockNumber: parseInt(blockNumber.toString()),
      },
      chainId: 2137,
      mining: {
          auto: true,
          interval: 2000,
      },
      hardfork: 'london',
      gas: 'auto',
      initialBaseFeePerGas: 1000000000,
      allowUnlimitedContractSize: false,
    },
  }
};

export default config;
