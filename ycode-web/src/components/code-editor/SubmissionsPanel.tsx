import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle2, XCircle, Eye, Trash2, RefreshCw, ClipboardList, Sparkles, Clock, Loader2 } from 'lucide-react';
import codeEditorService, { type CodeSubmission } from '@/services/codeEditorService';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface SubmissionsPanelProps {
  problemId: string;
  /** Increments every time a new submission completes — triggers auto-refresh */
  submissionCount?: number;
  /** 'learn' | 'practice' — determines which backend endpoint to fetch from */
  codeSubmissionType?: 'learn' | 'practice';
  onAnalyseCode?: (code: string, language: string) => void;
}

// ── helpers ────────────────────────────────────────────────────────────────

function isAccepted(s: CodeSubmission) {
  // Backend may return status='accepted' explicitly OR status='completed' with all tests passing
  if ((s as any).status === 'accepted') return true;
  const passed = s.test_cases_passed ?? 0;
  const total = s.total_test_cases ?? 0;
  return s.status === 'completed' && total > 0 && passed === total;
}

function verdictLabel(s: CodeSubmission) {
  const raw = (s as any);
  if (raw.verdict) return raw.verdict; // honour explicit verdict from backend if present
  if (isAccepted(s)) return 'Accepted';
  if (s.status === 'error') return 'Runtime Error';
  if (s.status === 'timeout') return 'Time Limit Exceeded';
  if (s.status === 'completed') return 'Wrong Answer';
  return s.status ?? 'Pending';
}

function relativeTime(iso: string) {
  try { return formatDistanceToNow(new Date(iso), { addSuffix: true }); }
  catch { return iso; }
}

// ── component ──────────────────────────────────────────────────────────────

