// SIRFA Agent Finance - Portfolio Component
// Real-time portfolio display with WebSocket integration

import React, { useState, useEffect } from 'react';
import { usePortfolioUpdates, useWebSocket } from '../hooks/useWebSocket';

const Portfolio = () => {
  const [localPortfolio, setLocalPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const { isConnected } = useWebSocket();
  const { portfolioData, lastUpdate } = usePortfolioUpdates((data) => {
    console.log('Portfolio update received:', data);
    setLoading(false);
  });

  // Fetch initial portfolio data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        
        // Fetch both overview and positions data
        const [overviewResponse, positionsResponse] = await Promise.all([
          fetch('/api/portfolio/overview'),
          fetch('/api/portfolio/positions')
        ]);
        
        if (!overviewResponse.ok || !positionsResponse.ok) {
          throw new Error('Failed to fetch portfolio data');
        }
        
        const overviewData = await overviewResponse.json();
        const positionsData = await positionsResponse.json();
        
        // Merge the data
        const combinedData = {
          ...overviewData,
          positions: positionsData
        };
        
        setLocalPortfolio(combinedData);
        setError(null);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching portfolio:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // Use WebSocket data if available, otherwise use local data
  const displayData = portfolioData || localPortfolio;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatPercentage = (value) => {
    const num = parseFloat(value) || 0;
    const sign = num >= 0 ? '+' : '';
    return `${sign}${num.toFixed(2)}%`;
  };

  const getChangeColor = (value) => {
    const num = parseFloat(value) || 0;
    if (num > 0) return 'text-green-400';
    if (num < 0) return 'text-red-400';
    return 'text-slate-400';
  };

  if (loading) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-700 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-slate-700 rounded"></div>
            <div className="h-4 bg-slate-700 rounded w-3/4"></div>
            <div className="h-4 bg-slate-700 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
        <div className="text-red-400">
          <h3 className="text-lg font-semibold mb-2 text-white">Error Loading Portfolio</h3>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!displayData) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
        <h2 className="text-xl font-bold mb-4 text-white">Portfolio</h2>
        <p className="text-slate-400">No portfolio data available</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-hidden">
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-4 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <h2 className="text-2xl font-bold text-white">Portfolio</h2>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <span className="text-sm text-slate-400">
              {isConnected ? 'Live' : 'Offline'}
            </span>
            {lastUpdate && (
              <span className="text-xs text-slate-500">
                Updated: {lastUpdate.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </div>



      {/* Portfolio Summary */}
      <div className="responsive-grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 p-4 sm:p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 w-full">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Total Value</h3>
            <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30">
              <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-white mb-1">
            {formatCurrency(displayData.totalValue)}
          </p>
          <p className="text-sm text-slate-400">Portfolio value</p>
        </div>
        
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 p-4 sm:p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 w-full">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Day Change</h3>
            <div className={`p-2 rounded-lg border ${
              parseFloat(displayData.dayChange) >= 0 ? 'bg-green-500/20 border-green-500/30' : 'bg-red-500/20 border-red-500/30'
            }`}>
              <svg className={`h-5 w-5 ${
                parseFloat(displayData.dayChange) >= 0 ? 'text-green-400' : 'text-red-400'
              }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={parseFloat(displayData.dayChange) >= 0 ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" : "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"} />
              </svg>
            </div>
          </div>
          <p className={`text-2xl sm:text-3xl font-bold mb-1 ${getChangeColor(displayData.dayChange)}`}>
            {formatCurrency(displayData.dayChangeAmount)}
          </p>
          <p className={`text-sm font-medium ${getChangeColor(displayData.dayChange)}`}>
            {formatPercentage(displayData.dayChange)}
          </p>
        </div>
        
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 p-4 sm:p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 w-full">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Buying Power</h3>
            <div className="p-2 bg-emerald-500/20 rounded-lg border border-emerald-500/30">
              <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-white mb-1">
            {formatCurrency(displayData.buyingPower)}
          </p>
          <p className="text-sm text-slate-400">Available to trade</p>
        </div>
      </div>

      {/* Holdings Table */}
      {displayData.positions && displayData.positions.length > 0 && (
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700/50">
            <h3 className="text-lg font-semibold text-white">Holdings</h3>
            <p className="text-sm text-slate-400 mt-1">Your current positions</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-700/30">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Symbol
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Shares
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Market Value
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Day Change
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Total Return
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {displayData.positions.map((position, index) => (
                  <tr key={index} className="hover:bg-slate-700/20 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg flex items-center justify-center border border-blue-500/30">
                          <span className="text-sm font-bold text-blue-400">
                            {position.symbol.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <div className="text-sm font-semibold text-white">
                              {position.symbol}
                            </div>
                            {position.status === 'pending' && (
                              <span className="px-2 py-1 text-xs font-medium bg-yellow-500/20 text-yellow-400 rounded-full border border-yellow-500/30">
                                Pending
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400">
                            {position.side} {position.status === 'pending' ? `(${position.orderType})` : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">
                        {parseFloat(position.shares || position.qty || 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-400">shares</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">
                        {formatCurrency(position.currentPrice)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-white">
                        {formatCurrency(position.value || position.marketValue || 0)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-semibold ${getChangeColor(position.changePercent || position.unrealizedPlPercent || 0)}`}>
                        {formatCurrency(position.change || position.unrealizedPl || 0)}
                      </div>
                      <div className={`text-xs font-medium ${getChangeColor(position.changePercent || position.unrealizedPlPercent || 0)}`}>
                        {formatPercentage(position.changePercent || position.unrealizedPlPercent || 0)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-semibold ${getChangeColor(position.changePercent || position.unrealizedPlPercent || 0)}`}>
                        {formatCurrency(position.change || position.unrealizedPl || 0)}
                      </div>
                      <div className={`text-xs font-medium ${getChangeColor(position.changePercent || position.unrealizedPlPercent || 0)}`}>
                        {formatPercentage(position.changePercent || position.unrealizedPlPercent || 0)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {(!displayData.positions || displayData.positions.length === 0) && (
        <div className="text-center py-8">
          <div className="text-slate-400 mb-2">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white mb-1">No Positions</h3>
          <p className="text-slate-400">Your portfolio positions will appear here</p>
        </div>
      )}
    </div>
  );
};

export default Portfolio;