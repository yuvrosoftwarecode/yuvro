import { useEffect, useRef, useState } from 'react';
import { BookOpen, Check, Columns, Minimize2, Pencil, Plus, Sparkles, StickyNote, Trash2, X, Brain, Zap, Table as TableIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { createNote, deleteNote, fetchNotesBySubUnit, Note, updateNote } from '@/services/subjectService';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import AIChatContainer from './ai-buddy/AIChatContainer';

const MaterialsView = ({
  materials,
  isSplitView,
  setIsSplitView,
  isChatOpen,
  setIsChatOpen,
  showHeader = true,
}: {
  materials: Note[];
  isSplitView: boolean;
  setIsSplitView: (value: boolean) => void;
  isChatOpen: boolean;
  setIsChatOpen: (value: boolean) => void;
  showHeader?: boolean;
}) => (
  <div className="h-full flex flex-col">
    {showHeader && (
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-2 text-gray-800 font-semibold font-sans">
          <BookOpen className="w-5 h-5 text-slate-900" />
          <h2 className="text-lg">Study Materials</h2>
        </div>
        <div className="flex items-center gap-2">
          {!isSplitView && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsSplitView(true)}
              className="gap-2 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all font-sans"
            >
              <Columns className="w-4 h-4" /> Compare
            </Button>
          )}
          {!isChatOpen && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsChatOpen(true)}
              className="gap-2 rounded-xl border shadow-sm hover:shadow-md transition-all font-sans bg-white text-slate-800 border-gray-200"
            >
              <Sparkles className="w-4 h-4 text-emerald-500" />
              AI Mentor
            </Button>
          )}
        </div>
      </div>
    )}

    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-10">
      <div className="mb-8 mt-2 space-y-6">
        <div className="rounded-2xl p-8 text-black fshadow-md">
          <div className="flex items-center gap-3 mb-2">
            <Brain className="w-8 h-8 text-gray-500" />
            <h2 className="text-3xl font-bold font-sans tracking-tight">Dynamic Programming (DP) Notes</h2>
          </div>
          <p className="text-black mt-2 max-w-3xl font-sans text-sm leading-relaxed">
            Dynamic Programming is an optimization technique used to solve problems by breaking them into smaller overlapping subproblems and storing their results to avoid recomputation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><Zap className="w-5 h-5 text-amber-500" /> Used When:</h3>
            <ul className="space-y-3 font-sans">
              <li className="flex items-start gap-3 text-gray-700 bg-amber-50/50 p-3 rounded-xl border border-amber-100/50">
                 <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                 <span className="text-sm">Problem has <strong className="text-gray-900">Overlapping Subproblems</strong></span>
              </li>
              <li className="flex items-start gap-3 text-gray-700 bg-amber-50/50 p-3 rounded-xl border border-amber-100/50">
                 <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                 <span className="text-sm">Problem has <strong className="text-gray-900">Optimal Substructure</strong></span>
              </li>
            </ul>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><BookOpen className="w-5 h-5 text-indigo-500" /> Examples:</h3>
            <div className="flex flex-wrap gap-2 font-sans">
              {['Fibonacci', 'Knapsack', 'Longest Common Subsequence', 'Coin Change', 'DP on Trees', 'DP on Grids'].map(ex => (
                <span key={ex} className="px-3 py-1.5 bg-slate-50 border border-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors cursor-default">{ex}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col hover:border-indigo-200 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl"><Zap className="w-6 h-6" /></div>
              <h3 className="text-xl font-bold text-gray-900 font-sans tracking-tight">2. Memoization (Top-Down)</h3>
            </div>
            <p className="text-gray-600 mb-4 text-sm font-sans leading-relaxed">
              Memoization is a top-down approach where we solve the problem using recursion and store results in a cache (array/dictionary).
            </p>
            
            <div className="mb-4 font-sans">
              <h4 className="font-semibold text-gray-800 mb-2 text-xs uppercase tracking-wider">Steps</h4>
              <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
                <li>Write recursive solution</li>
                <li>Store result of each subproblem</li>
                <li>If already computed → return stored result</li>
              </ol>
            </div>

            <div className="bg-[#0f172a] rounded-xl p-4 overflow-x-auto w-full mb-4 shrink-0 shadow-inner">
              <pre className="text-xs text-[#a7f3d0] font-mono leading-relaxed">
{`def fib(n, dp):
    if n <= 1:
        return n
    if dp[n] != -1:
        return dp[n]
    
    dp[n] = fib(n-1, dp) + fib(n-2, dp)
    return dp[n]

n = 6
dp = [-1]*(n+1)
print(fib(n, dp))`}
              </pre>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm mt-auto border-t border-gray-100 pt-4 font-sans">
              <div><span className="text-gray-500 block text-xs mb-1">Time Complexity</span><strong className="text-gray-900">O(n)</strong> <span className="text-xs text-gray-400 block mt-0.5">Without DP → O(2^n)</span></div>
              <div><span className="text-gray-500 block text-xs mb-1">Space Complexity</span><strong className="text-gray-900">O(n)</strong> <span className="text-xs text-gray-400 block mt-0.5">recursion stack + dp array</span></div>
            </div>
            <div className="mt-4 bg-indigo-50/80 p-4 rounded-xl border border-indigo-100 text-sm font-sans">
              <strong className="text-indigo-900 block mb-2 text-xs uppercase tracking-wider">When to Use Memoization</strong>
              <ul className="text-indigo-800 list-disc list-inside space-y-1 text-xs sm:text-sm">
                <li>When recursion is easy to write</li>
                <li>When all states are not required</li>
                <li>When problem is complex (trees, graphs)</li>
              </ul>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col hover:border-emerald-200 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><TableIcon className="w-6 h-6" /></div>
              <h3 className="text-xl font-bold text-gray-900 font-sans tracking-tight">3. Tabulation (Bottom-Up)</h3>
            </div>
            <p className="text-gray-600 mb-4 text-sm font-sans leading-relaxed">
              Tabulation is a bottom-up approach where we solve smallest subproblems first and build the solution iteratively.
            </p>
            
            <div className="mb-4 font-sans">
              <h4 className="font-semibold text-gray-800 mb-2 text-xs uppercase tracking-wider">Steps</h4>
              <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
                <li>Create DP table</li>
                <li>Initialize base cases</li>
                <li>Fill table iteratively</li>
                <li>Return final answer</li>
              </ol>
            </div>

            <div className="bg-[#0f172a] rounded-xl p-4 overflow-x-auto w-full mb-4 shrink-0 shadow-inner">
              <pre className="text-xs text-[#a7f3d0] font-mono leading-relaxed">
{`def fib(n):
    if n <= 1:
        return n
    
    dp = [0]*(n+1)
    dp[1] = 1
    
    for i in range(2, n+1):
        dp[i] = dp[i-1] + dp[i-2]
    
    return dp[n]

print(fib(6))`}
              </pre>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm mt-auto border-t border-gray-100 pt-4 font-sans">
              <div><span className="text-gray-500 block text-xs mb-1">Time Complexity</span><strong className="text-gray-900">O(n)</strong></div>
              <div><span className="text-gray-500 block text-xs mb-1">Space Complexity</span><strong className="text-gray-900">O(n)</strong></div>
            </div>
            <div className="mt-4 bg-emerald-50/80 p-4 rounded-xl border border-emerald-100 text-sm font-sans flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <strong className="text-emerald-900 block mb-2 text-xs uppercase tracking-wider">Space Optimization</strong>
                <pre className="text-xs text-emerald-900 bg-emerald-100/50 p-2.5 rounded-lg border border-emerald-200/50 overflow-x-auto">
{`a, b = 0, 1
for i in range(2, n+1):
    a, b = b, a + b`}
                </pre>
              </div>
              <div className="flex items-center justify-center sm:justify-end shrink-0">
                <div className="bg-white px-3 py-2 rounded-lg border border-emerald-200 shadow-sm text-emerald-800 font-bold text-xs whitespace-nowrap">
                  Space → O(1)
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm overflow-hidden text-sm font-sans">
          <h3 className="text-lg font-bold text-gray-900 mb-4 tracking-tight">4. Memoization vs Tabulation</h3>
          <div className="overflow-x-auto border border-gray-100 rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-600 uppercase text-[11px] tracking-wider font-bold">
                  <th className="px-4 py-4 border-b border-gray-100">Feature</th>
                  <th className="px-4 py-4 border-b border-gray-100">Memoization</th>
                  <th className="px-4 py-4 border-b border-gray-100">Tabulation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700 bg-white">
                <tr className="hover:bg-slate-50/50 transition-colors"><td className="px-4 py-3.5 font-semibold text-gray-900">Approach</td><td className="px-4 py-3.5"><span className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-md text-xs font-bold uppercase tracking-wide border border-amber-100/50">Top-Down</span></td><td className="px-4 py-3.5"><span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-md text-xs font-bold uppercase tracking-wide border border-emerald-100/50">Bottom-Up</span></td></tr>
                <tr className="hover:bg-slate-50/50 transition-colors"><td className="px-4 py-3.5 font-semibold text-gray-900">Uses Recursion</td><td className="px-4 py-3.5">Yes</td><td className="px-4 py-3.5 border-l border-gray-50">No</td></tr>
                <tr className="hover:bg-slate-50/50 transition-colors"><td className="px-4 py-3.5 font-semibold text-gray-900">Speed</td><td className="px-4 py-3.5 text-amber-600 font-medium">Slightly slower</td><td className="px-4 py-3.5 text-emerald-600 font-bold border-l border-gray-50">Faster</td></tr>
                <tr className="hover:bg-slate-50/50 transition-colors"><td className="px-4 py-3.5 font-semibold text-gray-900">Stack Overflow</td><td className="px-4 py-3.5 text-red-500 font-medium bg-red-50/30">Possible</td><td className="px-4 py-3.5 text-emerald-600 font-medium border-l border-gray-50">No</td></tr>
                <tr className="hover:bg-slate-50/50 transition-colors"><td className="px-4 py-3.5 font-semibold text-gray-900">Easy to Write</td><td className="px-4 py-3.5 text-emerald-600 font-medium bg-emerald-50/30">Easy</td><td className="px-4 py-3.5 text-amber-600 font-medium border-l border-gray-50">Moderate</td></tr>
                <tr className="hover:bg-slate-50/50 transition-colors"><td className="px-4 py-3.5 font-semibold text-gray-900">Best For</td><td className="px-4 py-3.5">Complex problems</td><td className="px-4 py-3.5 border-l border-gray-50">Simple DP</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2 tracking-tight"><Sparkles className="w-5 h-5 text-indigo-500" /> 5. How to Identify DP</h3>
            <p className="text-sm text-gray-600 mb-4">If the problem asks for any of the following, it is probably DP:</p>
            <div className="flex flex-wrap gap-2 mt-auto">
              {['Minimum / Maximum', 'Count ways', 'Subsequence', 'Subset', 'Partition', 'Optimal strategy', '"Find best way"'].map(ex => (
                <span key={ex} className="px-3 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-lg text-[13px] font-medium hover:bg-indigo-100 transition-colors cursor-default">{ex}</span>
              ))}
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm text-black flex flex-col">
            <h3 className="text-lg font-bold text-black mb-5 flex items-center gap-2 tracking-tight"><Check className="w-5 h-5 text-emerald-500" /> 6. DP Recipe (Steps)</h3>
            <ol className="space-y-4 mt-auto">
              {[
                'Write recursive solution',
                'Identify changing parameters → DP state',
                'Memoize it',
                'Convert to tabulation',
                'Optimize space'
              ].map((step, i) => (
                <li key={i} className="flex items-center gap-4 text-sm bg-white p-3 rounded-xl border border-gray-200">
                  <span className="w-7 h-7 rounded-full bg-gray-100 text-black flex items-center justify-center text-xs font-bold shrink-0 shadow-sm border border-gray-200">{i + 1}</span>
                  <span className="text-black font-medium">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 font-sans">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm overflow-hidden text-sm flex flex-col">
            <h3 className="text-lg font-bold text-gray-900 mb-4 tracking-tight">7. Common DP Problems</h3>
            <div className="overflow-x-auto border border-gray-100 rounded-xl flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-600 uppercase text-[11px] tracking-wider font-bold">
                    <th className="px-4 py-3.5 border-b border-gray-100">Problem (Must Practice)</th>
                    <th className="px-4 py-3.5 border-b border-gray-100">Pattern</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700 bg-white">
                  {[
                    ['Fibonacci', '1D DP', 'text-blue-600'],
                    ['Climbing Stairs', '1D DP', 'text-blue-600'],
                    ['Knapsack', '0/1 DP', 'text-indigo-600'],
                    ['Coin Change', 'Unbounded Knapsack', 'text-indigo-600'],
                    ['LCS', 'DP on Strings', 'text-emerald-600'],
                    ['LIS', 'DP + Binary Search', 'text-emerald-600'],
                    ['Matrix Chain Multiplication', 'DP on Intervals', 'text-amber-600'],
                    ['DP on Trees', 'Tree DP', 'text-rose-600'],
                    ['DP on Grids', 'Grid DP', 'text-rose-600']
                  ].map(([prob, pat, col]) => (
                    <tr key={prob} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-gray-900">{prob}</td>
                      <td className={`px-4 py-3 text-xs font-bold uppercase tracking-wide ${col} border-l border-gray-50`}>{pat}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm overflow-hidden text-sm flex flex-col">
            <h3 className="text-lg font-bold text-gray-900 mb-4 tracking-tight">8. Quick Summary</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
              {[
                { icon: '🧠', concept: 'DP', desc: 'Store subproblem results', color: 'bg-indigo-50 border-indigo-100' },
                { icon: '⏳', concept: 'Memoization', desc: 'Top-Down', color: 'bg-amber-50 border-amber-100' },
                { icon: '📊', concept: 'Tabulation', desc: 'Bottom-Up', color: 'bg-emerald-50 border-emerald-100' },
                { icon: '🔄', concept: 'State', desc: 'Changing variables', color: 'bg-blue-50 border-blue-100' },
                { icon: '📈', concept: 'Transition', desc: 'Recurrence relation', color: 'bg-rose-50 border-rose-100' },
                { icon: '🌱', concept: 'Base Case', desc: 'Smallest subproblem', color: 'bg-teal-50 border-teal-100' }
              ].map((item, i) => (
                <div key={i} className={`flex items-start gap-3 p-3.5 rounded-xl border ${item.color} shadow-sm hover:shadow-md transition-shadow`}>
                  <div className="text-xl bg-white w-8 h-8 flex items-center justify-center rounded-lg shadow-sm border border-black/5 shrink-0">{item.icon}</div>
                  <div className="flex-1 mt-0.5">
                    <strong className="text-gray-900 block text-xs uppercase tracking-wider mb-0.5">{item.concept}</strong>
                    <span className="text-gray-600 text-xs font-medium">{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {materials.length === 0 ? (
        <></>
        // <div className="text-center py-20 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200 font-sans">
        //   <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
        //   <p className="text-sm">No study materials available for this unit yet.</p>
        // </div>
      ) : (
        <div className="space-y-4">
          {materials.map((note) => (
            <Card
              key={note.id}
              className="border-l-4 border-l-slate-900 shadow-sm rounded-xl overflow-hidden border-y border-r border-gray-100 bg-white hover:shadow-md transition-all"
            >
              <CardContent className="p-5 whitespace-pre-wrap text-sm leading-relaxed text-gray-700 font-sans">
                {note.content}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  </div>
);

const MyNotesView = ({
  myNotes,
  isSplitView,
  setIsSplitView,
  isChatOpen,
  setIsChatOpen,
  newNoteContent,
  setNewNoteContent,
  handleCreateNote,
  isCreating,
  editingNoteId,
  editContent,
  setEditContent,
  cancelEditing,
  handleUpdateNote,
  handleDeleteNote,
  startEditing,
  showHeader = true,
}: {
  myNotes: Note[];
  isSplitView: boolean;
  setIsSplitView: (value: boolean) => void;
  isChatOpen: boolean;
  setIsChatOpen: (value: boolean) => void;
  newNoteContent: string;
  setNewNoteContent: (value: string) => void;
  handleCreateNote: () => void;
  isCreating: boolean;
  editingNoteId: string | null;
  editContent: string;
  setEditContent: (value: string) => void;
  cancelEditing: () => void;
  handleUpdateNote: (id: string) => void;
  handleDeleteNote: (id: string) => void;
  startEditing: (note: Note) => void;
  showHeader?: boolean;
}) => (
  <div className="h-full flex flex-col">
    {showHeader && (
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-2 text-gray-800 font-semibold font-sans">
          <StickyNote className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg">Personal Notes</h2>
        </div>
        <div className="flex items-center gap-2">
          {!isSplitView && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsSplitView(true)}
              className="gap-2 border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all font-sans"
            >
              <Columns className="w-4 h-4" /> Compare
            </Button>
          )}
          {!isChatOpen && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsChatOpen(true)}
              className="gap-2 rounded-xl border shadow-sm hover:shadow-md transition-all font-sans bg-white text-indigo-800 border-gray-200"
            >
              <Sparkles className="w-4 h-4 text-emerald-500" />
              AI Mentor
            </Button>
          )}
        </div>
      </div>
    )}

    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
      <div className="flex flex-col gap-6">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-inner space-y-4">
          <h3 className="font-semibold text-gray-900 text-sm ml-1 flex items-center gap-2 font-sans">
            <Plus className="w-4 h-4 text-slate-900" />
            Add New Note
          </h3>
          <Textarea
            placeholder="Write your key takeaways here..."
            value={newNoteContent}
            onChange={(event) => setNewNoteContent(event.target.value)}
            className="min-h-[120px] bg-white focus:bg-white transition-all resize-none rounded-xl border-gray-200 focus:border-slate-400 focus:ring-4 focus:ring-slate-100 shadow-sm font-sans"
          />
          <div className="flex justify-end">
            <Button
              onClick={handleCreateNote}
              disabled={!newNoteContent.trim() || isCreating}
              size="sm"
              className="bg-slate-900 hover:bg-black text-white rounded-xl px-6 gap-2 shadow-lg shadow-slate-200 active:scale-95 transition-all font-sans"
            >
              <Plus className="w-4 h-4" />
              {isCreating ? 'Saving...' : 'Save Note'}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {myNotes.length === 0 ? (
            <div className="text-center py-12 text-gray-400 border border-dashed border-gray-200 rounded-2xl font-sans">
              <StickyNote className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p className="text-sm">You haven't added any notes yet.</p>
            </div>
          ) : (
            myNotes.map((note) => (
              <Card
                key={note.id}
                className="group hover:border-slate-300 transition-all shadow-sm hover:shadow-md rounded-2xl border-gray-100 overflow-hidden bg-white"
              >
                <CardContent className="p-5">
                  {editingNoteId === note.id ? (
                    <div className="space-y-3">
                      <Textarea
                        value={editContent}
                        onChange={(event) => setEditContent(event.target.value)}
                        className="min-h-[100px] resize-none rounded-xl border border-gray-200 focus:ring-4 focus:ring-green-50 focus:border-green-200 font-sans"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="secondary" onClick={cancelEditing} className="rounded-xl border border-gray-200 font-sans">
                          <X className="w-4 h-4 mr-1" /> Cancel
                        </Button>
                        <Button size="sm" onClick={() => handleUpdateNote(note.id)} className="bg-green-600 hover:bg-green-700 text-white rounded-xl px-4 font-sans">
                          <Check className="w-4 h-4 mr-1" /> Save Update
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-4">
                        <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed flex-1 pt-1 font-sans">
                          {note.content}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => startEditing(note)}
                            className="text-gray-400 hover:text-slate-900 hover:bg-white h-8 w-8 rounded-xl"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteNote(note.id)}
                            className="text-gray-400 hover:text-red-500 hover:bg-red-50 h-8 w-8 rounded-xl"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-4 text-[10px] text-gray-400 font-bold uppercase tracking-widest border-t border-gray-50 pt-3 flex items-center gap-1.5 font-sans">
                        <div className="w-1 h-1 rounded-full bg-gray-300" />
                        {new Date(note.created_at || '').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  </div>
);

const StudentNotes = ({
  subunitId,
  mode = 'materials',
  sessionId,
  onNewSession,
}: {
  subunitId: string;
  mode?: 'materials' | 'my-notes';
  sessionId?: string;
  onNewSession?: () => void;
}) => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  const [newNoteContent, setNewNoteContent] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const [isSplitView, setIsSplitView] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatWidth, setChatWidth] = useState(30);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (event: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const relativeX = event.clientX - rect.left;
      const containerWidth = rect.width;
      const rightEdgeX = containerWidth - relativeX;
      const newWidth = (rightEdgeX / containerWidth) * 100;

      if (newWidth >= 20 && newWidth <= 60) {
        setChatWidth(newWidth);
      }
    };

    const handleMouseUp = () => setIsDragging(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  useEffect(() => {
    const loadNotes = async () => {
      setLoading(true);
      try {
        const response = await fetchNotesBySubUnit(subunitId);
        setNotes(response || []);
      } catch (error) {
        console.error('Failed to load notes', error);
        toast.error('Failed to load notes');
        setNotes([]);
      } finally {
        setLoading(false);
      }
    };

    loadNotes();
  }, [subunitId]);

  const handleCreateNote = async () => {
    if (!newNoteContent.trim()) return;

    setIsCreating(true);
    try {
      await createNote({
        sub_unit: subunitId,
        content: newNoteContent,
      });
      setNewNoteContent('');
      toast.success('Note added successfully');
      const response = await fetchNotesBySubUnit(subunitId);
      setNotes(response || []);
    } catch (error) {
      console.error('Failed to create note', error);
      toast.error('Failed to save note');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteNote(noteId);
      toast.success('Note deleted');
      setNotes(notes.filter((note) => note.id !== noteId));
    } catch (error) {
      console.error('Failed to delete note', error);
      toast.error('Failed to delete note');
    }
  };

  const startEditing = (note: Note) => {
    setEditingNoteId(note.id);
    setEditContent(note.content);
  };

  const cancelEditing = () => {
    setEditingNoteId(null);
    setEditContent('');
  };

  const handleUpdateNote = async (noteId: string) => {
    if (!editContent.trim()) return;

    try {
      await updateNote(noteId, { content: editContent });
      toast.success('Note updated');
      setNotes(notes.map((note) => (note.id === noteId ? { ...note, content: editContent } : note)));
      setEditingNoteId(null);
    } catch (error) {
      console.error('Failed to update note', error);
      toast.error('Failed to update note');
    }
  };

  if (loading) {
    return <div className="text-muted-foreground p-4 font-sans">Loading notes...</div>;
  }

  const myNotes = notes.filter((note) => note.user === user?.id);
  const materials = notes.filter((note) => note.user !== user?.id);

  const getNotesContext = () => {
    let context = 'Context: Study notes for the current lesson.\n\n';

    if (materials.length > 0) {
      context += '--- Study Materials provided by Instructor ---\n';
      materials.forEach((material, index) => {
        context += `Note ${index + 1}:\n${material.content}\n\n`;
      });
    }

    if (myNotes.length > 0) {
      context += "--- Student's Personal Notes ---\n";
      myNotes.forEach((note, index) => {
        context += `Personal Note ${index + 1}:\n${note.content}\n\n`;
      });
    }

    return context;
  };

  if (isSplitView) {
    return (
      <div
        ref={containerRef}
        className={`h-full flex flex-row bg-white overflow-hidden font-sans ${isDragging ? 'select-none cursor-col-resize' : ''}`}
      >
        <div className="flex flex-col overflow-hidden text-sans" style={{ width: isChatOpen ? `calc(${100 - chatWidth}% - 6px)` : '100%' }}>
          <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
            <div className="font-bold text-sm text-gray-800 flex items-center gap-2">
              <Columns className="w-4 h-4 text-slate-900" />
              Side-by-Side Comparison
            </div>
            <div className="flex items-center gap-2">
              {!isChatOpen && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsChatOpen(true)}
                  className="gap-2 rounded-xl border shadow-sm hover:shadow-md transition-all font-sans bg-white text-slate-800 border-gray-200"
                >
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  AI Mentor
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsSplitView(false)}
                className="text-gray-600 border border-gray-200 rounded-xl hover:bg-white transition-all shadow-sm"
              >
                <Minimize2 className="w-4 h-4 mr-2" /> Exit Split View
              </Button>
            </div>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-0 overflow-hidden text-sans">
            <div className="border-r border-gray-100 p-6 flex flex-col overflow-hidden">
              <div className="flex items-center gap-2 mb-6 text-gray-600 font-semibold text-sm shrink-0">
                <BookOpen className="w-3 h-3 text-slate-700" /> Study Materials
              </div>
              <div className="flex-1 overflow-hidden">
                <MaterialsView
                  materials={materials}
                  isSplitView={isSplitView}
                  setIsSplitView={setIsSplitView}
                  isChatOpen={isChatOpen}
                  setIsChatOpen={setIsChatOpen}
                  showHeader={false}
                />
              </div>
            </div>
            <div className="p-6 flex flex-col overflow-hidden bg-white/30">
              <div className="flex items-center gap-2 mb-6 text-gray-600 font-semibold text-sm shrink-0">
                <StickyNote className="w-3 h-3 text-indigo-500" /> Personal Notes
              </div>
              <div className="flex-1 overflow-hidden">
                <MyNotesView
                  myNotes={myNotes}
                  isSplitView={isSplitView}
                  setIsSplitView={setIsSplitView}
                  isChatOpen={isChatOpen}
                  setIsChatOpen={setIsChatOpen}
                  newNoteContent={newNoteContent}
                  setNewNoteContent={setNewNoteContent}
                  handleCreateNote={handleCreateNote}
                  isCreating={isCreating}
                  editingNoteId={editingNoteId}
                  editContent={editContent}
                  setEditContent={setEditContent}
                  cancelEditing={cancelEditing}
                  handleUpdateNote={handleUpdateNote}
                  handleDeleteNote={handleDeleteNote}
                  startEditing={startEditing}
                  showHeader={false}
                />
              </div>
            </div>
          </div>
        </div>

        {isChatOpen && (
          <>
            <div
              onMouseDown={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              className="w-3 h-full cursor-col-resize z-20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity shrink-0 -mx-1.5"
            >
              <div className="w-1 h-12 bg-gray-300 rounded-full shadow-sm" />
            </div>
            <div className="h-full border-l border-gray-100 p-2 animate-in slide-in-from-right duration-300" style={{ width: `${chatWidth}%` }}>
              <AIChatContainer
                className="w-full h-full shadow-none border-none rounded-none"
                welcomeMessage="Hi! I can help you with your notes and materials for this unit."
                persistenceKey={sessionId}
                chatTitle="AI Mentor - Notes"
                onClose={() => setIsChatOpen(false)}
                contextGetter={getNotesContext}
                onNewChat={onNewSession}
                showHistory={false}
              />
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`h-full flex flex-row bg-white overflow-hidden font-sans ${isDragging ? 'select-none cursor-col-resize' : ''}`}>
      <div className="p-6 overflow-hidden" style={{ width: isChatOpen ? `calc(${100 - chatWidth}% - 6px)` : '100%' }}>
        {mode === 'materials' ? (
          <MaterialsView
            materials={materials}
            isSplitView={isSplitView}
            setIsSplitView={setIsSplitView}
            isChatOpen={isChatOpen}
            setIsChatOpen={setIsChatOpen}
          />
        ) : (
          <MyNotesView
            myNotes={myNotes}
            isSplitView={isSplitView}
            setIsSplitView={setIsSplitView}
            isChatOpen={isChatOpen}
            setIsChatOpen={setIsChatOpen}
            newNoteContent={newNoteContent}
            setNewNoteContent={setNewNoteContent}
            handleCreateNote={handleCreateNote}
            isCreating={isCreating}
            editingNoteId={editingNoteId}
            editContent={editContent}
            setEditContent={setEditContent}
            cancelEditing={cancelEditing}
            handleUpdateNote={handleUpdateNote}
            handleDeleteNote={handleDeleteNote}
            startEditing={startEditing}
          />
        )}
      </div>

      {isChatOpen && (
        <>
          <div
            onMouseDown={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            className="w-3 h-full cursor-col-resize z-20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity shrink-0 -mx-1.5"
          >
            <div className="w-1 h-12 bg-gray-300 rounded-full shadow-sm" />
          </div>
          <div className="h-full border-l border-gray-100 p-2 animate-in slide-in-from-right duration-300" style={{ width: `${chatWidth}%` }}>
            <AIChatContainer
              className="w-full h-full shadow-none border-none rounded-none"
              welcomeMessage={`Hi! I can help you with your ${mode === 'materials' ? 'study materials' : 'personal notes'} for this lesson.`}
              persistenceKey={sessionId}
              chatTitle="AI Mentor - Notes"
              onClose={() => setIsChatOpen(false)}
              contextGetter={getNotesContext}
              onNewChat={onNewSession}
              showHistory={false}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default StudentNotes;
