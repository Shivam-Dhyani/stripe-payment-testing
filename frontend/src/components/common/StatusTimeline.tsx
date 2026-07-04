import type { ComponentType } from 'react';
import { Check, X } from 'lucide-react';
import { formatShortDateTime } from '../../utils/date';

export type TimelineState = 'done' | 'current' | 'todo' | 'rejected';

export interface TimelineStep {
  key: string;
  label: string;
  sub?: string;
  date?: string | null;
  state: TimelineState;
  icon?: ComponentType<{ className?: string }>;
}

/**
 * The one timeline design used across the app (customer tracking & orders,
 * admin orders & returns): a vertical rail with per-step icons, a coloured
 * connector, labels and timestamps. Keep every timeline on this component so
 * the design language stays identical everywhere.
 */
const StatusTimeline = ({ steps, className = '' }: { steps: TimelineStep[]; className?: string }) => (
  <ol className={`relative ${className}`}>
    {steps.map((step, i) => {
      const last = i === steps.length - 1;
      const done = step.state === 'done';
      const current = step.state === 'current';
      const rejected = step.state === 'rejected';
      const Icon = step.icon;

      const circle = rejected
        ? 'bg-error-500 text-white'
        : done || current
          ? 'bg-brand-500 text-white'
          : 'bg-gray-100 text-gray-400';

      return (
        <li key={step.key} className="flex gap-4 pb-6 last:pb-0">
          <div className="flex flex-col items-center">
            <div className={`flex items-center justify-center w-9 h-9 rounded-full shrink-0 transition-colors ${circle} ${current ? 'ring-4 ring-brand-500/20' : ''}`}>
              {rejected ? (
                <X className="w-4.5 h-4.5" />
              ) : Icon ? (
                <Icon className="w-4.5 h-4.5" />
              ) : done ? (
                <Check className="w-4.5 h-4.5" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-current" />
              )}
            </div>
            {!last && <div className={`w-0.5 flex-1 mt-1 ${done ? 'bg-brand-500' : 'bg-gray-200'}`} />}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className={`text-sm font-semibold ${done || current || rejected ? 'text-gray-900' : 'text-gray-400'}`}>
                {step.label}
              </p>
              {step.date && <span className="text-[11px] text-gray-400 shrink-0">{formatShortDateTime(step.date)}</span>}
            </div>
            {step.sub && (
              <p className={`text-xs mt-0.5 ${current ? 'text-brand-600 font-medium' : 'text-gray-400'}`}>{step.sub}</p>
            )}
          </div>
        </li>
      );
    })}
  </ol>
);

export default StatusTimeline;
