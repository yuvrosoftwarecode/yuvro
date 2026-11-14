import React, { useState, useRef, useEffect, useMemo } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { suggestQuestions, type SuggestedQuestion, type LibraryQuestion } from '@/lib/vitarka'
import { useLibrary, useCreateEvaluation } from '@/hooks/useVitarka'

const STEPS = ['Describe', 'Review questions', 'Coding questions', 'Create']

export function VitarkaPage() {
  const nav = useNavigate()
  const { data: library } = useLibrary()
  const { createEvaluation, creating } = useCreateEvaluation()

  // State matching prototype S
  const [step, setStep] = useState<number>(1)
  const [text, setText] = useState<string>('')
  const [file, setFile] = useState<File | null>(null)
  const [fileName, setFileName] = useState<string>('')
  const [fileError, setFileError] = useState<string>('')
  const [sent, setSent] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [questions, setQuestions] = useState<SuggestedQuestion[]>([])
  const [skills, setSkills] = useState<string[]>([])
  const [editId, setEditId] = useState<number | null>(null)
  const [editText, setEditText] = useState<string>('')
  const [editMarks, setEditMarks] = useState<number>(5)
  const [selectedCodingIds, setSelectedCodingIds] = useState<Set<string>>(new Set())
  const [libSearch, setLibSearch] = useState<string>('')
  const [evalName, setEvalName] = useState<string>('')
  const [done, setDone] = useState<boolean>(false)
  const [createdEvalId, setCreatedEvalId] = useState<string | null>(null)
  const [planLimitError, setPlanLimitError] = useState<boolean>(false)
  const [inviting, setInviting] = useState<boolean>(false)
  const [viewing, setViewing] = useState<boolean>(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const nextQuestionIdRef = useRef<number>(100)

  // Scroll on step changes or when message sent
  useEffect(() => {
    if (scrollRef.current) {
      if (step === 1 && !sent) {
        scrollRef.current.scrollTop = 0
      } else {
        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
          }
        }, 30)
      }
    }
  }, [step, sent, loading, done])

  // File selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return

    setFileError('')
    const allowed = ['.pdf', '.doc', '.docx', '.txt']
    const ext = selected.name.substring(selected.name.lastIndexOf('.')).toLowerCase()
    const isAllowedExt = allowed.includes(ext)
    const isUnder5Mb = selected.size <= 5 * 1024 * 1024

    if (!isAllowedExt || !isUnder5Mb) {
      setFileError('Attach a PDF, DOCX or TXT file under 5 MB')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setFile(selected)
    setFileName(selected.name)
  }

  const handleRemoveFile = () => {
    setFile(null)
    setFileName('')
    setFileError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Submit description
  const handleSend = async () => {
    if (!text.trim() && !file) return
    setSent(true)
    setLoading(true)
    setPlanLimitError(false)

    try {
      const result = await suggestQuestions({ text: text.trim(), file })
      setSkills(result.skills)
      setQuestions(result.questions)

      // Prefill evaluation name
      const prefix =
        result.skills[0] === 'General engineering'
          ? 'Engineering'
          : result.skills.slice(0, 2).join(' and ')
      setEvalName(`${prefix} evaluation`)
      setStep(2)
    } finally {
      setLoading(false)
    }
  }

  // Regenerate questions
  const handleRegenerate = async () => {
    setLoading(true)
    try {
      const result = await suggestQuestions({ text: text.trim(), file })
      setSkills(result.skills)
      setQuestions(result.questions)
    } finally {
      setLoading(false)
    }
  }

  // Inline question editing
  const handleStartEdit = (q: SuggestedQuestion) => {
    setEditId(q.id)
    setEditText(q.text)
    setEditMarks(q.marks)
  }

  const handleSaveEdit = (id: number) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === id
          ? {
              ...q,
              text: editText.trim() || q.text,
              marks: Math.max(1, editMarks || 1),
            }
          : q
      )
    )
    setEditId(null)
  }

  const handleCancelEdit = () => {
    setEditId(null)
  }

  const handleRemoveQuestion = (id: number) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id))
    if (editId === id) setEditId(null)
  }

  const handleAddQuestion = () => {
    const newId = nextQuestionIdRef.current++
    const newQ: SuggestedQuestion = {
      id: newId,
      type: 'Custom',
      text: '',
      marks: 5,
    }
    setQuestions((prev) => [...prev, newQ])
    setEditId(newId)
    setEditText('')
    setEditMarks(5)
  }

  // Toggle coding question selection
  const handleToggleCoding = (id: string) => {
    if (done) return
    setSelectedCodingIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Filtered coding library
  const filteredLibrary = useMemo(() => {
    const q = libSearch.toLowerCase().trim()
    return library.filter((item) => {
      if (done) return selectedCodingIds.has(item.id)
      if (!q) return true
      return item.title.toLowerCase().includes(q) || item.meta.toLowerCase().includes(q)
    })
  }, [library, libSearch, done, selectedCodingIds])

  // Calculated totals
  const selectedCodingItems = useMemo(
    () => library.filter((item) => selectedCodingIds.has(item.id)),
    [library, selectedCodingIds]
  )

  const totals = useMemo(() => {
    const n = questions.length
    const c = selectedCodingItems.length
    const totalMarks =
      questions.reduce((acc, q) => acc + q.marks, 0) +
      selectedCodingItems.reduce((acc, item) => acc + item.marks, 0)
    const totalMinutes =
      n * 3 + selectedCodingItems.reduce((acc, item) => acc + item.minutes, 0)
    return { n, c, m: totalMarks, t: totalMinutes }
  }, [questions, selectedCodingItems])

  // Confirm questions -> move to step 3
  const handleConfirmQuestions = () => {
    setEditId(null)
    setStep(3)
  }

  // Create evaluation -> move to step 4
  const handleCreateEvaluation = async () => {
    if (selectedCodingIds.size === 0 || !evalName.trim() || creating) return
    setPlanLimitError(false)
    try {
      const res = await createEvaluation({
        name: evalName.trim(),
        questions,
        codingQuestionIds: Array.from(selectedCodingIds),
      })
      setCreatedEvalId(res.id)
      setDone(true)
      setStep(4)
    } catch (err: any) {
      if (err?.message === 'limit_reached') {
        setPlanLimitError(true)
      }
    }
  }

  // Reset chat
  const handleReset = () => {
    setStep(1)
    setText('')
    setFile(null)
    setFileName('')
    setFileError('')
    setSent(false)
    setLoading(false)
    setQuestions([])
    setSkills([])
    setEditId(null)
    setSelectedCodingIds(new Set())
    setLibSearch('')
    setEvalName('')
    setDone(false)
    setCreatedEvalId(null)
    setPlanLimitError(false)
    setInviting(false)
    setViewing(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleInviteCandidates = () => {
    setInviting(true)
    const targetId = createdEvalId && createdEvalId !== 'draft' ? createdEvalId : ''
    if (targetId) {
      nav({
        to: '/recruiter/evaluations/$id/workspace',
        params: { id: targetId },
        search: { tab: 'candidates' } as any,
      })
    } else {
      nav({ to: '/recruiter/evaluations' })
    }
  }

  const handleViewEvaluation = () => {
    setViewing(true)
    const targetId = createdEvalId && createdEvalId !== 'draft' ? createdEvalId : ''
    if (targetId) {
      nav({
        to: '/recruiter/evaluations/$id/workspace',
        params: { id: targetId },
        search: { tab: 'overview' } as any,
      })
    } else {
      nav({ to: '/recruiter/evaluations' })
    }
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground antialiased selection:bg-nav-active selection:text-foreground">
      {/* Top Bar with Step List and New Chat */}
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-background px-5 py-5 text-[14px] text-muted-foreground sm:px-12">
        <div>
          {STEPS.map((s, idx) => {
            const num = idx + 1
            const isCurrent = num === step
            const isCompleted = num < step
            return (
              <span
                key={s}
                className={
                  isCurrent
                    ? 'mr-5 font-medium text-foreground'
                    : isCompleted
                      ? 'mr-5 text-muted-foreground'
                      : 'mr-5 text-muted-foreground/60'
                }
              >
                {num}  {s}
              </span>
            )
          })}
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="cursor-pointer border-0 bg-transparent p-0 text-[14px] leading-5 text-muted-foreground underline hover:text-foreground"
        >
          New chat
        </button>
      </div>

      {/* Scrolling Content Thread */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-10 sm:px-12">
        <div className="mx-auto max-w-[760px]">
          {/* Step 1: Initial Composer */}
          {!sent && (
            <div className="pt-[6vh]">
              <h1 className="text-[24px] font-semibold leading-[32px] text-foreground">
                What do you want to assess?
              </h1>
              <p className="mb-7 mt-1.5 text-[15px] leading-[22px] text-muted-foreground">
                Paste a job description or list the skills you need. Vitarka will suggest questions you can edit.
              </p>

              <div className="rounded-xl border border-border p-4 pb-3 focus-within:border-primary">
                <textarea
                  rows={6}
                  placeholder="Paste a job description, or type skills such as “Node.js, PostgreSQL, system design”"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && (text.trim() || file)) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  className="w-full resize-none border-0 bg-transparent text-[15px] leading-[22px] text-foreground outline-none placeholder:text-muted-foreground"
                />

                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-4 text-[14px]">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="cursor-pointer text-[15px] font-medium text-foreground underline hover:text-[#B45F06]"
                    >
                      Attach job description
                    </button>
                    {fileName ? (
                      <>
                        <span className="text-muted-foreground">{fileName}</span>
                        <button
                          type="button"
                          onClick={handleRemoveFile}
                          className="cursor-pointer text-muted-foreground underline hover:text-destructive"
                        >
                          Remove
                        </button>
                      </>
                    ) : (
                      <span className="text-muted-foreground">PDF, DOCX or TXT</span>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={!text.trim() && !file}
                    onClick={handleSend}
                    className="rounded-lg border-0 bg-primary px-4 py-2.5 text-[15px] font-medium leading-5 text-primary-foreground transition-colors hover:bg-[#E5820F] disabled:cursor-default disabled:bg-border disabled:text-muted-foreground"
                  >
                    Suggest questions
                  </button>
                </div>
              </div>

              {fileError && <p className="mt-2 text-[14px] text-destructive">{fileError}</p>}

              <input
                ref={fileInputRef}
                type="file"
                hidden
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileChange}
              />

              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-[14px]">
                <span className="text-muted-foreground">Try:</span>
                <button
                  type="button"
                  onClick={() =>
                    setText('Senior backend engineer, Node.js, PostgreSQL, system design')
                  }
                  className="cursor-pointer text-muted-foreground underline hover:text-foreground"
                >
                  Backend engineer
                </button>
                <button
                  type="button"
                  onClick={() => setText('Frontend engineer, React, performance, TypeScript')}
                  className="cursor-pointer text-muted-foreground underline hover:text-foreground"
                >
                  Frontend engineer
                </button>
                <button
                  type="button"
                  onClick={() => setText('DevOps engineer, Kafka, Docker, AWS')}
                  className="cursor-pointer text-muted-foreground underline hover:text-foreground"
                >
                  DevOps engineer
                </button>
              </div>
            </div>
          )}

          {/* Chat Messages */}
          {sent && (
            <>
              {/* User Message */}
              <div className="mb-8">
                <div className="mb-1.5 text-[14px] font-medium text-muted-foreground">You</div>
                <div className="whitespace-pre-wrap text-[15px] leading-[22px] text-foreground">
                  {text.length > 400 ? `${text.slice(0, 400)}…` : text || (
                    <span className="text-muted-foreground">Job description attached</span>
                  )}
                </div>
                {fileName && (
                  <div className="mt-1.5 text-[14px] text-muted-foreground">
                    Attached: {fileName}
                  </div>
                )}
              </div>

              {/* Vitarka Response Message */}
              <div className="mb-8">
                <div className="mb-1.5 text-[14px] font-medium text-muted-foreground">Vitarka</div>

                {loading ? (
                  <div className="text-[15px] text-muted-foreground">
                    <span className="vitarka-dot" />
                    <span className="vitarka-dot" />
                    <span className="vitarka-dot" />
                    {' '}Reading your requirements
                  </div>
                ) : (
                  <>
                    <p className="mb-1 text-[15px] text-foreground">
                      I found these skills: <b className="font-medium">{skills.join(' · ')}</b>.
                    </p>
                    <p className="mb-5 text-[14px] text-muted-foreground">
                      {step === 2
                        ? `Here are ${questions.length} questions to start with. Edit or remove any of them, then confirm.`
                        : `You confirmed ${questions.length} questions.`}
                    </p>

                    {/* Question Rows */}
                    <div>
                      {questions.map((q, idx) => {
                        const isEditing = step === 2 && editId === q.id
                        const isReadOnly = step > 2

                        if (isEditing) {
                          return (
                            <div
                              key={q.id}
                              className="grid grid-cols-[28px_1fr_auto] gap-2 border-b border-border py-4 first-of-type:border-t"
                            >
                              <div className="text-[15px] text-muted-foreground">{idx + 1}</div>
                              <div>
                                <div className="rounded-lg border border-border p-2 focus-within:border-primary">
                                  <textarea
                                    rows={3}
                                    value={editText}
                                    onChange={(e) => setEditText(e.target.value)}
                                    className="w-full resize-none border-0 bg-transparent text-[15px] leading-[22px] text-foreground outline-none"
                                  />
                                </div>
                                <div className="mt-2.5 flex items-center gap-4 text-[14px]">
                                  <span className="text-muted-foreground">Marks</span>
                                  <div className="w-[72px] rounded-lg border border-border px-2.5 py-1 focus-within:border-primary">
                                    <input
                                      type="number"
                                      min={1}
                                      value={editMarks}
                                      onChange={(e) =>
                                        setEditMarks(Math.max(1, parseInt(e.target.value) || 1))
                                      }
                                      className="w-full border-0 bg-transparent text-[15px] text-foreground outline-none"
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEdit(q.id)}
                                    className="cursor-pointer text-[15px] font-medium text-foreground underline hover:text-[#B45F06]"
                                  >
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleCancelEdit}
                                    className="cursor-pointer text-muted-foreground underline hover:text-foreground"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                              <div />
                            </div>
                          )
                        }

                        return (
                          <div
                            key={q.id}
                            className="grid grid-cols-[28px_1fr_auto] gap-2 border-b border-border py-4 first-of-type:border-t hover:bg-accent/40"
                          >
                            <div className="text-[15px] text-muted-foreground">{idx + 1}</div>
                            <div>
                              <div className="text-[14px] leading-5 text-muted-foreground">
                                {q.type} · MCQ · {q.marks} marks
                              </div>
                              <div className="mt-0.5 text-[15px] leading-[22px] text-foreground">
                                {q.text}
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-[14px]">
                              {!isReadOnly && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleStartEdit(q)}
                                    className="cursor-pointer text-muted-foreground underline hover:text-foreground"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveQuestion(q.id)}
                                    className="cursor-pointer text-muted-foreground underline hover:text-destructive"
                                  >
                                    Remove
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {step === 2 && (
                      <div className="mt-4 flex items-center gap-4 text-[14px]">
                        <button
                          type="button"
                          onClick={handleAddQuestion}
                          className="cursor-pointer text-[15px] font-medium text-foreground underline hover:text-[#B45F06]"
                        >
                          Add a question
                        </button>
                        <button
                          type="button"
                          onClick={handleRegenerate}
                          className="cursor-pointer text-muted-foreground underline hover:text-foreground"
                        >
                          Regenerate
                        </button>
                      </div>
                    )}

                    {step > 2 && !done && (
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => setStep(2)}
                          className="cursor-pointer text-[14px] text-muted-foreground underline hover:text-foreground"
                        >
                          Edit questions
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Step 3: Coding Questions Library Selection */}
              {step >= 3 && !loading && (
                <div className="mb-8">
                  <div className="mb-1.5 text-[14px] font-medium text-muted-foreground">Vitarka</div>
                  <p className="mb-4 text-[15px] leading-[22px] text-foreground">
                    {done
                      ? 'Coding questions added.'
                      : 'Now add coding questions from your library. Pick as many as you need.'}
                  </p>

                  {!done && (
                    <div className="mb-2 rounded-lg border border-border px-3 py-2 focus-within:border-primary">
                      <input
                        type="text"
                        placeholder="Search the library"
                        value={libSearch}
                        onChange={(e) => setLibSearch(e.target.value)}
                        className="w-full border-0 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
                      />
                    </div>
                  )}

                  {/* Library Items */}
                  <div>
                    {!done && <div className="border-t border-border" />}
                    {filteredLibrary.map((item) => {
                      const isChecked = selectedCodingIds.has(item.id)
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleToggleCoding(item.id)}
                          className="grid cursor-pointer grid-cols-[20px_1fr_auto] items-start gap-3 border-b border-border py-3.5 hover:bg-accent/40"
                        >
                          {done ? (
                            <span />
                          ) : (
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              tabIndex={-1}
                              className="mt-1 h-4 w-4 accent-primary"
                            />
                          )}
                          <div>
                            <div className="text-[15px] font-medium text-foreground">
                              {item.title}
                            </div>
                            <div className="text-[14px] text-muted-foreground">{item.meta}</div>
                          </div>
                          <div className="text-right text-[14px] text-muted-foreground">
                            {item.marks} marks · {item.minutes} min
                          </div>
                        </div>
                      )
                    })}
                    {filteredLibrary.length === 0 && (
                      <p className="py-4 text-[14px] text-muted-foreground">
                        No coding questions match your search
                      </p>
                    )}
                  </div>

                  {!done && (
                    <div className="mt-7 max-w-[360px]">
                      <div className="mb-1.5 text-[14px] text-muted-foreground">Evaluation name</div>
                      <div className="rounded-lg border border-border px-3 py-2 focus-within:border-primary">
                        <input
                          type="text"
                          value={evalName}
                          onChange={(e) => setEvalName(e.target.value)}
                          className="w-full border-0 bg-transparent text-[15px] text-foreground outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {planLimitError && (
                    <div className="mt-4 text-[14px] text-destructive">
                      You have reached your plan’s evaluation limit.{' '}
                      <Link
                        to="/recruiter/settings"
                        search={{ tab: 'subscription' } as any}
                        className="font-medium underline hover:text-[#B45F06]"
                      >
                        Upgrade plan
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* Step 4: Ready State */}
              {done && (
                <div className="mb-8">
                  <div className="mb-1.5 text-[14px] font-medium text-muted-foreground">Vitarka</div>
                  <h3 className="text-[16px] font-medium leading-6 text-foreground">
                    {evalName} is ready
                  </h3>
                  <p className="mb-5 mt-1 text-[14px] leading-5 text-muted-foreground">
                    {totals.n} knowledge questions, {totals.c} coding{' '}
                    {totals.c === 1 ? 'question' : 'questions'} · {totals.m} marks · about {totals.t} min.
                    It is saved as a draft until you publish it.
                  </p>
                  <div className="flex flex-wrap items-center gap-4">
                    <button
                      type="button"
                      onClick={handleInviteCandidates}
                      className="rounded-lg border-0 bg-primary px-4 py-2.5 text-[15px] font-medium leading-5 text-primary-foreground transition-colors hover:bg-[#E5820F]"
                    >
                      {inviting ? 'Opening invites…' : 'Invite candidates'}
                    </button>
                    <button
                      type="button"
                      onClick={handleViewEvaluation}
                      className="cursor-pointer border-0 bg-transparent p-0 text-[15px] font-medium text-foreground underline hover:text-[#B45F06]"
                    >
                      {viewing ? 'Opening evaluation…' : 'View evaluation'}
                    </button>
                    <button
                      type="button"
                      onClick={handleReset}
                      className="cursor-pointer border-0 bg-transparent p-0 text-[14px] text-muted-foreground underline hover:text-foreground"
                    >
                      Create another
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Sticky Bottom Bar — renders only on steps 2 and 3 when not loading */}
      {step === 2 && !loading && (
        <div className="flex shrink-0 items-center justify-between border-t border-border bg-background px-5 py-4 sm:px-12">
          <div className="text-[14px] text-muted-foreground">
            {totals.n} questions · {totals.m} marks
          </div>
          <button
            type="button"
            disabled={totals.n === 0 || editId !== null}
            onClick={handleConfirmQuestions}
            className="rounded-lg border-0 bg-primary px-4 py-2.5 text-[15px] font-medium leading-5 text-primary-foreground transition-colors hover:bg-[#E5820F] disabled:cursor-default disabled:bg-border disabled:text-muted-foreground"
          >
            Confirm questions
          </button>
        </div>
      )}

      {step === 3 && !loading && (
        <div className="flex shrink-0 items-center justify-between border-t border-border bg-background px-5 py-4 sm:px-12">
          <div className="text-[14px] text-muted-foreground">
            {totals.n} knowledge · {totals.c} coding · {totals.m} marks · about {totals.t} min
          </div>
          <button
            type="button"
            disabled={totals.c === 0 || !evalName.trim() || creating}
            onClick={handleCreateEvaluation}
            className="rounded-lg border-0 bg-primary px-4 py-2.5 text-[15px] font-medium leading-5 text-primary-foreground transition-colors hover:bg-[#E5820F] disabled:cursor-default disabled:bg-border disabled:text-muted-foreground"
          >
            {creating ? 'Creating…' : 'Create evaluation'}
          </button>
        </div>
      )}
    </div>
  )
}
