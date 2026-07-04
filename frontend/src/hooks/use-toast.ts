import { toast as sonnerToast } from 'sonner';

export const useToast = () => {
  const toast = (options: { title: string; variant?: "default" | "destructive" }) => {
    if (options.variant === "destructive") {
      sonnerToast.error(options.title);
    } else {
      sonnerToast(options.title);
    }
  };
  return { toast };
};
