import React, { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trophy, Medal, Award, Zap, Target, User as UserIcon, Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { LeaderboardEntry } from '@/services/leaderboardService';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  scope: 'test' | 'unit' | 'subject' | 'global' | 'assessments';
}

type SortColumn = 'rank' | 'student_name' | 'score' | 'accuracy' | 'time_taken' | 'tests_completed';
type SortDirection = 'asc' | 'desc';

const getRankIcon = (rank: number) => {
  if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500 fill-yellow-500/20 drop-shadow-sm" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-slate-400 fill-slate-400/20 drop-shadow-sm" />;
  if (rank === 3) return <Award className="w-5 h-5 text-amber-600 fill-amber-600/20 drop-shadow-sm" />;
  return <span className="font-bold text-muted-foreground ml-1">{rank}</span>;
};

const LeaderboardTable: React.FC<LeaderboardTableProps> = ({ entries, scope }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<SortColumn>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedAndFilteredEntries = useMemo(() => {
    let filtered = entries.filter(entry => 
      entry.student_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    filtered.sort((a, b) => {
      let aVal: any = a[sortColumn as keyof LeaderboardEntry];
      let bVal: any = b[sortColumn as keyof LeaderboardEntry];

      if (sortColumn === 'score') {
        aVal = scope === 'test' ? (a.score ?? (a as any).marks ?? 0) : a.performance_score;
        bVal = scope === 'test' ? (b.score ?? (b as any).marks ?? 0) : b.performance_score;
      }

      if (aVal === undefined) aVal = 0;
      if (bVal === undefined) bVal = 0;

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return filtered;
  }, [entries, searchQuery, sortColumn, sortDirection, scope]);

  const totalPages = Math.ceil(sortedAndFilteredEntries.length / itemsPerPage);
  const paginatedEntries = sortedAndFilteredEntries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) return <ChevronUp className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />;
    return sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  const SortableHeader = ({ label, column, className = "" }: { label: string, column: SortColumn, className?: string }) => (
    <TableHead 
      className={`cursor-pointer hover:bg-muted/50 transition-colors group select-none ${className}`}
      onClick={() => handleSort(column)}
    >
      <div className={`flex items-center gap-1.5 ${className.includes('text-right') ? 'justify-end' : className.includes('text-center') ? 'justify-center' : ''}`}>
        {label}
        <SortIcon column={column} />
      </div>
    </TableHead>
  );

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-white/50 dark:bg-black/20 backdrop-blur-md border border-border/50 rounded-xl shadow-sm">
        <Trophy className="w-12 h-12 text-muted-foreground opacity-20 mb-4" />
        <h3 className="text-lg font-medium text-foreground">No leaderboard data available yet</h3>
        <p className="text-muted-foreground text-sm mt-1">Students need to complete tests to appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Rankings</h3>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search student..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9 h-9 bg-background/50 backdrop-blur-sm border-border/50 focus:bg-background transition-colors"
          />
        </div>
      </div>
      
      <div className="rounded-xl border border-border/50 bg-white/50 dark:bg-black/20 backdrop-blur-md shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10 backdrop-blur-md">
              <TableRow className="hover:bg-transparent">
                <SortableHeader label="Rank" column="rank" className="w-20 text-center" />
                <SortableHeader label="Student" column="student_name" />
                <SortableHeader label={scope === 'test' ? 'Score' : 'Performance Score'} column="score" className="text-right" />
                <SortableHeader label="Accuracy" column="accuracy" className="text-right" />
                {scope === 'test' ? (
                  <SortableHeader label="Time Taken" column="time_taken" className="text-right" />
                ) : (
                  <SortableHeader label="Tests Completed" column="tests_completed" className="text-right" />
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedEntries.length > 0 ? (
                paginatedEntries.map((entry) => (
                  <TableRow 
                    key={entry.user_id}
                    className={`transition-all duration-200 ${
                      entry.is_current_user 
                        ? 'bg-primary/5 hover:bg-primary/10 border-l-2 border-l-primary' 
                        : 'hover:bg-muted/40'
                    }`}
                  >
                    <TableCell className="text-center font-medium">
                      <div className="flex justify-center items-center h-full">
                        {getRankIcon(entry.rank)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden shadow-sm border border-border/50
                          ${entry.rank === 1 ? 'bg-yellow-500/10 text-yellow-600' : 
                            entry.rank === 2 ? 'bg-slate-400/10 text-slate-500' : 
                            entry.rank === 3 ? 'bg-amber-600/10 text-amber-700' : 
                            'bg-primary/10 text-primary'}`}
                        >
                          {entry.avatar ? (
                            <img src={entry.avatar} alt="Avatar" className="h-full w-full object-cover" />
                          ) : (
                            <UserIcon className="w-4 h-4" />
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
                    <TableCell className="text-right font-semibold text-foreground">
                      {scope === 'test' ? (entry.score ?? (entry as any).marks ?? 0) : entry.performance_score}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Target className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="font-medium">{entry.accuracy}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {scope === 'test' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-muted-foreground">{entry.time_taken ? `${Math.floor(entry.time_taken / 60)}m ${Math.floor(entry.time_taken % 60)}s` : '-'}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground font-medium">{entry.tests_completed} tests</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No students match your search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination Controls */}
        {sortedAndFilteredEntries.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 bg-muted/20">
            <div className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, sortedAndFilteredEntries.length)} of {sortedAndFilteredEntries.length} entries
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium px-2">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaderboardTable;
