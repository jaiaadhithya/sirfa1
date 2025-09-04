// SIRFA Agent Finance - Trading Dashboard Component
// Real-time trading decisions and actions with WebSocket integration

import React, { useState, useEffect } from 'react';
import { useTradingDecisions, useTradingActions, useWebSocket } from '../hooks/useWebSocket';
import StockChart from './charts/StockChart';
import PortfolioChart from './charts/PortfolioChart';
import AIAnalysisModal from './AIAnalysisModal';

const TradingDashboard = () => {
  const [selectedDecision, setSelectedDecision] = useState(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionForm, setActionForm] = useState({
    symbol: '',
    action: 'buy',
    quantity: '',
    orderType: 'market'
  });
  const [showManualTradeModal, setShowManualTradeModal] = useState(false);
  const [manualTradeForm, setManualTradeForm] = useState({
    symbol: 'AAPL',
    action: 'buy',
    quantity: '1',
    orderType: 'market'
  });
  const [manualTradeResult, setManualTradeResult] = useState(null);
  const [portfolioPerformanceData, setPortfolioPerformanceData] = useState(null);
  const [performanceLoading, setPerformanceLoading] = useState(true);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiModalData, setAiModalData] = useState(null);
  const [aiModalType, setAiModalType] = useState(null);

  const { isConnected } = useWebSocket();
  const { decisions, lastDecision } = useTradingDecisions((decision) => {
    console.log('New trading decision:', decision);
  });
  const { sendTradingAction, pendingActions } = useTradingActions();

  // Fetch portfolio performance data
  useEffect(() => {
    const fetchPortfolioPerformance = async () => {
      try {
        setPerformanceLoading(true);
        const response = await fetch('/api/portfolio/history?period=1M&timeframe=1D');
        if (!response.ok) throw new Error('Failed to fetch portfolio history');
        
        const historyData = await response.json();
        
        // Transform the data for the chart
        const performanceData = {
          performance: historyData.timestamps.map((timestamp, index) => ({
            date: new Date(timestamp * 1000).toISOString(),
            totalValue: historyData.equity[index] || 0,
            cash: 0 // You can add cash data if available
          }))
        };
        
        setPortfolioPerformanceData(performanceData);
      } catch (error) {
        console.error('Error fetching portfolio performance:', error);
        // Set fallback data
        setPortfolioPerformanceData({
          performance: [
            { date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), totalValue: 100000, cash: 0 },
            { date: new Date().toISOString(), totalValue: 100000, cash: 0 }
          ]
        });
      } finally {
        setPerformanceLoading(false);
      }
    };

    fetchPortfolioPerformance();
  }, []);

  // Handle chart clicks for AI analysis
  const handleChartClick = (clickData) => {
    console.log('Chart clicked:', clickData);
    setAiModalData(clickData);
    setAiModalType('chart');
    setShowAIModal(true);
  };

  // Handle AI message sending
  const handleSendAIMessage = async (message, context) => {
    try {
      // Create context-aware prompt for AI analysis
      let prompt = message;
      if (context.type === 'chart' && context.data) {
        prompt = `Analyze this trading chart data: ${context.data.label} with value ${context.data.value} from ${context.data.dataset || 'chart'}. User question: ${message}. Please provide a short, detailed trading analysis.`;
      } else if (context.data && context.data.action) {
        prompt = `Analyze this ${context.data.action} trade for ${context.data.symbol} with ${context.data.confidence}% confidence. User question: ${message}. Provide short, detailed trading insights.`;
      } else {
        prompt = `Provide trading analysis. User question: ${message}. Keep the response short and detailed.`;
      }

      // Call the real AI API endpoint
       const response = await fetch('/api/agents/melvin-arck/portfolio-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          question: prompt
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        return data.response;
      } else {
        throw new Error(data.error || 'Failed to get AI response');
      }
    } catch (error) {
      console.error('Error sending AI message:', error);
      // Fallback to a brief error message
      return `I'm currently unable to provide trading analysis. Please try again later. Error: ${error.message}`;
    }
   };

   // Handle closing AI modal
   const handleCloseAIModal = () => {
     setShowAIModal(false);
     setAiModalData(null);
     setAiModalType(null);
   };



   const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'text-green-400 bg-green-500/20 border-green-500/30';
    if (confidence >= 0.6) return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
    return 'text-red-400 bg-red-500/20 border-red-500/30';
  };

  const getActionColor = (action) => {
    switch (action?.toLowerCase()) {
      case 'buy': return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'sell': return 'text-red-400 bg-red-500/20 border-red-500/30';
      case 'hold': return 'text-slate-400 bg-slate-500/20 border-slate-500/30';
      default: return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
    }
  };

  const handleExecuteAction = (decision) => {
    setSelectedDecision(decision);
    setActionForm({
      symbol: decision.symbol || '',
      action: decision.action?.toLowerCase() || 'buy',
      quantity: decision.suggestedQuantity || '',
      orderType: 'market'
    });
    setShowActionModal(true);
  };

  const handleSubmitAction = async (e) => {
    e.preventDefault();
    
    try {
      const actionData = {
        ...actionForm,
        quantity: parseFloat(actionForm.quantity),
        decisionId: selectedDecision?.id,
        timestamp: new Date().toISOString()
      };

      const result = sendTradingAction(actionData);
      
      if (result.success) {
        console.log('Trading action sent:', result.actionId);
        setShowActionModal(false);
        setSelectedDecision(null);
      } else {
        alert('Failed to send trading action. Please check your connection.');
      }
    } catch (error) {
      console.error('Error submitting trading action:', error);
      alert('Error submitting trading action: ' + error.message);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setActionForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleManualTradeFormChange = (e) => {
    const { name, value } = e.target;
    setManualTradeForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleManualTrade = async (e) => {
    e.preventDefault();
    setManualTradeResult(null);
    
    try {
      const response = await fetch('/api/trading/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol: manualTradeForm.symbol.toUpperCase(),
          qty: parseFloat(manualTradeForm.quantity),
          side: manualTradeForm.action,
          type: manualTradeForm.orderType,
          time_in_force: 'day'
        })
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        setManualTradeResult({
          success: true,
          message: `Manual trade placed successfully!`,
          order: result.order
        });
      } else {
        setManualTradeResult({
          success: false,
          message: result.error || 'Failed to place manual trade',
          details: result.details
        });
      }
    } catch (error) {
      console.error('Error placing manual trade:', error);
      setManualTradeResult({
        success: false,
        message: 'Network error: ' + error.message
     });
   }
 };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl border border-blue-500/30">
              <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Trading Dashboard</h2>
              <p className="text-sm text-slate-400">Real-time AI trading decisions and execution</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowManualTradeModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-200 font-semibold shadow-lg flex items-center space-x-2 text-sm"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Manual Trade</span>
            </button>
            <div className={`px-4 py-2 rounded-xl text-sm font-semibold border flex items-center space-x-2 ${
              isConnected 
                ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                : 'bg-red-500/20 text-red-400 border-red-500/30'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
              }`}></div>
              <span>
                {isConnected ? 'Live Trading' : 'Offline'}
              </span>
            </div>
            {lastDecision && (
              <span className="text-xs text-slate-400 bg-slate-700/30 px-3 py-1 rounded-lg">
                Last Decision: {formatTimestamp(lastDecision.timestamp)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Latest Decision Highlight */}
      {lastDecision && (
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10"></div>
          <div className="relative">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg border border-purple-500/30">
                    <svg className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white">Latest AI Decision</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-slate-700/30 rounded-xl p-3 border border-slate-600/30">
                    <span className="text-sm font-medium text-slate-400">Symbol</span>
                    <p className="font-bold text-white text-lg">{lastDecision.symbol}</p>
                  </div>
                  <div className="bg-slate-700/30 rounded-xl p-3 border border-slate-600/30">
                    <span className="text-sm font-medium text-slate-400">Action</span>
                    <div className="mt-1">
                      <span className={`inline-block px-3 py-1 rounded-lg text-sm font-semibold ${
                        getActionColor(lastDecision.action)
                      }`}>
                        {lastDecision.action?.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="bg-slate-700/30 rounded-xl p-3 border border-slate-600/30">
                    <span className="text-sm font-medium text-slate-400">Confidence</span>
                    <div className="mt-1">
                      <span className={`inline-block px-3 py-1 rounded-lg text-sm font-semibold ${
                        getConfidenceColor(lastDecision.confidence)
                      }`}>
                        {(lastDecision.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="bg-slate-700/30 rounded-xl p-3 border border-slate-600/30">
                    <span className="text-sm font-medium text-slate-400">Target Price</span>
                    <p className="font-bold text-white text-lg">
                      {formatCurrency(lastDecision.targetPrice)}
                    </p>
                  </div>
                </div>
                {lastDecision.reasoning && (
                  <div className="mt-4 bg-slate-700/20 rounded-xl p-4 border border-slate-600/20">
                    <span className="text-sm font-medium text-slate-400">AI Reasoning:</span>
                    <p className="text-sm text-slate-300 mt-2 leading-relaxed">{lastDecision.reasoning}</p>
                  </div>
                )}
              </div>
              <button
                onClick={() => handleExecuteAction(lastDecision)}
                className="ml-6 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                disabled={!isConnected}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-9-4V8a3 3 0 013-3h6a3 3 0 013 3v2M7 21h10a2 2 0 002-2v-5a2 2 0 00-2-2H7a2 2 0 00-2 2v5a2 2 0 002 2z" />
                </svg>
                <span>Execute</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pending Actions */}
      {pendingActions.length > 0 && (
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-lg border border-yellow-500/30">
              <svg className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white">Pending Actions</h3>
          </div>
          <div className="space-y-3">
            {pendingActions.map((action) => (
              <div key={action.actionId} className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/30">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <span className="font-semibold text-white text-lg">{action.symbol}</span>
                    <span className="text-slate-400">•</span>
                    <span className="capitalize text-slate-300 font-medium">{action.action}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-300">{action.quantity} shares</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-lg text-sm font-semibold border ${
                      action.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                      action.status === 'received' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                      'bg-green-500/20 text-green-400 border-green-500/30'
                    }`}>
                      {action.status}
                    </span>
                    <span className="text-xs text-slate-400 bg-slate-600/30 px-2 py-1 rounded">
                      {formatTimestamp(action.sentAt)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}



      {/* Market Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Stock Chart */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-lg border border-blue-500/30">
              <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white">Market Analysis</h3>
          </div>
          <StockChart 
            symbol={lastDecision?.symbol || 'AAPL'} 
            height={400}
            showControls={true}
            onChartClick={handleChartClick}
          />
        </div>

        {/* Portfolio Performance Chart */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg border border-purple-500/30">
              <svg className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white">Portfolio Performance</h3>
          </div>
          <PortfolioChart 
            type="performance"
            height={400}
            timeRange="1M"
            data={portfolioPerformanceData}
            loading={performanceLoading}
            onChartClick={handleChartClick}
          />
        </div>
      </div>

      {/* Decision History */}
      <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-lg border border-green-500/30">
            <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white">Decision History</h3>
        </div>
        {decisions.length > 0 ? (
          <div className="overflow-x-auto">
            <div className="min-w-full">
              <div className="grid grid-cols-6 gap-4 mb-4 px-4 py-2 bg-slate-700/30 rounded-xl border border-slate-600/30">
                <div className="text-sm font-semibold text-slate-400">Time</div>
                <div className="text-sm font-semibold text-slate-400">Symbol</div>
                <div className="text-sm font-semibold text-slate-400">Action</div>
                <div className="text-sm font-semibold text-slate-400">Confidence</div>
                <div className="text-sm font-semibold text-slate-400 text-right">Target Price</div>
                <div className="text-sm font-semibold text-slate-400 text-center">Actions</div>
              </div>
              <div className="space-y-2">
                {decisions.slice(0, 10).map((decision, index) => (
                  <div key={index} className="grid grid-cols-6 gap-4 px-4 py-3 bg-slate-700/20 rounded-xl border border-slate-600/20 hover:bg-slate-700/30 transition-all duration-200">
                    <div className="text-sm text-slate-300">
                      {formatTimestamp(decision.timestamp)}
                    </div>
                    <div className="font-semibold text-white">
                      {decision.symbol}
                    </div>
                    <div>
                      <span className={`inline-block px-3 py-1 rounded-lg text-xs font-semibold ${
                        getActionColor(decision.action)
                      }`}>
                        {decision.action?.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <span className={`inline-block px-3 py-1 rounded-lg text-xs font-semibold ${
                        getConfidenceColor(decision.confidence)
                      }`}>
                        {(decision.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="text-right text-white font-medium">
                      {formatCurrency(decision.targetPrice)}
                    </div>
                    <div className="text-center">
                      <button
                        onClick={() => handleExecuteAction(decision)}
                        className="px-4 py-1 text-xs bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!isConnected}
                      >
                        Execute
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-slate-500 mb-4">
              <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No Trading Decisions</h3>
            <p className="text-slate-400">AI trading decisions will appear here when the system is active</p>
          </div>
        )}
      </div>

      {/* Action Modal */}
      {showActionModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg border border-blue-500/30">
                <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white">Execute Trading Action</h3>
            </div>
            <form onSubmit={handleSubmitAction}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Symbol
                  </label>
                  <input
                    type="text"
                    name="symbol"
                    value={actionForm.symbol}
                    onChange={handleFormChange}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Action
                  </label>
                  <select
                    name="action"
                    value={actionForm.action}
                    onChange={handleFormChange}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="buy">Buy</option>
                    <option value="sell">Sell</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Quantity
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    value={actionForm.quantity}
                    onChange={handleFormChange}
                    min="1"
                    step="1"
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Order Type
                  </label>
                  <select
                    name="orderType"
                    value={actionForm.orderType}
                    onChange={handleFormChange}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="market">Market</option>
                    <option value="limit">Limit</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-8">
                <button
                  type="button"
                  onClick={() => setShowActionModal(false)}
                  className="px-6 py-3 text-slate-300 border border-slate-600 rounded-xl hover:bg-slate-700/50 transition-all duration-200 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!isConnected}
                >
                  Execute Trade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Trade Modal */}
      {showManualTradeModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-lg border border-green-500/30">
                <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white">Manual Trade</h3>
            </div>
            
            {manualTradeResult && (
              <div className={`mb-4 p-4 rounded-xl border ${
                manualTradeResult.success 
                  ? 'bg-green-500/20 border-green-500/30 text-green-400' 
                  : 'bg-red-500/20 border-red-500/30 text-red-400'
              }`}>
                <p className="font-semibold">{manualTradeResult.message}</p>
                {manualTradeResult.order && (
                  <div className="mt-2 text-sm">
                    <p>Order ID: {manualTradeResult.order.id}</p>
                    <p>Status: {manualTradeResult.order.status}</p>
                  </div>
                )}
                {manualTradeResult.details && (
                  <p className="mt-2 text-sm">{manualTradeResult.details}</p>
                )}
              </div>
            )}
            
            <form onSubmit={handleManualTrade}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Symbol
                  </label>
                  <input
                    type="text"
                    name="symbol"
                    value={manualTradeForm.symbol}
                    onChange={handleManualTradeFormChange}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="e.g., AAPL"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Action
                  </label>
                  <select
                    name="action"
                    value={manualTradeForm.action}
                    onChange={handleManualTradeFormChange}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="buy">Buy</option>
                    <option value="sell">Sell</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Quantity
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    value={manualTradeForm.quantity}
                    onChange={handleManualTradeFormChange}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    min="1"
                    step="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Order Type
                  </label>
                  <select
                    name="orderType"
                    value={manualTradeForm.orderType}
                    onChange={handleManualTradeFormChange}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="market">Market</option>
                    <option value="limit">Limit</option>
                  </select>
                </div>
              </div>
              <div className="flex space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowManualTradeModal(false);
                    setManualTradeResult(null);
                  }}
                  className="flex-1 px-6 py-3 bg-slate-700 text-slate-300 rounded-xl hover:bg-slate-600 transition-all duration-200 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-200 font-semibold shadow-lg"
                >
                  Place Manual Trade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Analysis Modal */}
      <AIAnalysisModal
        isOpen={showAIModal}
        onClose={handleCloseAIModal}
        type={aiModalType}
        data={aiModalData}
        onSendMessage={handleSendAIMessage}
      />
    </div>
  );
};

export default TradingDashboard;