import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '@/components/common/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, Download, Lock, Crown, FileText, 
  Check, Save, Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { useProfileData } from '@/hooks/useProfileData';
import ResumePropertiesPanel from '@/components/student/resume/ResumePropertiesPanel';

const STORAGE_KEY = 'resume_settings';

interface ResumeSettings {
  template: string;
  font: string;
  color: string;
  fontSize: number;
  lineSpacing: number;
  sectionOrder: SectionConfig[];
}

interface SectionConfig {
  id: string;
  label: string;
  visible: boolean;
  order: number;
}

const defaultSectionOrder: SectionConfig[] = [
  { id: 'summary', label: 'Summary', visible: true, order: 0 },
  { id: 'experience', label: 'Experience', visible: true, order: 1 },
  { id: 'education', label: 'Education', visible: true, order: 2 },
  { id: 'skills', label: 'Skills', visible: true, order: 3 },
  { id: 'projects', label: 'Projects', visible: true, order: 4 },
];

interface ResumeTemplate {
  id: string;
  name: string;
  description: string;
  category: 'free' | 'premium';
  thumbnail: string;
  popular?: boolean;
  new?: boolean;
}

const templates: ResumeTemplate[] = [
  {
    id: 'classic',
    name: 'Classic Professional',
    description: 'Clean and traditional layout perfect for corporate roles',
    category: 'free',
    thumbnail: 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)',
    popular: true,
  },
  {
    id: 'modern',
    name: 'Modern Minimal',
    description: 'Sleek design with focus on content and readability',
    category: 'free',
    thumbnail: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  {
    id: 'developer',
    name: 'Developer Focused',
    description: 'Highlighting technical skills and projects',
    category: 'free',
    thumbnail: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    new: true,
  },
  {
    id: 'compact',
    name: 'Compact Single Page',
    description: 'All information in one page efficiently',
    category: 'free',
    thumbnail: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  },
  {
    id: 'elegant',
    name: 'Elegant Serif',
    description: 'Timeless typography with sophisticated layout',
    category: 'free',
    thumbnail: 'linear-gradient(135deg, #2c3e50 0%, #4a6572 100%)',
  },
  {
    id: 'bold',
    name: 'Bold Impact',
    description: 'Strong visual hierarchy with accent colors',
    category: 'free',
    thumbnail: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
    popular: true,
  },
  {
    id: 'minimalist',
    name: 'Minimalist Clean',
    description: 'Simple and elegant with maximum whitespace',
    category: 'free',
    thumbnail: 'linear-gradient(135deg, #bdc3c7 0%, #ecf0f1 100%)',
  },
  {
    id: 'academic',
    name: 'Academic CV',
    description: 'Perfect for research and academic positions',
    category: 'free',
    thumbnail: 'linear-gradient(135deg, #1a5276 0%, #2980b9 100%)',
    new: true,
  },
  {
    id: 'creative',
    name: 'Creative Edge',
    description: 'Stand out with unique layouts and color accents',
    category: 'premium',
    thumbnail: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  },
  {
    id: 'executive',
    name: 'Executive Premium',
    description: 'Sophisticated design for senior positions',
    category: 'premium',
    thumbnail: 'linear-gradient(135deg, #434343 0%, #000000 100%)',
    popular: true,
  },
  {
    id: 'startup',
    name: 'Startup Ready',
    description: 'Modern and dynamic for tech startups',
    category: 'premium',
    thumbnail: 'linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)',
    new: true,
  },
  {
    id: 'infographic',
    name: 'Infographic Style',
    description: 'Visual representation of skills and experience',
    category: 'premium',
    thumbnail: 'linear-gradient(135deg, #5ee7df 0%, #b490ca 100%)',
  },
];

const fontOptions = [
  { id: 'inter', name: 'Inter', family: 'Inter, sans-serif' },
  { id: 'roboto', name: 'Roboto', family: 'Roboto, sans-serif' },
  { id: 'opensans', name: 'Open Sans', family: 'Open Sans, sans-serif' },
  { id: 'lato', name: 'Lato', family: 'Lato, sans-serif' },
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat, sans-serif' },
  { id: 'merriweather', name: 'Merriweather', family: 'Merriweather, serif' },
];

const colorSchemes = [
  { id: 'default', name: 'Default', primary: '#374151', accent: '#6b7280' },
  { id: 'blue', name: 'Professional Blue', primary: '#1e40af', accent: '#3b82f6' },
  { id: 'green', name: 'Nature Green', primary: '#166534', accent: '#22c55e' },
  { id: 'purple', name: 'Creative Purple', primary: '#7c3aed', accent: '#a78bfa' },
  { id: 'red', name: 'Bold Red', primary: '#dc2626', accent: '#ef4444' },
  { id: 'teal', name: 'Modern Teal', primary: '#0d9488', accent: '#14b8a6' },
  { id: 'orange', name: 'Warm Orange', primary: '#ea580c', accent: '#f97316' },
  { id: 'slate', name: 'Classic Slate', primary: '#334155', accent: '#64748b' },
];

