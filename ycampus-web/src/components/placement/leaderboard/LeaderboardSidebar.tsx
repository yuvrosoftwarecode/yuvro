import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Book, Layers, Target, Loader2, PanelLeftClose, Globe } from 'lucide-react';
import subjectService from '@/services/subjectService';
import skillTestService, { SkillTest } from '@/services/skillTestService';

interface LeaderboardSidebarProps {
  subjects: any[];
  activeTab: string; // 'skill-tests' | 'assessments'
  onSelectNode: (type: 'global' | 'subject' | 'unit' | 'test', id: string, name: string) => void;
  selectedNodeId: string | null;
  onCloseSidebar?: () => void;
}

const LeaderboardSidebar: React.FC<LeaderboardSidebarProps> = ({ subjects, activeTab, onSelectNode, selectedNodeId, onCloseSidebar }) => {
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});
  const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({});
  
  const [unitsData, setUnitsData] = useState<Record<string, any[]>>({});
  const [testsData, setTestsData] = useState<Record<string, SkillTest[]>>({});
  
  const [loadingSubjects, setLoadingSubjects] = useState<Record<string, boolean>>({});
  const [loadingUnits, setLoadingUnits] = useState<Record<string, boolean>>({});

  // Reset expansion when tab changes (to prevent confusion between practice tests vs assessments)
  useEffect(() => {
    setExpandedSubjects({});
    setExpandedUnits({});
    setUnitsData({});
    setTestsData({});
  }, [activeTab]);

  const handleToggleSubject = async (subjectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isExpanding = !expandedSubjects[subjectId];
    setExpandedSubjects(prev => ({ ...prev, [subjectId]: isExpanding }));
    
    if (isExpanding) {
      setLoadingSubjects(prev => ({ ...prev, [subjectId]: true }));
      try {
        if (activeTab === 'assessments') {
          if (!testsData[subjectId]) {
            const tests = await skillTestService.getSkillTests({ subject: subjectId, unit: 'null', test_type: 'assessment' });
            setTestsData(prev => ({ ...prev, [subjectId]: tests }));
          }
        } else {
          if (!unitsData[subjectId]) {
            const units = await subjectService.getUnits(subjectId);
            setUnitsData(prev => ({ ...prev, [subjectId]: units }));
          }
        }
      } catch (err) {
        console.error("Failed to load data for subject", err);
      } finally {
        setLoadingSubjects(prev => ({ ...prev, [subjectId]: false }));
      }
    }
  };

  const handleToggleUnit = async (unitId: string, e: React.MouseEvent) => {
    if (activeTab === 'assessments') return; // Units don't exist in assessments
    e.stopPropagation();
    const isExpanding = !expandedUnits[unitId];
    setExpandedUnits(prev => ({ ...prev, [unitId]: isExpanding }));
    
    if (isExpanding && !testsData[unitId]) {
      setLoadingUnits(prev => ({ ...prev, [unitId]: true }));
      try {
        const tests = await skillTestService.getSkillTests({ unit: unitId, test_type: 'practice' });
        setTestsData(prev => ({ ...prev, [unitId]: tests }));
      } catch (err) {
        console.error("Failed to load tests", err);
      } finally {
        setLoadingUnits(prev => ({ ...prev, [unitId]: false }));
      }
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-card border-r border-border/50">
      <div className="p-4 border-b border-border/50 bg-muted/20 flex items-center justify-between">
        <h3 className="font-semibold text-foreground text-sm tracking-wide">Explore Leaderboards</h3>
        {onCloseSidebar && (
          <button 
            onClick={onCloseSidebar}
            className="p-1 rounded-md hover:bg-muted/80 text-muted-foreground transition-colors"
            title="Collapse Sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
        <div 
          className={`flex items-center gap-3 px-3 py-2.5 mx-1 mt-1 rounded-lg cursor-pointer transition-all duration-200 group mb-2 ${
            selectedNodeId === null ? 'bg-primary text-primary-foreground font-semibold shadow-sm scale-[0.98]' : 'hover:bg-muted text-foreground'
          }`}
          onClick={() => onSelectNode('global', '', 'Global')}
        >
          <Globe className={`w-4 h-4 ${selectedNodeId === null ? 'text-primary-foreground' : 'text-primary'}`} />
          <span className="text-sm">Global Leaderboard</span>
        </div>
        
        <div className="h-px bg-border/50 mx-3 mb-2" />
        
        {subjects.map((subject) => {
          const subjectId = String(subject.id);
          const subjectName = subject.subject_name || subject.name || subject.title;
          const isSubjectExpanded = expandedSubjects[subjectId];
          const isSubjectSelected = selectedNodeId === subjectId;
          const subjectUnits = unitsData[subjectId] || [];
          const subjectTests = testsData[subjectId] || []; // For assessments

          return (
            <div key={subjectId} className="flex flex-col">
              <div 
                className={`flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer transition-colors group ${
                  isSubjectSelected ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-foreground'
                }`}
                onClick={() => onSelectNode('subject', subjectId, subjectName)}
              >
                <button 
                  onClick={(e) => handleToggleSubject(subjectId, e)}
                  className="p-0.5 rounded-sm hover:bg-black/10 dark:hover:bg-white/10"
                >
                  {loadingSubjects[subjectId] ? (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  ) : isSubjectExpanded ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  )}
                </button>
                <Book className={`w-4 h-4 ${isSubjectSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className="text-sm truncate">{subjectName}</span>
              </div>

              {/* Units or Tests */}
              {isSubjectExpanded && (
                <div className="ml-5 mt-1 space-y-1 pl-2 border-l border-border/50 animate-in slide-in-from-top-2 duration-200">
                  
                  {activeTab === 'skill-tests' && (
                    <>
                      {subjectUnits.length === 0 && !loadingSubjects[subjectId] && (
                        <div className="px-6 py-2 text-xs text-muted-foreground italic">No units found</div>
                      )}
                      {subjectUnits.map((unit) => {
                        const unitId = String(unit.id);
                        const isUnitExpanded = expandedUnits[unitId];
                        const isUnitSelected = selectedNodeId === unitId;
                        const unitTests = testsData[unitId] || [];

                        return (
                          <div key={unitId} className="flex flex-col">
                            <div 
                              className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors group ${
                                isUnitSelected ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-foreground/90'
                              }`}
                              onClick={() => onSelectNode('unit', unitId, unit.name)}
                            >
                              <button 
                                onClick={(e) => handleToggleUnit(unitId, e)}
                                className="p-0.5 rounded-sm hover:bg-black/10 dark:hover:bg-white/10"
                              >
                                {loadingUnits[unitId] ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                                ) : isUnitExpanded ? (
                                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                                )}
                              </button>
                              <Layers className={`w-3.5 h-3.5 ${isUnitSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                              <span className="text-sm truncate">{unit.name}</span>
                            </div>

                            {/* Tests */}
                            {isUnitExpanded && (
                              <div className="ml-5 mt-1 space-y-0.5 pl-2 border-l border-border/50 animate-in slide-in-from-top-2 duration-200">
                                {unitTests.length === 0 && !loadingUnits[unitId] && (
                                  <div className="px-6 py-1.5 text-[11px] text-muted-foreground italic">No tests found</div>
                                )}
                                {unitTests.map((test) => {
                              const testId = String(test.id);
                              const isTestSelected = selectedNodeId === testId;

                              return (
                                <div 
                                  key={testId}
                                  className={`flex items-center gap-2 px-6 py-1.5 rounded-md cursor-pointer transition-colors ${
                                    isTestSelected ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-foreground/80'
                                  }`}
                                  onClick={() => onSelectNode('test', testId, test.title)}
                                >
                                  <Target className={`w-3 h-3 ${isTestSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                                  <span className="text-[13px] truncate">{test.title}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                    </>
                  )}

                  {activeTab === 'assessments' && (
                    <>
                      {subjectTests.length === 0 && !loadingSubjects[subjectId] && (
                        <div className="px-6 py-2 text-xs text-muted-foreground italic">No assessments found</div>
                      )}
                      {subjectTests.map((test) => {
                        const testId = String(test.id);
                        const isTestSelected = selectedNodeId === testId;

                        return (
                          <div 
                            key={testId}
                            className={`flex items-center gap-2 px-6 py-1.5 rounded-md cursor-pointer transition-colors ${
                              isTestSelected ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-foreground/80'
                            }`}
                            onClick={() => onSelectNode('test', testId, test.title)}
                          >
                            <Target className={`w-3 h-3 ${isTestSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                            <span className="text-[13px] truncate">{test.title}</span>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LeaderboardSidebar;
