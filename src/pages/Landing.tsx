import { useNavigate } from "react-router-dom";
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
          <p className="font-display text-sm text-primary tracking-[0.3em] uppercase mb-6 animate-fade-in">
            Hiring, Reimagined
          </p>
          <h1 className="text-5xl md:text-7xl font-display leading-[1.1] mb-6 animate-fade-in text-foreground">
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
            <LiquidButton size="lg" onClick={() => navigate("/login")}>
              I'm an Applicant
            </LiquidButton>
            <LiquidButton size="lg" variant="outline" onClick={() => navigate("/dashboard")}>
              I'm Hiring
            </LiquidButton>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Landing;
