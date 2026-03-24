import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { StudentReport } from '@/hooks/useStudentReport';

export function downloadPDF(report: StudentReport) {
  const doc = new jsPDF();
  const now = new Date().toLocaleString();

  // Title
  doc.setFontSize(16);
  doc.text('Student Academic Report', 14, 20);
  doc.setFontSize(10);
  doc.text(`Generated: ${now}`, 14, 27);

  // Student Info
  doc.setFontSize(12);
  doc.text(`${report.studentName} (${report.rollNumber})`, 14, 38);
  doc.setFontSize(10);
  doc.text(`${report.program} · Semester ${report.semester} · Section ${report.section}`, 14, 44);
  doc.text(`Performance Index: ${report.performanceIndex}% | Status: ${report.status} | Attendance: ${report.overallAttendance}%`, 14, 50);

  // Subject Matrix Table
  autoTable(doc, {
    startY: 58,
    head: [['Subject', 'Notes %', 'Test Avg', 'Assess Avg', 'Tasks', 'Attend %', 'Strength', 'Risk']],
    body: report.subjects.map(s => [
      s.name,
      `${s.notesCompletion}%`,
      `${s.testAvgScore}%`,
      `${s.assessmentAvgScore}%`,
      `${s.tasksSubmitted}/${s.tasksTotal}`,
      `${s.attendancePercent}%`,
      s.strength,
      s.risk,
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [34, 34, 34] },
  });

  // Strength & Weakness
  const finalY = (doc as any).lastAutoTable?.finalY || 120;
  doc.setFontSize(11);
  doc.text('Strength & Weakness Analysis', 14, finalY + 10);
  doc.setFontSize(9);
  doc.text(`Strongest: ${report.strongestSubject}`, 14, finalY + 18);
  doc.text(`Weakest: ${report.weakestSubject}`, 14, finalY + 24);
  doc.text(`Highest Pending: ${report.highestPendingSubject}`, 14, finalY + 30);
  doc.text(`Lowest Attendance: ${report.lowestAttendanceSubject}`, 14, finalY + 36);
  doc.text(`Performance Gap: ${Math.round(report.performanceGap)}%`, 14, finalY + 42);

  doc.save(`${report.studentName.replace(/\s+/g, '_')}_Report.pdf`);
}

export function downloadExcel(report: StudentReport) {
  const wb = XLSX.utils.book_new();
  const now = new Date().toLocaleString();

  // Summary sheet
  const summaryData = [
    ['Student Academic Report'],
    [`Generated: ${now}`],
    [],
    ['Student Name', report.studentName],
    ['Roll Number', report.rollNumber],
    ['Program', report.program],
    ['Semester', report.semester],
    ['Section', report.section],
    ['Performance Index', `${report.performanceIndex}%`],
    ['Status', report.status],
    ['Overall Attendance', `${report.overallAttendance}%`],
    ['Learning Completion', `${report.learningCompletion}%`],
    [],
    ['Strongest Subject', report.strongestSubject],
    ['Weakest Subject', report.weakestSubject],
    ['Highest Pending', report.highestPendingSubject],
    ['Lowest Attendance', report.lowestAttendanceSubject],
    ['Performance Gap', `${Math.round(report.performanceGap)}%`],
  ];
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

  // Subjects sheet
  const subjectHeaders = ['Subject', 'Code', 'Notes %', 'Test Avg', 'Assessment Avg', 'Tasks Total', 'Tasks Submitted', 'Tasks Pending', 'Attendance %', 'Strength', 'Risk'];
  const subjectRows = report.subjects.map(s => [
    s.name, s.code, s.notesCompletion, s.testAvgScore, s.assessmentAvgScore,
    s.tasksTotal, s.tasksSubmitted, s.tasksPending, s.attendancePercent, s.strength, s.risk,
  ]);
  const subjectWs = XLSX.utils.aoa_to_sheet([subjectHeaders, ...subjectRows]);
  XLSX.utils.book_append_sheet(wb, subjectWs, 'Subjects');

  // Detail per subject
  report.subjects.forEach(s => {
    const detailData = [
      [s.name],
      [],
      ['Notes & Learning'],
      ['Total Chapters', s.totalChapters],
      ['Completed', s.chaptersCompleted],
      ['Pending', s.chaptersPending],
      ['Topics Not Opened', s.topicsNotOpened],
      [],
      ['Tests'],
      ['Tests Attempted', s.testsAttempted],
      ['Accuracy', `${s.accuracy}%`],
      [],
      ['Assessments'],
      ['Total', s.assessmentsTotal],
      ['Completed', s.assessmentsCompleted],
      ['Pending', s.assessmentsPending],
      [],
      ['Tasks'],
      ['Total', s.tasksTotal],
      ['On Time', s.tasksOnTime],
      ['Late', s.tasksLate],
      ['Pending', s.tasksPending],
      [],
      ['Attendance'],
      ['Classes Held', s.classesHeld],
      ['Attended', s.classesAttended],
      ['Missed', s.missedSessions],
    ];
    const ws = XLSX.utils.aoa_to_sheet(detailData);
    XLSX.utils.book_append_sheet(wb, ws, s.code.substring(0, 31) || s.name.substring(0, 31));
  });

  XLSX.writeFile(wb, `${report.studentName.replace(/\s+/g, '_')}_Report.xlsx`);
}

export function downloadBulkExcel(reports: StudentReport[]) {
  const wb = XLSX.utils.book_new();
  const now = new Date().toLocaleString();

  const headers = ['Student', 'Roll No', 'Performance Index', 'Status', 'Attendance', 'Learning %', 'Strongest', 'Weakest'];
  const rows = reports.map(r => [
    r.studentName, r.rollNumber, r.performanceIndex, r.status,
    r.overallAttendance, r.learningCompletion, r.strongestSubject, r.weakestSubject,
  ]);
  const ws = XLSX.utils.aoa_to_sheet([
    [`Bulk Report - Generated: ${now}`],
    [],
    headers,
    ...rows,
  ]);
  XLSX.utils.book_append_sheet(wb, ws, 'All Students');
  XLSX.writeFile(wb, `Bulk_Student_Report_${Date.now()}.xlsx`);
}