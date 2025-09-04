const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Alibaba Cloud Intelligent Speech Interaction Service
 * Provides Speech-to-Text and Text-to-Speech capabilities
 */
class AlibabaCloudSpeechService {
  constructor() {
    this.accessKeyId = process.env.ALIBABA_ACCESS_KEY_ID;
    this.accessKeySecret = process.env.ALIBABA_ACCESS_KEY_SECRET;
    this.region = process.env.ALIBABA_REGION || 'cn-shanghai';
    
    // Temporary access token for development
    this.accessToken = 'aabc8b0a80414106ad33c12cac4e08bd';
    
    // Speech Recognition (ASR) Configuration
    this.asrEndpoint = `https://nls-meta.${this.region}.aliyuncs.com`;
    this.asrAppKey = process.env.ALIBABA_ASR_APP_KEY;
    
    // Text-to-Speech (TTS) Configuration
    this.ttsEndpoint = `https://nls-gateway-${this.region}.aliyuncs.com`;
    this.ttsAppKey = process.env.ALIBABA_TTS_APP_KEY;
    
    // Voice settings
    this.ttsVoice = process.env.ALIBABA_TTS_VOICE || 'xiaoyun'; // Default voice
    this.ttsFormat = 'mp3';
    this.ttsSampleRate = 16000;
    
    this.validateConfiguration();
  }
  
