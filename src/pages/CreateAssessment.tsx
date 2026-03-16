import { useState } from "react";
import { useNavigate } from "react-router-dom";
import GlassCard from "@/components/GlassCard";
import GlassNav from "@/components/GlassNav";
import LiquidButton from "@/components/LiquidButton";
import LiquidBlobs from "@/components/LiquidBlobs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Github, FileText, Sparkles, ArrowLeft, ArrowRight, Check } from "lucide-react";

type Source = "github" | "prd" | "generate" | null;

const CreateAssessment = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [source, setSource] = useState<Source>(null);
  const [repoUrl, setRepoUrl] = useState("");
  const [prdContent, setPrdContent] = useState("");
  const [title, setTitle] = useState("");
  const [timeLimit, setTimeLimit] = useState("60");
  const [difficulty, setDifficulty] = useState("medium");

  const sourceOptions = [
    { id: "github" as Source, icon: Github, label: "Import GitHub Repo", desc: "Use an existing repository as the assessment base" },
    { id: "prd" as Source, icon: FileText, label: "Import PRD", desc: "Paste or upload a product requirements document" },
    { id: "generate" as Source, icon: Sparkles, label: "Generate New", desc: "AI-assisted assessment generation" },
  ];

  const canProceedStep1 = source && (
    (source === "github" && repoUrl) ||
    (source === "prd" && prdContent) ||
    source === "generate"
  );

  const canProceedStep2 = title && timeLimit;

  return (
    <div className="min-h-screen bg-background relative">
      <LiquidBlobs />
      <GlassNav variant="company" />

      <div className="relative z-10 pt-24 px-6 max-w-2xl mx-auto pb-12">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-10">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-display text-xs liquid-transition ${
                  s <= step ? "bg-primary text-primary-foreground" : "glass text-muted-foreground"
                }`}
              >
                {s < step ? <Check className="w-3 h-3" /> : s}
              </div>
              {s < 3 && <div className={`w-12 h-px ${s < step ? "bg-primary" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        {/* Step 1 — Source */}
        {step === 1 && (
          <div className="animate-fade-in">
            <h2 className="font-display text-2xl text-foreground mb-2">Choose Source</h2>
            <p className="text-sm text-muted-foreground mb-8 font-sans">How would you like to create this assessment?</p>

            <div className="grid gap-4 mb-8">
              {sourceOptions.map((opt) => (
                <GlassCard
                  key={opt.id}
                  onClick={() => setSource(opt.id)}
                  className={`flex items-center gap-4 ${source === opt.id ? "border-primary/50 bg-primary/5" : ""}`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${source === opt.id ? "bg-primary/20" : "bg-secondary"}`}>
                    <opt.icon className={`w-5 h-5 ${source === opt.id ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <p className="font-display text-sm text-foreground">{opt.label}</p>
                    <p className="text-xs text-muted-foreground font-sans">{opt.desc}</p>
                  </div>
                </GlassCard>
              ))}
            </div>

            {source === "github" && (
              <div className="animate-fade-in">
                <label className="font-display text-xs text-muted-foreground tracking-wider uppercase block mb-2">Repository URL</label>
                <Input
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/org/repo"
                  className="bg-secondary/30 border-border focus:border-primary"
                />
              </div>
            )}
            {source === "prd" && (
              <div className="animate-fade-in">
                <label className="font-display text-xs text-muted-foreground tracking-wider uppercase block mb-2">PRD Content</label>
                <Textarea
                  value={prdContent}
                  onChange={(e) => setPrdContent(e.target.value)}
                  placeholder="Paste your product requirements document here..."
                  className="bg-secondary/30 border-border focus:border-primary min-h-[200px]"
                />
              </div>
            )}
            {source === "generate" && (
              <GlassCard hover={false} className="text-center py-8 animate-fade-in">
                <Sparkles className="w-8 h-8 text-primary mx-auto mb-3" />
                <p className="font-display text-sm text-muted-foreground">AI generation will be configured in the next step</p>
              </GlassCard>
            )}
          </div>
        )}

        {/* Step 2 — Configure */}
        {step === 2 && (
          <div className="animate-fade-in space-y-6">
            <div>
              <h2 className="font-display text-2xl text-foreground mb-2">Configure</h2>
              <p className="text-sm text-muted-foreground font-sans">Set up your assessment parameters.</p>
            </div>
            <div>
              <label className="font-display text-xs text-muted-foreground tracking-wider uppercase block mb-2">Assessment Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Senior Frontend Engineer" className="bg-secondary/30 border-border focus:border-primary" />
            </div>
            <div>
              <label className="font-display text-xs text-muted-foreground tracking-wider uppercase block mb-2">Time Limit (minutes)</label>
              <Input type="number" value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)} className="bg-secondary/30 border-border focus:border-primary" />
            </div>
            <div>
              <label className="font-display text-xs text-muted-foreground tracking-wider uppercase block mb-2">Difficulty</label>
              <div className="flex gap-3">
                {["easy", "medium", "hard"].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`px-4 py-2 rounded-lg font-display text-xs uppercase tracking-wider liquid-transition ${
                      difficulty === d
                        ? "bg-primary text-primary-foreground"
                        : "glass text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3 — Review */}
        {step === 3 && (
          <div className="animate-fade-in">
            <h2 className="font-display text-2xl text-foreground mb-2">Review & Publish</h2>
            <p className="text-sm text-muted-foreground mb-8 font-sans">Confirm your assessment details.</p>

            <GlassCard hover={false} className="space-y-4">
              <div className="flex justify-between">
                <span className="text-xs font-display text-muted-foreground uppercase tracking-wider">Title</span>
                <span className="text-sm text-foreground font-sans">{title || "Untitled"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs font-display text-muted-foreground uppercase tracking-wider">Source</span>
                <span className="text-sm text-foreground font-sans capitalize">{source}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs font-display text-muted-foreground uppercase tracking-wider">Time Limit</span>
                <span className="text-sm text-foreground font-sans">{timeLimit} min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs font-display text-muted-foreground uppercase tracking-wider">Difficulty</span>
                <span className="text-sm text-foreground font-sans capitalize">{difficulty}</span>
              </div>
            </GlassCard>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-10">
          <LiquidButton
            variant="ghost"
            onClick={() => (step === 1 ? navigate("/dashboard") : setStep(step - 1))}
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </LiquidButton>
          {step < 3 ? (
            <LiquidButton
              onClick={() => setStep(step + 1)}
              disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
            >
              Next <ArrowRight className="w-4 h-4 ml-2" />
            </LiquidButton>
          ) : (
            <LiquidButton onClick={() => navigate("/dashboard")} className="glow-orange">
              Publish Assessment
            </LiquidButton>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateAssessment;
