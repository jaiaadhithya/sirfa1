import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Send, Loader2 } from 'lucide-react';
import './VoiceChat.css';

const VoiceChat = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [messages, setMessages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [error, setError] = useState('');
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    checkMicrophonePermission();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const checkMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermissionGranted(true);
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      setError('Microphone permission denied. Please enable microphone access.');
      setPermissionGranted(false);
    }
  };

  const startRecording = async () => {
    if (!permissionGranted) {
      await checkMicrophonePermission();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        processAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setError('');
    } catch (err) {
      setError('Failed to start recording. Please check your microphone.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudioBlob = async (audioBlob) => {
    setIsProcessing(true);
    
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');

      // Send audio to backend for speech-to-text processing
      const response = await fetch('/api/voice/speech-to-text', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process speech');
      }

      const data = await response.json();
      const userMessage = data.transcript;
      
      if (userMessage.trim()) {
        setTranscript(userMessage);
        
        // Add user message to chat
        const newUserMessage = {
          id: Date.now(),
          type: 'user',
          content: userMessage,
          timestamp: new Date().toLocaleTimeString()
        };
        
        setMessages(prev => [...prev, newUserMessage]);
        
        // Get AI response
        await getAIResponse(userMessage);
      }
    } catch (err) {
      setError('Failed to process speech. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getAIResponse = async (userMessage) => {
    try {
      const response = await fetch('/api/voice/ai-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      
      // Add AI message to chat
      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: data.response,
        timestamp: new Date().toLocaleTimeString(),
        audioUrl: data.audioUrl // URL to the generated speech audio
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      setError('Failed to get AI response. Please try again.');
    }
  };

  const playAudio = async (audioUrl) => {
    if (isPlaying) return;
    
    try {
      setIsPlaying(true);
      audioRef.current = new Audio(audioUrl);
      
      audioRef.current.onended = () => {
        setIsPlaying(false);
      };
      
      audioRef.current.onerror = () => {
        setIsPlaying(false);
        setError('Failed to play audio response.');
      };
      
      await audioRef.current.play();
    } catch (err) {
      setIsPlaying(false);
      setError('Failed to play audio response.');
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const sendTextMessage = async () => {
    if (!transcript.trim()) return;
    
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: transcript,
      timestamp: new Date().toLocaleTimeString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    await getAIResponse(transcript);
    setTranscript('');
  };

  return (
    <div className="voice-chat-container">
      <div className="voice-chat-header">
        <h2>Voice Chat with AI Agent</h2>
        <p>Speak naturally to interact with your financial AI assistant</p>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-state">
            <Mic className="empty-icon" />
            <p>Start a conversation by clicking the microphone button</p>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`message ${message.type}`}>
              <div className="message-content">
                <p>{message.content}</p>
                <span className="message-time">{message.timestamp}</span>
              </div>
              {message.type === 'ai' && message.audioUrl && (
                <button
                  className="play-audio-btn"
                  onClick={() => playAudio(message.audioUrl)}
                  disabled={isPlaying}
                >
                  {isPlaying ? <VolumeX /> : <Volume2 />}
                </button>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="voice-controls">
        <div className="transcript-input">
          <input
            type="text"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Transcript will appear here or type your message..."
            onKeyPress={(e) => e.key === 'Enter' && sendTextMessage()}
          />
          <button
            className="send-btn"
            onClick={sendTextMessage}
            disabled={!transcript.trim()}
          >
            <Send />
          </button>
        </div>
        
        <div className="recording-controls">
          <button
            className={`record-btn ${isRecording ? 'recording' : ''}`}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing || !permissionGranted}
          >
            {isProcessing ? (
              <Loader2 className="spinning" />
            ) : isRecording ? (
              <MicOff />
            ) : (
              <Mic />
            )}
          </button>
          
          {isPlaying && (
            <button className="stop-audio-btn" onClick={stopAudio}>
              <VolumeX />
            </button>
          )}
        </div>
      </div>

      <div className="voice-status">
        {isRecording && <span className="status recording">🔴 Recording...</span>}
        {isProcessing && <span className="status processing">⚡ Processing...</span>}
        {isPlaying && <span className="status playing">🔊 Playing response...</span>}
      </div>
    </div>
  );
};

export default VoiceChat;