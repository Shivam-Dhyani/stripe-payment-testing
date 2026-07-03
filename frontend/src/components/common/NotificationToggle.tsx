import { Bell, BellOff, BellRing } from 'lucide-react';
import toast from 'react-hot-toast';
import { useWebPush } from '../../hooks/useWebPush';

/**
 * Enable/disable Web Push for this device. Renders nothing unless the browser
 * supports push AND the server has VAPID configured (graceful degradation).
 */
const NotificationToggle = ({ className = '' }: { className?: string }) => {
  const { supported, available, enabled, busy, permission, enable, disable } = useWebPush();

  if (!supported || !available) return null;

  if (permission === 'denied' && !enabled) {
    return (
      <div className={`inline-flex items-center gap-2 text-sm text-gray-400 ${className}`}>
        <BellOff className="w-4.5 h-4.5" /> Notifications blocked in browser settings
      </div>
    );
  }

  const onClick = async () => {
    if (enabled) {
      await disable();
      toast.success('Notifications turned off');
    } else {
      const ok = await enable();
      toast[ok ? 'success' : 'error'](ok ? 'Notifications enabled' : 'Could not enable notifications');
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`inline-flex items-center gap-2 h-11 px-5 rounded-xl font-semibold transition-colors disabled:opacity-60 ${
        enabled
          ? 'border border-gray-200 text-gray-600 hover:bg-gray-50'
          : 'bg-brand-500 text-white hover:bg-brand-600'
      } ${className}`}
    >
      {enabled ? <BellRing className="w-4.5 h-4.5" /> : <Bell className="w-4.5 h-4.5" />}
      {enabled ? 'Notifications on' : 'Enable notifications'}
    </button>
  );
};

export default NotificationToggle;
