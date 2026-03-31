import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { StudentDetail, StudentAttendanceRow, SectionSummary } from '@/hooks/useAttendanceReport';

export function downloadAttendancePDF(
  detail: StudentDetail,
  filters: { department: string; semester: string; batch: string; section: string; dateRange: string }
) {
  const doc = new jsPDF();
  const now = new Date().toLocaleString();

  doc.setFontSize(16);
  doc.text('Student Attendance Report', 14, 20);
  doc.setFontSize(10);
  doc.text(`Generated: ${now}`, 14, 27);

  doc.setFontSize(12);
  doc.text(`${detail.studentName} (${detail.rollNo})`, 14, 38);
  doc.setFontSize(10);
  doc.text(`Department: ${filters.department} | Semester: ${filters.semester} | Section: ${filters.section}`, 14, 44);
  if (filters.batch) doc.text(`Batch: ${filters.batch}`, 14, 50);
  doc.text(`Date Range: ${filters.dateRange}`, 14, filters.batch ? 56 : 50);

  const startY = filters.batch ? 64 : 58;

  // Overall summary
  doc.setFontSize(11);
  doc.text('Overall Summary', 14, startY);
  doc.setFontSize(9);
  const summaryLines = [
    `Total Classes: ${detail.totalClasses} | Present: ${detail.present} | Absent: ${detail.absent}`,
    `Attendance: ${detail.attendancePercent}% | Required: ${detail.requiredPercent}% | Shortage: ${detail.shortagePercent}%`,
    `Current Absence Streak: ${detail.currentAbsenceStreak} | Longest: ${detail.longestAbsenceStreak}`,
    `Last Attended: ${detail.lastAttendedDate || 'N/A'}`,
  ];
  summaryLines.forEach((line, i) => doc.text(line, 14, startY + 8 + i * 6));

  // Subject-wise
  if (detail.subjects.length > 0) {
    autoTable(doc, {
      startY: startY + 34,
      head: [['Subject', 'Code', 'Classes', 'Present', 'Absent', '%', 'Risk']],
      body: detail.subjects.map(s => [s.courseName, s.courseCode, s.totalClasses, s.present, s.absent, `${s.attendancePercent}%`, s.risk]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [34, 34, 34] },
    });
  }

  // Date-wise
  if (detail.dateWise.length > 0) {
    const lastY = (doc as any).lastAutoTable?.finalY || startY + 60;
    if (lastY > 240) doc.addPage();
    autoTable(doc, {
      startY: lastY > 240 ? 20 : lastY + 10,
      head: [['Date', 'Subject', 'Status']],
      body: detail.dateWise.map(d => [d.date, d.subject, d.status]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [34, 34, 34] },
    });
  }

  doc.save(`${detail.studentName.replace(/\s+/g, '_')}_Attendance.pdf`);
}

export function downloadBulkAttendanceExcel(
  rows: StudentAttendanceRow[],
  summary: SectionSummary | null,
  filters: { department: string; semester: string; batch: string; section: string; subject: string; dateRange: string }
) {
  const wb = XLSX.utils.book_new();
  const now = new Date().toLocaleString();

  // Sheet 1: Section Summary
  const headers = ['Student Name', 'Roll Number', 'Total Classes', 'Present', 'Absent', 'Attendance %', 'Risk Level'];
  const dataRows = rows.map(r => [r.studentName, r.rollNo, r.totalClasses, r.present, r.absent, r.attendancePercent, r.status]);
  const ws = XLSX.utils.aoa_to_sheet([
    [`Attendance Report - ${filters.department} | Sem ${filters.semester} | Sec ${filters.section}`],
    [`Filters: Batch: ${filters.batch || 'All'} | Subject: ${filters.subject} | Date: ${filters.dateRange}`],
    [`Generated: ${now}`],
    [],
    ...(summary ? [
      ['Section Summary'],
      ['Total Classes', summary.totalClassesConducted],
      ['Total Students', summary.totalStudents],
      ['Average Attendance', `${summary.averageAttendance}%`],
      ['Below 75%', summary.below75],
      ['Below 60%', summary.below60],
      [],
    ] : []),
    headers,
    ...dataRows,
  ]);
  XLSX.utils.book_append_sheet(wb, ws, 'Section Summary');

  XLSX.writeFile(wb, `Attendance_Report_${filters.section}_${Date.now()}.xlsx`);
}
