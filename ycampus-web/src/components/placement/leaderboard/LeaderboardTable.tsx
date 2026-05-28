import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award, Zap, Target, User as UserIcon } from 'lucide-react';
import { LeaderboardEntry } from '@/services/leaderboardService';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  scope: 'test' | 'unit' | 'subject' | 'global' | 'assessments';
}

const getRankIcon = (rank: number) => {
  if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500 fill-yellow-500/20" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-slate-400 fill-slate-400/20" />;
  if (rank === 3) return <Award className="w-5 h-5 text-amber-600 fill-amber-600/20" />;
  return <span className="font-bold text-muted-foreground ml-1">{rank}</span>;
};

const LeaderboardTable: React.FC<LeaderboardTableProps> = ({ entries, scope }) => {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-card border border-border rounded-xl">
        <Trophy className="w-12 h-12 text-muted-foreground opacity-20 mb-4" />
        <h3 className="text-lg font-medium text-foreground">No rankings yet</h3>
        <p className="text-muted-foreground text-sm mt-1">Students need to complete tests to appear here.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-20 text-center">Rank</TableHead>
            <TableHead>Student</TableHead>
            <TableHead className="text-right">
              {scope === 'test' ? 'Score' : 'Performance Score'}
            </TableHead>
            <TableHead className="text-right">Accuracy</TableHead>
            {scope === 'test' ? (
              <TableHead className="text-right">Time Taken</TableHead>
            ) : (
              <TableHead className="text-right">Tests Completed</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow 
              key={entry.user_id}
              className={`transition-colors ${entry.is_current_user ? 'bg-primary/5 hover:bg-primary/10' : ''}`}
            >
              <TableCell className="text-center">
                <div className="flex justify-center items-center h-full">
                  {getRankIcon(entry.rank)}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                    {entry.avatar ? (
                      <img src={entry.avatar} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <UserIcon className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className={`font-medium ${entry.is_current_user ? 'text-primary font-semibold' : 'text-foreground'}`}>
                      {entry.student_name}
                      {entry.is_current_user && (
                        <Badge variant="outline" className="ml-2 text-[10px] bg-primary/10 text-primary border-primary/20 py-0 px-1.5 h-4">
                          You
                        </Badge>
                      )}
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-right font-semibold">
                {scope === 'test' ? entry.score : entry.performance_score}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <Target className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{entry.accuracy}%</span>
                </div>
              </TableCell>
              <TableCell className="text-right">
                {scope === 'test' ? (
                  <div className="flex items-center justify-end gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-muted-foreground">{entry.time_taken ? `${Math.floor(entry.time_taken / 60)}m ${entry.time_taken % 60}s` : '-'}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">{entry.tests_completed} tests</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default LeaderboardTable;
