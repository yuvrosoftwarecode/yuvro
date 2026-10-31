import { MilestoneDetails } from "@/components/shared/ShareMilestoneModal";

export interface GenerateBannerOptions {
  studentName: string;
  milestoneTitle: string;
  milestoneType?: "sprint" | "lab" | "certificate";
  details?: MilestoneDetails;
}

/**
 * Generates a crisp, production-grade 1200x630 milestone card image on an HTML5 canvas.
 * Returns a data URL (image/png).
 */
export async function generateMilestoneBanner({
  studentName,
  milestoneTitle,
  milestoneType = "lab",
  details,
}: GenerateBannerOptions): Promise<string> {
  const width = 1200;
  const height = 630;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context not supported");

  // 1. Background Gradient (Dark Tech Theme)
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, "#0B0F17");
  bgGrad.addColorStop(0.5, "#0D1424");
  bgGrad.addColorStop(1, "#070A10");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Subtle Glow Orbs in corners
  const radialGlow1 = ctx.createRadialGradient(150, 100, 10, 150, 100, 350);
  radialGlow1.addColorStop(0, "rgba(59, 130, 246, 0.18)");
  radialGlow1.addColorStop(1, "rgba(59, 130, 246, 0)");
  ctx.fillStyle = radialGlow1;
  ctx.fillRect(0, 0, width, height);

  const radialGlow2 = ctx.createRadialGradient(1050, 500, 10, 1050, 500, 400);
  radialGlow2.addColorStop(0, "rgba(16, 185, 129, 0.12)");
  radialGlow2.addColorStop(1, "rgba(16, 185, 129, 0)");
  ctx.fillStyle = radialGlow2;
  ctx.fillRect(0, 0, width, height);

  // 3. Card Outer Border & Shadow
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 2;
  ctx.strokeRect(30, 30, width - 60, height - 60);

  // 4. Brand Header
  // Logo Icon
  ctx.fillStyle = "#2563EB";
  roundRect(ctx, 60, 60, 44, 44, 10);
  ctx.fill();

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 24px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Y", 82, 82);

  // Brand Name
  ctx.textAlign = "left";
  ctx.font = "bold 20px Inter, system-ui, sans-serif";
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText("YUVRO LABS", 118, 76);

  // Verified Badge
  ctx.font = "500 12px Inter, system-ui, sans-serif";
  ctx.fillStyle = "#10B981";
  ctx.fillText("● VERIFIED MILESTONE CREDENTIAL", 118, 96);

  // Top Right Milestone Category Pill
  const categoryText =
    milestoneType === "sprint"
      ? "SPRINT SPRINT SPRINT"
      : milestoneType === "certificate"
      ? "OFFICIAL CERTIFICATION"
      : "PRACTICAL LAB COMPLETED";
  ctx.textAlign = "right";
  ctx.font = "600 13px Inter, system-ui, sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  ctx.fillText(categoryText, width - 60, 84);

  // 5. Student Name & Headline
  ctx.textAlign = "left";
  ctx.font = "500 16px Inter, system-ui, sans-serif";
  ctx.fillStyle = "rgba(156, 163, 175, 0.9)";
  ctx.fillText("AWARDED TO", 60, 170);

  ctx.font = "bold 36px Inter, system-ui, sans-serif";
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(studentName || "Engineer", 60, 212);

  // 6. Milestone Title
  ctx.font = "bold 26px Inter, system-ui, sans-serif";
  const titleGrad = ctx.createLinearGradient(60, 260, 800, 260);
  titleGrad.addColorStop(0, "#60A5FA");
  titleGrad.addColorStop(1, "#34D399");
  ctx.fillStyle = titleGrad;

  const displayTitle = details?.labTitle
    ? `${details.labTitle}${details?.sprintTitle ? ` — ${details.sprintTitle}` : ""}`
    : milestoneTitle;
  
  // Truncate title if too long
  const truncatedTitle = displayTitle.length > 55 ? displayTitle.substring(0, 52) + "..." : displayTitle;
  ctx.fillText(truncatedTitle, 60, 275);

  // 7. Metric Cards (3 KPI boxes)
  const boxY = 330;
  const boxHeight = 135;
  const boxWidth = 340;
  const gap = 30;

  // Real Metric 1: Tasks / Tickets cleared
  const totalTickets = details?.totalTickets ?? 0;
  const completedTickets = details?.completedTickets ?? 0;
  const tasksDisplay = totalTickets > 0 ? `${completedTickets} / ${totalTickets}` : `${completedTickets} Done`;

  drawStatBox(
    ctx,
    60,
    boxY,
    boxWidth,
    boxHeight,
    "TASKS CLEARED",
    tasksDisplay,
    completedTickets > 0 ? `${completedTickets} production tickets completed` : "Work in progress",
    "#3B82F6"
  );

  // Real Metric 2: Evaluation Score
  const realScore = typeof details?.score === "number" ? `${details.score}%` : "0%";
  drawStatBox(
    ctx,
    60 + boxWidth + gap,
    boxY,
    boxWidth,
    boxHeight,
    "EVALUATION SCORE",
    realScore,
    details?.score && details.score > 0 ? "Automated test suites passed" : "No evaluated submissions yet",
    "#10B981"
  );

  // Real Metric 3: Real Experience Points earned
  const realXp = typeof details?.earnedXp === "number" ? `+${details.earnedXp} YP` : "+0 YP";
  drawStatBox(
    ctx,
    60 + (boxWidth + gap) * 2,
    boxY,
    boxWidth,
    boxHeight,
    "ENGINEERING XP",
    realXp,
    "Verified points earned in this lab",
    "#F59E0B"
  );

  // 8. Footer Bar
  const footerY = 530;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(60, footerY);
  ctx.lineTo(width - 60, footerY);
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.font = "500 14px Inter, system-ui, sans-serif";
  ctx.fillStyle = "rgba(156, 163, 175, 0.8)";
  ctx.fillText("Automated Assessment & Live Code Execution", 60, footerY + 35);

  ctx.textAlign = "right";
  ctx.font = "600 14px Inter, system-ui, sans-serif";
  ctx.fillStyle = "#60A5FA";
  ctx.fillText("yuvrolabs.com", width - 60, footerY + 35);

  return canvas.toDataURL("image/png");
}

function drawStatBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string,
  subtext: string,
  accentColor: string
) {
  // Box Background
  ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
  roundRect(ctx, x, y, w, h, 14);
  ctx.fill();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Accent line top
  ctx.fillStyle = accentColor;
  roundRect(ctx, x + 16, y, 40, 3, 2);
  ctx.fill();

  // Label
  ctx.textAlign = "left";
  ctx.font = "600 11px Inter, system-ui, sans-serif";
  ctx.fillStyle = "rgba(156, 163, 175, 0.8)";
  ctx.fillText(label, x + 18, y + 32);

  // Value
  ctx.font = "bold 32px Inter, system-ui, sans-serif";
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(value, x + 18, y + 74);

  // Subtext
  ctx.font = "400 11px Inter, system-ui, sans-serif";
  ctx.fillStyle = "rgba(156, 163, 175, 0.6)";
  ctx.fillText(subtext, x + 18, y + 105);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
