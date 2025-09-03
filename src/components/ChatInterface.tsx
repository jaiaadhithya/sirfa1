import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Send, Bot, User, TrendingUp, AlertTriangle, DollarSign, CheckCircle } from "lucide-react";

interface TradeSuggestion {
  action: 'buy' | 'sell';
  symbol: string;
  quantity: number;
  price?: number;
  reasoning: string;
  confidence: number;
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'agent';
  timestamp: Date;
  agentName?: string;
  suggestions?: string[];
  tradeSuggestions?: TradeSuggestion[];
}

const agentPersonalities = {
  "wharton-buffest": {
    name: "Wharton Buffest",
    greeting: "Hello! I'm here to help you build long-term wealth through disciplined value investing. What would you like to discuss about your portfolio?",
    style: "conservative and analytical"
  },
  "melvin-arck": {
    name: "Melvin Arck", 
    greeting: "Ready to make some bold moves? I'm tracking high-potential opportunities that could deliver exceptional returns. What's your risk appetite today?",
    style: "aggressive and opportunistic"
  },
  "jane-quant": {
    name: "Jane Quant",
    greeting: "I've analyzed the latest market data and identified several algorithmic insights. Let me walk you through the quantitative signals I'm seeing.",
    style: "data-driven and systematic"
  }
};

interface ChatInterfaceProps {
  selectedAgent: string | null;
}

