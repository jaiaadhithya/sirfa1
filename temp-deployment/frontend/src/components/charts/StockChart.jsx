import React, { useState, useEffect, useMemo } from 'react';
import Chart from './Chart';
import { formatCurrency, formatPercentage, formatVolume } from '../../utils/formatters';
import { chartService } from '../../services/chartService';

const StockChart = ({ 
  symbol, 
  data, 
  loading: externalLoading = false, 
  error: externalError = null,
  height = 400,
  showVolume = false,
  className = '',
  onChartClick = null
}) => {
  const [timeRange, setTimeRange] = useState('1D');
  const [chartType, setChartType] = useState('line');
  const [internalData, setInternalData] = useState(null);
  const [internalLoading, setInternalLoading] = useState(false);
  const [internalError, setInternalError] = useState(null);

  // Use external data if provided, otherwise fetch internal data
  const chartData = data || internalData;
  const loading = externalLoading || internalLoading;
  const error = externalError || internalError;

  // Fetch chart data when symbol or timeRange changes
  useEffect(() => {
    if (!symbol || data) return; // Don't fetch if data is already provided

    const fetchChartData = async () => {
      try {
        setInternalLoading(true);
        setInternalError(null);
        
        // Map timeRange to API parameters
        const intervalMap = {
          '1D': { endpoint: 'intraday', interval: '5min' },
          '1W': { endpoint: 'daily', interval: 'daily' },
          '1M': { endpoint: 'daily', interval: 'daily' },
          '3M': { endpoint: 'daily', interval: 'daily' },
          '6M': { endpoint: 'daily', interval: 'daily' },
          '1Y': { endpoint: 'daily', interval: 'daily' }
        };
        
        const { endpoint, interval } = intervalMap[timeRange] || intervalMap['1D'];
        
        let response;
        if (endpoint === 'intraday') {
          response = await chartService.getIntradayData(symbol, interval);
        } else {
          response = await chartService.getDailyData(symbol);
        }
        
        setInternalData(response);
      } catch (err) {
        console.error('Error fetching chart data:', err);
        setInternalError(err.message || 'Failed to fetch chart data');
      } finally {
        setInternalLoading(false);
      }
    };

    fetchChartData();
  }, [symbol, timeRange, data]);

  // Time range options
  const timeRanges = [
    { value: '1D', label: '1D' },
    { value: '1W', label: '1W' },
    { value: '1M', label: '1M' },
    { value: '3M', label: '3M' },
    { value: '6M', label: '6M' },
    { value: '1Y', label: '1Y' }
  ];

  // Chart type options
  const chartTypes = [
    { value: 'line', label: 'Line', icon: '📈' },
    { value: 'area', label: 'Area', icon: '📊' },
    { value: 'candlestick', label: 'Candles', icon: '🕯️' }
  ];

  // Process chart data based on type
  const processedChartData = useMemo(() => {
    if (!chartData || !chartData.data || chartData.data.length === 0) {
      return null;
    }

    const prices = chartData.data;
    const labels = prices.map(item => {
      const date = new Date(item.timestamp || item.date);
      if (timeRange === '1D') {
        return date.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        });
      }
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    });

    // Calculate price change for color
    const firstPrice = prices[0]?.close || prices[0]?.price || 0;
    const lastPrice = prices[prices.length - 1]?.close || prices[prices.length - 1]?.price || 0;
    const isPositive = lastPrice >= firstPrice;
    const changeColor = isPositive ? '#10B981' : '#EF4444';
    const fillColor = isPositive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';

    if (chartType === 'candlestick') {
      // For candlestick, we'll use a line chart with high/low ranges
      return {
        labels,
        datasets: [
          {
            label: 'High',
            data: prices.map(item => item.high),
            borderColor: 'rgba(156, 163, 175, 0.5)',
            backgroundColor: 'transparent',
            borderWidth: 1,
            pointRadius: 0,
            fill: false
          },
          {
            label: 'Low',
            data: prices.map(item => item.low),
            borderColor: 'rgba(156, 163, 175, 0.5)',
            backgroundColor: 'transparent',
            borderWidth: 1,
            pointRadius: 0,
            fill: false
          },
          {
            label: 'Close',
            data: prices.map(item => item.close || item.price),
            borderColor: changeColor,
            backgroundColor: changeColor,
            borderWidth: 2,
            pointRadius: 0,
            fill: false
          }
        ]
      };
    }

    // Line or area chart
    return {
      labels,
      datasets: [
        {
          label: `${symbol} Price`,
          data: prices.map(item => item.close || item.price),
          borderColor: changeColor,
          backgroundColor: chartType === 'area' ? fillColor : 'transparent',
          borderWidth: 2,
          pointRadius: 0,
          fill: chartType === 'area',
          tension: 0.1
        }
      ]
    };
  }, [chartData, symbol, timeRange, chartType]);

  // Chart options
  const chartOptions = useMemo(() => ({
    plugins: {
      legend: {
        display: chartType === 'candlestick'
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const value = context.parsed.y;
            if (chartType === 'candlestick') {
              return `${context.dataset.label}: ${formatCurrency(value)}`;
            }
            return `Price: ${formatCurrency(value)}`;
          }
        }
      }
    },
    scales: {
      y: {
        ticks: {
          callback: function(value) {
            return formatCurrency(value);
          }
        }
      }
    }
  }), [chartType]);

  // Calculate price statistics
  const priceStats = useMemo(() => {
    if (!chartData || !chartData.data || chartData.data.length === 0) {
      return null;
    }

    const prices = chartData.data;
    const currentPrice = prices[prices.length - 1]?.close || prices[prices.length - 1]?.price || 0;
    const previousPrice = prices[0]?.close || prices[0]?.price || 0;
    const change = currentPrice - previousPrice;
    const changePercent = previousPrice !== 0 ? (change / previousPrice) * 100 : 0;
    
    const high = Math.max(...prices.map(p => p.high || p.price || 0));
    const low = Math.min(...prices.map(p => p.low || p.price || 0));
    const volume = prices.reduce((sum, p) => sum + (p.volume || 0), 0);

    return {
      currentPrice,
      change,
      changePercent,
      high,
      low,
      volume,
      isPositive: change >= 0
    };
  }, [chartData]);

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold text-gray-900">{symbol}</h3>
            {priceStats && (
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-bold text-gray-900">
                  {formatCurrency(priceStats.currentPrice)}
                </span>
                <span className={`text-sm font-medium ${
                  priceStats.isPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {priceStats.isPositive ? '+' : ''}{formatCurrency(priceStats.change)} 
                  ({priceStats.isPositive ? '+' : ''}{formatPercentage(priceStats.changePercent)})
                </span>
              </div>
            )}
          </div>
          
          {/* Chart Type Selector */}
          <div className="flex items-center space-x-2">
            {chartTypes.map(type => (
              <button
                key={type.value}
                onClick={() => setChartType(type.value)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  chartType === type.value
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
                }`}
                title={type.label}
              >
                <span className="mr-1">{type.icon}</span>
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center space-x-1">
          {timeRanges.map(range => (
            <button
              key={range.value}
              onClick={() => setTimeRange(range.value)}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                timeRange === range.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>

        {/* Price Statistics */}
        {priceStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-100">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">High</p>
              <p className="text-sm font-semibold text-gray-900">{formatCurrency(priceStats.high)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Low</p>
              <p className="text-sm font-semibold text-gray-900">{formatCurrency(priceStats.low)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Volume</p>
              <p className="text-sm font-semibold text-gray-900">
                {formatVolume(priceStats.volume)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Range</p>
              <p className="text-sm font-semibold text-gray-900">
                {formatCurrency(priceStats.high - priceStats.low)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="p-4">
        <Chart
          type="line"
          data={processedChartData}
          options={chartOptions}
          height={height}
          loading={loading}
          error={error}
          onClick={onChartClick}
        />
      </div>
    </div>
  );
};

export default StockChart;