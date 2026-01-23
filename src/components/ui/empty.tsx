import * as React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/components/ui/button";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: "default" | "muted" | "warning";
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, icon: Icon, title, description, action, variant = "default", ...props }, ref) => {
    const variantStyles = {
      default: "text-foreground",
      muted: "text-muted-foreground",
      warning: "text-warning",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col items-center justify-center p-8 text-center rounded-xl border border-border bg-card/50",
          className
        )}
        role="status"
        aria-live="polite"
        {...props}
      >
        {Icon && (
          <div className={cn("mb-4 p-3 rounded-full bg-muted", variant === "warning" && "bg-warning/10")}>
            <Icon className={cn("w-6 h-6", variantStyles[variant])} aria-hidden="true" />
          </div>
        )}
        <h3 className={cn("text-lg font-semibold mb-2", variantStyles[variant])}>{title}</h3>
        {description && (
          <p className={cn("text-sm max-w-md mb-4", variant === "muted" ? "text-muted-foreground" : "text-foreground/70")}>
            {description}
          </p>
        )}
        {action && (
          <Button onClick={action.onClick} variant={variant === "warning" ? "outline" : "default"}>
            {action.label}
          </Button>
        )}
      </div>
    );
  }
);
EmptyState.displayName = "EmptyState";

export { EmptyState };
