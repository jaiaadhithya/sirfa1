import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Chart = ({ 
  type = 'line', 
  data, 
  options = {}, 
  height = 400,
  className = '',
  loading = false,
  error = null,
  onClick = null
}) => {
  // Default chart options
  const defaultOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
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
        cornerRadius: 8,
        displayColors: true,
        intersect: false,
        mode: 'index'
      }
    },
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
  }), []);

  // Merge default options with provided options
  const chartOptions = useMemo(() => ({
    ...defaultOptions,
    ...options,
    plugins: {
      ...defaultOptions.plugins,
      ...options.plugins
    },
    scales: {
      ...defaultOptions.scales,
      ...options.scales
    },
    // Add click handler if provided
    ...(onClick && {
      onClick: (event, elements) => {
        if (elements.length > 0) {
          const element = elements[0];
          const datasetIndex = element.datasetIndex;
          const index = element.index;
          const dataset = data.datasets[datasetIndex];
          const value = dataset.data[index];
          const label = data.labels ? data.labels[index] : index;
          
          onClick({
            datasetIndex,
            index,
            value,
            label,
            dataset: dataset.label,
            event
          });
        }
      }
    })
  }), [defaultOptions, options, onClick, data]);

  // Loading state
  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-white rounded-lg shadow-sm border border-gray-200 ${className}`} style={{ height }}>
        <div className="flex flex-col items-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-sm text-gray-500">Loading chart data...</p>
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
            <p className="text-sm font-medium text-red-800">Failed to load chart</p>
            <p className="text-xs text-red-600 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // No data state
  if (!data || !data.datasets || data.datasets.length === 0) {
    return (
      <div className={`flex items-center justify-center bg-white rounded-lg shadow-sm border border-gray-200 ${className}`} style={{ height }}>
        <div className="flex flex-col items-center space-y-3">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-sm text-gray-500">No chart data available</p>
        </div>
      </div>
    );
  }

  // Render chart
  const ChartComponent = type === 'bar' ? Bar : Line;

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${className}`}>
      <div style={{ height }}>
        <ChartComponent data={data} options={chartOptions} />
      </div>
    </div>
  );
};

export default Chart;