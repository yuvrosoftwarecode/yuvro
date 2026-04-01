import React, { useState } from 'react';
import './Reports.scss';

const Reports = ({ onGoBack, onTryAgain, selectedRole, selectedDifficulty, selectedDuration, selectedInterviewer }) => {
  const [selectedQuestion, setSelectedQuestion] = useState(0);
  const [selectedTab, setSelectedTab] = useState('domain');
  const [aiMessages, setAiMessages] = useState([
    {
      type: 'ai',
      content: `Hello! I'm your AI interview coach. I've analyzed your ${selectedRole || 'interview'} performance and I'm here to help you improve. You can ask me questions about your performance, request specific feedback, or get suggestions for improvement. What would you like to know?`,
      timestamp: new Date().toLocaleTimeString()
    }
  ]);
  const [userInput, setUserInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);

  // Sample interview data with dynamic role
  const interviewData = {
    position: selectedRole || 'HR Manager', // Use the selected role from props
    round: selectedDifficulty || 'Behavioral', // Use the selected difficulty
    practicedOn: '27th Jul, 2025 12:18 PM',
    duration: selectedDuration || '15 mins', // Use the selected duration
    interviewer: selectedInterviewer || 'AI Interviewer', // Use the selected interviewer
    overallLevel: 'Professional',
    performance: {
      interviewLevel: { level: 'Professional', percentage: 75, color: '#10b981' },
      domainKnowledge: { level: 'Professional', percentage: 70, color: '#f59e0b' },
      articulation: { level: 'Professional', percentage: 65, color: '#8b5cf6' },
      communication: { level: 'Expert', percentage: 85, color: '#ec4899' }
    },
    questions: [
      {
        question: "Can you give an example of how you have handled stress in a challenging academic or work situation?",
        answer: "I balance my stress, you know, um, noting down all the task which I have received from my manager and make a plan according to it. So, I take regular, you know, mid, mid intervals in between of my work. Um, and I always love to, you know, make a time table and work accordingly. That's how I release most, I cannot take most of the stress on me.",
        feedback: {
          domain: {
            whatWentWell: [
              "You mentioned planning and task management as a way to handle stress, which is a practical approach.",
              "You touched upon the importance of taking breaks, indicating an awareness of the need for self-care."
            ],
            whatCouldBeBetter: [
              "You could have provided a specific example of a challenging situation and how you applied your strategies. For instance, describe a time when you had multiple deadlines and how your planning and breaks helped you manage the workload effectively.",
              "You could elaborate on the types of breaks you take and how they help you to de-stress. For example, do you meditate, take a walk, or engage in a hobby?",
              "You could have discussed additional stress-management techniques you use, such as mindfulness, exercise, or seeking support from colleagues or supervisors.",
              "You could have quantified the impact of your stress management techniques. For example, By implementing these strategies, I was able to complete all tasks on time and reduce your stress levels by X%."
            ],
            missingTerminologies: [
              "Prioritization techniques (e.g. Eisenhower Matrix)",
              "Mindfulness",
              "Time management frameworks (e.g. Pomodoro Technique)",
              "Seeking support/delegation"
            ]
          },
          articulation: {
            whatWentWell: [
              "You communicated your basic approach to stress management.",
              "You showed awareness of the importance of planning."
            ],
            whatCouldBeBetter: [
              "Reduce filler words like 'you know' and 'um' for more professional communication.",
              "Use more specific and concrete examples instead of general statements.",
              "Structure your response more clearly with a beginning, middle, and end."
            ],
            missingTerminologies: [
              "STAR method",
              "Specific examples",
              "Quantifiable results",
              "Professional language"
            ]
          },
          communication: {
            whatWentWell: [
              "You attempted to answer the question directly.",
              "You showed some self-awareness about your stress management approach."
            ],
            whatCouldBeBetter: [
              "Practice active listening and respond more directly to the specific question asked.",
              "Use more confident and assertive language.",
              "Maintain better eye contact and body language during responses."
            ],
            missingTerminologies: [
              "Confidence indicators",
              "Professional demeanor",
              "Clear communication structure"
            ]
          }
        },
        recommendedResponse: {
          situation: "As an HR intern, I was coordinating a training program while the HR Director was unexpectedly absent due to a family emergency.",
          task: "I had to manage the increased workload and tight deadlines for both the training program and the Director's responsibilities.",
          action: "I created a prioritized task list using the Eisenhower Matrix, delegated simpler tasks to other team members, triaged emails based on urgency, scheduled meetings efficiently, implemented regular check-ins with my supervisor, and used time-blocking techniques with 25-minute focused work sessions followed by 5-minute breaks.",
          result: "The training program was executed successfully, the HR department ran smoothly, and I learned valuable lessons about prioritization, delegation, communication, and the benefits of short, focused breaks."
        }
      },
      {
        question: "How do you handle conflicts in the workplace?",
        answer: "I try to stay calm and listen to both sides. I think communication is important.",
        feedback: {
          domain: {
            whatWentWell: ["You mentioned the importance of staying calm and listening."],
            whatCouldBeBetter: ["Provide specific conflict resolution techniques and examples."],
            missingTerminologies: ["Conflict resolution frameworks", "Mediation techniques", "Active listening"]
          },
          articulation: {
            whatWentWell: ["Brief and to the point."],
            whatCouldBeBetter: ["Too brief - needs more detail and examples."],
            missingTerminologies: ["Detailed examples", "Specific techniques"]
          },
          communication: {
            whatWentWell: ["Direct response."],
            whatCouldBeBetter: ["Needs more elaboration and confidence."],
            missingTerminologies: ["Confidence indicators", "Detailed communication"]
          }
        },
        recommendedResponse: {
          situation: "Two team members disagreed on project priorities.",
          task: "Resolve the conflict while maintaining team productivity.",
          action: "Scheduled a private meeting, used active listening, identified common goals, and facilitated a compromise.",
          result: "Team members reached agreement and project continued successfully."
        }
      },
      {
        question: "What are your strengths and weaknesses?",
        answer: "My strength is being organized. My weakness is sometimes I work too hard.",
        feedback: {
          domain: {
            whatWentWell: ["You identified a genuine strength."],
            whatCouldBeBetter: ["Provide specific examples and better weakness framing."],
            missingTerminologies: ["Specific examples", "Growth mindset", "Improvement strategies"]
          },
          articulation: {
            whatWentWell: ["Concise response."],
            whatCouldBeBetter: ["Needs more detail and professional framing."],
            missingTerminologies: ["Detailed examples", "Professional language"]
          },
          communication: {
            whatWentWell: ["Direct answer."],
            whatCouldBeBetter: ["Needs more confidence and detail."],
            missingTerminologies: ["Confidence indicators", "Value proposition"]
          }
        },
        recommendedResponse: {
          situation: "Discussing personal and professional development.",
          task: "Present strengths and weaknesses professionally.",
          action: "Provided specific examples of organizational skills and framed weakness as growth opportunity.",
          result: "Demonstrated self-awareness and commitment to improvement."
        }
      },
      {
        question: "Where do you see yourself in 5 years?",
        answer: "I hope to be in a management position and have grown in my career.",
        feedback: {
          domain: {
            whatWentWell: ["Shows career ambition."],
            whatCouldBeBetter: ["Be more specific about goals and industry."],
            missingTerminologies: ["Specific career goals", "Industry knowledge", "Skill development"]
          },
          articulation: {
            whatWentWell: ["Clear basic response."],
            whatCouldBeBetter: ["Needs more detail and specificity."],
            missingTerminologies: ["Specific goals", "Detailed planning"]
          },
          communication: {
            whatWentWell: ["Direct answer."],
            whatCouldBeBetter: ["Needs more confidence and detail."],
            missingTerminologies: ["Confidence indicators", "Detailed communication"]
          }
        },
        recommendedResponse: {
          situation: "Discussing long-term career aspirations.",
          task: "Present realistic and ambitious career goals.",
          action: "Outlined specific management skills to develop and industry knowledge to gain.",
          result: "Demonstrated clear career vision and planning."
        }
      },
      {
        question: "Why should we hire you?",
        answer: "I'm hardworking and I really want this job. I think I can contribute to the team.",
        feedback: {
          domain: {
            whatWentWell: ["Shows enthusiasm and work ethic."],
            whatCouldBeBetter: ["Provide specific skills and achievements."],
            missingTerminologies: ["Specific achievements", "Relevant skills", "Value proposition"]
          },
          articulation: {
            whatWentWell: ["Shows enthusiasm."],
            whatCouldBeBetter: ["Needs more specific examples and professional language."],
            missingTerminologies: ["Specific examples", "Professional language"]
          },
          communication: {
            whatWentWell: ["Shows interest."],
            whatCouldBeBetter: ["Needs more confidence and specific value proposition."],
            missingTerminologies: ["Confidence indicators", "Value proposition"]
          }
        },
        recommendedResponse: {
          situation: "Making a case for employment.",
          task: "Present unique value proposition and relevant skills.",
          action: "Highlighted specific achievements, relevant skills, and cultural fit.",
          result: "Demonstrated clear value and fit for the position."
        }
      }
    ]
  };

  // AI response generator based on user questions
  const generateAIResponse = (userQuestion) => {
    const question = userQuestion.toLowerCase();
    
    // Performance analysis responses
    if (question.includes('performance') || question.includes('how did i do')) {
      return `Based on your interview performance, you achieved a "Professional" level overall. Your strongest area is Communication (Expert level), while your Domain Knowledge and Articulation need improvement. You scored well in providing basic answers but could benefit from more specific examples and professional language.`;
    }
    
    if (question.includes('improve') || question.includes('better')) {
      return `To improve your interview performance, I recommend: 1) Practice the STAR method for structured responses, 2) Reduce filler words like "um" and "you know", 3) Prepare specific examples for common questions, 4) Work on confidence indicators in your communication, 5) Research industry-specific terminologies for your target role.`;
    }
    
    if (question.includes('strength') || question.includes('strong')) {
      return `Your main strengths are: 1) Communication skills (Expert level), 2) Basic understanding of interview questions, 3) Enthusiasm and willingness to answer, 4) Awareness of stress management techniques. Focus on building upon these strengths while addressing areas for improvement.`;
    }
    
    if (question.includes('weakness') || question.includes('weak')) {
      return `Areas for improvement include: 1) Using too many filler words ("um", "you know"), 2) Lack of specific examples in responses, 3) Missing professional terminologies, 4) Brief answers that need more detail, 5) Confidence indicators in communication. These can be improved with practice and preparation.`;
    }
    
    if (question.includes('star') || question.includes('method')) {
      return `The STAR method is a structured approach to answering behavioral questions: S - Situation (describe the context), T - Task (explain your responsibility), A - Action (detail what you did), R - Result (share the outcome). For example, instead of saying "I'm organized," say "When I had to manage 5 projects simultaneously (Situation), my task was to ensure all deadlines were met (Task), so I created a priority matrix and scheduled daily check-ins (Action), resulting in 100% on-time delivery (Result)."`;
    }
    
    if (question.includes('question') || question.includes('answer')) {
      return `Looking at your answers, you tended to be brief and use filler words. For better responses: 1) Use the STAR method, 2) Provide specific examples, 3) Quantify results when possible, 4) Use professional language, 5) Structure your thoughts before speaking. Practice these techniques to improve your interview performance.`;
    }
    
    if (question.includes('next') || question.includes('practice')) {
      return `For your next practice session, I recommend: 1) Focus on the questions you struggled with most, 2) Practice the STAR method with real examples from your experience, 3) Record yourself answering questions to identify filler words, 4) Research common questions for ${selectedRole || 'your target role'}, 5) Work on confidence-building exercises.`;
    }
    
    // Default response
    return `I'm here to help you improve your interview skills! You can ask me about your performance, how to improve specific areas, the STAR method, or any other interview-related questions. What specific aspect would you like to focus on?`;
  };

  const handleSendMessage = async () => {
    if (!userInput.trim()) return;

    // Add user message
    const userMessage = {
      type: 'user',
      content: userInput,
      timestamp: new Date().toLocaleTimeString()
    };
    
    setAiMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setIsAiTyping(true);

    // Simulate AI thinking and response
    setTimeout(() => {
      const aiResponse = generateAIResponse(userInput);
      const aiMessage = {
        type: 'ai',
        content: aiResponse,
        timestamp: new Date().toLocaleTimeString()
      };
      
      setAiMessages(prev => [...prev, aiMessage]);
      setIsAiTyping(false);
    }, 1500);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderDonutChart = (data) => {
    const { level, percentage, color } = data;
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div className="donut-chart">
        <svg width="120" height="120" viewBox="0 0 120 120">
          {/* Background circle */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="12"
          />
          {/* Progress circle */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(-90 60 60)"
          />
        </svg>
        <div className="chart-label" style={{ color }}>
          {level}
        </div>
      </div>
    );
  };

  const renderFeedbackTable = (feedback) => {
    const currentFeedback = feedback[selectedTab];
    
    return (
      <div className="feedback-table">
        <div className="feedback-section">
          <h4>What went well:</h4>
          <ul>
            {currentFeedback.whatWentWell.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
        
        <div className="feedback-section">
          <h4>What could be better:</h4>
          <ul>
            {currentFeedback.whatCouldBeBetter.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
        
        <div className="feedback-section">
          <h4>Missing Terminologies:</h4>
          <ul>
            {currentFeedback.missingTerminologies.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Main Reports Container */}
      <div className="reports-container">
        {/* Report Download Section */}
        <div className="report-download-section">
          <div className="download-header">
            <h2>Interview Report</h2>
            <p>Download your detailed interview analysis and feedback</p>
          </div>
          <div className="download-actions">
            <button className="download-btn report">
              <span className="icon">📄</span>
              DOWNLOAD REPORT
            </button>
          </div>
        </div>

        {/* Performance Level Indicator */}
        <div className="performance-level">
          <div className="level-indicator">
            <div className="level-bar">
              <div className="level-sections">
                <span className="level">Incomplete Response</span>
                <span className="level">Entry-Level</span>
                <span className="level active">Professional</span>
                <span className="level">Advanced Professional</span>
                <span className="level">Expert</span>
                <span className="level">Extraordinary</span>
              </div>
              <div className="level-progress">
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: '60%' }}></div>
                </div>
                <div className="current-position">
                  <span className="arrow">↓</span>
                  <span className="position-text">You Are Here</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="performance-metrics">
          <div className="metric-card">
            <h3>Interview Level</h3>
            {renderDonutChart(interviewData.performance.interviewLevel)}
          </div>
          <div className="metric-card">
            <h3>Domain Knowledge</h3>
            {renderDonutChart(interviewData.performance.domainKnowledge)}
          </div>
          <div className="metric-card">
            <h3>Articulation</h3>
            {renderDonutChart(interviewData.performance.articulation)}
          </div>
          <div className="metric-card">
            <h3>Communication</h3>
            {renderDonutChart(interviewData.performance.communication)}
          </div>
        </div>

        {/* Question Analysis */}
        <div className="question-analysis">
          <div className="question-nav">
            {interviewData.questions.map((_, index) => (
              <button
                key={index}
                className={`question-nav-btn ${selectedQuestion === index ? 'active' : ''}`}
                onClick={() => setSelectedQuestion(index)}
              >
                Q{index + 1}
              </button>
            ))}
          </div>

          <div className="analysis-content">
            <div className="question-section">
              <h3>Q: {interviewData.questions[selectedQuestion].question}</h3>
              <div className="answer-section">
                <h4>Your Answer:</h4>
                <p>{interviewData.questions[selectedQuestion].answer}</p>
              </div>
            </div>

            <div className="feedback-section">
              <div className="feedback-tabs">
                <button
                  className={`feedback-tab ${selectedTab === 'domain' ? 'active' : ''}`}
                  onClick={() => setSelectedTab('domain')}
                >
                  Domain Knowledge
                </button>
                <button
                  className={`feedback-tab ${selectedTab === 'articulation' ? 'active' : ''}`}
                  onClick={() => setSelectedTab('articulation')}
                >
                  Articulation
                </button>
                <button
                  className={`feedback-tab ${selectedTab === 'communication' ? 'active' : ''}`}
                  onClick={() => setSelectedTab('communication')}
                >
                  Communication
                </button>
              </div>

              <div className="feedback-content">
                {renderFeedbackTable(interviewData.questions[selectedQuestion].feedback)}
              </div>
            </div>

            <div className="recommended-response">
              <h4>Recommended Response</h4>
              <div className="star-method">
                <div className="star-item">
                  <strong>Situation:</strong> {interviewData.questions[selectedQuestion].recommendedResponse.situation}
                </div>
                <div className="star-item">
                  <strong>Task:</strong> {interviewData.questions[selectedQuestion].recommendedResponse.task}
                </div>
                <div className="star-item">
                  <strong>Action:</strong> {interviewData.questions[selectedQuestion].recommendedResponse.action}
                </div>
                <div className="star-item">
                  <strong>Result:</strong> {interviewData.questions[selectedQuestion].recommendedResponse.result}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Back Button */}
        <div className="back-section">
          <button className="back-btn" onClick={onGoBack}>
            ← Back to Interview Library
          </button>
        </div>
      </div>

      {/* AI Assistant Panel - Separate Container */}
      <div className="ai-assistant-panel">
        <div className="ai-header">
          <div className="ai-avatar">
            <span className="ai-icon">🤖</span>
          </div>
          <div className="ai-info">
            <h3>AI Interview Coach</h3>
            <p>Ask me anything about your performance</p>
          </div>
        </div>

        <div className="ai-chat-container">
          <div className="ai-messages">
            {aiMessages.map((message, index) => (
              <div key={index} className={`ai-message ${message.type}`}>
                <div className="message-content">
                  {message.content}
                </div>
                <div className="message-time">{message.timestamp}</div>
              </div>
            ))}
            
            {isAiTyping && (
              <div className="ai-message ai typing">
                <div className="typing-indicator">
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                  <span>AI is thinking...</span>
                </div>
              </div>
            )}
          </div>

          <div className="ai-input-section">
            <div className="input-container">
              <textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me about your performance, improvement tips, or any interview questions..."
                className="ai-input"
                rows={2}
              />
              <button 
                className="send-btn"
                onClick={handleSendMessage}
                disabled={!userInput.trim() || isAiTyping}
              >
                <span className="send-icon">📤</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Reports; 