import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { AppSettings, Classroom, StudentResult, SubjectStats, TestRecord } from '../types';
import { formatOrdinal, getTestSubjects } from './calculations';

const NAVY: [number, number, number] = [15, 37, 71];
const GOLD: [number, number, number] = [184, 134, 11];
const SLATE_TEXT: [number, number, number] = [30, 41, 59];
const MUTED_TEXT: [number, number, number] = [100, 116, 139];
const LIGHT_BG: [number, number, number] = [248, 250, 252];

function addLogoSafe(doc: jsPDF, dataUrl: string | undefined, x: number, y: number, size: number): boolean {
  if (!dataUrl) return false;
  try {
    const isPng = dataUrl.startsWith('data:image/png');
    const isWebp = dataUrl.startsWith('data:image/webp');
    const format = isPng ? 'PNG' : isWebp ? 'WEBP' : 'JPEG';
    doc.addImage(dataUrl, format, x, y, size, size);
    return true;
  } catch {
    return false;
  }
}

function drawSchoolHeader(
  doc: jsPDF,
  settings: AppSettings,
  title: string,
  subtitle: string
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 14;

  const hasLogo = addLogoSafe(doc, settings.schoolLogoDataUrl, margin, y, 16);
  const textX = hasLogo ? margin + 20 : margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...NAVY);
  doc.text(settings.schoolName || 'School Name', textX, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...GOLD);
  doc.text(title, textX, y + 12.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...MUTED_TEXT);
  doc.text(subtitle, pageWidth - margin, y + 12.5, { align: 'right' });

  y += 19;
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.6);
  doc.line(margin, y, pageWidth - margin, y);

  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.3);
  doc.line(margin, y + 1.2, pageWidth - margin, y + 1.2);

  return y + 7;
}

function renderSingleReportCardOnPage(
  doc: jsPDF,
  result: StudentResult,
  classroom: Classroom,
  test: TestRecord,
  settings: AppSettings
): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  let y = drawSchoolHeader(
    doc,
    settings,
    'STUDENT REPORT CARD',
    `${test.name}  |  ${test.date}`
  );

  // Student info grid box
  doc.setFillColor(...LIGHT_BG);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 22, 1.5, 1.5, 'FD');

  doc.setFontSize(9.5);
  const col1X = margin + 4;
  const col2X = pageWidth / 2 + 4;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...MUTED_TEXT);
  doc.text('Student Name:', col1X, y + 7);
  doc.text('Roll Number:', col2X, y + 7);
  doc.text('Class:', col1X, y + 15);
  doc.text(result.student.fatherName ? 'Father Name:' : 'Attendance:', col2X, y + 15);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...SLATE_TEXT);
  doc.text(result.student.name, col1X + 28, y + 7);
  doc.text(result.student.rollNumber, col2X + 26, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.text(classroom.name, col1X + 28, y + 15);
  doc.text(
    result.student.fatherName || result.attendance || '—',
    col2X + 26,
    y + 15
  );

  y += 28;

  // Subject marks table
  const tableRows = result.subjects.map((s) => [
    s.subject,
    String(s.total),
    s.obtained === 'ABSENT' ? 'AB' : s.obtained === null ? '—' : String(s.obtained),
    s.percentage === null ? '—' : `${s.percentage.toFixed(1)}%`,
    s.grade,
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin, bottom: 20 },
    head: [['Subject', 'Total Marks', 'Obtained Marks', 'Percentage', 'Grade']],
    body: tableRows,
    foot: [
      [
        'Grand Total',
        String(result.totalMax),
        result.isFullyAbsent ? 'AB' : String(result.totalObtained),
        `${result.percentage.toFixed(1)}%`,
        result.grade,
      ],
    ],
    theme: 'grid',
    showHead: 'everyPage',
    headStyles: {
      fillColor: NAVY,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9.5,
      halign: 'left',
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: NAVY,
      fontStyle: 'bold',
      fontSize: 9.5,
    },
    styles: {
      font: 'helvetica',
      fontSize: 9.5,
      cellPadding: 3.2,
      textColor: SLATE_TEXT,
      lineColor: [203, 213, 225],
      lineWidth: 0.25,
    },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'center' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 2 && data.cell.raw === 'AB') {
        data.cell.styles.textColor = [185, 28, 28];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 50;
  let summaryY = finalY + 8;

  if (summaryY > pageHeight - 60) {
    doc.addPage();
    summaryY = 20;
  }

  // Summary KPI bar
  const boxW = (pageWidth - margin * 2 - 9) / 4;
  const kpis = [
    { label: 'Percentage', value: `${result.percentage.toFixed(1)}%` },
    { label: 'Grade', value: result.grade },
    { label: 'Class Position', value: formatOrdinal(result.position) },
    { label: 'Result', value: result.passed ? 'PASS' : 'FAIL' },
  ];

  kpis.forEach((k, idx) => {
    const bx = margin + idx * (boxW + 3);
    doc.setFillColor(...LIGHT_BG);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(bx, summaryY, boxW, 16, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED_TEXT);
    doc.text(k.label, bx + boxW / 2, summaryY + 5.5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    if (k.label === 'Result') {
      doc.setTextColor(...(result.passed ? [21, 128, 61] : [185, 28, 28]) as [number, number, number]);
    } else {
      doc.setTextColor(...NAVY);
    }
    doc.text(k.value, bx + boxW / 2, summaryY + 12.5, { align: 'center' });
  });

  summaryY += 23;

  // Optional Attendance line if Father Name occupied the top-right slot
  if (result.student.fatherName && result.attendance) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...MUTED_TEXT);
    doc.text('Attendance:', margin, summaryY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...SLATE_TEXT);
    doc.text(result.attendance, margin + 24, summaryY);
    summaryY += 7;
  }

  // Teacher remark box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.text('Teacher Remark', margin, summaryY);

  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, summaryY + 2, pageWidth - margin * 2, 18, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...SLATE_TEXT);
  const remarkText = result.remark.trim() || '—';
  const splitRemark = doc.splitTextToSize(remarkText, pageWidth - margin * 2 - 8);
  doc.text(splitRemark.slice(0, 3), margin + 4, summaryY + 8);

  // Signature lines near bottom
  const sigY = Math.max(summaryY + 34, pageHeight - 24);
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.4);
  doc.line(margin, sigY, margin + 58, sigY);
  doc.line(pageWidth - margin - 58, sigY, pageWidth - margin, sigY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.text(settings.classTeacherName || 'Class Teacher', margin + 29, sigY + 5, { align: 'center' });
  doc.text(settings.principalName || 'Principal', pageWidth - margin - 29, sigY + 5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED_TEXT);
  doc.text('Class Teacher Signature', margin + 29, sigY + 9, { align: 'center' });
  doc.text('Principal Signature', pageWidth - margin - 29, sigY + 9, { align: 'center' });
}

