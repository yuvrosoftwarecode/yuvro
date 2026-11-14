import { restApiAuthUtil } from "@/utils/RestApiAuthUtil";

export interface ResearchTopicItem {
  id: number;
  name: string;
  display_name: string;
  description: string;
  order: number;
  papers_count: number;
  new_this_week: number;
  is_followed: boolean;
}

export interface PaperSummaryData {
  id: string;
  about: string;
  problem: string;
  approach: string;
  results: string;
  why: string;
  limits: string;
  developer_context?: string;
  model_used?: string;
  created_at?: string;
}

export interface ResearchPaperItem {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  description: string;
  published_date: string;
  date: string;
  source: "Hugging Face" | "arXiv" | "OpenAlex" | string;
  external_id: string;
  paper_url: string;
  url: string;
  pdf_url?: string;
  github_url?: string;
  upvotes_count?: number;
  upvotes?: number;
  alphaxiv_url?: string;
  reddit_search_url?: string;
  hf_discussion_url?: string;
  citations_count: number;
  citations: number;
  topic: string;
  has_summary: boolean;
  is_unlocked?: boolean;
  summary?: PaperSummaryData | null;
  tags?: string[];
}

export interface ResearchFilterParams {
  view?: "latest" | "following" | "topics";
  topic?: string;
  source?: string;
  period?: "today" | "week" | "month";
  sort?: "newest" | "cited" | "upvoted";
  search?: string;
  limit?: number;
  followed_topics?: string[];
}

export interface PaperListResponse {
  count: number;
  results: ResearchPaperItem[];
}

export interface SummarizeResponse {
  cached: boolean;
  credits_deducted?: number;
  summary: PaperSummaryData;
  message: string;
}

export const researchService = {
  async getPapers(params: ResearchFilterParams = {}): Promise<PaperListResponse> {
    const queryParams: Record<string, string> = {};
    if (params.view) queryParams.view = params.view;
    if (params.topic && params.topic !== "All") queryParams.topic = params.topic;
    if (params.source && params.source !== "All") queryParams.source = params.source;
    if (params.period) queryParams.period = params.period;
    if (params.sort) queryParams.sort = params.sort;
    if (params.search?.trim()) queryParams.search = params.search.trim();
    if (params.limit) queryParams.limit = String(params.limit);

    if (params.followed_topics && params.followed_topics.length > 0) {
      params.followed_topics.forEach((t) => {
        queryParams.followed_topics = t;
      });
    }

    return await restApiAuthUtil.get<PaperListResponse>("/research/papers/", {
      params: queryParams,
    });
  },

  async getPaper(id: string): Promise<ResearchPaperItem> {
    return await restApiAuthUtil.get<ResearchPaperItem>(`/research/papers/${id}/`);
  },

  async getTopics(): Promise<ResearchTopicItem[]> {
    return await restApiAuthUtil.get<ResearchTopicItem[]>("/research/topics/");
  },

  async toggleFollowTopic(topicName: string): Promise<{ topic: string; followed: boolean; message: string }> {
    return await restApiAuthUtil.post<{ topic: string; followed: boolean; message: string }>(
      `/research/topics/${encodeURIComponent(topicName)}/toggle-follow/`,
      {},
    );
  },

  async getFollowedTopics(): Promise<{ followed_topics: string[] }> {
    return await restApiAuthUtil.get<{ followed_topics: string[] }>("/research/followed-topics/");
  },

  async summarizePaper(paperId: string): Promise<SummarizeResponse> {
    return await restApiAuthUtil.post<SummarizeResponse>(`/research/papers/${paperId}/summarize/`, {});
  },

  async syncPapers(): Promise<{ status: string; new_papers_ingested: number; total_papers: number }> {
    return await restApiAuthUtil.post<{ status: string; new_papers_ingested: number; total_papers: number }>(
      "/research/sync/",
      {},
    );
  },
};

export default researchService;
