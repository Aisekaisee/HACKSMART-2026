export interface TutorialStep {
  id: string;
  target: string; // data-tutorial attribute value
  title: string;
  description: string;
  position: "top" | "bottom" | "left" | "right" | "center";
  icon?: string;
}

export const tutorialSteps: TutorialStep[] = [
  {
    id: "welcome",
    target: "welcome",
    title: "Welcome to the Simulation Dashboard! 🚀",
    description:
      "This interactive tutorial will guide you through all the powerful features of our battery swap network simulation platform. Let's explore how to configure, simulate, and analyze your network performance.",
    position: "center",
    icon: "✨",
  },
  {
    id: "stations-tab",
    target: "stations-tab",
    title: "Stations Management",
    description:
      "Here you can view, add, edit, and remove battery swap stations in your network. Each station shows its tier, location, charger count, and inventory capacity. Click the + button to add a new station or use the dropdown menu on each station card to edit or remove it.",
    position: "right",
    icon: "🏪",
  },
  {
    id: "scenarios-tab",
    target: "scenarios-tab",
    title: "Scenario Interventions",
    description:
      "Create realistic scenarios by adding interventions like weather events, special events (festivals, concerts), or replenishment policies. These interventions affect demand patterns and help you test your network's resilience.",
    position: "right",
    icon: "🎭",
  },
  {
    id: "simulation-controls",
    target: "simulation-controls",
    title: "Run Simulations",
    description:
      "First run a Baseline simulation to establish reference KPIs, then run Scenario simulations with your interventions. The duration selector lets you choose simulation length (24h, 48h, or 72h).",
    position: "right",
    icon: "▶️",
  },
  {
    id: "simulation-map",
    target: "simulation-map",
    title: "Interactive Network Map",
    description:
      "Visualize your entire network on the map. Station markers show real-time utilization with color coding and animations. Click any station to see details. During simulations, watch events and demand patterns unfold in real-time.",
    position: "center",
    icon: "🗺️",
  },
  {
    id: "analytics-panel",
    target: "analytics-panel",
    title: "Analytics Dashboard",
    description:
      "View comprehensive KPIs including average wait time, lost swaps, idle inventory, and utilization rates. Switch between Overview, Finance, Compare, and Station tabs to dive deep into different aspects of your network's performance.",
    position: "left",
    icon: "📊",
  },
  {
    id: "timeline-hint",
    target: "timeline-hint",
    title: "Timeline Playback",
    description:
      "After running a simulation, a timeline playback panel appears at the bottom of the map. Use it to replay the simulation, adjust playback speed, and observe how your network performs over time with live statistics.",
    position: "center",
    icon: "⏱️",
  },
  {
    id: "complete",
    target: "complete",
    title: "You're All Set! 🎉",
    description:
      "You now know the essentials of the simulation dashboard. Press 'i' anytime to revisit this tutorial. Start by adding stations, create scenarios with interventions, and run simulations to optimize your battery swap network!",
    position: "center",
    icon: "🏁",
  },
];
