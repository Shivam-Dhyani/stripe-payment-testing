import { Zap } from 'lucide-react';
import { APP_NAME } from '../../config/brand';

interface BrandMarkProps {
  size?: 'sm' | 'md' | 'lg';
  subtitle?: string;
  /** Render the wordmark in white for use on dark backgrounds (e.g. footer). */
  onDark?: boolean;
  className?: string;
}

const SIZES = {
  sm: { tile: 'w-8 h-8 rounded-lg', icon: 'w-4 h-4', word: 'text-base' },
  md: { tile: 'w-9 h-9 rounded-xl', icon: 'w-5 h-5', word: 'text-xl' },
  lg: { tile: 'w-11 h-11 rounded-2xl', icon: 'w-6 h-6', word: 'text-2xl' },
};

/**
 * The one true Zippy logo. Blinkit-style signature: a bright yellow tile with
 * a dark-ink bolt, next to the wordmark. Used on every surface (customer nav,
 * staff header, admin sidebar, footer, auth) so branding stays identical.
 */
const BrandMark = ({ size = 'md', subtitle, onDark = false, className = '' }: BrandMarkProps) => {
  const s = SIZES[size];
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className={`${s.tile} bg-accent-400 flex items-center justify-center shadow-qc-card shrink-0`}>
        <Zap className={`${s.icon} text-ink-900`} fill="currentColor" strokeWidth={0} />
      </div>
      <div className="leading-tight">
        <span className={`block ${s.word} font-extrabold tracking-tight ${onDark ? 'text-white' : 'text-ink-900'}`}>
          {APP_NAME}
        </span>
        {subtitle && (
          <span className={`block text-[11px] font-medium ${onDark ? 'text-gray-400' : 'text-gray-400'}`}>
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
};

export default BrandMark;
