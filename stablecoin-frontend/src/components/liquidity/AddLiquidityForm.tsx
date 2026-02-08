"use client";

import { useState } from "react";
import { parseEther } from "ethers";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useWalletContext } from "@/providers/WalletProvider";
import { useMarketContract } from "@/hooks/useContract";
import { useTransaction } from "@/hooks/useTransaction";
import { EXPLORER_URL } from "@/lib/network";

export function AddLiquidityForm({
  marketAddress,
  onSuccess,
}: {
  marketAddress: string;
  onSuccess: () => void;
}) {
  const { address, isCorrectChain } = useWalletContext();
  const market = useMarketContract(marketAddress);
  const tx = useTransaction();
  const [amount, setAmount] = useState("");

  const handleAdd = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    const receipt = await tx.execute(() =>
      market.addLiquidity({ value: parseEther(amount) })
    );
    if (receipt) {
      setAmount("");
      onSuccess();
    }
  };

  return (
    <Card>
      <h3 className="text-lg font-semibold text-zinc-100 mb-4">
        Add Liquidity
      </h3>
      <div className="space-y-4">
        <Input
          label="Amount"
          type="number"
          step="0.01"
          min="0"
          placeholder="100"
          suffix="C2FLR"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Button
          onClick={handleAdd}
          loading={tx.status === "pending" || tx.status === "confirming"}
          disabled={
            !address || !isCorrectChain || !amount || parseFloat(amount) <= 0
          }
          className="w-full"
        >
          {!address
            ? "Connect Wallet"
            : !isCorrectChain
            ? "Switch to Coston2"
            : "Add Liquidity"}
        </Button>

        {tx.error && <p className="text-sm text-red-400">{tx.error}</p>}
        {tx.status === "success" && tx.txHash && (
          <div className="bg-emerald-900/20 border border-emerald-800 rounded-lg p-3">
            <p className="text-sm text-emerald-400 font-medium">
              Liquidity added!
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