export function buildStudentReportPdf(
  result: StudentResult,
  classroom: Classroom,
  test: TestRecord,
  settings: AppSettings
): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  renderSingleReportCardOnPage(doc, result, classroom, test, settings);
  return doc;
}

export function downloadStudentReportPdf(
  result: StudentResult,
  classroom: Classroom,
  test: TestRecord,
  settings: AppSettings
): void {
  const doc = buildStudentReportPdf(result, classroom, test, settings);
  const safeName = result.student.name.replace(/[^a-zA-Z0-9_-]+/g, '_');
  doc.save(`report-card-${result.student.rollNumber}-${safeName}.pdf`);
}

export function buildAllReportCardsPdf(
  results: StudentResult[],
  classroom: Classroom,
  test: TestRecord,
  settings: AppSettings
): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  results.forEach((result, idx) => {
    if (idx > 0) doc.addPage();
    renderSingleReportCardOnPage(doc, result, classroom, test, settings);
  });
  return doc;
}

export function downloadAllReportCardsPdf(
  results: StudentResult[],
  classroom: Classroom,
  test: TestRecord,
  settings: AppSettings
): void {
  if (results.length === 0) return;
  const doc = buildAllReportCardsPdf(results, classroom, test, settings);
  const safeTest = test.name.replace(/[^a-zA-Z0-9_-]+/g, '_');
  doc.save(`all-report-cards-${safeTest}.pdf`);
}

export function buildClassResultSheetPdf(
  results: StudentResult[],
  classroom: Classroom,
  test: TestRecord,
  settings: AppSettings
): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const subjects = getTestSubjects(test, classroom);
  const startY = drawSchoolHeader(
    doc,
    settings,
    `CLASS RESULT SHEET — ${classroom.name}`,
    `${test.name}  |  ${test.date}  |  Pass: ${test.passPercentage}%`
  );

  const head = [
    [
      'Roll',
      'Student Name',
      ...subjects.map((s) => `${s}\n(/${test.subjectTotals[s] ?? 100})`),
      'Total',
      '%',
      'Grade',
      'Pos',
      'Result',
    ],
  ];

  const body = results.map((r) => [
    r.student.rollNumber,
    r.student.name,
    ...subjects.map((subj) => {
      const detail = r.subjects.find((d) => d.subject === subj);
      if (!detail || detail.obtained === null) return '—';
      return detail.obtained === 'ABSENT' ? 'AB' : String(detail.obtained);
    }),
    r.isFullyAbsent ? 'AB' : `${r.totalObtained}/${r.totalMax}`,
    `${r.percentage.toFixed(1)}%`,
    r.grade,
    formatOrdinal(r.position),
    r.passed ? 'PASS' : 'FAIL',
  ]);

  autoTable(doc, {
    startY,
    margin: { top: 14, left: 12, right: 12, bottom: 14 },
    head,
    body,
    theme: 'grid',
    showHead: 'everyPage',
    headStyles: {
      fillColor: NAVY,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      valign: 'middle',
    },
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: 2.4,
      textColor: SLATE_TEXT,
      lineColor: [203, 213, 225],
      lineWidth: 0.25,
    },
    didParseCell: (data) => {
      if (data.section === 'body') {
        const lastCol = head[0].length - 1;
        if (data.column.index === lastCol) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor =
            data.cell.raw === 'PASS' ? [21, 128, 61] : [185, 28, 28];
        }
        if (data.cell.raw === 'AB') {
          data.cell.styles.textColor = [185, 28, 28];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });

  return doc;
}

