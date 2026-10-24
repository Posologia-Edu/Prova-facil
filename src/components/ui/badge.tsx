import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium leading-none transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-brand-soft text-brand-text",
        secondary: "border-transparent bg-accent-soft text-accent-ink",
        destructive: "border-transparent bg-destructive-soft text-destructive",
        outline: "border-input bg-transparent text-foreground",
        success: "border-transparent bg-success-soft text-success",
        warning: "border-transparent bg-warning-soft text-warning-ink",
        info: "border-transparent bg-info-soft text-info",
        neutral: "border-transparent bg-sunken text-muted-foreground",
        easy: "border-transparent bg-success-soft text-success",
        medium: "border-transparent bg-warning-soft text-warning-ink",
        hard: "border-transparent bg-destructive-soft text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
