import React from 'react';
import { cn } from '../lib/utils';

export default function KpiCard({ title, value, subtitle, icon: Icon, color = 'info' }) {
  const colorStyles = {
    info: 'bg-semantic-info-bg text-semantic-info-text',
    success: 'bg-semantic-success-bg text-semantic-success-text',
    warning: 'bg-semantic-warning-bg text-semantic-warning-text',
    danger: 'bg-semantic-danger-bg text-semantic-danger-text',
    sky: 'bg-[#E0F2FE] text-[#0284C7]', // sky-100 and sky-600 to match target design
    indigo: 'bg-[#E0E7FF] text-[#4F46E5]', // indigo-100 and indigo-600
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] p-5 flex flex-col transition-all duration-300 hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.15)] hover:border-gray-300 hover:-translate-y-1 cursor-default">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{title}</h3>
        {Icon && (
          <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", colorStyles[color] || colorStyles.info)}>
            <Icon className="w-[18px] h-[18px]" />
          </div>
        )}
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-[11px] text-gray-400 font-medium mt-1">{subtitle}</div>
      </div>
    </div>
  );
}
