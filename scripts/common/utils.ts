import { ContractReceipt } from "@ethersproject/contracts";
import { ethers } from "hardhat";
import { BytesLike, utils, Contract } from "ethers";
import { BigNumber } from "bignumber.js";
import {
  AutomationServiceName,
  Network,
  TriggerType,
  TriggerGroupType,
  AdapterType,
} from "./types";

export const zero = new BigNumber(0);
export const one = new BigNumber(1);

export function toRatio(units: BigNumber.Value) {
  return new BigNumber(units).shiftedBy(4).toNumber();
}

export function isLocalNetwork(network: string) {
  return [Network.HARDHAT, Network.LOCAL].includes(network as Network);
}

export function getServiceNameHash(service: AutomationServiceName) {
  return utils.keccak256(Buffer.from(service));
}

export function getAdapterNameHash(command: string) {
  return utils.keccak256(
    utils.defaultAbiCoder.encode(["string", "address"], ["Adapter", command])
  );
}

export function getEvents(
  receipt: ContractReceipt,
  eventAbi: utils.EventFragment
) {
  const iface = new utils.Interface([eventAbi]);
  const filteredEvents = receipt.logs?.filter(
    ({ topics }) => topics[0] === iface.getEventTopic(eventAbi.name)
  );
  return (
    filteredEvents?.map((x) => ({
      ...iface.parseLog(x),
      topics: x.topics,
      data: x.data,
      address: x.address,
    })) || []
  );
}

export function getCommandHash(triggerType: TriggerType) {
  return utils.keccak256(
    utils.defaultAbiCoder.encode(
      ["string", "uint256"],
      ["Command", triggerType]
    )
  );
}

export function getValidatorHash(triggerGroupType: TriggerGroupType) {
  return utils.keccak256(
    utils.defaultAbiCoder.encode(
      ["string", "uint256"],
      ["Validator", triggerGroupType]
    )
  );
}

export function generateRandomAddress() {
  return utils.hexlify(utils.randomBytes(20));
}

function getTriggerDataTypes(triggerType: TriggerType) {
  switch (triggerType) {
    case TriggerType.CLOSE_TO_COLLATERAL:
    case TriggerType.CLOSE_TO_DAI:
      return ["uint256", "uint16", "uint256"];
    case TriggerType.AUTO_TP_COLLATERAL:
    case TriggerType.AUTO_TP_DAI:
      //    uint256 cdpId, uint16 triggerType, uint256 executionPrice, uint32 maxBaseFeeInGwei;
      return ["uint256", "uint16", "uint256", "uint32"];

    case TriggerType.BASIC_BUY:
      // uint256 cdpId, uint16 triggerType, uint256 execCollRatio, uint256 targetCollRatio, uint256 maxBuyPrice, uint64 deviation, uint32 baseFee
      return [
        "uint256",
        "uint16",
        "uint256",
        "uint256",
        "uint256",
        "uint64",
        `uint32`,
      ];
    case TriggerType.BASIC_SELL:
      // uint256 cdpId, uint16 triggerType, uint256 execCollRatio, uint256 targetCollRatio, uint256 minSellPrice, uint64 deviation, uint32 baseFee
      return [
        "uint256",
        "uint16",
        "uint256",
        "uint256",
        "uint256",
        "uint64",
        `uint32`,
      ];

    default:
      throw new Error(
        `Error determining trigger data types. Unsupported trigger type: ${triggerType}`
      );
  }
}

export function encodeTriggerData(
  vaultId: number,
  triggerType: TriggerType,
  ...rest: any[]
): BytesLike {
  const args = [vaultId, triggerType, ...rest];
  const types = getTriggerDataTypes(triggerType);
  return utils.defaultAbiCoder.encode(types, args);
}

export function decodeBasicTriggerData(data: string) {
  const [vault, type] = utils.defaultAbiCoder.decode(
    ["uint256", "uint16"],
    data
  );
  return {
    vaultId: new BigNumber(vault.toString()),
    type: new BigNumber(type.toString()),
  };
}

export function decodeTriggerData(triggerType: TriggerType, data: string) {
  const types = getTriggerDataTypes(triggerType);
  const decoded = utils.defaultAbiCoder.decode(types, data);
  return decoded;
}

export function decodeStopLossData(data: string) {
  // trigger type does not matter
  const [vault, type, stopLossLevel] = decodeTriggerData(
    TriggerType.CLOSE_TO_DAI,
    data
  );
  return {
    vaultId: new BigNumber(vault.toString()),
    type: new BigNumber(type.toString()),
    stopLossLevel: new BigNumber(stopLossLevel.toString()),
  };
}

export function decodeBasicBuyData(data: string) {
  const [vault, type, exec, target, maxPrice, cont, deviation, maxBaseFee] =
    decodeTriggerData(TriggerType.BASIC_BUY, data);
  return {
    vaultId: new BigNumber(vault.toString()),
    type: new BigNumber(type.toString()),
    executionCollRatio: new BigNumber(exec.toString()),
    targetCollRatio: new BigNumber(target.toString()),
    maxBuyPrice: new BigNumber(maxPrice.toString()),
    continuous: cont,
    deviation: new BigNumber(deviation.toString()),
    maxBaseFee: new BigNumber(maxBaseFee.toString()),
  };
}

