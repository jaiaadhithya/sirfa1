// SIRFA Agent Finance - News Feed Component
// Real-time news updates with WebSocket integration

import React, { useState, useEffect } from 'react';
import { useNewsUpdates, useWebSocket } from '../hooks/useWebSocket';

const NewsFeed = () => {
  const [localNews, setLocalNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { isConnected } = useWebSocket();
  const { newsData, lastUpdate } = useNewsUpdates((data) => {
    console.log('News update received:', data);
  });

  // Fetch initial news data
  useEffect(() => {
    const fetchInitialNews = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/news');
        if (!response.ok) {
          throw new Error('Failed to fetch news data');
        }
        const data = await response.json();
        setLocalNews(data.articles || []);
        setError(null);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching news:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialNews();
  }, []);

  // Use WebSocket data if available, otherwise use local data
  const displayNews = newsData.length > 0 ? newsData : localNews;

  // Filter news based on category and search term
  const filteredNews = displayNews.filter(article => {
    const matchesCategory = selectedCategory === 'all' || 
      article.category?.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch = !searchTerm || 
      article.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.summary?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive': return 'text-green-600 bg-green-100';
      case 'negative': return 'text-red-600 bg-red-100';
      case 'neutral': return 'text-gray-600 bg-gray-100';
      default: return 'text-blue-600 bg-blue-100';
    }
  };

  const getSentimentIcon = (sentiment) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive': return '📈';
      case 'negative': return '📉';
      case 'neutral': return '➡️';
      default: return '📰';
    }
  };

  const categories = ['all', 'market', 'earnings', 'economic', 'crypto', 'tech'];

  if (loading) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-700/50 rounded-xl mb-6"></div>
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-slate-700/30 rounded-xl p-6 border border-slate-600/30">
                <div className="h-6 bg-slate-600/50 rounded-lg mb-3"></div>
                <div className="h-4 bg-slate-600/50 rounded-lg w-3/4 mb-3"></div>
                <div className="h-4 bg-slate-600/50 rounded-lg w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
        <div className="text-center">
          <div className="text-red-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Error Loading News</h3>
          <p className="text-slate-400 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl hover:from-red-600 hover:to-pink-700 transition-all duration-200 shadow-lg shadow-red-500/25 font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* News Header */}
      <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-xl border border-orange-500/30">
              <svg className="h-6 w-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">Market News</h3>
              <p className="text-sm text-slate-400">Real-time financial news and market updates</p>
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
            <span>{isConnected ? 'Live Feed' : 'Offline'}</span>
            {lastUpdate && (
              <span className="text-xs text-slate-500 ml-2">
                {lastUpdate.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* News Content */}
      <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">

        {/* Filters */}
        <div className="mb-6 space-y-4">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search news..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  selectedCategory === category
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 border border-slate-600/50'
                }`}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* News Articles */}
        <div className="space-y-6">
          {filteredNews.length > 0 ? (
            filteredNews.map((article, index) => (
              <div key={index} className="bg-slate-700/30 rounded-xl p-6 border border-slate-600/30 hover:border-slate-500/50 transition-all duration-200">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-3 hover:text-blue-400 cursor-pointer transition-colors">
                      {article.url ? (
                        <a href={article.url} target="_blank" rel="noopener noreferrer">
                          {article.title}
                        </a>
                      ) : (
                        article.title
                      )}
                    </h3>
                  
                    {article.summary && (
                      <p className="text-slate-300 mb-4 line-clamp-3 leading-relaxed">
                        {article.summary}
                      </p>
                    )}
                    
                    <div className="flex items-center flex-wrap gap-3 text-sm text-slate-400">
                      <span className="flex items-center space-x-1">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{formatTimestamp(article.publishedAt || article.timestamp)}</span>
                      </span>
                      
                      {article.source && (
                        <span className="font-medium text-slate-300">{article.source}</span>
                      )}
                      
                      {article.category && (
                        <span className="px-3 py-1 bg-slate-600/50 text-slate-300 rounded-full text-xs border border-slate-500/30">
                          {article.category}
                        </span>
                      )}
                      
                      {article.symbols && article.symbols.length > 0 && (
                        <div className="flex space-x-2">
                          {article.symbols.slice(0, 3).map((symbol, idx) => (
                            <span key={idx} className="px-2 py-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-400 rounded-lg text-xs font-medium border border-blue-500/30">
                              {symbol}
                            </span>
                          ))}
                          {article.symbols.length > 3 && (
                            <span className="text-xs text-slate-500">+{article.symbols.length - 3} more</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                
                  {article.sentiment && (
                    <div className="ml-6 flex flex-col items-center">
                      <div className="text-3xl mb-2">
                        {getSentimentIcon(article.sentiment)}
                      </div>
                      <span className={`px-3 py-1 rounded-xl text-xs font-semibold border ${
                        article.sentiment?.toLowerCase() === 'positive' 
                          ? 'bg-green-500/20 text-green-400 border-green-500/30'
                          : article.sentiment?.toLowerCase() === 'negative'
                          ? 'bg-red-500/20 text-red-400 border-red-500/30'
                          : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
                      }`}>
                        {article.sentiment}
                      </span>
                      {article.sentimentScore && (
                        <span className="text-xs text-slate-500 mt-2">
                          {(article.sentimentScore * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  )}
                </div>
              
                {article.imageUrl && (
                  <div className="mt-4">
                    <img 
                      src={article.imageUrl} 
                      alt={article.title}
                      className="w-full h-48 object-cover rounded-xl border border-slate-600/30"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <div className="text-slate-500 mb-4">
                <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                {searchTerm || selectedCategory !== 'all' ? 'No matching news' : 'No news available'}
              </h3>
              <p className="text-slate-400">
                {searchTerm || selectedCategory !== 'all' 
                  ? 'Try adjusting your filters'
                  : 'Market news will appear here'
                }
              </p>
            </div>
          )}
        </div>

        {/* Load More Button */}
        {filteredNews.length > 0 && filteredNews.length >= 20 && (
          <div className="text-center mt-8">
            <button className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-blue-500/25 font-medium">
              Load More News
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewsFeed;