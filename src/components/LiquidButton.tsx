import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface LiquidButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "outline";
  size?: "default" | "lg";
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}

const LiquidButton = ({
  children,
  onClick,
  variant = "primary",
  size = "default",
  className,
  type = "button",
  disabled = false,
}: LiquidButtonProps) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative inline-flex items-center justify-center whitespace-nowrap border border-transparent",
        "font-sans text-sm font-semibold uppercase tracking-[0.22em] leading-none",
        "liquid-transition overflow-hidden rounded-[1.15rem]",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100",
        size === "default" && "min-h-12 px-6",
        size === "lg" && "min-h-14 px-10 text-[15px]",
        variant === "primary" &&
          "bg-primary text-primary-foreground shadow-[0_16px_34px_rgba(255,103,16,0.22)] hover:glow-orange hover:scale-[1.02] active:scale-[0.98]",
        variant === "ghost" &&
          "bg-transparent text-foreground hover:bg-secondary/70",
        variant === "outline" &&
          "bg-transparent border-white/10 text-foreground hover:border-primary/70 hover:bg-white/[0.04] hover:text-primary",
        className
      )}
    >
      {children}
    </button>
  );
};

export default LiquidButton;