export default function SubmissionsPanel({ problemId, submissionCount = 0, codeSubmissionType = 'practice', onAnalyseCode }: SubmissionsPanelProps) {
  const [submissions, setSubmissions] = useState<CodeSubmission[]>([]);
  const [loading, setLoading] = useState(false);

  // Code viewer state — fetches full submission on demand since list endpoint omits code
  const [viewSub, setViewSub] = useState<CodeSubmission | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);

  // ── fetch list ────────────────────────────────────────────────────────────
  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const fetchType = codeSubmissionType === 'learn' ? 'learn' : 'code_practice';
      const data = await codeEditorService.getSubmissions(problemId, fetchType);
      console.log('[SubmissionsPanel] fetched submissions:', data?.length, 'type:', fetchType);
      const sorted = [...data].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setSubmissions(sorted);
    } catch {
      toast.error('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  }, [problemId, codeSubmissionType]);

  useEffect(() => { fetchSubmissions(); }, [fetchSubmissions]);

  // Refresh every time submissionCount increments (new submit completed)
  useEffect(() => {
    if (submissionCount > 0) fetchSubmissions();
  }, [submissionCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id: number) => {
    try {
      await codeEditorService.deletePracticeSubmission(id);
      setSubmissions(prev => prev.filter(s => s.id !== id));
      toast.success('Submission deleted');
    } catch {
      toast.error('Failed to delete submission');
    }
  };

  // ── view code: fetch full submission for code field ───────────────────────
  const handleViewCode = async (s: CodeSubmission) => {
    if (s.code) { setViewSub(s); return; }
    setCodeLoading(true);
    setViewSub(s);
    try {
      const fetchType = codeSubmissionType === 'learn' ? 'learn' : 'code_practice';
      const full = await codeEditorService.getFullSubmission(s.id);
      console.log('[SubmissionsPanel] full submission keys:', Object.keys(full));
      setViewSub(full);
    } catch {
      toast.error('Failed to load code');
    } finally {
      setCodeLoading(false);
    }
  };

  const current = submissions[0] ?? null;

  // ── states ────────────────────────────────────────────────────────────────
  if (loading && submissions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <RefreshCw className="h-5 w-5 text-gray-200 animate-spin mb-3" />
        <p className="text-xs text-gray-400">Loading…</p>
      </div>
    );
  }

  if (!loading && submissions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <ClipboardList className="h-8 w-8 text-gray-200 mb-3" />
        <p className="text-sm font-semibold text-gray-400">No submissions yet</p>
        <p className="text-xs text-gray-400 mt-1">Submit your solution to see results here</p>
      </div>
    );
  }

  // ── derived values ────────────────────────────────────────────────────────
  const passed = current?.test_cases_passed ?? 0;
  const total = current?.total_test_cases ?? 0;
  const accepted = current ? isAccepted(current) : false;

  const checklist = current ? [
    {
      label: 'Compilation Check',
      ok: current.status !== 'error',
      desc: current.status !== 'error' ? 'Code compiled successfully' : 'Compilation failed',
    },
    {
      label: 'Test Cases (Basic)',
      ok: passed > 0,
      desc: passed > 0 ? 'Passed basic test cases' : 'Failed basic test cases',
    },
    {
      label: 'Test Cases (All)',
      ok: accepted,
      desc: accepted ? 'All test cases passed' : `${passed}/${total} passed`,
    },
  ] : [];

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Current Submission ─────────────────────────────────────── */}
      {current && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-gray-900">Current Submission</h4>
            {onAnalyseCode && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2.5 text-[11px] font-semibold text-saffron-600 hover:bg-saffron-50 -mr-1"
                onClick={() => onAnalyseCode(current.code || '', current.language || 'python')}
              >
                <Sparkles className="h-3 w-3 mr-1" /> Analyse Code
              </Button>
            )}
          </div>

          {/* Verdict */}
          <div className="mb-3">
            <p className="text-sm font-semibold text-gray-700">
              Submission Verdict:{' '}
              <span className={`font-bold ${accepted ? 'text-green-600' : 'text-red-500'}`}>
                {verdictLabel(current)}
              </span>
            </p>
          </div>

          {/* Stats box */}
          <div className={`rounded-lg border px-3 py-2 mb-3 flex items-center gap-6 flex-wrap text-xs ${accepted ? 'border-green-200 bg-green-50' : 'border-red-100 bg-red-50'}`}>
            <span className="text-gray-600">
              Test Cases Passed :{' '}
              <span className={`font-bold ${accepted ? 'text-green-600' : 'text-red-500'}`}>{passed}</span>
              <span className="text-gray-500">/{total}</span>
            </span>
            {(current.memory_usage ?? 0) > 0 && (
              <span className="text-gray-600">
                Memory Used : <span className="font-semibold text-gray-800">{((current.memory_usage ?? 0) / 1024).toFixed(2)} KiB</span>
              </span>
            )}
          </div>

          {/* Checklist */}
          <div className="border border-gray-100 rounded-lg divide-y divide-gray-100 overflow-hidden">
            {checklist.map((row) => (
              <div key={row.label} className="flex items-center justify-between px-3 py-2.5 bg-white">
                <div className="flex items-center gap-2">
                  {row.ok
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                    : <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />}
                  <span className="text-xs font-semibold text-gray-700">{row.label}</span>
                </div>
                <span className="text-xs text-gray-400">{row.desc}</span>
              </div>
            ))}
          </div>

          {/* Note: run vs submit */}
          <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
            💡 <span className="font-medium">Run</span> only tests basic cases.{' '}
            <span className="font-medium">Submit</span> tests all cases including hidden ones.
          </p>
        </div>
      )}

      {/* ── All Submissions ────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold text-gray-900">All Submissions</h4>
          <button
            onClick={fetchSubmissions}
            disabled={loading}
            className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-saffron-600 font-semibold transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="border border-gray-100 rounded-lg overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1.5rem_1fr_4.5rem_1.6rem_1.6rem] gap-x-3 px-3 py-2 bg-gray-50 border-b border-gray-100">
            {['#', 'Status', 'Language', 'Code', 'Del'].map(h => (
              <span key={h} className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h}</span>
            ))}
          </div>

          {/* Rows */}
          <div className="divide-y divide-gray-50 bg-white">
            {submissions.map((s, idx) => (
              <div key={s.id} className="grid grid-cols-[1.5rem_1fr_4.5rem_1.6rem_1.6rem] gap-x-3 items-center px-3 py-2.5">
                <span className="text-xs text-gray-400">{idx + 1}</span>

                <div>
                  <p className={`text-xs font-semibold leading-tight ${isAccepted(s) ? 'text-green-600' : 'text-red-500'}`}>
                    {verdictLabel(s)}
                  </p>
                  <p className="flex items-center gap-0.5 text-[11px] text-gray-400 mt-0.5">
                    <Clock className="h-2.5 w-2.5 shrink-0" />
                    {relativeTime(s.created_at)}
                  </p>
                </div>

                <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full w-fit truncate max-w-full">
                  {s.language || '—'}
                </span>

                <button
                  onClick={() => handleViewCode(s)}
                  title="View submitted code"
                  className="flex items-center justify-center text-gray-300 hover:text-saffron-600 transition-colors"
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>

                <button
                  onClick={() => handleDelete(s.id)}
                  title="Delete submission"
                  className="flex items-center justify-center text-gray-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-gray-400 mt-3">
          Showing {submissions.length} submission{submissions.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* ── Code viewer dialog ─────────────────────────────────────── */}
      <Dialog open={!!viewSub} onOpenChange={(o) => { if (!o) { setViewSub(null); setCodeLoading(false); } }}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-5 py-4 border-b border-gray-100 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-sm font-bold text-gray-800">
              <Eye className="h-4 w-4 text-saffron-600" />
              Submitted Code
              {viewSub && (
                <span className="bg-gray-100 text-gray-500 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                  {viewSub.language || '—'}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto bg-gray-950 p-4 min-h-[200px]">
            {codeLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-5 w-5 text-gray-600 animate-spin" />
              </div>
            ) : (
              <pre className="text-green-400 text-xs font-mono leading-relaxed whitespace-pre-wrap">
                {viewSub?.code || '— No code available —'}
              </pre>
            )}
          </div>

          {viewSub && onAnalyseCode && (
            <div className="px-5 py-3 border-t border-gray-100 flex justify-end bg-white shrink-0">
              <Button
                size="sm"
                className="h-8 bg-saffron-600 hover:bg-saffron-700 text-white text-xs font-bold"
                onClick={() => {
                  onAnalyseCode(viewSub.code || '', viewSub.language || 'python');
                  setViewSub(null);
                }}
              >
                <Sparkles className="h-3 w-3 mr-1.5" /> Analyse with AI
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
