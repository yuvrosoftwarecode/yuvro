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
        {/* Header Section */}
        <div className="rounded-2xl p-8 text-black bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="w-8 h-8 text-indigo-600" />
            <h2 className="text-3xl font-bold font-sans tracking-tight">M1 → Unit 1 → Rank of Matrix using Echelon Form</h2>
          </div>
          <p className="text-gray-700 mt-3 max-w-3xl font-sans text-[15px] leading-relaxed">
            The <strong>rank of a matrix</strong> is defined as the maximum number of linearly independent rows or columns in the matrix. It tells how much useful (non-redundant) information is present and represents the dimension of the row or column space.
          </p>
          <div className="mt-4 bg-white/60 p-4 rounded-xl inline-block border border-indigo-200/50">
            <code className="text-indigo-800 font-mono text-sm font-semibold">Rank(A) ≤ min(m, n)</code>
          </div>
        </div>

        {/* Two Column Grid for Basics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><Zap className="w-5 h-5 text-amber-500" /> Why Rank is Important:</h3>
            <ul className="space-y-3 font-sans">
              {[
                'Solving systems of linear equations',
                'Checking consistency of equations',
                'Finding inverse of matrix',
                'Machine Learning & Data compression'
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-gray-700 bg-amber-50/40 p-3 rounded-xl border border-amber-100/50">
                   <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                   <span className="text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><Brain className="w-5 h-5 text-purple-500" /> Linear Independence:</h3>
            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
              Rows are independent if no row can be formed by combining other rows. Dependent rows do <strong className="text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">not increase rank</strong>.
            </p>
            <div className="bg-purple-50 p-4 rounded-xl border border-purple-100/50">
               <span className="text-xs text-purple-600 font-bold uppercase tracking-wider block mb-2">Example of Dependence:</span>
               <code className="text-sm text-purple-900 font-mono bg-white px-2 py-1 rounded shadow-sm">R₂ = 2R₁ → Dependent</code>
            </div>
          </div>
        </div>

        {/* Echelon Form Section */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
           <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><TableIcon className="w-6 h-6" /></div>
              <h3 className="text-xl font-bold text-gray-900 font-sans tracking-tight">Row Echelon Form (REF)</h3>
           </div>
           
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                 <h4 className="font-semibold text-gray-800 mb-3 text-sm uppercase tracking-wider">Conditions for REF:</h4>
                 <ul className="space-y-3">
                   <li className="flex items-start gap-3">
                     <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">1</span>
                     <span className="text-sm text-gray-700 mt-0.5">All <strong>zero rows are at the bottom</strong></span>
                   </li>
                   <li className="flex items-start gap-3">
                     <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">2</span>
                     <span className="text-sm text-gray-700 mt-0.5">First non-zero element in each row (pivot) moves right as we go down</span>
                   </li>
                   <li className="flex items-start gap-3">
                     <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">3</span>
                     <span className="text-sm text-gray-700 mt-0.5">All elements <strong>below pivot are zero</strong></span>
                   </li>
                 </ul>
              </div>
              <div className="bg-slate-900 rounded-xl p-5 shadow-inner">
                 <span className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-3 block">Example Matrix in REF</span>
                 <pre className="text-sm text-emerald-400 font-mono leading-relaxed">
{`[ 1  2  3  4 ]
[ 0  1  5  6 ]
[ 0  0  2  3 ]
[ 0  0  0  0 ]`}
                 </pre>
                 <div className="mt-4 pt-4 border-t border-slate-700/50">
                    <span className="text-xs text-slate-300"><strong className="text-white">Pivot:</strong> First non-zero element in each row, used to eliminate other elements.</span>
                 </div>
              </div>
           </div>
        </div>

        {/* Steps and Operations */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col hover:border-indigo-200 transition-colors">
            <h3 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2"><Sparkles className="w-5 h-5 text-indigo-500" /> Elementary Row Operations</h3>
            <p className="text-sm text-gray-600 mb-4 bg-indigo-50/50 p-3 rounded-lg border border-indigo-100/50">These operations do <strong>NOT</strong> change the rank of the matrix:</p>
            
            <div className="space-y-4 font-sans mt-auto">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">1. Row Interchange</div>
                <code className="text-sm text-slate-800 font-mono">Rᵢ ↔ Rⱼ</code>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">2. Row Scaling</div>
                <code className="text-sm text-slate-800 font-mono">Rᵢ → kRᵢ</code>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">3. Row Replacement</div>
                <code className="text-sm text-slate-800 font-mono">Rᵢ → Rᵢ + kRⱼ</code>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col hover:border-emerald-200 transition-colors">
            <h3 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2"><Check className="w-5 h-5 text-emerald-500" /> Steps to Find Rank</h3>
            
            <ol className="space-y-4 mt-auto">
              {[
                { title: 'Write the matrix', desc: 'Start with the given matrix' },
                { title: 'Convert to Echelon Form', desc: 'Make zeros below pivots & shift pivots right' },
                { title: 'Arrange rows', desc: 'Move all zero rows to the bottom' },
                { title: 'Count non-zero rows', desc: 'Rank = Number of non-zero rows' }
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-4 text-sm bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                  <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                  <div>
                    <strong className="text-gray-900 block mb-0.5">{step.title}</strong>
                    <span className="text-gray-500">{step.desc}</span>
                  </div>
                </li>
              ))}
            </ol>
            
            <div className="mt-5 bg-emerald-50 text-emerald-800 p-4 rounded-xl border border-emerald-200 text-center font-bold shadow-sm">
               👉 Rank = Number of non-zero rows
            </div>
          </div>
        </div>

        {/* Examples Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-4 tracking-tight">Example 1 (Step-by-Step)</h3>
              <div className="space-y-4">
                 <div className="bg-slate-900 p-4 rounded-xl">
                    <pre className="text-sm text-slate-300 font-mono">
{`A = [ 1  2  3 ]
    [ 2  4  6 ]
    [ 1  1  1 ]`}
                    </pre>
                 </div>
                 <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100/50">
                    <div className="text-xs font-bold text-indigo-800 mb-2 uppercase tracking-wider">Step 1: Eliminate below 1st pivot</div>
                    <code className="text-xs text-indigo-600 block mb-1">R₂ → R₂ - 2R₁</code>
                    <code className="text-xs text-indigo-600 block mb-3">R₃ → R₃ - R₁</code>
                    <pre className="text-sm text-slate-700 font-mono">
{`[ 1   2   3 ]
[ 0   0   0 ]
[ 0  -1  -2 ]`}
                    </pre>
                 </div>
                 <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100/50">
                    <div className="text-xs font-bold text-indigo-800 mb-2 uppercase tracking-wider">Step 2: Rearrange rows</div>
                    <pre className="text-sm text-slate-700 font-mono">
{`[ 1   2   3 ]
[ 0  -1  -2 ]
[ 0   0   0 ]`}
                    </pre>
                 </div>
                 <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center justify-between">
                    <span className="text-sm font-medium text-emerald-800">Non-zero rows = 2</span>
                    <strong className="text-emerald-700 font-bold bg-white px-3 py-1 rounded shadow-sm text-sm">Rank = 2</strong>
                 </div>
              </div>
           </div>

           <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-4 tracking-tight">Example 2 (Larger Matrix)</h3>
              <div className="space-y-4">
                 <div className="bg-slate-900 p-4 rounded-xl">
                    <pre className="text-sm text-slate-300 font-mono">
{`[ 1  2  1  3 ]
[ 2  4  0  6 ]
[ 3  6  3  9 ]`}
                    </pre>
                 </div>
                 <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100/50">
                    <div className="text-xs font-bold text-purple-800 mb-2 uppercase tracking-wider">Step 1: Operations</div>
                    <code className="text-xs text-purple-600 block mb-1">R₂ → R₂ - 2R₁</code>
                    <code className="text-xs text-purple-600 block mb-3">R₃ → R₃ - 3R₁</code>
                    <pre className="text-sm text-slate-700 font-mono">
{`[ 1  2   1  3 ]
[ 0  0  -2  0 ]
[ 0  0   0  0 ]`}
                    </pre>
                 </div>
                 <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="text-sm text-slate-600 font-medium">Already in echelon form.</div>
                 </div>
                 <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center justify-between">
                    <span className="text-sm font-medium text-emerald-800">Non-zero rows = 2</span>
                    <strong className="text-emerald-700 font-bold bg-white px-3 py-1 rounded shadow-sm text-sm">Rank = 2</strong>
                 </div>
              </div>
           </div>
        </div>

        {/* Properties & Common Mistakes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col">
              <h3 className="text-lg font-bold text-gray-900 mb-4 tracking-tight">Important Properties</h3>
              <ul className="space-y-3 font-sans text-sm mb-6">
                <li className="flex items-center gap-3 pb-2 border-b border-gray-50"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div> Rank ≤ min(m, n)</li>
                <li className="flex items-center gap-3 pb-2 border-b border-gray-50"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div> Rank of Zero Matrix = 0</li>
                <li className="flex items-center gap-3 pb-2 border-b border-gray-50"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div> Rank of Identity Matrix = n</li>
                <li className="flex items-center gap-3 pb-2 border-b border-gray-50"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div> Rank does not change under row ops</li>
                <li className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div> Row Rank = Column Rank</li>
              </ul>
              
              <div className="mt-auto">
                 <h4 className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wider">System of Equations (AX = B)</h4>
                 <div className="overflow-hidden rounded-xl border border-gray-200">
                   <table className="w-full text-left text-sm">
                     <thead className="bg-slate-50 text-slate-600">
                       <tr><th className="px-3 py-2 font-semibold border-b border-gray-200">Condition</th><th className="px-3 py-2 font-semibold border-b border-gray-200">Result</th></tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                       <tr className="hover:bg-slate-50/50"><td className="px-3 py-2 font-mono text-xs">Rank(A) = Rank([A|B]) = n</td><td className="px-3 py-2 text-emerald-600 font-medium border-l border-gray-100">Unique solution</td></tr>
                       <tr className="hover:bg-slate-50/50"><td className="px-3 py-2 font-mono text-xs">Rank(A) = Rank([A|B]) {'<'} n</td><td className="px-3 py-2 text-amber-600 font-medium border-l border-gray-100">Infinite solutions</td></tr>
                       <tr className="hover:bg-slate-50/50"><td className="px-3 py-2 font-mono text-xs">Rank(A) ≠ Rank([A|B])</td><td className="px-3 py-2 text-rose-600 font-medium border-l border-gray-100">No solution</td></tr>
                     </tbody>
                   </table>
                 </div>
              </div>
           </div>

           <div className="space-y-6">
              <div className="bg-rose-50/50 rounded-2xl p-6 border border-rose-100 shadow-sm">
                 <h3 className="text-lg font-bold text-rose-900 mb-4 flex items-center gap-2"><X className="w-5 h-5 text-rose-500" /> Common Mistakes</h3>
                 <ul className="space-y-2.5 font-sans">
                   {[
                     'Not converting fully to echelon form',
                     'Counting zero rows as non-zero',
                     'Performing wrong row operations',
                     'Forgetting to rearrange rows'
                   ].map((item, i) => (
                     <li key={i} className="flex items-start gap-2.5 text-rose-800 text-sm">
                       <span className="text-rose-500 font-bold">❌</span> {item}
                     </li>
                   ))}
                 </ul>
              </div>
              
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200/60 shadow-sm">
                 <h3 className="text-lg font-bold text-amber-900 mb-3 flex items-center gap-2"><Zap className="w-5 h-5 text-amber-600" /> Exam Strategy</h3>
                 <div className="grid grid-cols-2 gap-3 mt-4">
                   {[
                     'Use row operations',
                     'Create zeros quickly',
                     'Avoid fractions',
                     'Count rows carefully'
                   ].map((item, i) => (
                     <div key={i} className="bg-white/60 p-2.5 rounded-lg border border-amber-200/40 text-amber-900 text-sm font-medium flex items-center gap-2">
                       <Check className="w-4 h-4 text-emerald-500" /> {item}
                     </div>
                   ))}
                 </div>
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
