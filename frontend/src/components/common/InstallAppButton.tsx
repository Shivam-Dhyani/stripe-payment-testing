import { useState } from 'react';
import { Download, Share, Plus, CheckCircle2, Smartphone } from 'lucide-react';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { APP_NAME } from '../../config/brand';

/**
 * Manual "Install app" entry point for account sections (customer Profile &
 * rider portal). Uses the native prompt on Chromium, shows manual steps on iOS,
 * and confirms when the app is already installed.
 */
const InstallAppButton = ({ className = '' }: { className?: string }) => {
  const { canInstall, installed, isIOS, promptInstall } = usePwaInstall();
  const [showIosSteps, setShowIosSteps] = useState(false);

  if (installed) {
    return (
      <div className={`inline-flex items-center gap-2 text-sm font-medium text-brand-600 ${className}`}>
        <CheckCircle2 className="w-4.5 h-4.5" /> {APP_NAME} is installed
      </div>
    );
  }

  const handleClick = () => {
    if (canInstall) {
      promptInstall();
    } else {
      // iOS, or a browser without the install API — show manual guidance.
      setShowIosSteps((v) => !v);
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

      {showIosSteps && (
        <div className="mt-3 rounded-2xl bg-gray-50 border border-gray-100 p-4 text-sm text-gray-700 space-y-2 max-w-sm">
          {isIOS ? (
            <>
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
            </>
          ) : (
            <p>
              Open {APP_NAME} in <span className="font-medium">Chrome</span> or <span className="font-medium">Edge</span> and
              use the browser menu → <span className="font-medium">Install app</span> to add it to your device.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default InstallAppButton;
