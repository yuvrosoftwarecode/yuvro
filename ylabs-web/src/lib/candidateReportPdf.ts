import jsPDF from "jspdf";
import type { EvaluationSummaryData } from "./evaluationSummary";

export interface ReportInput {
  name: string;
  email: string;
  phone: string;
  college: string;
  company: string;
  experience: number;
  eci: number;
  recommendation: string;
  confidence: number;
  labsScore: number;
  assessmentScore: number;
  vitarkaScore: number;
  systemDesignScore?: number;
  labsMaxScore?: number;
  assessmentMaxScore?: number;
  discussionMaxScore?: number;
  systemDesignMaxScore?: number;
  strengths: string[];
  weaknesses: string[];
  aiSummary: string;
  nextStep: string;
  evaluationTitle: string;
  summary?: EvaluationSummaryData;
}

const AMBER: [number, number, number] = [245, 166, 35];
const INK: [number, number, number] = [23, 23, 23];
const MUTED: [number, number, number] = [115, 115, 115];

export function buildCandidateReportPdf(d: ReportInput) {
  const PDFConstructor = (jsPDF as any).jsPDF || (jsPDF as any).default || jsPDF;
  const doc = new PDFConstructor({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48;
  let y = M;

  const ensure = (need: number) => {
    if (y + need > H - M) {
      doc.addPage();
      y = M;
    }
  };

  // Header band
  doc.setFillColor(...INK);
  doc.rect(0, 0, W, 92, "F");
  doc.setFillColor(...AMBER);
  doc.rect(0, 88, W, 4, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold").setFontSize(16);
  doc.text("Yuvro Labs", M, 40);
  doc.setFont("helvetica", "normal").setFontSize(10);
  doc.setTextColor(200, 200, 200);
  doc.text("Candidate Evaluation Report", M, 58);
  doc.text(new Date().toLocaleDateString(), W - M, 40, { align: "right" });
  doc.text(d.evaluationTitle, W - M, 58, { align: "right" });
  y = 124;

  // Candidate identity
  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold").setFontSize(20);
  doc.text(d.name, M, y);
  y += 18;
  doc.setFont("helvetica", "normal").setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text(
    [d.email, d.phone, `${d.experience}y experience`].filter(Boolean).join("  ·  "),
    M,
    y,
  );
  y += 14;
  doc.text([d.company, d.college].filter(Boolean).join("  ·  "), M, y);
  y += 24;

  // Score cards
  const cards: [string, string][] = [
    ["Capability Index", `${d.eci}/100`],
    ["Engineering Labs", `${d.labsScore}/${d.labsMaxScore ?? 80}`],
    ["Assessment", `${d.assessmentScore}/${d.assessmentMaxScore ?? 30}`],
    ["Vitarka AI", `${d.vitarkaScore}/${d.discussionMaxScore ?? 25}`],
  ];
  if (d.systemDesignMaxScore || d.systemDesignScore != null) {
    cards.push(["System Design", `${d.systemDesignScore ?? 0}/${d.systemDesignMaxScore ?? 30}`]);
  }
  const gap = 12;
  const cw = (W - M * 2 - gap * (cards.length - 1)) / cards.length;
  cards.forEach(([label, value], i) => {
    const x = M + i * (cw + gap);
    doc.setDrawColor(225, 225, 220);
    doc.setFillColor(250, 250, 248);
    doc.roundedRect(x, y, cw, 58, 6, 6, "FD");
    doc.setTextColor(...MUTED);
    doc.setFont("helvetica", "normal").setFontSize(8);
    doc.text(label.toUpperCase(), x + 12, y + 20);
    doc.setTextColor(...INK);
    doc.setFont("helvetica", "bold").setFontSize(18);
    doc.text(value, x + 12, y + 44);
  });
  y += 78;

  // Recommendation strip
  doc.setDrawColor(...AMBER);
  doc.setFillColor(255, 248, 235);
  doc.roundedRect(M, y, W - M * 2, 44, 6, 6, "FD");
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "normal").setFontSize(8);
  doc.text("RECOMMENDATION", M + 12, y + 17);
  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold").setFontSize(12);
  doc.text(`${d.recommendation}`, M + 12, y + 34);
  doc.setFont("helvetica", "normal").setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`Confidence ${d.confidence}%`, W - M - 12, y + 34, { align: "right" });
  y += 66;

  const section = (title: string) => {
    ensure(46);
    doc.setTextColor(...INK);
    doc.setFont("helvetica", "bold").setFontSize(11);
    doc.text(title, M, y);
    y += 8;
    doc.setDrawColor(230, 230, 226);
    doc.line(M, y, W - M, y);
    y += 16;
  };

  const para = (text: string) => {
    doc.setFont("helvetica", "normal").setFontSize(10);
    doc.setTextColor(60, 60, 60);
    const lines = doc.splitTextToSize(text, W - M * 2) as string[];
    lines.forEach((ln: string) => {
      ensure(16);
      doc.text(ln, M, y);
      y += 14;
    });
    y += 8;
  };

  const bullets = (items: string[], color: [number, number, number]) => {
    doc.setFont("helvetica", "normal").setFontSize(10);
    items.forEach((it) => {
      const lines = doc.splitTextToSize(it, W - M * 2 - 16) as string[];
      ensure(lines.length * 14 + 4);
      doc.setFillColor(...color);
      doc.circle(M + 3, y - 3, 2.2, "F");
      doc.setTextColor(60, 60, 60);
      lines.forEach((ln: string, li: number) => {
        doc.text(ln, M + 14, y + li * 14);
      });
      y += lines.length * 14 + 4;
    });
    y += 8;
  };

  const subLabel = (text: string, color: [number, number, number]) => {
    ensure(18);
    doc.setFont("helvetica", "bold").setFontSize(8);
    doc.setTextColor(...color);
    doc.text(text.toUpperCase(), M, y);
    y += 12;
  };

  section("Evaluation Summary");
  para(d.aiSummary);

  if (d.summary) {
    d.summary.blocks.forEach((b) => {
      ensure(40);
      doc.setFont("helvetica", "bold").setFontSize(10);
      doc.setTextColor(...INK);
      doc.text(b.title, M, y);
      doc.text(`${b.score}/100`, W - M, y, { align: "right" });
      y += 14;
      para(b.summary);
      subLabel("Strengths", MUTED);
      bullets(b.strengths, [16, 150, 105]);
      subLabel("Area to explore", MUTED);
      bullets([b.explore], [217, 119, 6]);
    });

    section("Overall Recommendation");
    ensure(20);
    doc.setFont("helvetica", "bold").setFontSize(10);
    doc.setTextColor(...INK);
    doc.text(`${d.summary.verdict}`, M, y);
    doc.text(`${d.summary.overall}/100`, W - M, y, { align: "right" });
    y += 16;
    para(d.summary.overallText);
    subLabel("Strengths", MUTED);
    bullets(d.summary.overallStrengths, [16, 150, 105]);
    subLabel("Areas to explore", MUTED);
    bullets(d.summary.overallExplore, [217, 119, 6]);
  }

  if (d.strengths.length) {
    section("Key Strengths");
    bullets(d.strengths, [16, 150, 105]);
  }
  if (d.weaknesses.length) {
    section("Areas to Probe");
    bullets(d.weaknesses, [217, 119, 6]);
  }

  section("Recommended Next Step");
  para(d.nextStep);


  // Footer on every page
  const pages = (doc as any).getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(230, 230, 226);
    doc.line(M, H - 40, W - M, H - 40);
    doc.setFont("helvetica", "normal").setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("Generated by Yuvro Labs · Confidential", M, H - 26);
    doc.text(`Page ${p} of ${pages}`, W - M, H - 26, { align: "right" });
  }

  return doc;
}

export function downloadCandidateReportPdf(d: ReportInput) {
  const doc = buildCandidateReportPdf(d);
  doc.save(`${d.name.replace(/\s+/g, "-")}-Yuvro-Report.pdf`);
}
