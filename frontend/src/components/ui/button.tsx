import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-space-2 whitespace-nowrap rounded-sm border font-sans font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "border-lens bg-lens text-lens-on hover:brightness-110",
        secondary: "border-line-strong bg-surface-raised text-ink hover:bg-surface-sunken",
        ghost: "border-transparent bg-transparent text-ink-muted hover:bg-surface-sunken hover:text-ink",
        danger: "border-critical-ink bg-surface-raised text-critical-ink hover:bg-critical-soft",
      },
      size: {
        md: "h-control px-space-3 text-body-sm",
        sm: "h-7 px-space-2 text-label",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  icon?: React.ReactNode;
}

/** Primary (lens) at most once per view; secondary by default; ghost inside cards; danger for destructive actions. */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, icon, children, type = "button", ...props }, ref) => (
    <button ref={ref} type={type} className={cn(buttonVariants({ variant, size }), className)} {...props}>
      {icon}
      {children}
    </button>
  ),
);
Button.displayName = "Button";

export { buttonVariants };
