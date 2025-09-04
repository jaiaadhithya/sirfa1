const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const AlibabaCloudSpeechService = require('../services/alibabaCloudSpeech');
const aiService = require('../services/qwenService');
const router = express.Router();

// Initialize Alibaba Cloud Speech Service
const speechService = new AlibabaCloudSpeechService();

// Configure multer for audio file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'), false);
    }
  }
});

// Keep MockSpeechService as fallback
class MockSpeechService {
  static async speechToText(audioBuffer) {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock transcription responses based on audio characteristics
    const mockResponses = [
      "What's my portfolio performance today?",
      "Show me the latest market trends for tech stocks",
      "What are the current trading recommendations?",
      "How is Apple stock performing?",
      "Give me an analysis of my recent trades",
      "What's the market sentiment for cryptocurrency?",
      "Should I buy or sell Tesla stock?",
      "What are the top performing stocks today?"
    ];
    
    return {
      transcript: mockResponses[Math.floor(Math.random() * mockResponses.length)],
      confidence: 0.95
    };
  }
  
  static async textToSpeech(text) {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // In a real implementation, this would return the actual audio URL
    // For now, we'll return a mock audio URL
    return {
      audioUrl: `/api/voice/audio/${Date.now()}.mp3`,
      duration: Math.floor(text.length / 10) // Rough estimate
    };
  }
}

// AI Agent Response Service using real AI backend
class AIAgentService {
  static async generateResponse(userMessage) {
    try {
      // Create a default agent profile for voice chat
      const agentProfile = {
        id: 'voice-chat-agent',
        name: 'SIRFA Voice Assistant',
        description: 'Professional financial AI assistant specialized in trading analysis and investment advice',
        personality: 'Professional, knowledgeable, and helpful financial advisor',
        speakingStyle: 'Clear, concise, and informative',
        investmentStyle: 'Balanced',
        riskTolerance: 'Moderate'
      };
      
      // Use the real AI service to generate response
      const response = await aiService.generateConversation(userMessage, agentProfile, {
        context: 'voice_chat',
        timestamp: new Date().toISOString()
      });
      
      return response;
    } catch (error) {
      console.error('AI service error in voice chat:', error);
      
      // Fallback to a generic response if AI service fails
      return "I'm here to help with your financial questions. Could you please rephrase your question or try asking about market trends, portfolio analysis, or specific stocks?";
    }
  }
}

// POST /api/voice/speech-to-text
// Convert speech audio to text
router.post('/speech-to-text', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }
    
    console.log('Processing speech-to-text for audio file:', {
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size
    });
    
    // Process audio with Alibaba Cloud Speech Service
    const result = await speechService.speechToText(req.file.buffer);
    
    res.json({
      transcript: result.transcript,
      confidence: result.confidence,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Speech-to-text error:', error);
    res.status(500).json({ 
      error: 'Failed to process speech',
      message: error.message 
    });
  }
});

// POST /api/voice/ai-response
// Get AI agent response to user message
router.post('/ai-response', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    console.log('Generating AI response for message:', message);
    
    // Generate AI response
    const aiResponse = await AIAgentService.generateResponse(message);
    
    // Convert response to speech
    const speechResult = await speechService.textToSpeech(aiResponse);
    
    res.json({
      response: aiResponse,
      audioUrl: speechResult.audioUrl,
      duration: speechResult.duration,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('AI response error:', error);
    res.status(500).json({ 
      error: 'Failed to generate AI response',
      message: error.message 
    });
  }
});

// GET /api/voice/audio/:filename
// Serve generated audio files (mock endpoint)
router.get('/audio/:filename', (req, res) => {
  const { filename } = req.params;
  
  // In a real implementation, this would serve actual audio files
  // For now, we'll return a mock response
  console.log('Audio file requested:', filename);
  
  // Return a small silent audio file as placeholder
  const silentAudioBase64 = 'UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT';
  const audioBuffer = Buffer.from(silentAudioBase64, 'base64');
  
  res.set({
    'Content-Type': 'audio/wav',
    'Content-Length': audioBuffer.length,
    'Cache-Control': 'public, max-age=3600'
  });
  
  res.send(audioBuffer);
});

// GET /api/voice/status
// Get voice service status
router.get('/status', (req, res) => {
  res.json({
    status: 'active',
    services: {
      speechToText: 'available',
      textToSpeech: 'available',
      aiAgent: 'available'
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;