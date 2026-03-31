import {
  Code, Database, Globe, Cpu, Layers, Sigma, Atom, FlaskConical,
  PenLine, Pencil, Binary, BrainCircuit, SquareFunction,
  BookOpen, LayoutGrid, BookMarked,
} from 'lucide-react';

export type SubjectStyle = {
  icon: React.ElementType;
  bg: string;
  text: string;
  gradient: string;
};

// Each entry: [icon, bg, gradient]
// Color is derived from name keywords — fully deterministic, no index dependency
const NAME_MAP: Array<{
  keywords: string[];
  icon: React.ElementType;
  bg: string;
  gradient: string;
}> = [
  { keywords: ['python', 'java', 'programming', 'code', 'c++', 'c#', 'ruby', 'swift', 'kotlin'],
    icon: Code,         bg: 'bg-blue-600',   gradient: 'from-blue-500 to-indigo-600' },
  { keywords: ['web', 'html', 'css', 'react', 'angular', 'vue', 'frontend', 'internet', 'http'],
    icon: Globe,        bg: 'bg-green-600',  gradient: 'from-green-500 to-emerald-600' },
  { keywords: ['data structure', 'algorithm', 'dsa'],
    icon: Layers,       bg: 'bg-orange-600', gradient: 'from-orange-500 to-amber-600' },
  { keywords: ['data', 'sql', 'database', 'db', 'mysql', 'postgres', 'mongo'],
    icon: Database,     bg: 'bg-orange-600', gradient: 'from-orange-500 to-amber-600' },
  { keywords: ['ai', 'machine learning', 'deep learning', 'ml', 'neural'],
    icon: BrainCircuit, bg: 'bg-purple-600', gradient: 'from-purple-500 to-violet-600' },
  { keywords: ['os', 'operating system', 'computer', 'system', 'architecture', 'network'],
    icon: Cpu,          bg: 'bg-cyan-600',   gradient: 'from-cyan-500 to-sky-600' },
  { keywords: ['math', 'calculus', 'matrices', 'algebra', 'linear', 'discrete'],
    icon: Sigma,        bg: 'bg-indigo-600', gradient: 'from-indigo-500 to-blue-600' },
  { keywords: ['physics'],
    icon: Atom,         bg: 'bg-cyan-600',   gradient: 'from-cyan-500 to-sky-600' },
  { keywords: ['chemistry'],
    icon: FlaskConical, bg: 'bg-green-600',  gradient: 'from-green-500 to-teal-600' },
  { keywords: ['english', 'communication', 'aptitude', 'reasoning'],
    icon: PenLine,      bg: 'bg-rose-600',   gradient: 'from-rose-500 to-pink-600' },
  { keywords: ['drawing', 'cad', 'design', 'ui', 'ux'],
    icon: Pencil,       bg: 'bg-pink-600',   gradient: 'from-pink-500 to-rose-600' },
  { keywords: ['digital', 'logic', 'circuit'],
    icon: Binary,       bg: 'bg-blue-600',   gradient: 'from-blue-500 to-indigo-600' },
  { keywords: ['square', 'function', 'SquareFunction'],
    icon: SquareFunction, bg: 'bg-indigo-600', gradient: 'from-indigo-500 to-blue-600' },
];

const FALLBACK_STYLES = [
  { icon: BookOpen,    bg: 'bg-slate-600',  gradient: 'from-slate-500 to-gray-600' },
  { icon: LayoutGrid,  bg: 'bg-teal-600',   gradient: 'from-teal-500 to-cyan-600' },
  { icon: BookMarked,  bg: 'bg-violet-600', gradient: 'from-violet-500 to-purple-600' },
  { icon: Layers,      bg: 'bg-amber-600',  gradient: 'from-amber-500 to-orange-600' },
];

export function getSubjectStyle(name: string, fallbackIndex = 0): SubjectStyle {
  const n = (name || '').toLowerCase();

  for (const entry of NAME_MAP) {
    if (entry.keywords.some(k => n.includes(k))) {
      return { icon: entry.icon, bg: entry.bg, text: 'text-white', gradient: entry.gradient };
    }
  }

  const fallback = FALLBACK_STYLES[fallbackIndex % FALLBACK_STYLES.length];
  return { ...fallback, text: 'text-white' };
}

export function getSubjectIconComponent(name: string, fallbackIndex = 0): React.ElementType {
  return getSubjectStyle(name, fallbackIndex).icon;
}
