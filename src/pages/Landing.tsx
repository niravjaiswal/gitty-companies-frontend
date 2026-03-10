import { useNavigate } from "react-router-dom";
import GlassCard from "@/components/GlassCard";
import GlassNav from "@/components/GlassNav";
import LiquidButton from "@/components/LiquidButton";
import LiquidBlobs from "@/components/LiquidBlobs";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <LiquidBlobs />
      <GlassNav variant="landing" />

      {/* Hero */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6">
        <div className="text-center max-w-3xl mx-auto">
          <p className="font-mono text-sm text-primary tracking-[0.3em] uppercase mb-6 animate-fade-in">
            Hiring, Reimagined
          </p>
          <h1 className="text-5xl md:text-7xl font-mono leading-[1.1] mb-6 animate-fade-in text-foreground">
            The assessment
            <br />
            platform that
            <br />
            <span className="text-gradient-orange">feels alive</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-lg mx-auto mb-12 animate-fade-in font-sans">
            Create immersive technical assessments. Evaluate candidates in real-time.
            Built for teams who refuse to settle for boring.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in">
            <LiquidButton size="lg" onClick={() => navigate("/verify")}>
              I'm an Applicant
            </LiquidButton>
            <LiquidButton size="lg" variant="outline" onClick={() => navigate("/dashboard")}>
              I'm Hiring
            </LiquidButton>
          </div>
        </div>

        {/* Floating glass cards */}
        <div className="absolute bottom-12 left-0 right-0 flex justify-center gap-6 px-6 opacity-60">
          <GlassCard className="w-48 h-28 animate-float hidden md:block" hover={false}>
            <div className="font-mono text-xs text-muted-foreground mb-2">LIVE CODING</div>
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
              <div className="w-3/4 h-full bg-primary rounded-full" />
            </div>
          </GlassCard>
          <GlassCard
            className="w-48 h-28 animate-float hidden lg:block"
            hover={false}
            
          >
            <div className="font-mono text-xs text-muted-foreground mb-2">CANDIDATES</div>
            <div className="text-2xl font-mono text-foreground">1,247</div>
          </GlassCard>
          <GlassCard
            className="w-48 h-28 animate-float hidden md:block"
            hover={false}
          >
            <div className="font-mono text-xs text-muted-foreground mb-2">PASS RATE</div>
            <div className="text-2xl font-mono text-primary">73%</div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default Landing;
