import * as React from "react";
import * as ToastPrimitives from "@radix-ui/react-toast";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const ToastProvider = ToastPrimitives.Provider;

const ToastViewport = React.forwardRef<React.ElementRef<typeof ToastPrimitives.Viewport>, React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport ref={ref} className={cn("fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]", className)} {...props} />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full bg-white",
  {
    variants: {
      variant: {
        default: "border bg-white text-foreground",
        destructive: "destructive border-destructive bg-white text-destructive-foreground",
        info: "border-blue-500 bg-white text-blue-900",
        warning: "border-yellow-500 bg-white text-yellow-900",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const Toast = React.forwardRef<React.ElementRef<typeof ToastPrimitives.Root>, React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & VariantProps<typeof toastVariants>>(
  ({ className, variant, children, ...props }, ref) => {
    const isDestructive = variant === "destructive";
    const isInfo = variant === "info";
    const isWarning = variant === "warning";
    // Extract custom fields
    const title = (props as any).title;
    const description = (props as any).description;
    const rest = { ...props };
    delete (rest as any).title;
    delete (rest as any).description;
    return (
      <ToastPrimitives.Root
        ref={ref}
        className={cn(
          toastVariants({ variant }),
          isDestructive ? "border-l-4 border-red-500" : isInfo ? "border-l-4 border-blue-500" : isWarning ? "border-l-4 border-yellow-500" : "border-l-4 border-green-500",
          className
        )}
        {...rest}
      >
        <div className="flex items-center space-x-2">
          {isDestructive ? (
            <span className="text-red-500">
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11V7a1 1 0 10-2 0v2a1 1 0 002 0zm-1 4a1 1 0 100 2 1 1 0 000-2z" />
              </svg>
            </span>
          ) : isInfo ? (
            <span className="text-blue-400">
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                <path d="M18 10A8 8 0 11 2 10a8 8 0 0116 0zM9 9V7a1 1 0 112 0v2a1 1 0 01-2 0zm1 2a1 1 0 100 2 1 1 0 000-2z" />
              </svg>
            </span>
          ) : isWarning ? (
            <span className="text-yellow-400">
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8.257 3.099c.765-1.36 2.72-1.36 3.485 0l6.516 11.591c.75 1.334-.213 2.985-1.742 2.985H3.483c-1.53 0-2.492-1.651-1.742-2.985L8.257 3.1zM11 14a1 1 0 10-2 0 1 1 0 002 0zm-1-2a1 1 0 01-1-1V9a1 1 0 112 0v2a1 1 0 01-1 1z" />
              </svg>
            </span>
          ) : (
            <span className="text-green-500">
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.707a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
              </svg>
            </span>
          )}
          <div className="flex flex-col">
            <ToastTitle className={isDestructive ? "text-red-600" : isInfo ? "text-blue-400" : isWarning ? "text-yellow-500" : "text-green-700"}>
              {title || (isDestructive ? "Error" : isInfo ? "Info" : isWarning ? "Warning" : "Success")}
            </ToastTitle>
            {description && <ToastDescription className="text-white/90 dark:text-white/90">{description}</ToastDescription>}
          </div>
        </div>
        {children}
      </ToastPrimitives.Root>
    );
  }
);
Toast.displayName = ToastPrimitives.Root.displayName;

const ToastAction = React.forwardRef<React.ElementRef<typeof ToastPrimitives.Action>, React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
      className
    )}
    {...props}
  />
));
ToastAction.displayName = ToastPrimitives.Action.displayName;

const ToastClose = React.forwardRef<React.ElementRef<typeof ToastPrimitives.Close>, React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

const ToastTitle = React.forwardRef<React.ElementRef<typeof ToastPrimitives.Title>, React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title ref={ref} className={cn("text-sm font-semibold", className)} {...props} />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef<React.ElementRef<typeof ToastPrimitives.Description>, React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description ref={ref} className={cn("text-sm opacity-90", className)} {...props} />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>;

type ToastActionElement = React.ReactElement<typeof ToastAction>;

export { type ToastProps, type ToastActionElement, ToastProvider, ToastViewport, Toast, ToastTitle, ToastDescription, ToastClose, ToastAction };
