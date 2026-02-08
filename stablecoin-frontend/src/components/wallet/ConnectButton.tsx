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
    <div
      className={`flex items-center gap-2 bg-zinc-800/80 rounded-full px-1 py-1 border ${
        !isCorrectChain
          ? "border-red-500/60 animate-pulse"
          : "border-zinc-700/50"
      }`}
    >
      {!isCorrectChain && (
        <span className="text-xs text-red-400 font-medium pl-3">Wrong Network</span>
      )}
      {balance && isCorrectChain && (
        <span className="text-sm text-zinc-400 pl-3 tabular-nums">
          {parseFloat(balance).toFixed(2)} C2FLR
        </span>
      )}
      <button
        onClick={disconnect}
        className="flex items-center gap-2 bg-zinc-700/80 hover:bg-zinc-600/80 text-zinc-200 text-sm px-3 py-1.5 rounded-full transition-colors"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400" />
        {shortenAddress(address)}
      </button>
    </div>
  );
}
