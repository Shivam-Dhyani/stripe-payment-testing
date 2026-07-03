import { useCallback, useEffect, useState } from 'react';
import { pushService } from '../services/pushService';
import { pushSupported, getExistingSubscription, enablePush, disablePush } from '../utils/push';

/**
 * Web Push state for the current device. `available` is only true when the
 * browser supports push AND the server has VAPID configured, so the UI hides
 * itself entirely until push is set up.
 */
export function useWebPush() {
  const supported = pushSupported();
  const [available, setAvailable] = useState(false);
  const [vapidKey, setVapidKey] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>(
    supported ? Notification.permission : 'denied',
  );

  useEffect(() => {
    if (!supported) return;
    let active = true;
    pushService.getVapidKey()
      .then((info) => {
        if (!active) return;
        setAvailable(info.enabled && !!info.public_key);
        setVapidKey(info.public_key);
      })
      .catch(() => {});
    getExistingSubscription().then((s) => active && setEnabled(!!s));
    return () => { active = false; };
  }, [supported]);

  const enable = useCallback(async () => {
    if (!vapidKey) return false;
    setBusy(true);
    try {
      const ok = await enablePush(vapidKey);
      setEnabled(ok);
      setPermission(supported ? Notification.permission : 'denied');
      return ok;
    } finally {
      setBusy(false);
    }
  }, [vapidKey, supported]);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      await disablePush();
      setEnabled(false);
    } finally {
      setBusy(false);
    }
  }, []);

  return { supported, available, enabled, busy, permission, enable, disable };
}
