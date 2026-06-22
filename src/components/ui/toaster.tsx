"use client"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
<<<<<<< HEAD
    <ToastProvider duration={2000} swipeDirection="down">
=======
    <ToastProvider>
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
<<<<<<< HEAD
      <ToastViewport className="!top-auto !bottom-0 left-0 right-0 sm:left-auto sm:right-0" />
=======
      <ToastViewport />
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
    </ToastProvider>
  )
}