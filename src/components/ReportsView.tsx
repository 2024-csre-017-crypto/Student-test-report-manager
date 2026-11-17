import React, { useState } from 'react';
import {
  Download,
  Printer,
  FileSpreadsheet,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { AppSettings, Classroom, TestRecord } from '../types';
import { Translations } from '../i18n';
import {
  computeStudentProgress,
  computeTestResults,
  formatOrdinal,
  getTestSubjects,
} from '../utils/calculations';
import {
  downloadAllReportCardsPdf,
  downloadClassResultSheetExcel,
  downloadClassResultSheetPdf,
  downloadStudentReportPdf,
  downloadSubjectAnalysisPdf,
} from '../utils/exports';
import { ReportCardSheet } from './ReportCardSheet';

type ReportTab = 'individual' | 'classSheet' | 'subjectAnalysis' | 'progress' | 'allCards';

interface ReportsViewProps {
  classes: Classroom[];
  tests: TestRecord[];
  selectedTestId: string | null;
  settings: AppSettings;
  t: Translations;
  onSelectTest: (id: string) => void;
  onUpdateTest: (test: TestRecord) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  classes,
  tests,
  selectedTestId,
  settings,
  t,
  onSelectTest,
  onUpdateTest,
}) => {
  const [activeTab, setActiveTab] = useState<ReportTab>('individual');
  const activeTest = tests.find((item) => item.id === selectedTestId) ?? tests[0] ?? null;
  const activeClass = activeTest
    ? classes.find((c) => c.id === activeTest.classId) ?? null
    : null;

  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  if (!activeTest || !activeClass) {
    return (
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">{t.noTestsYet}</p>
      </div>
    );
  }

  const { studentResults, subjectStats, failedStudents } = computeTestResults(
    activeTest,
    activeClass,
    settings.gradingScale
  );

  const selectedResult =
    studentResults.find((r) => r.student.id === selectedStudentId) ??
    studentResults[0] ??
    null;

  const testSubjects = getTestSubjects(activeTest, activeClass);
  const isUrdu = settings.language === 'ur';

  const handleUpdateRemark = (studentId: string, remark: string) => {
    onUpdateTest({
      ...activeTest,
      remarks: { ...activeTest.remarks, [studentId]: remark },
    });
  };

  const handleUpdateAttendance = (studentId: string, attendance: string) => {
    onUpdateTest({
      ...activeTest,
      attendance: { ...activeTest.attendance, [studentId]: attendance },
    });
  };

  const handleAiRemark = async () => {
    if (!selectedResult) return;
    setAiError('');
    setAiLoading(true);
    try {
      const progress = computeStudentProgress(
        selectedResult.student.id,
        activeClass,
        tests,
        settings.gradingScale
      );
      const currentIdx = progress.findIndex((p) => p.test.id === activeTest.id);
      let trend = '';
      if (currentIdx > 0) {
        const prev = progress[currentIdx - 1];
        const diff = selectedResult.percentage - prev.result.percentage;
        trend =
          diff > 2
            ? `Improved by ${diff.toFixed(1)}% from previous test`
            : diff < -2
            ? `Decreased by ${Math.abs(diff).toFixed(1)}% from previous test`
            : `Consistent (${prev.result.percentage.toFixed(1)}% previously)`;
      }

      const res = await fetch('/api/remarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjects: selectedResult.subjects.map((s) => ({
            name: s.subject,
            obtained: s.obtained,
            total: s.total,
            percentage: s.percentage !== null ? Number(s.percentage.toFixed(1)) : null,
          })),
          overallPercentage: Number(selectedResult.percentage.toFixed(1)),
          result: selectedResult.passed ? 'PASS' : 'FAIL',
          trend,
          language: settings.language,
        }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(
          'AI remarks require the app server and are unavailable on static hosting (such as GitHub Pages). You can type or edit remarks manually.'
        );
      }

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Could not generate AI remark.');
      }
      handleUpdateRemark(selectedResult.student.id, json.remark);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Failed to generate AI remark.');
    } finally {
      setAiLoading(false);
    }
  };

  const progressHistory = selectedResult
    ? computeStudentProgress(
        selectedResult.student.id,
        activeClass,
        tests,
        settings.gradingScale
      )
    : [];

  return (
    <div className="space-y-5">
      {/* Controls Bar (hidden on print) */}
      <div className="no-print rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={activeTest.id}
              onChange={(e) => onSelectTest(e.target.value)}
              aria-label="Select test"
              className="min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-semibold"
            >
              {tests.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.date})
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {activeClass.name}
            </span>
          </div>
        </div>

        {/* Report Mode Tabs */}
        <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-950">
          {(
            [
              ['individual', t.reportCard],
              ['classSheet', t.classSheet],
              ['subjectAnalysis', t.subjectAnalysis],
              ['progress', t.studentProgress],
              ['allCards', t.printAllCards],
            ] as Array<[ReportTab, string]>
          ).map(([tabId, label]) => (
            <button
              key={tabId}
              type="button"
              onClick={() => setActiveTab(tabId)}
              className={`min-h-[40px] px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === tabId
                  ? 'bg-white dark:bg-slate-800 text-[#0F2547] dark:text-amber-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {isUrdu && (activeTab === 'individual' || activeTab === 'classSheet' || activeTab === 'allCards') && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{t.urduPdfNotice}</span>
          </div>
        )}
      </div>

      {/* 1. Individual Report Card */}
      {activeTab === 'individual' && selectedResult && (
        <div className="space-y-4">
          <div className="no-print rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 shrink-0">
                  {t.studentName}:
                </label>
                <select
                  value={selectedResult.student.id}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="flex-1 max-w-xs min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-medium"
                >
                  {studentResults.map((r) => (
                    <option key={r.student.id} value={r.student.id}>
                      #{r.student.rollNumber} — {r.student.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    downloadStudentReportPdf(selectedResult, activeClass, activeTest, settings)
                  }
                  className="min-h-[44px] px-4 rounded-xl bg-[#0F2547] hover:bg-[#16325C] dark:bg-amber-500 dark:text-slate-950 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-4 h-4" />
                  <span>{t.downloadPdf}</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="min-h-[44px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Printer className="w-4 h-4" />
                  <span>{t.print}</span>
                </button>
              </div>
            </div>

            {/* Editable Remark & Attendance */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {t.attendance} ({t.optional})
                </label>
                <input
                  type="text"
                  value={activeTest.attendance?.[selectedResult.student.id] ?? ''}
                  onChange={(e) =>
                    handleUpdateAttendance(selectedResult.student.id, e.target.value)
                  }
                  placeholder="e.g. 22/24"
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-nums"
                />
              </div>
              <div className="sm:col-span-9">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {t.teacherRemark}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={activeTest.remarks?.[selectedResult.student.id] ?? ''}
                    onChange={(e) =>
                      handleUpdateRemark(selectedResult.student.id, e.target.value)
                    }
                    placeholder="Type remark by hand..."
                    className="flex-1 min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  />
                  {settings.aiRemarksEnabled && (
                    <button
                      type="button"
                      disabled={aiLoading}
                      onClick={handleAiRemark}
                      className="min-h-[44px] px-4 rounded-xl bg-[#0F2547] dark:bg-amber-500 text-white dark:text-slate-950 text-xs sm:text-sm font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>{aiLoading ? t.generating : t.writeRemarkAi}</span>
                    </button>
                  )}
                </div>
                {aiError && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">{aiError}</p>
                )}
              </div>
            </div>
          </div>

          <div className="print-page">
            <ReportCardSheet
              result={selectedResult}
              classroom={activeClass}
              test={activeTest}
              settings={settings}
              t={t}
            />
          </div>
        </div>
      )}

      {/* 2. Class Result Sheet */}
      {activeTab === 'classSheet' && (
        <div className="space-y-4">
          <div className="no-print flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() =>
                downloadClassResultSheetPdf(studentResults, activeClass, activeTest, settings)
              }
              className="min-h-[44px] px-4 rounded-xl bg-[#0F2547] hover:bg-[#16325C] dark:bg-amber-500 dark:text-slate-950 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              <span>{t.downloadPdf}</span>
            </button>
            <button
              type="button"
              onClick={() =>
                downloadClassResultSheetExcel(studentResults, activeClass, activeTest, settings)
              }
              className="min-h-[44px] px-4 rounded-xl border border-[#0F2547] dark:border-amber-400 text-[#0F2547] dark:text-amber-400 text-xs sm:text-sm font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{t.downloadExcel}</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="min-h-[44px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Printer className="w-4 h-4" />
              <span>{t.print}</span>
            </button>
          </div>

          <div className="bg-white text-slate-900 border border-slate-300 rounded-xl p-4 sm:p-6 overflow-x-auto">
            <div className="flex items-center justify-between gap-4 pb-3 mb-4 border-b-2 border-[#0F2547]">
              <div className="flex items-center gap-3">
                {settings.schoolLogoDataUrl && (
                  <img
                    src={settings.schoolLogoDataUrl}
                    alt={settings.schoolName || 'School Logo'}
                    className="w-11 h-11 object-contain"
                    referrerPolicy="no-referrer"
                  />
                )}
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-[#0F2547]">
                    {settings.schoolName || t.schoolName}
                  </h2>
                  <p className="text-xs font-bold text-[#B8860B]">
                    {t.classSheet} — {activeClass.name}
                  </p>
                </div>
              </div>
              <div className="text-right text-xs font-mono-nums text-slate-600">
                <p className="font-bold text-[#0F2547]">{activeTest.name}</p>
                <p>{activeTest.date}</p>
              </div>
            </div>

            <table className="w-full border-collapse border border-slate-300 text-xs">
              <thead>
                <tr className="bg-[#0F2547] text-white">
                  <th className="border border-slate-300 py-2 px-2 text-left">
                    {t.rollNumber}
                  </th>
                  <th className="border border-slate-300 py-2 px-2 text-left">
                    {t.studentName}
                  </th>
                  {testSubjects.map((subj) => (
                    <th key={subj} className="border border-slate-300 py-2 px-2 text-right">
                      {subj}
                      <span className="block text-[10px] font-normal text-slate-300 font-mono-nums">
                        /{activeTest.subjectTotals[subj] ?? 100}
                      </span>
                    </th>
                  ))}
                  <th className="border border-slate-300 py-2 px-2 text-right">
                    {t.totalMarks}
                  </th>
                  <th className="border border-slate-300 py-2 px-2 text-right">
                    {t.percentage}
                  </th>
                  <th className="border border-slate-300 py-2 px-2 text-center">
                    {t.position}
                  </th>
                  <th className="border border-slate-300 py-2 px-2 text-center">
                    {t.result}
                  </th>
                </tr>
              </thead>
              <tbody>
                {studentResults.map((r) => (
                  <tr key={r.student.id}>
                    <td className="border border-slate-300 py-1.5 px-2 font-mono-nums font-semibold">
                      {r.student.rollNumber}
                    </td>
                    <td className="border border-slate-300 py-1.5 px-2 font-medium">
                      {r.student.name}
                    </td>
                    {testSubjects.map((subj) => {
                      const d = r.subjects.find((item) => item.subject === subj);
                      const label =
                        !d || d.obtained === null
                          ? '—'
                          : d.obtained === 'ABSENT'
                          ? 'AB'
                          : String(d.obtained);
                      return (
                        <td
                          key={subj}
                          className={`border border-slate-300 py-1.5 px-2 text-right font-mono-nums ${
                            d?.obtained === 'ABSENT' ? 'text-red-700 font-bold' : ''
                          }`}
                        >
                          {label}
                        </td>
                      );
                    })}
                    <td className="border border-slate-300 py-1.5 px-2 text-right font-mono-nums font-semibold">
                      {r.isFullyAbsent ? 'AB' : `${r.totalObtained}/${r.totalMax}`}
                    </td>
                    <td className="border border-slate-300 py-1.5 px-2 text-right font-mono-nums font-semibold">
                      {r.percentage.toFixed(1)}%
                    </td>
                    <td className="border border-slate-300 py-1.5 px-2 text-center font-mono-nums font-bold">
                      {formatOrdinal(r.position)}
                    </td>
                    <td
                      className={`border border-slate-300 py-1.5 px-2 text-center font-bold ${
                        r.passed ? 'text-emerald-700' : 'text-red-700'
                      }`}
                    >
                      {r.passed ? t.pass : t.fail}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Subject Analysis + Bar Chart */}
      {activeTab === 'subjectAnalysis' && (
        <div className="space-y-4">
          <div className="no-print flex justify-end">
            <button
              type="button"
              onClick={() =>
                downloadSubjectAnalysisPdf(
                  subjectStats,
                  failedStudents,
                  activeClass,
                  activeTest,
                  settings
                )
              }
              className="min-h-[44px] px-4 rounded-xl bg-[#0F2547] hover:bg-[#16325C] dark:bg-amber-500 dark:text-slate-950 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              <span>{t.downloadPdf}</span>
            </button>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 space-y-6">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#0F2547] dark:text-slate-100">
                {t.subjectAnalysis} — {activeTest.name}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Average % (Navy) and Pass % (Gold) per subject
              </p>
            </div>

            {/* Responsive SVG Bar Chart */}
            <div className="overflow-x-auto">
              <div className="min-w-[420px]">
                <svg
                  viewBox={`0 0 ${Math.max(460, subjectStats.length * 110)} 230`}
                  className="w-full h-56"
                  role="img"
                  aria-label="Subject analysis bar chart"
                >
                  {[0, 25, 50, 75, 100].map((tick) => {
                    const y = 180 - (tick / 100) * 150;
                    return (
                      <g key={tick}>
                        <line
                          x1={38}
                          y1={y}
                          x2={Math.max(440, subjectStats.length * 110) - 10}
                          y2={y}
                          stroke="currentColor"
                          className="text-slate-200 dark:text-slate-800"
                          strokeDasharray="3 3"
                        />
                        <text
                          x={32}
                          y={y + 4}
                          textAnchor="end"
                          className="fill-slate-400 text-[10px] font-mono-nums"
                        >
                          {tick}%
                        </text>
                      </g>
                    );
                  })}

                  {subjectStats.map((stat, idx) => {
                    const groupX = 56 + idx * 105;
                    const avgH = (stat.averagePercentage / 100) * 150;
                    const passH = (stat.passPercentage / 100) * 150;
                    return (
                      <g key={stat.subject}>
                        {/* Average % bar */}
                        <rect
                          x={groupX}
                          y={180 - avgH}
                          width={26}
                          height={Math.max(avgH, 2)}
                          rx={4}
                          className="fill-[#0F2547] dark:fill-sky-400"
                        />
                        <text
                          x={groupX + 13}
                          y={180 - avgH - 5}
                          textAnchor="middle"
                          className="fill-slate-700 dark:fill-slate-200 text-[10px] font-mono-nums font-semibold"
                        >
                          {stat.averagePercentage.toFixed(0)}%
                        </text>

                        {/* Pass % bar */}
                        <rect
                          x={groupX + 32}
                          y={180 - passH}
                          width={26}
                          height={Math.max(passH, 2)}
                          rx={4}
                          className="fill-[#B8860B] dark:fill-amber-400"
                        />
                        <text
                          x={groupX + 45}
                          y={180 - passH - 5}
                          textAnchor="middle"
                          className="fill-slate-700 dark:fill-slate-200 text-[10px] font-mono-nums font-semibold"
                        >
                          {stat.passPercentage.toFixed(0)}%
                        </text>

                        <text
                          x={groupX + 29}
                          y={202}
                          textAnchor="middle"
                          className="fill-slate-700 dark:fill-slate-300 text-[11px] font-semibold"
                        >
                          {stat.subject.length > 13
                            ? `${stat.subject.slice(0, 12)}…`
                            : stat.subject}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* Subject Stats Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500">
                  <tr>
                    <th className="py-2 px-3">{t.subjectLabel}</th>
                    <th className="py-2 px-3 text-right">{t.totalMarks}</th>
                    <th className="py-2 px-3 text-right">{t.average}</th>
                    <th className="py-2 px-3 text-right">{t.highest}</th>
                    <th className="py-2 px-3 text-right">{t.lowest}</th>
                    <th className="py-2 px-3 text-right">{t.passRate}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {subjectStats.map((s) => (
                    <tr key={s.subject}>
                      <td className="py-2 px-3 font-semibold">{s.subject}</td>
                      <td className="py-2 px-3 text-right font-mono-nums">{s.totalMax}</td>
                      <td className="py-2 px-3 text-right font-mono-nums">
                        {s.average.toFixed(1)} ({s.averagePercentage.toFixed(1)}%)
                      </td>
                      <td className="py-2 px-3 text-right font-mono-nums font-semibold text-emerald-700 dark:text-emerald-400">
                        {s.highest}
                      </td>
                      <td className="py-2 px-3 text-right font-mono-nums font-semibold text-amber-700 dark:text-amber-400">
                        {s.lowest}
                      </td>
                      <td className="py-2 px-3 text-right font-mono-nums font-bold">
                        {s.passPercentage.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. Student Progress Line Chart */}
      {activeTab === 'progress' && selectedResult && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#0F2547] dark:text-slate-100">
                {t.studentProgress}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Overall percentage trend across tests in {activeClass.name}
              </p>
            </div>
            <select
              value={selectedResult.student.id}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-medium"
            >
              {studentResults.map((r) => (
                <option key={r.student.id} value={r.student.id}>
                  #{r.student.rollNumber} — {r.student.name}
                </option>
              ))}
            </select>
          </div>

          {progressHistory.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">No tests found for this student.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <div className="min-w-[360px]">
                  <svg
                    viewBox="0 0 560 220"
                    className="w-full h-56"
                    role="img"
                    aria-label="Student progress line chart"
                  >
                    {[0, 25, 50, 75, 100].map((tick) => {
                      const y = 175 - (tick / 100) * 145;
                      return (
                        <g key={tick}>
                          <line
                            x1={42}
                            y1={y}
                            x2={530}
                            y2={y}
                            stroke="currentColor"
                            className="text-slate-200 dark:text-slate-800"
                            strokeDasharray="3 3"
                          />
                          <text
                            x={36}
                            y={y + 4}
                            textAnchor="end"
                            className="fill-slate-400 text-[10px] font-mono-nums"
                          >
                            {tick}%
                          </text>
                        </g>
                      );
                    })}

                    {(() => {
                      const pts = progressHistory.map((item, idx) => {
                        const x =
                          progressHistory.length === 1
                            ? 286
                            : 66 + (idx / (progressHistory.length - 1)) * 440;
                        const y = 175 - (item.result.percentage / 100) * 145;
                        return { x, y, item };
                      });

                      const polyPoints = pts.map((p) => `${p.x},${p.y}`).join(' ');

                      return (
                        <>
                          {pts.length > 1 && (
                            <polyline
                              fill="none"
                              strokeWidth={3}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              points={polyPoints}
                              className="stroke-[#0F2547] dark:stroke-amber-400"
                            />
                          )}
                          {pts.map((p, idx) => (
                            <g key={p.item.test.id}>
                              <circle
                                cx={p.x}
                                cy={p.y}
                                r={5.5}
                                className="fill-[#B8860B] dark:fill-amber-400 stroke-white dark:stroke-slate-900"
                                strokeWidth={2}
                              />
                              <text
                                x={p.x}
                                y={p.y - 10}
                                textAnchor="middle"
                                className="fill-slate-800 dark:fill-slate-100 text-[11px] font-mono-nums font-bold"
                              >
                                {p.item.result.percentage.toFixed(1)}%
                              </text>
                              <text
                                x={p.x}
                                y={198}
                                textAnchor="middle"
                                className="fill-slate-600 dark:fill-slate-400 text-[10px]"
                              >
                                {p.item.test.name.length > 15
                                  ? `${p.item.test.name.slice(0, 14)}…`
                                  : p.item.test.name || `Test ${idx + 1}`}
                              </text>
                            </g>
                          ))}
                        </>
                      );
                    })()}
                  </svg>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500">
                    <tr>
                      <th className="py-2 px-3">{t.testName}</th>
                      <th className="py-2 px-3">{t.testDate}</th>
                      <th className="py-2 px-3 text-right">{t.totalMarks}</th>
                      <th className="py-2 px-3 text-right">{t.percentage}</th>
                      <th className="py-2 px-3 text-center">{t.grade}</th>
                      <th className="py-2 px-3 text-center">{t.position}</th>
                      <th className="py-2 px-3 text-center">{t.result}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {progressHistory.map(({ test, result }) => (
                      <tr key={test.id}>
                        <td className="py-2 px-3 font-medium">{test.name}</td>
                        <td className="py-2 px-3 font-mono-nums text-slate-500">
                          {test.date}
                        </td>
                        <td className="py-2 px-3 text-right font-mono-nums">
                          {result.isFullyAbsent
                            ? 'AB'
                            : `${result.totalObtained}/${result.totalMax}`}
                        </td>
                        <td className="py-2 px-3 text-right font-mono-nums font-semibold">
                          {result.percentage.toFixed(1)}%
                        </td>
                        <td className="py-2 px-3 text-center font-mono-nums font-bold">
                          {result.grade}
                        </td>
                        <td className="py-2 px-3 text-center font-mono-nums">
                          {formatOrdinal(result.position)}
                        </td>
                        <td
                          className={`py-2 px-3 text-center font-bold ${
                            result.passed
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-red-700 dark:text-red-400'
                          }`}
                        >
                          {result.passed ? t.pass : t.fail}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* 5. Print / Download All Report Cards (1 student per page) */}
      {activeTab === 'allCards' && (
        <div className="space-y-6">
          <div className="no-print rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {studentResults.length} report cards ready — strictly one student per A4 page.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  downloadAllReportCardsPdf(
                    studentResults,
                    activeClass,
                    activeTest,
                    settings
                  )
                }
                className="min-h-[44px] px-4 rounded-xl bg-[#0F2547] hover:bg-[#16325C] dark:bg-amber-500 dark:text-slate-950 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Download className="w-4 h-4" />
                <span>{t.downloadPdf}</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="min-h-[44px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Printer className="w-4 h-4" />
                <span>{t.print}</span>
              </button>
            </div>
          </div>

          <div className="space-y-6 print:space-y-0">
            {studentResults.map((res) => (
              <div key={res.student.id} className="print-page">
                <ReportCardSheet
                  result={res}
                  classroom={activeClass}
                  test={activeTest}
                  settings={settings}
                  t={t}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
