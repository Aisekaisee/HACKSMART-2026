import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Battery, Zap, BarChart3, Map } from "lucide-react";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Battery className="h-8 w-8 text-blue-500" />
          <span className="text-xl font-bold text-white">SwapSim</span>
        </div>
        <Button
          variant="ghost"
          className="text-slate-300 hover:text-white"
          onClick={() => navigate("/login")}
        >
          Sign In
        </Button>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="animate-fade-in max-w-4xl">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Digital Twin
            <span className="text-blue-500"> Swap Station </span>
            Simulator
          </h1>
          <p className="text-xl text-slate-400 mb-8 max-w-2xl mx-auto">
            Optimize your EV battery swap network with real-time simulations.
            Model demand scenarios, test interventions, and maximize operational
            efficiency.
          </p>
          <div className="flex gap-4 justify-center">
            <Button
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8"
              onClick={() => navigate("/login")}
            >
              Get Started
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-800 px-8"
              onClick={() => navigate("/login")}
            >
              Sign In
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-4 gap-6 mt-20 max-w-5xl w-full">
          <FeatureCard
            icon={<Map className="h-8 w-8" />}
            title="Station Mapping"
            description="Visualize and manage your swap station network on an interactive map"
          />
          <FeatureCard
            icon={<Zap className="h-8 w-8" />}
            title="Demand Modeling"
            description="Simulate weather events, festivals, and custom demand scenarios"
          />
          <FeatureCard
            icon={<BarChart3 className="h-8 w-8" />}
            title="KPI Analytics"
            description="Track wait times, utilization, throughput, and operational costs"
          />
          <FeatureCard
            icon={<Battery className="h-8 w-8" />}
            title="Replenishment"
            description="Test different battery replenishment policies and strategies"
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 text-center text-slate-500 text-sm">
        Built for HACKSMART 2026
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
    <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-blue-500/50 transition-colors">
      <div className="text-blue-500 mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-slate-400 text-sm">{description}</p>
    </div>
  );
}
