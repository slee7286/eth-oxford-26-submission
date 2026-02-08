"use client";

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface MarketFiltersProps {
  filter: string;
  onFilterChange: (filter: string) => void;
}

export function MarketFilters({ filter, onFilterChange }: MarketFiltersProps) {
  return (
    <div className="flex items-center justify-between">
      <Tabs value={filter} onValueChange={onFilterChange}>
        <TabsList className="h-8 bg-white/5 p-0.5 rounded-sm">
          <TabsTrigger value="all" className="rounded-sm font-bold text-[9px] uppercase tracking-wider data-[state=active]:bg-indigo-600 data-[state=active]:text-white px-3 h-7">
            All
          </TabsTrigger>
          <TabsTrigger value="usdc" className="rounded-sm font-bold text-[9px] uppercase tracking-wider data-[state=active]:bg-indigo-600 data-[state=active]:text-white px-3 h-7">
            USDC
          </TabsTrigger>
          <TabsTrigger value="usdt" className="rounded-sm font-bold text-[9px] uppercase tracking-wider data-[state=active]:bg-indigo-600 data-[state=active]:text-white px-3 h-7">
            USDT
          </TabsTrigger>
          <TabsTrigger value="basket" className="rounded-sm font-bold text-[9px] uppercase tracking-wider data-[state=active]:bg-indigo-600 data-[state=active]:text-white px-3 h-7">
            Basket
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
