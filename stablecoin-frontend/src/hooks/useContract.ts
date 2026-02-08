"use client";

import { useMemo } from "react";
import { Contract, JsonRpcProvider, Network } from "ethers";
import { useWalletContext } from "@/providers/WalletProvider";
import { COSTON2_RPC, COSTON2_CHAIN_ID } from "@/lib/network";
import { MarketABI, FactoryABI, FACTORY_ADDRESS } from "@/lib/contracts";

// Static network disables ENS resolution (Coston2 has no ENS)
const coston2Network = Network.from({
  name: "coston2",
  chainId: COSTON2_CHAIN_ID,
});
const readProvider = new JsonRpcProvider(COSTON2_RPC, coston2Network, {
  staticNetwork: coston2Network,
});

export function useMarketContract(address: string) {
  const { signer } = useWalletContext();

  return useMemo(() => {
    const signerOrProvider = signer || readProvider;
    return new Contract(address, MarketABI, signerOrProvider);
  }, [address, signer]);
}

export function useFactoryContract() {
  const { signer } = useWalletContext();

  return useMemo(() => {
    const signerOrProvider = signer || readProvider;
    return new Contract(FACTORY_ADDRESS, FactoryABI, signerOrProvider);
  }, [signer]);
}

export function getReadOnlyMarketContract(address: string) {
  return new Contract(address, MarketABI, readProvider);
}

export function getReadOnlyFactoryContract() {
  return new Contract(FACTORY_ADDRESS, FactoryABI, readProvider);
}
