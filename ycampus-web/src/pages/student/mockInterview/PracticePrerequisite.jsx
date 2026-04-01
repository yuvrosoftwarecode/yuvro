import React, { useState, useEffect, useRef } from 'react';
import InterviewScreen from './InterviewScreen';
import './PracticePrerequisite.scss';

const PracticePrerequisite = ({ 
  selectedRole, 
  selectedDifficulty, 
  selectedDuration, 
  selectedInterviewer, 
  onGoBack 
}) => {
  const [showInterview, setShowInterview] = useState(false);
  const [cameraAccess, setCameraAccess] = useState(false);
  const [microphoneAccess, setMicrophoneAccess] = useState(false);
  const [browserCompatible, setBrowserCompatible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Check browser compatibility and automatically request media access
  useEffect(() => {
    const initializeMediaAccess = async () => {
      // Check browser compatibility
      const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      const hasWebRTC = !!(window.RTCPeerConnection || window.webkitRTCPeerConnection);
      
      if (hasGetUserMedia && hasWebRTC) {
        setBrowserCompatible(true);
        
        // Only request media access if we don't already have a stream
        if (!streamRef.current) {
          // Automatically request camera and microphone access
          try {
            setIsLoading(true);
            setError(null);

            const stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: true
            });

            streamRef.current = stream;
            
            // Check if we have video and audio tracks
            const videoTrack = stream.getVideoTracks()[0];
            const audioTrack = stream.getAudioTracks()[0];

            setCameraAccess(!!videoTrack);
            setMicrophoneAccess(!!audioTrack);
            setVideoReady(true);
            setIsLoading(false);
          } catch (err) {
            console.error('Error accessing media devices:', err);
            setError('Failed to access camera and microphone. Please check your permissions and refresh the page.');
            setIsLoading(false);
          }
        } else {
          // We already have a stream, just set the states
          const videoTrack = streamRef.current.getVideoTracks()[0];
          const audioTrack = streamRef.current.getAudioTracks()[0];
          
          setCameraAccess(!!videoTrack);
          setMicrophoneAccess(!!audioTrack);
          setVideoReady(true);
          setIsLoading(false);
        }
      } else {
        setError('Your browser does not support WebRTC. Please use a modern browser like Chrome, Firefox, or Safari.');
        setIsLoading(false);
      }
    };

    initializeMediaAccess();
  }, []);

  // Handle video setup when videoReady changes
  useEffect(() => {
    if (videoReady && videoRef.current && streamRef.current) {
      console.log('Setting up video element...');
      videoRef.current.srcObject = streamRef.current;
      
      const playVideo = () => {
        // Add null check to prevent the error
        if (!videoRef.current) {
          console.log('Video ref is null, skipping play');
          return;
        }
        
        if (!videoRef.current.paused) {
          console.log('Video is already playing');
          return;
        }
        
        videoRef.current.play().then(() => {
          console.log('Video started playing successfully');
        }).catch(err => {
          console.error('Error playing video:', err);
        });
      };

      // Wait for metadata to load
      videoRef.current.onloadedmetadata = () => {
        console.log('Video metadata loaded');
        // Add null check before calling playVideo
        if (videoRef.current) {
          playVideo();
        }
      };

      // If metadata is already loaded, play immediately
      if (videoRef.current.readyState >= 1) {
        console.log('Video metadata already loaded, playing immediately');
        playVideo();
      }
    }
  }, [videoReady]);

  // Cleanup stream when component unmounts
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleStartPractice = () => {
    setShowInterview(true);
  };

  const handleExitInterview = () => {
    // Don't stop the stream when exiting interview - keep it for reuse
    setShowInterview(false);
    // Reset any interview state if needed
  };

  const handleGoBack = () => {
    // Stop the stream when going back to interview library
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    onGoBack();
  };

  // Check if all prerequisites are met
  const canStartPractice = browserCompatible && cameraAccess && microphoneAccess;

  if (showInterview) {
    return (
      <InterviewScreen
        selectedRole={selectedRole}
        selectedDifficulty={selectedDifficulty}
        selectedDuration={selectedDuration}
        selectedInterviewer={selectedInterviewer}
        onExitInterview={handleExitInterview}
        mediaStream={streamRef.current}
      />
    );
  }

  return (
    <div className="practice-prerequisite-container">
      {/* Header */}
      <div className="prerequisite-header">
        <h1 className="page-title">Practice Prerequisite</h1>
      </div>

      {/* Main Content */}
      <div className="prerequisite-content">
        {/* Left Panel - Compatibility Test */}
        <div className="compatibility-panel">
          <h2 className="panel-title">Compatibility Test</h2>
          
          {/* Camera Feed */}
          <div className="camera-feed">
            {isLoading ? (
              <div className="camera-placeholder">
                <span className="camera-icon">⏳</span>
                <p>Requesting camera access...</p>
              </div>
            ) : error ? (
              <div className="camera-placeholder error">
                <span className="camera-icon">❌</span>
                <p>{error}</p>
                <button className="retry-btn" onClick={() => window.location.reload()}>
                  Refresh Page
                </button>
              </div>
            ) : cameraAccess ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="camera-video"
                style={{ display: 'block', width: '100%', height: '420px' }}
              />
            ) : (
              <div className="camera-placeholder">
                <span className="camera-icon">📹</span>
                <p>Camera access required</p>
              </div>
            )}
          </div>

          {/* Compatibility Checklist */}
          <div className="compatibility-checklist">
            <div className="check-item">
              <span className={`check-icon ${browserCompatible ? 'success' : 'pending'}`}>
                {browserCompatible ? '✅' : '⏳'}
              </span>
              <span>
                {browserCompatible 
                  ? 'Check completed. Your browser is compatible.' 
                  : 'Checking browser compatibility...'
                }
              </span>
            </div>
            <div className="check-item">
              <span className={`check-icon ${microphoneAccess ? 'success' : 'pending'}`}>
                {microphoneAccess ? '✅' : '⏳'}
              </span>
              <span>
                {microphoneAccess 
                  ? 'Test completed. Microphone is enabled.' 
                  : 'Microphone access required.'
                }
              </span>
            </div>
            <div className="check-item">
              <span className={`check-icon ${cameraAccess ? 'success' : 'pending'}`}>
                {cameraAccess ? '✅' : '⏳'}
              </span>
              <span>
                {cameraAccess 
                  ? 'Test completed. Camera is enabled.' 
                  : 'Camera access required.'
                }
              </span>
            </div>
          </div>

          {/* Instructions List */}
          <div className="instructions-list">
            <ol>
              <li>Click on the 'Answer' button to start recording and 'End Answer' button to move to the next question</li>
              <li>Answer all the questions to generate the final analytics report</li>
              <li>Do not worry if the transcription text is not accurate, we will improve that before generating analytics report</li>
              <li>Use your headphone for better experience.</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="prerequisite-footer">
        <button 
          className={`start-practice-btn ${!canStartPractice ? 'disabled' : ''}`} 
          onClick={handleStartPractice}
          disabled={!canStartPractice}
        >
          {canStartPractice ? 'START PRACTICE' : 'PLEASE GRANT ACCESS'}
        </button>
        <button className="go-back-btn" onClick={handleGoBack}>
          GO BACK
        </button>
      </div>
    </div>
  );
};

export default PracticePrerequisite; 