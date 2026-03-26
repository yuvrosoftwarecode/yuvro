import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '@/components/common/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Play, FileText, Code, MessageCircle, Monitor, Send, Bot, User } from 'lucide-react';
import CustomContentSidebar from './CustomContentSidebar';
import CodeEditor from '@/components/ui/code-editor';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import QuizInterface from './QuizInterface';

const SubjectDetail = () => {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('video');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedTopicTitle, setSelectedTopicTitle] = useState<string>('');
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [code, setCode] = useState('');
  const [showQuiz, setShowQuiz] = useState(false);
  
  const subjectNames: Record<string, string> = {
    'matrices-calculus': 'Matrices & Calculus',
    'physics': 'Physics',
    'chemistry': 'Chemistry',
    'english': 'English',
    'programming': 'Programming',
    'engineering-drawing': 'Engineering Drawing',
  };

  const subjectName = subjectNames[subjectId as string] || 'Subject';
  
  const [chatMessages, setChatMessages] = useState<Array<{id: number, text: string, isUser: boolean}>>([
    { id: 1, text: `Hello! I'm your AI learning assistant for ${subjectName}. How can I help you today?`, isUser: false }
  ]);
  const [newMessage, setNewMessage] = useState('');
  



  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    setShowCodeEditor(false);
  };

  const handleTopicSelect = (topicId: string, title: string) => {
    setSelectedTopic(topicId);
    setSelectedTopicTitle(title);
  };

  const handleBackToNotes = () => {
    navigate('/student/notes');
  };

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const userMessage = { id: Date.now(), text: newMessage, isUser: true };
      const aiResponse = { 
        id: Date.now() + 1, 
        text: `I understand you're asking about "${newMessage}". Let me help you with that concept in ${subjectName}.`, 
        isUser: false 
      };
      
      setChatMessages(prev => [...prev, userMessage, aiResponse]);
      setNewMessage('');
    }
  };

  const renderVideoContent = () => {
    const topicContent = selectedTopic && selectedTopicTitle ? (
      <div className="mb-4 p-4 bg-muted/50 rounded-lg">
        <h4 className="font-medium text-sm text-muted-foreground mb-2">Selected Topic:</h4>
        <h3 className="font-semibold text-lg">{selectedTopicTitle}</h3>
      </div>
    ) : null;

    return (
      <div className="space-y-6">
        {topicContent}
        
        {/* Video Container - 30% smaller */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <Monitor className="h-5 w-5" />
              <span>Video Content</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-[70%] mx-auto">
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center border border-border">
                <div className="text-center text-muted-foreground">
                  <Play className="h-12 w-12 mx-auto mb-2" />
                  <p className="text-sm">Video player will be integrated here</p>
                  <p className="text-xs">Learning: {subjectName}</p>
                  {selectedTopicTitle && <p className="text-xs mt-1">Topic: {selectedTopicTitle}</p>}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Assistant Container with Chat */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <MessageCircle className="h-5 w-5" />
              <span>AI Learning Assistant</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="flex flex-col h-[400px]">
              {/* Chat Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {chatMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex items-start space-x-2 ${
                        message.isUser ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {!message.isUser && (
                        <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <div
                        className={`max-w-[70%] p-3 rounded-lg text-sm ${
                          message.isUser
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {message.text}
                      </div>
                      {message.isUser && (
                        <div className="flex-shrink-0 w-8 h-8 bg-secondary/10 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-secondary-foreground" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              {/* Chat Input */}
              <div className="p-4 border-t border-border">
                <div className="flex space-x-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={`Ask me about ${subjectName}...`}
                    className="flex-1"
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <Button 
                    onClick={handleSendMessage}
                    size="sm" 
                    className="px-3"
                    disabled={!newMessage.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                {selectedTopicTitle && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Currently focused on: {selectedTopicTitle}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderTextContent = () => {
    const topicContent = selectedTopic && selectedTopicTitle ? (
      <div className="mb-4 p-4 bg-muted/50 rounded-lg">
        <h4 className="font-medium text-sm text-muted-foreground mb-2">Selected Topic:</h4>
        <h3 className="font-semibold text-lg">{selectedTopicTitle}</h3>
      </div>
    ) : null;

    return (
      <div className="space-y-6">
        {topicContent}
        
        {/* Code Editor Button */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Study Materials</h2>
          <Button
            onClick={() => setShowCodeEditor(!showCodeEditor)}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <Code className="h-4 w-4" />
            <span>{showCodeEditor ? 'Hide Code Editor' : 'Show Code Editor'}</span>
          </Button>
        </div>

        {/* Side by Side Resizable Layout */}
        <ResizablePanelGroup direction="horizontal" className="min-h-[500px] rounded-lg border border-border">
          {/* Notes Container */}
          <ResizablePanel defaultSize={50} minSize={30}>
            <Card className="border-0 h-full rounded-l-lg rounded-r-none">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-lg">
                  <FileText className="h-5 w-5" />
                  <span>Study Notes</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                  <div className="space-y-4">
                    <h4 className="font-semibold text-base">Introduction to {subjectName}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Welcome to {subjectName} study materials. This comprehensive guide covers all the fundamental concepts you need to master.
                    </p>
                    
                    <h4 className="font-semibold text-base pt-4">Key Concepts</h4>
                    <ul className="text-sm text-muted-foreground space-y-2 pl-4">
                      <li>• Core principles and foundations</li>
                      <li>• Best practices and methodologies</li>
                      <li>• Practical applications and examples</li>
                      <li>• Advanced techniques and patterns</li>
                    </ul>

                    <h4 className="font-semibold text-base pt-4">Learning Objectives</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      By completing this course, you will have a solid understanding of {subjectName} fundamentals, 
                      be able to implement basic to intermediate concepts, and develop practical skills for real-world applications.
                    </p>

                    {selectedTopicTitle && (
                      <div className="mt-6 pt-4 border-t border-border">
                        <h4 className="font-semibold text-base">Topic Focus: {selectedTopicTitle}</h4>
                        <p className="text-sm text-muted-foreground mt-2">
                          Detailed content and exercises specific to {selectedTopicTitle} will be displayed here.
                          This includes step-by-step explanations, code examples, and practice problems.
                        </p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* AI Assistant Container with Chat */}
          <ResizablePanel defaultSize={50} minSize={30}>
            <Card className="border-0 h-full rounded-r-lg rounded-l-none">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-lg">
                  <MessageCircle className="h-5 w-5" />
                  <span>AI Learning Assistant</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="flex flex-col h-[400px]">
                  {/* Chat Messages */}
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {chatMessages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex items-start space-x-2 ${
                            message.isUser ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          {!message.isUser && (
                            <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                              <Bot className="h-4 w-4 text-primary" />
                            </div>
                          )}
                          <div
                            className={`max-w-[70%] p-3 rounded-lg text-sm ${
                              message.isUser
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {message.text}
                          </div>
                          {message.isUser && (
                            <div className="flex-shrink-0 w-8 h-8 bg-secondary/10 rounded-full flex items-center justify-center">
                              <User className="h-4 w-4 text-secondary-foreground" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  
                  {/* Chat Input */}
                  <div className="p-4 border-t border-border">
                    <div className="flex space-x-2">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={`Ask me about ${subjectName}...`}
                        className="flex-1"
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      />
                      <Button 
                        onClick={handleSendMessage}
                        size="sm" 
                        className="px-3"
                        disabled={!newMessage.trim()}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                    {selectedTopicTitle && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Currently focused on: {selectedTopicTitle}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    );
  };

  const renderQuizContent = () => {
    return (
      <QuizInterface 
        topicTitle={selectedTopicTitle || subjectName}
        showCodeEditor={showCodeEditor}
        onToggleCodeEditor={() => setShowCodeEditor(!showCodeEditor)}
        code={code}
        onCodeChange={setCode}
      />
    );
  };

  const renderTabContent = (tab: string) => {
    const topicContent = selectedTopic && selectedTopicTitle ? (
      <div className="mb-6 p-4 bg-muted/50 rounded-lg">
        <h4 className="font-medium text-sm text-muted-foreground mb-2">Selected Topic:</h4>
        <h3 className="font-semibold text-lg">{selectedTopicTitle}</h3>
      </div>
    ) : null;

    switch (tab) {
      case 'video':
        return renderVideoContent();
      case 'text':
        return renderTextContent();
      case 'quiz':
        return renderQuizContent();
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-background sticky top-0 z-50">
        <div className="flex items-center h-16 px-6">
          <h1 className="text-xl font-semibold">Study Notes Dashboard - {subjectName}</h1>
        </div>
      </div>
          
          {/* Main Content Layout */}
          <div className="flex flex-1 min-h-0" style={{ height: 'calc(100vh - 64px)' }}>
            {!showCodeEditor ? (
              // Normal Layout - Sidebar + Content
              <>
                <CustomContentSidebar
                  subjectName={subjectName}
                  subjectId={subjectId || ''}
                  onTopicSelect={handleTopicSelect}
                  selectedTopic={selectedTopic}
                  onBackToNotes={handleBackToNotes}
                />
                
                <main className="flex-1 overflow-hidden flex flex-col">
                  {/* Tabs Navigation */}
                  <div className="border-b border-border bg-background">
                    <div className="flex items-center justify-between px-6">
                      <div className="flex items-center space-x-8">
                        <button
                          onClick={() => handleTabChange('video')}
                          className={`relative py-4 text-sm font-medium transition-colors hover:text-foreground ${
                            activeTab === 'video'
                              ? 'text-foreground'
                              : 'text-muted-foreground'
                          }`}
                        >
                          VIDEO
                          {activeTab === 'video' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                          )}
                        </button>
                        <button
                          onClick={() => handleTabChange('text')}
                          className={`relative py-4 text-sm font-medium transition-colors hover:text-foreground ${
                            activeTab === 'text'
                              ? 'text-foreground'
                              : 'text-muted-foreground'
                          }`}
                        >
                          TEXT
                          {activeTab === 'text' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                          )}
                        </button>
                        <button
                          onClick={() => handleTabChange('quiz')}
                          className={`relative py-4 text-sm font-medium transition-colors hover:text-foreground ${
                            activeTab === 'quiz'
                              ? 'text-foreground'
                              : 'text-muted-foreground'
                          }`}
                        >
                          QUIZ
                          {activeTab === 'quiz' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                          )}
                        </button>
                      </div>
                      
                      <Button
                        onClick={() => setShowCodeEditor(!showCodeEditor)}
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Code className="h-4 w-4" />
                        <span>Show Code Editor</span>
                      </Button>
                    </div>
                  </div>
                  
                  {/* Tab Content */}
                  <div className="flex-1 overflow-auto p-6">
                    {renderTabContent(activeTab)}
                  </div>
                </main>
              </>
            ) : (
              // Code Editor Split View - No Sidebar
              <ResizablePanelGroup direction="horizontal" className="w-full">
                <ResizablePanel defaultSize={50} minSize={30}>
                  <div className="h-full overflow-auto">
                    <main className="flex-1 flex flex-col">
                      {/* Tabs Navigation */}
                      <div className="border-b border-border bg-background">
                        <div className="flex items-center justify-between px-6">
                          <div className="flex items-center space-x-8">
                            <button
                              onClick={() => handleTabChange('video')}
                              className={`relative py-4 text-sm font-medium transition-colors hover:text-foreground ${
                                activeTab === 'video'
                                  ? 'text-foreground'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              VIDEO
                              {activeTab === 'video' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                              )}
                            </button>
                            <button
                              onClick={() => handleTabChange('text')}
                              className={`relative py-4 text-sm font-medium transition-colors hover:text-foreground ${
                                activeTab === 'text'
                                  ? 'text-foreground'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              TEXT
                              {activeTab === 'text' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                              )}
                            </button>
                            <button
                              onClick={() => handleTabChange('quiz')}
                              className={`relative py-4 text-sm font-medium transition-colors hover:text-foreground ${
                                activeTab === 'quiz'
                                  ? 'text-foreground'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              QUIZ
                              {activeTab === 'quiz' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                              )}
                            </button>
                          </div>
                          
                          <Button
                            onClick={() => setShowCodeEditor(false)}
                            variant="ghost"
                            size="sm"
                            className="flex items-center gap-2"
                          >
                            <Code className="h-4 w-4" />
                            <span>Hide Code Editor</span>
                          </Button>
                        </div>
                      </div>
                      
                      {/* Tab Content */}
                      <div className="flex-1 overflow-auto p-6">
                        {renderTabContent(activeTab)}
                      </div>
                    </main>
                  </div>
                </ResizablePanel>

                <ResizableHandle withHandle />

                <ResizablePanel defaultSize={50} minSize={30}>
                  <div className="h-full bg-background border-l border-border flex flex-col">
                    <div className="p-4 border-b border-border flex items-center justify-between">
                      <h3 className="font-semibold">Code Editor</h3>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setShowCodeEditor(false)}
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Hide Editor
                      </Button>
                    </div>
                    <div className="flex-1 p-4 overflow-auto">
                      <CodeEditor
                        initialCode={code}
                        language="javascript"
                        onCodeChange={setCode}
                        onRun={(code) => console.log('Running code:', code)}
                        showLanguageSelector={true}
                        showRunButton={true}
                        showResetButton={true}
                        showCopyButton={true}
                      />
                    </div>
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            )}
          </div>
    </div>
  );
};

export default SubjectDetail;