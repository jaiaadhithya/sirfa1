import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, ExternalLink, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";

const newsItems = [
  {
    id: 1,
    title: "Federal Reserve Signals Potential Rate Cut in Q4 2024",
    summary: "Fed Chairman suggests monetary policy adjustments may be necessary to support economic growth amid cooling inflation data.",
    source: "Reuters",
    timestamp: "2 hours ago",
    category: "Monetary Policy",
    sentiment: "positive",
    impact: "high",
    relevantTickers: ["SPY", "QQQ", "TLT"]
  },
  {
    id: 2,
    title: "Apple Reports Record Q3 Revenue Despite Supply Chain Challenges",
    summary: "Tech giant beats earnings expectations with strong iPhone and services growth, stock up 3.2% in after-hours trading.",
    source: "Bloomberg", 
    timestamp: "4 hours ago",
    category: "Earnings",
    sentiment: "positive",
    impact: "medium",
    relevantTickers: ["AAPL"]
  },
  {
    id: 3,
    title: "Oil Prices Surge 5% on Middle East Tensions",
    summary: "Crude oil futures jump amid geopolitical concerns, energy sector leads market gains as investors seek inflation hedges.",
    source: "Wall Street Journal",
    timestamp: "6 hours ago", 
    category: "Commodities",
    sentiment: "neutral",
    impact: "high",
    relevantTickers: ["XOM", "CVX", "USO"]
  },
  {
    id: 4,
    title: "Tesla Faces Production Delays at Berlin Gigafactory",
    summary: "Electric vehicle manufacturer reports temporary slowdown in European operations due to supply chain disruptions.",
    source: "Financial Times",
    timestamp: "8 hours ago",
    category: "Corporate",
    sentiment: "negative", 
    impact: "medium",
    relevantTickers: ["TSLA"]
  }
];

export const NewsFeed = () => {
  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <TrendingUp className="h-4 w-4 text-success" />;
      case 'negative':
        return <TrendingDown className="h-4 w-4 text-danger" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-accent" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      default:
        return 'secondary';
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Market News & Analysis</span>
          <Badge variant="secondary" className="text-xs">
            Live Updates
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {newsItems.map((item) => (
            <div key={item.id} className="border-b border-border pb-6 last:border-b-0">
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {getSentimentIcon(item.sentiment)}
                    <Badge variant={getImpactColor(item.impact) as any} className="text-xs">
                      {item.impact.toUpperCase()} IMPACT
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {item.timestamp}
                  </div>
                </div>

                {/* Title and Summary */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground leading-tight hover:text-primary cursor-pointer transition-smooth">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.summary}
                  </p>
                </div>

                {/* Metadata */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{item.source}</span>
                    <Badge variant="outline" className="text-xs">
                      {item.category}
                    </Badge>
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 px-2">
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>

                {/* Relevant Tickers */}
                {item.relevantTickers.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Related:</span>
                    <div className="flex gap-2">
                      {item.relevantTickers.map((ticker) => (
                        <Badge key={ticker} variant="secondary" className="text-xs font-mono">
                          {ticker}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          <Button variant="outline" className="w-full">
            Load More News
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};