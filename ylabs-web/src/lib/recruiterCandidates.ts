// Deterministic demo candidate generator for the recruiter Evaluation Workspace.
// 1000 realistic Indian candidates per evaluation, filterable/sortable.

export type CandStatus = "Submitted" | "Completed" | "In Progress" | "Not Started" | "Expired";
export type HiringStatus =
  "Pending Review" | "Shortlisted" | "Interview Scheduled" | "Selected" | "Rejected" | "Hold";
export type Recommendation = "Strong Hire" | "Hire" | "Maybe" | "Reject";
export type VitarkaLabel = "Excellent" | "Good" | "Average" | "Poor";

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  college: string;
  company: string;
  experience: number; // years
  domain: string;
  skills: string[];
  tags: string[];
  labsScore: number;
  assessmentScore: number;
  vitarkaScore: number;
  eci: number; // Engineering Capability Index
  recommendation: Recommendation;
  status: CandStatus;
  hiringStatus: HiringStatus;
  submittedAt: number; // ms
  completionMinutes: number;
  avatarHue: number;
  rawSubmission?: any;
  proctoringData?: {
    totalViolations: number;
    tabSwitches: number;
    copyPastes: number;
    windowBlurs: number;
    snapshots: { time: number; type: string }[];
    timelineEvents: { time: number; type: string; desc: string; severity: number }[];
    sections: {
      labs: { score: number; timeSpent: number; events: { time: number; type: string; desc: string; severity: number }[] };
      assessment: { score: number; timeSpent: number; events: { time: number; type: string; desc: string; severity: number }[] };
      vitarka: { score: number; timeSpent: number; events: { time: number; type: string; desc: string; severity: number }[] };
    };
  };
}

const REAL_NAMES = [
  "Kadali Harshavardhan",
  "Medishetty Manikanta Gandhi",
  "Mrinal Guptha",
  "Mucharla Sreelekha",
  "Rohith Godugu",
  "Devendra Dora",
  "Shilpa dora"
];

const COLLEGES = [
  "IIT Bombay",
  "IIT Delhi",
  "IIT Madras",
  "IIT Kanpur",
  "IIT Kharagpur",
  "IIT Roorkee",
  "IIT Guwahati",
  "IIT Hyderabad",
  "NIT Trichy",
  "NIT Warangal",
  "NIT Surathkal",
  "BITS Pilani",
  "BITS Goa",
  "BITS Hyderabad",
  "IIIT Hyderabad",
  "IIIT Bangalore",
  "IIIT Delhi",
  "VIT Vellore",
  "VIT Chennai",
  "SRM Chennai",
  "Manipal Institute of Technology",
  "PES University",
  "RV College of Engineering",
  "MSRIT Bangalore",
  "DTU Delhi",
  "NSIT Delhi",
  "College of Engineering Pune",
  "Jadavpur University",
  "Anna University",
  "Amrita University",
  "Thapar University",
  "LPU Jalandhar",
  "Chandigarh University",
  "Symbiosis Pune",
  "IIT (BHU) Varanasi",
  "IIT Indore",
  "IIT Mandi",
  "NIT Rourkela",
  "NIT Calicut",
  "NIT Kurukshetra",
];
const COMPANIES = [
  "Infosys",
  "TCS",
  "Wipro",
  "HCL",
  "Tech Mahindra",
  "Cognizant",
  "Accenture",
  "Capgemini",
  "IBM India",
  "Oracle",
  "SAP Labs",
  "Microsoft",
  "Google",
  "Amazon",
  "Flipkart",
  "Swiggy",
  "Zomato",
  "Razorpay",
  "Freshworks",
  "Zoho",
  "Paytm",
  "PhonePe",
  "CRED",
  "Meesho",
  "Ola",
  "Uber India",
  "Byju's",
  "Unacademy",
  "Nykaa",
  "Delhivery",
  "PolicyBazaar",
  "Groww",
  "Zerodha",
  "Postman",
  "Chargebee",
  "Fresher",
  "Freelance",
];
const DOMAINS = ["Finance", "Insurance", "EdTech", "Supply Chain", "Healthcare", "Retail"];
const SKILL_POOL = [
  "Java",
  "Python",
  "SQL",
  "React",
  "Node",
  "AWS",
  "Docker",
  "Spring Boot",
  "JavaScript",
  "TypeScript",
  "Kubernetes",
  "MongoDB",
  "PostgreSQL",
  "Kafka",
  "Redis",
  "GraphQL",
  "Go",
  "Rust",
];
const TAG_POOL = ["Priority", "Referral", "Campus", "Internal", "Fast Track"];
const HIRING: HiringStatus[] = [
  "Pending Review",
  "Shortlisted",
  "Interview Scheduled",
  "Selected",
  "Rejected",
  "Hold",
];

