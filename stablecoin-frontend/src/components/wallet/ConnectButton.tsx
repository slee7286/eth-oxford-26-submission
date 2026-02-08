"use client";

import { useWalletContext } from "@/providers/WalletProvider";
import { Button } from "@/components/ui/Button";
import { shortenAddress } from "@/lib/formatting";

export function ConnectButton() {
  const { address, balance, isConnecting, isCorrectChain, connect, disconnect } =
    useWalletContext();

  if (!address) {
    return (
      <Button onClick={connect} loading={isConnecting}>
        Connect Wallet
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {!isCorrectChain && (
        <span className="text-xs text-red-400 font-medium">Wrong Network</span>
      )}
      {balance && (
        <span className="text-sm text-zinc-400">
          {parseFloat(balance).toFixed(2)} C2FLR
        </span>
      )}
      <button
        onClick={disconnect}
        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm px-3 py-1.5 rounded-lg transition-colors"
      >
        {shortenAddress(address)}
      </button>
    </div>
  );
}
