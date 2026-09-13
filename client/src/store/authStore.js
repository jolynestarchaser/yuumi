import { create } from 'zustand';
import { api } from '../lib/api.js';

const tokenKey = 'desktop-session-token';
const profileKey = 'desktop-profile';

export const useAuthStore = create((set, get) => ({
  token: sessionStorage.getItem(tokenKey) || '',
  profile: sessionStorage.getItem(profileKey) || '',
  unlocked: Boolean(sessionStorage.getItem(tokenKey)),
  busy: false,
  unlock: async (pin) => {
    set({ busy: true });
    try {
      const { data } = await api.post('/auth/unlock', { pin });
      sessionStorage.setItem(tokenKey, data.data.token);
      sessionStorage.removeItem(profileKey);
      set({ token: data.data.token, profile: '', unlocked: true });
      return true;
    } catch { return false; } finally { set({ busy: false }); }
  },
  selectProfile: async (profile) => {
    set({ busy: true });
    try {
      const { data } = await api.post('/auth/profile', { profile });
      sessionStorage.setItem(tokenKey, data.data.token);
      sessionStorage.setItem(profileKey, data.data.profile);
      set({ token: data.data.token, profile: data.data.profile, unlocked: true });
      return true;
    } catch { return false; } finally { set({ busy: false }); }
  },
  restoreSession: async () => {
    if (!get().token) return false;
    try { const { data } = await api.get('/auth/session'); set({ profile: data.data.profile || '' }); return true; } catch { get().logout(); return false; }
  },
  logout: async () => {
    try { if (get().token) await api.post('/auth/logout'); } catch { /* expired sessions are already logged out */ }
    sessionStorage.removeItem(tokenKey); sessionStorage.removeItem(profileKey);
    set({ token: '', profile: '', unlocked: false });
  }
}));
