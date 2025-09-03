const express = require('express');
const axios = require('axios');
const yahooFinance = require('yahoo-finance2').default;
const router = express.Router();

// Cache for news data (in production, use Redis)
let newsCache = {
  data: null,
  timestamp: null,
  ttl: 5 * 60 * 1000 // 5 minutes
};

// Sentiment analysis helper (simplified)
const analyzeSentiment = (title, summary) => {
  const positiveWords = ['surge', 'gains', 'beats', 'record', 'growth', 'up', 'rise', 'bullish', 'strong'];
  const negativeWords = ['falls', 'drops', 'decline', 'loss', 'down', 'bearish', 'weak', 'concerns', 'delays'];
  
  const text = (title + ' ' + summary).toLowerCase();
  
  const positiveCount = positiveWords.filter(word => text.includes(word)).length;
  const negativeCount = negativeWords.filter(word => text.includes(word)).length;
  
  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
};

// Impact level helper
const determineImpact = (title, summary) => {
  const highImpactWords = ['federal reserve', 'fed', 'earnings', 'gdp', 'inflation', 'rate cut', 'rate hike'];
  const text = (title + ' ' + summary).toLowerCase();
  
  if (highImpactWords.some(word => text.includes(word))) return 'high';
  return Math.random() > 0.5 ? 'medium' : 'low';
};

// Get market news from Yahoo Finance
router.get('/', async (req, res) => {
  try {
    // Check cache first
    if (newsCache.data && newsCache.timestamp && 
        (Date.now() - newsCache.timestamp) < newsCache.ttl) {
      return res.json(newsCache.data);
    }

    // Fetch news from Yahoo Finance
    const newsData = await yahooFinance.search('market news', {
      newsCount: 20
    });

    // If Yahoo Finance doesn't work, try alternative approach
    let newsItems = [];
    
    if (newsData && newsData.news && newsData.news.length > 0) {
      newsItems = newsData.news.map((item, index) => ({
        id: index + 1,
        title: item.title,
        summary: item.summary || item.title,
        source: item.publisher || 'Yahoo Finance',
        timestamp: item.providerPublishTime ? 
          new Date(item.providerPublishTime * 1000).toLocaleString() : 
          'Recently',
        category: item.type || 'Market News',
        sentiment: analyzeSentiment(item.title, item.summary || ''),
        impact: determineImpact(item.title, item.summary || ''),
        relevantTickers: item.relatedTickers || [],
        url: item.link
      }));
    } else {
      // Fallback: Fetch general financial news using alternative method
      const fallbackNews = await fetchFallbackNews();
      newsItems = fallbackNews;
    }

    // Cache the results
    newsCache = {
      data: newsItems,
      timestamp: Date.now(),
      ttl: 5 * 60 * 1000
    };

    res.json(newsItems);
  } catch (error) {
    console.error('Error fetching news:', error);
    
    // Return fallback news if API fails
    try {
      const fallbackNews = await fetchFallbackNews();
      res.json(fallbackNews);
    } catch (fallbackError) {
      console.error('Fallback news also failed:', fallbackError);
      res.status(500).json({ error: 'Failed to fetch news data' });
    }
  }
});

// Fallback news fetcher using RapidAPI or other sources
const fetchFallbackNews = async () => {
  try {
    // Try RapidAPI Yahoo Finance endpoint
    if (process.env.YAHOO_FINANCE_API_KEY) {
      const response = await axios.get('https://yahoo-finance15.p.rapidapi.com/api/yahoo/ne/news', {
        headers: {
          'X-RapidAPI-Key': process.env.YAHOO_FINANCE_API_KEY,
          'X-RapidAPI-Host': process.env.YAHOO_FINANCE_HOST || 'yahoo-finance15.p.rapidapi.com'
        },
        params: {
          symbols: 'AAPL,MSFT,GOOGL,AMZN,TSLA'
        }
      });
      
      if (response.data && response.data.body) {
        return response.data.body.map((item, index) => ({
          id: index + 1,
          title: item.title,
          summary: item.summary || item.title.substring(0, 150) + '...',
          source: item.publisher || 'Financial News',
          timestamp: new Date(item.publishedAt || Date.now()).toLocaleString(),
          category: 'Market News',
          sentiment: analyzeSentiment(item.title, item.summary || ''),
          impact: determineImpact(item.title, item.summary || ''),
          relevantTickers: [],
          url: item.url
        }));
      }
    }
    
    // If all else fails, return some sample news with current timestamp
    return generateSampleNews();
  } catch (error) {
    console.error('Fallback news fetch failed:', error);
    return generateSampleNews();
  }
};

// Generate sample news as last resort
const generateSampleNews = () => {
  const sampleNews = [
    {
      title: "Market Update: Major Indices Show Mixed Performance",
      summary: "Stock markets display varied performance as investors weigh economic indicators and corporate earnings reports.",
      category: "Market Update",
      relevantTickers: ["SPY", "QQQ", "DIA"]
    },
    {
      title: "Tech Sector Leads Market Gains Amid AI Optimism",
      summary: "Technology stocks surge as artificial intelligence developments continue to drive investor enthusiasm.",
      category: "Technology",
      relevantTickers: ["AAPL", "MSFT", "GOOGL"]
    },
    {
      title: "Federal Reserve Policy Decision Awaited by Markets",
      summary: "Investors closely monitor Federal Reserve communications for signals about future monetary policy direction.",
      category: "Monetary Policy",
      relevantTickers: ["TLT", "SPY", "GLD"]
    }
  ];
  
  return sampleNews.map((item, index) => ({
    id: index + 1,
    title: item.title,
    summary: item.summary,
    source: "Market Wire",
    timestamp: new Date(Date.now() - Math.random() * 3600000).toLocaleString(),
    category: item.category,
    sentiment: analyzeSentiment(item.title, item.summary),
    impact: determineImpact(item.title, item.summary),
    relevantTickers: item.relevantTickers,
    url: "#"
  }));
};

// Get news for specific symbol
router.get('/symbol/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    
    // Try to get news for specific symbol
    const newsData = await yahooFinance.search(symbol, {
      newsCount: 10
    });
    
    let newsItems = [];
    
    if (newsData && newsData.news && newsData.news.length > 0) {
      newsItems = newsData.news.map((item, index) => ({
        id: index + 1,
        title: item.title,
        summary: item.summary || item.title,
        source: item.publisher || 'Yahoo Finance',
        timestamp: item.providerPublishTime ? 
          new Date(item.providerPublishTime * 1000).toLocaleString() : 
          'Recently',
        category: 'Company News',
        sentiment: analyzeSentiment(item.title, item.summary || ''),
        impact: determineImpact(item.title, item.summary || ''),
        relevantTickers: [symbol],
        url: item.link
      }));
    }
    
    res.json(newsItems);
  } catch (error) {
    console.error(`Error fetching news for ${req.params.symbol}:`, error);
    res.status(500).json({ error: 'Failed to fetch symbol-specific news' });
  }
});

module.exports = router;