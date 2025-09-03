// Currency formatting utility
export const formatCurrency = (value, currency = 'USD', minimumFractionDigits = 2) => {
  if (value === null || value === undefined || isNaN(value)) {
    return '$0.00';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: minimumFractionDigits,
    maximumFractionDigits: minimumFractionDigits
  }).format(value);
};

// Percentage formatting utility
export const formatPercentage = (value, minimumFractionDigits = 2) => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0.00%';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: minimumFractionDigits,
    maximumFractionDigits: minimumFractionDigits
  }).format(value / 100);
};

// Number formatting utility
export const formatNumber = (value, minimumFractionDigits = 0, maximumFractionDigits = 2) => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: minimumFractionDigits,
    maximumFractionDigits: maximumFractionDigits
  }).format(value);
};

// Large number formatting (K, M, B)
export const formatLargeNumber = (value) => {
  if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
    return '0';
  }

  // Convert to number and handle edge cases
  let numValue = Number(value);
  if (!isFinite(numValue) || isNaN(numValue)) {
    return '0';
  }

  const absValue = Math.abs(numValue);
  const sign = numValue < 0 ? '-' : '';

  // Handle extremely large numbers with better precision
  if (absValue >= 1e15) {
    // For numbers too large, just show as "999T+"
    return sign + '999T+';
  } else if (absValue >= 1e12) {
    const result = absValue / 1e12;
    return sign + (result >= 100 ? result.toFixed(0) : result.toFixed(1)) + 'T';
  } else if (absValue >= 1e9) {
    const result = absValue / 1e9;
    return sign + (result >= 100 ? result.toFixed(0) : result.toFixed(1)) + 'B';
  } else if (absValue >= 1e6) {
    const result = absValue / 1e6;
    return sign + (result >= 100 ? result.toFixed(0) : result.toFixed(1)) + 'M';
  } else if (absValue >= 1e3) {
    const result = absValue / 1e3;
    return sign + (result >= 100 ? result.toFixed(0) : result.toFixed(1)) + 'K';
  }
  
  return sign + Math.round(absValue).toString();
};

// Date formatting utility
export const formatDate = (date, options = {}) => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  };
  
  return dateObj.toLocaleDateString('en-US', { ...defaultOptions, ...options });
};

// Time formatting utility
export const formatTime = (date, options = {}) => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const defaultOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  };
  
  return dateObj.toLocaleTimeString('en-US', { ...defaultOptions, ...options });
};

// DateTime formatting utility
export const formatDateTime = (date, options = {}) => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  };
  
  return dateObj.toLocaleString('en-US', { ...defaultOptions, ...options });
};

// Relative time formatting (e.g., "2 hours ago")
export const formatRelativeTime = (date) => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now - dateObj) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else {
    return formatDate(dateObj);
  }
};

// Market cap formatting
export const formatMarketCap = (value) => {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }
  
  return formatLargeNumber(value);
};

// Volume formatting
export const formatVolume = (value) => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }
  
  return formatLargeNumber(value);
};

// Price change formatting with color indication
export const formatPriceChange = (change, changePercent) => {
  const formattedChange = formatCurrency(Math.abs(change));
  const formattedPercent = formatPercentage(Math.abs(changePercent));
  const sign = change >= 0 ? '+' : '-';
  
  return {
    text: `${sign}${formattedChange} (${sign}${formattedPercent})`,
    isPositive: change >= 0,
    className: change >= 0 ? 'text-green-600' : 'text-red-600'
  };
};

// Truncate text utility
export const truncateText = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength).trim() + '...';
};

// Format financial ratio
export const formatRatio = (value, decimals = 2) => {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }
  
  return parseFloat(value).toFixed(decimals);
};