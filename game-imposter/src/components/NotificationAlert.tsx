import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type AlertData = {
  type: "error" | "success" | "info";
  message: string;
  title?: string;
};

interface NotificationAlertProps {
  alert: AlertData | null;
  onClose?: () => void;
}

export default function NotificationAlert({
  alert,
  onClose,
}: NotificationAlertProps) {
  if (!alert) return null;

  const config = {
    error: {
      variant: "destructive" as const,
      icon: <AlertCircle className="h-4 w-4" />,
      defaultTitle: "Error",
      styles: "border-destructive/50 text-destructive bg-destructive/5",
    },
    success: {
      variant: "default" as const,
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
      defaultTitle: "Success",
      styles: "border-emerald-500/50 text-emerald-700 bg-emerald-50",
    },
    info: {
      variant: "default" as const,
      icon: <Info className="h-4 w-4 text-blue-600" />,
      defaultTitle: "Note",
      styles: "border-blue-500/50 text-blue-700 bg-blue-50",
    },
  };

  const { type, message, title } = alert;
  const currentConfig = config[type];

  return (
    <div className="fixed bottom-4 right-4 z-50 w-full max-w-sm animate-in fade-in slide-in-from-bottom-2">
      <Alert
        variant={currentConfig.variant}
        className={cn("relative pr-10 shadow-lg", currentConfig.styles)}
      >
        {currentConfig.icon}
        <AlertTitle className="font-semibold">
          {title || currentConfig.defaultTitle}
        </AlertTitle>
        <AlertDescription>{message}</AlertDescription>

        {onClose && (
          <button
            onClick={onClose}
            className="absolute right-2 top-2 p-1 rounded-md opacity-70 hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </Alert>
    </div>
  );
}