export function decodeBasicSellData(data: string) {
  const [vault, type, exec, target, minPrice, cont, deviation, maxBaseFee] =
    decodeTriggerData(TriggerType.BasicSell, data);
  return {
    vaultId: new BigNumber(vault.toString()),
    type: new BigNumber(type.toString()),
    executionCollRatio: new BigNumber(exec.toString()),
    targetCollRatio: new BigNumber(target.toString()),
    minSellPrice: new BigNumber(minPrice.toString()),
    continuous: cont,
    deviation: new BigNumber(deviation.toString()),
    maxBaseFee: new BigNumber(maxBaseFee.toString()),
  };
}

export async function getETHPrice(): Promise<BigNumber> {
  const poolAddress = "0xA478c2975Ab1Ea89e8196811F51A7B7Ade33eB11";
  const proxyAction = await ethers.getContractAt("IUniswapV2Like", poolAddress);
  const reserves = await proxyAction.getReserves();

  const price = new BigNumber(reserves.reserve0.toString()).dividedBy(
    new BigNumber(reserves.reserve1.toString())
  );

  return price;
}

export function forgeUnoswapCalldata(
  fromToken: string,
  fromAmount: string,
  toAmount: string,
  toDai = true
): string {
  const iface = new utils.Interface([
    "function unoswap(address srcToken, uint256 amount, uint256 minReturn, bytes32[] calldata pools) public payable returns(uint256 returnAmount)",
  ]);

  const pool = `0x${
    toDai ? "8" : "0"
  }0000000000000003b6d0340a478c2975ab1ea89e8196811f51a7b7ade33eb11`;

  return iface.encodeFunctionData("unoswap", [
    fromToken,
    fromAmount,
    toAmount,
    [pool],
  ]);
}

export function generateTpOrSlExecutionData(
  mpa: Contract,
  toCollateral: boolean,
  cdpData: any,
  exchangeData: any,
  serviceRegistry: any
): BytesLike {
  if (toCollateral) {
    return mpa.interface.encodeFunctionData("closeVaultExitCollateral", [
      exchangeData,
      cdpData,
      serviceRegistry,
    ]);
  }
  return mpa.interface.encodeFunctionData("closeVaultExitDai", [
    exchangeData,
    cdpData,
    serviceRegistry,
  ]);
}

export function bignumberToTopic(id: BigNumber.Value): string {
  return "0x" + new BigNumber(id).toString(16).padStart(64, "0");
}

export function ensureBigNumber(num: any) {
  return new BigNumber(num.toString());
}

export function triggerDataToInfo(triggerData: string, commandAddress: string) {
  const { vaultId, type } = decodeBasicTriggerData(triggerData);
  const triggerType = type.toNumber();
  const baseInfo = [
    `Vault ID: ${vaultId.toString()}`,
    `Trigger Type: ${triggerType}`,
    `Command Address: ${commandAddress}`,
  ];
  switch (triggerType) {
    case TriggerType.CLOSE_TO_COLLATERAL:
    case TriggerType.CLOSE_TO_DAI: {
      const { stopLossLevel } = decodeStopLossData(triggerData);
      return baseInfo.concat([`Stop Loss Level: ${stopLossLevel.toString()}`]);
    }
    case TriggerType.BASIC_BUY: {
      const {
        executionCollRatio,
        targetCollRatio,
        maxBuyPrice,
        continuous,
        deviation,
        maxBaseFee,
      } = decodeBasicBuyData(triggerData);
      return baseInfo.concat([
        `Execution Ratio: ${executionCollRatio.shiftedBy(-2).toFixed()}%`,
        `Target Ratio: ${targetCollRatio.shiftedBy(-2).toFixed()}%`,
        `Max Buy Price: ${maxBuyPrice.shiftedBy(-18).toFixed(2)}`,
        `Continuous: ${continuous}`,
        `Deviation: ${deviation.shiftedBy(-2).toFixed()}%`,
        `MaxBaseFee: ${maxBaseFee.toFixed()} GWEI`,
      ]);
    }
    case TriggerType.BasicSell: {
      const {
        executionCollRatio,
        targetCollRatio,
        minSellPrice,
        continuous,
        deviation,
        maxBaseFee,
      } = decodeBasicSellData(triggerData);
      return baseInfo.concat([
        `Execution Ratio: ${executionCollRatio.shiftedBy(-2).toFixed()}%`,
        `Target Ratio: ${targetCollRatio.shiftedBy(-2).toFixed()}%`,
        `Min Sell Price: ${minSellPrice.shiftedBy(-18).toFixed(2)}`,
        `Continuous: ${continuous}`,
        `Deviation: ${deviation.shiftedBy(-2).toFixed()}%`,
        `MaxBaseFee: ${maxBaseFee.toFixed()} GWEI`,
      ]);
    }

    default:
      throw new Error(`Trigger Type ${triggerType} is not supported.`);
  }
}
