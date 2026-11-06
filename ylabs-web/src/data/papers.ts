export type Topic =
  | "RAG"
  | "AI Agents"
  | "LLMs"
  | "AI Coding"
  | "Evaluation"
  | "Fine-tuning"
  | "Multimodal";

export type Source = "arXiv" | "OpenAlex" | "Semantic Scholar";

export interface Paper {
  id: string;
  title: string;
  authors: string[];
  date: string; // ISO
  source: Source;
  topic: Topic;
  description: string;
  url: string;
  citations: number;
  summary: {
    about: string;
    problem: string;
    approach: string;
    results: string;
    why: string;
    limits: string;
  };
}

export const TOPICS: { name: Topic; description: string; count: number }[] = [
  { name: "RAG", description: "Retrieval pipelines, chunking, reranking and grounding", count: 42 },
  { name: "AI Agents", description: "Planning, tool use and multi-agent systems", count: 58 },
  { name: "LLMs", description: "Training, scaling, reasoning and efficiency", count: 120 },
  { name: "AI Coding", description: "Code generation, repair and developer tools", count: 37 },
  { name: "Evaluation", description: "Benchmarks, safety testing and reliability", count: 29 },
  { name: "Fine-tuning", description: "Adapters, alignment and distillation", count: 33 },
  { name: "Multimodal", description: "Vision, speech and video with language models", count: 46 },
];

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};

