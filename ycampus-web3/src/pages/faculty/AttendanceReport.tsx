import React, { useState } from 'react';
import FacultyLayout from '@/components/layouts/FacultyLayout';
import { useAttendanceReport } from '@/hooks/useAttendanceReport';
import { useToast } from '@/hooks/use-toast';
import AttendanceFilters from '@/components/faculty/attendance-report/AttendanceFilters';
import AttendanceSummaryCards from '@/components/faculty/attendance-report/AttendanceSummaryCards';
import StudentAttendanceTable from '@/components/faculty/attendance-report/StudentAttendanceTable';
import StudentAttendanceDetail from '@/components/faculty/attendance-report/StudentAttendanceDetail';
import { downloadAttendancePDF, downloadBulkAttendanceExcel } from '@/components/faculty/attendance-report/AttendanceReportExporter';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, FileText, Loader2, CalendarCheck } from 'lucide-react';

const AttendanceReport: React.FC = () => {
  const { toast } = useToast();
  const report = useAttendanceReport();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'percent' | 'absent'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const filteredRows = report.studentRows
    .filter(r =>
      r.studentName.toLowerCase().includes(search.toLowerCase()) ||
      r.rollNo.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = a.studentName.localeCompare(b.studentName);
      else if (sortBy === 'percent') cmp = a.attendancePercent - b.attendancePercent;
      else cmp = a.absent - b.absent;
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pagedRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (col: 'name' | 'percent' | 'absent') => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };

  const deptName = report.departments.find(d => d.id === report.selectedDept)?.name || '';
  const batchName = report.batches.find(b => b.id === report.selectedBatch)?.name || '';
  const subjectName = report.selectedSubject === 'all' ? 'All Subjects' : (report.courses.find(c => c.id === report.selectedSubject)?.name || '');
  const dateRangeStr = report.dateRange.from && report.dateRange.to
    ? `${report.dateRange.from.toLocaleDateString()} - ${report.dateRange.to.toLocaleDateString()}`
    : 'Full Semester';

  const handleDownloadPDF = () => {
    if (!report.studentDetail) return;
    downloadAttendancePDF(report.studentDetail, {
      department: deptName, semester: report.selectedSemester,
      batch: batchName, section: report.selectedSection, dateRange: dateRangeStr,
    });
    toast({ title: 'PDF Downloaded', description: 'Attendance report has been downloaded.' });
  };

  const handleDownloadExcel = () => {
    downloadBulkAttendanceExcel(filteredRows, report.sectionSummary, {
      department: deptName, semester: report.selectedSemester,
      batch: batchName, section: report.selectedSection, subject: subjectName, dateRange: dateRangeStr,
    });
    toast({ title: 'Excel Downloaded', description: 'Bulk attendance report exported.' });
  };

  return (
    <FacultyLayout>
      <div className="space-y-5 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Attendance Report</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Analyze attendance department-wise, section-wise, and student-wise
            </p>
          </div>
          <div className="flex gap-2">
            {report.studentDetail && (
              <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
                <FileText className="h-4 w-4 mr-1.5" />PDF
              </Button>
            )}
            {report.studentRows.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleDownloadExcel}>
                <FileSpreadsheet className="h-4 w-4 mr-1.5" />Excel
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <AttendanceFilters
          departments={report.departments}
          batches={report.batches}
          sections={report.sections}
          courses={report.courses}
          selectedDept={report.selectedDept}
          selectedSemester={report.selectedSemester}
          selectedBatch={report.selectedBatch}
          selectedSection={report.selectedSection}
          selectedSubject={report.selectedSubject}
          dateRange={report.dateRange}
          filtersLoading={report.filtersLoading}
          onDeptChange={v => { report.setSelectedDept(v); report.setSelectedSemester(''); report.setSelectedBatch(''); report.setSelectedSection(''); report.clearStudentDetail(); }}
          onSemesterChange={v => { report.setSelectedSemester(v); report.setSelectedSection(''); report.clearStudentDetail(); }}
          onBatchChange={v => { report.setSelectedBatch(v); report.clearStudentDetail(); }}
          onSectionChange={v => { report.setSelectedSection(v); report.clearStudentDetail(); }}
          onSubjectChange={v => { report.setSelectedSubject(v); report.clearStudentDetail(); }}
          onDateRangeChange={report.setDateRange}
        />

        {/* Loading */}
        {report.loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading attendance data...</span>
          </div>
        )}

        {/* Empty state */}
        {!report.loading && !report.sectionSummary && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <CalendarCheck className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground">Select filters to view attendance</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Choose a department, semester, and section above to see attendance data.
            </p>
          </div>
        )}

        {/* Student Detail View */}
        {!report.loading && report.studentDetail && (
          <StudentAttendanceDetail
            detail={report.studentDetail}
            onBack={report.clearStudentDetail}
            onDownloadPDF={handleDownloadPDF}
          />
        )}

        {/* Summary + Table */}
        {!report.loading && report.sectionSummary && !report.studentDetail && (
          <div className="space-y-5">
            <AttendanceSummaryCards summary={report.sectionSummary} />
            <StudentAttendanceTable
              rows={pagedRows}
              search={search}
              onSearchChange={setSearch}
              sortBy={sortBy}
              sortDir={sortDir}
              onSort={handleSort}
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              onStudentClick={(id) => report.loadStudentDetail(id)}
            />
          </div>
        )}
      </div>
    </FacultyLayout>
  );
};

export default AttendanceReport;
