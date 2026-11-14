import { restApiAuthUtil } from '@/utils/RestApiAuthUtil'

export interface SuggestedQuestion {
  id: number
  type: string
  text: string
  marks: number
}

export interface SuggestQuestionsResult {
  skills: string[]
  questions: SuggestedQuestion[]
}

export interface LibraryQuestion {
  id: string
  title: string
  meta: string
  minutes: number
  marks: number
}

export interface CreateEvaluationParams {
  name: string
  questions: SuggestedQuestion[]
  codingQuestionIds: string[]
}

export interface CreatedEvaluationResult {
  id: string
  name: string
}

// Fallback keyword rules matching the prototype
export const KEYWORD_RULES: [RegExp, string, string][] = [
  [/node|express|backend|api|webhook/i, 'Node.js', 'Which approach makes webhook processing safe when the same event is delivered twice?'],
  [/sql|postgres|database|ledger/i, 'SQL', 'Which isolation level prevents write skew without explicit row locks?'],
  [/react|frontend|ui/i, 'React', 'Why does rendering 100,000 rows in a table hurt performance, and what is the usual fix?'],
  [/system design|architect|scal|distributed/i, 'System design', 'Which mechanism guarantees eventual consistency in a saga when an orchestrator node crashes?'],
  [/redis|cache/i, 'Redis', 'What happens to a local cache when a Redis keyspace notification is missed, and how do you recover?'],
  [/kafka|queue|event/i, 'Kafka', 'How do you replay messages from a dead letter queue without causing duplicates?'],
  [/python|django/i, 'Python', 'What is the difference between select_related and prefetch_related in Django?'],
  [/docker|devops|kubernetes|aws/i, 'DevOps', 'What is the difference between a liveness probe and a readiness probe?'],
]

export const DEFAULT_QUESTIONS: [string, string][] = [
  ['General', 'Which HTTP status code should an API return for a request that is valid but conflicts with current state?'],
  ['General', 'What does it mean for an operation to be idempotent, and why does it matter for retries?'],
]

export const DEFAULT_LIBRARY: LibraryQuestion[] = [
  { id: 'lib-1', title: 'Payment webhook idempotency and retry worker', meta: 'Payment · Medium', minutes: 45, marks: 40 },
  { id: 'lib-2', title: 'PostgreSQL financial ledger double-entry rollup', meta: 'Finance · Medium', minutes: 30, marks: 30 },
  { id: 'lib-3', title: 'Distributed cache invalidation engine (Redis + PubSub)', meta: 'Backend · Hard', minutes: 45, marks: 40 },
  { id: 'lib-4', title: 'React virtualized 100k-row data grid', meta: 'Frontend · Medium', minutes: 40, marks: 35 },
  { id: 'lib-5', title: 'Order state machine and saga orchestration', meta: 'Supply chain · Hard', minutes: 50, marks: 50 },
  { id: 'lib-6', title: 'Kafka dead letter queue auto-replay service', meta: 'DevOps · Medium', minutes: 35, marks: 35 },
]

let mockQuestionUid = 1

/**
 * Request AI question suggestions from the server.
 * TODO: Server endpoint POST /skill_evaluation/vitarka/suggest-questions/ is not yet available on the backend.
 * This function attempts to call the server API and falls back to typed mock data.
 */
export async function suggestQuestions({
  text,
  file,
}: {
  text: string
  file?: File | null
}): Promise<SuggestQuestionsResult> {
  try {
    const formData = new FormData()
    if (text) formData.append('text', text)
    if (file) formData.append('file', file)

    // Attempt backend server call
    const response = await restApiAuthUtil.post<SuggestQuestionsResult>(
      '/skill_evaluation/vitarka/suggest-questions/',
      formData
    )
    if (response && response.skills && response.questions) {
      return response
    }
  } catch {
    // TODO: Endpoint POST /skill_evaluation/vitarka/suggest-questions/ is missing on backend.
    // Gracefully fallback to typed mock suggestions based on keywords.
  }

  // Fallback generation (matches prototype behavior with realistic latency)
  await new Promise((resolve) => setTimeout(resolve, 1200))

  const sample = text || 'Backend engineer Node.js PostgreSQL system design'
  const matched = KEYWORD_RULES.filter(([regex]) => regex.test(sample)).slice(0, 5)
  const skills = matched.length ? matched.map(([, skill]) => skill) : ['General engineering']

  const questions: SuggestedQuestion[] = matched.map(([, type, qText]) => ({
    id: mockQuestionUid++,
    type,
    text: qText,
    marks: 5,
  }))

  DEFAULT_QUESTIONS.forEach(([type, qText]) => {
    if (questions.length < 6) {
      questions.push({
        id: mockQuestionUid++,
        type,
        text: qText,
        marks: 5,
      })
    }
  })

  return { skills, questions }
}
