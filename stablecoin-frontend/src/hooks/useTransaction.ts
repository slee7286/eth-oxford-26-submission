"use client";

import { useState, useCallback } from "react";
import { ContractTransactionResponse, ContractTransactionReceipt } from "ethers";
import { getUserFriendlyError } from "@/lib/constants";

export type TxStatus = "idle" | "pending" | "confirming" | "success" | "error";

export function useTransaction() {
  const [status, setStatus] = useState<TxStatus>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ContractTransactionReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (
      txFn: () => Promise<ContractTransactionResponse>
    ): Promise<ContractTransactionReceipt | null> => {
      setStatus("pending");
      setError(null);
      setTxHash(null);
      setReceipt(null);

      try {
        const tx = await txFn();
        setTxHash(tx.hash);
        setStatus("confirming");

        const r = await tx.wait();
        if (r) {
          setReceipt(r);
          setStatus("success");
          return r;
        }
        setStatus("error");
        setError("Transaction failed");
        return null;
      } catch (e) {
        console.error("Transaction error:", e);
        const msg = e instanceof Error ? e.message : String(e);
        setError(getUserFriendlyError(msg));
        setStatus("error");
        return null;
      }
    },
    []
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setTxHash(null);
    setReceipt(null);
    setError(null);
  }, []);

  return { status, txHash, receipt, error, execute, reset };
}
