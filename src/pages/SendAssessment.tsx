import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import GlassCard from "@/components/GlassCard";
import GlassNav from "@/components/GlassNav";
import LiquidButton from "@/components/LiquidButton";
import LiquidBlobs from "@/components/LiquidBlobs";
import { Input } from "@/components/ui/input";
import { Copy, Check, Send, ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const mockSent = [
  { email: "alice@example.com", status: "opened" },
  { email: "bob@example.com", status: "pending" },
  { email: "carol@example.com", status: "completed" },
];

const SendAssessment = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState(false);
  const link = `https://techassess.app/take/${id}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast({ title: "Link copied!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = () => {
    if (!email) return;
    toast({ title: "Invitation sent", description: `Sent to ${email}` });
    setEmail("");
  };

  return (
    <div className="min-h-screen bg-background relative">
      <LiquidBlobs />
      <GlassNav variant="company" />

      <div className="relative z-10 pt-24 px-6 max-w-2xl mx-auto pb-12">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground liquid-transition mb-6 font-sans"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        <h1 className="font-display text-2xl text-foreground mb-2">Send Assessment</h1>
        <p className="text-sm text-muted-foreground mb-10 font-sans">
          Invite candidates to take this assessment.
        </p>

        {/* Shareable link */}
        <GlassCard hover={false} className="mb-8">
          <p className="font-display text-xs text-muted-foreground tracking-wider uppercase mb-3">Shareable Link</p>
          <div className="flex gap-2">
            <Input value={link} readOnly className="bg-secondary/30 border-border text-sm font-display" />
            <LiquidButton variant="outline" onClick={handleCopy} className="shrink-0 px-3">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </LiquidButton>
          </div>
        </GlassCard>

        {/* Email invite */}
        <GlassCard hover={false} className="mb-8">
          <p className="font-display text-xs text-muted-foreground tracking-wider uppercase mb-3">Email Invite</p>
          <div className="flex gap-2">
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="candidate@email.com"
              type="email"
              className="bg-secondary/30 border-border focus:border-primary"
            />
            <LiquidButton onClick={handleSend} disabled={!email} className="shrink-0">
              <Send className="w-4 h-4" />
            </LiquidButton>
          </div>
        </GlassCard>

        {/* Sent list */}
        <div>
          <p className="font-display text-xs text-muted-foreground tracking-wider uppercase mb-4">Sent Invitations</p>
          <div className="space-y-2">
            {mockSent.map((inv) => (
              <GlassCard key={inv.email} hover={false} className="flex items-center justify-between py-4">
                <span className="text-sm text-foreground font-sans">{inv.email}</span>
                <span
                  className={`text-xs font-display uppercase tracking-wider ${
                    inv.status === "completed"
                      ? "text-green-400"
                      : inv.status === "opened"
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  {inv.status}
                </span>
              </GlassCard>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SendAssessment;