// MOCK DATA: placeholder papers for UI design only.
const PAPERS: Paper[] = [
  {
    id: "p1",
    title: "Adaptive Retrieval for Long-Context Question Answering",
    authors: ["A. Sharma", "L. Chen", "M. Okafor", "J. Silva", "P. Rao", "D. Kim", "S. Ali"],
    date: daysAgo(0),
    source: "arXiv",
    topic: "RAG",
    citations: 12,
    url: "https://arxiv.org",
    description:
      "Shows that retrieving fewer but better-chosen passages beats stuffing the full context into the model. Relevant if you are building RAG pipelines over long documents.",
    summary: {
      about: "A method that decides, per question, how many passages to retrieve instead of using a fixed number.",
      problem: "Fixed top-k retrieval either misses evidence or floods the model with noise on long documents.",
      approach: "A small scorer estimates how much evidence a question needs and stops retrieval when more passages stop helping.",
      results: "Higher answer accuracy on long-document benchmarks while using fewer retrieved tokens.",
      why: "Worth trying if your RAG answers degrade as documents grow, and you pay per token.",
      limits: "Tested on English text; adds a small scoring step to every query.",
    },
  },
  {
    id: "p2",
    title: "Learning When to Stop: Budgeted Tool Use in Autonomous Agents",
    authors: ["R. Iyer", "J. Park", "T. Becker", "N. Gupta"],
    date: daysAgo(0),
    source: "Semantic Scholar",
    topic: "AI Agents",
    citations: 8,
    url: "https://www.semanticscholar.org",
    description:
      "Introduces a way for agents to decide when another tool call is not worth the cost, cutting wasted steps without hurting task success.",
    summary: {
      about: "A training approach that teaches agents to weigh the cost of each extra tool call.",
      problem: "Agents often keep calling tools long after they have enough information, wasting time and money.",
      approach: "The agent is trained with a step budget and learns to stop or answer once the expected gain is low.",
      results: "Fewer tool calls on multi-step tasks with similar success rates.",
      why: "Directly useful for lowering latency and API cost in production agents.",
      limits: "Evaluated on simulated tool environments, not live APIs.",
    },
  },
  {
    id: "p3",
    title: "Repository-Level Code Completion with Dependency Graphs",
    authors: ["T. Nguyen", "S. Rao", "H. Mori", "C. Dubois", "E. Lund", "K. Patel"],
    date: daysAgo(1),
    source: "OpenAlex",
    topic: "AI Coding",
    citations: 21,
    url: "https://openalex.org",
    description:
      "Uses a project's import graph to pick the context a model sees, improving completions in large codebases.",
    summary: {
      about: "A way to choose which files a code model sees by following the project's dependency graph.",
      problem: "Large repositories do not fit in context, and picking files by text similarity misses real dependencies.",
      approach: "Build an import graph, rank neighbouring files by distance, and feed the closest ones to the model.",
      results: "Better completion accuracy on repository-scale benchmarks than similarity-based retrieval.",
      why: "A practical idea for any coding assistant working on a real project.",
      limits: "Needs a language-specific parser for each language.",
    },
  },
  {
    id: "p4",
    title: "Small Models, Long Reasoning: Distillation Without Collapse",
    authors: ["M. Haddad", "K. Lee", "V. Rossi", "A. Novak"],
    date: daysAgo(1),
    source: "arXiv",
    topic: "LLMs",
    citations: 34,
    url: "https://arxiv.org",
    description:
      "Explains why distilled small models lose reasoning ability on long problems and a training recipe that avoids it.",
    summary: {
      about: "A study of why small distilled models fail at long reasoning, plus a fix.",
      problem: "Small models trained on long reasoning traces often repeat themselves or lose the thread.",
      approach: "Filter traces by quality and train in stages from short to long reasoning.",
      results: "Small models keep more of the teacher's reasoning accuracy on long problems.",
      why: "Useful if you want cheap models that still reason well.",
      limits: "Results are shown on math and logic tasks only.",
    },
  },
  {
    id: "p5",
    title: "Beyond Accuracy: Measuring Reliability of LLM Judges",
    authors: ["F. Moreau", "Y. Tanaka", "B. Osei"],
    date: daysAgo(3),
    source: "Semantic Scholar",
    topic: "Evaluation",
    citations: 17,
    url: "https://www.semanticscholar.org",
    description:
      "Tests how consistent language models are when they grade other models' answers, and where they disagree with humans.",
    summary: {
      about: "An analysis of how reliable LLM-as-a-judge setups really are.",
      problem: "Teams use LLMs to grade outputs without knowing how stable those grades are.",
      approach: "Compare judge scores across prompts, orderings and models against human ratings.",
      results: "Judges are sensitive to answer order and length, and agree less with humans on hard cases.",
      why: "Helps you design more trustworthy automated evaluations.",
      limits: "Human ratings come from a small annotator pool.",
    },
  },
  {
    id: "p6",
    title: "Low-Rank Adapters That Merge Cleanly Across Tasks",
    authors: ["G. Costa", "I. Petrov", "L. Wang", "R. Singh", "O. Berg"],
    date: daysAgo(5),
    source: "arXiv",
    topic: "Fine-tuning",
    citations: 26,
    url: "https://arxiv.org",
    description:
      "Proposes a training trick so separately trained adapters can be combined without hurting each other.",
    summary: {
      about: "A way to train adapters so they can be merged into one model later.",
      problem: "Merging independently trained adapters usually causes interference and lower quality.",
      approach: "Add a small regulariser that keeps each adapter's updates in a compatible subspace.",
      results: "Merged adapters keep most of their single-task performance.",
      why: "Lets teams ship one model with several skills instead of many copies.",
      limits: "Gains shrink when tasks are very different.",
    },
  },
  {
    id: "p7",
    title: "Grounding Charts and Tables for Vision-Language Models",
    authors: ["H. Ito", "S. Mehta", "A. Duarte", "Z. Chen"],
    date: daysAgo(9),
    source: "OpenAlex",
    topic: "Multimodal",
    citations: 15,
    url: "https://openalex.org",
    description:
      "A training set and method that help vision-language models read numbers from charts and tables more accurately.",
    summary: {
      about: "A dataset and training method for reading charts and tables.",
      problem: "Vision-language models often misread values from charts and dense tables.",
      approach: "Train on synthetic charts paired with the underlying data, then fine-tune on real documents.",
      results: "Large gains on chart question answering benchmarks.",
      why: "Useful for document and dashboard understanding products.",
      limits: "Synthetic charts do not cover every real-world style.",
    },
  },
  {
    id: "p8",
    title: "Chunking Strategies for Retrieval: A Large-Scale Comparison",
    authors: ["E. Ward", "N. Fischer", "P. Lopez"],
    date: daysAgo(14),
    source: "arXiv",
    topic: "RAG",
    citations: 40,
    url: "https://arxiv.org",
    description:
      "Compares common ways of splitting documents for retrieval and shows when simple fixed-size chunks are enough.",
    summary: {
      about: "A broad comparison of how to split documents before indexing them.",
      problem: "Teams pick chunk sizes by guesswork and rarely measure the effect.",
      approach: "Test fixed, sentence-based and semantic chunking across several datasets and retrievers.",
      results: "Fixed-size chunks with overlap are competitive; fancy methods help only on some data.",
      why: "Saves time: start simple and measure before adding complexity.",
      limits: "Focuses on English documents and a few embedding models.",
    },
  },
];

// TODO: replace with a real API call (arXiv, OpenAlex, Semantic Scholar ingestion).
export async function fetchPapers(): Promise<Paper[]> {
  return PAPERS;
}

export const getPapers = (): Paper[] => PAPERS;
