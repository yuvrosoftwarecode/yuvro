/* Data-driven pricing content. Edit values here — no layout changes needed. */

export type Plan = {
  id: string;
  name: string;
  monthly: number;
  yearly: number; // total price when billed yearly
  tagline: string;
  features: string[];
  cta: string;
  note?: string;
  popular?: boolean;
};

export const freeTrial = {
  id: "trial",
  name: "Free Trial",
  duration: "15 Days",
  price: "$0",
  includes: [
    "20 Assessment Submissions",
    "10 Engineering Lab Submissions",
    "15 AI Interview Minutes",
  ],
  access: [
    "Evaluation Builder",
    "Engineering Labs",
    "Knowledge Assessments",
    "Vitarka AI",
    "Candidate Results",
    "Basic Reports",
    "Follow-ups",
  ],
  cta: "Start Free Trial",
};

export const plans: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    monthly: 50,
    yearly: 600,
    tagline: "For startups making their first engineering hires.",
    features: [
      "Unlimited evaluation creation",
      "50 candidate attempts / month",
      "10 Engineering Simulation runs",
      "150 AI Interview minutes",
      "2 recruiter logins",
      "Coding assessments",
      "Candidate engineering reports",
      "Basic proctoring",
      "Follow-ups",
    ],
    cta: "Start Free Trial",
  },
  {
    id: "growth",
    name: "Growth",
    monthly: 150,
    yearly: 1800,
    tagline: "For growing teams hiring engineers regularly.",
    popular: true,
    features: [
      "Unlimited evaluation creation",
      "150 candidate attempts / month",
      "40 Engineering Simulation runs",
      "600 AI Interview minutes",
      "5 recruiter logins",
      "Coding assessments",
      "Advanced candidate reports",
      "Advanced proctoring",
      "Custom assessments",
      "Follow-ups",
      "Priority support",
    ],
    cta: "Start Free Trial",
  },
  {
    id: "scale",
    name: "Scale",
    monthly: 499,
    yearly: 5988,
    tagline: "For companies running engineering hiring at scale.",
    features: [
      "Unlimited evaluation creation",
      "500 candidate attempts / month",
      "100 Engineering Simulation runs",
      "1,500 AI Interview minutes",
      "10 recruiter logins",
      "Coding assessments",
      "Advanced engineering reports",
      "Advanced proctoring",
      "Custom assessments",
      "Follow-ups",
      "Team management",
      "API / ATS integration",
      "Priority support",
    ],
    cta: "Start Free Trial",
  },
];

export const rolloverNote =
  "Unused credits roll over up to 25% into your next billing cycle.";
export const topUpNote =
  "Need more usage? Additional credits are available as top-ups.";

export const enterprise = {
  heading: "Need more? Let's build a plan around your hiring volume.",
  body:
    "For larger hiring teams that need higher candidate volumes, custom simulation capacity, additional AI interview minutes, integrations, security controls, and dedicated support.",
  price: "Custom Pricing",
  cta: "Talk to Sales",
  features: [
    "Custom candidate volume",
    "Custom Engineering Simulation volume",
    "Custom AI Interview minutes",
    "Custom recruiter access",
    "ATS integrations",
    "API access",
    "SSO",
    "Advanced analytics",
    "Custom engineering simulations",
    "Dedicated support",
  ] as string[],
};




export const topUps = [
  {
    id: "ai-minutes",
    title: "AI Interview Minutes",
    options: [
      { label: "100 minutes", price: "$20" },
      { label: "500 minutes", price: "$79" },
      { label: "1,500 minutes", price: "$199" },
    ],
    cta: "Add AI Minutes",
  },
  {
    id: "simulations",
    title: "Engineering Simulations",
    options: [
      { label: "10 runs", price: "$25" },
      { label: "50 runs", price: "$99" },
      { label: "200 runs", price: "$299" },
    ],
    cta: "Add Simulation Runs",
  },
];

export const usageExplainers = [
  {
    title: "Coding Assessments",
    body:
      "Create unlimited assessments and evaluate candidates using programming and coding questions. Candidate attempt limits depend on your plan.",
  },
  {
    title: "Engineering Simulations",
    body:
      "Evaluate engineers through practical engineering scenarios such as debugging, code review, optimization, and real-world programming tasks.",
    footnote: "1 candidate completing 1 simulation = 1 Simulation Run.",
  },
  {
    title: "AI Technical Interviews",
    body:
      "AI Interview usage is measured in minutes, giving teams flexibility to conduct shorter screening interviews or deeper technical interviews.",
    footnote: "150 minutes = 5 × 30-minute interviews, or 10 × 15-minute interviews.",
  },
];

export const faqs = [
  {
    q: "Can I cancel anytime?",
    a: "Yes. Monthly plans can be cancelled anytime. Your subscription remains active until the end of your current billing period.",
  },
  {
    q: "Do unused monthly credits roll over?",
    a: "Partially. Up to 25% of unused eligible monthly credits roll over into your next billing cycle. For example, if 150 candidate attempts are included and you use 100, 25% of the unused 50 carries forward.",
  },

  {
    q: "What happens if I run out of credits?",
    a: "You can purchase additional AI Interview minutes or Engineering Simulation runs without upgrading your subscription.",
  },
  {
    q: "What is a candidate attempt?",
    a: "A candidate attempt is counted when a candidate starts an assigned evaluation.",
  },
  {
    q: "What is an Engineering Simulation Run?",
    a: "One candidate completing one Engineering Simulation counts as one run.",
  },
  {
    q: "How are AI Interviews charged?",
    a: "AI Interview usage is calculated based on the number of interview minutes consumed.",
  },
  {
    q: "Can I upgrade or downgrade?",
    a: "Yes. Teams can change plans as their hiring needs change.",
  },
  {
    q: "Do you offer Enterprise pricing?",
    a: "Yes. Enterprise plans are customized based on hiring volume, integrations, security requirements, and support requirements.",
  },
];
