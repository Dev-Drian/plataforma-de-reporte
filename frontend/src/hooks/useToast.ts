/**
 * Hook personalizado para el sistema de toasts
 * Wrapper sobre sonner con funcionalidades adicionales
 */
import { toast as sonnerToast } from 'sonner';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface ToastOptions {
  duration?: number;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const DEFAULT_DURATION = 4000;

export const useToast = () => {
  const success = (message: string, options?: ToastOptions) => {
    return sonnerToast.success(message, {
      duration: options?.duration || DEFAULT_DURATION,
      description: options?.description,
      action: options?.action,
    });
  };

  const error = (message: string, options?: ToastOptions) => {
    return sonnerToast.error(message, {
      duration: options?.duration || DEFAULT_DURATION,
      description: options?.description,
      action: options?.action,
    });
  };

  const warning = (message: string, options?: ToastOptions) => {
    return sonnerToast.warning(message, {
      duration: options?.duration || DEFAULT_DURATION,
      description: options?.description,
      action: options?.action,
    });
  };

  const info = (message: string, options?: ToastOptions) => {
    return sonnerToast.info(message, {
      duration: options?.duration || DEFAULT_DURATION,
      description: options?.description,
      action: options?.action,
    });
  };

  const loading = (message: string) => {
    return sonnerToast.loading(message);
  };

  const promise = <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    }
  ) => {
    return sonnerToast.promise(promise, messages);
  };

  // Toast con insights automáticos
  const insight = (message: string, description?: string) => {
    return sonnerToast.success(message, {
      duration: 6000,
      description,
      icon: '💡',
    });
  };

  // Toast con alertas
  const alert = (message: string, description?: string) => {
    return sonnerToast.warning(message, {
      duration: 5000,
      description,
      icon: '⚠️',
    });
  };

  // Dismiss toast
  const dismiss = (toastId?: string | number) => {
    sonnerToast.dismiss(toastId);
  };

  return {
    success,
    error,
    warning,
    info,
    loading,
    promise,
    insight,
    alert,
    dismiss,
  };
};
