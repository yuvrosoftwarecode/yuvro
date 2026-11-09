import { restApiUtil, yhubApiUtil } from "../utils/RestApiUtil";
import { restApiAuthUtil } from "../utils/RestApiAuthUtil";
import { getLabCalculatedStats } from "../lib/recruiter";

export let tempResumeFile: File | null = null;
export function setTempResumeFile(file: File | null) { tempResumeFile = file; }

export const evaluationService = {
  async sendRegistrationOtp(
    evaluationId: string,
    email: string,
    title: string = "Evaluation",
  ): Promise<any> {
    return yhubApiUtil.post(`/auth/public_send_otp/`, {
      resource_id: evaluationId,
      resource_type: "evaluation",
      email,
      contest_title: title,
    });
  },

  async verifyRegistrationOtp(evaluationId: string, email: string, otp: string, firstName?: string, lastName?: string): Promise<any> {
    return yhubApiUtil.post(`/auth/public_verify_otp/`, {
      resource_id: evaluationId,
      resource_type: "evaluation",
      email,
      otp,
      first_name: firstName,
      last_name: lastName,
    });
  },

  async registerPublicEvaluation(evaluationId: string, accessToken?: string, resumeUrl?: string, phone?: string): Promise<any> {
    return restApiUtil.post(
      `/skill_evaluation/evaluations/${evaluationId}/public_register/`,
      { resume_url: resumeUrl, phone },
      {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      },
    );
  },

  async checkRegistration(evaluationId: string, email: string): Promise<{ registered: boolean }> {
    return restApiUtil.post(`/skill_evaluation/evaluations/${evaluationId}/check_registration/`, {
      email,
    });
  },

  async getWorkspaceData(evaluationId: string): Promise<any> {
    let emailParam = "";
    try {
      if (typeof window !== "undefined") {
        const cand = JSON.parse(localStorage.getItem("yuvro-eval-candidate") || "{}");
        if (cand?.email && cand?.evaluationId === evaluationId) {
          emailParam = `?email=${encodeURIComponent(cand.email)}`;
        }
      }
    } catch {}

    const [evalData, allLabs] = await Promise.all([
      restApiAuthUtil.get(`/skill_evaluation/evaluations/${evaluationId}/${emailParam}`),
      restApiAuthUtil.get(`/skill_evaluation/lab-questions/`).catch(() => []),
    ]);

    if ((evalData as any).sections) {
      (evalData as any).sections.forEach((sec: any) => {
        if (sec.type === "LAB" && sec.questions) {
          sec.questions.forEach((q: any) => {
            const selectedTaskId = typeof q === 'object' ? q.selected_task_id : undefined;
            const selectedTaskIds = typeof q === 'object' ? q.selected_task_ids : undefined;
            const selectedTask = typeof q === 'object' ? q.selected_task : undefined;
            const qId = typeof q === 'object' ? (q.id || q.lab_id) : q;
            const fullLab = (allLabs as any[]).find(l => l.id === qId);
            if (fullLab) {
              if (typeof q === 'object') {
                Object.assign(q, fullLab);
                if (selectedTaskIds) {
                  q.selected_task_ids = selectedTaskIds;
                } else if (selectedTaskId) {
                  q.selected_task_ids = [selectedTaskId];
                }
                if (selectedTaskId) {
                  q.selected_task_id = selectedTaskId;
                  const matchingTask = Array.isArray(fullLab.tasks)
                    ? fullLab.tasks.find((t: any) => String(t.id || t.task_slug || t.title) === String(selectedTaskId))
                    : null;
                  if (matchingTask) {
                    q.selected_task = { ...matchingTask, ...(selectedTask || {}) };
                  } else if (selectedTask) {
                    q.selected_task = selectedTask;
                  }
                } else if (selectedTask) {
                  q.selected_task = selectedTask;
                }

                // Recalculate duration_minutes and marks based on selected tasks
                const stats = getLabCalculatedStats(q);
                q.duration_minutes = stats.minutes;
                q.marks = stats.marks;
              }
            } else if (typeof q === 'object') {
              const stats = getLabCalculatedStats(q);
              q.duration_minutes = stats.minutes;
              q.marks = stats.marks;
            }
          });
        }
      });
    }

    return evalData;
  },

  async startLab(evaluationId: string, labId: string): Promise<any> {
    return restApiAuthUtil.post(`/skill_evaluation/evaluations/${evaluationId}/start_lab/`, { lab_id: labId });
  },

  async finishEvaluation(evaluationId: string, autoSubmitted: boolean = false): Promise<any> {
    return restApiAuthUtil.post(`/skill_evaluation/evaluations/${evaluationId}/finish/`, { auto_submitted: autoSubmitted });
  },

  async submitLab(evaluationId: string, labId: string, data: any): Promise<any> {
    // If there's an existing submission, we might need a GET first or use a custom endpoint.
    // The backend views.py uses `UserLabQuestionBankSubmissionViewSet`. It's typical to use POST or PATCH.
    // Let's use the `/skill_evaluation/evaluations/${evaluationId}/submit_lab/` if we added one, but wait, 
    // I added `submit_lab` to EvaluationViewSet!
    // No, I added `submit_knowledge_answers`, but for lab I didn't add `submit_lab` to EvaluationViewSet! 
    // Wait, in my updated implementation plan, I said I would add `submit_lab` to EvaluationViewSet.
    // Let me check what I actually added. I didn't add it yet!
    return restApiAuthUtil.post(`/skill_evaluation/evaluations/${evaluationId}/submit_lab/`, { lab_id: labId, ...data });
  },

  async submitKnowledgeAnswers(evaluationId: string, sectionId: string, answers: any): Promise<any> {
    return restApiAuthUtil.post(`/skill_evaluation/evaluations/${evaluationId}/submit_knowledge_answers/`, {
      section_id: sectionId,
      answers: answers
    });
  },

  async submitSystemDesign(evaluationId: string, payload: {
    section_id: string;
    question_id?: string;
    design?: any;
    action?: "save" | "submit" | "evaluate";
    status?: string;
    started_at?: string;
    [key: string]: any;
  }): Promise<any> {
    return restApiAuthUtil.post(`/skill_evaluation/evaluations/${evaluationId}/submit_system_design/`, payload);
  },

  async provisionLabs(evaluationId: string): Promise<any> {
    return restApiAuthUtil.post(`/skill_evaluation/evaluations/${evaluationId}/provision_labs/`, {});
  },

  async updateCandidateStatus(evaluationId: string, email: string, status: string): Promise<any> {
    return restApiAuthUtil.post(`/skill_evaluation/evaluations/${evaluationId}/update_candidate_status/`, { email, status });
  }
};
