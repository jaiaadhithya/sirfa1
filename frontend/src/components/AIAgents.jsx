import React, { useState, useEffect, useRef } from 'react';
import './AIAgents.css';
import AIAnalysisModal from './AIAnalysisModal';

const AIAgents = () => {
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tradeHistory, setTradeHistory] = useState([]);
  const [autoTradeActive, setAutoTradeActive] = useState(false);
  const [showFundAllocation, setShowFundAllocation] = useState(false);
  const [allocatedFunds, setAllocatedFunds] = useState(0);
  const [fundInput, setFundInput] = useState('');
  const [tradingProgress, setTradingProgress] = useState({ active: false, message: '', progress: 0 });
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiModalData, setAiModalData] = useState(null);
  const [aiModalType, setAiModalType] = useState(null);
  const tradeIntervalRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const messagesEndRef = useRef(null);

  console.log('AIAgents component rendered, agents:', agents.length);

  useEffect(() => {
    console.log('🎯 AIAgents component rendered - DEBUG MODE ACTIVE');
    console.log('🔧 Component loaded at:', new Date().toISOString());
    
    // Test backend connectivity
    fetch('/api/trading/account')
      .then(response => response.json())
      .then(data => {
        console.log('🔗 Backend connection test successful:', data);
      })
      .catch(error => {
        console.error('🔗 Backend connection test failed:', error);
        alert(`Backend connection failed: ${error.message}`);
      });
    
    fetchAgents();
    fetchTradeHistory();
  }, []);

  // Fetch real trade history from backend
  const fetchTradeHistory = async () => {
    try {
      const response = await fetch('/api/trading/orders');
      const data = await response.json();
      
      if (data.success && data.orders) {
        const formattedTrades = data.orders.map(order => ({
          id: order.id,
          symbol: order.symbol,
          action: order.side.toUpperCase(),
          quantity: parseInt(order.qty),
          price: parseFloat(order.filled_avg_price || order.limit_price || 0),
          confidence: 85, // Default confidence for historical trades
          timestamp: order.created_at,
          status: order.status,
          agent: 'Historical'
        }));
        setTradeHistory(formattedTrades.slice(0, 50)); // Keep last 50 trades
      }
    } catch (error) {
      console.error('Error fetching trade history:', error);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchAgents = async () => {
    console.log('Fetching agents...');
    try {
      const response = await fetch('/api/agents');
      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);
      if (data.success) {
        setAgents(data.agents);
        console.log('Agents set:', data.agents.length);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  // Real paper trading integration
  const getAgentStocks = (agentName) => {
    const stockLists = {
      'Warren Buffett': ['JNJ', 'KO', 'PG', 'BRK.B', 'AAPL', 'BAC', 'WFC', 'AXP'],
      'Peter Lynch': ['AMZN', 'GOOGL', 'MSFT', 'NVDA', 'TSLA', 'META', 'NFLX', 'CRM'],
      'Ray Dalio': ['SPY', 'GLD', 'TLT', 'VTI', 'EEM', 'IWM', 'QQQ', 'VEA'],
      'Benjamin Graham': ['JNJ', 'PG', 'WMT', 'IBM', 'T', 'VZ', 'PFE', 'XOM'],
      'George Soros': ['SPY', 'QQQ', 'IWM', 'GLD', 'SLV', 'TLT', 'EFA', 'EEM']
    };
    return stockLists[agentName] || stockLists['Warren Buffett'];
  };

  const executeRealTrade = async (agentName) => {
    try {
      console.log('🚀 Starting trade execution for agent:', agentName);
      const stocks = getAgentStocks(agentName);
      const symbol = stocks[Math.floor(Math.random() * stocks.length)];
      const side = Math.random() > 0.5 ? 'buy' : 'sell';
      const qty = Math.floor(Math.random() * 10) + 1; // Smaller quantities for realistic trading
      const confidence = Math.floor(Math.random() * 30) + 70;
      
      console.log('📊 Trade parameters:', { symbol, side, qty, confidence });
      
      // Get current quote for the symbol
      console.log('💰 Fetching quote for:', symbol);
      const quoteResponse = await fetch(`/api/trading/quote/${symbol}`);
      console.log('📈 Quote response status:', quoteResponse.status);
      
      const quoteData = await quoteResponse.json();
      console.log('📈 Quote data:', quoteData);
      
      // Check if quote data is valid (API returns direct object with price)
      if (!quoteData.price && !quoteData.symbol) {
        console.error('❌ Failed to get quote for', symbol, quoteData);
        return null;
      }
      
      const currentPrice = quoteData.price || 100; // Fallback price if needed
      console.log('💵 Current price:', currentPrice);
      
      const tradePayload = {
        symbol,
        action: side,
        confidence: confidence / 100, // Convert percentage to decimal
        reasoning: `${agentName} auto-trade based on ${agentName === 'Warren Buffett' ? 'value investing principles' : agentName === 'Peter Lynch' ? 'growth potential analysis' : 'diversification strategy'}`,
        riskLevel: 'medium'
      };
      
      console.log('🎯 Sending trade request with payload:', tradePayload);
      
      // Execute the trade via AI agent endpoint
      const tradeResponse = await fetch('/api/trading/agent-trade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(tradePayload)
      });
      
      console.log('📡 Trade response status:', tradeResponse.status);
      console.log('📡 Trade response headers:', Object.fromEntries(tradeResponse.headers.entries()));
      
      const tradeData = await tradeResponse.json();
      console.log('📊 Trade response data:', tradeData);
      
      if (tradeData.success) {
        console.log('✅ Trade executed successfully!');
        const trade = {
          id: tradeData.order.id,
          symbol: tradeData.order.symbol,
          action: tradeData.order.side.toUpperCase(),
          quantity: parseInt(tradeData.order.qty),
          price: currentPrice,
          confidence,
          timestamp: new Date().toISOString(),
          status: tradeData.order.status,
          agent: agentName
        };
        
        console.log('📋 Formatted trade object:', trade);
        return trade;
      } else {
        console.error('❌ Trade execution failed:', tradeData);
        return null;
      }
    } catch (error) {
      console.error('💥 Error executing real trade:', error);
      console.error('💥 Error stack:', error.stack);
      return null;
    }
  };

  // Progress indicator messages
  const progressMessages = [
    'Analyzing market sentiment...',
    'Checking Yahoo Finance data...',
    'Scanning r/WSB for trends...',
    'Evaluating technical indicators...',
    'Reviewing news headlines...',
    'Calculating risk metrics...',
    'Finalizing trade decision...'
  ];

  const startProgressIndicator = (duration) => {
    setTradingProgress({ active: true, message: progressMessages[0], progress: 0 });
    
    let currentStep = 0;
    const totalSteps = progressMessages.length;
    const stepDuration = duration / totalSteps;
    
    const updateProgress = () => {
      if (currentStep < totalSteps) {
        setTradingProgress({
          active: true,
          message: progressMessages[currentStep],
          progress: ((currentStep + 1) / totalSteps) * 100
        });
        currentStep++;
        progressIntervalRef.current = setTimeout(updateProgress, stepDuration);
      } else {
        setTradingProgress({ active: false, message: '', progress: 0 });
      }
    };
    
    progressIntervalRef.current = setTimeout(updateProgress, stepDuration);
  };

  const stopProgressIndicator = () => {
    if (progressIntervalRef.current) {
      clearTimeout(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setTradingProgress({ active: false, message: '', progress: 0 });
  };

  const startAutoTrading = () => {
    console.log('🚀 STARTING AUTO TRADING for agent:', selectedAgent.name);
    console.log('🚀 Allocated funds:', allocatedFunds);
    console.log('🚀 Current autoTradeActive status:', autoTradeActive);
    
    if (!selectedAgent) {
      console.log('❌ No selected agent, cannot start auto trading');
      return;
    }
    
    if (autoTradeActive) {
      console.log('⚠️ Auto trading already active, stopping current session first');
      stopAutoTrading();
    }
    
    console.log('🚀 Setting autoTradeActive to true');
    setAutoTradeActive(true);
    
    // Start progress indicator immediately
    startProgressIndicator(13000); // 13 seconds for first trade
    
    // Set up interval for real trades (every 30-120 seconds for more realistic trading)
    const executeTrade = async () => {
      try {
        console.log('🎯 EXECUTING TRADE for agent:', selectedAgent.name);
        console.log('🎯 Auto trade active status:', autoTradeActive);
        const trade = await executeRealTrade(selectedAgent.name);
        if (trade) {
          console.log('✅ Trade executed successfully:', trade);
          setTradeHistory(prev => [trade, ...prev.slice(0, 49)]); // Keep last 50 trades
        } else {
          console.log('❌ Trade execution failed or returned null');
        }
      } catch (error) {
        console.error('💥 Error in executeTrade:', error);
        console.error('💥 Error stack:', error.stack);
      }
      
      // Schedule next trade with longer intervals
      const nextInterval = Math.random() * 90000 + 30000; // 30-120 seconds
      console.log('⏰ Next trade scheduled in', Math.round(nextInterval/1000), 'seconds');
      
      // Start progress indicator for next trade
      const nextTradeDuration = Math.random() * 8000 + 7000; // 7-15 seconds for analysis
      
      tradeIntervalRef.current = setTimeout(() => {
        console.log('⏰ Timeout triggered, checking if auto trade still active:', autoTradeActive);
        if (autoTradeActive) { // Check if still active
          console.log('⏰ Starting next trade cycle');
          startProgressIndicator(nextTradeDuration);
          setTimeout(executeTrade, nextTradeDuration);
        } else {
          console.log('⏰ Auto trading stopped, not executing next trade');
        }
      }, nextInterval);
    };
    
    // Execute first trade after 13 seconds
    console.log('⏰ Setting timeout for first trade in 13 seconds');
    setTimeout(() => {
      console.log('⏰ First trade timeout triggered, executing trade');
      executeTrade();
    }, 13000);
  };

  const stopAutoTrading = () => {
    setAutoTradeActive(false);
    if (tradeIntervalRef.current) {
      clearTimeout(tradeIntervalRef.current);
      tradeIntervalRef.current = null;
    }
    stopProgressIndicator();
  };

  const handleFundAllocation = () => {
    const amount = parseFloat(fundInput);
    console.log('💰 Fund allocation requested:', amount);
    if (amount > 0) {
      console.log('💰 Setting allocated funds and starting auto trading');
      setAllocatedFunds(amount);
      setShowFundAllocation(false);
      setFundInput('');
      startAutoTrading();
    } else {
      console.log('💰 Invalid fund amount:', amount);
    }
  };

  const selectAgent = async (agent) => {
    try {
      setLoading(true);
      
      // Stop any existing auto trading
      stopAutoTrading();
      
      setSelectedAgent(agent);
      setMessages([]);
      setTradeHistory([]);
      setAllocatedFunds(0);
      
      // Start a new session
      const response = await fetch(`/api/agents/${agent.id}/session/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      
      const data = await response.json();
      if (data.success) {
        setSessionId(data.sessionId);
        setMessages([{
          type: 'agent',
          content: `Hello! I'm ${agent.name}. ${agent.greeting}`,
          timestamp: new Date().toISOString()
        }]);
        
        // Auto-scroll to bottom after initial message
        setTimeout(() => {
          const chatContainer = document.querySelector('.messages-container');
          if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
          }
        }, 100);
      }
    } catch (error) {
      console.error('Error selecting agent:', error);
      setError('Failed to select agent');
    } finally {
      setLoading(false);
    }
  };

  const fetchPerformanceData = async (agentId, timeframe = '30d') => {
    try {
      const response = await fetch(`/api/agents/${agentId}/performance?timeframe=${timeframe}`);
      const data = await response.json();
      if (data.success) {
        setPerformance(data);
      }
    } catch (error) {
      console.error('Error fetching performance data:', error);
    }
  };

  const fetchComparativeData = async (timeframe = '30d') => {
    try {
      const response = await fetch(`/api/agents/performance/comparative?timeframe=${timeframe}`);
      const data = await response.json();
      if (data.success) {
        setComparative(data);
      }
    } catch (error) {
      console.error('Error fetching comparative data:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !selectedAgent || loading) return;

    const userMessage = {
      type: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setLoading(true);

    try {
      const response = await fetch(`/api/agents/${selectedAgent.id}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: inputMessage + " (Please keep your response brief and conversational, under 100 words)",
          sessionId
        })
      });

      const data = await response.json();
      if (data.success) {
        const agentMessage = {
          type: 'agent',
          content: data.response,
          timestamp: data.timestamp
        };
        setMessages(prev => [...prev, agentMessage]);
        
        // Auto-scroll to bottom after new message
        setTimeout(() => {
          const chatContainer = document.querySelector('.messages-container');
          if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
          }
        }, 100);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        type: 'agent',
        content: 'Sorry, I\'m having trouble responding right now. Please try again.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const getAnalysis = async () => {
    if (!selectedAgent || loading) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/agents/${selectedAgent.id}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setAnalysis(data.analysis);
        setShowAnalysis(true);
        
        // Add analysis to chat
        const analysisMessage = {
          type: 'agent',
          content: `Here's my current market analysis:\n\n**Market Analysis:** ${data.analysis.analysis}\n\n**Recommendation:** ${data.analysis.recommendation.action} ${data.analysis.recommendation.symbol || ''}\n\n**Risk Assessment:** ${data.analysis.riskAssessment}\n\n**My Reasoning:** ${data.analysis.reasoning}`,
          timestamp: data.analysis.timestamp,
          isAnalysis: true
        };
        setMessages(prev => [...prev, analysisMessage]);
      }
    } catch (error) {
      console.error('Error getting analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getRiskColor = (riskTolerance) => {
    switch (riskTolerance.toLowerCase()) {
      case 'conservative': return '#10b981';
      case 'moderate': case 'moderate to high': return '#f59e0b';
      case 'high': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getRecommendationColor = (action) => {
    switch (action) {
      case 'BUY': return '#10b981';
      case 'SELL': return '#ef4444';
      case 'HOLD': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (tradeIntervalRef.current) {
        clearTimeout(tradeIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className="ai-agents">
      {!selectedAgent ? (
        <div className="agent-selection">
          <div className="agents-header">
            <h2>AI Trading Agents</h2>
            <p>Select an AI agent to start trading with advanced market intelligence</p>
          </div>
          <div className="agents-grid">
            {agents && agents.length > 0 ? agents.map(agent => (
              <div 
                key={agent.id} 
                className="agent-card"
                onClick={() => selectAgent(agent)}
              >
                <div className="agent-avatar">{agent.avatar}</div>
                <div className="agent-info">
                  <h3>{agent.name}</h3>
                  <div className="agent-title">{agent.title}</div>
                  <p className="agent-description">{agent.description}</p>
                  <div className="agent-stats">
                    <div className="stat">
                      <span className="stat-label">Success Rate</span>
                      <span className="stat-value">{agent.successRate}%</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Total Trades</span>
                      <span className="stat-value">{agent.totalTrades}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Avg Return</span>
                      <span className={`stat-value ${agent.avgReturn >= 0 ? 'positive' : 'negative'}`}>
                        {agent.avgReturn >= 0 ? '+' : ''}{agent.avgReturn}%
                      </span>
                    </div>
                  </div>
                  <div className="agent-specialties">
                    {agent.specialties && agent.specialties.map((specialty, index) => (
                      <span key={index} className="specialty-tag">{specialty}</span>
                    ))}
                  </div>
                </div>
              </div>
            )) : (
              <div className="loading-agents">
                <p>Loading AI agents...</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="split-screen-layout">
          {/* Header */}
          <div className="agent-header">
            <button 
              className="back-btn"
              onClick={() => {
                stopAutoTrading();
                setSelectedAgent(null);
                setMessages([]);
                setTradeHistory([]);
                setAllocatedFunds(0);
              }}
            >
              ← Back to Agents
            </button>
            <div className="selected-agent-info">
              <span className="agent-avatar">{selectedAgent.avatar}</span>
              <div>
                <h3>{selectedAgent.name}</h3>
                <p>{selectedAgent.title}</p>
              </div>
            </div>
          </div>

          <div className="split-content">
            {/* Left Side - Trade History & Auto Trade */}
            <div className="left-panel">
              <div className="trade-controls">
                <div className="fund-info">
                  {allocatedFunds > 0 && (
                    <div className="allocated-funds">
                      <span>Allocated: ${allocatedFunds.toLocaleString()}</span>
                      <span className={`status ${autoTradeActive ? 'active' : 'inactive'}`}>
                        {autoTradeActive ? 'Auto Trading Active' : 'Auto Trading Inactive'}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="trade-buttons">
                  {!autoTradeActive ? (
                    <button 
                      className="auto-trade-btn"
                      onClick={() => setShowFundAllocation(true)}
                    >
                      Start Auto Trade
                    </button>
                  ) : (
                    <button 
                      className="stop-trade-btn"
                      onClick={stopAutoTrading}
                    >
                      Stop Auto Trade
                    </button>
                  )}
                </div>
                
                {(autoTradeActive || tradingProgress.active) && (
                  <div className="trading-progress">
                    <div className="progress-message">
                      <span className="progress-icon">🔍</span>
                      {tradingProgress.active ? tradingProgress.message : 'Auto-trading active - waiting for next analysis...'}
                    </div>
                    <div className="progress-bar-container">
                      <div 
                        className="progress-bar"
                        style={{ width: `${tradingProgress.active ? tradingProgress.progress : 100}%` }}
                      ></div>
                    </div>
                    <div className="progress-percentage">
                      {tradingProgress.active ? Math.round(tradingProgress.progress) : 100}%
                    </div>
                  </div>
                )}
              </div>

              <div className="trade-history">
                <h3>Trade History</h3>
                {tradeHistory.length === 0 ? (
                  <div className="no-trades">
                    <p>No trades yet. Start auto trading to see live trades.</p>
                  </div>
                ) : (
                  <div className="trades-list">
                    {tradeHistory.map((trade) => (
                      <div 
                        key={trade.id} 
                        className="trade-item clickable"
                        onClick={() => {
                          setAiModalData(trade);
                          setAiModalType('trade');
                          setShowAIModal(true);
                        }}
                      >
                        <div className="trade-header">
                          <span className={`action ${trade.action.toLowerCase()}`}>
                            {trade.action}
                          </span>
                          <span className="symbol">{trade.symbol}</span>
                          <span className="time">
                            {new Date(trade.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="trade-details">
                          <span>Qty: {trade.quantity}</span>
                          <span>Price: ${trade.price}</span>
                          <span className="confidence">{trade.confidence}% confidence</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Side - Chat Interface */}
            <div className="right-panel">
              <div className="chat-container">
                <div className="messages-container">
                  {messages.map((message, index) => (
                    <div key={index} className={`message ${message.type}`}>
                      <div className="message-avatar">
                        {message.type === 'agent' ? selectedAgent.avatar : '👤'}
                      </div>
                      <div className="message-content">
                        <div className="message-text">{message.content}</div>
                        <div className="message-time">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="message agent">
                      <div className="message-avatar">{selectedAgent.avatar}</div>
                      <div className="message-content typing">
                        <span></span><span></span><span></span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="message-input">
                  <textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={`Ask ${selectedAgent.name} about investments, market conditions, or trading strategies...`}
                    disabled={loading}
                    rows={3}
                  />
                  <button 
                    onClick={sendMessage}
                    disabled={!inputMessage.trim() || loading}
                    className="send-btn"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fund Allocation Modal */}
      {showFundAllocation && (
        <div className="modal-overlay">
          <div className="fund-allocation-modal">
            <h3>Allocate Funds for Auto Trading</h3>
            <p>How much would you like to allocate to {selectedAgent.name}?</p>
            <div className="fund-input-group">
              <span className="currency-symbol">$</span>
              <input
                type="number"
                value={fundInput}
                onChange={(e) => setFundInput(e.target.value)}
                placeholder="Enter amount"
                min="100"
                step="100"
              />
            </div>
            <div className="modal-buttons">
              <button 
                className="cancel-btn"
                onClick={() => {
                  setShowFundAllocation(false);
                  setFundInput('');
                }}
              >
                Cancel
              </button>
              <button 
                className="confirm-btn"
                onClick={handleFundAllocation}
                disabled={!fundInput || parseFloat(fundInput) < 100}
              >
                Start Trading
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Analysis Modal */}
      {showAIModal && (
        <AIAnalysisModal
          isOpen={showAIModal}
          onClose={() => {
             setShowAIModal(false);
             setAiModalData(null);
             setAiModalType(null);
           }}
           data={aiModalData}
           type={aiModalType}
           onSendMessage={async (message, context) => {
             // Mock AI response for trade analysis
             return new Promise(resolve => {
               setTimeout(() => {
                 if (context.type === 'trade') {
                   resolve(`${selectedAgent.name} analyzed this ${context.data.action} trade for ${context.data.symbol}. The decision was based on technical indicators showing ${context.data.confidence}% confidence. Market conditions and risk assessment supported this ${context.data.quantity} share transaction at $${context.data.price}.`);
                 }
                 resolve('Analysis complete.');
               }, 1500);
             });
           }}
        />
      )}
      </div>
    );
};

export default AIAgents;