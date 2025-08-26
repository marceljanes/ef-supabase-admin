import React from 'react';

type Props = {
  icon: any;
  title: string;
  description: string;
  onClick: () => void;
  color: string;
};

export default function QuickActionCard({ icon: Icon, title, description, onClick, color }: Props) {
  return (
    <div 
      onClick={onClick}
      className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 hover:border-zinc-600 transition-colors cursor-pointer"
    >
      <div className="flex items-start space-x-3">
        <div className="p-2 rounded-md bg-zinc-800 border border-zinc-700">{/* neutral icon bg */}
          <Icon className="h-4 w-4 text-zinc-200" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-white">{title}</h3>
          <p className="text-xs text-zinc-400 mt-1">{description}</p>
        </div>
      </div>
    </div>
  );
}
