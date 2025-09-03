import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Pie, Doughnut, Line } from 'react-chartjs-2';
import { formatCurrency, formatPercentage, formatPriceChange } from '../../utils/formatters';

// Register Chart.js components
ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const PortfolioChart = ({ 
  type = 'allocation', // 'allocation', 'performance', 'pie', 'doughnut'
  data, 
  loading = false, 
  error = null,
  height = 400,
  className = '',
  onChartClick = null
}) => {
  // Color palette for charts
  const colors = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Yellow
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#06B6D4', // Cyan
    '#F97316', // Orange
    '#84CC16', // Lime
    '#EC4899', // Pink
    '#6B7280'  // Gray
  ];

  // Process data based on chart type
  const chartData = useMemo(() => {
    if (!data) return null;

    switch (type) {
      case 'allocation':
      case 'pie':
      case 'doughnut':
        // Portfolio allocation data
        if (!data.holdings || data.holdings.length === 0) return null;
        
        return {
          labels: data.holdings.map(holding => holding.symbol || holding.name),
          datasets: [{
            data: data.holdings.map(holding => holding.marketValue || holding.value || 0),
            backgroundColor: colors.slice(0, data.holdings.length),
            borderColor: colors.slice(0, data.holdings.length).map(color => color + '80'),
            borderWidth: 2,
            hoverBackgroundColor: colors.slice(0, data.holdings.length).map(color => color + 'CC'),
            hoverBorderWidth: 3
          }]
        };

      case 'performance':
        // Portfolio performance over time
        if (!data.performance || data.performance.length === 0) return null;
        
        const performanceData = data.performance;
        const totalValue = performanceData.map(p => p.totalValue || 0);
        const isPositive = totalValue[totalValue.length - 1] >= totalValue[0];
        
        return {
          labels: performanceData.map(p => {
            const date = new Date(p.date || p.timestamp);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          }),
          datasets: [
            {
              label: 'Portfolio Value',
              data: totalValue,
              borderColor: isPositive ? '#10B981' : '#EF4444',
              backgroundColor: isPositive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              borderWidth: 2,
              pointRadius: 0,
              pointHoverRadius: 6,
              fill: true,
              tension: 0.1
            },
            {
              label: 'Cash',
              data: performanceData.map(p => p.cash || 0),
              borderColor: '#6B7280',
              backgroundColor: 'rgba(107, 114, 128, 0.1)',
              borderWidth: 1,
              pointRadius: 0,
              fill: false,
              tension: 0.1
            }
          ]
        };

      default:
        return null;
    }
  }, [data, type, colors]);

  // Chart options based on type
  const chartOptions = useMemo(() => {
    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            usePointStyle: true,
            padding: 20,
            font: {
              size: 12,
              family: 'Inter, sans-serif'
            }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: '#374151',
          borderWidth: 1,
          cornerRadius: 8
        }
      }
    };

    if (type === 'allocation' || type === 'pie' || type === 'doughnut') {
      return {
        ...baseOptions,
        plugins: {
          ...baseOptions.plugins,
          tooltip: {
            ...baseOptions.plugins.tooltip,
            callbacks: {
              label: function(context) {
                const value = context.parsed;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return `${context.label}: ${formatCurrency(value)} (${percentage}%)`;
              }
            }
          }
        }
      };
    }

    if (type === 'performance') {
      return {
        ...baseOptions,
        scales: {
          x: {
            grid: {
              color: 'rgba(156, 163, 175, 0.1)',
              drawBorder: false
            },
            ticks: {
              color: '#6B7280',
              font: {
                size: 11,
                family: 'Inter, sans-serif'
              }
            }
          },
          y: {
            grid: {
              color: 'rgba(156, 163, 175, 0.1)',
              drawBorder: false
            },
            ticks: {
              color: '#6B7280',
              font: {
                size: 11,
                family: 'Inter, sans-serif'
              },
              callback: function(value) {
                return formatCurrency(value);
              }
            }
          }
        },
        plugins: {
          ...baseOptions.plugins,
          tooltip: {
            ...baseOptions.plugins.tooltip,
            callbacks: {
              label: function(context) {
                return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
              }
            }
          }
        },
        elements: {
          point: {
            radius: 0,
            hoverRadius: 6,
            hitRadius: 10
          },
          line: {
            tension: 0.1,
            borderWidth: 2
          }
        },
        interaction: {
          intersect: false,
          mode: 'index'
        }
      };
    }

    return baseOptions;
  }, [type]);

  // Calculate portfolio statistics
  const portfolioStats = useMemo(() => {
    if (!data) return null;

    if (type === 'allocation' && data.holdings) {
      const totalValue = data.holdings.reduce((sum, holding) => sum + (holding.marketValue || holding.value || 0), 0);
      const topHolding = data.holdings.reduce((max, holding) => 
        (holding.marketValue || holding.value || 0) > (max.marketValue || max.value || 0) ? holding : max
      , data.holdings[0]);
      
      return {
        totalValue,
        holdingsCount: data.holdings.length,
        topHolding: {
          symbol: topHolding.symbol || topHolding.name,
          value: topHolding.marketValue || topHolding.value || 0,
          percentage: totalValue > 0 ? ((topHolding.marketValue || topHolding.value || 0) / totalValue * 100) : 0
        }
      };
    }

    if (type === 'performance' && data.performance && data.performance.length > 0) {
      const performance = data.performance;
      const currentValue = performance[performance.length - 1]?.totalValue || 0;
      const previousValue = performance[0]?.totalValue || 0;
      const change = currentValue - previousValue;
      const changePercent = previousValue !== 0 ? (change / previousValue) * 100 : 0;
      
      return {
        currentValue,
        change,
        changePercent,
        isPositive: change >= 0
      };
    }

    return null;
  }, [data, type]);

  // Loading state
  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-white rounded-lg shadow-sm border border-gray-200 ${className}`} style={{ height }}>
        <div className="flex flex-col items-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-sm text-gray-500">Loading portfolio data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`flex items-center justify-center bg-white rounded-lg shadow-sm border border-red-200 ${className}`} style={{ height }}>
        <div className="flex flex-col items-center space-y-3 text-center px-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-red-800">Failed to load portfolio data</p>
            <p className="text-xs text-red-600 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // No data state
  if (!chartData) {
    return (
      <div className={`flex items-center justify-center bg-white rounded-lg shadow-sm border border-gray-200 ${className}`} style={{ height }}>
        <div className="flex flex-col items-center space-y-3">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-sm text-gray-500">No portfolio data available</p>
        </div>
      </div>
    );
  }

  // Select chart component
  const getChartComponent = () => {
    switch (type) {
      case 'pie':
        return Pie;
      case 'doughnut':
      case 'allocation':
        return Doughnut;
      case 'performance':
      default:
        return Line;
    }
  };

  const ChartComponent = getChartComponent();

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header with stats */}
      {portfolioStats && (
        <div className="p-4 border-b border-gray-200">
          {type === 'allocation' && (
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Portfolio Allocation</h3>
                <p className="text-sm text-gray-500">{portfolioStats.holdingsCount} holdings</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(portfolioStats.totalValue)}
                </p>
                <p className="text-sm text-gray-500">
                  Top: {portfolioStats.topHolding.symbol} ({formatPercentage(portfolioStats.topHolding.percentage)})
                </p>
              </div>
            </div>
          )}
          
          {type === 'performance' && (
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Portfolio Performance</h3>
                <p className="text-sm text-gray-500">Total value over time</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(portfolioStats.currentValue)}
                </p>
                <p className={`text-sm font-medium ${
                  portfolioStats.isPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatPriceChange(portfolioStats.change, portfolioStats.changePercent).text}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Chart */}
      <div className="p-4">
        <div style={{ height }}>
          <ChartComponent 
            data={chartData} 
            options={{
              ...chartOptions,
              ...(onChartClick && {
                onClick: (event, elements) => {
                  if (elements.length > 0) {
                    const element = elements[0];
                    const datasetIndex = element.datasetIndex;
                    const index = element.index;
                    const dataset = chartData.datasets[datasetIndex];
                    const value = dataset.data[index];
                    const label = chartData.labels ? chartData.labels[index] : index;
                    
                    onChartClick({
                      datasetIndex,
                      index,
                      value,
                      label,
                      dataset: dataset.label,
                      event,
                      chartType: type
                    });
                  }
                }
              })
            }} 
          />
        </div>
      </div>
    </div>
  );
};

export default PortfolioChart;