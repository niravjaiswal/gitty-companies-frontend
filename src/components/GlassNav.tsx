import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

interface GlassNavProps {
  variant?: "landing" | "applicant" | "company";
}

const GlassNav = ({ variant = "landing" }: GlassNavProps) => {
  const location = useLocation();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="font-mono text-lg tracking-wider text-foreground hover:text-primary liquid-transition">
          TECHASSESS
        </Link>

        <div className="flex items-center gap-6">
          {variant === "landing" && (
            <>
              <Link
                to="/verify"
                className={cn(
                  "text-sm text-muted-foreground hover:text-foreground liquid-transition",
                  location.pathname === "/verify" && "text-primary"
                )}
              >
                Applicants
              </Link>
              <Link
                to="/dashboard"
                className={cn(
                  "text-sm text-muted-foreground hover:text-foreground liquid-transition",
                  location.pathname.startsWith("/dashboard") && "text-primary"
                )}
              >
                Companies
              </Link>
            </>
          )}
          {variant === "company" && (
            <>
              <Link
                to="/dashboard"
                className={cn(
                  "text-sm text-muted-foreground hover:text-foreground liquid-transition",
                  location.pathname === "/dashboard" && "text-primary"
                )}
              >
                Dashboard
              </Link>
              <Link
                to="/dashboard/create"
                className={cn(
                  "text-sm text-muted-foreground hover:text-foreground liquid-transition",
                  location.pathname === "/dashboard/create" && "text-primary"
                )}
              >
                Create
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default GlassNav;
