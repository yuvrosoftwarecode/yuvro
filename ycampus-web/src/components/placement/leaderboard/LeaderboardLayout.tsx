import React, { useState, useEffect } from 'react';
import LeaderboardSidebar from './LeaderboardSidebar';
import LeaderboardAnalyticsCards from './LeaderboardAnalyticsCards';
import LeaderboardTable from './LeaderboardTable';
import { LeaderboardEntry, leaderboardService } from '@/services/leaderboardService';
import { Loader2, PanelLeftOpen, PanelLeftClose } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

interface LeaderboardLayoutProps {
  collegeSubjects: any[];
  activeTab: string; // 'skill-tests' | 'assessments'
}

type NodeType = 'subject' | 'unit' | 'test';

interface SelectedNode {
  type: NodeType;
  id: string;
  name: string;
  subjectId?: string;
  unitId?: string;
}

const LeaderboardLayout: React.FC<LeaderboardLayoutProps> = ({ collegeSubjects, activeTab }) => {
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);
  const [scope, setScope] = useState<'global' | 'subject' | 'unit' | 'test'>('global');
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { toast } = useToast();

  const handleSelectNode = (type: NodeType | 'global', id: string, name: string) => {
    if (type === 'global') {
      setSelectedNode(null);
      setScope('global');
      return;
    }
    
    setSelectedNode({ type: type as NodeType, id, name });
    if (type === 'test') setScope('test');
    if (type === 'unit') setScope('unit');
    if (type === 'subject') setScope('subject');
  };

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        let data: LeaderboardEntry[] = [];
        
        if (scope === 'global') {
          const testType = activeTab === 'assessments' ? 'assessment' : 'practice';
          data = await leaderboardService.getGlobalLeaderboard(testType);
        } else if (selectedNode) {
          if (scope === 'subject' && selectedNode.type === 'subject') {
            if (activeTab === 'assessments') {
              data = await leaderboardService.getAssessmentLeaderboard(selectedNode.id);
            } else {
              data = await leaderboardService.getSubjectLeaderboard(selectedNode.id);
            }
          } else if (scope === 'unit' && selectedNode.type === 'unit') {
            data = await leaderboardService.getUnitLeaderboard(selectedNode.id);
          } else if (scope === 'test' && selectedNode.type === 'test') {
            data = await leaderboardService.getTestLeaderboard(selectedNode.id);
          } else {
             if (selectedNode.type === 'subject') {
                if (activeTab === 'assessments') {
                  data = await leaderboardService.getAssessmentLeaderboard(selectedNode.id);
                } else {
                  data = await leaderboardService.getSubjectLeaderboard(selectedNode.id);
                }
             }
             if (selectedNode.type === 'unit') data = await leaderboardService.getUnitLeaderboard(selectedNode.id);
             if (selectedNode.type === 'test') data = await leaderboardService.getTestLeaderboard(selectedNode.id);
          }
        }
        
        setLeaderboardData(data);
      } catch (err) {
        toast({ title: 'Error', description: 'Failed to load leaderboard.', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [selectedNode, scope, activeTab]);

  return (
    <div className="flex h-[800px] bg-background border border-border/50 rounded-xl overflow-hidden shadow-sm animate-in fade-in duration-300 relative">
      <div 
        className={`shrink-0 hidden md:block transition-all duration-300 ease-in-out border-r border-border/50 ${
          isSidebarOpen ? 'w-72 opacity-100' : 'w-0 opacity-0 overflow-hidden border-none'
        }`}
      >
        <div className="w-72 h-full">
          <LeaderboardSidebar 
            subjects={collegeSubjects} 
            activeTab={activeTab} 
            onSelectNode={handleSelectNode} 
            selectedNodeId={selectedNode?.id || null}
            onCloseSidebar={() => setIsSidebarOpen(false)}
          />
        </div>
      </div>
      
      <div className="flex-1 flex flex-col bg-gradient-to-br from-background to-muted/10 p-6 overflow-y-auto custom-scrollbar relative min-w-0">
        <div className="flex flex-col mb-6">
          <div className="flex items-center gap-3 mb-2">
            {!isSidebarOpen && (
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => setIsSidebarOpen(true)}
                className="h-8 w-8 shrink-0 animate-in fade-in zoom-in duration-200"
                title="Expand Sidebar"
              >
                <PanelLeftOpen className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2 truncate">
               🏆 {selectedNode ? `${selectedNode.name} Leaderboard` : 'Global Leaderboard'}
            </h2>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm font-medium">Fetching leaderboard data...</p>
          </div>
        ) : (
          <div className="animate-in slide-in-from-bottom-2 duration-300">
            <LeaderboardAnalyticsCards entries={leaderboardData} scope={scope as any} />
            <LeaderboardTable entries={leaderboardData} scope={scope as any} />
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaderboardLayout;
