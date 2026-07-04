import { useState } from 'react';
import { Download, Share, Plus, CheckCircle2, Smartphone } from 'lucide-react';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { APP_NAME } from '../../config/brand';

/**
 * Manual "Install app" entry point for account sections (customer Profile &
 * rider portal). Shows the installed state when the app is already on the
 * device, the native prompt on Chromium, and clear guidance otherwise.
 */
const InstallAppButton = ({ className = '' }: { className?: string }) => {
  const { canInstall, installed, isIOS, promptInstall } = usePwaInstall();
  const [hint, setHint] = useState<'none' | 'ios' | 'reload'>('none');

  if (installed) {
    return (
      <div className={`inline-flex items-center gap-2 h-11 px-4 rounded-xl bg-brand-50 text-brand-700 text-sm font-semibold ${className}`}>
        <CheckCircle2 className="w-4.5 h-4.5" /> Installed on this device
      </div>
    );
  }

  const handleClick = async () => {
    if (canInstall) {
      setHint('none');
      await promptInstall();
    } else if (isIOS) {
      setHint((h) => (h === 'ios' ? 'none' : 'ios'));
    } else {
      // Not installed and no prompt available yet (common right after an
      // uninstall) — the browser re-arms the prompt on reload.
      setHint((h) => (h === 'reload' ? 'none' : 'reload'));
    }
  };

  return (
    <div className={className}>
      <button
        onClick={handleClick}
        className="inline-flex items-center gap-2 h-11 px-5 bg-brand-500 text-white rounded-xl font-semibold hover:bg-brand-600 transition-colors"
      >
        <Download className="w-4.5 h-4.5" /> Install app
      </button>

      {hint === 'ios' && (
        <div className="mt-3 rounded-2xl bg-gray-50 border border-gray-100 p-4 text-sm text-gray-700 space-y-2 max-w-sm">
          <p className="font-semibold text-gray-800 flex items-center gap-1.5">
            <Smartphone className="w-4 h-4" /> Install on iPhone / iPad
          </p>
          <p className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-white border border-gray-200"><Share className="w-3.5 h-3.5" /></span>
            Tap <span className="font-medium">Share</span>
          </p>
          <p className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-white border border-gray-200"><Plus className="w-3.5 h-3.5" /></span>
            Choose <span className="font-medium">Add to Home Screen</span>
          </p>
        </div>
      )}

      {hint === 'reload' && (
        <p className="mt-2 text-xs text-gray-500 max-w-sm">
          Almost there — please <button onClick={() => window.location.reload()} className="text-brand-600 font-semibold underline">reload the page</button> and tap
          Install again. (Make sure {APP_NAME} isn’t already installed.)
        </p>
      )}
    </div>
  );
};

export default InstallAppButton;