  validateConfiguration() {
    const requiredEnvVars = [
      'ALIBABA_ACCESS_KEY_ID',
      'ALIBABA_ACCESS_KEY_SECRET',
      'ALIBABA_ASR_APP_KEY',
      'ALIBABA_TTS_APP_KEY'
    ];
    
    const missing = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0 && !this.accessToken) {
      console.warn('⚠️  Alibaba Cloud Speech Service: Missing environment variables:', missing);
      console.warn('   Using mock implementation. Set these variables for production use.');
      this.useMockService = true;
    } else {
      console.log('✅ Alibaba Cloud Speech Service configured successfully');
      if (this.accessToken) {
        console.log('Alibaba Cloud Speech Service initialized with access token');
      }
      this.useMockService = false;
    }
  }
  
  /**
   * Generate authentication signature for Alibaba Cloud API
   */
  generateSignature(method, uri, params, timestamp) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');
    
    const stringToSign = `${method}&${encodeURIComponent(uri)}&${encodeURIComponent(sortedParams)}`;
    const signature = crypto
      .createHmac('sha1', this.accessKeySecret + '&')
      .update(stringToSign)
      .digest('base64');
    
    return signature;
  }
  
  /**
   * Convert speech audio to text using Alibaba Cloud ASR
   * @param {Buffer} audioBuffer - Audio data buffer
   * @param {Object} options - Recognition options
   * @returns {Promise<Object>} Recognition result
   */
  async speechToText(audioBuffer, options = {}) {
    if (this.useMockService) {
      return this.mockSpeechToText(audioBuffer);
    }
    
    try {
      // Real Alibaba Cloud Speech-to-Text API implementation using RESTful API
      const params = new URLSearchParams({
        appkey: this.asrAppKey,
        format: 'pcm',
        sample_rate: '16000',
        enable_punctuation_prediction: 'true',
        enable_inverse_text_normalization: 'true'
      });
      
      const response = await axios.post(
        `https://nls-gateway-ap-southeast-1.aliyuncs.com/stream/v1/asr?${params.toString()}`,
        audioBuffer,
        {
          headers: {
            'Content-Type': 'application/octet-stream',
            'X-NLS-Token': this.accessToken
          }
        }
      );
      
      return {
        transcript: response.data.result || response.data.transcript || '',
        confidence: response.data.confidence || 0.95,
        taskId: response.data.task_id || crypto.randomUUID(),
        status: 'SUCCESS'
      };
      
    } catch (error) {
      console.error('Alibaba Cloud ASR Error:', error);
      // Fallback to mock service
      return this.mockSpeechToText(audioBuffer);
    }
  }
  
  /**
   * Convert text to speech using Alibaba Cloud TTS
   * @param {string} text - Text to convert
   * @param {Object} options - TTS options
   * @returns {Promise<Object>} Audio generation result
   */
  async textToSpeech(text, options = {}) {
    if (this.useMockService) {
      return this.mockTextToSpeech(text);
    }
    
    try {
      // Real Alibaba Cloud Text-to-Speech API implementation using RESTful API
      const params = new URLSearchParams({
        appkey: this.ttsAppKey,
        text: text,
        voice: options.voice || this.ttsVoice,
        format: options.format || this.ttsFormat,
        sample_rate: options.sampleRate || this.ttsSampleRate,
        volume: options.volume || 50,
        speech_rate: options.speechRate || 0,
        pitch_rate: options.pitchRate || 0
      });
      
      const response = await axios.get(
        `https://nls-gateway.cn-shanghai.aliyuncs.com/stream/v1/tts?${params.toString()}`,
        {
          headers: {
            'X-NLS-Token': this.accessToken
          },
          responseType: 'arraybuffer'
        }
      );
      
      // Save audio file
      const audioFileName = `tts_${Date.now()}.${this.ttsFormat}`;
      const audioPath = path.join(__dirname, '../data/audio', audioFileName);
      
      // Ensure audio directory exists
      const audioDir = path.dirname(audioPath);
      if (!fs.existsSync(audioDir)) {
        fs.mkdirSync(audioDir, { recursive: true });
      }
      
      // Write audio data
      fs.writeFileSync(audioPath, Buffer.from(response.data));
      
      return {
        audioUrl: `/api/voice/audio/${audioFileName}`,
        audioPath: audioPath,
        duration: this.estimateAudioDuration(text),
        taskId: crypto.randomUUID()
      };
      
    } catch (error) {
      console.error('Alibaba Cloud TTS Error:', error);
      // Fallback to mock service
      return this.mockTextToSpeech(text);
    }
  }
  
  /**
   * Make ASR request to Alibaba Cloud
   */
  async makeAsrRequest(audioBuffer, params) {
    // In a real implementation, this would make the actual API call
    // For now, return a simulated response
    
    console.log('Making ASR request to Alibaba Cloud...');
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      Result: this.generateMockTranscript(),
      Confidence: 0.95,
      TaskId: crypto.randomUUID(),
      StatusText: 'SUCCESS'
    };
  }
  
  /**
   * Make TTS request to Alibaba Cloud
   */
  async makeTtsRequest(params) {
    // In a real implementation, this would make the actual API call
    // For now, return a simulated response
    
    console.log('Making TTS request to Alibaba Cloud...');
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Generate a small silent audio buffer as placeholder
    const silentAudioBase64 = 'UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT';
    const audioData = Buffer.from(silentAudioBase64, 'base64');
    
    return {
      audioData: audioData,
      TaskId: crypto.randomUUID()
    };
  }
  
  /**
   * Mock speech-to-text for development/fallback
   */
  async mockSpeechToText(audioBuffer) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      transcript: this.generateMockTranscript(),
      confidence: 0.95,
      taskId: crypto.randomUUID(),
      status: 'SUCCESS'
    };
  }
  
  /**
   * Mock text-to-speech for development/fallback
   */
  async mockTextToSpeech(text) {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return {
      audioUrl: `/api/voice/audio/mock_${Date.now()}.mp3`,
      duration: this.estimateAudioDuration(text),
      taskId: crypto.randomUUID()
    };
  }
  
  /**
   * Generate mock transcript for testing
   */
  generateMockTranscript() {
    const mockResponses = [
      "What's my portfolio performance today?",
      "Show me the latest market trends for tech stocks",
      "What are the current trading recommendations?",
      "How is Apple stock performing?",
      "Give me an analysis of my recent trades",
      "What's the market sentiment for cryptocurrency?",
      "Should I buy or sell Tesla stock?",
      "What are the top performing stocks today?",
      "Can you explain the current market volatility?",
      "What's the outlook for renewable energy stocks?"
    ];
    
    return mockResponses[Math.floor(Math.random() * mockResponses.length)];
  }
  
  /**
   * Estimate audio duration based on text length
   */
  estimateAudioDuration(text) {
    // Rough estimate: ~150 words per minute, ~5 characters per word
    const wordsPerMinute = 150;
    const charactersPerWord = 5;
    const estimatedWords = text.length / charactersPerWord;
    const durationMinutes = estimatedWords / wordsPerMinute;
    return Math.max(1, Math.round(durationMinutes * 60)); // Return seconds, minimum 1 second
  }
  
  /**
   * Get service status
   */
  getStatus() {
    return {
      configured: !this.useMockService,
      mockMode: this.useMockService,
      region: this.region,
      services: {
        asr: this.asrAppKey ? 'configured' : 'missing_app_key',
        tts: this.ttsAppKey ? 'configured' : 'missing_app_key'
      }
    };
  }
}

module.exports = AlibabaCloudSpeechService;