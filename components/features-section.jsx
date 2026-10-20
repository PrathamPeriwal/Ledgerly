import { Card, CardContent } from "@/components/ui/card";
import { Shield, TrendingUp, PieChart, Zap, Lock, BarChart3 } from "lucide-react";

const featuresData = [
  {
    icon: <Shield className="h-8 w-8" />,
    title: "Bank-Level Security",
    description: "Your data is protected with 256-bit encryption and multi-factor authentication."
  },
  {
    icon: <TrendingUp className="h-8 w-8" />,
    title: "Smart Analytics",
    description: "AI-powered insights help you understand your spending patterns and optimize your budget."
  },
  {
    icon: <PieChart className="h-8 w-8" />,
    title: "Visual Reports",
    description: "Beautiful charts and graphs make it easy to track your financial progress."
  },
  {
    icon: <Zap className="h-8 w-8" />,
    title: "Real-time Sync",
    description: "Instant updates across all your devices with real-time transaction syncing."
  },
  {
    icon: <Lock className="h-8 w-8" />,
    title: "Privacy First",
    description: "We never sell your data. Your financial information stays private and secure."
  },
  {
    icon: <BarChart3 className="h-8 w-8" />,
    title: "Goal Tracking",
    description: "Set and track financial goals with personalized recommendations and milestones."
  }
];

export default function FeaturesSection() {
  return (
    <section className="py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold gradient-title mb-4">
            Powerful Features for Smart Finance Management
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Everything you need to take control of your finances and build wealth for the future.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featuresData.map((feature, index) => (
            <Card key={index} className="glass-card hover-lift">
              <CardContent className="p-6">
                <div className="text-primary mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}