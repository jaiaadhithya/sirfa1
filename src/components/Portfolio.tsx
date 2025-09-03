import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, PieChart, Activity, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

interface PortfolioOverview {
  totalValue: number;
  dayChange: number;
  dayChangePercent: number;
  buyingPower: number;
  equity: number;
  longMarketValue: number;
  shortMarketValue: number;
  accountStatus: string;
  tradingBlocked: boolean;
  transfersBlocked: boolean;
}

interface Position {
  symbol: string;
  name: string;
  shares: number;
  currentPrice: number;
  value: number;
  change: number;
  changePercent: number;
  avgCost: number;
  side: string;
}

interface Allocation {
  sector: string;
  percentage: number;
  value: number;
}

export const Portfolio = () => {
  const [portfolioData, setPortfolioData] = useState<PortfolioOverview | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [allocation, setAllocation] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPortfolioData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch portfolio overview
      const overviewResponse = await fetch(`${API_BASE_URL}/portfolio/overview`);
      if (!overviewResponse.ok) throw new Error('Failed to fetch portfolio overview');
      const overview = await overviewResponse.json();
      
      // Fetch positions
      const positionsResponse = await fetch(`${API_BASE_URL}/portfolio/positions`);
      if (!positionsResponse.ok) throw new Error('Failed to fetch positions');
      const positionsData = await positionsResponse.json();
      
      // Fetch allocation
      const allocationResponse = await fetch(`${API_BASE_URL}/portfolio/allocation`);
      if (!allocationResponse.ok) throw new Error('Failed to fetch allocation');
      const allocationData = await allocationResponse.json();
      
      setPortfolioData(overview);
      setPositions(positionsData);
      setAllocation(allocationData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolioData();
    // Refresh data every 30 seconds
    const interval = setInterval(fetchPortfolioData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !portfolioData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Portfolio Dashboard</h2>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Portfolio Dashboard</h2>
          <Button onClick={fetchPortfolioData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-red-600 text-center">
              <p className="font-medium">Failed to load portfolio data</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  const isPositive = (portfolioData?.dayChange || 0) >= 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Portfolio Dashboard</h2>
        <div className="flex items-center gap-2">
          <Button onClick={fetchPortfolioData} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {portfolioData && (
            <Badge variant={isPositive ? "default" : "destructive"}>
              {isPositive ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
              {isPositive ? "+" : ""}{portfolioData?.dayChangePercent?.toFixed(2) || '0.00'}%
            </Badge>
          )}
        </div>
      </div>
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
                ${portfolioData?.totalValue?.toLocaleString() || '0'}
              </p>
              <div className={`flex items-center gap-2 mt-1 ${isPositive ? 'text-success' : 'text-danger'}`}>
                {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                <span className="font-semibold">
                  {isPositive ? '+' : ''}${portfolioData?.dayChange?.toFixed(2) || '0.00'} ({portfolioData?.dayChangePercent?.toFixed(2) || '0.00'}%)
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

      {/* Additional Portfolio Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="gradient-card shadow-financial">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Buying Power</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              ${portfolioData?.buyingPower?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Available for trading
            </p>
          </CardContent>
        </Card>

        <Card className="gradient-card shadow-financial">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Day Change</CardTitle>
            <Activity className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? "+" : ""}${portfolioData?.dayChange?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {isPositive ? "+" : ""}{portfolioData?.dayChangePercent?.toFixed(2) || '0.00'}% from yesterday
            </p>
          </CardContent>
        </Card>

        <Card className="gradient-card shadow-financial">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Long Market Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              ${portfolioData?.longMarketValue?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Long positions value
            </p>
          </CardContent>
        </Card>

        <Card className="gradient-card shadow-financial">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Account Status</CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-gray-900">
              {portfolioData?.accountStatus || 'ACTIVE'}
            </div>
            <p className={`text-xs mt-1 ${
              portfolioData?.tradingBlocked ? 'text-red-600' : 'text-green-600'
            }`}>
              {portfolioData?.tradingBlocked ? 'Trading Blocked' : 'Trading Enabled'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Holdings */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Current Holdings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {positions.map((position) => (
                <div key={position.symbol} className="flex items-center justify-between p-4 rounded-lg gradient-card">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <div className="font-semibold text-primary">{position.symbol}</div>
                      <div className="text-sm text-muted-foreground">{position.name || position.symbol}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm text-muted-foreground">
                        {Math.abs(position.shares)} shares @ ${position.currentPrice}
                      </div>
                      {position.side && (
                        <Badge variant={position.side === 'long' ? 'default' : 'secondary'} className="text-xs">
                          {position.side.toUpperCase()}
                        </Badge>
                      )}
                    </div>
                    {position.avgCost && (
                      <div className="text-xs text-muted-foreground">
                        Avg Cost: ${position.avgCost.toFixed(2)}
                      </div>
                    )}
                  </div>
                  <div className="text-right space-y-1">
                    <div className="font-semibold">${position.value?.toLocaleString() || '0'}</div>
                    <div className={`text-sm flex items-center gap-1 ${
                      (position.change || 0) >= 0 ? 'text-success' : 'text-danger'
                    }`}>
                      {(position.change || 0) >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {(position.change || 0) >= 0 ? '+' : ''}${(position.change || 0).toFixed(2)} ({(position.changePercent || 0).toFixed(2)}%)
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
              {allocation.map((item) => (
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