import { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmDialog({
    isOpen,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'danger',
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    const dialogRef = useRef<HTMLDivElement>(null);

    // Handle escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onCancel();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            // Focus the dialog for accessibility
            dialogRef.current?.focus();
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onCancel]);

    if (!isOpen) return null;

    const variantStyles = {
        danger: {
            icon: 'text-status-danger',
            button: 'bg-status-danger hover:bg-status-danger',
        },
        warning: {
            icon: 'text-status-warning',
            button: 'bg-status-warning hover:bg-status-warning',
        },
        info: {
            icon: 'text-status-info',
            button: 'bg-brand-primary hover:bg-brand-primary',
        },
    };

    const styles = variantStyles[variant];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onCancel}
            />

            {/* Dialog */}
            <div
                ref={dialogRef}
                tabIndex={-1}
                className="relative bg-dark-card rounded-lg shadow-xl border border-border-default w-full max-w-md mx-4 overflow-hidden"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="confirm-dialog-title"
                aria-describedby="confirm-dialog-message"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className={`w-5 h-5 ${styles.icon}`} />
                        <h3 id="confirm-dialog-title" className="font-semibold text-white">
                            {title}
                        </h3>
                    </div>
                    <button
                        onClick={onCancel}
                        className="p-1 hover:bg-dark-elevated rounded transition-colors"
                    >
                        <X className="w-4 h-4 text-text-secondary" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-4 py-4">
                    <p id="confirm-dialog-message" className="text-text-primary text-sm">
                        {message}
                    </p>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 px-4 py-3 bg-dark-card/50 border-t border-border-default">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-sm text-text-primary hover:text-white hover:bg-dark-elevated rounded transition-colors"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-4 py-2 text-sm text-white rounded transition-colors ${styles.button}`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
