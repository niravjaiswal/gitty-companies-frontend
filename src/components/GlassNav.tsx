import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

interface GlassNavProps {
  variant?: "landing" | "applicant" | "company";
}

const GlassNav = ({ variant = "landing" }: GlassNavProps) => {
  const location = useLocation();

  return (
    <nav
      className={cn(
        "fixed left-0 right-0 z-50",
        variant === "landing" ? "top-6 px-6" : "top-0 glass border-b border-border/50"
      )}
    >
      <div
        className={cn(
          "max-w-7xl mx-auto flex items-center justify-between",
          variant === "landing"
            ? "rounded-[20px] border border-white/10 bg-black/70 px-6 py-4 shadow-[0_30px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl"
            : "h-16"
        )}
      >
        <Link to="/" className="flex items-center gap-3 text-foreground liquid-transition hover:text-white">
          <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl">
            <img src="/gitty.png" alt="Gitty logo" className="h-full w-full object-contain" />
          </span>
          <span className={cn("font-display tracking-[0.04em]", variant === "landing" ? "text-2xl" : "text-lg")}>
            gitty
          </span>
        </Link>

        <div className="flex items-center gap-6">
          {variant === "landing" && (
            <>
              <a
                href="#workflow"
                className={cn(
                  "text-sm text-muted-foreground hover:text-foreground liquid-transition",
                  location.hash === "#workflow" && "text-primary"
                )}
              >
                How it works
              </a>
              <a
                href="#signal"
                className={cn(
                  "text-sm text-muted-foreground hover:text-foreground liquid-transition",
                  location.hash === "#signal" && "text-primary"
                )}
              >
                Signal
              </a>
              <a
                href="#trust"
                className={cn(
                  "text-sm text-muted-foreground hover:text-foreground liquid-transition",
                  location.hash === "#trust" && "text-primary"
                )}
              >
                Trust
              </a>
              <Link
                to="/login"
                className="rounded-full border border-white/20 px-4 py-2 text-sm text-white transition hover:-translate-y-0.5 hover:border-white/40"
              >
                Sign In
              </Link>
            </>
          )}
          {variant === "applicant" && (
            <>
              <Link
                to="/candidate"
                className={cn(
                  "relative text-sm liquid-transition",
                  location.pathname === "/candidate"
                    ? "text-white"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                My Assessments
                {location.pathname === "/candidate" && (
                  <span className="absolute -bottom-1 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
                )}
              </Link>
            </>
          )}
          {variant === "company" && (
            <>
              {[
                { to: "/dashboard", label: "Dashboard" },
                { to: "/dashboard/create", label: "Create" },
              ].map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    "relative text-sm liquid-transition",
                    location.pathname === to
                      ? "text-white"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {label}
                  {location.pathname === to && (
                    <span className="absolute -bottom-1 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
                  )}
                </Link>
              ))}
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default GlassNav;
