import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';
import AdminSubjectCard from '@/components/common/admin/AdminSubjectCard';
import { Trophy, Pencil, Trash2, FileText, BookOpen, Plus, BarChart2, ChevronRight, ArrowLeft, Search } from 'lucide-react';
import { toast } from 'sonner';
import RoleSidebar from '@/components/common/RoleSidebar';
import RoleHeader from '@/components/common/RoleHeader';
import { useAuth } from "@/contexts/AuthContext";
import skillTestService, { SkillTest } from '@/services/skillTestService';
import subjectService, { Subject, UnitBasic } from '@/services/subjectService';
import { cn } from '@/lib/utils';

export default function InstructorSkillTest({ basePath = '/admin/skill-tests' }: { basePath?: string }) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [units, setUnits] = useState<UnitBasic[]>([]);
  const [skillTests, setSkillTests] = useState<SkillTest[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<UnitBasic | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentView, setCurrentView] = useState<'subjects' | 'units' | 'skillTests'>('subjects');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { subjectId: courseId } = useParams<{ subjectId: string }>();

  const isFaculty = ['faculty', 'hod'].includes(user?.role || '');
  const entityLabel = isFaculty ? 'Assessment' : 'Test';

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const data = await subjectService.getSubjects();
      setSubjects(data);
    } catch (err) {
      console.error('Failed to fetch subjects:', err);
      toast.error('Failed to fetch subjects');
    } finally {
      setLoading(false);
    }
  };

  const fetchSkillTestsForUnit = async (unitId: string) => {
    try {
      setLoading(true);
      const data = await skillTestService.getSkillTestsByUnit(unitId, isFaculty ? 'assessment' : undefined);
      setSkillTests(data);
    } catch (err) {
      console.error('Failed to fetch skill tests:', err);
      toast.error(`Failed to fetch ${entityLabel.toLowerCase()}s`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (courseId) {
      loadSubjectAndUnits(courseId);
    } else {
      fetchSubjects();
      setCurrentView('subjects');
      setSelectedSubject(null);
      setSelectedUnit(null);
    }
  }, [courseId]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const topicIdFromUrl = urlParams.get('topicId');
    if (topicIdFromUrl && units.length > 0 && currentView === 'units') {
      const unit = units.find(t => t.id === topicIdFromUrl);
      if (unit && (!selectedUnit || selectedUnit.id !== topicIdFromUrl)) {
        handleUnitSelect(unit);
      }
    }
  }, [units, currentView]);

  const loadSubjectAndUnits = async (subjectId: string) => {
    try {
      setLoading(true);
      const [subjectsData, unitsData] = await Promise.all([
        subjectService.getSubjects(),
        subjectService.getUnits(subjectId)
      ]);
      setSubjects(subjectsData);
      const subject = subjectsData.find(c => c.id === subjectId);
      if (subject) {
        setSelectedSubject(subject);
        setUnits(unitsData);
        setCurrentView('units');
      }
    } catch (err) {
      console.error('Failed to load subject and units:', err);
      toast.error('Failed to load subject and units');
    } finally {
      setLoading(false);
    }
  };

  const handleCourseSelect = (subject: Subject) => {
    navigate(`${basePath}/subjects/${subject.id}/manage`);
  };

  const handleUnitSelect = (unit: UnitBasic) => {
    setSelectedUnit(unit);
    setCurrentView('skillTests');
    fetchSkillTestsForUnit(unit.id);
  };

  const handleBackToSubjects = () => {
    navigate(basePath);
  };

  const handleBackToUnits = () => {
    setCurrentView('units');
    setSelectedUnit(null);
    setSkillTests([]);
  };

  const handleAddSkillTest = () => {
    if (selectedUnit) {
      navigate(`${basePath}/add?courseId=${selectedSubject?.id}&topicId=${selectedUnit.id}`);
    }
  };

  const handleDeleteSkillTest = async (id: string) => {
    try {
      await skillTestService.deleteSkillTest(id);
      toast.success(`${entityLabel} deleted successfully`);
      if (selectedUnit) {
        fetchSkillTestsForUnit(selectedUnit.id);
      }
    } catch (err) {
      toast.error(`Failed to delete ${entityLabel.toLowerCase()}`);
    }
  };

  const openEditForm = (skillTest: SkillTest) => {
    navigate(`${basePath}/${skillTest.id}/edit?courseId=${selectedSubject?.id}&topicId=${selectedUnit?.id}`);
  };

  const filteredSkillTests = skillTests.filter(skillTest =>
    skillTest.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    skillTest.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'hard': return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const subjectName = (s: Subject) => s.subject_name || s.name || 'Untitled';

  const getHeaderTitle = () => {
    switch (currentView) {
      case 'subjects': return `${entityLabel} Management`;
      case 'units': return `${subjectName(selectedSubject!)} — Units`;
      case 'skillTests': return `${selectedUnit?.name} — ${entityLabel}s`;
      default: return `${entityLabel} Management`;
    }
  };

  const getHeaderSubtitle = () => {
    switch (currentView) {
      case 'subjects': return `Select a subject to manage its ${entityLabel.toLowerCase()}s`;
      case 'units': return 'Select a unit to view and manage its tests';
      case 'skillTests': return `Manage ${entityLabel.toLowerCase()}s for ${selectedUnit?.name}`;
      default: return '';
    }
  };

  const getHeaderActions = () => {
    if (currentView === 'units' || currentView === 'skillTests') {
      return (
        <div className="flex items-center gap-3">
          {currentView === 'skillTests' && (
            <button
              onClick={handleAddSkillTest}
              className="flex items-center gap-2 bg-orange-500 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add {entityLabel}
            </button>
          )}
          <button
            onClick={handleBackToSubjects}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-300 px-4 py-2 rounded-lg hover:shadow-sm transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Subjects
          </button>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      <RoleSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <RoleHeader
          title={getHeaderTitle()}
          subtitle={getHeaderSubtitle()}
          actions={getHeaderActions()}
        />
        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">

            {/* Loading */}
            {loading && (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                <span className="ml-3 text-slate-500">Loading...</span>
              </div>
            )}

            {/* ── Subjects View ── */}
            {currentView === 'subjects' && !loading && (
              <div className="animate-fade-in">
                {subjects.length === 0 ? (
                  <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <BookOpen className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-700">No subjects found</h3>
                    <p className="mt-1 text-sm text-slate-500">No subjects available yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {subjects.map((subject) => (
                      <AdminSubjectCard
                        key={String(subject.id)}
                        subject={subject}
                        onClick={() => handleCourseSelect(subject)}
                        actionLabel="Select"
                        statsLabel="Manage Units"
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Units View ── */}
            {currentView === 'units' && !loading && (
              <div className="flex gap-6 animate-fade-in items-stretch">
                {/* Units Sidebar */}
                <div className="w-80 flex-shrink-0">
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 h-full">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-500" />
                      Units
                    </h3>
                    <div className="space-y-2">
                      {units.map((unit) => (
                        <div
                          key={unit.id}
                          onClick={() => handleUnitSelect(unit)}
                          className="p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all duration-200 group flex items-center justify-between"
                        >
                          <span className="font-medium text-gray-900 group-hover:text-blue-700 text-sm truncate">{unit.name}</span>
                          <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-blue-500 flex-shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Welcome */}
                <div className="flex-1">
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center h-full flex flex-col items-center justify-center">
                    <Trophy className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Unit</h3>
                    <p className="text-sm text-gray-500 max-w-sm mx-auto">
                      Choose a unit from the left sidebar to view and manage its {entityLabel.toLowerCase()}s.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ── Skill Tests View ── */}
            {currentView === 'skillTests' && !loading && (
              <div className="flex gap-6 animate-fade-in items-stretch">
                {/* Units Sidebar */}
                <div className="w-80 flex-shrink-0 flex flex-col">
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 flex-1 flex flex-col">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-500" />
                      Units
                    </h3>
                    <div className="space-y-2">
                      {units.map((unit) => (
                        <div
                          key={unit.id}
                          onClick={() => handleUnitSelect(unit)}
                          className={cn(
                            "p-3 rounded-lg border cursor-pointer transition-all duration-200 flex items-center justify-between",
                            selectedUnit?.id === unit.id
                              ? "border-blue-300 bg-blue-50 text-blue-700"
                              : "border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                          )}
                        >
                          <span className={cn("font-medium text-sm truncate", selectedUnit?.id === unit.id ? "text-blue-700" : "text-gray-900")}>
                            {unit.name}
                          </span>
                          <ChevronRight className={cn("h-4 w-4 flex-shrink-0", selectedUnit?.id === unit.id ? "text-blue-500" : "text-gray-300")} />
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <button
                        onClick={handleBackToUnits}
                        className="w-full text-center px-4 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-all"
                      >
                        Clear Selection
                      </button>
                    </div>
                  </div>
                </div>

                {/* Skill Tests Content */}
                <div className="flex-1 min-w-0">
                  {/* Search */}
                  <div className="mb-5 relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search tests..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>

                  {/* DataTable */}
                  <DataTable
                    title={`${selectedUnit?.name} - ${entityLabel}s`}
                    description={`${filteredSkillTests.length} ${entityLabel.toLowerCase()}(s) found`}
                    data={filteredSkillTests}
                    columns={[
                      {
                        header: 'Title',
                        accessorKey: 'title',
                        className: 'font-medium'
                      },
                      {
                        header: 'Difficulty',
                        cell: (skillTest) => (
                          <Badge className={cn(getDifficultyColor(skillTest.difficulty), 'capitalize')} variant="outline">
                            {skillTest.difficulty}
                          </Badge>
                        )
                      },
                      {
                        header: 'Duration',
                        cell: (skillTest) => `${skillTest.duration} min`
                      },
                      {
                        header: 'Status',
                        cell: (skillTest) => <StatusBadge status={skillTest.publish_status} />
                      },
                      {
                        header: 'Participants',
                        accessorKey: 'participants_count'
                      },
                      {
                        header: 'Actions',
                        cell: (skillTest) => (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => navigate(`${basePath}/${skillTest.id}/analytics`)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                              title="Analytics"
                            >
                              <BarChart2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openEditForm(skillTest)}
                              className="p-2 text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteSkillTest(skillTest.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ),
                        className: 'text-right'
                      }
                    ]}
                    keyExtractor={(item) => item.id}
                    emptyState={{
                      message: `No ${entityLabel}s Found`,
                      subMessage: searchQuery
                        ? `No ${entityLabel.toLowerCase()}s match "${searchQuery}"`
                        : `No ${entityLabel.toLowerCase()}s found for this unit. Create your first ${entityLabel.toLowerCase()} to get started.`
                    }}
                  />
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}