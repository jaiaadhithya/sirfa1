import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AgentSelector } from './AgentSelector';
import { Portfolio } from './Portfolio';
import { NewsFeed } from './NewsFeed';
import { ChatInterface } from './ChatInterface';
import { 
  BarChart3, 
  MessageCircle, 
  Newspaper, 
  Settings, 
  Bell,
  Wallet,
  User
} from 'lucide-react';

export const Dashboard = () => {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('portfolio');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="gradient-hero shadow-financial sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-white/10">
                <Wallet className="h-8 w-8 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-primary-foreground">SIRFA</h1>
                <p className="text-primary-foreground/80 text-sm">AI Financial Advisor</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="bg-white/10 text-primary-foreground border-white/20">
                {selectedAgent ? 'Agent Active' : 'No Agent Selected'}
              </Badge>
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-white/10">
                <Bell className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-white/10">
                <Settings className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-white/10">
                <User className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4">
            <TabsTrigger value="portfolio" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Portfolio</span>
            </TabsTrigger>
            <TabsTrigger value="agents" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              <span className="hidden sm:inline">AI Advisors</span>
            </TabsTrigger>
            <TabsTrigger value="news" className="flex items-center gap-2">
              <Newspaper className="h-4 w-4" />
              <span className="hidden sm:inline">Market News</span>
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Chat</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="portfolio" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold">Portfolio Dashboard</h2>
                <p className="text-muted-foreground">
                  Real-time overview of your investments and performance
                </p>
              </div>
              {selectedAgent && (
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
                    <span className="text-sm font-medium">
                      {selectedAgent.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} Active
                    </span>
                  </div>
                </Card>
              )}
            </div>
            <Portfolio />
          </TabsContent>

          <TabsContent value="agents" className="space-y-6">
            <AgentSelector 
              selectedAgent={selectedAgent}
              onAgentSelect={setSelectedAgent}
            />
          </TabsContent>

          <TabsContent value="news" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <NewsFeed />
              </div>
              <div className="space-y-6">
                {/* Market Summary Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>Market Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">S&P 500</span>
                      <div className="text-right">
                        <div className="font-semibold">4,327.18</div>
                        <div className="text-success text-sm">+1.2%</div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">NASDAQ</span>
                      <div className="text-right">
                        <div className="font-semibold">13,567.98</div>
                        <div className="text-success text-sm">+1.8%</div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Dow Jones</span>
                      <div className="text-right">
                        <div className="font-semibold">34,892.12</div>
                        <div className="text-success text-sm">+0.9%</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button variant="financial" size="financial" className="w-full">
                      Get AI Market Analysis
                    </Button>
                    <Button variant="outline" className="w-full">
                      Set Price Alert
                    </Button>
                    <Button variant="outline" className="w-full">
                      Export News Summary
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="chat" className="h-[600px]">
            <ChatInterface selectedAgent={selectedAgent} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};