// deterministic PRNG (mulberry32)
function rng(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
const pick = <T>(r: () => number, arr: T[]) => arr[Math.floor(r() * arr.length)];

const cache = new Map<string, Candidate[]>();

export function getCandidates(evaluationId: string, submissions: any[] = []): Candidate[] {
  const cached = cache.get(evaluationId);
  if (cached) return cached;
  const r = rng(hash(evaluationId));
  const out: Candidate[] = [];
  const now = Date.now();
  for (let i = 0; i < submissions.length; i++) {
    const sub = submissions[i];
    const user = sub.user || {};
    const firstName = user.first_name || pick(r, REAL_NAMES).split(' ')[0];
    const lastName = user.last_name || '';
    const name = `${firstName} ${lastName}`.trim();
    const email = user.email || `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(r() * 900) + 100}@example.com`;
    const experience = Math.floor(r() * 12); // 0..11
    const college = pick(r, COLLEGES);
    const company =
      experience === 0
        ? "Fresher"
        : pick(
            r,
            COMPANIES.filter((c) => c !== "Fresher"),
          );
    const isDemo = evaluationId.startsWith("7700") || evaluationId.startsWith("demo");
    let labs = 0;
    let assess = 0;
    let vit = 0;
    let eci = 0;
    let rec: Recommendation = "Reject";
    let status: CandStatus = "Not Started";
    let hiring: HiringStatus = "Pending Review";

    if (isDemo) {
      labs = Math.round(35 + r() * 65);
      assess = Math.round(35 + r() * 65);
      vit = Math.round(35 + r() * 65);
      eci = Math.round(labs * 0.45 + assess * 0.3 + vit * 0.25);
      rec = eci >= 85 ? "Strong Hire" : eci >= 72 ? "Hire" : eci >= 60 ? "Maybe" : "Reject";
      
      const statusRoll = r();
      status = statusRoll < 0.55 ? "Submitted" : statusRoll < 0.7 ? "Completed" : statusRoll < 0.82 ? "In Progress" : statusRoll < 0.93 ? "Not Started" : "Expired";
      hiring = (status === "Submitted" || status === "Completed") ? HIRING[Math.floor(r() * HIRING.length)] : "Pending Review";
    } else {
      // For real evaluations, use actual submission data if available
      const labSubs = sub.lab_submissions || [];
      const knowSubs = sub.knowledge_submissions || [];
      
      if (labSubs.length > 0) {
        labs = Math.round(labSubs.reduce((acc: number, cur: any) => acc + (cur.score || 0), 0) / labSubs.length);
      }
      if (knowSubs.length > 0) {
        assess = Math.round(knowSubs.reduce((acc: number, cur: any) => acc + (cur.score || 0), 0) / knowSubs.length);
      }
      
      // Calculate ECI
      eci = Math.round(labs * 0.45 + assess * 0.3 + vit * 0.25);
      rec = eci >= 85 ? "Strong Hire" : eci >= 72 ? "Hire" : eci >= 60 ? "Maybe" : "Reject";
      
      // Determine real status
      if (sub.completed_at) {
        status = "Completed";
      } else if (sub.id || labSubs.length > 0 || knowSubs.length > 0 || sub.general_events?.length > 0) {
        status = "In Progress";
      } else {
        status = "Not Started";
      }
      hiring = "Pending Review";
    }
    const submittedAt = sub.completed_at ? new Date(sub.completed_at).getTime() : new Date(sub.created_at || now).getTime();
    const completionMinutes = sub.duration ? Math.round(sub.duration / 60) : 25 + Math.floor(r() * 110);
    const skills = Array.from(
      new Set(Array.from({ length: 3 + Math.floor(r() * 4) }, () => pick(r, SKILL_POOL))),
    );
    const tags: string[] = [];
    if (r() < 0.15) tags.push(pick(r, TAG_POOL));
    if (r() < 0.08) tags.push(pick(r, TAG_POOL));
      const realProctoringEvents = Array.isArray(sub.proctoring_events) ? sub.proctoring_events : [];
      const realGeneralEvents = Array.isArray(sub.general_events) ? sub.general_events : [];
      const allRealEvents = [...realProctoringEvents, ...realGeneralEvents];
      
      const violationTypes = [
          'tab_switched', 'focus_lost', 'window_blur', 'devtools_opened', 
          'new_tab_detected', 'new_window_detected', 'face_not_detected', 
          'multiple_faces_detected', 'face_recognition_failed', 'violation_critical',
          'suspicious_activity', 'device_change', 'external_monitor', 'forbidden_platform_detected',
          'copy_detected', 'paste_detected', 'cut_detected', 'select_all_detected',
          'right_click_detected', 'screenshot_detected', 'keyboard_shortcut',
          'suspicious_movement', 'audio_anomaly', 'audio_anomaly_detected',
          'network_disconnected', 'network_connected', 'violation_warning', 'violation'
      ];
      const criticalTypes = ['tab_switched', 'focus_lost', 'window_blur', 'devtools_opened', 'new_tab_detected', 'new_window_detected', 'face_not_detected', 'multiple_faces_detected', 'face_recognition_failed', 'violation_critical', 'suspicious_activity', 'device_change', 'external_monitor', 'forbidden_platform_detected', 'screen_share_stopped', 'camera_stopped', 'mic_stopped', 'repeated_permission_loss'];

      let tabSwitches = 0;
      let copyPastes = 0;
      let windowBlurs = 0;
      
      const timelineEvents: any[] = [];
      const snapshots: any[] = [];
      
      allRealEvents.forEach(e => {
        const type = e.activity_type || '';
        if (type === 'tab_switched') tabSwitches++;
        if (type === 'copy_detected' || type === 'paste_detected') copyPastes++;
        if (type === 'window_blur' || type === 'focus_lost') windowBlurs++;
        
        if (e.image_path || e.screen_path) {
          snapshots.push({
             time: new Date(e.timestamp).getTime(),
             type: e.image_path ? 'camera' : 'screen'
          });
        }
        
        const isC = criticalTypes.some(vt => type.includes(vt));
        const isV = violationTypes.some(vt => type.includes(vt));
        if (isV && type !== 'snapshot') {
          timelineEvents.push({
            time: new Date(e.timestamp).getTime(),
            type: type,
            desc: e.meta_data ? JSON.stringify(e.meta_data) : `Detected ${type.replace(/_/g, ' ')}`,
            severity: isC ? 2 : 1
          });
        }
      });
      
      const numViolations = timelineEvents.length;

      const labsEvents = timelineEvents;
      const assessEvents: any[] = [];
      const vitarkaEvents: any[] = [];
      
      const sectionsMap: Record<string, any> = {};
      if (sub.evaluation?.sections) {
          const sectionCount = sub.evaluation.sections.length;
          sub.evaluation.sections.forEach((sec: any) => {
              const secKey = sec.type === 'LAB' ? 'labs' : sec.type === 'KNOWLEDGE_ASSESSMENT' ? 'assessment' : 'vitarka';
              sectionsMap[secKey] = {
                  score: secKey === 'labs' ? labs : secKey === 'assessment' ? assess : vit,
                  timeSpent: Math.floor(completionMinutes / sectionCount),
                  events: secKey === 'labs' ? labsEvents : secKey === 'assessment' ? assessEvents : vitarkaEvents
              };
          });
      } else {
          sectionsMap.labs = { score: labs, timeSpent: Math.floor(completionMinutes * 0.5), events: labsEvents };
          sectionsMap.assessment = { score: assess, timeSpent: Math.floor(completionMinutes * 0.3), events: assessEvents };
          sectionsMap.vitarka = { score: vit, timeSpent: Math.floor(completionMinutes * 0.2), events: vitarkaEvents };
      }

      out.push({
        id: `${evaluationId.slice(0, 4)}-${(1000 + i).toString(36)}`,
        name,
        email,
        phone: `+91 ${Math.floor(r() * 9000000000) + 1000000000}`,
        experience,
        college,
        company,
        status,
        hiringStatus: hiring,
        submittedAt,
        completionMinutes,
        avatarHue: Math.floor(r() * 360),
        eci,
        labsScore: labs,
        assessmentScore: assess,
        vitarkaScore: vit,
        recommendation: rec,
        skills,
        tags,
        domain: pick(r, DOMAINS),
        proctoringData: {
          totalViolations: numViolations,
          tabSwitches,
          copyPastes,
          windowBlurs,
          snapshots: snapshots.sort((a, b) => a.time - b.time),
          timelineEvents: timelineEvents.sort((a, b) => a.time - b.time),
          events: timelineEvents,
          sections: sectionsMap,
        },
        rawSubmission: sub
      });
  }
  cache.set(evaluationId, out);
  return out;
}

export function vitarkaLabel(v: number): VitarkaLabel {
  if (v >= 85) return "Excellent";
  if (v >= 70) return "Good";
  if (v >= 55) return "Average";
  return "Poor";
}

export function experienceBucket(y: number): string {
  if (y === 0) return "Fresher";
  if (y <= 3) return "1-3 Years";
  if (y <= 5) return "3-5 Years";
  if (y <= 8) return "5-8 Years";
  return "8+";
}

export function completionBucket(m: number): string {
  if (m < 45) return "Below 45 mins";
  if (m < 60) return "45-60 mins";
  if (m < 90) return "60-90 mins";
  return "Above 90 mins";
}

export interface CandidateFilters {
  search: string;
  status: Set<CandStatus>;
  hiring: Set<HiringStatus>;
  recommendation: Set<Recommendation>;
  eciMin: number | null;
  labsMin: number | null;
  assessMin: number | null;
  vitarka: Set<VitarkaLabel>;
  dateRange: "any" | "today" | "yesterday" | "7d" | "30d";
  completion: Set<string>;
  experience: Set<string>;
  colleges: Set<string>;
  companies: Set<string>;
  skills: Set<string>;
  tags: Set<string>;
  domains: Set<string>;
}

export const emptyFilters = (): CandidateFilters => ({
  search: "",
  status: new Set(),
  hiring: new Set(),
  recommendation: new Set(),
  eciMin: null,
  labsMin: null,
  assessMin: null,
  vitarka: new Set(),
  dateRange: "any",
  completion: new Set(),
  experience: new Set(),
  colleges: new Set(),
  companies: new Set(),
  skills: new Set(),
  tags: new Set(),
  domains: new Set(),
});

export type SortKey =
  | "newest"
  | "oldest"
  | "eci_desc"
  | "eci_asc"
  | "labs_desc"
  | "assess_desc"
  | "vit_desc"
  | "fastest"
  | "slowest"
  | "name_asc"
  | "name_desc";

export function applyFilters(all: Candidate[], f: CandidateFilters, sort: SortKey): Candidate[] {
  const s = f.search.trim().toLowerCase();
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const filtered = all.filter((c) => {
    if (
      s &&
      !(
        c.name.toLowerCase().includes(s) ||
        c.email.toLowerCase().includes(s) ||
        c.phone.includes(s) ||
        c.college.toLowerCase().includes(s) ||
        c.company.toLowerCase().includes(s) ||
        c.id.toLowerCase().includes(s)
      )
    )
      return false;
    if (f.status.size && !f.status.has(c.status)) return false;
    if (f.hiring.size && !f.hiring.has(c.hiringStatus)) return false;
    if (f.recommendation.size && !f.recommendation.has(c.recommendation)) return false;
    if (f.eciMin != null && c.eci < f.eciMin) return false;
    if (f.labsMin != null && c.labsScore < f.labsMin) return false;
    if (f.assessMin != null && c.assessmentScore < f.assessMin) return false;
    if (f.vitarka.size && !f.vitarka.has(vitarkaLabel(c.vitarkaScore))) return false;
    if (f.dateRange !== "any") {
      const age = now - c.submittedAt;
      if (f.dateRange === "today" && age > day) return false;
      if (f.dateRange === "yesterday" && (age < day || age > 2 * day)) return false;
      if (f.dateRange === "7d" && age > 7 * day) return false;
      if (f.dateRange === "30d" && age > 30 * day) return false;
    }
    if (f.completion.size && !f.completion.has(completionBucket(c.completionMinutes))) return false;
    if (f.experience.size && !f.experience.has(experienceBucket(c.experience))) return false;
    if (f.colleges.size && !f.colleges.has(c.college)) return false;
    if (f.companies.size && !f.companies.has(c.company)) return false;
    if (f.skills.size && !c.skills.some((sk) => f.skills.has(sk))) return false;
    if (f.tags.size && !c.tags.some((t) => f.tags.has(t))) return false;
    if (f.domains.size && !f.domains.has(c.domain)) return false;
    return true;
  });
  const cmp: Record<SortKey, (a: Candidate, b: Candidate) => number> = {
    newest: (a, b) => b.submittedAt - a.submittedAt,
    oldest: (a, b) => a.submittedAt - b.submittedAt,
    eci_desc: (a, b) => b.eci - a.eci,
    eci_asc: (a, b) => a.eci - b.eci,
    labs_desc: (a, b) => b.labsScore - a.labsScore,
    assess_desc: (a, b) => b.assessmentScore - a.assessmentScore,
    vit_desc: (a, b) => b.vitarkaScore - a.vitarkaScore,
    fastest: (a, b) => a.completionMinutes - b.completionMinutes,
    slowest: (a, b) => b.completionMinutes - a.completionMinutes,
    name_asc: (a, b) => a.name.localeCompare(b.name),
    name_desc: (a, b) => b.name.localeCompare(a.name),
  };
  return filtered.sort(cmp[sort]);
}

export function activeFilterCount(f: CandidateFilters): number {
  let n = 0;
  if (f.search) n++;
  const sets: (keyof CandidateFilters)[] = [
    "status",
    "hiring",
    "recommendation",
    "vitarka",
    "completion",
    "experience",
    "colleges",
    "companies",
    "skills",
    "tags",
    "domains",
  ];
  for (const k of sets) if ((f[k] as Set<any>).size) n++;
  if (f.eciMin != null) n++;
  if (f.labsMin != null) n++;
  if (f.assessMin != null) n++;
  if (f.dateRange !== "any") n++;
  return n;
}

export function uniqueValues<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

