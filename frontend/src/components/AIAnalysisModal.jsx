import React, { useState, useEffect } from 'react';
import { X, Bot, TrendingUp, BarChart3, DollarSign, Brain } from 'lucide-react';

const AIAnalysisModal = ({ 
  isOpen, 
  onClose, 
  type, // 'chart' or 'trade'
  data, // chart click data or trade data
  onSendMessage 
}) => {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState('');

  // Generate contextual prompt based on type and data
  const generatePrompt = () => {
    if (type === 'chart' && data) {
      return `Analyze this chart data point: ${data.label} with value ${data.value}. What insights can you provide about this data point in the context of ${data.dataset || 'the chart'}?`;
    } else if (type === 'trade' && data) {
      return `Explain the reasoning behind this ${data.action} trade: ${data.quantity} shares of ${data.symbol} at $${data.price}. Why was this decision made with ${data.confidence}% confidence?`;
    }
    return '';
  };

  // Auto-generate initial message when modal opens
  useEffect(() => {
    if (isOpen && data) {
      const prompt = generatePrompt();
      setMessage(prompt);
    }
  }, [isOpen, data, type]);

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    setIsLoading(true);
    try {
      // Send message to AI agent
      const response = await onSendMessage(message, { type, data });
      setAiResponse(response);
    } catch (error) {
      console.error('Error sending message to AI:', error);
      setAiResponse('Sorry, I encountered an error while processing your request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-2xl mx-4 shadow-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg border border-blue-500/30">
              {type === 'chart' ? (
                <BarChart3 className="h-5 w-5 text-blue-400" />
              ) : (
                <DollarSign className="h-5 w-5 text-green-400" />
              )}
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">
                {type === 'chart' ? 'Chart Analysis' : 'Trade Analysis'}
              </h3>
              <p className="text-sm text-slate-400">
                {type === 'chart' 
                  ? 'Get AI insights about this chart data point'
                  : 'Understand the reasoning behind this trade'
                }
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Data Summary */}
          <div className="bg-slate-700/50 rounded-xl p-4 border border-slate-600">
            <h4 className="text-sm font-semibold text-slate-300 mb-2">
              {type === 'chart' ? 'Chart Data Point' : 'Trade Details'}
            </h4>
            {type === 'chart' && data && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Label:</span>
                  <span className="text-white">{data.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Value:</span>
                  <span className="text-white">{data.value}</span>
                </div>
                {data.dataset && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Dataset:</span>
                    <span className="text-white">{data.dataset}</span>
                  </div>
                )}
              </div>
            )}
            {type === 'trade' && data && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Action:</span>
                  <span className={`font-semibold ${data.action === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
                    {data.action}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Symbol:</span>
                  <span className="text-white">{data.symbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Quantity:</span>
                  <span className="text-white">{data.quantity} shares</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Price:</span>
                  <span className="text-white">${data.price}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Confidence:</span>
                  <span className="text-white">{data.confidence}%</span>
                </div>
              </div>
            )}
          </div>

          {/* AI Response */}
          {aiResponse && (
            <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl p-4 border border-blue-500/20">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg border border-blue-500/30 flex-shrink-0">
                  <Brain className="h-4 w-4 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-blue-300 mb-2">AI Analysis</h4>
                  <p className="text-sm text-slate-300 leading-relaxed">{aiResponse}</p>
                </div>
              </div>
            </div>
          )}

          {/* Message Input */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-300">
              Ask the AI Agent
            </label>
            <div className="relative">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask for more details, analysis, or insights..."
                className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 resize-none"
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSendMessage}
            disabled={!message.trim() || isLoading}
            className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Bot className="h-4 w-4" />
                <span>Ask AI</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIAnalysisModal;