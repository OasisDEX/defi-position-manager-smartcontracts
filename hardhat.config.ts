import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from 'dotenv'
import { HardhatNetworkConfig } from "hardhat/types";
dotenv.config()
function createHardhatNetwork(network: string, node: string | undefined, key: string | undefined, gasPrice: number) {
  if (!node || !key) {
      return null
  }

  return [
      network,
      {
          url: node,
          accounts: [key],
          gasPrice,
      },
  ]
}

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
    ...Object.fromEntries(
      [
          createHardhatNetwork('mainnet', process.env.ALCHEMY_NODE, process.env.PRIVATE_KEY!, 20000000000),
          createHardhatNetwork(
              'goerli',
              process.env.ALCHEMY_NODE_GOERLI,
              process.env.PRIVATE_KEY!,
              50000000000,
          ),
      ].filter(Boolean) as [string, HardhatNetworkConfig][],
    ),
  },
  etherscan: {
      apiKey: process.env.ETHERSCAN_API_KEY,
  },
};


export default config;
