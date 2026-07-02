import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AlertTriangle, X } from 'lucide-react';

type Tone = 'danger' | 'primary';

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: Tone;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn>(async () => false);

export const useConfirm = (): ConfirmFn => useContext(ConfirmContext);

export const ConfirmProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<{ opts: ConfirmOptions; resolve: (v: boolean) => void } | null>(null);

  const confirm = useCallback<ConfirmFn>(
    (opts) => new Promise<boolean>((resolve) => setState({ opts, resolve })),
    []
  );

  const close = (value: boolean) => {
    if (state) state.resolve(value);
    setState(null);
  };

  const tone: Tone = state?.opts.tone || 'primary';
  const confirmBtn =
    tone === 'danger'
      ? 'bg-red-500 hover:bg-red-600'
      : 'bg-brand-500 hover:bg-brand-600';

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={() => close(false)}>
          <div
            className="bg-white rounded-2xl shadow-theme-lg w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${tone === 'danger' ? 'bg-red-50 text-red-500' : 'bg-brand-50 text-brand-600'}`}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h2 className="text-base font-semibold text-gray-800">{state.opts.title}</h2>
              </div>
              <button onClick={() => close(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            {state.opts.message && (
              <p className="text-sm text-gray-500 mb-5 leading-relaxed">{state.opts.message}</p>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => close(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium text-sm"
              >
                {state.opts.cancelLabel || 'Cancel'}
              </button>
              <button
                onClick={() => close(true)}
                className={`px-4 py-2 text-white rounded-lg transition font-medium text-sm ${confirmBtn}`}
              >
                {state.opts.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};
