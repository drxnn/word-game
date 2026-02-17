import React, { useState, useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, X } from "lucide-react";

type ErrorAlertProps = {
  message: string;
  title?: string;
  duration?: number;
  onClose?: () => void;
};

export default function ErrorAlert({
  message,
  title = "Error",
  duration = 3000,
  onClose,
}: ErrorAlertProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onClose) {
        onClose();
      }
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    if (onClose) {
      onClose();
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4 animate-in slide-in-from-top-5 duration-300">
      <Alert variant="destructive" className="shadow-lg">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle className="flex items-center justify-between">
          {title}
          <button
            onClick={handleClose}
            className="ml-auto -mr-2 -mt-2 p-2 hover:bg-red-100 rounded-full transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </Alert>
    </div>
  );
}
