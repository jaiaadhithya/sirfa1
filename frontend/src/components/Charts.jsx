// SIRFA Agent Finance - Charts Page Component
// Comprehensive financial charts and market analysis

import React, { useState, useEffect } from 'react';
import StockChart from './charts/StockChart';
import PortfolioChart from './charts/PortfolioChart';
import Chart from './charts/Chart';
import AIAnalysisModal from './AIAnalysisModal';
import { chartService } from '../services/chartService';

const Charts = () => {
  const [selectedSymbol, setSelectedSymbol] = useState('AAPL');
  const [marketData, setMarketData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [watchlist] = useState(['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'NVDA', 'META', 'NFLX']);
  
  // AI Modal states
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiModalData, setAiModalData] = useState(null);
  const [aiModalType, setAiModalType] = useState('chart');

  // Real portfolio data states
  const [portfolioPerformanceData, setPortfolioPerformanceData] = useState(null);
  const [portfolioAllocationData, setPortfolioAllocationData] = useState(null);
  const [portfolioLoading, setPortfolioLoading] = useState(true);
  const [portfolioError, setPortfolioError] = useState(null);

  const [marketOverview, setMarketOverview] = useState({
    labels: ['Technology', 'Healthcare', 'Finance', 'Energy', 'Consumer', 'Industrial'],
    datasets: [{
      label: 'Market Cap Distribution',
      data: [35, 18, 15, 12, 12, 8],
      backgroundColor: [
        'rgba(59, 130, 246, 0.8)',
        'rgba(16, 185, 129, 0.8)',
        'rgba(245, 158, 11, 0.8)',
        'rgba(239, 68, 68, 0.8)',
        'rgba(139, 92, 246, 0.8)',
        'rgba(236, 72, 153, 0.8)'
      ],
      borderColor: [
        'rgba(59, 130, 246, 1)',
        'rgba(16, 185, 129, 1)',
        'rgba(245, 158, 11, 1)',
        'rgba(239, 68, 68, 1)',
        'rgba(139, 92, 246, 1)',
        'rgba(236, 72, 153, 1)'
      ],
      borderWidth: 2
    }]
  });

  // Fetch real portfolio data
  const fetchPortfolioData = async () => {
    setPortfolioLoading(true);
    setPortfolioError(null);
    try {
      // Fetch portfolio history for performance chart
      const historyResponse = await fetch('/api/portfolio/history?period=3M&timeframe=1D');
      if (!historyResponse.ok) throw new Error('Failed to fetch portfolio history');
      const historyData = await historyResponse.json();
      
      // Transform history data for chart
      const performanceData = {
        performance: historyData.timestamps?.map((timestamp, index) => ({
          date: new Date(timestamp * 1000).toISOString().split('T')[0],
          totalValue: historyData.equity?.[index] || 0,
          cash: 0 // Will be updated with actual cash data if available
        })) || []
      };
      
      // Fetch current positions for allocation chart
      const positionsResponse = await fetch('/api/portfolio/positions');
      if (!positionsResponse.ok) throw new Error('Failed to fetch portfolio positions');
      const positionsData = await positionsResponse.json();
      
      // Transform positions data for allocation chart
      const allocationData = {
        holdings: Array.isArray(positionsData) ? positionsData.map(position => ({
          symbol: position.symbol,
          marketValue: Math.abs(position.value || 0)
        })) : []
      };
      
      setPortfolioPerformanceData(performanceData);
      setPortfolioAllocationData(allocationData);
    } catch (error) {
      console.error('Error fetching portfolio data:', error);
      setPortfolioError(error.message);
      // Fallback to mock data on error
      setPortfolioPerformanceData({
        performance: [
          { date: '2024-01-01', totalValue: 100000, cash: 5000 },
          { date: '2024-01-15', totalValue: 102500, cash: 4800 },
          { date: '2024-02-01', totalValue: 98000, cash: 5200 },
          { date: '2024-02-15', totalValue: 105000, cash: 4500 }
        ]
      });
      setPortfolioAllocationData({
        holdings: [
          { symbol: 'AAPL', marketValue: 35000 },
          { symbol: 'GOOGL', marketValue: 25000 },
          { symbol: 'MSFT', marketValue: 20000 }
        ]
      });
    } finally {
      setPortfolioLoading(false);
    }
  };

  const fetchMarketData = async (symbol) => {
    setLoading(true);
    try {
      const quote = await chartService.getRealTimeQuote(symbol);
      setMarketData(quote);
    } catch (error) {
      console.error('Error fetching market data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle chart clicks for AI analysis
  const handleChartClick = (clickData) => {
    console.log('Chart clicked:', clickData);
    setAiModalData(clickData);
    setAiModalType('chart');
    setShowAIModal(true);
  };

  // Handle AI message sending
  const handleSendAIMessage = async (message, context) => {
    try {
      // Create context-aware prompt for AI analysis
      let prompt = message;
      if (context.type === 'chart' && context.data) {
        prompt = `Analyze this chart data: ${context.data.label} with value ${context.data.value} from ${context.data.dataset || 'chart'}. User question: ${message}. Please provide a short, detailed financial analysis for ${selectedSymbol}.`;
      } else {
        prompt = `Provide financial analysis for ${selectedSymbol}. User question: ${message}. Keep the response short and detailed.`;
      }

      // Call the real AI API endpoint
       const response = await fetch('/api/agents/wharton-buffest/portfolio-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          question: prompt
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        return data.response;
      } else {
        throw new Error(data.error || 'Failed to get AI response');
      }
    } catch (error) {
      console.error('Error sending AI message:', error);
      // Fallback to a brief error message
      return `I'm currently unable to provide analysis. Please try again later. Error: ${error.message}`;
    }
  };

  useEffect(() => {
    fetchMarketData(selectedSymbol);
    fetchPortfolioData();
  }, [selectedSymbol]);

  // Refresh portfolio data every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchPortfolioData, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatPercentage = (value) => {
    const num = parseFloat(value) || 0;
    return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
  };

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl border border-blue-500/30">
              <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Financial Charts</h2>
              <p className="text-sm text-slate-400">Real-time market analysis and portfolio insights</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
            <select
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              className="w-full sm:w-auto px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {watchlist.map(symbol => (
                <option key={symbol} value={symbol}>{symbol}</option>
              ))}
            </select>
            {marketData && (
              <div className="text-left sm:text-right">
                <div className="text-lg font-bold text-white">
                  {formatCurrency(marketData.price)}
                </div>
                <div className={`text-sm font-semibold ${
                  parseFloat(marketData.changePercent) >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {formatPercentage(marketData.changePercent)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="responsive-grid xl:grid-cols-3 gap-6">
        {/* Primary Stock Chart */}
        <div className="xl:col-span-2 w-full">
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-4 sm:p-6 w-full">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-lg border border-green-500/30">
                <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white">{selectedSymbol} Price Chart</h3>
              {loading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
              )}
            </div>
            <div className="chart-container w-full">
              <StockChart 
                symbol={selectedSymbol}
                height={400}
                showControls={true}
                onChartClick={handleChartClick}
              />
            </div>
          </div>
        </div>

        {/* Market Overview */}
        <div className="space-y-6 w-full">
          {/* Market Sectors */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-4 sm:p-6 w-full">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg border border-purple-500/30">
                <svg className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">Market Sectors</h3>
            </div>
            <Chart
              type="doughnut"
              data={marketOverview}
              height={300}
              options={{
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: {
                      color: '#cbd5e1',
                      font: { size: 12 },
                      padding: 15
                    }
                  }
                },
                maintainAspectRatio: false
              }}
            />
          </div>

          {/* Watchlist */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-lg border border-yellow-500/30">
                <svg className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">Watchlist</h3>
            </div>
            <div className="space-y-3">
              {watchlist.map((symbol) => (
                <button
                  key={symbol}
                  onClick={() => setSelectedSymbol(symbol)}
                  className={`w-full text-left p-3 rounded-xl border transition-all duration-200 ${
                    selectedSymbol === symbol
                      ? 'bg-blue-500/20 border-blue-500/30 text-blue-400'
                      : 'bg-slate-700/30 border-slate-600/30 text-slate-300 hover:bg-slate-700/50'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">{symbol}</span>
                    <div className="text-xs text-slate-400">
                      Click to view
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Portfolio Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Portfolio Performance */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-lg border border-indigo-500/30">
              <svg className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white">Portfolio Performance</h3>
          </div>
          <PortfolioChart 
            type="performance"
            data={portfolioPerformanceData}
            loading={portfolioLoading}
            error={portfolioError}
            height={400}
            timeRange="3M"
          />
        </div>

        {/* Portfolio Allocation */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-lg border border-emerald-500/30">
              <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white">Asset Allocation</h3>
          </div>
          <PortfolioChart 
            type="pie"
            data={portfolioAllocationData}
            loading={portfolioLoading}
            error={portfolioError}
            height={400}
          />
        </div>
      </div>



      {/* AI Analysis Modal */}
      <AIAnalysisModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        data={aiModalData}
        type={aiModalType}
        onSendMessage={handleSendAIMessage}
      />
    </div>
  );
};

export default Charts;