import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import LiquidButton from "@/components/LiquidButton";

const Verify = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"form" | "verifying" | "done">("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const handleSubmit = () => {
    if (!name || !email) return;
    setStep("verifying");
  };

  useEffect(() => {
    if (step === "verifying") {
      const timer = setTimeout(() => setStep("done"), 3000);
      return () => clearTimeout(timer);
    }
    if (step === "done") {
      const timer = setTimeout(() => navigate("/assessment"), 500);
      return () => clearTimeout(timer);
    }
  }, [step, navigate]);

  if (step === "verifying" || step === "done") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
        {/* Pulsing orange circle */}
        <div className="relative">
          <div className="w-32 h-32 rounded-full bg-primary/20 animate-pulse-ring absolute -inset-4" />
          <div className="w-24 h-24 rounded-full bg-primary/30 animate-pulse-ring" style={{ animationDelay: "0.5s" }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-primary glow-orange" />
          </div>
        </div>
        <p className="absolute bottom-1/3 font-mono text-sm tracking-[0.4em] text-muted-foreground uppercase">
          {step === "verifying" ? "Verifying Identity..." : "Verified ✓"}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="glass rounded-2xl p-10 max-w-md w-full">
        <h1 className="font-mono text-2xl text-foreground mb-2">Identity Check</h1>
        <p className="text-sm text-muted-foreground mb-8 font-sans">
          Verify your identity before starting the assessment.
        </p>

        <div className="space-y-5">
          <div>
            <label className="font-mono text-xs text-muted-foreground tracking-wider uppercase block mb-2">
              Full Name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              className="bg-secondary/50 border-border focus:border-primary"
            />
          </div>
          <div>
            <label className="font-mono text-xs text-muted-foreground tracking-wider uppercase block mb-2">
              Email
            </label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@company.com"
              type="email"
              className="bg-secondary/50 border-border focus:border-primary"
            />
          </div>

          <LiquidButton
            onClick={handleSubmit}
            className="w-full mt-4"
            disabled={!name || !email}
          >
            Begin Verification
          </LiquidButton>
        </div>
      </div>
    </div>
  );
};

export default Verify;
