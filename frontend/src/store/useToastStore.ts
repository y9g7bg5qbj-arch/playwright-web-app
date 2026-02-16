import { create } from 'zustand';

export type ToastVariant = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (opts: { message: string; variant: ToastVariant; duration?: number }) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>()((set) => ({
  toasts: [],

  addToast: ({ message, variant, duration = 4000 }) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    set((state) => ({
      toasts: [...state.toasts, { id, message, variant }],
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, duration);
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));
