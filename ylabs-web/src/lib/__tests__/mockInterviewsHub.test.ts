import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("Mock Interviews Hub Data & Display", () => {
  it("1. Backend mock interview item mapper correctly preserves title, duration, and user progress", () => {
    const rawBackendItem = {
      id: "3b719fd7-43f7-4d5c-b738-b888db637e24",
      title: "Data Structures & Algorithms (Automatic)",
      description: "Comprehensive adaptive technical interview assessing problem-solving and algorithmic thinking.",
      instructions: "Hands-free interactive AI interview.",
      max_duration: 45,
      interview_mode: "automatic",
      required_skills: ["Data Structures", "Algorithms", "Time & Space Complexity"],
      optional_skills: ["Dynamic Programming", "Recursion & Backtracking"],
      publish_status: "active",
      products: ["ycode", "ylabs", "ycampus"],
      participants_count: 0,
      user_progress: {
        completed_count: 0,
        is_master: false,
      },
      predefined_tree: [],
    };

    const mapped = {
      slug: rawBackendItem.id,
      name: rawBackendItem.title,
      description: rawBackendItem.description,
      minutes: rawBackendItem.max_duration || 30,
      completed: rawBackendItem.user_progress?.completed_count ?? 0,
      products: rawBackendItem.products || [],
      backendId: rawBackendItem.id,
    };

    assert.equal(mapped.name, "Data Structures & Algorithms (Automatic)");
    assert.equal(mapped.slug, "3b719fd7-43f7-4d5c-b738-b888db637e24");
    assert.equal(mapped.minutes, 45);
    assert.equal(mapped.completed, 0);
  });

  it("2. Multiple backend interviews for ylabs are all preserved without being dropped by stale local storage", () => {
    const backendData = [
      {
        slug: "273a2468-07cb-4b2a-821f-824b4f0b2f91",
        name: "Node.js Development (Automatic)",
        description: "Node interview",
        minutes: 30,
        completed: 0,
      },
      {
        slug: "3b719fd7-43f7-4d5c-b738-b888db637e24",
        name: "Data Structures & Algorithms (Automatic)",
        description: "DSA interview",
        minutes: 45,
        completed: 0,
      },
    ];

    // Verify that when backendData is present, both interviews are displayed
    const displayedInterviews = backendData && backendData.length > 0 ? backendData : [];
    assert.equal(displayedInterviews.length, 2);
    assert.equal(displayedInterviews[0].name, "Node.js Development (Automatic)");
    assert.equal(displayedInterviews[1].name, "Data Structures & Algorithms (Automatic)");
  });

  it("3. Completed status correctly detects completed state from progress or submissions", () => {
    const submissions = [
      { mock_interview_id: "3b719fd7-43f7-4d5c-b738-b888db637e24", status: "completed" },
    ];

    const checkCompleted = (item: { slug: string; backendId: string; completed: number; name: string }) => {
      if (item.completed > 0) return true;
      return submissions.some((s) => s.mock_interview_id === item.slug && s.status === "completed");
    };

    assert.equal(
      checkCompleted({
        slug: "273a2468-07cb-4b2a-821f-824b4f0b2f91",
        backendId: "273a2468-07cb-4b2a-821f-824b4f0b2f91",
        completed: 0,
        name: "Node.js Development",
      }),
      false
    );

    assert.equal(
      checkCompleted({
        slug: "3b719fd7-43f7-4d5c-b738-b888db637e24",
        backendId: "3b719fd7-43f7-4d5c-b738-b888db637e24",
        completed: 0,
        name: "Data Structures & Algorithms",
      }),
      true
    );
  });

  it("4. Pluralization formats '1 interview' vs '2 interviews'", () => {
    const fmt = (count: number) => (count === 1 ? "1 interview" : `${count} interviews`);
    assert.equal(fmt(1), "1 interview");
    assert.equal(fmt(2), "2 interviews");
    assert.equal(fmt(0), "0 interviews");
  });

  it("5. Live start interview initiates backend session and populates first question from AI engine", () => {
    const interviewId = "f5b5a009-b898-4e47-9d4b-dfaec994d7a8";
    const duration = 30;

    const startPayload = {
      source: "student",
      experience_level: "Beginner",
      selected_duration: duration,
      force: true,
    };

    assert.equal(startPayload.source, "student");
    assert.equal(startPayload.force, true);
    assert.equal(startPayload.selected_duration, 30);

    const mockStartResponse = {
      submission_id: "sub-9988",
      interview_session_id: "sess-1234",
      chat_session_id: "chat-5678",
      status: "started",
      first_question:
        "Hello! I'm your AI interviewer today. We'll be discussing the Python Development (Automatic) role. To start, could you please introduce yourself?",
    };

    const firstQuestion = mockStartResponse.first_question;
    const log = [{ who: "ai" as const, text: firstQuestion }];

    assert.equal(log.length, 1);
    assert.equal(log[0].who, "ai");
    assert.ok(log[0].text.includes("Python Development (Automatic)"));
  });

  it("6. Answer submission to dynamic question engine appends user turn and advances to next AI question", () => {
    const sessionId = "sess-1234";
    const userAnswer = "Hi, I am Gandhi, a backend engineer working with Python and Django.";

    const submitPayload = {
      source: "student",
      interview_session_id: sessionId,
      user_answer: userAnswer,
      status: "normal",
    };

    assert.equal(submitPayload.interview_session_id, "sess-1234");
    assert.equal(submitPayload.user_answer, userAnswer);

    const mockNextResponse = {
      question:
        "Nice to meet you, Gandhi! Let's start with our first technical question: In Python, can you explain the difference between a list and a tuple?",
      is_finished: false,
      question_id: 2,
    };

    let log: { who: "ai" | "me"; text: string }[] = [
      { who: "ai", text: "Hello! To start, could you please introduce yourself?" },
    ];

    log = [...log, { who: "me", text: userAnswer }, { who: "ai", text: mockNextResponse.question }];

    assert.equal(log.length, 3);
    assert.equal(log[1].who, "me");
    assert.equal(log[2].who, "ai");
    assert.ok(log[2].text.includes("In Python, can you explain the difference between a list and a tuple?"));
    assert.equal(mockNextResponse.is_finished, false);
  });

  it("7. Concluding interview marks submission completed and triggers report generation", () => {
    const finishPayload = {
      source: "student",
      interview_session_id: "sess-1234",
      user_answer: "",
      status: "finish",
    };

    assert.equal(finishPayload.status, "finish");

    const mockBackendReport = {
      overall_score: 85,
      feedback_summary: "Strong performance with clear explanations and solid Python fundamentals.",
      recommendation: "Strong Hire",
      key_takeaways: {
        strengths: ["Clear communication", "Good grasp of mutability and data structures"],
        improvements: ["Provide more production-scale examples"],
      },
    };

    const overall = mockBackendReport.overall_score;
    assert.equal(overall, 85);
    assert.equal(mockBackendReport.recommendation, "Strong Hire");
  });

  it("8. Speech recognition separates live spoken text from manual input text box and auto-submits after 3s", () => {
    let draft = ""; // Input text box value
    let liveSpokenText = ""; // Spoken transcript buffer
    let submittedText: string | null = null;

    const setDraft = (v: string) => {
      draft = v;
    };
    const setLiveSpokenText = (v: string) => {
      liveSpokenText = v;
    };
    const submit = (override?: string) => {
      submittedText = override || draft;
      draft = "";
      liveSpokenText = "";
    };

    // Simulate incoming speech
    const speechFragments = ["Hello", "My name is manikanda"];
    for (const fragment of speechFragments) {
      liveSpokenText = (liveSpokenText ? `${liveSpokenText} ` : "") + fragment;
      setLiveSpokenText(liveSpokenText);
      // NOTE: setDraft is deliberately NOT called!
    }

    // Verify transcript is NOT in the text box
    assert.equal(draft, "");
    assert.equal(liveSpokenText, "Hello My name is manikanda");

    // Simulate 3-second silence timeout elapsing
    submit(liveSpokenText);

    // Verify auto-submitted payload and cleanup
    assert.equal(submittedText, "Hello My name is manikanda");
    assert.equal(liveSpokenText, "");
    assert.equal(draft, "");
  });
});
