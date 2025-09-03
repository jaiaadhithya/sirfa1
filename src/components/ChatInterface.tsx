import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, TrendingUp, AlertTriangle } from "lucide-react";

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'agent';
  timestamp: Date;
  agentName?: string;
  suggestions?: string[];
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
        suggestions: [
          "Review my portfolio allocation",
          "What are today's market opportunities?", 
          "Analyze recent news impact",
          "Should I rebalance my holdings?"
        ]
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
    setInputValue('');
    setIsTyping(true);

    // Simulate agent response
    setTimeout(() => {
      const agentResponse = generateAgentResponse(inputValue, selectedAgent!);
      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: agentResponse.text,
        sender: 'agent',
        timestamp: new Date(),
        agentName: currentAgent.name,
        suggestions: agentResponse.suggestions
      };
      
      setMessages(prev => [...prev, agentMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
  };

  const generateAgentResponse = (userInput: string, agentId: string) => {
    const responses = {
      "wharton-buffest": {
        text: "Based on fundamental analysis, I recommend focusing on undervalued companies with strong competitive moats. Your current AAPL position shows solid value characteristics, while I'd suggest reducing exposure to more speculative positions like TSLA until we see better entry points.",
        suggestions: ["Show me value opportunities", "Analyze dividend stocks", "Risk assessment please"]
      },
      "melvin-arck": {
        text: "The market's showing some explosive potential right now! With the Fed signaling rate cuts, growth stocks like TSLA could see massive upside. I'm seeing breakout patterns in tech sectors - this could be our moment to capitalize on volatility!",
        suggestions: ["What's the next big trade?", "High-growth opportunities", "Sector rotation plays"]
      },
      "jane-quant": {
        text: "My algorithms indicate a 72% probability of continued tech sector outperformance based on earnings momentum and options flow data. The quantitative models suggest optimal portfolio allocation should increase tech exposure by 12% while reducing energy positions.",
        suggestions: ["Show me the data", "Algorithm recommendations", "Quantitative metrics"]
      }
    };

    return responses[agentId as keyof typeof responses] || {
      text: "I'd be happy to help you with that. Let me analyze the current market conditions and provide you with tailored advice.",
      suggestions: ["Market analysis", "Portfolio review", "Investment strategy"]
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
    </Card>
  );
};