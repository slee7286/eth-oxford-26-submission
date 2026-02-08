"use client";

import { Activity } from 'lucide-react';
import { RECENT_ACTIVITY } from '@/lib/depeg-data';

export function RecentActivity() {
  return (
    <div className="space-y-3">
      <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
        <Activity className="w-3 h-3" /> Recent Activity
      </h3>
      <div className="space-y-1.5">
        {RECENT_ACTIVITY.map((item, i) => (
          <div key={i} className="flex items-center justify-between text-[10px] py-1.5 px-2 bg-white/[0.01] rounded-sm hover:bg-white/[0.03] transition-colors">
            <div className="flex items-center gap-2">
              <span className="text-indigo-400 font-code">{item.address}</span>
              <span className="text-muted-foreground">{item.action}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-white font-code font-bold">{item.amount}</span>
              <span className="text-muted-foreground/50">{item.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
