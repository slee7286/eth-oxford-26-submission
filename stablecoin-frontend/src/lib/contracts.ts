import MarketABI from "./abis/DepegProtectionMarket.json";
import FactoryABI from "./abis/DepegProtectionFactory.json";

export { MarketABI, FactoryABI };

export const FACTORY_ADDRESS =
  process.env.NEXT_PUBLIC_FACTORY_ADDRESS || "0x";
