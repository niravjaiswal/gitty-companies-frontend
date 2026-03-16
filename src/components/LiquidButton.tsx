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
        "relative font-display text-sm tracking-wider uppercase liquid-transition rounded-lg overflow-hidden",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        size === "default" && "px-6 py-3",
        size === "lg" && "px-10 py-4 text-base",
        variant === "primary" &&
          "bg-primary text-primary-foreground hover:glow-orange hover:scale-[1.02] active:scale-[0.98]",
        variant === "ghost" &&
          "bg-transparent text-foreground hover:bg-secondary",
        variant === "outline" &&
          "bg-transparent border border-border text-foreground hover:border-primary hover:text-primary",
        className
      )}
    >
      {children}
    </button>
  );
};

export default LiquidButton;
