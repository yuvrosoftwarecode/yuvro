import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import apiService from "../../services/api";
import Reports from './Reports';
import './ThankYouScreen.scss';

const ThankYouScreen = ({ onGoBack, selectedRole, selectedDifficulty, selectedDuration, selectedInterviewer }) => {
  const candidateId = useSelector(state => state.user?.candidateId);
  const [candidateName, setCandidateName] = useState('Student');
  const [currentStep, setCurrentStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(true);
  const [showReports, setShowReports] = useState(false);

  const steps = [
    "Uploading your responses...",
    "Analyzing your interview...",
    "Creating actionable feedback..."
  ];

  // Fetch candidate details
  useEffect(() => {
    const fetchCandidateDetails = async () => {
      if (candidateId) {
        try {
          const response = await apiService.getCandidate(candidateId);
          console.log({response});
          if (response && response.name) {
            setCandidateName(response.name || 'Student');
          }
        } catch (error) {
          console.error('Error fetching candidate details:', error);
          setCandidateName('Student');
        }
      }
    };

    fetchCandidateDetails();
  }, [candidateId]);

  // Simulate processing steps
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev < steps.length - 1) {
          return prev + 1;
        } else {
          setIsProcessing(false);
          clearInterval(interval);
          return prev;
        }
      });
    }, 2000); // Change step every 2 seconds

    return () => clearInterval(interval);
  }, [steps.length]);

  const handleViewAnalytics = () => {
    setShowReports(true);
  };

  const handleGoBack = () => {
    // Go back to the interview library (parent component)
    onGoBack();
  };

  const handleTryAgain = () => {
    // This would restart the interview with the same questions
    setShowReports(false);
    // Go back to the interview library to restart
    onGoBack();
  };

  const handleBackFromReports = () => {
    setShowReports(false);
  };

  // Show Reports component if analytics are being viewed
  if (showReports) {
    return (
      <Reports 
        onGoBack={handleBackFromReports}
        onTryAgain={handleTryAgain}
        selectedRole={selectedRole}
        selectedDifficulty={selectedDifficulty}
        selectedDuration={selectedDuration}
        selectedInterviewer={selectedInterviewer}
      />
    );
  }

  return (
    <div className="thank-you-container">
      {/* YURO Logo */}
      {/* <div className="logo-section">
        <div className="yuro-logo">
          <div className="logo-background">
            <span className="logo-text">YURO</span>
          </div>
        </div>
      </div> */}

      {/* Completion Message */}
      <div className="completion-message">
        <h1>Thank you {candidateName}. You have completed the interview.</h1>
      </div>

      {/* Instructional Text */}
      <div className="instructional-text">
        <p>Please wait while we prepare your analytics.</p>
      </div>

      {/* Progress Indicators */}
      <div className="progress-section">
        {steps.map((step, index) => (
          <div key={index} className={`progress-step ${index <= currentStep ? 'completed' : ''}`}>
            <span className="check-icon">
              {index <= currentStep ? '✓' : '○'}
            </span>
            <span className="step-text">{step}</span>
          </div>
        ))}
      </div>

      {/* View Analytics Button */}
      <div className="action-section">
        <button 
          className={`view-analytics-btn ${!isProcessing ? 'ready' : 'disabled'}`}
          onClick={handleViewAnalytics}
          disabled={isProcessing}
        >
          VIEW ANALYTICS
        </button>
      </div>

      {/* Go Back Option */}
      <div className="navigation-section">
        <button className="go-back-link" onClick={handleGoBack}>
          ← Go Back to Interview Library
        </button>
      </div>
    </div>
  );
};

export default ThankYouScreen; 