import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Code, BrainCircuit, Mic, Trophy, Users } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import { ContestPerformance } from './ContestPerformance';
import { StreaksAndBadges } from './StreaksAndBadges';

export function AssessmentDashboard() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Assessment Dashboard Overview" 
        subtitle="Monitor your progress across Code Practice, Skill Tests, Aptitude & Reasoning, and Mock Interviews" 
      />

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-200 dark:border-blue-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Code Practice</CardTitle>
            <Code className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45 / 150</div>
            <p className="text-xs text-muted-foreground mt-1 mb-3">Problems Solved</p>
            <Progress value={30} className="h-2" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-transparent border-green-200 dark:border-green-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Skill Tests</CardTitle>
            <BookOpen className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12 / 20</div>
            <p className="text-xs text-muted-foreground mt-1 mb-3">Tests Completed</p>
            <Progress value={60} className="h-2" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-transparent border-purple-200 dark:border-purple-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Aptitude & Reasoning</CardTitle>
            <BrainCircuit className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">85%</div>
            <p className="text-xs text-muted-foreground mt-1 mb-3">Average Score</p>
            <Progress value={85} className="h-2" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-transparent border-orange-200 dark:border-orange-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Mock Interviews</CardTitle>
            <Mic className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4</div>
            <p className="text-xs text-muted-foreground mt-1 mb-3">Interviews Attended</p>
            <Progress value={40} className="h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Middle Row: Contest and Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ContestPerformance />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Leaderboard Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">#1</div>
                  <div>
                    <p className="font-medium text-sm">Alex Johnson</p>
                    <p className="text-xs text-muted-foreground">Score: 2450</p>
                  </div>
                </div>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">#2</div>
                  <div>
                    <p className="font-medium text-sm">Sarah Williams</p>
                    <p className="text-xs text-muted-foreground">Score: 2380</p>
                  </div>
                </div>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center font-bold text-primary-foreground">#15</div>
                  <div>
                    <p className="font-medium text-sm">You</p>
                    <p className="text-xs text-muted-foreground">Score: 1850</p>
                  </div>
                </div>
                <Trophy className="h-4 w-4 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Streaks */}
      <div className="grid grid-cols-1 gap-6">
        <StreaksAndBadges />
      </div>
    </div>
  );
}
