import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const buttonBase =
  "fe-press inline-flex items-center justify-center gap-2 rounded-full font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed select-none whitespace-nowrap";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "fe-shine relative text-white shadow-lg shadow-accent/30 " +
    "bg-[linear-gradient(110deg,var(--accent)_0%,var(--accent-3)_48%,var(--accent-2)_100%)] " +
    "bg-[length:200%_100%] [background-position:0%_0] " +
    "transition-[background-position,box-shadow,transform] duration-500 " +
    "hover:[background-position:100%_0] hover:shadow-xl hover:shadow-accent/40",
  secondary:
    "fe-shine border border-border bg-surface/60 backdrop-blur text-foreground " +
    "hover:bg-surface-2 hover:border-accent/40",
  ghost: "text-foreground/80 hover:text-foreground hover:bg-surface",
  danger: "bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-base",
  lg: "h-14 px-7 text-lg",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ className, variant = "primary", size = "md", ...props }, ref) {
    return (
      <button
        ref={ref}
        className={cn(buttonBase, buttonVariants[variant], buttonSizes[size], className)}
        {...props}
      />
    );
  },
);

export function Card({
  className,
  interactive = true,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface/70 backdrop-blur-md shadow-xl shadow-black/30",
        interactive && "fe-ring fe-lift hover:shadow-2xl hover:shadow-accent/10",
        className,
      )}
      {...props}
    />
  );
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 sm:p-6", className)} {...props} />;
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl border border-border bg-surface-2/80 px-4 text-foreground placeholder:text-muted transition",
        "focus:outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/40",
        "focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--accent)_14%,transparent)]",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn("text-sm font-medium text-foreground/80", className)} {...props} />
  );
}

type BadgeVariant = "default" | "accent" | "success" | "danger" | "muted";
const badgeVariants: Record<BadgeVariant, string> = {
  default: "bg-surface-2 text-foreground border border-border",
  accent: "bg-accent/15 text-accent border border-accent/30",
  success: "bg-success/15 text-success border border-success/30",
  danger: "bg-danger/15 text-danger border border-danger/30",
  muted: "bg-surface text-muted border border-border",
};

export function Badge({
  variant = "default",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        badgeVariants[variant],
        className,
      )}
      {...props}
    />
  );
}
