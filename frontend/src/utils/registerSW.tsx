import toast from 'react-hot-toast';
import { APP_NAME } from '../config/brand';

/**
 * Registers the service worker in production and surfaces a "new version
 * available" toast (instead of silently auto-reloading). In dev it unregisters
 * any stale worker and wipes caches so local iteration never serves old bundles.
 */
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  if (!import.meta.env.PROD) {
    navigator.serviceWorker.getRegistrations()
      .then((regs) => regs.forEach((r) => r.unregister()))
      .catch(() => {});
    if (typeof caches !== 'undefined') {
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {});
    }
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      // A worker is already waiting (updated in a previous tab).
      if (reg.waiting && navigator.serviceWorker.controller) {
        promptUpdate(reg.waiting);
      }
      reg.addEventListener('updatefound', () => {
        const installing = reg.installing;
        if (!installing) return;
        installing.addEventListener('statechange', () => {
          // Newly installed AND an old worker controls the page => it's an update.
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            promptUpdate(installing);
          }
        });
      });
    }).catch(() => {
      /* ignore registration errors (e.g. unsupported context) */
    });

    // When the new worker takes over, reload once to pick up fresh assets.
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });
  });
}

function promptUpdate(worker: ServiceWorker) {
  toast(
    (t) => (
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">A new version of {APP_NAME} is available.</span>
        <button
          onClick={() => {
            worker.postMessage('SKIP_WAITING');
            toast.dismiss(t.id);
          }}
          className="shrink-0 rounded-lg bg-accent-400 px-3 py-1.5 text-xs font-bold text-ink-900 hover:bg-accent-500 transition-colors"
        >
          Reload
        </button>
      </div>
    ),
    { id: 'sw-update', duration: Infinity },
  );
}
