import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Battery, Zap, BarChart3, Map } from "lucide-react";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Background Glow Effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="px-6 py-6 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Battery className="h-6 w-6 text-primary" />
          </div>
          <span className="text-xl font-bold text-foreground tracking-tight">
            SwapSim
          </span>
        </div>
        <Button
          variant="ghost"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => navigate("/login")}
        >
          Sign In
        </Button>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center relative z-10">
        <div className="animate-fade-in max-w-4xl space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-bold text-foreground leading-tight tracking-tight">
              Digital Twin <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">
                Swap Station
              </span>{" "}
              Simulator
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Optimize your EV battery swap network with real-time simulations.
              Model demand scenarios, test interventions, and maximize
              operational efficiency.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 h-12 text-base shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)] transition-all"
              onClick={() => navigate("/login")}
            >
              Get Started Now
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="px-8 h-12 text-base border-primary/20 hover:bg-primary/5 text-foreground"
              onClick={() => navigate("/login")}
            >
              View Documentation
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-4 gap-6 mt-24 max-w-6xl w-full">
          <FeatureCard
            icon={<Map className="h-6 w-6" />}
            title="Station Mapping"
            description="Visualize and manage your swap station network on an interactive map"
          />
          <FeatureCard
            icon={<Zap className="h-6 w-6" />}
            title="Demand Modeling"
            description="Simulate weather events, festivals, and custom demand scenarios"
          />
          <FeatureCard
            icon={<BarChart3 className="h-6 w-6" />}
            title="KPI Analytics"
            description="Track wait times, utilization, throughput, and operational costs"
          />
          <FeatureCard
            icon={<Battery className="h-6 w-6" />}
            title="Replenishment"
            description="Test different battery replenishment policies and strategies"
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-8 text-center text-muted-foreground text-sm relative z-10">
        <p>&copy; 2026 SwapSim. Built for HACKSMART.</p>
      </footer>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all hover:bg-accent/5 group text-left">
      <div className="mb-4 inline-flex p-3 rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
        {title}
      </h3>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {description}
      </p>
    </div>
  );
}
