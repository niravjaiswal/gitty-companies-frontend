import { useState } from "react";
import { useNavigate } from "react-router-dom";
import GlassCard from "@/components/GlassCard";
import GlassNav from "@/components/GlassNav";
import LiquidButton from "@/components/LiquidButton";
import LiquidBlobs from "@/components/LiquidBlobs";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const mockAssessments = [
  { id: "1", title: "Full-Stack Engineer", status: "active", candidates: 42, created: "2 days ago" },
  { id: "2", title: "Frontend React Challenge", status: "active", candidates: 18, created: "5 days ago" },
  { id: "3", title: "System Design Interview", status: "draft", candidates: 0, created: "1 week ago" },
  { id: "4", title: "DevOps Pipeline Task", status: "completed", candidates: 31, created: "2 weeks ago" },
  { id: "5", title: "ML Model Evaluation", status: "active", candidates: 7, created: "3 days ago" },
  { id: "6", title: "API Security Audit", status: "draft", candidates: 0, created: "1 day ago" },
];

const stats = [
  { label: "Active", value: "3", accent: true },
  { label: "Pending Review", value: "12", accent: false },
  { label: "Total Candidates", value: "98", accent: false },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const filtered = mockAssessments.filter((a) =>
    a.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background relative">
      <LiquidBlobs />
      <GlassNav variant="company" />

      <div className="relative z-10 pt-24 px-6 max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <p className="font-mono text-xs text-primary tracking-[0.3em] uppercase mb-2">Dashboard</p>
            <h1 className="font-mono text-3xl text-foreground">Your Assessments</h1>
          </div>
          <LiquidButton onClick={() => navigate("/dashboard/create")}>
            + New Assessment
          </LiquidButton>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {stats.map((s) => (
            <GlassCard key={s.label} hover={false} className="text-center py-8">
              <div className={`text-3xl font-mono mb-1 ${s.accent ? "text-primary" : "text-foreground"}`}>
                {s.value}
              </div>
              <div className="text-xs font-mono text-muted-foreground tracking-wider uppercase">{s.label}</div>
            </GlassCard>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search assessments..."
            className="pl-11 bg-secondary/30 border-border focus:border-primary"
          />
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((assessment) => (
            <GlassCard key={assessment.id} className="flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      assessment.status === "active"
                        ? "bg-primary"
                        : assessment.status === "draft"
                        ? "bg-muted-foreground"
                        : "bg-green-500"
                    }`}
                  />
                  <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                    {assessment.status}
                  </span>
                </div>
                <h3 className="font-mono text-lg text-foreground mb-1">{assessment.title}</h3>
                <p className="text-xs text-muted-foreground font-sans">Created {assessment.created}</p>
              </div>
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/50">
                <span className="text-sm text-muted-foreground font-sans">
                  {assessment.candidates} candidate{assessment.candidates !== 1 ? "s" : ""}
                </span>
                <LiquidButton
                  variant="ghost"
                  size="default"
                  onClick={() => navigate(`/dashboard/send/${assessment.id}`)}
                  className="text-xs px-3 py-1.5"
                >
                  Send →
                </LiquidButton>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
