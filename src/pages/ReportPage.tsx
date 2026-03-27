import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import GlassCard from "@/components/GlassCard";
import LiquidBlobs from "@/components/LiquidBlobs";
import LiquidButton from "@/components/LiquidButton";
import ReportView from "@/components/assessment/ReportView";
import {
  clearLastReport,
  getLastReport,
  getSession,
  resetLocalSession,
} from "@/components/assessment/localSession";

export default function ReportPage() {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();

  const report = useMemo(() => {
    if (sessionId) {
      const session = getSession(sessionId);
      if (session?.report) {
        return session.report;
      }
    }

    return getLastReport();
  }, [sessionId]);

  if (!report) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-background">
        <LiquidBlobs />
        <div className="relative z-10 mx-auto flex min-h-screen max-w-3xl items-center px-6">
          <GlassCard hover={false} className="w-full p-8 text-center">
            <h1 className="font-display text-3xl text-foreground">Report unavailable</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              There is no completed local report for this session yet.
            </p>
            <div className="mt-6">
              <LiquidButton onClick={() => navigate("/candidate")}>Back to dashboard</LiquidButton>
            </div>
          </GlassCard>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <LiquidBlobs />
      <div className="relative z-10 mx-auto max-w-7xl px-6 py-12">
        <ReportView
          report={report}
          onBack={() => navigate("/candidate")}
          onRestart={() => {
            resetLocalSession();
            clearLastReport();
            navigate("/candidate");
          }}
        />
      </div>
    </div>
  );
}
