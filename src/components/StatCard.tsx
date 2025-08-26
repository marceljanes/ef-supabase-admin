import React from 'react';

type Props = {
  icon: any;
  title: string;
  value: number | string;
  subtitle?: string;
  color?: string;
  change?: string; // e.g. "+2 this week"
  trend?: 'up' | 'down' | 'neutral';
};

export default function StatCard({ icon: Icon, title, value, subtitle, color = 'bg-zinc-800', change, trend = 'neutral' }: Props) {
  const trendColor = trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-zinc-400';
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 hover:border-zinc-600 transition-colors">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-zinc-400 mb-1">{title}</p>
          <p className="text-2xl font-semibold text-white">{value}</p>
          {change && (
            <p className={`text-xs mt-1 ${trendColor}`}>{change}</p>
          )}
          {subtitle && <p className="text-xs text-zinc-500 mt-1">{subtitle}</p>}
        </div>
        <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-700">
          <Icon className="h-5 w-5 text-zinc-300" />
        </div>
      </div>
    </div>
  );
}
