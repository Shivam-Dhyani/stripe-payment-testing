import { useSyncExternalStore } from 'react';
import { subscribe, canInstall, pwaInstalled, isIOS, promptInstall } from '../utils/pwaInstall';

/** React view of the PWA install state (installable / already installed / iOS). */
export function usePwaInstall() {
  const installable = useSyncExternalStore(subscribe, canInstall, () => false);
  const installed = useSyncExternalStore(subscribe, pwaInstalled, () => false);
  return { canInstall: installable, installed, isIOS: isIOS(), promptInstall };
}
