"use client";

import { useEffect, useState } from 'react';
import { Header } from '@/components/Terminal/Header';
import { TradingChart } from '@/components/Terminal/TradingChart';
import { TradePanel } from '@/components/Terminal/TradePanel';
import { ActivityPanel } from '@/components/Terminal/ActivityPanel';
import { MarketData } from '@/components/Terminal/MarketData';
import { useWallet, useContractData, useFactoryData } from '@/lib/blockchain';
import { saveTick, seedIfNeeded } from '@/lib/store';
import { CONFIG } from '@/lib/config';

export default function TerminalPage() {
  const { address, provider, connect } = useWallet();
  const [selectedMarket, setSelectedMarket] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('gascap_selected_market') || CONFIG.CONTRACT_ADDRESS;
    }
    return CONFIG.CONTRACT_ADDRESS;
  });
  const { markets, loading: marketsLoading, refresh: refreshMarkets } = useFactoryData();

  // Persist selected market for /liquidity and /settle pages
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('gascap_selected_market', selectedMarket);
    }
  }, [selectedMarket]);
  const { contractState, currentGasPrice, userPosition, recentTrades, connectionError, refresh } = useContractData(address, selectedMarket);
  const [timeframe, setTimeframe] = useState(1);

  // Bridge live FTSO data from contract to chart history
  useEffect(() => {
    if (currentGasPrice && currentGasPrice.price > 0n) {
      const price = Number(currentGasPrice.price);
      const time = Number(currentGasPrice.timestamp);
      seedIfNeeded(price, time);
      saveTick({ price, time });
    }
  }, [currentGasPrice]);

  const handleMarketCreated = (newAddress: string) => {
    setSelectedMarket(newAddress);
    refreshMarkets();
  };

  return (
    <div className="flex flex-col h-screen bg-[#050505] text-foreground font-body overflow-hidden">
      <Header
        address={address}
        gasPrice={currentGasPrice}
        state={contractState}
        onConnect={connect}
        connectionError={connectionError}
        markets={markets}
        selectedMarket={selectedMarket}
        onSelectMarket={setSelectedMarket}
        marketsLoading={marketsLoading}
      />

      <main className="flex-1 flex min-h-0 overflow-hidden border-t border-white/5">
        {/* Left: Chart + Positions */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-white/5">
          <div className="flex-[3] flex flex-col min-h-0 bg-black/20">
            <div className="flex-1 relative">
              <TradingChart
                strikePrice={contractState ? Number(contractState.strikePriceGwei) : undefined}
                settlementPrice={contractState ? Number(contractState.settlementPriceGwei) : undefined}
                isSettled={contractState?.isSettled}
                timeframe={timeframe}
                onTimeframeChange={setTimeframe}
              />
            </div>
          </div>

          <div className="flex-[2] border-t border-white/5 min-h-0">
            <ActivityPanel
              position={userPosition}
              address={address}
              contractState={contractState}
              provider={provider}
              refresh={refresh}
              currentPrice={currentGasPrice?.price}
              contractAddress={selectedMarket}
              recentTrades={recentTrades}
            />
          </div>
        </div>

        {/* Right: Market Data + Trade Panel */}
        <div className="w-[320px] flex flex-col shrink-0">
          <div className="flex-1 border-b border-white/5 overflow-hidden">
            <MarketData
              currentPrice={currentGasPrice?.price}
              contractState={contractState}
              contractAddress={selectedMarket}
              recentTrades={recentTrades}
              provider={provider}
              onMarketCreated={handleMarketCreated}
            />
          </div>

          <div className="flex-1 overflow-y-auto bg-black/40">
            <TradePanel
              address={address}
              provider={provider}
              refresh={refresh}
              disabled={contractState?.isSettled || !address}
              currentPrice={currentGasPrice?.price}
              contractAddress={selectedMarket}
              poolLiquidity={contractState?.totalLiquidityWei}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
