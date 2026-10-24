import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import type { ToastItem } from '../../types';

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 bg-white ${
              isSuccess
                ? 'border-emerald-200 text-stone-900 shadow-emerald-500/5'
                : isError
                ? 'border-rose-200 text-stone-900 shadow-rose-500/5'
                : 'border-stone-200 text-stone-900 shadow-stone-500/5'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              {isError && <AlertCircle className="w-4 h-4 text-rose-600" />}
              {!isSuccess && !isError && <Info className="w-4 h-4 text-indigo-600" />}
            </div>

            <div className="flex-1 min-w-0">
              {toast.title && (
                <div className="text-xs font-semibold text-stone-900 mb-0.5">
                  {toast.title}
                </div>
              )}
              <div className="text-xs text-stone-600 leading-relaxed break-words">
                {toast.message}
              </div>
            </div>

            <button
              onClick={() => onDismiss(toast.id)}
              className="shrink-0 text-stone-400 hover:text-stone-700 transition-colors p-0.5"
              aria-label="Close notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
