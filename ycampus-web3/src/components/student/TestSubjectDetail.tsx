import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, CheckCircle, Play, BarChart3, ArrowLeft, ChevronRight } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import TestInterface from '@/components/student/TestInterface';
import TestInstructions from '@/components/student/TestInstructions';
import TestResultsScreen from '@/components/student/TestResultsScreen';
import TestThankYou from '@/components/student/TestThankYou';

interface Topic {
  id: string;
  name: string;
  duration: number;
  questions: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

interface Problem {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  duration: number;
  questions: number;
  color: string;
  description: string;
  unitId: string;
}

interface Unit {
  id: string;
  name: string;
  shortName: string;
  topics: string[];
  progress: number;
}

interface Course {
  id: string;
  name: string;
  description: string;
  color: string;
  topics: Topic[];
}

// Units data for Matrices and Calculus
const unitsData: Record<string, Unit[]> = {
  'matrices-calculus': [
    {
      id: 'unit1',
      name: 'Unit I',
      shortName: 'UI',
      topics: ['Matrices', 'Rank', 'Inverse', 'System of linear equations', 'Gauss elimination', 'Gauss-Seidel method'],
      progress: 45,
    },
    {
      id: 'unit2',
      name: 'Unit II',
      shortName: 'UII',
      topics: ['Eigenvalues & Eigenvectors', 'Linear and Orthogonal transformations', 'Diagonalization', 'Cayley-Hamilton theorem', 'Quadratic forms & canonical forms'],
      progress: 60,
    },
    {
      id: 'unit3',
      name: 'Unit III',
      shortName: 'UIII',
      topics: ['Mean Value Theorems (Rolle\'s, Lagrange, Cauchy)', 'Taylor series', 'Definite integrals', 'Applications (surface area, volume of revolution)', 'Improper integrals', 'Beta & Gamma functions'],
      progress: 30,
    },
    {
      id: 'unit4',
      name: 'Unit IV',
      shortName: 'UIV',
      topics: ['Partial differentiation', 'Total derivative', 'Jacobian', 'Functional dependence/independence', 'Maxima & minima of functions', 'Lagrange multipliers'],
      progress: 20,
    },
    {
      id: 'unit5',
      name: 'Unit V',
      shortName: 'UV',
      topics: ['Multiple integrals (double / triple integrals)', 'Applications of multiple integrals'],
      progress: 75,
    },
  ],
  'physics': [
    {
      id: 'unit1',
      name: 'Unit I',
      shortName: 'UI',
      topics: ['Mechanics Fundamentals', 'Newton\'s Laws', 'Motion'],
      progress: 50,
    },
    {
      id: 'unit2',
      name: 'Unit II',
      shortName: 'UII',
      topics: ['Thermodynamics', 'Heat Transfer', 'Energy'],
      progress: 40,
    },
    {
      id: 'unit3',
      name: 'Unit III',
      shortName: 'UIII',
      topics: ['Wave Optics', 'Interference', 'Diffraction'],
      progress: 35,
    },
    {
      id: 'unit4',
      name: 'Unit IV',
      shortName: 'UIV',
      topics: ['Electromagnetism', 'Fields', 'Circuits'],
      progress: 55,
    },
    {
      id: 'unit5',
      name: 'Unit V',
      shortName: 'UV',
      topics: ['Quantum Physics', 'Modern Physics'],
      progress: 25,
    },
  ],
  'programming': [
    {
      id: 'unit1',
      name: 'Unit I',
      shortName: 'UI',
      topics: ['Programming Basics', 'Variables', 'Data Types'],
      progress: 70,
    },
    {
      id: 'unit2',
      name: 'Unit II',
      shortName: 'UII',
      topics: ['Control Structures', 'Loops', 'Conditionals'],
      progress: 65,
    },
    {
      id: 'unit3',
      name: 'Unit III',
      shortName: 'UIII',
      topics: ['Functions', 'Recursion', 'Scope'],
      progress: 45,
    },
    {
      id: 'unit4',
      name: 'Unit IV',
      shortName: 'UIV',
      topics: ['Data Structures', 'Arrays', 'Linked Lists'],
      progress: 50,
    },
    {
      id: 'unit5',
      name: 'Unit V',
      shortName: 'UV',
      topics: ['Algorithm Design', 'Complexity Analysis'],
      progress: 30,
    },
  ],
  'electrical': [
    {
      id: 'unit1',
      name: 'Unit I',
      shortName: 'UI',
      topics: ['Circuit Analysis', 'Kirchhoff\'s Laws'],
      progress: 60,
    },
    {
      id: 'unit2',
      name: 'Unit II',
      shortName: 'UII',
      topics: ['AC Circuits', 'Phasors', 'Impedance'],
      progress: 45,
    },
    {
      id: 'unit3',
      name: 'Unit III',
      shortName: 'UIII',
      topics: ['Network Theorems', 'Thevenin', 'Norton'],
      progress: 40,
    },
    {
      id: 'unit4',
      name: 'Unit IV',
      shortName: 'UIV',
      topics: ['Transformers', 'Machines', 'Motors'],
      progress: 35,
    },
    {
      id: 'unit5',
      name: 'Unit V',
      shortName: 'UV',
      topics: ['Power Systems', 'Distribution'],
      progress: 55,
    },
  ],
  'drawing': [
    {
      id: 'unit1',
      name: 'Unit I',
      shortName: 'UI',
      topics: ['Orthographic Projections', 'Basic Techniques'],
      progress: 50,
    },
    {
      id: 'unit2',
      name: 'Unit II',
      shortName: 'UII',
      topics: ['Isometric Drawing', '3D Representation'],
      progress: 45,
    },
    {
      id: 'unit3',
      name: 'Unit III',
      shortName: 'UIII',
      topics: ['CAD Fundamentals', 'Computer-aided Design'],
      progress: 60,
    },
    {
      id: 'unit4',
      name: 'Unit IV',
      shortName: 'UIV',
      topics: ['Sectional Views', 'Assembly Drawings'],
      progress: 40,
    },
    {
      id: 'unit5',
      name: 'Unit V',
      shortName: 'UV',
      topics: ['Advanced CAD', '3D Modeling'],
      progress: 35,
    },
  ],
};

// Subject problems data organized by unit
const subjectProblems: Record<string, Problem[]> = {
  'matrices-calculus': [
    // Unit I - 5 questions (2 Easy, 2 Medium, 1 Hard)
    {
      id: 'mc1-u1',
      title: 'Matrix Operations',
      difficulty: 'Easy',
      duration: 20,
      questions: 5,
      color: 'from-[hsl(var(--success))] to-[hsl(var(--success-dark))]',
      description: 'Basic matrix operations and transformations',
      unitId: 'unit1'
    },
    {
      id: 'mc2-u1',
      title: 'System of Linear Equations',
      difficulty: 'Easy',
      duration: 25,
      questions: 5,
      color: 'from-[hsl(var(--success))] to-[hsl(var(--success-dark))]',
      description: 'Solving linear equations using various methods',
      unitId: 'unit1'
    },
    {
      id: 'mc3-u1',
      title: 'Rank and Inverse',
      difficulty: 'Medium',
      duration: 30,
      questions: 6,
      color: 'from-[hsl(var(--saffron))] to-[hsl(var(--saffron-dark))]',
      description: 'Determining rank and finding inverse of matrices',
      unitId: 'unit1'
    },
    {
      id: 'mc4-u1',
      title: 'Gauss Elimination',
      difficulty: 'Medium',
      duration: 35,
      questions: 6,
      color: 'from-[hsl(var(--saffron))] to-[hsl(var(--saffron-dark))]',
      description: 'Solving systems using Gauss elimination method',
      unitId: 'unit1'
    },
    {
      id: 'mc5-u1',
      title: 'Gauss-Seidel Method',
      difficulty: 'Hard',
      duration: 45,
      questions: 8,
      color: 'from-red-400 to-rose-500',
      description: 'Advanced iterative method for linear systems',
      unitId: 'unit1'
    },
    // Unit II - 5 questions
    {
      id: 'mc1-u2',
      title: 'Eigenvalues & Eigenvectors',
      difficulty: 'Easy',
      duration: 25,
      questions: 5,
      color: 'from-[hsl(var(--success))] to-[hsl(var(--success-dark))]',
      description: 'Finding eigenvalues and eigenvectors',
      unitId: 'unit2'
    },
    {
      id: 'mc2-u2',
      title: 'Linear Transformations',
      difficulty: 'Easy',
      duration: 20,
      questions: 5,
      color: 'from-[hsl(var(--success))] to-[hsl(var(--success-dark))]',
      description: 'Understanding linear and orthogonal transformations',
      unitId: 'unit2'
    },
    {
      id: 'mc3-u2',
      title: 'Diagonalization',
      difficulty: 'Medium',
      duration: 35,
      questions: 6,
      color: 'from-[hsl(var(--saffron))] to-[hsl(var(--saffron-dark))]',
      description: 'Diagonalizing matrices',
      unitId: 'unit2'
    },
    {
      id: 'mc4-u2',
      title: 'Cayley-Hamilton Theorem',
      difficulty: 'Medium',
      duration: 30,
      questions: 6,
      color: 'from-[hsl(var(--saffron))] to-[hsl(var(--saffron-dark))]',
      description: 'Applications of Cayley-Hamilton theorem',
      unitId: 'unit2'
    },
    {
      id: 'mc5-u2',
      title: 'Quadratic Forms',
      difficulty: 'Hard',
      duration: 40,
      questions: 8,
      color: 'from-red-400 to-rose-500',
      description: 'Canonical forms and quadratic forms',
      unitId: 'unit2'
    },
    // Unit III - 5 questions
    {
      id: 'mc1-u3',
      title: 'Mean Value Theorems',
      difficulty: 'Easy',
      duration: 25,
      questions: 5,
      color: 'from-[hsl(var(--success))] to-[hsl(var(--success-dark))]',
      description: 'Rolle\'s, Lagrange, and Cauchy theorems',
      unitId: 'unit3'
    },
    {
      id: 'mc2-u3',
      title: 'Taylor Series',
      difficulty: 'Easy',
      duration: 20,
      questions: 5,
      color: 'from-[hsl(var(--success))] to-[hsl(var(--success-dark))]',
      description: 'Series expansions and approximations',
      unitId: 'unit3'
    },
    {
      id: 'mc3-u3',
      title: 'Definite Integrals',
      difficulty: 'Medium',
      duration: 30,
      questions: 6,
      color: 'from-[hsl(var(--saffron))] to-[hsl(var(--saffron-dark))]',
      description: 'Evaluation of definite integrals',
      unitId: 'unit3'
    },
    {
      id: 'mc4-u3',
      title: 'Applications of Integrals',
      difficulty: 'Medium',
      duration: 35,
      questions: 6,
      color: 'from-[hsl(var(--saffron))] to-[hsl(var(--saffron-dark))]',
      description: 'Surface area and volume calculations',
      unitId: 'unit3'
    },
    {
      id: 'mc5-u3',
      title: 'Beta & Gamma Functions',
      difficulty: 'Hard',
      duration: 45,
      questions: 8,
      color: 'from-red-400 to-rose-500',
      description: 'Special functions and their properties',
      unitId: 'unit3'
    },
    // Unit IV - 5 questions
    {
      id: 'mc1-u4',
      title: 'Partial Differentiation',
      difficulty: 'Easy',
      duration: 20,
      questions: 5,
      color: 'from-[hsl(var(--success))] to-[hsl(var(--success-dark))]',
      description: 'Basic partial derivatives',
      unitId: 'unit4'
    },
    {
      id: 'mc2-u4',
      title: 'Total Derivative',
      difficulty: 'Easy',
      duration: 25,
      questions: 5,
      color: 'from-[hsl(var(--success))] to-[hsl(var(--success-dark))]',
      description: 'Computing total derivatives',
      unitId: 'unit4'
    },
    {
      id: 'mc3-u4',
      title: 'Jacobian',
      difficulty: 'Medium',
      duration: 30,
      questions: 6,
      color: 'from-[hsl(var(--saffron))] to-[hsl(var(--saffron-dark))]',
      description: 'Jacobian determinants and applications',
      unitId: 'unit4'
    },
    {
      id: 'mc4-u4',
      title: 'Functional Dependence',
      difficulty: 'Medium',
      duration: 35,
      questions: 6,
      color: 'from-[hsl(var(--saffron))] to-[hsl(var(--saffron-dark))]',
      description: 'Testing functional dependence and independence',
      unitId: 'unit4'
    },
    {
      id: 'mc5-u4',
      title: 'Lagrange Multipliers',
      difficulty: 'Hard',
      duration: 40,
      questions: 8,
      color: 'from-red-400 to-rose-500',
      description: 'Constrained optimization problems',
      unitId: 'unit4'
    },
    // Unit V - 5 questions
    {
      id: 'mc1-u5',
      title: 'Double Integrals',
      difficulty: 'Easy',
      duration: 25,
      questions: 5,
      color: 'from-[hsl(var(--success))] to-[hsl(var(--success-dark))]',
      description: 'Evaluating double integrals',
      unitId: 'unit5'
    },
    {
      id: 'mc2-u5',
      title: 'Triple Integrals',
      difficulty: 'Easy',
      duration: 30,
      questions: 5,
      color: 'from-[hsl(var(--success))] to-[hsl(var(--success-dark))]',
      description: 'Computing triple integrals',
      unitId: 'unit5'
    },
    {
      id: 'mc3-u5',
      title: 'Change of Variables',
      difficulty: 'Medium',
      duration: 35,
      questions: 6,
      color: 'from-[hsl(var(--saffron))] to-[hsl(var(--saffron-dark))]',
      description: 'Coordinate transformations in multiple integrals',
      unitId: 'unit5'
    },
    {
      id: 'mc4-u5',
      title: 'Applications - Area & Volume',
      difficulty: 'Medium',
      duration: 30,
      questions: 6,
      color: 'from-[hsl(var(--saffron))] to-[hsl(var(--saffron-dark))]',
      description: 'Using multiple integrals for area and volume',
      unitId: 'unit5'
    },
    {
      id: 'mc5-u5',
      title: 'Advanced Multiple Integrals',
      difficulty: 'Hard',
      duration: 45,
      questions: 8,
      color: 'from-red-400 to-rose-500',
      description: 'Complex problems in multiple integration',
      unitId: 'unit5'
    },
  ],
  'physics': [
    {
      id: 'ph1-u1',
      title: 'Newton\'s Laws',
      difficulty: 'Easy',
      duration: 20,
      questions: 5,
      color: 'from-green-400 to-emerald-500',
      description: 'Fundamental laws of motion',
      unitId: 'unit1'
    },
    {
      id: 'ph2-u1',
      title: 'Kinematics',
      difficulty: 'Easy',
      duration: 25,
      questions: 5,
      color: 'from-green-400 to-emerald-500',
      description: 'Motion in one and two dimensions',
      unitId: 'unit1'
    },
    {
      id: 'ph3-u1',
      title: 'Dynamics',
      difficulty: 'Medium',
      duration: 30,
      questions: 6,
      color: 'from-blue-400 to-cyan-500',
      description: 'Forces and equilibrium',
      unitId: 'unit1'
    },
    {
      id: 'ph4-u1',
      title: 'Work & Energy',
      difficulty: 'Medium',
      duration: 35,
      questions: 6,
      color: 'from-blue-400 to-cyan-500',
      description: 'Energy conservation principles',
      unitId: 'unit1'
    },
    {
      id: 'ph5-u1',
      title: 'Rotational Motion',
      difficulty: 'Hard',
      duration: 40,
      questions: 8,
      color: 'from-red-400 to-rose-500',
      description: 'Angular momentum and rotation',
      unitId: 'unit1'
    },
  ],
  'programming': [
    {
      id: 'pr1-u1',
      title: 'Variables & Data Types',
      difficulty: 'Easy',
      duration: 20,
      questions: 5,
      color: 'from-green-400 to-emerald-500',
      description: 'Basic programming concepts',
      unitId: 'unit1'
    },
    {
      id: 'pr2-u1',
      title: 'Operators',
      difficulty: 'Easy',
      duration: 25,
      questions: 5,
      color: 'from-green-400 to-emerald-500',
      description: 'Arithmetic and logical operators',
      unitId: 'unit1'
    },
    {
      id: 'pr3-u1',
      title: 'Input/Output',
      difficulty: 'Medium',
      duration: 30,
      questions: 6,
      color: 'from-blue-400 to-cyan-500',
      description: 'Console I/O operations',
      unitId: 'unit1'
    },
    {
      id: 'pr4-u1',
      title: 'Type Conversion',
      difficulty: 'Medium',
      duration: 30,
      questions: 6,
      color: 'from-blue-400 to-cyan-500',
      description: 'Type casting and conversion',
      unitId: 'unit1'
    },
    {
      id: 'pr5-u1',
      title: 'Basic Programs',
      difficulty: 'Hard',
      duration: 45,
      questions: 8,
      color: 'from-red-400 to-rose-500',
      description: 'Writing complete programs',
      unitId: 'unit1'
    },
  ],
  'electrical': [
    {
      id: 'el1-u1',
      title: 'Ohm\'s Law',
      difficulty: 'Easy',
      duration: 20,
      questions: 5,
      color: 'from-green-400 to-emerald-500',
      description: 'Basic circuit principles',
      unitId: 'unit1'
    },
    {
      id: 'el2-u1',
      title: 'Series Circuits',
      difficulty: 'Easy',
      duration: 25,
      questions: 5,
      color: 'from-green-400 to-emerald-500',
      description: 'Analyzing series connections',
      unitId: 'unit1'
    },
    {
      id: 'el3-u1',
      title: 'Parallel Circuits',
      difficulty: 'Medium',
      duration: 30,
      questions: 6,
      color: 'from-blue-400 to-cyan-500',
      description: 'Parallel circuit analysis',
      unitId: 'unit1'
    },
    {
      id: 'el4-u1',
      title: 'Kirchhoff\'s Laws',
      difficulty: 'Medium',
      duration: 35,
      questions: 6,
      color: 'from-blue-400 to-cyan-500',
      description: 'KVL and KCL applications',
      unitId: 'unit1'
    },
    {
      id: 'el5-u1',
      title: 'Complex Circuits',
      difficulty: 'Hard',
      duration: 45,
      questions: 8,
      color: 'from-red-400 to-rose-500',
      description: 'Multi-loop circuit analysis',
      unitId: 'unit1'
    },
  ],
  'drawing': [
    {
      id: 'dr1-u1',
      title: 'Projection Basics',
      difficulty: 'Easy',
      duration: 25,
      questions: 5,
      color: 'from-green-400 to-emerald-500',
      description: 'Introduction to projections',
      unitId: 'unit1'
    },
    {
      id: 'dr2-u1',
      title: 'Orthographic Views',
      difficulty: 'Easy',
      duration: 30,
      questions: 5,
      color: 'from-green-400 to-emerald-500',
      description: 'Multiple view drawings',
      unitId: 'unit1'
    },
    {
      id: 'dr3-u1',
      title: 'Dimensioning',
      difficulty: 'Medium',
      duration: 35,
      questions: 6,
      color: 'from-blue-400 to-cyan-500',
      description: 'Adding dimensions to drawings',
      unitId: 'unit1'
    },
    {
      id: 'dr4-u1',
      title: 'Hidden Lines',
      difficulty: 'Medium',
      duration: 30,
      questions: 6,
      color: 'from-blue-400 to-cyan-500',
      description: 'Representing hidden features',
      unitId: 'unit1'
    },
    {
      id: 'dr5-u1',
      title: 'Complex Objects',
      difficulty: 'Hard',
      duration: 45,
      questions: 8,
      color: 'from-red-400 to-rose-500',
      description: 'Advanced orthographic projections',
      unitId: 'unit1'
    },
  ]
};

const UnitSidebar = ({ 
  units, 
  selectedUnit, 
  onUnitSelect,
  subjectName
}: { 
  units: Unit[]; 
  selectedUnit: string | null; 
  onUnitSelect: (unitId: string) => void;
  subjectName: string;
}) => {
  const { open } = useSidebar();

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarContent className="sidebar-scrollbar">
        {open && (
          <div className="px-4 py-6 border-b">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[hsl(var(--saffron))] to-[hsl(var(--saffron-dark))] flex items-center justify-center">
                <span className="text-white text-lg font-bold">📚</span>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-base truncate">{subjectName}</h2>
                <p className="text-xs text-muted-foreground">{units.length} Units</p>
              </div>
            </div>
          </div>
        )}
        
        <div className="px-4 py-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {open ? 'TOPICS' : ''}
          </h3>
        </div>
        
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {units.map((unit) => (
                <SidebarMenuItem key={unit.id}>
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton
                          onClick={() => onUnitSelect(unit.id)}
                          isActive={selectedUnit === unit.id}
                          className="h-auto py-3"
                        >
                          <div className="flex flex-col gap-2 w-full">
                            <div className="flex items-center justify-between w-full">
                              <span className="font-medium text-base">
                                {open ? unit.name : unit.shortName}
                              </span>
                              {open && selectedUnit === unit.id && (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </div>
                            {open && (
                              <div className="w-full space-y-1">
                                <Progress value={unit.progress} className="h-2" />
                                <span className="text-xs text-muted-foreground">
                                  {unit.progress}% Complete
                                </span>
                              </div>
                            )}
                          </div>
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        <div className="space-y-2">
                          <p className="font-semibold">{unit.name}</p>
                          {!open && (
                            <p className="text-xs text-muted-foreground">{unit.progress}% Complete</p>
                          )}
                          <ul className="text-xs space-y-1">
                            {unit.topics.map((topic, idx) => (
                              <li key={idx}>• {topic}</li>
                            ))}
                          </ul>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

const TestSubjectDetail = () => {
  const { subject } = useParams<{ subject: string }>();
  const navigate = useNavigate();
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showTest, setShowTest] = useState(false);
  const [completedTests, setCompletedTests] = useState<Set<string>>(new Set());
  const [showResults, setShowResults] = useState(false);
  const [selectedTestForResults, setSelectedTestForResults] = useState<Problem | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [showThankYou, setShowThankYou] = useState(false);
  const [testStats, setTestStats] = useState<{
    answeredCount: number;
    totalQuestions: number;
    timeSpent: number;
  } | null>(null);

  const subjectName = subject || 'matrices-calculus';
  const allProblems = subjectProblems[subjectName] || [];
  const units = unitsData[subjectName] || [];

  // Initialize with first unit
  React.useEffect(() => {
    if (units.length > 0 && !selectedUnit) {
      setSelectedUnit(units[0].id);
    }
  }, [units, selectedUnit]);

  // Filter problems by selected unit
  const problems = selectedUnit 
    ? allProblems.filter(p => p.unitId === selectedUnit)
    : [];

  // Map subject IDs to display names
  const subjectDisplayNames: Record<string, string> = {
    'matrices-calculus': 'Matrices and Calculus',
    'physics': 'Advanced Engineering Physics',
    'programming': 'Programming for Problem Solving',
    'electrical': 'Basic Electrical Engineering',
    'drawing': 'Engineering Drawing & CAD'
  };

  const displayName = subjectDisplayNames[subjectName] || subjectName;

  const handleBackToTest = () => {
    navigate('/student/test');
  };

  const handleTopicSelect = (topic: Topic) => {
    setSelectedTopic(topic);
    setShowInstructions(true);
  };

  const handleStartTest = () => {
    setShowInstructions(false);
    setShowTest(true);
  };

  const handleTestComplete = (stats: { answeredCount: number; totalQuestions: number; timeSpent: number }) => {
    if (selectedTopic) {
      setCompletedTests(prev => new Set([...prev, selectedTopic.id]));
    }
    setTestStats(stats);
    setShowTest(false);
    setShowThankYou(true);
  };

  const handleThankYouComplete = () => {
    setShowThankYou(false);
    setSelectedTopic(null);
    setTestStats(null);
  };

  const handleViewResults = (problem: Problem) => {
    setSelectedTestForResults(problem);
    setShowResults(true);
  };

  const handleBackToTests = () => {
    setShowResults(false);
    setSelectedTestForResults(null);
  };

  const handleTryAgain = () => {
    if (selectedTestForResults) {
      setCompletedTests(prev => {
        const newSet = new Set(prev);
        newSet.delete(selectedTestForResults.id);
        return newSet;
      });
      setShowResults(false);
      setSelectedTestForResults(null);
    }
  };

  const handleBackToCourses = () => {
    setSelectedTopic(null);
    setShowInstructions(false);
    setShowTest(false);
  };

  if (showThankYou && selectedTopic && testStats) {
    return (
      <TestThankYou
        topic={selectedTopic}
        answeredCount={testStats.answeredCount}
        totalQuestions={testStats.totalQuestions}
        timeSpent={testStats.timeSpent}
        onBackToTests={handleThankYouComplete}
      />
    );
  }

  if (showResults && selectedTestForResults) {
    return (
      <TestResultsScreen
        testName={selectedTestForResults.title}
        subject={subjectName}
        difficulty={selectedTestForResults.difficulty}
        totalQuestions={selectedTestForResults.questions}
        timeTaken={selectedTestForResults.duration * 60}
        onTryAgain={handleTryAgain}
        onBackToTests={handleBackToTests}
      />
    );
  }

  if (showTest && selectedTopic) {
    return (
      <TestInterface
        topic={selectedTopic}
        course={{ id: subjectName, name: subjectName } as Course}
        onComplete={handleTestComplete}
        onBack={handleBackToCourses}
      />
    );
  }

  if (showInstructions && selectedTopic) {
    return (
      <TestInstructions
        topic={selectedTopic}
        course={{ id: subjectName, name: subjectName } as Course}
        onStart={handleStartTest}
        onBack={() => {
          setShowInstructions(false);
          setSelectedTopic(null);
        }}
      />
    );
  }

  const currentUnit = units.find(u => u.id === selectedUnit);

  return (
    <SidebarProvider defaultOpen>
      <div className="min-h-screen flex w-full bg-background">
        <UnitSidebar
          units={units}
          selectedUnit={selectedUnit}
          onUnitSelect={setSelectedUnit}
          subjectName={displayName}
        />

        <div className="flex-1 flex flex-col">
          <div className="border-b border-border bg-background sticky top-0 z-50">
            <div className="flex items-center h-16 px-6 gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBackToTest}
                className="shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1">
                <h1 className="text-xl font-semibold">
                  {displayName} - {currentUnit?.name || 'Select a Unit'}
                </h1>
              </div>
            </div>
          </div>

          <div className="flex-1 p-6">
            {problems.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {problems.map((problem, index) => {
                  // India tri-color theme: Saffron (0-1), Chakra Navy Blue (2-3), Green (4)
                  const getTriColorGradient = () => {
                    if (index <= 1) return 'from-[hsl(var(--saffron-dark))] to-[hsl(var(--saffron))]';
                    if (index <= 3) return 'from-[hsl(var(--chakra-dark))] to-[hsl(var(--chakra))]';
                    return 'from-[hsl(var(--success-dark))] to-[hsl(var(--success))]';
                  };

                  return (
                  <Card 
                    key={problem.id} 
                    className="cursor-pointer hover:shadow-lg transition-all duration-300 group overflow-hidden"
                  >
                    <div className={`h-2 bg-gradient-to-r ${getTriColorGradient()}`} />
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <CardTitle className="group-hover:text-primary transition-colors text-lg">
                          {problem.title}
                        </CardTitle>
                        <Badge variant={
                          problem.difficulty === 'Easy' ? 'secondary' : 
                          problem.difficulty === 'Medium' ? 'default' : 'destructive'
                        }>
                          {problem.difficulty}
                        </Badge>
                      </div>
                      <CardDescription>{problem.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {problem.duration} min
                          </div>
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-4 w-4" />
                            {problem.questions} questions
                          </div>
                        </div>

                        <Button 
                          className={`w-full bg-gradient-to-r ${getTriColorGradient()} hover:opacity-90 border-0 text-white`}
                          onClick={() => {
                            const topicData: Topic = {
                              id: problem.id,
                              name: problem.title,
                              duration: problem.duration,
                              questions: problem.questions,
                              difficulty: problem.difficulty
                            };
                            
                            if (completedTests.has(problem.id)) {
                              handleViewResults(problem);
                            } else {
                              handleTopicSelect(topicData);
                            }
                          }}
                        >
                          {completedTests.has(problem.id) ? (
                            <>
                              <BarChart3 className="mr-2 h-4 w-4" />
                              View Results
                            </>
                          ) : (
                            <>
                              <Play className="mr-2 h-4 w-4" />
                              Start Test
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">Select a unit to view practice tests</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default TestSubjectDetail;
