import { useEffect, useMemo, useState } from "react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { ArrowRight, BriefcaseBusiness, UserRound, Zap, Shield, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import { supabase } from "@/lib/supabase";

type AccountRole = "company" | "employee";

const ACCOUNT_ROLE_KEY = "gitty.account.role";

function readStoredRole(): AccountRole | null {
  const stored = window.localStorage.getItem(ACCOUNT_ROLE_KEY);
  return stored === "company" || stored === "employee" ? stored : null;
}

function getUserRole(user: ReturnType<typeof useAuth>["user"]): AccountRole | null {
  const role = user?.user_metadata?.account_role;
  return role === "company" || role === "employee" ? role : null;
}

export default function LoginPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [needsRoleSelection, setNeedsRoleSelection] = useState(false);
  const [isResolvingHome, setIsResolvingHome] = useState(false);
  const [isSavingRole, setIsSavingRole] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);

  const knownRole = useMemo(() => getUserRole(user) ?? readStoredRole(), [user]);

  useEffect(() => {
    if (isLoading || !user) {
      setNeedsRoleSelection(false);
      setIsResolvingHome(false);
      return;
    }

    let cancelled = false;

    async function resolveHome() {
      setIsResolvingHome(true);
      setRoleError(null);

      try {
        const companyRes = await apiFetch("/api/company/me");
        if (cancelled) return;

        if (companyRes.ok) {
          navigate("/dashboard", { replace: true });
          return;
        }
      } catch {
        // Backend unreachable — fall through to role-based routing
      }

      if (cancelled) return;

      const nextRole = getUserRole(user) ?? readStoredRole();

      if (!nextRole) {
        setNeedsRoleSelection(true);
        setIsResolvingHome(false);
        return;
      }

      window.localStorage.setItem(ACCOUNT_ROLE_KEY, nextRole);
      navigate(nextRole === "company" ? "/dashboard" : "/candidate", { replace: true });
    }

    void resolveHome();
    return () => { cancelled = true; };
  }, [user, isLoading, navigate]);

  async function handleRoleSelection(role: AccountRole) {
    if (!user) return;
    setIsSavingRole(true);
    setRoleError(null);

    const { error } = await supabase.auth.updateUser({ data: { account_role: role } });

    if (error) {
      setRoleError(error.message);
      setIsSavingRole(false);
      return;
    }

    window.localStorage.setItem(ACCOUNT_ROLE_KEY, role);
    navigate(role === "company" ? "/dashboard" : "/candidate", { replace: true });
  }

  if (isLoading || isResolvingHome) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-xs uppercase tracking-[0.2em] text-white/40">
            {isResolvingHome ? "Routing you..." : "Loading"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-white">
      {/* Animated grid background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="gitty-grid-plane gitty-grid-plane-a" />
        <div className="gitty-grid-plane gitty-grid-plane-b" />
      </div>

      <div className="relative z-10 mx-auto grid min-h-screen max-w-7xl grid-cols-1 gap-10 px-6 py-8 lg:grid-cols-[1fr_480px] lg:items-center">

        {/* Left panel — value props */}
        <section className="flex flex-col justify-center pt-20 lg:pt-0">
          <div className="inline-flex w-fit items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 backdrop-blur-sm">
            <img src="/gitty.png" alt="Gitty logo" className="h-7 w-7 rounded-lg object-contain" />
            <span className="font-display text-lg tracking-[0.06em]">gitty.ai</span>
          </div>

          <p className="mt-10 text-[11px] uppercase tracking-[0.42em] text-primary/80">
            AI-Powered Hiring
          </p>
          <h1 className="mt-4 max-w-xl font-display text-5xl leading-[1.05] sm:text-6xl">
            Technical hiring,
            <br />
            <span className="text-white/55">done right.</span>
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-white/55">
            Companies create AI-scored coding assessments. Candidates complete them
            in a live sandbox. One sign-in routes everyone to the right place.
          </p>

          <div className="mt-10 grid max-w-xl gap-3 sm:grid-cols-3">
            {[
              { icon: Zap, label: "AI assessment generation" },
              { icon: BarChart3, label: "Live scoring & grading" },
              { icon: Shield, label: "Secure sandboxed sessions" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 backdrop-blur-sm"
              >
                <Icon className="h-4 w-4 text-primary" />
                <p className="mt-3 text-sm leading-5 text-white/60">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Right panel — auth card */}
        <section className="flex items-center justify-center py-10 lg:py-0">
          <div className="w-full overflow-hidden rounded-[28px] border border-white/10 bg-[#0b0b0e]/90 shadow-[0_32px_80px_rgba(0,0,0,0.5)] backdrop-blur-2xl">

            {/* Card header */}
            <div className="border-b border-white/8 px-7 py-6">
              <h2 className="font-display text-2xl text-white">
                {needsRoleSelection ? "Choose your path" : "Sign in to Gitty"}
              </h2>
              <p className="mt-1.5 text-sm text-white/45">
                {needsRoleSelection
                  ? "Tell us whether this account is for hiring or applying."
                  : "Email or Google — your workspace is waiting."}
              </p>
            </div>

            {/* Card body */}
            <div className="px-7 py-7">

              {/* Auth form — shown when not signed in */}
              {!user && (
                <div className="gitty-auth-shell">
                  <Auth
                    supabaseClient={supabase}
                    appearance={{
                      theme: ThemeSupa,
                      variables: {
                        default: {
                          colors: {
                            brand: "#ffffff",
                            brandAccent: "#d4d4d4",
                            defaultButtonBackground: "rgba(255,255,255,0.04)",
                            defaultButtonBackgroundHover: "rgba(255,255,255,0.08)",
                            defaultButtonBorder: "rgba(255,255,255,0.12)",
                            defaultButtonText: "#f4f4f5",
                            dividerBackground: "rgba(255,255,255,0.10)",
                            inputBackground: "#111115",
                            inputText: "#f4f4f5",
                            inputPlaceholder: "rgba(255,255,255,0.35)",
                            inputBorder: "rgba(255,255,255,0.09)",
                            inputBorderHover: "rgba(255,255,255,0.18)",
                            inputBorderFocus: "rgba(255,255,255,0.5)",
                            messageText: "#f4f4f5",
                            messageTextDanger: "#fca5a5",
                            anchorTextColor: "rgba(255,255,255,0.7)",
                          },
                          radii: {
                            borderRadiusButton: "14px",
                            buttonBorderRadius: "14px",
                            inputBorderRadius: "14px",
                          },
                          borderWidths: {
                            buttonBorderWidth: "1px",
                            inputBorderWidth: "1px",
                          },
                          space: {
                            inputPadding: "13px 16px",
                            buttonPadding: "13px 16px",
                          },
                          fontSizes: {
                            baseBodySize: "14px",
                            baseLabelSize: "11px",
                          },
                        },
                      },
                      className: {
                        container: "gitty-auth-container",
                        button: "gitty-auth-button",
                        input: "gitty-auth-input",
                        label: "gitty-auth-label",
                        anchor: "gitty-auth-anchor",
                        divider: "gitty-auth-divider",
                        message: "gitty-auth-message",
                      },
                    }}
                    providers={["google"]}
                    theme="dark"
                    redirectTo={window.location.origin + "/login"}
                    socialLayout="horizontal"
                    onlyThirdPartyProviders={false}
                  />
                </div>
              )}

              {/* Role selection — shown after sign-in when role is unknown */}
              {user && needsRoleSelection && (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-4">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-white/40">Signed in as</p>
                    <p className="mt-1 truncate text-sm text-white/85">{user.email}</p>
                  </div>

                  <button
                    type="button"
                    disabled={isSavingRole}
                    onClick={() => void handleRoleSelection("employee")}
                    className="group w-full cursor-pointer rounded-2xl border border-white/8 bg-white/[0.03] p-5 text-left transition-all duration-200 hover:border-white/16 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-white/[0.04]">
                          <UserRound className="h-5 w-5 text-white/70" />
                        </div>
                        <div>
                          <p className="font-display text-lg text-white">I'm a candidate</p>
                          <p className="mt-0.5 text-xs leading-5 text-white/45">
                            Take assessments and view your results
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-white/30 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-white/60" />
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={isSavingRole}
                    onClick={() => void handleRoleSelection("company")}
                    className="group w-full cursor-pointer rounded-2xl border border-primary/25 bg-primary/[0.06] p-5 text-left transition-all duration-200 hover:border-primary/40 hover:bg-primary/[0.1] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
                          <BriefcaseBusiness className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-display text-lg text-white">I'm hiring</p>
                          <p className="mt-0.5 text-xs leading-5 text-white/45">
                            Create assessments and review candidates
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-primary/40 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-primary/80" />
                    </div>
                  </button>

                  {roleError && (
                    <div className="rounded-xl border border-red-400/20 bg-red-400/8 px-4 py-3 text-sm text-red-300">
                      {roleError}
                    </div>
                  )}

                  {isSavingRole && (
                    <div className="flex items-center justify-center gap-2 py-2 text-xs text-white/40">
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border border-white/20 border-t-white/60" />
                      Setting up your account...
                    </div>
                  )}
                </div>
              )}

              {/* Routing notice — signed in with known role */}
              {user && !needsRoleSelection && knownRole && (
                <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-4">
                  <div className="h-4 w-4 animate-spin rounded-full border border-white/20 border-t-white/60 shrink-0" />
                  <p className="text-sm text-white/55">
                    Routing to{" "}
                    <span className="text-white/85">
                      {knownRole === "company" ? "company dashboard" : "your assessments"}
                    </span>
                    ...
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
