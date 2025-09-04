const express = require('express');
const axios = require('axios');
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

// Get market news from The News API
router.get('/', async (req, res) => {
  try {
    // Check cache first
    if (newsCache.data && newsCache.timestamp && 
        (Date.now() - newsCache.timestamp) < newsCache.ttl) {
      return res.json(newsCache.data);
    }

    // Fetch news from The News API
    const newsItems = await fetchTheNewsAPI();

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
      const fallbackNews = await generateSampleNews();
      res.json(fallbackNews);
    } catch (fallbackError) {
      console.error('Fallback news also failed:', fallbackError);
      res.status(500).json({ error: 'Failed to fetch news data' });
    }
  }
});

// Fetch news from The News API
const fetchTheNewsAPI = async () => {
  try {
    const apiKey = process.env.THE_NEWS_API_KEY;
    if (!apiKey) {
      console.warn('THE_NEWS_API_KEY not configured, using sample news');
      return generateSampleNews();
    }

    // Fetch financial headlines from The News API
    const response = await axios.get('https://api.thenewsapi.com/v1/news/headlines', {
      params: {
        api_token: apiKey,
        language: 'en',
        locale: 'us',
        headlines_per_category: 10,
        include_similar: false
      },
      timeout: 10000
    });

    if (response.data && response.data.data) {
      // Transform The News API data to our format
      const newsItems = [];
      
      // Process each category
      Object.keys(response.data.data).forEach(category => {
        const articles = response.data.data[category];
        if (Array.isArray(articles)) {
          articles.forEach((article, index) => {
            // Filter for finance-related content
            const isFinanceRelated = isFinancialNews(article.title, article.description);
            
            if (isFinanceRelated) {
              newsItems.push({
                id: article.uuid || `${category}_${index}`,
                title: article.title,
                summary: article.description || article.snippet || article.title.substring(0, 150) + '...',
                source: article.source || 'The News API',
                timestamp: formatTimestamp(article.published_at),
                category: mapCategory(category),
                sentiment: analyzeSentiment(article.title, article.description || ''),
                impact: determineImpact(article.title, article.description || ''),
                relevantTickers: extractTickers(article.title, article.description || ''),
                url: article.url
              });
            }
          });
        }
      });

      // If no finance-related news found, fetch general business news
      if (newsItems.length === 0) {
        return await fetchGeneralBusinessNews(apiKey);
      }

      // Sort by timestamp (newest first) and limit to 20 items
      return newsItems
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 20);
    }
    
    return generateSampleNews();
  } catch (error) {
    console.error('Error fetching from The News API:', error.message);
    return generateSampleNews();
  }
};

// Fetch general business news if no finance-specific news found
const fetchGeneralBusinessNews = async (apiKey) => {
  try {
    const response = await axios.get('https://api.thenewsapi.com/v1/news/all', {
      params: {
        api_token: apiKey,
        language: 'en',
        search: 'finance OR stock OR market OR trading OR economy',
        limit: 20
      },
      timeout: 10000
    });

    if (response.data && response.data.data) {
      return response.data.data.map((article, index) => ({
        id: article.uuid || `business_${index}`,
        title: article.title,
        summary: article.description || article.snippet || article.title.substring(0, 150) + '...',
        source: article.source || 'The News API',
        timestamp: formatTimestamp(article.published_at),
        category: 'Business',
        sentiment: analyzeSentiment(article.title, article.description || ''),
        impact: determineImpact(article.title, article.description || ''),
        relevantTickers: extractTickers(article.title, article.description || ''),
        url: article.url
      }));
    }
    
    return generateSampleNews();
  } catch (error) {
    console.error('Error fetching general business news:', error.message);
    return generateSampleNews();
  }
};

// Helper function to check if news is finance-related
const isFinancialNews = (title, description) => {
  const financeKeywords = [
    'stock', 'market', 'trading', 'finance', 'economy', 'investment', 'earnings',
    'revenue', 'profit', 'loss', 'nasdaq', 'dow', 's&p', 'fed', 'federal reserve',
    'inflation', 'gdp', 'unemployment', 'interest rate', 'bond', 'commodity',
    'crypto', 'bitcoin', 'ethereum', 'ipo', 'merger', 'acquisition', 'dividend'
  ];
  
  const text = (title + ' ' + (description || '')).toLowerCase();
  return financeKeywords.some(keyword => text.includes(keyword));
};

// Helper function to map categories
const mapCategory = (category) => {
  const categoryMap = {
    'business': 'Business',
    'finance': 'Finance',
    'technology': 'Technology',
    'general': 'Market News',
    'science': 'Technology',
    'politics': 'Politics'
  };
  
  return categoryMap[category.toLowerCase()] || 'Market News';
};

// Helper function to format timestamp
const formatTimestamp = (timestamp) => {
  if (!timestamp) return new Date().toLocaleString();
  
  try {
    return new Date(timestamp).toLocaleString();
  } catch (error) {
    return new Date().toLocaleString();
  }
};

// Helper function to extract stock tickers from text
const extractTickers = (title, description) => {
  const text = (title + ' ' + description).toUpperCase();
  const tickerPattern = /\b[A-Z]{1,5}\b/g;
  const commonTickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'SPY', 'QQQ'];
  
  const matches = text.match(tickerPattern) || [];
  return matches.filter(ticker => 
    commonTickers.includes(ticker) || 
    (ticker.length >= 2 && ticker.length <= 5)
  ).slice(0, 3); // Limit to 3 tickers
};

// Generate sample news as last resort
const generateSampleNews = () => {
  const sampleNews = [
    {
      title: "August Gains Tempered by Technology Weakness and Policy Uncertainty",
      summary: "Market analysis reveals mixed performance in August as technology sector weakness and policy uncertainty offset earlier gains, creating volatility in major indices.",
      category: "Market Analysis",
      relevantTickers: ["SPY", "QQQ", "AAPL", "MSFT", "GOOGL"],
      url: "https://moneybase.com/blog/news/august-gains-tempered-by-technology-weakness-and-policy-uncertainty"
    }
  ];
  
  return sampleNews.map((item, index) => ({
    id: index + 1,
    title: item.title,
    summary: item.summary,
    source: item.url ? "Moneybase" : "Market Wire",
    timestamp: new Date(Date.now() - Math.random() * 3600000).toLocaleString(),
    category: item.category,
    sentiment: analyzeSentiment(item.title, item.summary),
    impact: determineImpact(item.title, item.summary),
    relevantTickers: item.relevantTickers,
    url: item.url || "#"
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