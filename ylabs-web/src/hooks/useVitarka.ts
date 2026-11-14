import { useState, useEffect, useCallback } from 'react'
import { questionBankService } from '@/services/questionBankService'
import { saveEvaluation, type Evaluation } from '@/lib/recruiter'
import {
  DEFAULT_LIBRARY,
  type LibraryQuestion,
  type CreateEvaluationParams,
  type CreatedEvaluationResult,
} from '@/lib/vitarka'

/**
 * Hook to fetch coding questions from the existing Question Bank / skill_evaluation/lab-questions/.
 */
export function useLibrary() {
  const [data, setData] = useState<LibraryQuestion[]>(DEFAULT_LIBRARY)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        const labs = await questionBankService.getLabQuestions()
        if (mounted && Array.isArray(labs) && labs.length > 0) {
          const mapped: LibraryQuestion[] = labs.map((l: any) => ({
            id: String(l.id),
            title: l.title || 'Untitled Lab',
            meta: `${l.domain || 'Engineering'} · ${l.difficulty || 'Medium'}`,
            minutes: Number(l.duration_minutes) || 45,
            marks: Number(l.marks) || 40,
          }))
          setData(mapped)
        }
      } catch (err: any) {
        if (mounted) {
          setError(err?.message || 'Failed to load library questions')
          setData(DEFAULT_LIBRARY)
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  return { data, loading, error }
}

/**
 * Hook to create an evaluation with status "draft".
 */
export function useCreateEvaluation() {
  const [creating, setCreating] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const createEvaluation = useCallback(
    async ({
      name,
      questions,
      codingQuestionIds,
    }: CreateEvaluationParams): Promise<CreatedEvaluationResult> => {
      setCreating(true)
      setError(null)
      try {
        const draftPayload: Evaluation = {
          id: 'draft',
          title: name,
          domain: 'Engineering',
          status: 'draft',
          createdAt: Date.now(),
          candidatesInvited: 0,
          candidatesCompleted: 0,
          sections: [
            {
              id: `sec-${Date.now()}-1`,
              title: 'Knowledge Assessment',
              kind: 'assessment',
              questions: questions.map((q) => ({
                id: String(q.id),
                title: q.text,
                type: 'MCQ',
                marks: q.marks,
                domain: q.type,
              })),
            } as any,
            {
              id: `sec-${Date.now()}-2`,
              title: 'Engineering Labs',
              kind: 'labs',
              labs: codingQuestionIds.map((id) => ({ id })),
            } as any,
          ],
        }

        const result = await saveEvaluation(draftPayload)
        if (!result) {
          throw new Error('Failed to create evaluation')
        }
        return {
          id: result.id,
          name: result.title,
        }
      } catch (err: any) {
        if (
          err?.status === 403 ||
          err?.message?.toLowerCase().includes('limit') ||
          err?.message?.toLowerCase().includes('plan')
        ) {
          const limitErr = new Error('limit_reached')
          setError(limitErr.message)
          throw limitErr
        }
        setError(err?.message || 'Failed to create evaluation')
        throw err
      } finally {
        setCreating(false)
      }
    },
    []
  )

  return { createEvaluation, creating, error }
}
