import { useNavigate } from "react-router-dom";
import GlassNav from "@/components/GlassNav";
import LiquidButton from "@/components/LiquidButton";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="gitty-grid-plane gitty-grid-plane-a" />
        <div className="gitty-grid-plane gitty-grid-plane-b" />
        <div className="gitty-grid-plane gitty-grid-plane-c" />
      </div>
      <GlassNav variant="landing" />

      <main className="relative z-10">
        <section className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6 pb-20 pt-32">
          <div className="max-w-3xl text-center">
            <p className="mb-6 font-sans text-sm uppercase tracking-[0.3em] text-white/50">
              Hiring, Reimagined
            </p>
            <h1 className="mb-6 font-display text-5xl leading-[1.04] text-white sm:text-6xl md:text-7xl">
              The assessment
              <br />
              platform that
              <br />
              <span className="italic text-white/92">feels alive</span>
            </h1>
            <p className="mx-auto mb-12 max-w-lg text-lg font-sans text-white/62">
              Create immersive technical assessments. Evaluate candidates in real-time.
              Built for teams who refuse to settle for boring.
            </p>

            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <LiquidButton size="lg" onClick={() => navigate("/login")}>
                I'm an Applicant
              </LiquidButton>
              <LiquidButton size="lg" variant="outline" onClick={() => navigate("/dashboard")}>
                I'm Hiring
              </LiquidButton>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Landing;
