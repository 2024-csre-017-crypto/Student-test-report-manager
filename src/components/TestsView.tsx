import React, { useState, useRef } from 'react';
import {
  Plus,
  Check,
  BarChart3,
  Trash2,
  Sparkles,
  AlertCircle,
  UserX,
} from 'lucide-react';
import {
  AppSettings,
  Classroom,
  MarkValue,
  TestRecord,
} from '../types';
import { Translations } from '../i18n';
import { computeTestResults, getTestSubjects } from '../utils/calculations';

interface TestsViewProps {
  classes: Classroom[];
  tests: TestRecord[];
  selectedTestId: string | null;
  initialClassIdForNew: string | null;
  settings: AppSettings;
  t: Translations;
  onSelectTest: (id: string) => void;
  onCreateTest: (test: TestRecord) => void;
  onUpdateTest: (test: TestRecord) => void;
  onDeleteTest: (id: string) => void;
  onOpenResults: (testId: string) => void;
  onGoToClasses: () => void;
}

export const TestsView: React.FC<TestsViewProps> = ({
  classes,
  tests,
  selectedTestId,
  initialClassIdForNew,
  settings,
  t,
  onSelectTest,
  onCreateTest,
  onUpdateTest,
  onDeleteTest,
  onOpenResults,
  onGoToClasses,
}) => {
  const [showCreateForm, setShowCreateForm] = useState(
    tests.length === 0 || Boolean(initialClassIdForNew)
  );
  const [newClassId, setNewClassId] = useState<string>(
    initialClassIdForNew || classes[0]?.id || ''
  );
  const [newTestName, setNewTestName] = useState('');
  const [newTestDate, setNewTestDate] = useState(new Date().toISOString().slice(0, 10));
  const [newPassPct, setNewPassPct] = useState(settings.defaultPassPercentage);
  const [newTotals, setNewTotals] = useState<Record<string, number>>({});
  const [savedNotice, setSavedNotice] = useState('');
  const [aiLoadingStudentId, setAiLoadingStudentId] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Refs for fast Enter / ArrowDown keyboard navigation across student mark fields
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const activeTest =
    tests.find((test) => test.id === selectedTestId) ?? tests[0] ?? null;
  const activeClass = activeTest
    ? classes.find((c) => c.id === activeTest.classId) ?? null
    : null;

  const selectedNewClass =
    classes.find((c) => c.id === newClassId) ?? classes[0] ?? null;

  const triggerSavedNotice = () => {
    setSavedNotice(t.autoSaved);
    window.setTimeout(() => {
      setSavedNotice((prev) => (prev === t.autoSaved ? '' : prev));
    }, 1500);
  };

  const handleCreateTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNewClass || !newTestName.trim()) return;
    const subjectTotals: Record<string, number> = {};
    for (const subj of selectedNewClass.subjects) {
      subjectTotals[subj] = Number(newTotals[subj]) > 0 ? Number(newTotals[subj]) : 100;
    }

    const created: TestRecord = {
      id: `test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: newTestName.trim(),
      date: newTestDate,
      classId: selectedNewClass.id,
      subjectTotals,
      passPercentage: Number(newPassPct) >= 0 ? Number(newPassPct) : 33,
      marks: {},
      remarks: {},
      attendance: {},
      createdAt: Date.now(),
    };

    onCreateTest(created);
    onSelectTest(created.id);
    setNewTestName('');
    setShowCreateForm(false);
    triggerSavedNotice();
  };

  const handleSubjectTotalChange = (subject: string, value: string) => {
    if (!activeTest) return;
    const num = Math.max(1, Number(value) || 1);
    onUpdateTest({
      ...activeTest,
      subjectTotals: {
        ...activeTest.subjectTotals,
        [subject]: num,
      },
    });
    triggerSavedNotice();
  };

  const handleMarkChange = (
    studentId: string,
    subject: string,
    rawValue: string
  ) => {
    if (!activeTest) return;
    const maxTotal = activeTest.subjectTotals[subject] ?? 100;
    let nextVal: MarkValue = null;

    const trimmed = rawValue.trim().toUpperCase();
    if (trimmed === '') {
      nextVal = null;
    } else if (trimmed === 'A' || trimmed === 'AB' || trimmed === 'ABSENT') {
      nextVal = 'ABSENT';
    } else {
      const parsed = Number(rawValue);
      if (Number.isNaN(parsed)) return;
      if (parsed < 0 || parsed > maxTotal) {
        return; // Validation: mark cannot be negative or exceed subject total
      }
      nextVal = parsed;
    }

    const prevStudentMarks = activeTest.marks[studentId] ?? {};
    onUpdateTest({
      ...activeTest,
      marks: {
        ...activeTest.marks,
        [studentId]: {
          ...prevStudentMarks,
          [subject]: nextVal,
        },
      },
    });
    triggerSavedNotice();
  };

  const handleToggleAbsent = (studentId: string, subject: string) => {
    if (!activeTest) return;
    const current = activeTest.marks[studentId]?.[subject] ?? null;
    const nextVal: MarkValue = current === 'ABSENT' ? null : 'ABSENT';
    const prevStudentMarks = activeTest.marks[studentId] ?? {};
    onUpdateTest({
      ...activeTest,
      marks: {
        ...activeTest.marks,
        [studentId]: {
          ...prevStudentMarks,
          [subject]: nextVal,
        },
      },
    });
    triggerSavedNotice();
  };

  const handleMarkStudentAllAbsent = (studentId: string, subjects: string[]) => {
    if (!activeTest) return;
    const allAlreadyAbsent = subjects.every(
      (subj) => activeTest.marks[studentId]?.[subj] === 'ABSENT'
    );
    const updatedRow: Record<string, MarkValue> = {};
    for (const subj of subjects) {
      updatedRow[subj] = allAlreadyAbsent ? null : 'ABSENT';
    }
    onUpdateTest({
      ...activeTest,
      marks: {
        ...activeTest.marks,
        [studentId]: updatedRow,
      },
    });
    triggerSavedNotice();
  };

  const handleRemarkChange = (studentId: string, remark: string) => {
    if (!activeTest) return;
    onUpdateTest({
      ...activeTest,
      remarks: { ...activeTest.remarks, [studentId]: remark },
    });
    triggerSavedNotice();
  };

  const handleAttendanceChange = (studentId: string, att: string) => {
    if (!activeTest) return;
    onUpdateTest({
      ...activeTest,
      attendance: { ...activeTest.attendance, [studentId]: att },
    });
    triggerSavedNotice();
  };

  const handleGenerateAiRemark = async (studentId: string) => {
    if (!activeTest || !activeClass) return;
    setAiError(null);
    setAiLoadingStudentId(studentId);
    try {
      const { studentResults } = computeTestResults(
        activeTest,
        activeClass,
        settings.gradingScale
      );
      const stuResult = studentResults.find((r) => r.student.id === studentId);
      if (!stuResult) return;

      const priorTests = tests
        .filter((item) => item.classId === activeClass.id && item.date < activeTest.date)
        .sort((a, b) => a.date.localeCompare(b.date));

      let trend = '';
      if (priorTests.length > 0) {
        const lastTest = priorTests[priorTests.length - 1];
        const lastRes = computeTestResults(
          lastTest,
          activeClass,
          settings.gradingScale
        ).studentResults.find((r) => r.student.id === studentId);
        if (lastRes) {
          const diff = stuResult.percentage - lastRes.percentage;
          trend =
            diff > 2
              ? `Improved by ${diff.toFixed(1)}% compared to previous test`
              : diff < -2
              ? `Dropped by ${Math.abs(diff).toFixed(1)}% compared to previous test`
              : `Consistent with previous test (${lastRes.percentage.toFixed(1)}%)`;
        }
      }

      const response = await fetch('/api/remarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjects: stuResult.subjects.map((s) => ({
            name: s.subject,
            obtained: s.obtained,
            total: s.total,
            percentage: s.percentage !== null ? Number(s.percentage.toFixed(1)) : null,
          })),
          overallPercentage: Number(stuResult.percentage.toFixed(1)),
          result: stuResult.passed ? 'PASS' : 'FAIL',
          trend,
          language: settings.language,
        }),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || 'Could not generate AI remark.');
      }

      handleRemarkChange(studentId, json.remark);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Failed to generate AI remark.');
    } finally {
      setAiLoadingStudentId(null);
    }
  };

  const handleKeyDownNavigation = (
    e: React.KeyboardEvent<HTMLInputElement>,
    studentIndex: number,
    subjectIndex: number,
    studentsList: Classroom['students'],
    subjectsList: string[]
  ) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextStuIdx = studentIndex + 1;
      if (nextStuIdx < studentsList.length) {
        const key = `${studentsList[nextStuIdx].id}::${subjectsList[subjectIndex]}`;
        inputRefs.current[key]?.focus();
      } else if (subjectIndex + 1 < subjectsList.length && studentsList.length > 0) {
        const key = `${studentsList[0].id}::${subjectsList[subjectIndex + 1]}`;
        inputRefs.current[key]?.focus();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevStuIdx = studentIndex - 1;
      if (prevStuIdx >= 0) {
        const key = `${studentsList[prevStuIdx].id}::${subjectsList[subjectIndex]}`;
        inputRefs.current[key]?.focus();
      }
    }
  };

  if (classes.length === 0) {
    return (
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 text-center space-y-3">
        <p className="text-sm text-slate-600 dark:text-slate-300">{t.noClassesYet}</p>
        <button
          type="button"
          onClick={onGoToClasses}
          className="min-h-[44px] px-5 rounded-xl bg-[#0F2547] text-white text-sm font-semibold cursor-pointer"
        >
          {t.addClass}
        </button>
      </div>
    );
  }

  const testSubjects =
    activeTest && activeClass ? getTestSubjects(activeTest, activeClass) : [];

  return (
    <div className="space-y-5">
      {/* Test Switcher & Create Button */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {tests.map((testItem) => {
              const selected = activeTest?.id === testItem.id;
              return (
                <button
                  key={testItem.id}
                  type="button"
                  onClick={() => {
                    onSelectTest(testItem.id);
                    setShowCreateForm(false);
                  }}
                  className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    selected
                      ? 'bg-[#0F2547] text-white dark:bg-amber-500 dark:text-slate-950'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200'
                  }`}
                >
                  {testItem.name}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setShowCreateForm((prev) => !prev)}
            className="min-h-[44px] px-4 py-2 rounded-xl border border-[#0F2547] dark:border-amber-400 text-[#0F2547] dark:text-amber-400 text-sm font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>{t.newTest}</span>
          </button>
        </div>

        {/* New Test Form */}
        {showCreateForm && (
          <form
            onSubmit={handleCreateTest}
            className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {t.selectClass}
                </label>
                <select
                  value={selectedNewClass?.id ?? ''}
                  onChange={(e) => setNewClassId(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.students.length})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {t.testName}
                </label>
                <input
                  type="text"
                  value={newTestName}
                  onChange={(e) => setNewTestName(e.target.value)}
                  placeholder="e.g. Monthly Test March"
                  required
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {t.testDate}
                </label>
                <input
                  type="date"
                  value={newTestDate}
                  onChange={(e) => setNewTestDate(e.target.value)}
                  required
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {t.passPercentage}
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={newPassPct}
                  onChange={(e) => setNewPassPct(Number(e.target.value))}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-nums"
                />
              </div>
            </div>

            {selectedNewClass && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {t.subjectTotals}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {selectedNewClass.subjects.map((subj) => (
                    <div key={subj}>
                      <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1 truncate">
                        {subj}
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={newTotals[subj] ?? 100}
                        onChange={(e) =>
                          setNewTotals((prev) => ({
                            ...prev,
                            [subj]: Number(e.target.value),
                          }))
                        }
                        className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-nums"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              {tests.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="min-h-[44px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-medium cursor-pointer"
                >
                  {t.cancel}
                </button>
              )}
              <button
                type="submit"
                className="min-h-[44px] px-5 rounded-xl bg-[#0F2547] hover:bg-[#16325C] dark:bg-amber-500 dark:text-slate-950 text-white text-sm font-semibold cursor-pointer"
              >
                {t.save}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Active Test Marks Entry */}
      {activeTest && activeClass && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold text-[#0F2547] dark:text-slate-100">
                  {activeTest.name}
                </h2>
                {savedNotice && (
                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    {savedNotice}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono-nums mt-0.5">
                {activeClass.name} · {activeTest.date} · {t.passPercentage}: {activeTest.passPercentage}%
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenResults(activeTest.id)}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#0F2547] hover:bg-[#16325C] dark:bg-amber-500 dark:text-slate-950 text-white text-sm font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <BarChart3 className="w-4 h-4" />
                <span>{t.viewResults}</span>
              </button>
              <button
                type="button"
                onClick={() => onDeleteTest(activeTest.id)}
                aria-label="Delete test"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Subject Totals Quick Editor */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            {testSubjects.map((subj) => (
              <div key={subj}>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 truncate mb-1">
                  {subj} Total
                </label>
                <input
                  type="number"
                  min={1}
                  value={activeTest.subjectTotals[subj] ?? 100}
                  onChange={(e) => handleSubjectTotalChange(subj, e.target.value)}
                  className="w-full min-h-[40px] px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono-nums font-semibold"
                />
              </div>
            ))}
          </div>

          {aiError && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{aiError}</span>
            </div>
          )}

          {activeClass.students.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">
              No students in {activeClass.name}. Add students on the Classes page first.
            </p>
          ) : (
            <>
              {/* Mobile Fast Card-Based Marks Entry */}
              <div className="md:hidden space-y-3">
                {activeClass.students.map((stu, stuIdx) => {
                  const isAllAbsent =
                    testSubjects.length > 0 &&
                    testSubjects.every((s) => activeTest.marks[stu.id]?.[s] === 'ABSENT');
                  return (
                    <div
                      key={stu.id}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                            <span className="font-mono-nums text-[#0F2547] dark:text-amber-400 mr-1.5">
                              #{stu.rollNumber}
                            </span>
                            {stu.name}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleMarkStudentAllAbsent(stu.id, testSubjects)}
                          className={`min-h-[40px] px-3 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                            isAllAbsent
                              ? 'bg-red-600 text-white'
                              : 'border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <UserX className="w-3.5 h-3.5" />
                          <span>{t.absent}</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        {testSubjects.map((subj, subjIdx) => {
                          const val = activeTest.marks[stu.id]?.[subj] ?? null;
                          const maxTotal = activeTest.subjectTotals[subj] ?? 100;
                          const isAb = val === 'ABSENT';
                          return (
                            <div key={subj} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                                  {subj}
                                </span>
                                <span className="font-mono-nums text-slate-400">
                                  /{maxTotal}
                                </span>
                              </div>
                              <div className="flex gap-1">
                                <input
                                  ref={(el) => {
                                    inputRefs.current[`mobile-${stu.id}::${subj}`] = el;
                                  }}
                                  type={isAb ? 'text' : 'number'}
                                  inputMode="decimal"
                                  min={0}
                                  max={maxTotal}
                                  value={isAb ? 'AB' : val === null ? '' : String(val)}
                                  readOnly={isAb}
                                  placeholder="—"
                                  onChange={(e) =>
                                    handleMarkChange(stu.id, subj, e.target.value)
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === 'ArrowDown') {
                                      e.preventDefault();
                                      const nextStu = activeClass.students[stuIdx + 1];
                                      if (nextStu) {
                                        inputRefs.current[
                                          `mobile-${nextStu.id}::${subj}`
                                        ]?.focus();
                                      } else if (testSubjects[subjIdx + 1]) {
                                        const firstStu = activeClass.students[0];
                                        if (firstStu) {
                                          inputRefs.current[
                                            `mobile-${firstStu.id}::${testSubjects[subjIdx + 1]}`
                                          ]?.focus();
                                        }
                                      }
                                    }
                                  }}
                                  className={`w-full min-h-[44px] px-2.5 rounded-lg border text-sm font-mono-nums text-center ${
                                    isAb
                                      ? 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 font-bold'
                                      : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700'
                                  }`}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleToggleAbsent(stu.id, subj)}
                                  title="Toggle Absent"
                                  className={`min-h-[44px] min-w-[40px] rounded-lg text-xs font-bold cursor-pointer ${
                                    isAb
                                      ? 'bg-red-600 text-white'
                                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                  }`}
                                >
                                  AB
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Mobile Attendance + Remark */}
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <input
                          type="text"
                          value={activeTest.attendance?.[stu.id] ?? ''}
                          onChange={(e) => handleAttendanceChange(stu.id, e.target.value)}
                          placeholder={t.attendance}
                          className="col-span-1 min-h-[44px] px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono-nums"
                        />
                        <div className="col-span-2 flex gap-1">
                          <input
                            type="text"
                            value={activeTest.remarks?.[stu.id] ?? ''}
                            onChange={(e) => handleRemarkChange(stu.id, e.target.value)}
                            placeholder={t.teacherRemark}
                            className="flex-1 min-h-[44px] px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                          />
                          {settings.aiRemarksEnabled && (
                            <button
                              type="button"
                              disabled={aiLoadingStudentId === stu.id}
                              onClick={() => handleGenerateAiRemark(stu.id)}
                              title={t.writeRemarkAi}
                              className="min-h-[44px] min-w-[44px] rounded-lg bg-[#0F2547] dark:bg-amber-500 text-white dark:text-slate-950 flex items-center justify-center cursor-pointer disabled:opacity-50"
                            >
                              <Sparkles className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Fast Spreadsheet Marks-Entry Grid */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      <th className="py-2.5 px-2.5 sticky left-0 bg-white dark:bg-slate-900 z-10">
                        {t.rollNumber}
                      </th>
                      <th className="py-2.5 px-2.5 min-w-[160px]">{t.studentName}</th>
                      {testSubjects.map((subj) => (
                        <th key={subj} className="py-2.5 px-2 text-center min-w-[115px]">
                          <div>{subj}</div>
                          <div className="text-[11px] font-mono-nums text-slate-400">
                            /{activeTest.subjectTotals[subj] ?? 100}
                          </div>
                        </th>
                      ))}
                      <th className="py-2.5 px-2 text-center">{t.absent}</th>
                      <th className="py-2.5 px-2 min-w-[90px]">{t.attendance}</th>
                      <th className="py-2.5 px-2 min-w-[200px]">{t.teacherRemark}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {activeClass.students.map((stu, stuIdx) => {
                      const isAllAbsent =
                        testSubjects.length > 0 &&
                        testSubjects.every(
                          (s) => activeTest.marks[stu.id]?.[s] === 'ABSENT'
                        );
                      return (
                        <tr key={stu.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                          <td className="py-2 px-2.5 font-mono-nums font-semibold text-[#0F2547] dark:text-amber-400 sticky left-0 bg-white dark:bg-slate-900">
                            {stu.rollNumber}
                          </td>
                          <td className="py-2 px-2.5 font-medium text-slate-900 dark:text-slate-100">
                            {stu.name}
                          </td>
                          {testSubjects.map((subj, subjIdx) => {
                            const val = activeTest.marks[stu.id]?.[subj] ?? null;
                            const maxTotal = activeTest.subjectTotals[subj] ?? 100;
                            const isAb = val === 'ABSENT';
                            return (
                              <td key={subj} className="py-1.5 px-1.5">
                                <div className="flex items-center gap-1">
                                  <input
                                    ref={(el) => {
                                      inputRefs.current[`${stu.id}::${subj}`] = el;
                                    }}
                                    type={isAb ? 'text' : 'number'}
                                    min={0}
                                    max={maxTotal}
                                    value={isAb ? 'AB' : val === null ? '' : String(val)}
                                    readOnly={isAb}
                                    placeholder="—"
                                    onChange={(e) =>
                                      handleMarkChange(stu.id, subj, e.target.value)
                                    }
                                    onKeyDown={(e) =>
                                      handleKeyDownNavigation(
                                        e,
                                        stuIdx,
                                        subjIdx,
                                        activeClass.students,
                                        testSubjects
                                      )
                                    }
                                    className={`w-full min-h-[40px] px-2 rounded-lg border text-sm font-mono-nums text-center ${
                                      isAb
                                        ? 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 font-bold'
                                        : 'bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700'
                                    }`}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleToggleAbsent(stu.id, subj)}
                                    title="Mark Absent"
                                    className={`min-h-[40px] min-w-[32px] rounded-lg text-[11px] font-bold cursor-pointer ${
                                      isAb
                                        ? 'bg-red-600 text-white'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                                  >
                                    AB
                                  </button>
                                </div>
                              </td>
                            );
                          })}
                          <td className="py-1.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                handleMarkStudentAllAbsent(stu.id, testSubjects)
                              }
                              className={`min-h-[40px] px-2.5 rounded-lg text-xs font-semibold cursor-pointer ${
                                isAllAbsent
                                  ? 'bg-red-600 text-white'
                                  : 'border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              All AB
                            </button>
                          </td>
                          <td className="py-1.5 px-1.5">
                            <input
                              type="text"
                              value={activeTest.attendance?.[stu.id] ?? ''}
                              onChange={(e) =>
                                handleAttendanceChange(stu.id, e.target.value)
                              }
                              placeholder="22/24"
                              className="w-full min-h-[40px] px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono-nums"
                            />
                          </td>
                          <td className="py-1.5 px-1.5">
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={activeTest.remarks?.[stu.id] ?? ''}
                                onChange={(e) =>
                                  handleRemarkChange(stu.id, e.target.value)
                                }
                                placeholder={t.teacherRemark}
                                className="flex-1 min-h-[40px] px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                              />
                              {settings.aiRemarksEnabled && (
                                <button
                                  type="button"
                                  disabled={aiLoadingStudentId === stu.id}
                                  onClick={() => handleGenerateAiRemark(stu.id)}
                                  title={t.writeRemarkAi}
                                  className="min-h-[40px] px-2.5 rounded-lg bg-[#0F2547] dark:bg-amber-500 text-white dark:text-slate-950 text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                                >
                                  <Sparkles className="w-3.5 h-3.5" />
                                  <span>
                                    {aiLoadingStudentId === stu.id
                                      ? '...'
                                      : t.writeRemarkAi}
                                  </span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
