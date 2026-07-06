import React from "react";
import {
  Type,
  AlignLeft,
  Minus,
  Code,
  Sigma,
  Lightbulb,
  Info,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Image,
  Video,
  FileText,
  Table,
  Grid3X3,
  Columns2,
  Columns3,
  ArrowRight,
  ListOrdered,
  List,
  BookOpen,
  Layout,
  Zap,
  GitCompare,
  Star,
  Globe,
  ChevronDown,
  BarChart2,
  GitBranch,
} from "lucide-react";

export interface Block {
  id: string;
  type: string;
  content?: string;
  metadata?: Record<string, any>;
}

export interface BlockDefinition {
  type: string;
  label: string;
  icon: React.ReactNode;
  category: string;
  defaultBlock: () => Omit<Block, "id">;
}

export const blockDefs: BlockDefinition[] = [
  {
    type: "heading",
    label: "Heading",
    icon: <Type className="w-4 h-4" />,
    category: "Basic Content",
    defaultBlock: () => ({ type: "heading", content: "" }),
  },
  {
    type: "subheading",
    label: "Subheading",
    icon: <Type className="w-3.5 h-3.5 opacity-70" />,
    category: "Basic Content",
    defaultBlock: () => ({ type: "subheading", content: "" }),
  },
  {
    type: "paragraph",
    label: "Paragraph",
    icon: <AlignLeft className="w-4 h-4" />,
    category: "Basic Content",
    defaultBlock: () => ({ type: "paragraph", content: "" }),
  },
  {
    type: "divider",
    label: "Divider",
    icon: <Minus className="w-4 h-4" />,
    category: "Basic Content",
    defaultBlock: () => ({ type: "divider" }),
  },

  {
    type: "formula",
    label: "Formula",
    icon: <Sigma className="w-4 h-4" />,
    category: "Academic",
    defaultBlock: () => ({ type: "formula", content: "" }),
  },
  {
    type: "code",
    label: "Code Block",
    icon: <Code className="w-4 h-4" />,
    category: "Academic",
    defaultBlock: () => ({
      type: "code",
      content: "",
      metadata: { language: "javascript" },
    }),
  },

  {
    type: "callout_info",
    label: "Definition Box",
    icon: <Info className="w-4 h-4 text-blue-500" />,
    category: "Informational",
    defaultBlock: () => ({
      type: "callout_info",
      content: "",
      metadata: { variant: "info", title: "Definition" },
    }),
  },
  {
    type: "callout_warning",
    label: "Important Note",
    icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
    category: "Informational",
    defaultBlock: () => ({
      type: "callout_warning",
      content: "",
      metadata: { variant: "warning", title: "Important" },
    }),
  },
  {
    type: "callout_success",
    label: "Key Point",
    icon: <CheckCircle className="w-4 h-4 text-green-500" />,
    category: "Informational",
    defaultBlock: () => ({
      type: "callout_success",
      content: "",
      metadata: { variant: "success", title: "Key Point" },
    }),
  },
  {
    type: "callout_question",
    label: "Q&A Box",
    icon: <HelpCircle className="w-4 h-4 text-purple-500" />,
    category: "Informational",
    defaultBlock: () => ({
      type: "callout_question",
      content: "",
      metadata: { variant: "question", title: "Why?" },
    }),
  },
  {
    type: "callout_tip",
    label: "Exam Tip",
    icon: <Lightbulb className="w-4 h-4 text-indigo-500" />,
    category: "Informational",
    defaultBlock: () => ({
      type: "callout_tip",
      content: "",
      metadata: { variant: "tip", title: "Exam Tip" },
    }),
  },

  {
    type: "bullet_list",
    label: "Bullet List",
    icon: <List className="w-4 h-4" />,
    category: "Lists",
    defaultBlock: () => ({
      type: "bullet_list",
      metadata: { items: ["", ""] },
    }),
  },
  {
    type: "ordered_list",
    label: "Numbered List",
    icon: <ListOrdered className="w-4 h-4" />,
    category: "Lists",
    defaultBlock: () => ({
      type: "ordered_list",
      metadata: { items: ["", ""] },
    }),
  },

  {
    type: "image",
    label: "Image",
    icon: <Image className="w-4 h-4" />,
    category: "Media",
    defaultBlock: () => ({
      type: "image",
      metadata: { url: null, caption: "" },
    }),
  },
  {
    type: "video",
    label: "Video",
    icon: <Video className="w-4 h-4" />,
    category: "Media",
    defaultBlock: () => ({
      type: "video",
      metadata: { url: null, caption: "" },
    }),
  },
  {
    type: "pdf",
    label: "PDF Attachment",
    icon: <FileText className="w-4 h-4" />,
    category: "Media",
    defaultBlock: () => ({ type: "pdf", metadata: { url: null } }),
  },

  {
    type: "table",
    label: "Table",
    icon: <Table className="w-4 h-4" />,
    category: "Data",
    defaultBlock: () => ({
      type: "table",
      metadata: {
        rows: [
          ["Header 1", "Header 2"],
          ["", ""],
        ],
        hasHeader: true,
      },
    }),
  },

  {
    type: "card_grid",
    label: "Card Grid",
    icon: <Grid3X3 className="w-4 h-4" />,
    category: "Layout",
    defaultBlock: () => ({
      type: "card_grid",
      metadata: {
        cards: [
          { title: "Card 1", description: "" },
          { title: "Card 2", description: "" },
          { title: "Card 3", description: "" },
        ],
      },
    }),
  },
  {
    type: "two_columns",
    label: "2 Column Layout",
    icon: <Columns2 className="w-4 h-4" />,
    category: "Layout",
    defaultBlock: () => ({
      type: "two_columns",
      metadata: {
        cols: 2,
        columns: [
          { heading: "Column 1", content: "" },
          { heading: "Column 2", content: "" },
        ],
      },
    }),
  },
  {
    type: "three_columns",
    label: "3 Column Layout",
    icon: <Columns3 className="w-4 h-4" />,
    category: "Layout",
    defaultBlock: () => ({
      type: "three_columns",
      metadata: {
        cols: 3,
        columns: [
          { heading: "", content: "" },
          { heading: "", content: "" },
          { heading: "", content: "" },
        ],
      },
    }),
  },

  {
    type: "process_flow",
    label: "Process Flow",
    icon: <ArrowRight className="w-4 h-4" />,
    category: "Visualization",
    defaultBlock: () => ({
      type: "process_flow",
      metadata: { steps: ["Start", "Process", "End"] },
    }),
  },
  {
    type: "stepper",
    label: "Stepper",
    icon: <ListOrdered className="w-4 h-4 text-indigo-500" />,
    category: "Visualization",
    defaultBlock: () => ({
      type: "stepper",
      metadata: {
        steps: [
          { title: "Step 1", description: "" },
          { title: "Step 2", description: "" },
        ],
      },
    }),
  },

  {
    type: "hero",
    label: "Hero Section",
    icon: <Layout className="w-4 h-4 text-indigo-500" />,
    category: "AI Blocks",
    defaultBlock: () => ({
      type: "hero",
      title: "",
      description: "",
      metadata: { difficulty: "" },
    }),
  },
  {
    type: "info-box",
    label: "Info Box",
    icon: <Info className="w-4 h-4 text-blue-500" />,
    category: "AI Blocks",
    defaultBlock: () => ({
      type: "info-box",
      title: "Key Concept",
      content: "",
      variant: "blue",
    }),
  },
  {
    type: "warning-box",
    label: "Warning Box",
    icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
    category: "AI Blocks",
    defaultBlock: () => ({
      type: "warning-box",
      title: "Common Mistake",
      content: "",
      variant: "yellow",
    }),
  },
  {
    type: "success-box",
    label: "Success Box",
    icon: <CheckCircle className="w-4 h-4 text-green-500" />,
    category: "AI Blocks",
    defaultBlock: () => ({
      type: "success-box",
      title: "Remember",
      content: "",
      variant: "green",
    }),
  },
  {
    type: "tip-box",
    label: "Interview Tip",
    icon: <Lightbulb className="w-4 h-4 text-purple-500" />,
    category: "AI Blocks",
    defaultBlock: () => ({
      type: "tip-box",
      title: "Interview Insight",
      content: "",
      variant: "purple",
    }),
  },
  {
    type: "bullet-list",
    label: "Bullet List (AI)",
    icon: <List className="w-4 h-4" />,
    category: "AI Blocks",
    defaultBlock: () => ({ type: "bullet-list", items: ["", ""] }),
  },
  {
    type: "numbered-list",
    label: "Numbered List (AI)",
    icon: <ListOrdered className="w-4 h-4" />,
    category: "AI Blocks",
    defaultBlock: () => ({ type: "numbered-list", items: ["", ""] }),
  },
  {
    type: "concept-card",
    label: "Concept Card",
    icon: <Zap className="w-4 h-4 text-blue-500" />,
    category: "AI Blocks",
    defaultBlock: () => ({
      type: "concept-card",
      title: "",
      description: "",
      color: "blue",
    }),
  },
  {
    type: "complexity-card",
    label: "Complexity Card",
    icon: <BarChart2 className="w-4 h-4 text-slate-600" />,
    category: "AI Blocks",
    defaultBlock: () => ({
      type: "complexity-card",
      time_complexity: { value: "O(n)", color: "red" },
      space_complexity: { value: "O(1)", color: "green" },
    }),
  },
  {
    type: "comparison-card",
    label: "Comparison Card",
    icon: <GitCompare className="w-4 h-4" />,
    category: "AI Blocks",
    defaultBlock: () => ({
      type: "comparison-card",
      left_title: "Option A",
      right_title: "Option B",
      left_points: [""],
      right_points: [""],
    }),
  },
  {
    type: "revision-card",
    label: "Revision Card",
    icon: <Star className="w-4 h-4 text-indigo-500" />,
    category: "AI Blocks",
    defaultBlock: () => ({ type: "revision-card", points: ["", ""] }),
  },
  {
    type: "fact-box",
    label: "Fact Box",
    icon: <Lightbulb className="w-4 h-4 text-yellow-500" />,
    category: "AI Blocks",
    defaultBlock: () => ({ type: "fact-box", content: "" }),
  },
  {
    type: "analogy-box",
    label: "Analogy / Real-Life",
    icon: <Globe className="w-4 h-4 text-teal-500" />,
    category: "AI Blocks",
    defaultBlock: () => ({
      type: "analogy-box",
      title: "Real Life Example",
      content: "",
    }),
  },
  {
    type: "quiz",
    label: "Quiz Question",
    icon: <HelpCircle className="w-4 h-4 text-indigo-500" />,
    category: "AI Blocks",
    defaultBlock: () => ({
      type: "quiz",
      question: "",
      options: ["", "", "", ""],
      answer: "",
    }),
  },
  {
    type: "accordion",
    label: "Accordion / FAQ",
    icon: <ChevronDown className="w-4 h-4" />,
    category: "AI Blocks",
    defaultBlock: () => ({ type: "accordion", title: "", description: "" }),
  },
  {
    type: "diagram",
    label: "DSA Diagram",
    icon: <GitBranch className="w-4 h-4 text-slate-600" />,
    category: "AI Blocks",
    defaultBlock: () => ({
      type: "diagram",
      title: "Diagram",
      steps: ["Step 1", "Step 2", "Step 3"],
    }),
  },
  {
    type: "flow-diagram",
    label: "Flow Diagram",
    icon: <ArrowRight className="w-4 h-4 text-indigo-500" />,
    category: "AI Blocks",
    defaultBlock: () => ({
      type: "flow-diagram",
      steps: ["Input", "Process", "Output"],
    }),
  },
];

export const blockDefMap = new Map(blockDefs.map((d) => [d.type, d]));
export const categories = [...new Set(blockDefs.map((d) => d.category))];

export const blockLabel = (type: string) =>
  blockDefMap.get(type)?.label ?? type;
export const blockIcon = (type: string) =>
  blockDefMap.get(type)?.icon ?? <BookOpen className="w-4 h-4" />;