const TemplateMiniPreview = ({ templateId, primaryColor, accentColor }: { templateId: string; primaryColor: string; accentColor: string }) => {
  const dummyName = "Shilpa";
  
  const previewStyles: Record<string, React.ReactNode> = {
    classic: (
      <div className="w-full h-full bg-white p-1.5 text-[3.5px] overflow-hidden">
        <div className="text-center pb-0.5 mb-1" style={{ borderBottom: `1px solid ${primaryColor}` }}>
          <div className="font-bold text-[5px]" style={{ color: primaryColor }}>{dummyName}</div>
          <div className="text-[2.5px]" style={{ color: accentColor }}>Full Stack Developer</div>
          <div className="text-gray-400 text-[2px]">shilpa@email.com | Bangalore</div>
        </div>
        <div className="space-y-0.5">
          <div>
            <div className="text-[2.5px] font-bold" style={{ color: primaryColor, borderBottom: `1px solid ${accentColor}` }}>EXPERIENCE</div>
            <div className="text-[2px] text-gray-600 mt-0.5">Software Engineer - Tech Corp</div>
          </div>
          <div>
            <div className="text-[2.5px] font-bold" style={{ color: primaryColor, borderBottom: `1px solid ${accentColor}` }}>EDUCATION</div>
            <div className="text-[2px] text-gray-600 mt-0.5">B.Tech Computer Science</div>
          </div>
          <div>
            <div className="text-[2.5px] font-bold" style={{ color: primaryColor, borderBottom: `1px solid ${accentColor}` }}>SKILLS</div>
            <div className="flex gap-0.5 mt-0.5 flex-wrap">
              <span className="px-0.5 text-[2px] rounded" style={{ backgroundColor: `${accentColor}20`, color: primaryColor }}>React</span>
              <span className="px-0.5 text-[2px] rounded" style={{ backgroundColor: `${accentColor}20`, color: primaryColor }}>Node</span>
              <span className="px-0.5 text-[2px] rounded" style={{ backgroundColor: `${accentColor}20`, color: primaryColor }}>SQL</span>
            </div>
          </div>
        </div>
      </div>
    ),
    modern: (
      <div className="w-full h-full flex overflow-hidden">
        <div className="w-1/3 p-1" style={{ background: `linear-gradient(to bottom, ${primaryColor}, ${accentColor})` }}>
          <div className="w-3 h-3 bg-white/30 rounded-full mx-auto mb-0.5 flex items-center justify-center text-white text-[3px] font-bold">S</div>
          <div className="text-white text-[3px] text-center truncate font-medium">{dummyName}</div>
          <div className="mt-1 space-y-0.5">
            <div className="text-white/70 text-[2px]">SKILLS</div>
            <div className="h-0.5 bg-white/30 rounded"><div className="h-full w-4/5 bg-white rounded"></div></div>
            <div className="h-0.5 bg-white/30 rounded"><div className="h-full w-3/5 bg-white rounded"></div></div>
          </div>
        </div>
        <div className="flex-1 bg-white p-1">
          <div className="text-[4px] font-bold" style={{ color: primaryColor }}>{dummyName}</div>
          <div className="text-[2.5px]" style={{ color: accentColor }}>Developer</div>
          <div className="mt-1 space-y-0.5">
            <div className="text-[2px] font-bold" style={{ color: accentColor }}>EXPERIENCE</div>
            <div className="h-1 bg-gray-100 rounded"></div>
            <div className="text-[2px] font-bold" style={{ color: accentColor }}>EDUCATION</div>
            <div className="h-1 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    ),
    developer: (
      <div className="w-full h-full bg-white overflow-hidden">
        <div className="p-1" style={{ background: `linear-gradient(to right, ${primaryColor}, ${accentColor})` }}>
          <div className="text-white text-[5px] font-bold">{dummyName}</div>
          <div className="text-white/80 text-[2.5px]">Full Stack Developer</div>
          <div className="text-white/60 text-[2px]">shilpa@email.com</div>
        </div>
        <div className="p-1 grid grid-cols-3 gap-0.5">
          <div className="col-span-2 space-y-0.5">
            <div className="text-[2.5px] font-bold" style={{ color: accentColor }}>PROJECTS</div>
            <div className="pl-0.5" style={{ borderLeft: `1px solid ${accentColor}` }}>
              <div className="text-[2px] font-medium">E-Commerce App</div>
            </div>
            <div className="text-[2.5px] font-bold" style={{ color: accentColor }}>EXPERIENCE</div>
            <div className="h-1 bg-gray-100 rounded"></div>
          </div>
          <div className="space-y-0.5">
            <div className="text-[2.5px] font-bold" style={{ color: accentColor }}>SKILLS</div>
            <div className="flex flex-wrap gap-0.5">
              <span className="px-0.5 bg-gray-100 text-[2px] rounded">React</span>
              <span className="px-0.5 bg-gray-100 text-[2px] rounded">Node</span>
            </div>
          </div>
        </div>
      </div>
    ),
    compact: (
      <div className="w-full h-full bg-white p-1 text-[3px] overflow-hidden">
        <div className="flex justify-between pb-0.5 mb-0.5" style={{ borderBottom: `1px solid ${accentColor}` }}>
          <div>
            <div className="font-bold text-[4px]" style={{ color: primaryColor }}>{dummyName}</div>
            <div className="text-gray-500 text-[2.5px]">Developer</div>
          </div>
          <div className="text-gray-400 text-[2px] text-right">
            <div>shilpa@email.com</div>
            <div>Bangalore</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1">
          <div>
            <div className="font-bold text-[2.5px]" style={{ color: primaryColor }}>Experience</div>
            <div className="text-[2px] text-gray-600">Software Engineer</div>
          </div>
          <div>
            <div className="font-bold text-[2.5px]" style={{ color: primaryColor }}>Education</div>
            <div className="text-[2px] text-gray-600">B.Tech CS</div>
          </div>
        </div>
        <div className="mt-0.5">
          <div className="font-bold text-[2.5px]" style={{ color: primaryColor }}>Skills</div>
          <div className="text-[2px] text-gray-500">React • Node • Python • SQL</div>
        </div>
      </div>
    ),
    elegant: (
      <div className="w-full h-full bg-white p-1.5 overflow-hidden font-serif">
        <div className="text-center pb-0.5 mb-1" style={{ borderBottom: `2px solid ${primaryColor}` }}>
          <div className="text-[5px] font-light tracking-wide" style={{ color: primaryColor }}>{dummyName}</div>
          <div className="text-[2.5px] italic" style={{ color: accentColor }}>Full Stack Developer</div>
        </div>
        <div className="space-y-0.5">
          <div>
            <div className="text-[2.5px] font-light tracking-wide" style={{ color: primaryColor }}>Profile</div>
            <div className="text-[2px] text-gray-500 italic">Passionate developer...</div>
          </div>
          <div>
            <div className="text-[2.5px] font-light tracking-wide" style={{ color: primaryColor }}>Experience</div>
            <div className="text-[2px] text-gray-600">Software Engineer</div>
          </div>
          <div className="grid grid-cols-2 gap-1">
            <div>
              <div className="text-[2.5px] font-light" style={{ color: primaryColor }}>Education</div>
              <div className="text-[2px] text-gray-500">B.Tech</div>
            </div>
            <div>
              <div className="text-[2.5px] font-light" style={{ color: primaryColor }}>Skills</div>
              <div className="text-[2px] text-gray-500">React, Node</div>
            </div>
          </div>
        </div>
      </div>
    ),
    bold: (
      <div className="w-full h-full bg-white overflow-hidden">
        <div className="p-1" style={{ backgroundColor: primaryColor }}>
          <div className="text-white text-[5px] font-black">{dummyName}</div>
          <div className="text-white/70 text-[2.5px] font-medium">Developer</div>
        </div>
        <div className="p-1 space-y-0.5">
          <div className="flex gap-0.5 flex-wrap">
            <span className="px-0.5 py-0.5 rounded-full text-[2px]" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}>React</span>
            <span className="px-0.5 py-0.5 rounded-full text-[2px]" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}>Node</span>
            <span className="px-0.5 py-0.5 rounded-full text-[2px]" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}>Python</span>
          </div>
          <div className="grid grid-cols-2 gap-0.5">
            <div className="pl-0.5" style={{ borderLeft: `2px solid ${primaryColor}` }}>
              <div className="text-[2.5px] font-black" style={{ color: primaryColor }}>EXP</div>
              <div className="text-[2px]">Engineer</div>
            </div>
            <div className="pl-0.5" style={{ borderLeft: `2px solid ${primaryColor}` }}>
              <div className="text-[2.5px] font-black" style={{ color: primaryColor }}>EDU</div>
              <div className="text-[2px]">B.Tech</div>
            </div>
          </div>
        </div>
      </div>
    ),
    minimalist: (
      <div className="w-full h-full bg-white p-1.5 overflow-hidden">
        <div className="text-[5px] font-light" style={{ color: primaryColor }}>{dummyName}</div>
        <div className="text-[2.5px] text-gray-400">Full Stack Developer</div>
        <div className="flex gap-2 text-[2px] text-gray-400 mt-0.5">
          <span>shilpa@email.com</span>
          <span>Bangalore</span>
        </div>
        <div className="mt-1 pt-0.5 space-y-0.5" style={{ borderTop: `1px solid ${accentColor}30` }}>
          <div className="text-[2px] uppercase tracking-widest text-gray-400">Experience</div>
          <div className="text-[2.5px]" style={{ color: primaryColor }}>Software Engineer</div>
        </div>
        <div className="mt-0.5 pt-0.5" style={{ borderTop: `1px solid ${accentColor}30` }}>
          <div className="text-[2px] uppercase tracking-widest text-gray-400">Skills</div>
          <div className="text-[2.5px] text-gray-500">React · Node · Python</div>
        </div>
      </div>
    ),
    academic: (
      <div className="w-full h-full bg-white p-1 overflow-hidden">
        <div className="pb-0.5 mb-0.5" style={{ borderBottom: `2px solid ${primaryColor}` }}>
          <div className="text-[5px] font-bold" style={{ color: primaryColor }}>{dummyName}</div>
          <div className="text-[2.5px] text-gray-600">Full Stack Developer</div>
          <div className="text-[2px] text-gray-500">shilpa@email.com | Bangalore</div>
        </div>
        <div className="space-y-0.5">
          <div>
            <div className="text-[2.5px] font-bold uppercase" style={{ color: primaryColor }}>Education</div>
            <div className="text-[2px] text-gray-600">B.Tech Computer Science</div>
            <div className="text-[2px] text-gray-500">ABC Institute - 8.5 CGPA</div>
          </div>
          <div>
            <div className="text-[2.5px] font-bold uppercase" style={{ color: primaryColor }}>Experience</div>
            <div className="text-[2px] text-gray-600">Software Engineer - Tech Corp</div>
          </div>
          <div>
            <div className="text-[2.5px] font-bold uppercase" style={{ color: primaryColor }}>Skills</div>
            <div className="text-[2px] text-gray-500">React, Node.js, Python, SQL</div>
          </div>
        </div>
      </div>
    ),
    creative: (
      <div className="w-full h-full p-1.5 overflow-hidden" style={{ background: `linear-gradient(135deg, ${accentColor}, ${primaryColor})` }}>
        <div className="text-white text-[5px] font-bold">{dummyName}</div>
        <div className="text-white/80 text-[2.5px]">Creative Developer</div>
        <div className="mt-1 space-y-0.5">
          <div className="bg-white/20 rounded p-0.5">
            <div className="text-white/80 text-[2px]">Experience: 2+ years</div>
          </div>
          <div className="flex gap-0.5">
            <div className="bg-white/20 rounded px-0.5 text-white text-[2px]">React</div>
            <div className="bg-white/20 rounded px-0.5 text-white text-[2px]">Design</div>
          </div>
        </div>
      </div>
    ),
    executive: (
      <div className="w-full h-full p-1.5 overflow-hidden" style={{ background: `linear-gradient(135deg, ${primaryColor}, #000)` }}>
        <div className="text-white text-[5px] font-bold">{dummyName}</div>
        <div className="text-gray-400 text-[2.5px]">Senior Developer</div>
        <div className="mt-1 border-t border-gray-600 pt-0.5 space-y-0.5">
          <div className="text-gray-400 text-[2px]">Experience</div>
          <div className="text-white text-[2.5px]">Tech Lead - 5 years</div>
          <div className="text-gray-400 text-[2px]">Education</div>
          <div className="text-white text-[2.5px]">M.Tech CS</div>
        </div>
      </div>
    ),
    startup: (
      <div className="w-full h-full p-1.5 overflow-hidden" style={{ background: `linear-gradient(to right, ${primaryColor}, ${accentColor})` }}>
        <div className="text-white text-[5px] font-bold">{dummyName}</div>
        <div className="text-white/80 text-[2.5px]">Startup Engineer</div>
        <div className="mt-1 flex gap-0.5">
          <div className="flex-1 bg-white/30 rounded p-0.5">
            <div className="text-white text-[2px]">3 Projects</div>
          </div>
          <div className="flex-1 bg-white/30 rounded p-0.5">
            <div className="text-white text-[2px]">5 Skills</div>
          </div>
        </div>
        <div className="mt-0.5 text-white/80 text-[2px]">React • Node • AWS</div>
      </div>
    ),
    infographic: (
      <div className="w-full h-full p-1.5 overflow-hidden" style={{ background: `linear-gradient(135deg, ${accentColor}, ${primaryColor})` }}>
        <div className="text-white text-[5px] font-bold">{dummyName}</div>
        <div className="text-white/80 text-[2.5px]">Visual Developer</div>
        <div className="flex gap-0.5 mt-1">
          <div className="w-3 h-3 bg-white/30 rounded-full flex items-center justify-center">
            <div className="text-white text-[3px]">85%</div>
          </div>
          <div className="w-3 h-3 bg-white/30 rounded-full flex items-center justify-center">
            <div className="text-white text-[3px]">90%</div>
          </div>
          <div className="flex-1 space-y-0.5">
            <div className="h-1 bg-white/30 rounded"></div>
            <div className="h-1 bg-white/30 rounded"></div>
          </div>
        </div>
      </div>
    ),
  };

  return (
    <div className="w-16 h-24 rounded-md overflow-hidden border border-gray-200 shadow-sm flex-shrink-0">
      {previewStyles[templateId] || (
        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
          <FileText className="h-6 w-6 text-gray-400" />
        </div>
      )}
    </div>
  );
};

