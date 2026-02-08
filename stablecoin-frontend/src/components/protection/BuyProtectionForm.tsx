"use client";

import { useState, useEffect, useCallback } from "react";
import { parseEther } from "ethers";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useWalletContext } from "@/providers/WalletProvider";
import { useMarketContract } from "@/hooks/useContract";
import { useOracleQuote } from "@/hooks/useOracleQuote";
import { useTransaction } from "@/hooks/useTransaction";
import { getStablecoinFromFeedId } from "@/lib/constants";
import { formatEther, formatBps } from "@/lib/formatting";
import { EXPLORER_URL } from "@/lib/network";
import type { MarketConfig, MarketState } from "@/types/market";

export function BuyProtectionForm({
  marketAddress,
  config,
  state,
  onSuccess,
}: {
  marketAddress: string;
  config: MarketConfig;
  state: MarketState;
  onSuccess: () => void;
}) {
  const { address, isCorrectChain } = useWalletContext();
  const market = useMarketContract(marketAddress);
  const { quote, loading: quoteLoading, error: quoteError, getQuote } = useOracleQuote();
  const tx = useTransaction();

  const [notional, setNotional] = useState("");
  const [premium, setPremium] = useState<bigint | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  const stablecoin = getStablecoinFromFeedId(config.feedId);

  const fetchQuote = useCallback(async () => {
    if (!notional || parseFloat(notional) <= 0) return;
    await getQuote(
      stablecoin,
      marketAddress,
      config.barrierPpm.toString(),
      config.horizonSec.toString()
    );
  }, [notional, stablecoin, marketAddress, config.barrierPpm, config.horizonSec, getQuote]);

  // Fetch premium from contract when quote arrives
  useEffect(() => {
    if (!quote || !notional || parseFloat(notional) <= 0) {
      setPremium(null);
      return;
    }
    (async () => {
      try {
        const notionalWei = parseEther(notional);
        const p = await market.quotePremium(notionalWei, quote.pBps);
        setPremium(p);
      } catch {
        setPremium(null);
      }
    })();
  }, [quote, notional, market]);

  // Countdown timer for quote freshness
  useEffect(() => {
    if (!quote) {
      setCountdown(null);
      return;
    }
    const maxAge = Number(config.maxPriceAgeSec);
    const update = () => {
      const elapsed = Math.floor(Date.now() / 1000) - quote.issuedAt;
      const remaining = maxAge - elapsed;
      setCountdown(remaining > 0 ? remaining : 0);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [quote, config.maxPriceAgeSec]);

  // Auto-refresh when quote expires
  useEffect(() => {
    if (countdown === 0 && notional && parseFloat(notional) > 0) {
      fetchQuote();
    }
  }, [countdown, notional, fetchQuote]);

  const handleBuy = async () => {
    if (!quote || premium === null) return;

    // Refresh quote right before buying to ensure freshness
    const freshQuote = await getQuote(
      stablecoin,
      marketAddress,
      config.barrierPpm.toString(),
      config.horizonSec.toString()
    );
    if (!freshQuote) return;

    const notionalWei = parseEther(notional);
    const freshPremium = await market.quotePremium(notionalWei, freshQuote.pBps);

    const receipt = await tx.execute(() =>
      market.buyProtection(
        notionalWei,
        freshQuote.pBps,
        freshQuote.issuedAt,
        freshQuote.signature,
        { value: freshPremium }
      )
    );

    if (receipt) {
      setNotional("");
      setPremium(null);
      onSuccess();
    }
  };

  return (
    <Card>
      <h3 className="text-lg font-semibold text-zinc-100 mb-4">
        Buy Protection
      </h3>

      <div className="space-y-4">
        <Input
          label="Notional Amount"
          type="number"
          step="0.01"
          min="0"
          placeholder="10"
          suffix="C2FLR"
          value={notional}
          onChange={(e) => setNotional(e.target.value)}
        />

        <Button
          variant="secondary"
          size="sm"
          onClick={fetchQuote}
          loading={quoteLoading}
          disabled={!notional || parseFloat(notional) <= 0}
          className="w-full"
        >
          Get Quote
        </Button>

        {quoteError && <p className="text-sm text-red-400">{quoteError}</p>}

        {quote && premium !== null && (
          <div className="bg-zinc-800 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">Probability</span>
              <span className="text-zinc-100">
                {quote.pBps} bps ({(quote.probability * 100).toFixed(2)}%)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Current Price</span>
              <span className="text-zinc-100">
                ${(quote.currentPpm / 1_000_000).toFixed(4)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Distance to Barrier</span>
              <span className="text-zinc-100">
                {(quote.distance * 100).toFixed(3)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Risk Loading</span>
              <span className="text-zinc-100">
                {formatBps(state.currentLambdaBps)}
              </span>
            </div>
            <div className="border-t border-zinc-700 pt-2 flex justify-between font-medium">
              <span className="text-zinc-300">Premium</span>
              <span className="text-emerald-400">
                {formatEther(premium)} C2FLR
              </span>
            </div>
            {countdown !== null && (
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Quote expires in</span>
                <span
                  className={
                    countdown < 30 ? "text-red-400" : "text-zinc-400"
                  }
                >
                  {countdown}s
                </span>
              </div>
            )}
          </div>
        )}

        <Button
          onClick={handleBuy}
          loading={tx.status === "pending" || tx.status === "confirming"}
          disabled={
            !address ||
            !isCorrectChain ||
            !quote ||
            premium === null ||
            countdown === 0
          }
          className="w-full"
        >
          {!address
            ? "Connect Wallet"
            : !isCorrectChain
            ? "Switch to Coston2"
            : tx.status === "confirming"
            ? "Confirming..."
            : "Buy Protection"}
        </Button>

        {tx.error && <p className="text-sm text-red-400">{tx.error}</p>}
        {tx.status === "success" && tx.txHash && (
          <div className="bg-emerald-900/20 border border-emerald-800 rounded-lg p-3">
            <p className="text-sm text-emerald-400 font-medium">
              Protection purchased!
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
