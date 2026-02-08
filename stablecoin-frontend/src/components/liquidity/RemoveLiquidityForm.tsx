"use client";

import { useState } from "react";
import { parseEther } from "ethers";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useWalletContext } from "@/providers/WalletProvider";
import { useMarketContract } from "@/hooks/useContract";
import { useTransaction } from "@/hooks/useTransaction";
import { useLPPosition } from "@/hooks/useLPPosition";
import { formatEther } from "@/lib/formatting";
import { EXPLORER_URL } from "@/lib/network";

export function RemoveLiquidityForm({
  marketAddress,
  onSuccess,
}: {
  marketAddress: string;
  onSuccess: () => void;
}) {
  const { address, isCorrectChain } = useWalletContext();
  const market = useMarketContract(marketAddress);
  const tx = useTransaction();
  const { lpBalance, maxWithdrawable, refetch } = useLPPosition(marketAddress);
  const [amount, setAmount] = useState("");

  const handleRemove = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    const receipt = await tx.execute(() =>
      market.removeLiquidity(parseEther(amount))
    );
    if (receipt) {
      setAmount("");
      refetch();
      onSuccess();
    }
  };

  const handleMax = () => {
    if (maxWithdrawable > 0n) {
      setAmount(formatEther(maxWithdrawable));
    }
  };

  if (!address || lpBalance === 0n) return null;

  return (
    <Card>
      <h3 className="text-lg font-semibold text-zinc-100 mb-4">
        Remove Liquidity
      </h3>
      <div className="space-y-4">
        <div className="bg-zinc-800 rounded-lg p-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-400">Your LP Balance</span>
            <span className="text-zinc-100">{formatEther(lpBalance)} C2FLR</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Max Withdrawable</span>
            <span className="text-zinc-100">
              {formatEther(maxWithdrawable)} C2FLR
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder="0"
            suffix="C2FLR"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Button variant="ghost" size="sm" onClick={handleMax}>
            Max
          </Button>
        </div>

        <Button
          variant="secondary"
          onClick={handleRemove}
          loading={tx.status === "pending" || tx.status === "confirming"}
          disabled={
            !isCorrectChain || !amount || parseFloat(amount) <= 0
          }
          className="w-full"
        >
          Remove Liquidity
        </Button>

        {tx.error && <p className="text-sm text-red-400">{tx.error}</p>}
        {tx.status === "success" && tx.txHash && (
          <div className="bg-emerald-900/20 border border-emerald-800 rounded-lg p-3">
            <p className="text-sm text-emerald-400 font-medium">
              Liquidity removed!
            </p>
            <a
              href={`${EXPLORER_URL}/tx/${tx.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-emerald-500 hover:underline"
            >
              View on Explorer
            </a>
          </div>
        )}
      </div>
    </Card>
  );
}
