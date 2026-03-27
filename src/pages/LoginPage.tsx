import { useEffect, useMemo, useState } from "react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { ArrowRight, BriefcaseBusiness, CheckCircle2, Sparkles, UserRound } from "lucide-react";
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
        // Fall through to explicit role handling.
      }

      const nextRole = getUserRole(user) ?? readStoredRole();

      if (!nextRole) {
        if (!cancelled) {
          setNeedsRoleSelection(true);
          setIsResolvingHome(false);
        }
        return;
      }

      window.localStorage.setItem(ACCOUNT_ROLE_KEY, nextRole);

      if (!cancelled) {
        navigate(nextRole === "company" ? "/dashboard" : "/candidate", { replace: true });
      }
    }

    void resolveHome();

    return () => {
      cancelled = true;
    };
  }, [user, isLoading, navigate]);

  async function handleRoleSelection(role: AccountRole) {
    if (!user) return;

    setIsSavingRole(true);
    setRoleError(null);

    const { error } = await supabase.auth.updateUser({
      data: {
        account_role: role,
      },
    });

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
      <div className="flex min-h-screen items-center justify-center bg-[#050505]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="gitty-grid-plane gitty-grid-plane-a" />
        <div className="gitty-grid-plane gitty-grid-plane-b" />
      </div>

      <div className="relative z-10 mx-auto grid min-h-screen max-w-7xl grid-cols-1 gap-10 px-6 py-8 lg:grid-cols-[1fr_520px] lg:items-center">
        <section className="flex flex-col justify-center pt-24 lg:pt-12">
          <div className="inline-flex w-fit items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/68 backdrop-blur-sm">
            <img src="/gitty.png" alt="Gitty logo" className="h-8 w-8 rounded-lg object-contain" />
            <span className="font-display text-xl tracking-[0.04em]">gitty</span>
          </div>

          <p className="mt-10 text-xs uppercase tracking-[0.32em] text-white/45">Single sign-in. Clear routing.</p>
          <h1 className="mt-5 max-w-2xl font-display text-5xl leading-[1] text-white sm:text-6xl lg:text-7xl">
            One auth page.
            <br />
            <span className="italic text-white/92">Two paths after login.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-white/60">
            Sign in once with email or Google. If we already know your workspace, we route you there.
            If not, you choose whether you are hiring or applying and Gitty remembers it.
          </p>

          <div className="mt-10 grid max-w-2xl gap-4 sm:grid-cols-3">
            {[
              "Google and email sign-in",
              "Company vs employee choice after auth",
              "Existing workspaces route automatically",
            ].map((item) => (
              <div key={item} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
                <CheckCircle2 className="h-5 w-5 text-white/80" />
                <p className="mt-4 text-sm leading-6 text-white/62">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-center py-8">
          <div className="w-full overflow-hidden rounded-[32px] border border-white/10 bg-[#0b0b0d]/88 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            <div className="border-b border-white/10 px-7 py-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/6">
                  <Sparkles className="h-6 w-6 text-white/85" />
                </div>
                <div>
                  <h2 className="font-display text-3xl text-white">
                    {needsRoleSelection ? "Choose your path" : "Sign in to Gitty"}
                  </h2>
                  <p className="mt-1 text-sm text-white/50">
                    {needsRoleSelection
                      ? "Tell us whether this account is for hiring or applying."
                      : "Use email or Google. New accounts can choose a role after sign-in."}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-7 py-7">
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
                            brandAccent: "#d7d7d7",
                            defaultButtonBackground: "rgba(255, 255, 255, 0.04)",
                            defaultButtonBackgroundHover: "rgba(255, 255, 255, 0.08)",
                            defaultButtonBorder: "rgba(255, 255, 255, 0.12)",
                            defaultButtonText: "#f4f4f5",
                            dividerBackground: "rgba(255, 255, 255, 0.12)",
                            inputBackground: "#121216",
                            inputText: "#f4f4f5",
                            inputPlaceholder: "rgba(255, 255, 255, 0.38)",
                            inputBorder: "rgba(255, 255, 255, 0.1)",
                            inputBorderHover: "rgba(255, 255, 255, 0.18)",
                            inputBorderFocus: "#ffffff",
                            messageText: "#f4f4f5",
                            messageTextDanger: "#ffb4b4",
                            anchorTextColor: "#f4f4f5",
                          },
                          radii: {
                            borderRadiusButton: "18px",
                            buttonBorderRadius: "18px",
                            inputBorderRadius: "16px",
                          },
                          borderWidths: {
                            buttonBorderWidth: "1px",
                            inputBorderWidth: "1px",
                          },
                          space: {
                            inputPadding: "14px",
                            buttonPadding: "14px",
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

              {user && needsRoleSelection && (
                <div className="space-y-4">
                  <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-5">
                    <p className="text-sm text-white/56">
                      Signed in as <span className="text-white">{user.email}</span>
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white/52">
                      Choose the default experience for this account. Existing company accounts will still
                      route straight into the dashboard.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isSavingRole}
                    onClick={() => void handleRoleSelection("employee")}
                    className="group w-full rounded-[24px] border border-white/10 bg-white/[0.03] p-5 text-left transition hover:border-white/20 hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/6">
                          <UserRound className="h-6 w-6 text-white/85" />
                        </div>
                        <div>
                          <div className="font-display text-2xl text-white">I’m an employee</div>
                          <p className="mt-2 text-sm leading-6 text-white/56">
                            Review assigned assessments, complete sessions, and see your candidate workspace.
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="mt-1 h-5 w-5 text-white/55 transition group-hover:translate-x-0.5 group-hover:text-white" />
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={isSavingRole}
                    onClick={() => void handleRoleSelection("company")}
                    className="group w-full rounded-[24px] border border-white/10 bg-white/[0.03] p-5 text-left transition hover:border-white/20 hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/6">
                          <BriefcaseBusiness className="h-6 w-6 text-white/85" />
                        </div>
                        <div>
                          <div className="font-display text-2xl text-white">I’m a company</div>
                          <p className="mt-2 text-sm leading-6 text-white/56">
                            Create a workspace, publish assessments, assign candidates, and review results.
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="mt-1 h-5 w-5 text-white/55 transition group-hover:translate-x-0.5 group-hover:text-white" />
                    </div>
                  </button>

                  {roleError && (
                    <div className="rounded-[18px] border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-100">
                      {roleError}
                    </div>
                  )}
                </div>
              )}

              {user && !needsRoleSelection && knownRole && (
                <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-5 text-sm text-white/58">
                  Signed in as <span className="text-white">{user.email}</span>. Routing you to the{" "}
                  <span className="text-white">{knownRole === "company" ? "company dashboard" : "employee workspace"}</span>.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
