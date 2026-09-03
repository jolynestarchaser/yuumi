import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  unlocked: sessionStorage.getItem('desktop-pin-unlocked') === 'true',
  unlock: (pin) => {
    const expectedPin = import.meta.env.VITE_DESKTOP_PIN || '3112';
    if (pin !== expectedPin) return false;
    sessionStorage.setItem('desktop-pin-unlocked', 'true');
    set({ unlocked: true });
    return true;
  },
  logout: () => { sessionStorage.removeItem('desktop-pin-unlocked'); set({ unlocked: false }); }
}));
