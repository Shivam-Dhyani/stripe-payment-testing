import api from './api';

export interface VapidInfo {
  enabled: boolean;
  public_key: string | null;
}

export const pushService = {
  getVapidKey: async (): Promise<VapidInfo> => {
    const res = await api.get('/push/vapid-public-key');
    return res.data;
  },

  subscribe: async (sub: PushSubscriptionJSON): Promise<void> => {
    await api.post('/push/subscribe', {
      endpoint: sub.endpoint,
      keys: sub.keys,
    });
  },

  unsubscribe: async (endpoint: string): Promise<void> => {
    await api.post('/push/unsubscribe', { endpoint });
  },
};
