import React, { useState } from 'react';
import { Plus, ChevronRight, Users, ClipboardList, Database, BarChart3, Search, X } from 'lucide-react';
import { AppData, Classroom, TestRecord } from '../types';
import { Translations } from '../i18n';
import { computeTestResults } from '../utils/calculations';

interface HomeViewProps {
  data: AppData;
  t: Translations;
  onNewTest: (classId?: string) => void;
  onOpenClass: (classId: string) => void;
  onOpenTestMarks: (testId: string) => void;
  onOpenTestResults: (testId: string) => void;
  onOpenClassesTab: () => void;
  onLoadDemoData: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  data,
  t,
  onNewTest,
  onOpenClass,
  onOpenTestMarks,
  onOpenTestResults,
  onOpenClassesTab,
  onLoadDemoData,
}) => {
  const isUrdu = data.settings.language === 'ur';
  const [searchQuery, setSearchQuery] = useState('');

  const sortedTests = [...data.tests].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt
  );

  const getClassById = (id: string): Classroom | undefined =>
    data.classes.find((c) => c.id === id);

  const trimmedQuery = searchQuery.trim().toLowerCase();
  const matchingStudents = trimmedQuery
    ? data.classes.flatMap((cls) =>
        cls.students
          .filter(
            (stu) =>
              stu.name.toLowerCase().includes(trimmedQuery) ||
              stu.rollNumber.toLowerCase().includes(trimmedQuery)
          )
          .map((stu) => ({ stu, cls }))
      )
    : [];

  return (
    <div className="space-y-6">
      {/* Device-local storage notice + School header card */}
      <section className="rounded-2xl bg-[#0F2547] text-white p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              {data.settings.schoolLogoDataUrl && (
                <img
                  src={data.settings.schoolLogoDataUrl}
                  alt={data.settings.schoolName || 'School Logo'}
                  className="w-11 h-11 rounded-xl object-contain bg-white p-1 shrink-0"
                  referrerPolicy="no-referrer"
                />
              )}
              <div>
                <h1
                  className={`text-xl sm:text-2xl font-bold tracking-tight ${
                    isUrdu ? 'font-urdu' : ''
                  }`}
                  style={{ textWrap: 'balance' }}
                >
                  {data.settings.schoolName || t.appName}
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                  {t.localNotice}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onNewTest()}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>{t.newTest}</span>
            </button>

            {data.classes.length === 0 && (
              <button
                type="button"
                onClick={onLoadDemoData}
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-medium text-sm flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Database className="w-4 h-4 text-amber-400" />
                <span>{t.loadDemoData}</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Student Search Bar */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 sm:p-4 space-y-3">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute start-3.5 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchStudentsPlaceholder}
            aria-label={t.searchStudentsPlaceholder}
            className={`w-full min-h-[44px] ps-10 pe-11 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F2547] dark:focus:ring-amber-400 ${
              isUrdu ? 'font-urdu' : ''
            }`}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute end-1 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {trimmedQuery && (
          <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
            {matchingStudents.length === 0 ? (
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 py-3 text-center">
                {t.noMatchingStudents}
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
                {matchingStudents.map(({ stu, cls }) => (
                  <button
                    key={`${cls.id}-${stu.id}`}
                    type="button"
                    onClick={() => onOpenClass(cls.id)}
                    className="w-full min-h-[48px] py-2.5 px-1 flex items-center justify-between gap-3 text-start hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors cursor-pointer"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        <span className="font-mono-nums text-[#0F2547] dark:text-amber-400 me-2">
                          #{stu.rollNumber}
                        </span>
                        {stu.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {[cls.name, stu.fatherName, stu.parentPhone]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Classes Section */}
        <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className={`text-base sm:text-lg font-bold text-[#0F2547] dark:text-slate-100 flex items-center gap-2 ${isUrdu ? 'font-urdu' : ''}`}>
              <Users className="w-5 h-5 text-[#B8860B] dark:text-amber-400" />
              <span>{t.classes}</span>
            </h2>
            <button
              type="button"
              onClick={onOpenClassesTab}
              className="min-h-[44px] px-3 text-sm font-semibold text-[#0F2547] dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <span>{t.addClass}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {data.classes.length === 0 ? (
            <div className="py-8 px-4 text-center rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
              <p className="text-sm text-slate-600 dark:text-slate-400">{t.noClassesYet}</p>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={onOpenClassesTab}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-[#0F2547] text-white text-sm font-semibold cursor-pointer"
                >
                  {t.addClass}
                </button>
                <button
                  type="button"
                  onClick={onLoadDemoData}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium cursor-pointer"
                >
                  {t.loadDemoData}
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.classes.map((cls) => (
                <div
                  key={cls.id}
                  className="py-3 first:pt-1 last:pb-1 flex items-center justify-between gap-3"
                >
                  <button
                    type="button"
                    onClick={() => onOpenClass(cls.id)}
                    className="min-h-[44px] flex-1 text-start flex flex-col justify-center cursor-pointer"
                  >
                    <span className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100">
                      {cls.name}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono-nums mt-0.5">
                      {cls.students.length} {t.studentsCount} · {cls.subjects.length} {t.subjectsCount}
                    </span>
                  </button>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onNewTest(cls.id)}
                      className="min-h-[44px] px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-[#0F2547] dark:text-amber-400 cursor-pointer whitespace-nowrap"
                    >
                      + {t.newTest}
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenClass(cls.id)}
                      aria-label={`Open ${cls.name}`}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-[#0F2547] dark:text-slate-400 dark:hover:text-white cursor-pointer"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Latest Tests Section */}
        <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className={`text-base sm:text-lg font-bold text-[#0F2547] dark:text-slate-100 flex items-center gap-2 ${isUrdu ? 'font-urdu' : ''}`}>
              <ClipboardList className="w-5 h-5 text-[#B8860B] dark:text-amber-400" />
              <span>{t.latestTests}</span>
            </h2>
            {data.classes.length > 0 && (
              <button
                type="button"
                onClick={onLoadDemoData}
                className="min-h-[44px] px-3 text-xs font-medium text-slate-500 hover:text-[#0F2547] dark:text-slate-400 dark:hover:text-amber-400 cursor-pointer whitespace-nowrap"
              >
                {t.loadDemoData}
              </button>
            )}
          </div>

          {sortedTests.length === 0 ? (
            <div className="py-8 px-4 text-center rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-dashed border-slate-200 dark:border-slate-800">
              <p className="text-sm text-slate-600 dark:text-slate-400">{t.noTestsYet}</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {sortedTests.slice(0, 6).map((test: TestRecord) => {
                const cls = getClassById(test.classId);
                let passSummary = '';
                if (cls && cls.students.length > 0) {
                  const { studentResults } = computeTestResults(
                    test,
                    cls,
                    data.settings.gradingScale
                  );
                  const passedCount = studentResults.filter((r) => r.passed).length;
                  passSummary = `${passedCount}/${studentResults.length} ${t.pass}`;
                }

                return (
                  <div
                    key={test.id}
                    className="py-3 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {test.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono-nums mt-0.5">
                        {cls?.name ?? 'Unknown Class'} · {test.date}
                        {passSummary ? ` · ${passSummary}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onOpenTestMarks(test.id)}
                        className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap"
                      >
                        {t.marksEntry}
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenTestResults(test.id)}
                        className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0F2547] hover:bg-[#16325C] dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <BarChart3 className="w-3.5 h-3.5" />
                        <span>{t.viewResults}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
