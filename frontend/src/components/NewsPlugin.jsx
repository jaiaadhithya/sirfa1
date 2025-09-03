import React, { useState, useEffect } from 'react';
import { Globe, Rss, TrendingUp, Clock, ExternalLink, Filter, Search, RefreshCw } from 'lucide-react';

const NewsPlugin = ({ onNewsUpdate, selectedSymbols = [] }) => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedSource, setSelectedSource] = useState('all');
  const [refreshInterval, setRefreshInterval] = useState(300000); // 5 minutes
  const [lastRefresh, setLastRefresh] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // News sources configuration
  const newsSources = [
    {
      id: 'all',
      name: 'All Sources',
      icon: '🌐',
      description: 'Aggregated news from multiple sources'
    },
    {
      id: 'alpha_vantage',
      name: 'Alpha Vantage',
      icon: '📊',
      description: 'Market news and analysis',
      apiKey: import.meta.env.REACT_APP_ALPHA_VANTAGE_API_KEY
    },
    {
      id: 'finnhub',
      name: 'Finnhub',
      icon: '📈',
      description: 'Real-time financial news',
      apiKey: import.meta.env.REACT_APP_FINNHUB_API_KEY
    },
    {
      id: 'newsapi',
      name: 'NewsAPI',
      icon: '📰',
      description: 'General financial news',
      apiKey: import.meta.env.REACT_APP_NEWS_API_KEY
    },
    {
      id: 'polygon',
      name: 'Polygon.io',
      icon: '🔷',
      description: 'Market data and news',
      apiKey: import.meta.env.REACT_APP_POLYGON_API_KEY
    }
  ];

  // Fetch news from Alpha Vantage
  const fetchAlphaVantageNews = async () => {
    const apiKey = newsSources.find(s => s.id === 'alpha_vantage')?.apiKey;
    if (!apiKey || apiKey === 'your_alpha_vantage_key_here') return [];

    try {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&apikey=${apiKey}&limit=50`
      );
      const data = await response.json();
      
      return (data.feed || []).map(article => ({
        id: `av_${article.url}`,
        title: article.title,
        summary: article.summary,
        url: article.url,
        source: 'Alpha Vantage',
        publishedAt: article.time_published,
        sentiment: article.overall_sentiment_label,
        sentimentScore: article.overall_sentiment_score,
        symbols: article.ticker_sentiment?.map(t => t.ticker) || [],
        category: 'market',
        imageUrl: article.banner_image
      }));
    } catch (error) {
      console.error('Error fetching Alpha Vantage news:', error);
      return [];
    }
  };

  // Fetch news from Finnhub
  const fetchFinnhubNews = async () => {
    const apiKey = newsSources.find(s => s.id === 'finnhub')?.apiKey;
    if (!apiKey || apiKey === 'your_finnhub_key_here') return [];

    try {
      const response = await fetch(
        `https://finnhub.io/api/v1/news?category=general&token=${apiKey}`
      );
      const data = await response.json();
      
      return data.map(article => ({
        id: `fh_${article.id}`,
        title: article.headline,
        summary: article.summary,
        url: article.url,
        source: 'Finnhub',
        publishedAt: new Date(article.datetime * 1000).toISOString(),
        category: article.category || 'general',
        imageUrl: article.image,
        symbols: article.related ? [article.related] : []
      }));
    } catch (error) {
      console.error('Error fetching Finnhub news:', error);
      return [];
    }
  };

  // Fetch news from NewsAPI
  const fetchNewsAPI = async () => {
    const apiKey = newsSources.find(s => s.id === 'newsapi')?.apiKey;
    if (!apiKey || apiKey === 'your_news_api_key_here') return [];

    try {
      const query = searchQuery || 'finance OR stock market OR trading';
      const response = await fetch(
        `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&language=en&apiKey=${apiKey}`
      );
      const data = await response.json();
      
      return (data.articles || []).map(article => ({
        id: `na_${article.url}`,
        title: article.title,
        summary: article.description,
        url: article.url,
        source: article.source.name,
        publishedAt: article.publishedAt,
        category: 'general',
        imageUrl: article.urlToImage,
        symbols: []
      }));
    } catch (error) {
      console.error('Error fetching NewsAPI:', error);
      return [];
    }
  };

  // Fetch news from Polygon.io
  const fetchPolygonNews = async () => {
    const apiKey = newsSources.find(s => s.id === 'polygon')?.apiKey;
    if (!apiKey || apiKey === 'your_polygon_key_here') return [];

    try {
      const response = await fetch(
        `https://api.polygon.io/v2/reference/news?apikey=${apiKey}&limit=50`
      );
      const data = await response.json();
      
      return (data.results || []).map(article => ({
        id: `pg_${article.id}`,
        title: article.title,
        summary: article.description,
        url: article.article_url,
        source: 'Polygon.io',
        publishedAt: article.published_utc,
        category: 'market',
        imageUrl: article.image_url,
        symbols: article.tickers || []
      }));
    } catch (error) {
      console.error('Error fetching Polygon news:', error);
      return [];
    }
  };

  // Check if any API keys are configured
  const hasValidApiKeys = () => {
    return newsSources.some(source => {
      if (source.id === 'all') return false;
      const key = source.apiKey;
      return key && !key.includes('your_') && !key.includes('_key_here');
    });
  };

  // Aggregate news from all sources
  const fetchAllNews = async () => {
    setLoading(true);
    setError(null);
    
    // Check if any API keys are configured
    if (!hasValidApiKeys()) {
      setError('No API keys configured. Please add your API keys to the .env file to fetch news.');
      setLoading(false);
      return;
    }
    
    try {
      const newsPromises = [];
      
      if (selectedSource === 'all' || selectedSource === 'alpha_vantage') {
        newsPromises.push(fetchAlphaVantageNews());
      }
      if (selectedSource === 'all' || selectedSource === 'finnhub') {
        newsPromises.push(fetchFinnhubNews());
      }
      if (selectedSource === 'all' || selectedSource === 'newsapi') {
        newsPromises.push(fetchNewsAPI());
      }
      if (selectedSource === 'all' || selectedSource === 'polygon') {
        newsPromises.push(fetchPolygonNews());
      }
      
      const results = await Promise.allSettled(newsPromises);
      const allNews = results
        .filter(result => result.status === 'fulfilled')
        .flatMap(result => result.value)
        .filter(article => article && article.title)
        .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
      
      // Remove duplicates based on title similarity
      const uniqueNews = allNews.filter((article, index, arr) => 
        arr.findIndex(a => 
          a.title.toLowerCase().trim() === article.title.toLowerCase().trim()
        ) === index
      );
      
      setNews(uniqueNews);
      setLastRefresh(new Date());
      
      // Notify parent component
      if (onNewsUpdate) {
        onNewsUpdate(uniqueNews);
      }
      
    } catch (error) {
      console.error('Error fetching news:', error);
      setError('Failed to fetch news. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh news
  useEffect(() => {
    fetchAllNews();
    
    const interval = setInterval(fetchAllNews, refreshInterval);
    return () => clearInterval(interval);
  }, [selectedSource, refreshInterval, searchQuery]);

  // Filter news by selected symbols
  const filteredNews = selectedSymbols.length > 0 
    ? news.filter(article => 
        article.symbols.some(symbol => 
          selectedSymbols.includes(symbol.toUpperCase())
        )
      )
    : news;

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
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

  return (
    <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl border border-blue-500/30">
            <Rss className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-white">News Plugin</h3>
            <p className="text-sm text-slate-400">
              Real-time financial news from multiple sources
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {lastRefresh && (
            <span className="text-xs text-slate-500">
              Last updated: {formatTimeAgo(lastRefresh)}
            </span>
          )}
          <button
            onClick={fetchAllNews}
            disabled={loading}
            className="p-2 bg-slate-700/50 hover:bg-slate-600/50 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 mb-6">
        {/* Source Selection */}
        <div className="flex-1 min-w-48">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            News Source
          </label>
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            {newsSources.map(source => (
              <option key={source.id} value={source.id}>
                {source.icon} {source.name}
              </option>
            ))}
          </select>
        </div>

        {/* Search Query */}
        <div className="flex-1 min-w-48">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Search Keywords
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search news..."
              className="w-full bg-slate-700/50 border border-slate-600 rounded-lg pl-10 pr-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
        </div>

        {/* Refresh Interval */}
        <div className="min-w-32">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Auto Refresh
          </label>
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value={60000}>1 min</option>
            <option value={300000}>5 min</option>
            <option value={600000}>10 min</option>
            <option value={1800000}>30 min</option>
            <option value={3600000}>1 hour</option>
          </select>
        </div>
      </div>

      {/* News Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/30">
          <div className="flex items-center space-x-3">
            <Globe className="h-5 w-5 text-blue-400" />
            <div>
              <p className="text-sm text-slate-400">Total Articles</p>
              <p className="text-xl font-semibold text-white">{news.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/30">
          <div className="flex items-center space-x-3">
            <Filter className="h-5 w-5 text-green-400" />
            <div>
              <p className="text-sm text-slate-400">Filtered</p>
              <p className="text-xl font-semibold text-white">{filteredNews.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/30">
          <div className="flex items-center space-x-3">
            <Clock className="h-5 w-5 text-purple-400" />
            <div>
              <p className="text-sm text-slate-400">Sources Active</p>
              <p className="text-xl font-semibold text-white">
                {selectedSource === 'all' ? newsSources.length - 1 : 1}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 mb-6">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-flex items-center space-x-2 text-slate-400">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span>Fetching latest news...</span>
          </div>
        </div>
      )}

      {/* News List */}
      {!loading && filteredNews.length > 0 && (
        <div className="space-y-4">
          {filteredNews.slice(0, 10).map(article => (
            <div key={article.id} className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/30 hover:border-slate-500/50 transition-colors">
              <div className="flex items-start space-x-4">
                {article.imageUrl && (
                  <img
                    src={article.imageUrl}
                    alt={article.title}
                    className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-white font-medium text-sm leading-tight line-clamp-2">
                      {article.title}
                    </h4>
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 p-1 text-slate-400 hover:text-white transition-colors flex-shrink-0"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                  
                  {article.summary && (
                    <p className="text-slate-400 text-xs mb-3 line-clamp-2">
                      {article.summary}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-3">
                      <span className="text-slate-500">{article.source}</span>
                      <span className="text-slate-500">{formatTimeAgo(article.publishedAt)}</span>
                      {article.sentiment && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          article.sentiment.toLowerCase() === 'positive' 
                            ? 'bg-green-500/20 text-green-400'
                            : article.sentiment.toLowerCase() === 'negative'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-slate-500/20 text-slate-400'
                        }`}>
                          {article.sentiment}
                        </span>
                      )}
                    </div>
                    
                    {article.symbols.length > 0 && (
                      <div className="flex items-center space-x-1">
                        {article.symbols.slice(0, 3).map(symbol => (
                          <span key={symbol} className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-mono">
                            {symbol}
                          </span>
                        ))}
                        {article.symbols.length > 3 && (
                          <span className="text-slate-500 text-xs">+{article.symbols.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No News State */}
      {!loading && filteredNews.length === 0 && (
        <div className="text-center py-8">
          <div className="text-slate-500 mb-4">
            <Rss className="mx-auto h-12 w-12" />
          </div>
          <h4 className="text-lg font-semibold text-white mb-2">No News Found</h4>
          <p className="text-slate-400 text-sm">
            {selectedSymbols.length > 0 
              ? 'No news found for the selected symbols'
              : 'Try adjusting your search criteria or check your API keys'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default NewsPlugin;