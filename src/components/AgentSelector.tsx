import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, TrendingUp, BarChart3 } from "lucide-react";

interface Agent {
  id: string;
  name: string;
  personality: string;
  description: string;
  riskLevel: "Safe" | "Risky" | "Data-Driven";
  icon: React.ReactNode;
  color: string;
}

const agents: Agent[] = [
  {
    id: "wharton-buffest",
    name: "Wharton Buffest",
    personality: "Value Investor",
    description: "Conservative approach focused on long-term value and stable growth. Emphasizes fundamental analysis and risk management.",
    riskLevel: "Safe",
    icon: <Shield className="h-8 w-8" />,
    color: "success"
  },
  {
    id: "melvin-arck", 
    name: "Melvin Arck",
    personality: "Aggressive Trader",
    description: "High-risk, high-reward strategies targeting emerging trends and volatile opportunities for maximum returns.",
    riskLevel: "Risky",
    icon: <TrendingUp className="h-8 w-8" />,
    color: "danger"
  },
  {
    id: "jane-quant",
    name: "Jane Quant", 
    personality: "Quantitative Analyst",
    description: "Data-driven algorithmic insights using advanced analytics and machine learning for systematic investment decisions.",
    riskLevel: "Data-Driven",
    icon: <BarChart3 className="h-8 w-8" />,
    color: "accent"
  }
];

interface AgentSelectorProps {
  selectedAgent: string | null;
  onAgentSelect: (agentId: string) => void;
}

export const AgentSelector = ({ selectedAgent, onAgentSelect }: AgentSelectorProps) => {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold gradient-hero bg-clip-text text-transparent">
          Choose Your AI Financial Advisor
        </h2>
        <p className="text-muted-foreground">
          Select an AI agent that matches your investment style and risk tolerance
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {agents.map((agent) => (
          <Card 
            key={agent.id}
            className={`cursor-pointer transition-smooth hover:shadow-financial ${
              selectedAgent === agent.id 
                ? 'ring-2 ring-primary shadow-glow' 
                : 'gradient-card'
            }`}
            onClick={() => onAgentSelect(agent.id)}
          >
            <CardHeader className="text-center space-y-4">
              <div className={`mx-auto p-4 rounded-full ${
                agent.color === 'success' ? 'bg-success-light text-success' :
                agent.color === 'danger' ? 'bg-danger-light text-danger' :
                'bg-accent-light text-accent'
              }`}>
                {agent.icon}
              </div>
              <div className="space-y-2">
                <CardTitle className="text-xl">{agent.name}</CardTitle>
                <Badge variant={
                  agent.color === 'success' ? 'secondary' :
                  agent.color === 'danger' ? 'destructive' :
                  'default'
                }>
                  {agent.riskLevel}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm font-medium text-primary">{agent.personality}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {agent.description}
              </p>
              <Button 
                variant={selectedAgent === agent.id ? "financial" : "agent"}
                size="financial"
                className="w-full"
              >
                {selectedAgent === agent.id ? "Selected" : "Choose Advisor"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};