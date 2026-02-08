"use client";

import { Search, DollarSign, Zap, Shield } from 'lucide-react';

const STEPS = [
  { icon: Search, title: 'Choose a stablecoin', desc: 'Select USDC, USDT, or a basket to protect against depeg' },
  { icon: DollarSign, title: 'Set protection amount', desc: 'Choose how much value you want covered in C2FLR' },
  { icon: Zap, title: 'Pay premium', desc: 'Small fee (~1.6%) for protection coverage, paid in C2FLR' },
  { icon: Shield, title: 'Get paid on depeg', desc: 'If FTSO price drops below barrier for 15 min, receive full payout' },
];

export function HowItWorks() {
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-bold uppercase tracking-widest text-white">How It Works</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {STEPS.map((step, i) => (
          <div key={i} className="bg-white/[0.02] border border-white/[0.05] rounded-lg p-4 relative group hover:border-indigo-500/20 transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-[10px] font-bold text-indigo-400">
                {i + 1}
              </div>
              <step.icon className="w-4 h-4 text-indigo-400" />
            </div>
            <h3 className="text-xs font-bold text-white mb-1">{step.title}</h3>
            <p className="text-[10px] text-muted-foreground leading-relaxed">{step.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
