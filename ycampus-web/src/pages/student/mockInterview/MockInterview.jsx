import React, { useState, useEffect } from 'react';
import PracticePrerequisite from './PracticePrerequisite';
import './MockInterview.scss';

const MockInterview = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [selectedDuration, setSelectedDuration] = useState('');
  const [selectedInterviewer, setSelectedInterviewer] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [showPrerequisite, setShowPrerequisite] = useState(false);
  
  // Mock data for interview roles
  const mockRoles = [
    {
      id: 1,
      title: "Java Developer",
      description: "Master Java programming fundamentals, object-oriented design, and enterprise development patterns.",
      category: "Programming",
      level: "Intermediate"
    },
    {
      id: 2,
      title: "Python Developer",
      description: "Learn Python programming, data structures, algorithms, and web development with Django/Flask.",
      category: "Programming",
      level: "Beginner"
    },
    {
      id: 3,
      title: "Frontend Developer",
      description: "Master HTML, CSS, JavaScript, React, and modern frontend development practices.",
      category: "Web Development",
      level: "Intermediate"
    },
    {
      id: 4,
      title: "Data Scientist",
      description: "Learn data analysis, machine learning, statistical modeling, and data visualization.",
      category: "Data Science",
      level: "Advanced"
    },
    {
      id: 5,
      title: "System Design Engineer",
      description: "Master distributed systems, scalability, microservices, and system architecture patterns.",
      category: "System Design",
      level: "Advanced"
    },
    {
      id: 6,
      title: "DevOps Engineer",
      description: "Learn CI/CD pipelines, containerization, cloud platforms, and infrastructure automation.",
      category: "DevOps",
      level: "Intermediate"
    }
  ];

  useEffect(() => {
    // Simulate loading
    setTimeout(() => {
      setRoles(mockRoles);
      setLoading(false);
    }, 1000);
  }, []);

  const handleStartPracticeClick = (role) => {
    setSelectedRole(role);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedRole(null);
    setSelectedDifficulty('');
    setSelectedDuration('');
    setSelectedInterviewer('');
    setAgreeToTerms(false);
  };

  const handleStartInterview = () => {
    if (!selectedDifficulty || !selectedDuration || !selectedInterviewer || !agreeToTerms) {
      alert('Please fill in all required fields and agree to terms.');
      return;
    }
    
    console.log('Starting interview with:', {
      role: selectedRole?.title,
      difficulty: selectedDifficulty,
      duration: selectedDuration,
      interviewer: selectedInterviewer
    });
    
    // Show the prerequisite screen
    setShowPrerequisite(true);
    handleCloseModal();
  };

  const handleStartPractice = () => {
    console.log('Starting actual practice session...');
    // Here you can navigate to the actual interview/practice page
  };

  const handleGoBackFromPrerequisite = () => {
    setShowPrerequisite(false);
  };

  const filteredRoles = roles.filter(role => {
    const matchesSearch = role.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         role.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });



  if (loading) {
    return (
      <div className="mock-interview-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading courses...</p>
        </div>
      </div>
    );
  }

  if (showPrerequisite) {
    return (
      <PracticePrerequisite
        selectedRole={selectedRole}
        selectedDifficulty={selectedDifficulty}
        selectedDuration={selectedDuration}
        selectedInterviewer={selectedInterviewer}
        onStartPractice={handleStartPractice}
        onGoBack={handleGoBackFromPrerequisite}
      />
    );
  }

  return (
    <div className="mock-interview-container">
      {/* Header Section */}
      <div className="header-section">
        <div className="header-content">
          <div className="header-left">
            <h1 className="page-title">Interview Library</h1>
            <p className="page-description">
              View courses tailored for specific roles.
            </p>
          </div>
          <div className="header-right">
            <div className="search-container">
              <i className="search-icon">🔍</i>
              <input
                type="text"
                placeholder="Search Roles"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
          </div>
        </div>
      </div>

     
      {/* Role Cards Section */}
      <div className="courses-section">
        <div className="courses-grid">
          {filteredRoles.map((role) => (
            <div key={role.id} className="course-card">
              <div className="card-header">
                <h3 className="card-title">{role.title}</h3>
                <button className="close-btn">×</button>
              </div>
              <div className="card-body">
                <div className="course-info">
                  <div className="info-row">
                    <span className="info-label">Category:</span>
                    <span className="info-value">{role.category}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Level:</span>
                    <span className="info-value">{role.level}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Description:</span>
                    <span className="info-description">{role.description}</span>
                  </div>
                </div>
              </div>
              <div className="card-footer">
                <button 
                  className="start-practice-btn"
                  onClick={() => handleStartPracticeClick(role)}
                >
                  Start Practice
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interview Details Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Interview Details</h2>
              <button className="modal-close-btn" onClick={handleCloseModal}>×</button>
            </div>
            
            <div className="modal-body">
              {/* Role Information */}
              <div className="role-info">
                <h3>{selectedRole?.title}</h3>
                <div className="role-tags">
                  <span className="role-tag">Role Related</span>
                </div>
              </div>

              {/* Difficulty Level */}
              <div className="form-section">
                <h4>Difficulty Level *</h4>
                <div className="option-buttons">
                  <button 
                    className={`option-btn ${selectedDifficulty === 'Fresher' ? 'selected' : ''}`}
                    onClick={() => setSelectedDifficulty('Fresher')}
                  >
                    Fresher
                  </button>
                  <button 
                    className={`option-btn ${selectedDifficulty === 'Beginner (1-3yrs)' ? 'selected' : ''}`}
                    onClick={() => setSelectedDifficulty('Beginner (1-3yrs)')}
                  >
                    Beginner (1-3yrs)
                  </button>
                  <button 
                    className={`option-btn ${selectedDifficulty === 'Professional (3+ years)' ? 'selected' : ''}`}
                    onClick={() => setSelectedDifficulty('Professional (3+ years)')}
                  >
                    Professional (3+ years)
                  </button>
                </div>
              </div>

              {/* Interview Duration */}
              <div className="form-section">
                <h4>Interview Duration *</h4>
                <div className="option-buttons">
                  <button 
                    className={`option-btn ${selectedDuration === '5 mins' ? 'selected' : ''}`}
                    onClick={() => setSelectedDuration('5 mins')}
                  >
                    5 mins
                  </button>
                  <button 
                    className={`option-btn ${selectedDuration === '15 mins' ? 'selected' : ''}`}
                    onClick={() => setSelectedDuration('15 mins')}
                  >
                    15 mins <span className="crown-icon">👑</span>
                  </button>
                  <button 
                    className={`option-btn ${selectedDuration === '30 mins' ? 'selected' : ''}`}
                    onClick={() => setSelectedDuration('30 mins')}
                  >
                    30 mins <span className="crown-icon">👑</span>
                  </button>
                </div>
              </div>

              {/* Select Interviewer */}
              <div className="form-section">
                <h4>Select Your Interviewer *</h4>
                <div className="interviewer-cards">
                  <div 
                    className={`interviewer-card ${selectedInterviewer === 'Junnu' ? 'selected' : ''}`}
                    onClick={() => setSelectedInterviewer('Junnu')}
                  >
                    <div className="interviewer-avatar">J</div>
                    <div className="interviewer-info">
                      <h5>Junnu</h5>
                      <p>IN English</p>
                    </div>
                  </div>
                  <div 
                    className={`interviewer-card ${selectedInterviewer === 'Munnu' ? 'selected' : ''}`}
                    onClick={() => setSelectedInterviewer('Munnu')}
                  >
                    <div className="interviewer-avatar">M</div>
                    <div className="interviewer-info">
                      <h5>Munnu</h5>
                      <p>US English</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Terms and Conditions */}
              <div className="terms-section">
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={agreeToTerms}
                    onChange={(e) => setAgreeToTerms(e.target.checked)}
                  />
                  <span className="checkmark"></span>
                  I agree with the <span className="terms-link">terms and conditions</span>.
                </label>
              </div>
            </div>

            <div className="modal-footer">
              <button className="start-practice-modal-btn" onClick={handleStartInterview}>
                START PRACTICE
              </button>
              <button className="cancel-btn" onClick={handleCloseModal}>
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MockInterview;
