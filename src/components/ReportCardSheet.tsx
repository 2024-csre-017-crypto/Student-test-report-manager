import React from 'react';
import { AppSettings, Classroom, StudentResult, TestRecord } from '../types';
import { Translations } from '../i18n';
import { formatOrdinal } from '../utils/calculations';

interface ReportCardSheetProps {
  result: StudentResult;
  classroom: Classroom;
  test: TestRecord;
  settings: AppSettings;
  t: Translations;
}

export const ReportCardSheet: React.FC<ReportCardSheetProps> = ({
  result,
  classroom,
  test,
  settings,
  t,
}) => {
  const isUrdu = settings.language === 'ur';

  return (
    <article
      dir={isUrdu ? 'rtl' : 'ltr'}
      className={`bg-white text-slate-900 border border-slate-300 rounded-xl sm:rounded-none p-5 sm:p-8 shadow-sm print:shadow-none print:border-slate-400 ${
        isUrdu ? 'font-urdu' : ''
      }`}
    >
      {/* School Header */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b-2 border-[#0F2547]">
        <div className="flex items-center gap-3.5 min-w-0">
          {settings.schoolLogoDataUrl && (
            <img
              src={settings.schoolLogoDataUrl}
              alt={settings.schoolName || 'School Logo'}
              className="w-14 h-14 object-contain shrink-0"
              referrerPolicy="no-referrer"
            />
          )}
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-[#0F2547] leading-snug">
              {settings.schoolName || t.schoolName}
            </h2>
            <p className="text-xs sm:text-sm font-bold text-[#B8860B] tracking-wide">
              {t.reportCardTitle}
            </p>
          </div>
        </div>

        <div className="text-end shrink-0">
          <p className="text-sm font-bold text-[#0F2547]">{test.name}</p>
          <p className="text-xs text-slate-600 font-mono-nums">{test.date}</p>
        </div>
      </div>

      {/* Gold hairline accent */}
      <div className="h-0.5 bg-[#B8860B] mt-0.5 mb-5" />

      {/* Student Details Box */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-lg mb-5 text-xs sm:text-sm">
        <div>
          <span className="text-slate-500 block text-[11px] font-semibold">
            {t.studentName}
          </span>
          <span className="font-bold text-slate-900">{result.student.name}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[11px] font-semibold">
            {t.rollNumber}
          </span>
          <span className="font-bold font-mono-nums text-[#0F2547]">
            {result.student.rollNumber}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block text-[11px] font-semibold">
            {t.selectClass}
          </span>
          <span className="font-semibold text-slate-800">{classroom.name}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[11px] font-semibold">
            {result.student.fatherName ? t.fatherName : t.attendance}
          </span>
          <span className="font-semibold text-slate-800">
            {result.student.fatherName || result.attendance || '—'}
          </span>
        </div>
      </div>

      {/* Bordered Marks Table */}
      <div className="overflow-x-auto mb-5">
        <table className="w-full border-collapse border border-slate-300 text-xs sm:text-sm">
          <thead>
            <tr className="bg-[#0F2547] text-white">
              <th className="border border-slate-300 py-2 px-3 text-start">
                {t.subjectLabel}
              </th>
              <th className="border border-slate-300 py-2 px-3 text-end">
                {t.totalMarks}
              </th>
              <th className="border border-slate-300 py-2 px-3 text-end">
                {t.obtainedMarks}
              </th>
              <th className="border border-slate-300 py-2 px-3 text-end">
                {t.percentage}
              </th>
              <th className="border border-slate-300 py-2 px-3 text-center">
                {t.grade}
              </th>
            </tr>
          </thead>
          <tbody>
            {result.subjects.map((subj) => (
              <tr key={subj.subject}>
                <td className="border border-slate-300 py-2 px-3 font-medium">
                  {subj.subject}
                </td>
                <td className="border border-slate-300 py-2 px-3 text-end font-mono-nums">
                  {subj.total}
                </td>
                <td
                  className={`border border-slate-300 py-2 px-3 text-end font-mono-nums font-semibold ${
                    subj.obtained === 'ABSENT'
                      ? 'text-red-700'
                      : !subj.passed && subj.obtained !== null
                      ? 'text-red-700'
                      : 'text-slate-900'
                  }`}
                >
                  {subj.obtained === 'ABSENT'
                    ? isUrdu
                      ? 'غیر حاضر'
                      : 'AB'
                    : subj.obtained === null
                    ? '—'
                    : subj.obtained}
                </td>
                <td className="border border-slate-300 py-2 px-3 text-end font-mono-nums">
                  {subj.percentage === null ? '—' : `${subj.percentage.toFixed(1)}%`}
                </td>
                <td className="border border-slate-300 py-2 px-3 text-center font-mono-nums font-semibold">
                  {subj.grade}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 font-bold text-[#0F2547]">
              <td className="border border-slate-300 py-2 px-3">{t.totalMarks}</td>
              <td className="border border-slate-300 py-2 px-3 text-end font-mono-nums">
                {result.totalMax}
              </td>
              <td className="border border-slate-300 py-2 px-3 text-end font-mono-nums">
                {result.isFullyAbsent ? 'AB' : result.totalObtained}
              </td>
              <td className="border border-slate-300 py-2 px-3 text-end font-mono-nums">
                {result.percentage.toFixed(1)}%
              </td>
              <td className="border border-slate-300 py-2 px-3 text-center font-mono-nums">
                {result.grade}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Summary Boxes */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-center">
          <span className="block text-[11px] text-slate-500">{t.percentage}</span>
          <span className="text-base font-bold font-mono-nums text-[#0F2547]">
            {result.percentage.toFixed(1)}%
          </span>
        </div>
        <div className="border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-center">
          <span className="block text-[11px] text-slate-500">{t.grade}</span>
          <span className="text-base font-bold font-mono-nums text-[#0F2547]">
            {result.grade}
          </span>
        </div>
        <div className="border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-center">
          <span className="block text-[11px] text-slate-500">{t.position}</span>
          <span className="text-base font-bold font-mono-nums text-[#0F2547]">
            {formatOrdinal(result.position)}
          </span>
        </div>
        <div className="border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-center">
          <span className="block text-[11px] text-slate-500">{t.result}</span>
          <span
            className={`text-base font-bold ${
              result.passed ? 'text-emerald-700' : 'text-red-700'
            }`}
          >
            {result.passed ? t.pass : t.fail}
          </span>
        </div>
      </div>

      {/* Attendance & Remark */}
      {result.student.fatherName && result.attendance && (
        <p className="text-xs sm:text-sm mb-3 text-slate-700">
          <span className="font-semibold text-slate-500">{t.attendance}: </span>
          <span className="font-mono-nums font-semibold">{result.attendance}</span>
        </p>
      )}

      <div className="border border-slate-200 rounded-lg p-3 mb-8 bg-white">
        <span className="block text-[11px] font-bold text-[#0F2547] mb-1">
          {t.teacherRemark}
        </span>
        <p className="text-xs sm:text-sm text-slate-800 min-h-[24px]">
          {result.remark.trim() || '—'}
        </p>
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-2 gap-10 pt-4">
        <div className="text-center">
          <div className="border-t border-slate-400 pt-1.5">
            <p className="text-xs sm:text-sm font-bold text-[#0F2547]">
              {settings.classTeacherName || t.classTeacherSig}
            </p>
            <p className="text-[11px] text-slate-500">{t.classTeacherSig}</p>
          </div>
        </div>
        <div className="text-center">
          <div className="border-t border-slate-400 pt-1.5">
            <p className="text-xs sm:text-sm font-bold text-[#0F2547]">
              {settings.principalName || t.principalSig}
            </p>
            <p className="text-[11px] text-slate-500">{t.principalSig}</p>
          </div>
        </div>
      </div>
    </article>
  );
};
