import React, { useState, useEffect, useRef } from 'react';
import ThankYouScreen from './ThankYouScreen';
import './InterviewScreen.scss';

const InterviewScreen = ({ 
  selectedRole, 
  selectedDifficulty, 
  selectedDuration, 
  selectedInterviewer, 
  onExitInterview,
  mediaStream
}) => {
  // Convert duration string to seconds (e.g., "15 mins" -> 900 seconds)
  const getDurationInSeconds = (duration) => {
    console.log('getDurationInSeconds called with:', duration, 'type:', typeof duration);
    if (!duration) {
      console.log('No duration provided, defaulting to 225 seconds');
      return 225; // Default to 3:45 if no duration
    }
    
    // Try different patterns
    let match = duration.match(/(\d+)\s*mins?/i);
    if (!match) {
      match = duration.match(/(\d+)/);
    }
    
    const result = match ? parseInt(match[1]) * 60 : 225;
    console.log('Duration parsing result:', { 
      duration, 
      match, 
      result, 
      matchGroups: match ? match[1] : 'no match',
      finalResult: result
    });
    return result;
  };

  const [timeLeft, setTimeLeft] = useState(0); // Start with 0, will be set properly
  const videoRef = useRef(null);
  const conversationEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Log initial props
  console.log('InterviewScreen props:', { selectedRole, selectedDifficulty, selectedDuration, selectedInterviewer });
  const [isRecording, setIsRecording] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [currentUserAnswer, setCurrentUserAnswer] = useState('');
  const [isAITyping, setIsAITyping] = useState(false);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);

  // Sample questions for the interview
  const questions = [
    "Can you tell me about your experience with time management?",
    "How do you handle stressful situations at work?",
    "What are your strengths and weaknesses?",
    "Where do you see yourself in 5 years?",
    "Why should we hire you for this position?"
  ];

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onstart = () => {
        console.log('Speech recognition started successfully');
      };
      
      recognitionRef.current.onresult = (event) => {
        console.log('Speech recognition result:', event);
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          console.log(`Result ${i}:`, transcript, 'isFinal:', event.results[i].isFinal);
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        console.log('Final transcript:', finalTranscript);
        console.log('Interim transcript:', interimTranscript);
        
        // Update the current user answer with both interim and final results
        setCurrentUserAnswer(prev => {
          const baseText = prev.replace(/\[interim\].*$/, ''); // Remove any previous interim text
          const newText = baseText + finalTranscript + (interimTranscript ? ` [interim]${interimTranscript}` : '');
          console.log('Updated user answer:', newText);
          return newText;
        });
      };
      
      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'no-speech') {
          console.log('No speech detected, restarting recognition...');
          // Restart recognition if no speech detected
          if (isRecording) {
            setTimeout(() => {
              try {
                recognitionRef.current.start();
              } catch (error) {
                console.error('Error restarting speech recognition:', error);
              }
            }, 100);
          }
        }
      };
      
      recognitionRef.current.onend = () => {
        console.log('Speech recognition ended');
        // Restart recognition if still recording
        if (isRecording) {
          console.log('Restarting speech recognition...');
          setTimeout(() => {
            try {
              recognitionRef.current.start();
            } catch (error) {
              console.error('Error restarting speech recognition:', error);
            }
          }, 100);
        }
      };
      
      setIsSpeechSupported(true);
      console.log('Speech recognition initialized successfully');
    } else {
      console.log('Speech recognition not supported in this browser');
      setIsSpeechSupported(false);
    }
  }, [isRecording]);

  // Initialize conversation with first AI question
  useEffect(() => {
    if (questions.length > 0) {
      setConversation([
        {
          type: 'ai',
          content: questions[0],
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
    }
  }, []);

  // Scroll to bottom when conversation updates
  useEffect(() => {
    if (conversationEndRef.current) {
      conversationEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversation]);

  // Initialize and reset timer when duration changes
  useEffect(() => {
    console.log('Duration changed to:', selectedDuration);
    
    // Simple fallback approach
    let newTimeLeft = 225; // default
    
    if (selectedDuration === '5 mins') {
      newTimeLeft = 5 * 60; // 300 seconds
    } else if (selectedDuration === '15 mins') {
      newTimeLeft = 15 * 60; // 900 seconds
    } else if (selectedDuration === '30 mins') {
      newTimeLeft = 30 * 60; // 1800 seconds
    } else {
      newTimeLeft = getDurationInSeconds(selectedDuration);
    }
    
    console.log('Setting timeLeft to:', newTimeLeft, 'for duration:', selectedDuration);
    setTimeLeft(newTimeLeft);
  }, [selectedDuration]);

  // Set up user video feed when mediaStream is available
  useEffect(() => {
    if (mediaStream && videoRef.current) {
      console.log('Setting up user video feed...');
      videoRef.current.srcObject = mediaStream;
      
      videoRef.current.onloadedmetadata = () => {
        console.log('User video metadata loaded');
        videoRef.current.play().catch(err => {
          console.error('Error playing user video:', err);
        });
      };

      // If metadata is already loaded, play immediately
      if (videoRef.current.readyState >= 1) {
        console.log('User video metadata already loaded, playing immediately');
        videoRef.current.play().catch(err => {
          console.error('Error playing user video:', err);
        });
      }
    }
  }, [mediaStream]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            // Time's up - end interview
            setShowThankYou(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft]);

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartAnswer = () => {
    if (!isRecording) {
      // Start recording
      setIsRecording(true);
      setIsUserTyping(true);
      setCurrentUserAnswer('');
      
      console.log('Starting answer recording...');
      console.log('Speech supported:', isSpeechSupported);
      console.log('Recognition ref:', recognitionRef.current);
      
      // Start speech recognition
      if (recognitionRef.current && isSpeechSupported) {
        try {
          recognitionRef.current.start();
          console.log('Speech recognition started successfully');
        } catch (error) {
          console.error('Error starting speech recognition:', error);
          // Fallback to simulated text if speech recognition fails
          setTimeout(() => {
            setCurrentUserAnswer('I believe that time management is crucial for productivity...');
            setIsUserTyping(false);
          }, 2000);
        }
      } else if (!isSpeechSupported) {
        console.log('Speech recognition not supported, using fallback');
        // Fallback for browsers without speech recognition
        setTimeout(() => {
          setCurrentUserAnswer('I believe that time management is crucial for productivity...');
          setIsUserTyping(false);
        }, 2000);
      }
    } else {
      // Stop recording and submit answer
      console.log('Stopping answer recording...');
      setIsRecording(false);
      setIsUserTyping(false);
      
      // Stop speech recognition
      if (recognitionRef.current && isSpeechSupported) {
        try {
          recognitionRef.current.stop();
          console.log('Speech recognition stopped');
        } catch (error) {
          console.error('Error stopping speech recognition:', error);
        }
      }
      
      // Clean up the answer text (remove interim markers)
      const cleanAnswer = currentUserAnswer.replace(/\[interim\].*$/, '').trim();
      console.log('Final user answer:', cleanAnswer);
      
      // Add user answer to conversation
      const userMessage = {
        type: 'user',
        content: cleanAnswer || 'Thank you for the question. I would like to answer...',
        timestamp: new Date().toLocaleTimeString()
      };
      
      console.log('Adding user message to conversation:', userMessage);
      setConversation(prev => [...prev, userMessage]);
      setCurrentUserAnswer('');
      
      // Show AI typing indicator
      setIsAITyping(true);
      
      // Simulate AI typing and next question
      setTimeout(() => {
        setIsAITyping(false);
        const nextQuestionIndex = currentQuestionIndex + 1;
        
        if (nextQuestionIndex < questions.length) {
          const aiMessage = {
            type: 'ai',
            content: questions[nextQuestionIndex],
            timestamp: new Date().toLocaleTimeString()
          };
          
          setConversation(prev => [...prev, aiMessage]);
          setCurrentQuestionIndex(nextQuestionIndex);
        } else {
          // Interview completed
          const aiMessage = {
            type: 'ai',
            content: 'Thank you for your responses. The interview is now complete.',
            timestamp: new Date().toLocaleTimeString()
          };
          
          setConversation(prev => [...prev, aiMessage]);
          setTimeout(() => {
            setShowThankYou(true);
          }, 3000);
        }
      }, 3000);
    }
  };

  const handleExitInterview = () => {
    // Stop speech recognition
    if (recognitionRef.current && isSpeechSupported) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Error stopping speech recognition:', error);
      }
    }
    
    // Stop the media stream passed from parent component
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped track:', track.kind);
      });
    }
    
    setShowThankYou(true);
  };



  const handleGoBackToLibrary = () => {
    // Stop speech recognition
    if (recognitionRef.current && isSpeechSupported) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Error stopping speech recognition:', error);
      }
    }
    
    // Don't stop the media stream - let the parent component handle it
    // This allows the stream to be reused when returning to PracticePrerequisite
    
    onExitInterview();
  };

  const handleRefreshQuestion = () => {
    console.log('Refreshing question...');
    // Here you can implement logic to get a new question
  };

  if (showThankYou) {
    return (
      <ThankYouScreen
        onGoBack={handleGoBackToLibrary}
        selectedRole={selectedRole}
        selectedDifficulty={selectedDifficulty}
        selectedDuration={selectedDuration}
        selectedInterviewer={selectedInterviewer}
      />
    );
  }

  return (
    <div className="interview-screen-container">
      {/* Header */}
      <div className="interview-header">
        <h1 className="page-title">Practice Prerequisite</h1>
        <div className="header-buttons">
          {/* <button className="evaluation-criteria-btn">
            <span className="info-icon">ℹ</span>
            EVALUATION CRITERIA
          </button> */}
          <button className="exit-interview-btn" onClick={handleExitInterview}>
            <span className="exit-icon">🚪</span>
            EXIT INTERVIEW
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="interview-content">
        {/* Left Panel - Conversation Area */}
        <div className="question-panel-left">
          <div className="conversation-header">
            <span className="conversation-title">Interview Conversation</span>
            <button className="refresh-btn" onClick={handleRefreshQuestion}>
              <span className="refresh-icon">🔄</span>
            </button>
          </div>
          <div className="conversation-content">
            {conversation.map((message, index) => (
              <div key={index} className={`message ${message.type}`}>
                <div className="message-header">
                  <span className="message-sender">
                    {message.type === 'ai' ? `AI Interviewer` : 'You'}
                  </span>
                  <span className="message-time">{message.timestamp}</span>
                </div>
                <div className="message-content">
                  {message.content}
                </div>
              </div>
            ))}
            
            {/* User typing indicator with live speech */}
            {isUserTyping && (
              <div className="message user typing">
                <div className="message-header">
                  <span className="message-sender">You</span>
                  <span className="message-time">{new Date().toLocaleTimeString()}</span>
                </div>
                <div className="message-content">
                  {currentUserAnswer ? (
                    <div className="live-speech">
                      {currentUserAnswer.replace(/\[interim\].*$/, '')}
                      {currentUserAnswer.includes('[interim]') && (
                        <span className="interim-text">
                          {currentUserAnswer.match(/\[interim\](.*)/)?.[1] || ''}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="typing-indicator">
                      <span className="typing-dot"></span>
                      <span className="typing-dot"></span>
                      <span className="typing-dot"></span>
                      <span>Listening...</span>
                    </div>
                  )}
                  
                  {/* Manual text input fallback */}
                  {!isSpeechSupported && (
                    <div className="manual-input-fallback">
                      <textarea
                        placeholder="Type your answer here..."
                        value={currentUserAnswer}
                        onChange={(e) => setCurrentUserAnswer(e.target.value)}
                        className="manual-input"
                        rows={3}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* AI typing indicator */}
            {isAITyping && (
              <div className="message ai typing">
                <div className="message-header">
                  <span className="message-sender">AI Interviewer</span>
                  <span className="message-time">{new Date().toLocaleTimeString()}</span>
                </div>
                <div className="message-content typing-indicator">
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                  <span>AI is typing...</span>
                </div>
              </div>
            )}
            
            <div ref={conversationEndRef} />
          </div>
        </div>

        {/* Right Panel - AI Interviewer Area */}
        <div className="interviewer-panel-right">
          {/* Main Video Feed */}
          <div className="main-video-feed">
            <div className="interviewer-video">
              <div className="interviewer-placeholder">
                <div className="interviewer-avatar">👨‍💼</div>
                <p>AI Interviewer - {selectedInterviewer}</p>
              </div>
            </div>
            
            {/* Timer Overlay */}
            <div className="timer-overlay">
              <span className="timer-text">{formatTime(timeLeft)}</span>
              {/* Debug info - remove in production */}
              <div style={{ fontSize: '0.6rem', marginTop: '2px', opacity: 0.8 }}>
                Debug: "{selectedDuration}" → {timeLeft}s
              </div>
            </div>

            {/* Start Answer Button */}
            <button 
              className={`start-answer-btn ${isRecording ? 'recording' : ''}`}
              onClick={handleStartAnswer}
              disabled={isAITyping}
            >
              <span className="mic-icon">🎤</span>
              {isRecording ? 'SUBMIT ANSWER' : 'START ANSWER'}
            </button>

            {/* User Video Feed (Small) */}
            <div className="user-video-feed">
              {mediaStream ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="user-video"
                  style={{ display: 'block', width: '100%', height: '100%' }}
                />
              ) : (
                <div className="user-video-placeholder">
                  <span className="user-video-text">You</span>
                </div>
              )}
              <button className="video-settings-btn">
                <span className="settings-icon">⚙</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright Notice */}
      
    </div>
  );
};

export default InterviewScreen; 