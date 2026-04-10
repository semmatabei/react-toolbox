import { toast } from "sonner";
import type { ExternalToast } from "sonner";

export { Toaster as NotificationProvider } from "@/components/ui/sonner";

export const notification = {
  show: (message: string, options?: ExternalToast) => toast(message, options),
  success: (message: string, options?: ExternalToast) => toast.success(message, options),
  error: (message: string, options?: ExternalToast) => toast.error(message, options),
  warning: (message: string, options?: ExternalToast) => toast.warning(message, options),
  info: (message: string, options?: ExternalToast) => toast.info(message, options),
  promise: <T>(...args: Parameters<typeof toast.promise<T>>) => toast.promise(...args),
  dismiss: (id?: string | number) => toast.dismiss(id),
};
