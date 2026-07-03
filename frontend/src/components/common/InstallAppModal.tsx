import { useEffect, useRef, useState } from 'react';
import { X, Zap, Share, Plus, Download } from 'lucide-react';
import { useAppSelector } from '../../hooks/useAppSelector';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { APP_NAME, DELIVERY_PROMISE } from '../../config/brand';

const COUNT_KEY = 'zippy_install_prompt_count';
const MAX_AUTO_PROMPTS = 3;
// PWA install is offered to shoppers and riders only.
const PWA_ROLES = ['customer', 'delivery_partner'];

/**
 * Auto-shown install prompt. Appears up to 3 times for a customer/rider who
 * hasn't installed the app; after that they install manually from their
 * account section (InstallAppButton). Never shown when already installed.
 */
const InstallAppModal = () => {
  const { user } = useAppSelector((s) => s.auth);
  const { canInstall, installed, isIOS, promptInstall } = usePwaInstall();
  const [open, setOpen] = useState(false);
  const shownRef = useRef(false);

  const eligible = !!user && PWA_ROLES.includes(user.role);
  const canOffer = canInstall || isIOS; // Chromium can prompt; iOS shows manual steps

  useEffect(() => {
    if (!eligible || installed || !canOffer || shownRef.current) return;
    const count = Number(localStorage.getItem(COUNT_KEY) || '0');
    if (count >= MAX_AUTO_PROMPTS) return;

    const timer = setTimeout(() => {
      shownRef.current = true;
      localStorage.setItem(COUNT_KEY, String(count + 1));
      setOpen(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, [eligible, installed, canOffer]);

  if (!open) return null;

  const handleInstall = async () => {
    await promptInstall();
    setOpen(false);
  };

  const remaining = MAX_AUTO_PROMPTS - Number(localStorage.getItem(COUNT_KEY) || MAX_AUTO_PROMPTS);

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-md rounded-3xl bg-white shadow-qc-pop overflow-hidden">
        {/* Yellow identity header */}
        <div className="relative bg-accent-400 px-6 pt-6 pb-8">
          <button
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center text-ink-900 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-ink-900 flex items-center justify-center shadow-qc-card">
              <Zap className="w-6 h-6 text-accent-400" fill="currentColor" strokeWidth={0} />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-ink-900 leading-tight">Install {APP_NAME}</h2>
              <p className="text-xs font-medium text-ink-900/70">{DELIVERY_PROMISE} · one tap away</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          <p className="text-sm text-gray-600">
            Add {APP_NAME} to your home screen for a faster, full-screen experience — no browser bar,
            instant launch, and quicker reorders.
          </p>

          {isIOS && !canInstall ? (
            // iOS Safari can't prompt programmatically — show the manual steps.
            <div className="mt-4 rounded-2xl bg-gray-50 p-4 text-sm text-gray-700 space-y-2">
              <p className="font-semibold text-gray-800">To install on iPhone / iPad:</p>
              <p className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-white border border-gray-200"><Share className="w-3.5 h-3.5" /></span>
                Tap the <span className="font-medium">Share</span> button
              </p>
              <p className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-white border border-gray-200"><Plus className="w-3.5 h-3.5" /></span>
                Choose <span className="font-medium">Add to Home Screen</span>
              </p>
            </div>
          ) : (
            <button
              onClick={handleInstall}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 h-12 bg-brand-500 text-white rounded-xl font-semibold hover:bg-brand-600 transition-colors"
            >
              <Download className="w-4.5 h-4.5" /> Install app
            </button>
          )}

          <button
            onClick={() => setOpen(false)}
            className="mt-2 w-full h-11 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
          >
            Maybe later
          </button>

          <p className="mt-1 text-center text-[11px] text-gray-400">
            {remaining > 0
              ? `You can also install anytime from your Account.`
              : `We won't ask again — install anytime from your Account.`}
          </p>
        </div>
      </div>
    </div>
  );
};

export default InstallAppModal;
