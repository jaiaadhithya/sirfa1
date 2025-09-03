import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, PieChart, Activity } from "lucide-react";

const portfolioData = {
  totalValue: 127845.32,
  dayChange: 2543.21,
  dayChangePercent: 2.03,
  positions: [
    {
      symbol: "AAPL",
      name: "Apple Inc.",
      shares: 150,
      currentPrice: 185.43,
      value: 27814.50,
      change: 412.30,
      changePercent: 1.51
    },
    {
      symbol: "MSFT", 
      name: "Microsoft Corp.",
      shares: 100,
      currentPrice: 348.10,
      value: 34810.00,
      change: -234.50,
      changePercent: -0.67
    },
    {
      symbol: "GOOGL",
      name: "Alphabet Inc.",
      shares: 80,
      currentPrice: 138.21,
      value: 11056.80,
      change: 156.80,
      changePercent: 1.44
    },
    {
      symbol: "TSLA",
      name: "Tesla Inc.",
      shares: 75,
      currentPrice: 245.67,
      value: 18425.25,
      change: 892.50,
      changePercent: 5.09
    }
  ],
  allocation: [
    { sector: "Technology", percentage: 68.2, value: 87231.45 },
    { sector: "Healthcare", percentage: 15.3, value: 19560.32 },
    { sector: "Finance", percentage: 12.1, value: 15469.28 },
    { sector: "Energy", percentage: 4.4, value: 5584.27 }
  ]
};

export const Portfolio = () => {
  const isPositive = portfolioData.dayChange >= 0;

  return (
    <div className="space-y-6">
      {/* Portfolio Summary */}
      <Card className="gradient-card shadow-financial">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-success" />
            Portfolio Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold">
                ${portfolioData.totalValue.toLocaleString()}
              </p>
              <div className={`flex items-center gap-2 mt-1 ${isPositive ? 'text-success' : 'text-danger'}`}>
                {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                <span className="font-semibold">
                  {isPositive ? '+' : ''}${portfolioData.dayChange.toFixed(2)} ({portfolioData.dayChangePercent.toFixed(2)}%)
                </span>
                <span className="text-muted-foreground text-sm">today</span>
              </div>
            </div>
            <div className="text-right space-y-1">
              <p className="text-sm text-muted-foreground">Portfolio Performance</p>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <Badge variant="secondary">+12.4% YTD</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Holdings */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Current Holdings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {portfolioData.positions.map((position) => (
                <div key={position.symbol} className="flex items-center justify-between p-4 rounded-lg gradient-card">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <div className="font-semibold text-primary">{position.symbol}</div>
                      <div className="text-sm text-muted-foreground">{position.name}</div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {position.shares} shares @ ${position.currentPrice}
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="font-semibold">${position.value.toLocaleString()}</div>
                    <div className={`text-sm flex items-center gap-1 ${
                      position.change >= 0 ? 'text-success' : 'text-danger'
                    }`}>
                      {position.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {position.change >= 0 ? '+' : ''}${position.change.toFixed(2)} ({position.changePercent.toFixed(2)}%)
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Asset Allocation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Asset Allocation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {portfolioData.allocation.map((item) => (
                <div key={item.sector} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{item.sector}</span>
                    <span className="text-muted-foreground">{item.percentage}%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-smooth ${
                        item.sector === 'Technology' ? 'gradient-primary' :
                        item.sector === 'Healthcare' ? 'gradient-success' :
                        item.sector === 'Finance' ? 'bg-accent' : 'bg-muted'
                      }`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ${item.value.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};