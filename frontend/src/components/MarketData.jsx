// SIRFA Agent Finance - Market Data Component
// Real-time market data with WebSocket integration

import React, { useState, useEffect } from 'react';
import { useMarketData, useWebSocket } from '../hooks/useWebSocket';
import { TrendingUp, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import NewsPlugin from './NewsPlugin';
import { formatVolume } from '../utils/formatters';

const MarketData = () => {
  const [localMarketData, setLocalMarketData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('1D');
  const [watchlist, setWatchlist] = useState(['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN']);
  const [newSymbol, setNewSymbol] = useState('');
  const [newsData, setNewsData] = useState([]);

  const { isConnected } = useWebSocket();
  const { marketData, lastUpdate } = useMarketData((data) => {
    console.log('Market data update received:', data);
  });

  // Fetch initial market data
  useEffect(() => {
    const fetchInitialMarketData = async () => {
      try {
        setLoading(true);
        
        // Fetch quotes for each symbol individually
        const quotePromises = watchlist.map(async (symbol) => {
          try {
            const response = await fetch(`/api/charts/quote/${symbol}`);
            if (!response.ok) {
              throw new Error(`Failed to fetch data for ${symbol}`);
            }
            const data = await response.json();
            return data.success ? data.data : null;
          } catch (error) {
            console.error(`Error fetching ${symbol}:`, error);
            return null;
          }
        });
        
        const quotes = await Promise.all(quotePromises);
        const validQuotes = quotes.filter(quote => quote !== null);
        
        setLocalMarketData(validQuotes);
        setError(null);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching market data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialMarketData();
  }, [watchlist, selectedTimeframe]);

  // Use WebSocket data if available, otherwise use local data
  const displayMarketData = (marketData && marketData.length > 0) ? marketData : localMarketData;

  const addToWatchlist = () => {
    if (newSymbol && !watchlist.includes(newSymbol.toUpperCase())) {
      setWatchlist([...watchlist, newSymbol.toUpperCase()]);
      setNewSymbol('');
    }
  };

  const removeFromWatchlist = (symbol) => {
    setWatchlist(watchlist.filter(s => s !== symbol));
  };

  const handleNewsUpdate = (news) => {
    setNewsData(news);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  const formatPercentage = (percentage) => {
    const sign = percentage >= 0 ? '+' : '';
    return `${sign}${percentage.toFixed(2)}%`;
  };

  const getChangeColor = (change) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getChangeIcon = (change) => {
    if (change > 0) return '▲';
    if (change < 0) return '▼';
    return '●';
  };

  const timeframes = ['1D', '5D', '1M', '3M', '6M', '1Y'];

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="border border-gray-200 rounded-lg p-4">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-red-600">
          <h3 className="text-lg font-semibold mb-2">Error Loading Market Data</h3>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Market Overview */}
      <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl border border-blue-500/30">
              <TrendingUp className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">Market Overview</h3>
              <p className="text-sm text-slate-400">Real-time market indices and data</p>
            </div>
          </div>
          <div className={`px-4 py-2 rounded-xl text-sm font-semibold border flex items-center space-x-2 ${
            isConnected 
              ? 'bg-green-500/20 text-green-400 border-green-500/30' 
              : 'bg-red-500/20 text-red-400 border-red-500/30'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
            }`} />
            <span>{isConnected ? 'Live Data' : 'Offline'}</span>
            {lastUpdate && (
              <span className="text-xs text-slate-500 ml-2">
                {lastUpdate.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Watchlist */}
      <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Watchlist</h2>
        </div>

        {/* Controls */}
        <div className="mb-6 space-y-4">
          {/* Timeframe Selection */}
          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-medium text-slate-300 self-center mr-2">Timeframe:</span>
            {timeframes.map(timeframe => (
              <button
                key={timeframe}
                onClick={() => setSelectedTimeframe(timeframe)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-all duration-200 ${
                  selectedTimeframe === timeframe
                    ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50'
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 border border-slate-600/30'
                }`}
              >
                {timeframe}
              </button>
            ))}
          </div>

          {/* Add Symbol */}
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Add symbol (e.g., AAPL)"
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
              onKeyPress={(e) => e.key === 'Enter' && addToWatchlist()}
              className="flex-1 px-4 py-2 bg-slate-700/50 border border-slate-600/30 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
            />
            <button
              onClick={addToWatchlist}
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-200 font-medium"
            >
              Add
            </button>
          </div>
        </div>

        {/* Market Data Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayMarketData.length > 0 ? (
            displayMarketData.map((quote, index) => (
              <div key={quote.symbol || index} className="bg-slate-700/30 border border-slate-600/30 rounded-xl p-5 hover:bg-slate-700/50 transition-all duration-200 hover:border-slate-500/50">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">{quote.symbol}</h3>
                    {quote.companyName && (
                      <p className="text-sm text-slate-400 truncate">{quote.companyName}</p>
                    )}
                  </div>
                  <button
                    onClick={() => removeFromWatchlist(quote.symbol)}
                    className="text-slate-400 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-500/20"
                    title="Remove from watchlist"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-3">
                  {/* Current Price */}
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold text-white">
                      {formatPrice(quote.currentPrice || quote.price || 0)}
                    </span>
                    <div className={`flex items-center space-x-1 px-2 py-1 rounded-lg ${
                      (quote.changePercent || 0) > 0 ? 'bg-green-500/20 text-green-400' :
                      (quote.changePercent || 0) < 0 ? 'bg-red-500/20 text-red-400' :
                      'bg-slate-500/20 text-slate-400'
                    }`}>
                      <span className="text-sm">{getChangeIcon(quote.changePercent || 0)}</span>
                      <span className="font-medium">
                        {formatPercentage(quote.changePercent || 0)}
                      </span>
                    </div>
                  </div>

                  {/* Price Change */}
                  <div className={`text-sm ${
                    (quote.change || 0) > 0 ? 'text-green-400' :
                    (quote.change || 0) < 0 ? 'text-red-400' :
                    'text-slate-400'
                  }`}>
                    {quote.change >= 0 ? '+' : ''}{formatPrice(quote.change || 0)} today
                  </div>

                  {/* Additional Info */}
                  <div className="grid grid-cols-2 gap-3 text-xs text-slate-400 mt-4 pt-4 border-t border-slate-600/30">
                    {quote.high && (
                      <div className="bg-slate-600/20 rounded-lg p-2">
                        <span className="font-medium text-slate-300">High:</span>
                        <div className="text-white font-semibold">{formatPrice(quote.high)}</div>
                      </div>
                    )}
                    {quote.low && (
                      <div className="bg-slate-600/20 rounded-lg p-2">
                        <span className="font-medium text-slate-300">Low:</span>
                        <div className="text-white font-semibold">{formatPrice(quote.low)}</div>
                      </div>
                    )}
                    {quote.volume && (
                      <div className="bg-slate-600/20 rounded-lg p-2">
                        <span className="font-medium text-slate-300">Volume:</span>
                        <div className="text-white font-semibold">{formatVolume(quote.volume)}</div>
                      </div>
                    )}
                    {quote.marketCap && (
                      <div className="bg-slate-600/20 rounded-lg p-2">
                        <span className="font-medium text-slate-300">Market Cap:</span>
                        <div className="text-white font-semibold">
                          {new Intl.NumberFormat('en-US', {
                            notation: 'compact',
                            compactDisplay: 'short'
                          }).format(quote.marketCap)}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Trading Status */}
                  {quote.tradingStatus && (
                    <div className="mt-3">
                      <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium ${
                        quote.tradingStatus === 'TRADING' 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : quote.tradingStatus === 'CLOSED'
                          ? 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                          : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      }`}>
                        {quote.tradingStatus}
                      </span>
                    </div>
                  )}

                  {/* Last Update */}
                  {quote.lastUpdate && (
                    <div className="text-xs text-slate-500 mt-3">
                      Last updated: {new Date(quote.lastUpdate).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <div className="text-slate-400 mb-4">
                <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No Market Data</h3>
              <p className="text-slate-400">Add symbols to your watchlist to see market data</p>
            </div>
          )}
        </div>

        {/* Market Summary */}
        {displayMarketData.length > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-600/30">
            <h3 className="text-lg font-semibold text-white mb-4">Market Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-700/30 rounded-xl p-4 text-center border border-slate-600/30">
                <div className="text-sm text-slate-400 mb-1">Gainers</div>
                <div className="text-2xl font-bold text-green-400">
                  {displayMarketData.filter(q => (q.changePercent || 0) > 0).length}
                </div>
              </div>
              <div className="bg-slate-700/30 rounded-xl p-4 text-center border border-slate-600/30">
                <div className="text-sm text-slate-400 mb-1">Losers</div>
                <div className="text-2xl font-bold text-red-400">
                  {displayMarketData.filter(q => (q.changePercent || 0) < 0).length}
                </div>
              </div>
              <div className="bg-slate-700/30 rounded-xl p-4 text-center border border-slate-600/30">
                <div className="text-sm text-slate-400 mb-1">Unchanged</div>
                <div className="text-2xl font-bold text-slate-400">
                  {displayMarketData.filter(q => (q.changePercent || 0) === 0).length}
                </div>
              </div>
              <div className="bg-slate-700/30 rounded-xl p-4 text-center border border-slate-600/30">
                <div className="text-sm text-slate-400 mb-1">Total Volume</div>
                <div className="text-2xl font-bold text-blue-400">
                  {new Intl.NumberFormat('en-US', {
                    notation: 'compact',
                    compactDisplay: 'short'
                  }).format(
                    displayMarketData.reduce((sum, q) => sum + (q.volume || 0), 0)
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* News Plugin */}
        <div className="mt-8">
          <NewsPlugin 
            onNewsUpdate={handleNewsUpdate}
            selectedSymbols={watchlist}
          />
        </div>
      </div>
    </div>
  );
};

export default MarketData;