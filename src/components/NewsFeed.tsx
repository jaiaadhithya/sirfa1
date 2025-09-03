import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, ExternalLink, TrendingUp, TrendingDown, AlertTriangle, RefreshCw } from "lucide-react";

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  timestamp: string;
  category: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  impact: 'high' | 'medium' | 'low';
  relevantTickers: string[];
  url?: string;
}

export const NewsFeed = () => {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNews = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE_URL}/news`);
      if (!response.ok) {
        throw new Error('Failed to fetch news data');
      }
      
      const newsData = await response.json();
      setNewsItems(newsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
    // Refresh news every 5 minutes
    const interval = setInterval(fetchNews, 300000);
    return () => clearInterval(interval);
  }, []);

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
      
      if (diffInHours < 1) {
        const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
        return `${diffInMinutes} minutes ago`;
      } else if (diffInHours < 24) {
        return `${diffInHours} hours ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch {
      return timestamp;
    }
  };

  if (loading && newsItems.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Market News
            </CardTitle>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Market News
            </CardTitle>
            <Button onClick={fetchNews} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-600">
            <p className="font-medium">Failed to load news</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }
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
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Market News & Analysis
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              Live Updates
            </Badge>
            <Button onClick={fetchNews} variant="outline" size="sm" disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
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
                    {formatTimestamp(item.timestamp)}
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
                  {item.url && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 px-2"
                      onClick={() => window.open(item.url, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  )}
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