const ResumeBuilder = () => {
  const navigate = useNavigate();
  const [selectedTemplate, setSelectedTemplate] = useState<string>('classic');
  const [activeTab, setActiveTab] = useState<string>('free');
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedFont, setSelectedFont] = useState('inter');
  const [selectedColor, setSelectedColor] = useState('default');
  const [fontSize, setFontSize] = useState(100);
  const [lineSpacing, setLineSpacing] = useState(1.5);
  const [sectionOrder, setSectionOrder] = useState<SectionConfig[]>(defaultSectionOrder);
  const [savedSettings, setSavedSettings] = useState<ResumeSettings | null>(null);
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(false);
  const resumeRef = useRef<HTMLDivElement>(null);

  const { profile, skills = [], experiences = [], projects = [], education = [], socialLinks, loading, error } = useProfileData();

  useEffect(() => {
    const savedStr = localStorage.getItem(STORAGE_KEY);
    if (savedStr) {
      try {
        const saved: ResumeSettings = JSON.parse(savedStr);
        setSelectedTemplate(saved.template);
        setSelectedFont(saved.font);
        setSelectedColor(saved.color);
        setFontSize(saved.fontSize);
        setLineSpacing(saved.lineSpacing);
        setSectionOrder(saved.sectionOrder);
        setSavedSettings(saved);
        const template = templates.find(t => t.id === saved.template);
        if (template) {
          setActiveTab(template.category);
        }
      } catch (e) {
      }
    }
  }, []);

  useEffect(() => {
    if (savedSettings) {
      console.log('Properties changed, auto-saving...', {
        selectedFont,
        selectedColor,
        fontSize,
        lineSpacing,
        sectionOrder: sectionOrder.length
      });
      
      const timeoutId = setTimeout(() => {
        handleSave();
      }, 1000); 

      return () => clearTimeout(timeoutId);
    }
  }, [selectedFont, selectedColor, fontSize, lineSpacing, sectionOrder]);

  useEffect(() => {
    console.log('Font changed effect triggered:', {
      selectedFont,
      currentFont: fontOptions.find(f => f.id === selectedFont),
      timestamp: new Date().toISOString()
    });
  }, [selectedFont]);

  const safeProfile = {
    name: profile?.name || profile?.full_name || 'Your Name',
    title: profile?.title || 'Your Title',
    location: profile?.location || 'Your Location',
    about: profile?.about || 'Your professional summary',
  };

  const safeEmail = profile?.links?.email || 'your.email@example.com';

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="text-muted-foreground mt-4">Loading profile data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive">Error loading profile data</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const handleSave = () => {
    const settings: ResumeSettings = {
      template: selectedTemplate,
      font: selectedFont,
      color: selectedColor,
      fontSize,
      lineSpacing,
      sectionOrder,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setSavedSettings(settings);
    toast.success('Resume settings saved!');
  };

  const hasUnsavedChanges = () => {
    if (!savedSettings) return true;
    return (
      savedSettings.template !== selectedTemplate ||
      savedSettings.font !== selectedFont ||
      savedSettings.color !== selectedColor ||
      savedSettings.fontSize !== fontSize ||
      savedSettings.lineSpacing !== lineSpacing ||
      JSON.stringify(savedSettings.sectionOrder) !== JSON.stringify(sectionOrder)
    );
  };

  const currentFont = fontOptions.find(f => f.id === selectedFont) || fontOptions[0];
  const currentColor = colorSchemes.find(c => c.id === selectedColor) || colorSchemes[0];

  const filteredTemplates = templates.filter(template => template.category === activeTab);

  console.log('Font Debug:', {
    selectedFont,
    currentFont,
    fontFamily: currentFont.family
  });

  const handleTemplateSelect = (templateId: string) => {
    console.log('Template selected:', templateId);
    setSelectedTemplate(templateId);
    
    const template = templates.find(t => t.id === templateId);
    if (template && template.category !== activeTab) {
      setActiveTab(template.category);
    }
    
    if (resumeRef.current) {
      resumeRef.current.style.display = 'none';
      setTimeout(() => {
        if (resumeRef.current) {
          resumeRef.current.style.display = 'block';
        }
      }, 10);
    }
  };

  const handleDownload = async () => {
    const template = templates.find(t => t.id === selectedTemplate);
    if (template?.category === 'premium') {
      toast.error('Premium template requires subscription', {
        description: 'Upgrade to premium to access this template.',
      });
      return;
    }

    if (!resumeRef.current) return;

    setIsDownloading(true);
    try {

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }

      const resumeContent = resumeRef.current.outerHTML;
      
      const printDocument = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>${safeProfile.name.replace(/\s+/g, '_')}_Resume</title>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Roboto:wght@300;400;500;700&family=Open+Sans:wght@300;400;500;600;700&family=Lato:wght@300;400;700&family=Montserrat:wght@300;400;500;600;700&family=Merriweather:wght@300;400;700&display=swap" rel="stylesheet">
            <style>
              body { 
                margin: 0; 
                padding: 20px; 
                font-family: ${currentFont.family};
                background: white;
              }
              * {
                font-family: ${currentFont.family} !important;
              }
              @media print {
                body { margin: 0; padding: 0; }
                .no-print { display: none !important; }
              }
              .resume-container {
                max-width: 210mm;
                margin: 0 auto;
                background: white;
                box-shadow: none;
                font-family: ${currentFont.family} !important;
              }
              .resume-preview {
                font-family: ${currentFont.family} !important;
              }
              .resume-preview * {
                font-family: ${currentFont.family} !important;
              }
            </style>
          </head>
          <body>
            <div class="resume-container">
              ${resumeContent}
            </div>
            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() {
                  window.close();
                }, 100);
              };
            </script>
          </body>
        </html>
      `;

      printWindow.document.write(printDocument);
      printWindow.document.close();
      
      toast.success('Print dialog opened! You can save as PDF from there.');
    } catch (error) {
      console.error('Print error:', error);
      toast.error('Failed to open print dialog. Please try using your browser\'s print function (Ctrl+P).');
    } finally {
      setIsDownloading(false);
    }
  };

  const getOrderedSections = () => {
    return [...sectionOrder]
      .filter(s => s.visible)
      .sort((a, b) => a.order - b.order);
  };

  const isSectionVisible = (sectionId: string) => {
    const section = sectionOrder.find(s => s.id === sectionId);
    return section?.visible ?? true;
  };

  const sectionRenderers = {
    summary: (primaryColor: string, accentColor: string, style: string = 'classic') => {
      if (!safeProfile.about) return null;
      const styles: Record<string, React.ReactNode> = {
        classic: (
          <div key="summary">
            <h2 className="text-lg font-bold border-b pb-1 mb-2" style={{ color: primaryColor, borderColor: accentColor }}>PROFESSIONAL SUMMARY</h2>
            <p className="text-sm text-gray-600">{safeProfile.about}</p>
          </div>
        ),
        modern: (
          <div key="summary">
            <h2 className="text-sm font-bold mb-2" style={{ color: accentColor }}>ABOUT ME</h2>
            <p className="text-sm text-gray-600">{safeProfile.about}</p>
          </div>
        ),
        developer: (
          <div key="summary">
            <h2 className="text-sm font-bold uppercase mb-2" style={{ color: accentColor }}>About</h2>
            <p className="text-sm text-gray-600">{safeProfile.about}</p>
          </div>
        ),
        elegant: (
          <div key="summary">
            <h2 className="text-xl font-light mb-3 tracking-wide" style={{ color: primaryColor }}>Profile</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{safeProfile.about}</p>
          </div>
        ),
        bold: (
          <div key="summary">
            <h2 className="text-lg font-black uppercase mb-2" style={{ color: primaryColor }}>About Me</h2>
            <p className="text-sm text-gray-600">{safeProfile.about}</p>
          </div>
        ),
        minimalist: (
          <div key="summary" className="border-t pt-6" style={{ borderColor: `${accentColor}30` }}>
            <p className="text-sm text-gray-600 leading-relaxed">{safeProfile.about}</p>
          </div>
        ),
        academic: (
          <div key="summary">
            <h2 className="text-sm font-bold uppercase tracking-wide mb-2" style={{ color: primaryColor }}>Research Interests / Summary</h2>
            <p className="text-sm text-gray-600">{safeProfile.about}</p>
          </div>
        ),
        compact: (
          <div key="summary">
            <h2 className="font-bold mb-1" style={{ color: primaryColor }}>Summary</h2>
            <p className="text-gray-600 text-xs">{safeProfile.about}</p>
          </div>
        ),
      };
      return styles[style] || styles.classic;
    },

    experience: (primaryColor: string, accentColor: string, style: string = 'classic') => {
      if (!experiences || experiences.length === 0) return null;
      const styles: Record<string, React.ReactNode> = {
        classic: (
          <div key="experience">
            <h2 className="text-lg font-bold border-b pb-1 mb-2" style={{ color: primaryColor, borderColor: accentColor }}>EXPERIENCE</h2>
            {experiences.map((exp, idx) => (
              <div key={idx} className="mb-3">
                <div className="flex justify-between">
                  <span className="font-semibold" style={{ color: primaryColor }}>{exp.role}</span>
                  <span className="text-sm text-gray-500">{exp.duration}</span>
                </div>
                <p className="text-sm text-gray-600">{exp.company}</p>
                <ul className="text-sm text-gray-500 mt-1 list-disc list-inside">
                  {(exp.description_list || []).map((desc: string, i: number) => <li key={i}>{desc}</li>)}
                </ul>
              </div>
            ))}
          </div>
        ),
        modern: (
          <div key="experience">
            <h2 className="text-sm font-bold mb-2" style={{ color: accentColor }}>EXPERIENCE</h2>
            {experiences.map((exp, idx) => (
              <div key={idx} className="mb-2">
                <p className="font-semibold" style={{ color: primaryColor }}>{exp.role}</p>
                <p className="text-sm text-gray-500">{exp.company} | {exp.duration}</p>
              </div>
            ))}
          </div>
        ),
        developer: (
          <div key="experience">
            <h2 className="text-sm font-bold uppercase mb-2" style={{ color: accentColor }}>Experience</h2>
            {experiences.map((exp, idx) => (
              <div key={idx}>
                <p className="font-semibold" style={{ color: primaryColor }}>{exp.role}</p>
                <p className="text-sm text-gray-500">{exp.company} • {exp.duration}</p>
              </div>
            ))}
          </div>
        ),
        elegant: (
          <div key="experience">
            <h2 className="text-xl font-light mb-3 tracking-wide" style={{ color: primaryColor }}>Experience</h2>
            {experiences.map((exp, idx) => (
              <div key={idx} className="mb-4">
                <div className="flex justify-between">
                  <span className="font-medium" style={{ color: primaryColor }}>{exp.role}</span>
                  <span className="text-sm text-gray-500 italic">{exp.duration}</span>
                </div>
                <p className="text-sm text-gray-600 italic">{exp.company}</p>
              </div>
            ))}
          </div>
        ),
        bold: (
          <div key="experience">
            <h2 className="text-lg font-black uppercase mb-2" style={{ color: primaryColor }}>Experience</h2>
            {experiences.map((exp, idx) => (
              <div key={idx} className="border-l-4 pl-3" style={{ borderColor: primaryColor }}>
                <p className="font-bold" style={{ color: primaryColor }}>{exp.role}</p>
                <p className="text-sm text-gray-500">{exp.company}</p>
                <p className="text-xs text-gray-400">{exp.duration}</p>
              </div>
            ))}
          </div>
        ),
        minimalist: (
          <div key="experience" className="border-t pt-6" style={{ borderColor: `${accentColor}30` }}>
            <h2 className="text-xs uppercase tracking-widest text-gray-400 mb-4">Experience</h2>
            {experiences.map((exp, idx) => (
              <div key={idx}>
                <p style={{ color: primaryColor }}>{exp.role}</p>
                <p className="text-sm text-gray-400">{exp.company} · {exp.duration}</p>
              </div>
            ))}
          </div>
        ),
        academic: (
          <div key="experience">
            <h2 className="text-sm font-bold uppercase tracking-wide mb-2" style={{ color: primaryColor }}>Professional Experience</h2>
            {experiences.map((exp, idx) => (
              <div key={idx} className="mb-2">
                <div className="flex justify-between">
                  <span className="font-semibold" style={{ color: primaryColor }}>{exp.role}</span>
                  <span className="text-sm text-gray-500">{exp.duration}</span>
                </div>
                <p className="text-sm text-gray-600">{exp.company}</p>
              </div>
            ))}
          </div>
        ),
        compact: (
          <div key="experience">
            <h2 className="font-bold mb-1" style={{ color: primaryColor }}>Experience</h2>
            {experiences.map((exp, idx) => (
              <div key={idx} className="mb-2">
                <p className="font-medium">{exp.role}</p>
                <p className="text-gray-500 text-xs">{exp.company} | {exp.duration}</p>
              </div>
            ))}
          </div>
        ),
      };
      return styles[style] || styles.classic;
    },

    education: (primaryColor: string, accentColor: string, style: string = 'classic') => {
      if (education.length === 0) return null;
      const styles: Record<string, React.ReactNode> = {
        classic: (
          <div key="education">
            <h2 className="text-lg font-bold border-b pb-1 mb-2" style={{ color: primaryColor, borderColor: accentColor }}>EDUCATION</h2>
            {education.map((edu, idx) => (
              <div key={idx}>
                <div className="flex justify-between">
                  <span className="font-semibold" style={{ color: primaryColor }}>{edu.institution}</span>
                  <span className="text-sm text-gray-500">{edu.duration}</span>
                </div>
                <p className="text-sm text-gray-600">{edu.degree} in {edu.field}</p>
                {edu.cgpa && <p className="text-sm text-gray-500">CGPA: {edu.cgpa}</p>}
              </div>
            ))}
          </div>
        ),
        modern: (
          <div key="education">
            <h2 className="text-sm font-bold mb-2" style={{ color: accentColor }}>EDUCATION</h2>
            {education.map((edu, idx) => (
              <div key={idx}>
                <p className="font-semibold" style={{ color: primaryColor }}>{edu.degree}</p>
                <p className="text-sm text-gray-500">{edu.institution}</p>
              </div>
            ))}
          </div>
        ),
        developer: (
          <div key="education">
            <h2 className="text-sm font-bold uppercase mb-2" style={{ color: accentColor }}>Education</h2>
            {education.map((edu, idx) => (
              <div key={idx}>
                <p className="font-semibold text-sm" style={{ color: primaryColor }}>{edu.degree}</p>
                <p className="text-xs text-gray-500">{edu.institution}</p>
              </div>
            ))}
          </div>
        ),
        elegant: (
          <div key="education">
            <h2 className="text-xl font-light mb-3 tracking-wide" style={{ color: primaryColor }}>Education</h2>
            {education.map((edu, idx) => (
              <div key={idx}>
                <p className="font-medium" style={{ color: primaryColor }}>{edu.degree}</p>
                <p className="text-sm text-gray-600 italic">{edu.institution}</p>
                <p className="text-sm text-gray-500">{edu.duration}</p>
              </div>
            ))}
          </div>
        ),
        bold: (
          <div key="education">
            <h2 className="text-lg font-black uppercase mb-2" style={{ color: primaryColor }}>Education</h2>
            {education.map((edu, idx) => (
              <div key={idx} className="border-l-4 pl-3" style={{ borderColor: primaryColor }}>
                <p className="font-bold" style={{ color: primaryColor }}>{edu.degree}</p>
                <p className="text-sm text-gray-500">{edu.institution}</p>
              </div>
            ))}
          </div>
        ),
        minimalist: (
          <div key="education" className="border-t pt-6" style={{ borderColor: `${accentColor}30` }}>
            <h2 className="text-xs uppercase tracking-widest text-gray-400 mb-4">Education</h2>
            {education.map((edu, idx) => (
              <div key={idx}>
                <p style={{ color: primaryColor }}>{edu.degree}</p>
                <p className="text-sm text-gray-400">{edu.institution}</p>
              </div>
            ))}
          </div>
        ),
        academic: (
          <div key="education">
            <h2 className="text-sm font-bold uppercase tracking-wide mb-2" style={{ color: primaryColor }}>Education</h2>
            {education.map((edu, idx) => (
              <div key={idx} className="mb-2">
                <div className="flex justify-between">
                  <span className="font-semibold" style={{ color: primaryColor }}>{edu.institution}</span>
                  <span className="text-sm text-gray-500">{edu.duration}</span>
                </div>
                <p className="text-sm text-gray-600">{edu.degree} in {edu.field}</p>
                {edu.cgpa && <p className="text-sm text-gray-500">CGPA: {edu.cgpa}</p>}
              </div>
            ))}
          </div>
        ),
        compact: (
          <div key="education">
            <h2 className="font-bold mb-1" style={{ color: primaryColor }}>Education</h2>
            {education.map((edu, idx) => (
              <div key={idx}>
                <p className="font-medium">{edu.degree}</p>
                <p className="text-gray-500 text-xs">{edu.institution}</p>
              </div>
            ))}
          </div>
        ),
      };
      return styles[style] || styles.classic;
    },

    skills: (primaryColor: string, accentColor: string, style: string = 'classic') => {
      if (skills.length === 0) return null;
      const styles: Record<string, React.ReactNode> = {
        classic: (
          <div key="skills">
            <h2 className="text-lg font-bold border-b pb-1 mb-2" style={{ color: primaryColor, borderColor: accentColor }}>SKILLS</h2>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill, idx) => (
                <span key={idx} className="px-2 py-1 text-sm rounded" style={{ backgroundColor: `${accentColor}20`, color: primaryColor }}>{skill.name}</span>
              ))}
            </div>
          </div>
        ),
        modern: null, 
        developer: (
          <div key="skills">
            <h2 className="text-sm font-bold uppercase mb-2" style={{ color: accentColor }}>Tech Stack</h2>
            <div className="flex flex-wrap gap-1">
              {skills.map((skill, idx) => (
                <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">{skill.name}</span>
              ))}
            </div>
          </div>
        ),
        elegant: (
          <div key="skills">
            <h2 className="text-xl font-light mb-3 tracking-wide" style={{ color: primaryColor }}>Skills</h2>
            <div className="space-y-1">
              {skills.map((skill, idx) => (
                <p key={idx} className="text-sm text-gray-600">{skill.name}</p>
              ))}
            </div>
          </div>
        ),
        bold: (
          <div key="skills">
            <h2 className="text-lg font-black uppercase mb-2" style={{ color: primaryColor }}>Skills</h2>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill, idx) => (
                <span key={idx} className="px-3 py-1 text-white text-sm font-bold rounded" style={{ backgroundColor: primaryColor }}>{skill.name}</span>
              ))}
            </div>
          </div>
        ),
        minimalist: (
          <div key="skills" className="border-t pt-6" style={{ borderColor: `${accentColor}30` }}>
            <h2 className="text-xs uppercase tracking-widest text-gray-400 mb-4">Skills</h2>
            <p className="text-sm text-gray-600">{(skills || []).map(s => s.name).join(' · ')}</p>
          </div>
        ),
        academic: (
          <div key="skills">
            <h2 className="text-sm font-bold uppercase tracking-wide mb-2" style={{ color: primaryColor }}>Technical Skills</h2>
            <p className="text-sm text-gray-600">{(skills || []).map(s => s.name).join(', ')}</p>
          </div>
        ),
        compact: (
          <div key="skills">
            <h2 className="font-bold mb-1" style={{ color: primaryColor }}>Skills</h2>
            <p className="text-gray-600">{(skills || []).map(s => s.name).join(' • ')}</p>
          </div>
        ),
      };
      return styles[style] || styles.classic;
    },

    projects: (primaryColor: string, accentColor: string, style: string = 'classic') => {
      if (projects.length === 0) return null;
      const styles: Record<string, React.ReactNode> = {
        classic: (
          <div key="projects">
            <h2 className="text-lg font-bold border-b pb-1 mb-2" style={{ color: primaryColor, borderColor: accentColor }}>PROJECTS</h2>
            {projects.map((project, idx) => (
              <div key={idx} className="mb-2">
                <span className="font-semibold" style={{ color: primaryColor }}>{project.title}</span>
                <p className="text-sm text-gray-600">{project.description}</p>
                <p className="text-sm text-gray-500">Tech: {(project.tech_stack || []).join(', ')}</p>
              </div>
            ))}
          </div>
        ),
        developer: (
          <div key="projects">
            <h2 className="text-sm font-bold uppercase mb-2" style={{ color: accentColor }}>Projects</h2>
            {projects.map((project, idx) => (
              <div key={idx} className="border-l-2 pl-3 mb-3" style={{ borderColor: accentColor }}>
                <p className="font-semibold" style={{ color: primaryColor }}>{project.title}</p>
                <p className="text-sm text-gray-600">{project.description}</p>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {(project.tech_stack || []).map((tech: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 text-xs rounded" style={{ backgroundColor: `${accentColor}20`, color: primaryColor }}>{tech}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ),
        academic: (
          <div key="projects">
            <h2 className="text-sm font-bold uppercase tracking-wide mb-2" style={{ color: primaryColor }}>Projects / Publications</h2>
            {projects.map((project, idx) => (
              <div key={idx} className="mb-2">
                <p className="font-semibold" style={{ color: primaryColor }}>{project.title}</p>
                <p className="text-sm text-gray-600">{project.description}</p>
              </div>
            ))}
          </div>
        ),
        compact: (
          <div key="projects">
            <h2 className="font-bold mb-1" style={{ color: primaryColor }}>Projects</h2>
            {projects.map((project, idx) => (
              <div key={idx}>
                <span className="font-medium">{project.title}</span>
                <span className="text-gray-500"> - {project.description}</span>
              </div>
            ))}
          </div>
        ),
        default: (
          <div key="projects">
            <h2 className="text-lg font-bold border-b pb-1 mb-2" style={{ color: primaryColor, borderColor: accentColor }}>PROJECTS</h2>
            {projects.map((project, idx) => (
              <div key={idx} className="mb-2">
                <span className="font-semibold" style={{ color: primaryColor }}>{project.title}</span>
                <p className="text-sm text-gray-600">{project.description}</p>
              </div>
            ))}
          </div>
        ),
      };
      return styles[style] || styles.default;
    },
  };

  const renderOrderedSections = (primaryColor: string, accentColor: string, style: string) => {
    const orderedSections = getOrderedSections();
    return orderedSections.map(section => {
      const renderer = sectionRenderers[section.id as keyof typeof sectionRenderers];
      if (renderer) {
        return renderer(primaryColor, accentColor, style);
      }
      return null;
    });
  };

  const renderResumePreview = () => {
    const template = templates.find(t => t.id === selectedTemplate);
    const primaryColor = currentColor.primary;
    const accentColor = currentColor.accent;
    
    const getFontClassName = (fontId: string) => {
      const fontClassMap: Record<string, string> = {
        'inter': 'font-inter',
        'roboto': 'font-roboto',
        'opensans': 'font-opensans',
        'lato': 'font-lato',
        'montserrat': 'font-montserrat',
        'merriweather': 'font-merriweather'
      };
      return fontClassMap[fontId] || 'font-inter';
    };
    
    const fontClassName = getFontClassName(selectedFont);
    
    console.log('Font Debug - Resume Preview:', { 
      selectedFont, 
      fontClassName, 
      currentFont: currentFont.family,
      fontSize,
      lineSpacing
    });
    
    const fontStyle = {
      fontSize: `${fontSize}%`,
      lineHeight: lineSpacing,
      fontFamily: `${currentFont.family} !important`, 
      '--resume-font-family': currentFont.family,
      '--resume-font-size': `${fontSize}%`,
      '--resume-line-height': lineSpacing,
      '--selected-font': selectedFont
    } as React.CSSProperties;
    
    return (
      <div 
        key={`${selectedFont}-${selectedColor}-${fontSize}-${lineSpacing}`} 
        ref={resumeRef} 
        className={`bg-white text-black p-8 min-h-[842px] w-full max-w-[595px] mx-auto shadow-2xl resume-preview ${fontClassName}`}
        style={fontStyle}
        data-font={currentFont.name}
      >
        {selectedTemplate === 'classic' && (
          <div className="space-y-6">
            <div className="text-center border-b-2 pb-4" style={{ borderColor: primaryColor }}>
              <h1 className="text-3xl font-bold" style={{ color: primaryColor }}>{safeProfile.name}</h1>
              <p className="text-lg mt-1" style={{ color: accentColor }}>{safeProfile.title}</p>
              <div className="flex justify-center gap-4 mt-2 text-sm text-gray-500">
                <span>{safeEmail}</span>
                <span>|</span>
                <span>{safeProfile.location}</span>
              </div>
            </div>
            
            {renderOrderedSections(primaryColor, accentColor, 'classic')}
          </div>
        )}
        
        {selectedTemplate === 'modern' && (
          <div className="flex">
            <div className="w-1/3 text-white p-6 -m-8 mr-6 min-h-[842px]" style={{ background: `linear-gradient(to bottom, ${primaryColor}, ${accentColor})` }}>
              <div className="mb-8">
                <div className="w-20 h-20 bg-white/20 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-bold">
                  {(safeProfile.name || '').split(' ').map(n => n[0]).join('')}
                </div>
                <h2 className="text-center font-semibold">{safeProfile.name}</h2>
              </div>
              
              <div className="mb-6">
                <h3 className="text-sm font-bold mb-2 opacity-80">CONTACT</h3>
                <p className="text-xs opacity-70">{safeEmail}</p>
                <p className="text-xs opacity-70">{safeProfile.location}</p>
              </div>
              
              {isSectionVisible('skills') && skills.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold mb-2 opacity-80">SKILLS</h3>
                  <div className="space-y-2">
                    {skills.map((skill, idx) => (
                      <div key={idx} className="text-xs">
                        <span>{skill.name}</span>
                        <div className="w-full bg-white/20 h-1 rounded mt-1">
                          <div className="bg-white h-1 rounded" style={{ width: `${skill.percentage}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex-1 pl-4 space-y-6">
              <div>
                <h1 className="text-2xl font-bold" style={{ color: primaryColor }}>{safeProfile.name}</h1>
                <p style={{ color: accentColor }}>{safeProfile.title}</p>
              </div>
              
              {renderOrderedSections(primaryColor, accentColor, 'modern')}
            </div>
          </div>
        )}
        
        {selectedTemplate === 'developer' && (
          <div className="space-y-6">
            <div className="text-white p-6 -m-8 mb-6" style={{ background: `linear-gradient(to right, ${primaryColor}, ${accentColor})` }}>
              <h1 className="text-3xl font-bold">{safeProfile.name}</h1>
              <p className="opacity-80 mt-1">{safeProfile.title}</p>
              <div className="flex gap-4 mt-3 text-sm opacity-80">
                <span>{safeEmail}</span>
                <span>{safeProfile.location}</span>
              </div>
            </div>
            
            {renderOrderedSections(primaryColor, accentColor, 'developer')}
          </div>
        )}
        
        {selectedTemplate === 'compact' && (
          <div className="space-y-4 text-sm">
            <div className="flex justify-between items-start border-b pb-3" style={{ borderColor: accentColor }}>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: primaryColor }}>{safeProfile.name}</h1>
                <p className="text-gray-600">{safeProfile.title}</p>
              </div>
              <div className="text-right text-xs text-gray-500">
                <p>{safeEmail}</p>
                <p>{safeProfile.location}</p>
              </div>
            </div>
            
            {renderOrderedSections(primaryColor, accentColor, 'compact')}
          </div>
        )}

        {selectedTemplate === 'elegant' && (
          <div className="space-y-6">
            <div className="text-center border-b-2 pb-4" style={{ borderColor: primaryColor }}>
              <h1 className="text-4xl font-light tracking-wide" style={{ color: primaryColor }}>{safeProfile.name}</h1>
              <p className="text-lg mt-2 italic" style={{ color: accentColor }}>{safeProfile.title}</p>
              <div className="flex justify-center gap-6 mt-3 text-sm text-gray-500">
                <span>{safeEmail}</span>
                <span>{safeProfile.location}</span>
              </div>
            </div>
            
            {renderOrderedSections(primaryColor, accentColor, 'elegant')}
          </div>
        )}

        {selectedTemplate === 'bold' && (
          <div className="space-y-6">
            <div className="text-white p-6 -m-8 mb-6" style={{ backgroundColor: primaryColor }}>
              <h1 className="text-4xl font-black">{safeProfile.name}</h1>
              <p className="mt-1 font-medium opacity-80">{safeProfile.title}</p>
            </div>
            
            <div className="flex gap-4 text-sm flex-wrap">
              <span className="px-3 py-1 rounded-full" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}>{safeEmail}</span>
              <span className="px-3 py-1 rounded-full" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}>{safeProfile.location}</span>
            </div>
            
            {renderOrderedSections(primaryColor, accentColor, 'bold')}
          </div>
        )}

        {selectedTemplate === 'minimalist' && (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-light" style={{ color: primaryColor }}>{safeProfile.name}</h1>
              <p className="text-gray-400 mt-1">{safeProfile.title}</p>
            </div>
            
            <div className="flex gap-8 text-xs text-gray-400">
              <span>{safeEmail}</span>
              <span>{safeProfile.location}</span>
            </div>
            
            {renderOrderedSections(primaryColor, accentColor, 'minimalist')}
          </div>
        )}

        {selectedTemplate === 'academic' && (
          <div className="space-y-5">
            <div className="border-b-4 pb-4" style={{ borderColor: primaryColor }}>
              <h1 className="text-2xl font-bold" style={{ color: primaryColor }}>{safeProfile.name}</h1>
              <p className="text-gray-600">{safeProfile.title}</p>
              <div className="mt-2 text-sm text-gray-500">
                <p>{safeEmail} | {safeProfile.location}</p>
              </div>
            </div>
            
            {renderOrderedSections(primaryColor, accentColor, 'academic')}
          </div>
        )}
        
        {template?.category === 'premium' && (
          <div className="h-full flex flex-col items-center justify-center text-center min-h-[600px]">
            <Lock className="h-16 w-16 text-gray-300 mb-4" />
            <h2 className="text-xl font-bold text-gray-700 mb-2">Premium Template</h2>
            <p className="text-gray-500 mb-4">Upgrade to access this exclusive design</p>
            <Button className="bg-gradient-to-r from-amber-500 to-orange-500">
              <Crown className="h-4 w-4 mr-2" />
              Upgrade to Premium
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="flex h-[calc(100vh-64px)]">
        <div className="w-1/4 min-w-[280px] max-w-[320px] border-r bg-card flex flex-col">
          {/* Header */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => navigate('/student/profile')}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-lg font-bold">Resume Builder</h1>
                  <p className="text-xs text-muted-foreground">Choose a template</p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="free" className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  Free
                </TabsTrigger>
                <TabsTrigger value="premium" className="flex items-center gap-1">
                  <Crown className="h-4 w-4" />
                  Premium
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Template List */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {filteredTemplates.map((template) => (
                <Card 
                  key={template.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedTemplate === template.id 
                      ? 'ring-2 ring-primary border-primary' 
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedTemplate(template.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex gap-3">
                      {/* Mini Preview Thumbnail */}
                      <TemplateMiniPreview 
                        templateId={template.id} 
                        primaryColor={currentColor.primary}
                        accentColor={currentColor.accent}
                      />
                      
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-sm truncate">{template.name}</h3>
                          {selectedTemplate === template.id && (
                            <Check className="h-4 w-4 text-primary flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{template.description}</p>
                        <div className="flex gap-1 mt-2">
                          {savedSettings?.template === template.id && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary text-primary">Saved</Badge>
                          )}
                          {template.popular && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Popular</Badge>
                          )}
                          {template.new && (
                            <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-[10px] px-1.5 py-0">New</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>

        <div className="flex-1 bg-muted/30 overflow-auto flex flex-col">
          <div className="flex justify-between items-center p-4 border-b bg-background gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Template: <strong className="text-foreground">{templates.find(t => t.id === selectedTemplate)?.name}</strong></span>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                variant="outline"
                onClick={handleSave}
                disabled={!hasUnsavedChanges()}
                className="h-9"
              >
                <Save className="h-4 w-4 mr-2" />
                {hasUnsavedChanges() ? 'Save' : 'Saved'}
              </Button>
              <Button 
                className="bg-gradient-to-r from-primary to-orange-500 h-9"
                onClick={handleDownload}
                disabled={isDownloading}
              >
                <Download className="h-4 w-4 mr-2" />
                {isDownloading ? 'Generating...' : 'Download PDF'}
              </Button>
            </div>
          </div>
          
          <div className="flex-1 p-6 flex items-start justify-center overflow-auto">
            <div className="w-full max-w-[700px]" style={{ fontSize: `${fontSize}%` }}>
              {renderResumePreview()}
            </div>
          </div>
        </div>

        {showPropertiesPanel && (
          <div className="w-80 border-l bg-card flex-shrink-0">
            <ResumePropertiesPanel
              selectedFont={selectedFont}
              setSelectedFont={setSelectedFont}
              selectedColor={selectedColor}
              setSelectedColor={setSelectedColor}
              fontSize={fontSize}
              setFontSize={setFontSize}
              lineSpacing={lineSpacing}
              setLineSpacing={setLineSpacing}
              sectionOrder={sectionOrder}
              setSectionOrder={setSectionOrder}
              fontOptions={fontOptions}
              colorSchemes={colorSchemes}
              isCollapsed={false}
              onToggleCollapse={() => setShowPropertiesPanel(false)}
            />
          </div>
        )}
      </div>

      <Button 
        variant="default"
        size="sm"
        onClick={() => setShowPropertiesPanel(!showPropertiesPanel)}
        className={`fixed right-4 top-1/2 -translate-y-1/2 z-50 flex items-center gap-2 shadow-lg transition-all duration-200 ${
          showPropertiesPanel ? 'right-[336px]' : 'right-4'
        }`}
      >
        <Settings className="h-4 w-4" />
        Properties
      </Button>
    </div>
  );
};

export default ResumeBuilder;