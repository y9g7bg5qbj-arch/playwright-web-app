import { useToastStore, type ToastVariant } from '@/store/useToastStore';
import { X, CheckCircle, XCircle, Info } from 'lucide-react';

const variantStyles: Record<ToastVariant, { bg: string; border: string; icon: typeof CheckCircle }> = {
  success: {
    bg: 'bg-[var(--bg-success)]',
    border: 'border-status-success/30',
    icon: CheckCircle,
  },
  error: {
    bg: 'bg-[var(--bg-danger)]',
    border: 'border-status-danger/30',
    icon: XCircle,
  },
  info: {
    bg: 'bg-[var(--bg-info)]',
    border: 'border-status-info/30',
    icon: Info,
  },
};

const iconColor: Record<ToastVariant, string> = {
  success: 'text-status-success',
  error: 'text-status-danger',
  info: 'text-status-info',
};

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const style = variantStyles[toast.variant];
        const Icon = style.icon;
        return (
          <div
            key={toast.id}
            style={{ animation: 'toast-slide-in 200ms ease-out' }}
            className={`pointer-events-auto flex items-center gap-2 rounded-lg border ${style.border} ${style.bg} px-4 py-3 text-sm text-text-primary shadow-lg`}
          >
            <Icon size={16} className={iconColor[toast.variant]} />
            <span className="flex-1">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-2 rounded p-0.5 text-text-muted hover:text-text-primary transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
