import React from 'react';
import {
  FileText,
  Edit3,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { AppSettings, Classroom, TestRecord } from '../types';
import { Translations } from '../i18n';
import { computeTestResults, formatOrdinal } from '../utils/calculations';

interface ResultsViewProps {
  classes: Classroom[];
  tests: TestRecord[];
  selectedTestId: string | null;
  settings: AppSettings;
  t: Translations;
  onSelectTest: (id: string) => void;
  onOpenMarks: (testId: string) => void;
  onOpenReports: (testId: string) => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  classes,
  tests,
  selectedTestId,
  settings,
  t,
  onSelectTest,
  onOpenMarks,
  onOpenReports,
}) => {
  const activeTest = tests.find((item) => item.id === selectedTestId) ?? tests[0] ?? null;
  const activeClass = activeTest
    ? classes.find((c) => c.id === activeTest.classId) ?? null
    : null;

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

  const sortedByRank = [...studentResults].sort((a, b) => {
    if (a.position !== null && b.position !== null) return a.position - b.position;
    if (a.position !== null) return -1;
    if (b.position !== null) return 1;
    return a.student.rollNumber.localeCompare(b.student.rollNumber);
  });

  const passedCount = studentResults.filter((r) => r.passed).length;
  const failedCount = studentResults.length - passedCount;
  const classAvg =
    studentResults.length > 0
      ? studentResults.reduce((acc, r) => acc + r.percentage, 0) / studentResults.length
      : 0;

  return (
    <div className="space-y-5">
      {/* Test Switcher + Header Actions */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={activeTest.id}
            onChange={(e) => onSelectTest(e.target.value)}
            aria-label="Select test"
            className="min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-semibold text-[#0F2547] dark:text-slate-100"
          >
            {tests.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.date})
              </option>
            ))}
          </select>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono-nums">
            {activeClass.name} · {t.passPercentage}: {activeTest.passPercentage}%
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenMarks(activeTest.id)}
            className="min-h-[44px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Edit3 className="w-4 h-4" />
            <span>{t.marksEntry}</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenReports(activeTest.id)}
            className="min-h-[44px] px-4 rounded-xl bg-[#0F2547] hover:bg-[#16325C] dark:bg-amber-500 dark:text-slate-950 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <FileText className="w-4 h-4" />
            <span>{t.reports}</span>
          </button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t.students}</p>
          <p className="text-2xl font-bold font-mono-nums text-[#0F2547] dark:text-slate-100 mt-1">
            {studentResults.length}
          </p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Class Average</p>
          <p className="text-2xl font-bold font-mono-nums text-[#0F2547] dark:text-amber-400 mt-1">
            {classAvg.toFixed(1)}%
          </p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t.pass}</p>
          <p className="text-2xl font-bold font-mono-nums text-emerald-700 dark:text-emerald-400 mt-1">
            {passedCount}
          </p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t.fail}</p>
          <p className="text-2xl font-bold font-mono-nums text-red-700 dark:text-red-400 mt-1">
            {failedCount}
          </p>
        </div>
      </div>

      {/* Student Rankings & Totals */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4">
        <h2 className="text-base sm:text-lg font-bold text-[#0F2547] dark:text-slate-100">
          {t.resultsSummary}
        </h2>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {sortedByRank.map((r) => (
            <div key={r.student.id} className="py-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                    <span className="font-mono-nums text-[#0F2547] dark:text-amber-400 mr-1.5">
                      #{r.student.rollNumber}
                    </span>
                    {r.student.name}
                  </p>
                </div>
                <span
                  className={`text-xs font-bold flex items-center gap-1 shrink-0 ${
                    r.passed
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-red-700 dark:text-red-400'
                  }`}
                >
                  {r.passed ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5" />
                  )}
                  <span>{r.passed ? t.pass : t.fail}</span>
                </span>
              </div>

              <p className="text-xs font-mono-nums text-slate-600 dark:text-slate-300">
                {t.totalMarks}: {r.isFullyAbsent ? 'AB' : `${r.totalObtained}/${r.totalMax}`} ·{' '}
                {r.percentage.toFixed(1)}% · {t.grade}: {r.grade} · {t.position}:{' '}
                {formatOrdinal(r.position)}
              </p>
            </div>
          ))}
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-2.5 px-3">{t.position}</th>
                <th className="py-2.5 px-3">{t.rollNumber}</th>
                <th className="py-2.5 px-3">{t.studentName}</th>
                <th className="py-2.5 px-3 text-right">{t.obtainedMarks}</th>
                <th className="py-2.5 px-3 text-right">{t.totalMarks}</th>
                <th className="py-2.5 px-3 text-right">{t.percentage}</th>
                <th className="py-2.5 px-3 text-center">{t.grade}</th>
                <th className="py-2.5 px-3 text-center">{t.result}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sortedByRank.map((r) => (
                <tr key={r.student.id}>
                  <td className="py-2.5 px-3 font-mono-nums font-bold text-[#0F2547] dark:text-amber-400">
                    {formatOrdinal(r.position)}
                  </td>
                  <td className="py-2.5 px-3 font-mono-nums">{r.student.rollNumber}</td>
                  <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100">
                    {r.student.name}
                  </td>
                  <td className="py-2.5 px-3 font-mono-nums text-right font-semibold">
                    {r.isFullyAbsent ? 'AB' : r.totalObtained}
                  </td>
                  <td className="py-2.5 px-3 font-mono-nums text-right text-slate-500">
                    {r.totalMax}
                  </td>
                  <td className="py-2.5 px-3 font-mono-nums text-right font-semibold">
                    {r.percentage.toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-3 font-mono-nums text-center font-bold">
                    {r.grade}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-bold ${
                        r.passed
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-red-700 dark:text-red-400'
                      }`}
                    >
                      {r.passed ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                      <span>{r.passed ? t.pass : t.fail}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Subject-wise Summary */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4">
        <h2 className="text-base sm:text-lg font-bold text-[#0F2547] dark:text-slate-100">
          {t.subjectAnalysis}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-2.5 px-3">{t.subjectLabel}</th>
                <th className="py-2.5 px-3 text-right">{t.totalMarks}</th>
                <th className="py-2.5 px-3 text-right">{t.average}</th>
                <th className="py-2.5 px-3 text-right">{t.highest}</th>
                <th className="py-2.5 px-3 text-right">{t.lowest}</th>
                <th className="py-2.5 px-3 text-right">{t.passRate}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {subjectStats.map((s) => (
                <tr key={s.subject}>
                  <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                    {s.subject}
                  </td>
                  <td className="py-2.5 px-3 font-mono-nums text-right text-slate-500">
                    {s.totalMax}
                  </td>
                  <td className="py-2.5 px-3 font-mono-nums text-right font-semibold">
                    {s.average.toFixed(1)} ({s.averagePercentage.toFixed(0)}%)
                  </td>
                  <td className="py-2.5 px-3 font-mono-nums text-right text-emerald-700 dark:text-emerald-400 font-semibold">
                    {s.highest}
                  </td>
                  <td className="py-2.5 px-3 font-mono-nums text-right text-amber-700 dark:text-amber-400 font-semibold">
                    {s.lowest}
                  </td>
                  <td className="py-2.5 px-3 font-mono-nums text-right font-bold">
                    {s.passPercentage.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Failed / Absent Students List */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-3">
        <h2 className="text-base sm:text-lg font-bold text-[#0F2547] dark:text-slate-100 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
          <span>{t.failedStudents}</span>
        </h2>

        {failedStudents.length === 0 ? (
          <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">
            {t.noFailedStudents}
          </p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {failedStudents.map((r) => (
              <div key={r.student.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  <span className="font-mono-nums text-[#0F2547] dark:text-amber-400 mr-2">
                    #{r.student.rollNumber}
                  </span>
                  {r.student.name}
                </p>
                <p className="text-xs font-medium text-red-700 dark:text-red-400">
                  {r.failedSubjects
                    .map((subj) => (r.absentSubjects.includes(subj) ? `${subj} (AB)` : subj))
                    .join(' · ')}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