export const ChatInterface = ({ selectedAgent }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showTradeConfirmation, setShowTradeConfirmation] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<TradeSuggestion | null>(null);
  const [isExecutingTrade, setIsExecutingTrade] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const currentAgent = selectedAgent ? agentPersonalities[selectedAgent as keyof typeof agentPersonalities] : null;

  useEffect(() => {
    if (selectedAgent && currentAgent) {
      // Add welcome message when agent is selected
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        text: currentAgent.greeting,
        sender: 'agent',
        timestamp: new Date(),
        agentName: currentAgent.name,
        suggestions: generateSuggestions(selectedAgent)
      };
      setMessages([welcomeMessage]);
    }
  }, [selectedAgent, currentAgent]);

  useEffect(() => {
    // Scroll to bottom when new messages are added
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !currentAgent) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue('');
    setIsTyping(true);

    try {
      // Call the chat API endpoint
      const response = await fetch(`http://localhost:3001/api/agents/${selectedAgent}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentInput,
          sessionId: `session_${selectedAgent}_${Date.now()}`
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Debug logging
      console.log('API Response:', data);
      console.log('Trade Suggestions:', data.tradeSuggestions);
      console.log('Trade Suggestions Length:', data.tradeSuggestions?.length || 0);
      
      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response || 'I apologize, but I encountered an issue processing your request.',
        sender: 'agent',
        timestamp: new Date(),
        agentName: currentAgent.name,
        suggestions: generateSuggestions(selectedAgent!),
        tradeSuggestions: data.tradeSuggestions || []
      };
      
      console.log('Agent Message:', agentMessage);
      console.log('Agent Message Trade Suggestions:', agentMessage.tradeSuggestions);
      
      setMessages(prev => [...prev, agentMessage]);
    } catch (error) {
      console.error('Error calling portfolio-aware API:', error);
      
      // Fallback to mock response if API fails
      const fallbackResponse = generateAgentResponse(currentInput, selectedAgent!);
      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: fallbackResponse.text,
        sender: 'agent',
        timestamp: new Date(),
        agentName: currentAgent.name,
        suggestions: fallbackResponse.suggestions
      };
      
      setMessages(prev => [...prev, agentMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
  };

  const handleTradeClick = (trade: TradeSuggestion) => {
    setSelectedTrade(trade);
    setShowTradeConfirmation(true);
  };

  const executeTrade = async () => {
    if (!selectedTrade) return;

    setIsExecutingTrade(true);
    try {
      const response = await fetch('http://localhost:3001/api/trading/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol: selectedTrade.symbol,
          side: selectedTrade.action,
          qty: selectedTrade.quantity,
          type: 'market',
          time_in_force: 'day',
          source: 'ai_suggestion',
          reasoning: selectedTrade.reasoning
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Add success message to chat
        const successMessage: Message = {
          id: Date.now().toString(),
          text: `✅ Trade executed successfully! ${selectedTrade.action.toUpperCase()} ${selectedTrade.quantity} shares of ${selectedTrade.symbol}`,
          sender: 'agent',
          timestamp: new Date(),
          agentName: currentAgent?.name
        };
        setMessages(prev => [...prev, successMessage]);
      } else {
        throw new Error(result.message || 'Trade execution failed');
      }
    } catch (error) {
      console.error('Trade execution error:', error);
      // Add error message to chat
      const errorMessage: Message = {
        id: Date.now().toString(),
        text: `❌ Trade execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        sender: 'agent',
        timestamp: new Date(),
        agentName: currentAgent?.name
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsExecutingTrade(false);
      setShowTradeConfirmation(false);
      setSelectedTrade(null);
    }
  };

  const generateSuggestions = (agentId: string) => {
    const suggestions = {
      "wharton-buffest": ["Show me value opportunities", "Analyze dividend stocks", "Risk assessment please", "Portfolio allocation review"],
      "melvin-arck": ["What's the next big trade?", "High-growth opportunities", "Sector rotation plays", "Market momentum analysis"],
      "jane-quant": ["Show me the data", "Algorithm recommendations", "Quantitative metrics", "Statistical analysis"]
    };

    return suggestions[agentId as keyof typeof suggestions] || ["Market analysis", "Portfolio review", "Investment strategy"];
  };

  const generateAgentResponse = (userInput: string, agentId: string) => {
    const responses = {
      "wharton-buffest": {
        text: "Based on fundamental analysis, I recommend focusing on undervalued companies with strong competitive moats. Your current AAPL position shows solid value characteristics, while I'd suggest reducing exposure to more speculative positions like TSLA until we see better entry points.",
        suggestions: generateSuggestions(agentId)
      },
      "melvin-arck": {
        text: "The market's showing some explosive potential right now! With the Fed signaling rate cuts, growth stocks like TSLA could see massive upside. I'm seeing breakout patterns in tech sectors - this could be our moment to capitalize on volatility!",
        suggestions: generateSuggestions(agentId)
      },
      "jane-quant": {
        text: "My algorithms indicate a 72% probability of continued tech sector outperformance based on earnings momentum and options flow data. The quantitative models suggest optimal portfolio allocation should increase tech exposure by 12% while reducing energy positions.",
        suggestions: generateSuggestions(agentId)
      }
    };

    return responses[agentId as keyof typeof responses] || {
      text: "I'd be happy to help you with that. Let me analyze the current market conditions and provide you with tailored advice.",
      suggestions: generateSuggestions(agentId)
    };
  };

  if (!selectedAgent) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent className="text-center space-y-4">
          <Bot className="h-16 w-16 text-muted-foreground mx-auto" />
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Select an AI Advisor</h3>
            <p className="text-muted-foreground">
              Choose your preferred AI financial advisor to start getting personalized investment guidance.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <div className="p-2 rounded-full gradient-primary">
            <Bot className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <span>{currentAgent?.name}</span>
            <Badge variant="secondary" className="ml-2 text-xs">
              Active
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages Area */}
        <ScrollArea className="flex-1 px-6" ref={scrollAreaRef}>
          <div className="space-y-4 py-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex gap-3 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex gap-3 max-w-[80%] ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`p-2 rounded-full ${message.sender === 'user' ? 'bg-primary text-primary-foreground' : 'gradient-card'}`}>
                    {message.sender === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div className={`space-y-2 ${message.sender === 'user' ? 'text-right' : 'text-left'}`}>
                    <div className={`rounded-lg p-4 ${
                      message.sender === 'user' 
                        ? 'gradient-primary text-primary-foreground' 
                        : 'gradient-card border'
                    }`}>
                      <p className="text-sm leading-relaxed">{message.text}</p>
                    </div>
                    {message.suggestions && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {message.suggestions.map((suggestion, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="text-xs h-7"
                          >
                            {suggestion}
                          </Button>
                        ))}
                      </div>
                    )}
                    {message.tradeSuggestions && message.tradeSuggestions.length > 0 && (
                      <div className="space-y-2 mt-3">
                        <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          Trade Suggestions
                        </div>
                        {message.tradeSuggestions.map((trade, index) => (
                          <div key={index} className="border rounded-lg p-3 bg-muted/50">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Badge variant={trade.action === 'buy' ? 'default' : 'destructive'}>
                                  {trade.action.toUpperCase()}
                                </Badge>
                                <span className="font-medium">{trade.symbol}</span>
                                <span className="text-sm text-muted-foreground">{trade.quantity} shares</span>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {Math.round(trade.confidence * 100)}% confidence
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">{trade.reasoning}</p>
                            <Button
                              size="sm"
                              onClick={() => handleTradeClick(trade)}
                              className="w-full text-xs h-7"
                              variant="default"
                            >
                              <DollarSign className="h-3 w-3 mr-1" />
                              Execute Trade
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex gap-3">
                <div className="p-2 rounded-full gradient-card">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="gradient-card border rounded-lg p-4">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse"></div>
                    <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse delay-100"></div>
                    <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse delay-200"></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t p-6">
          <div className="flex gap-3">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={`Ask ${currentAgent?.name} for investment advice...`}
              className="flex-1"
            />
            <Button 
              variant="financial" 
              size="icon"
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isTyping}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>

      {/* Trade Confirmation Dialog */}
      <Dialog open={showTradeConfirmation} onOpenChange={setShowTradeConfirmation}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Confirm Trade Execution
            </DialogTitle>
            <DialogDescription>
              Review the trade details before execution. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {selectedTrade && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Action</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={selectedTrade.action === 'buy' ? 'default' : 'destructive'}>
                      {selectedTrade.action.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Symbol</label>
                  <p className="font-medium mt-1">{selectedTrade.symbol}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Quantity</label>
                  <p className="font-medium mt-1">{selectedTrade.quantity} shares</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Confidence</label>
                  <p className="font-medium mt-1">{Math.round(selectedTrade.confidence * 100)}%</p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">AI Reasoning</label>
                <p className="text-sm mt-1 p-3 bg-muted rounded-lg">{selectedTrade.reasoning}</p>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowTradeConfirmation(false)}
              disabled={isExecutingTrade}
            >
              Cancel
            </Button>
            <Button
              onClick={executeTrade}
              disabled={isExecutingTrade}
              className="flex items-center gap-2"
            >
              {isExecutingTrade ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Execute Trade
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};