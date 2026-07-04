// Tiny store around the browser's PWA install capability.
// `beforeinstallprompt` can fire before React mounts, so we capture it at the
// module level (imported early from main.tsx) and let the UI subscribe.

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
let installedFlag = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) &&
    !(window as unknown as { MSStream?: unknown }).MSStream;
}

/** Best-effort installed check: standalone display, or the OS reporting the PWA. */
async function detectInstalled(): Promise<boolean> {
  if (isStandalone()) return true;
  const nav = navigator as unknown as { getInstalledRelatedApps?: () => Promise<unknown[]> };
  if (typeof nav.getInstalledRelatedApps === 'function') {
    try {
      const apps = await nav.getInstalledRelatedApps();
      if (Array.isArray(apps) && apps.length > 0) return true;
    } catch {
      /* not supported / not allowed */
    }
  }
  return false;
}

async function refreshInstalled(): Promise<void> {
  const was = installedFlag;
  const now = await detectInstalled();
  if (now !== was) {
    installedFlag = now;
    emit();
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // stop Chrome's mini-infobar; we drive the prompt ourselves
    deferred = e as BeforeInstallPromptEvent;
    installedFlag = false; // the browser only offers install when NOT installed
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    installedFlag = true;
    emit();
  });
  // Re-evaluate when the user comes back to the tab (e.g. after installing or
  // uninstalling from the browser UI) so the button flips correctly.
  window.addEventListener('focus', () => { void refreshInstalled(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void refreshInstalled();
  });
  void refreshInstalled();
}

export function canInstall(): boolean {
  return deferred !== null;
}

export function pwaInstalled(): boolean {
  return installedFlag || isStandalone();
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferred) return 'unavailable';
  await deferred.prompt();
  const { outcome } = await deferred.userChoice;
  if (outcome === 'accepted') {
    deferred = null;
    installedFlag = true;
    emit();
  }
  return outcome;
}