export function downloadClassResultSheetPdf(
  results: StudentResult[],
  classroom: Classroom,
  test: TestRecord,
  settings: AppSettings
): void {
  const doc = buildClassResultSheetPdf(results, classroom, test, settings);
  const safeTest = test.name.replace(/[^a-zA-Z0-9_-]+/g, '_');
  doc.save(`class-result-sheet-${safeTest}.pdf`);
}

export function buildClassResultSheetWorkbook(
  results: StudentResult[],
  classroom: Classroom,
  test: TestRecord,
  settings: AppSettings
): XLSX.WorkBook {
  const subjects = getTestSubjects(test, classroom);

  const rows: (string | number)[][] = [
    [settings.schoolName || 'School Name'],
    [`Class Result Sheet - ${classroom.name}`, `${test.name} (${test.date})`, `Pass %: ${test.passPercentage}%`],
    [],
    [
      'Roll Number',
      'Student Name',
      'Father Name',
      ...subjects.map((s) => `${s} (/${test.subjectTotals[s] ?? 100})`),
      'Total Obtained',
      'Total Marks',
      'Percentage',
      'Grade',
      'Position',
      'Result',
      'Attendance',
      'Teacher Remark',
    ],
  ];

  for (const r of results) {
    rows.push([
      r.student.rollNumber,
      r.student.name,
      r.student.fatherName ?? '',
      ...subjects.map((subj) => {
        const detail = r.subjects.find((d) => d.subject === subj);
        if (!detail || detail.obtained === null) return '';
        return detail.obtained === 'ABSENT' ? 'AB' : detail.obtained;
      }),
      r.isFullyAbsent ? 'AB' : r.totalObtained,
      r.totalMax,
      Number(r.percentage.toFixed(1)),
      r.grade,
      r.position ?? '',
      r.passed ? 'PASS' : 'FAIL',
      r.attendance,
      r.remark,
    ]);
  }

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Class Results');
  return workbook;
}

export function downloadClassResultSheetExcel(
  results: StudentResult[],
  classroom: Classroom,
  test: TestRecord,
  settings: AppSettings
): void {
  const workbook = buildClassResultSheetWorkbook(results, classroom, test, settings);
  const safeTest = test.name.replace(/[^a-zA-Z0-9_-]+/g, '_');
  XLSX.writeFile(workbook, `class-result-sheet-${safeTest}.xlsx`);
}

export function downloadSubjectAnalysisPdf(
  subjectStats: SubjectStats[],
  failedStudents: StudentResult[],
  classroom: Classroom,
  test: TestRecord,
  settings: AppSettings
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const margin = 14;
  const startY = drawSchoolHeader(
    doc,
    settings,
    `SUBJECT ANALYSIS — ${classroom.name}`,
    `${test.name}  |  ${test.date}`
  );

  autoTable(doc, {
    startY,
    margin: { left: margin, right: margin, bottom: 16 },
    head: [['Subject', 'Total', 'Appeared', 'Absent', 'Average', 'Highest', 'Lowest', 'Pass %']],
    body: subjectStats.map((s) => [
      s.subject,
      String(s.totalMax),
      String(s.appearedCount),
      String(s.absentCount),
      `${s.average.toFixed(1)} (${s.averagePercentage.toFixed(0)}%)`,
      String(s.highest),
      String(s.lowest),
      `${s.passPercentage.toFixed(1)}%`,
    ]),
    theme: 'grid',
    showHead: 'everyPage',
    headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontSize: 9 },
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 3, textColor: SLATE_TEXT },
  });

  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? startY + 40;
  let nextY = finalY + 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...NAVY);
  doc.text('Students Who Failed or Were Absent in Any Subject', margin, nextY);
  nextY += 4;

  if (failedStudents.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...MUTED_TEXT);
    doc.text('All students passed every subject.', margin, nextY + 5);
  } else {
    autoTable(doc, {
      startY: nextY,
      margin: { left: margin, right: margin, bottom: 16 },
      head: [['Roll', 'Student Name', 'Failed / Absent Subjects', 'Overall %']],
      body: failedStudents.map((r) => [
        r.student.rollNumber,
        r.student.name,
        r.failedSubjects
          .map((subj) => (r.absentSubjects.includes(subj) ? `${subj} (AB)` : subj))
          .join(', '),
        `${r.percentage.toFixed(1)}%`,
      ]),
      theme: 'grid',
      showHead: 'everyPage',
      headStyles: { fillColor: [185, 28, 28], textColor: [255, 255, 255], fontSize: 9 },
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 2.8, textColor: SLATE_TEXT },
    });
  }

  const safeTest = test.name.replace(/[^a-zA-Z0-9_-]+/g, '_');
  doc.save(`subject-analysis-${safeTest}.pdf`);
}
