import React, { useState, useRef } from 'react';
import {
  Plus,
  Trash2,
  Edit3,
  Upload,
  Download,
  X,
  Check,
  AlertCircle,
  BookOpen,
  Search,
} from 'lucide-react';
import { Classroom, Student } from '../types';
import { Translations } from '../i18n';
import {
  downloadStudentTemplateCsv,
  parseStudentImportFile,
  StudentImportResult,
} from '../utils/csvImport';

interface ClassesViewProps {
  classes: Classroom[];
  selectedClassId: string | null;
  onSelectClass: (id: string) => void;
  onCreateClass: (name: string, subjects: string[]) => string;
  onUpdateClass: (updated: Classroom) => void;
  onDeleteClass: (id: string) => void;
  t: Translations;
}

export const ClassesView: React.FC<ClassesViewProps> = ({
  classes,
  selectedClassId,
  onSelectClass,
  onCreateClass,
  onUpdateClass,
  onDeleteClass,
  t,
}) => {
  const activeClass =
    classes.find((c) => c.id === selectedClassId) ?? classes[0] ?? null;

  // Create class state
  const [showNewClassForm, setShowNewClassForm] = useState(classes.length === 0);
  const [newClassName, setNewClassName] = useState('');
  const [newClassSubjectsText, setNewClassSubjectsText] = useState(
    'English, Mathematics, Science, Urdu'
  );

  // Add subject state
  const [subjectInput, setSubjectInput] = useState('');

  // Student add/edit form state
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [stuRoll, setStuRoll] = useState('');
  const [stuName, setStuName] = useState('');
  const [stuFather, setStuFather] = useState('');
  const [stuPhone, setStuPhone] = useState('');
  const [stuError, setStuError] = useState('');

  // CSV / Excel import state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importPreview, setImportPreview] = useState<StudentImportResult | null>(null);
  const [importFileName, setImportFileName] = useState('');

  // Edit class name inline
  const [editingClassName, setEditingClassName] = useState(false);
  const [classNameDraft, setClassNameDraft] = useState('');

  // Student search filter
  const [studentSearch, setStudentSearch] = useState('');

  const trimmedStudentSearch = studentSearch.trim().toLowerCase();
  const filteredStudents = activeClass
    ? trimmedStudentSearch
      ? activeClass.students.filter(
          (stu) =>
            stu.name.toLowerCase().includes(trimmedStudentSearch) ||
            stu.rollNumber.toLowerCase().includes(trimmedStudentSearch)
        )
      : activeClass.students
    : [];

  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newClassName.trim();
    if (!trimmed) return;
    const subjects = newClassSubjectsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const createdId = onCreateClass(
      trimmed,
      subjects.length > 0 ? subjects : ['English', 'Mathematics']
    );
    onSelectClass(createdId);
    setNewClassName('');
    setShowNewClassForm(false);
  };

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClass) return;
    const subj = subjectInput.trim();
    if (!subj) return;
    if (activeClass.subjects.some((s) => s.toLowerCase() === subj.toLowerCase())) {
      setSubjectInput('');
      return;
    }
    onUpdateClass({
      ...activeClass,
      subjects: [...activeClass.subjects, subj],
    });
    setSubjectInput('');
  };

  const handleRemoveSubject = (subj: string) => {
    if (!activeClass) return;
    onUpdateClass({
      ...activeClass,
      subjects: activeClass.subjects.filter((s) => s !== subj),
    });
  };

  const openAddStudent = () => {
    setEditingStudent(null);
    setStuRoll('');
    setStuName('');
    setStuFather('');
    setStuPhone('');
    setStuError('');
    setShowStudentForm(true);
  };

  const openEditStudent = (stu: Student) => {
    setEditingStudent(stu);
    setStuRoll(stu.rollNumber);
    setStuName(stu.name);
    setStuFather(stu.fatherName ?? '');
    setStuPhone(stu.parentPhone ?? '');
    setStuError('');
    setShowStudentForm(true);
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClass) return;
    const roll = stuRoll.trim();
    const name = stuName.trim();
    if (!roll) {
      setStuError('Roll number is required.');
      return;
    }
    if (!name) {
      setStuError('Student name is required.');
      return;
    }

    const duplicate = activeClass.students.find(
      (s) =>
        s.rollNumber.trim().toLowerCase() === roll.toLowerCase() &&
        s.id !== editingStudent?.id
    );
    if (duplicate) {
      setStuError(`Roll number "${roll}" already exists in this class.`);
      return;
    }

    if (editingStudent) {
      onUpdateClass({
        ...activeClass,
        students: activeClass.students.map((s) =>
          s.id === editingStudent.id
            ? {
                ...s,
                rollNumber: roll,
                name,
                fatherName: stuFather.trim() || undefined,
                parentPhone: stuPhone.trim() || undefined,
              }
            : s
        ),
      });
    } else {
      const newStu: Student = {
        id: `stu-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        rollNumber: roll,
        name,
        fatherName: stuFather.trim() || undefined,
        parentPhone: stuPhone.trim() || undefined,
      };
      onUpdateClass({
        ...activeClass,
        students: [...activeClass.students, newStu],
      });
    }
    setShowStudentForm(false);
    setEditingStudent(null);
  };

  const handleDeleteStudent = (studentId: string) => {
    if (!activeClass) return;
    onUpdateClass({
      ...activeClass,
      students: activeClass.students.filter((s) => s.id !== studentId),
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeClass) return;
    setImportFileName(file.name);
    const result = await parseStudentImportFile(file, activeClass.students);
    setImportPreview(result);
    e.target.value = '';
  };

  const handleConfirmImport = () => {
    if (!activeClass || !importPreview || importPreview.validRows.length === 0) return;
    const newStudents: Student[] = importPreview.validRows.map((row, idx) => ({
      id: `stu-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
      rollNumber: row.rollNumber,
      name: row.name,
      fatherName: row.fatherName,
      parentPhone: row.parentPhone,
    }));
    onUpdateClass({
      ...activeClass,
      students: [...activeClass.students, ...newStudents],
    });
    setImportPreview(null);
    setImportFileName('');
  };

  return (
    <div className="space-y-5">
      {/* Class Switcher & Add Class Bar */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {classes.map((cls) => {
              const selected = activeClass?.id === cls.id;
              return (
                <button
                  key={cls.id}
                  type="button"
                  onClick={() => {
                    onSelectClass(cls.id);
                    setImportPreview(null);
                    setStudentSearch('');
                  }}
                  className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    selected
                      ? 'bg-[#0F2547] text-white dark:bg-amber-500 dark:text-slate-950'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {cls.name}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setShowNewClassForm((prev) => !prev)}
            className="min-h-[44px] px-4 py-2 rounded-xl border border-[#0F2547] dark:border-amber-400 text-[#0F2547] dark:text-amber-400 text-sm font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>{t.addClass}</span>
          </button>
        </div>

        {showNewClassForm && (
          <form
            onSubmit={handleCreateClass}
            className="pt-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
          >
            <div className="sm:col-span-4">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {t.className}
              </label>
              <input
                type="text"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                placeholder="e.g. Grade 9-A"
                required
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="sm:col-span-5">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {t.subjects} (comma separated)
              </label>
              <input
                type="text"
                value={newClassSubjectsText}
                onChange={(e) => setNewClassSubjectsText(e.target.value)}
                placeholder="English, Math, Science, Urdu"
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="sm:col-span-3 flex items-center gap-2">
              <button
                type="submit"
                className="flex-1 min-h-[44px] px-4 rounded-xl bg-[#0F2547] hover:bg-[#16325C] dark:bg-amber-500 dark:text-slate-950 text-white text-sm font-semibold cursor-pointer"
              >
                {t.save}
              </button>
              {classes.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowNewClassForm(false)}
                  className="min-h-[44px] min-w-[44px] rounded-xl border border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 cursor-pointer"
                  aria-label="Cancel"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </form>
        )}
      </div>

      {activeClass && (
        <>
          {/* Class Header + Subjects */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {editingClassName ? (
                <div className="flex items-center gap-2 flex-1 max-w-sm">
                  <input
                    type="text"
                    value={classNameDraft}
                    onChange={(e) => setClassNameDraft(e.target.value)}
                    className="flex-1 min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (classNameDraft.trim()) {
                        onUpdateClass({ ...activeClass, name: classNameDraft.trim() });
                      }
                      setEditingClassName(false);
                    }}
                    className="min-h-[44px] min-w-[44px] rounded-xl bg-[#0F2547] text-white flex items-center justify-center cursor-pointer"
                    aria-label="Save class name"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-bold text-[#0F2547] dark:text-slate-100">
                    {activeClass.name}
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      setClassNameDraft(activeClass.name);
                      setEditingClassName(true);
                    }}
                    aria-label="Edit class name"
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-[#0F2547] dark:text-slate-400 dark:hover:text-white cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => onDeleteClass(activeClass.id)}
                className="min-h-[44px] px-3 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>{t.delete}</span>
              </button>
            </div>

            {/* Subjects Manager */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <BookOpen className="w-4 h-4 text-[#B8860B] dark:text-amber-400" />
                <span>{t.subjects}</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {activeClass.subjects.map((subj) => (
                  <div
                    key={subj}
                    className="min-h-[40px] pl-3 pr-1.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center gap-1.5 text-sm font-medium text-slate-800 dark:text-slate-200"
                  >
                    <span>{subj}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubject(subj)}
                      aria-label={`Remove ${subj}`}
                      className="min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg text-slate-500 hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddSubject} className="flex gap-2 max-w-md pt-1">
                <input
                  type="text"
                  value={subjectInput}
                  onChange={(e) => setSubjectInput(e.target.value)}
                  placeholder="New subject (e.g. Physics)"
                  className="flex-1 min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100"
                />
                <button
                  type="submit"
                  className="min-h-[44px] px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-sm font-semibold cursor-pointer whitespace-nowrap"
                >
                  {t.addSubject}
                </button>
              </form>
            </div>
          </div>

          {/* Students & Import Section */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#0F2547] dark:text-slate-100">
                  {t.students} ({activeClass.students.length})
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={downloadStudentTemplateCsv}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-4 h-4" />
                  <span>{t.downloadTemplate}</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl border border-[#0F2547] dark:border-amber-400 text-[#0F2547] dark:text-amber-400 text-xs sm:text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Upload className="w-4 h-4" />
                  <span>{t.importCsvExcel}</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={openAddStudent}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-[#0F2547] hover:bg-[#16325C] dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-xs sm:text-sm font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t.addStudent}</span>
                </button>
              </div>
            </div>

            {/* Add/Edit Student Form */}
            {showStudentForm && (
              <form
                onSubmit={handleSaveStudent}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-[#0F2547] dark:text-slate-100">
                    {editingStudent ? t.editStudent : t.addStudent}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowStudentForm(false)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-500 cursor-pointer"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {stuError && (
                  <p className="text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{stuError}</span>
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      {t.rollNumber} *
                    </label>
                    <input
                      type="text"
                      value={stuRoll}
                      onChange={(e) => setStuRoll(e.target.value)}
                      placeholder="101"
                      className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      {t.studentName} *
                    </label>
                    <input
                      type="text"
                      value={stuName}
                      onChange={(e) => setStuName(e.target.value)}
                      placeholder="Full Name"
                      className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      {t.fatherName} ({t.optional})
                    </label>
                    <input
                      type="text"
                      value={stuFather}
                      onChange={(e) => setStuFather(e.target.value)}
                      placeholder="Father Name"
                      className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      {t.parentPhone} ({t.optional})
                    </label>
                    <input
                      type="tel"
                      value={stuPhone}
                      onChange={(e) => setStuPhone(e.target.value)}
                      placeholder="0300-1234567"
                      className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowStudentForm(false)}
                    className="min-h-[44px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-medium cursor-pointer"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    className="min-h-[44px] px-5 rounded-xl bg-[#0F2547] hover:bg-[#16325C] dark:bg-amber-500 dark:text-slate-950 text-white text-sm font-semibold cursor-pointer"
                  >
                    {t.save}
                  </button>
                </div>
              </form>
            )}

            {/* CSV / Excel Import Preview & Error List */}
            {importPreview && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-[#0F2547] dark:text-slate-100">
                      {t.importPreview} — {importFileName}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono-nums mt-0.5">
                      {importPreview.validRows.length} valid · {importPreview.errors.length} errors · {importPreview.totalRows} total rows
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setImportPreview(null)}
                    className="min-h-[44px] px-3 text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer"
                  >
                    {t.cancel}
                  </button>
                </div>

                {importPreview.errors.length > 0 && (
                  <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 p-3 space-y-1.5">
                    <p className="text-xs font-bold text-red-700 dark:text-red-400 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" />
                      <span>{t.importErrors} ({importPreview.errors.length})</span>
                    </p>
                    <ul className="space-y-1 text-xs text-red-700 dark:text-red-300">
                      {importPreview.errors.map((err, idx) => (
                        <li key={idx} className="font-mono-nums">
                          Row {err.rowNumber}: {err.reason}
                          {err.rawText ? ` (${err.rawText})` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {importPreview.validRows.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                      {t.importValidRows} ({importPreview.validRows.length})
                    </p>
                    <div className="max-h-56 overflow-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                          <tr>
                            <th className="py-2 px-3">Row</th>
                            <th className="py-2 px-3">{t.rollNumber}</th>
                            <th className="py-2 px-3">{t.studentName}</th>
                            <th className="py-2 px-3">{t.fatherName}</th>
                            <th className="py-2 px-3">{t.parentPhone}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {importPreview.validRows.map((row) => (
                            <tr key={`${row.rowNumber}-${row.rollNumber}`}>
                              <td className="py-2 px-3 font-mono-nums">{row.rowNumber}</td>
                              <td className="py-2 px-3 font-mono-nums font-semibold">{row.rollNumber}</td>
                              <td className="py-2 px-3">{row.name}</td>
                              <td className="py-2 px-3 text-slate-500">{row.fatherName || '—'}</td>
                              <td className="py-2 px-3 font-mono-nums text-slate-500">{row.parentPhone || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={handleConfirmImport}
                        className="min-h-[44px] px-5 rounded-xl bg-[#0F2547] hover:bg-[#16325C] dark:bg-amber-500 dark:text-slate-950 text-white text-sm font-semibold cursor-pointer"
                      >
                        {t.confirmImport} ({importPreview.validRows.length})
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Student Search Bar */}
            {activeClass.students.length > 0 && (
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-slate-400 absolute start-3.5 pointer-events-none" />
                <input
                  type="search"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder={t.searchStudentsPlaceholder}
                  aria-label={t.searchStudentsPlaceholder}
                  className="w-full min-h-[44px] ps-10 pe-11 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F2547] dark:focus:ring-amber-400"
                />
                {studentSearch && (
                  <button
                    type="button"
                    onClick={() => setStudentSearch('')}
                    aria-label="Clear search"
                    className="absolute end-1 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* Students List: Cards on mobile, Table on desktop */}
            {activeClass.students.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
                No students in this class yet. Add one above or import from CSV / Excel.
              </p>
            ) : filteredStudents.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
                {t.noMatchingStudents}
              </p>
            ) : (
              <>
                {/* Mobile Card List */}
                <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredStudents.map((stu) => (
                    <div
                      key={stu.id}
                      className="py-3 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                          <span className="font-mono-nums text-[#0F2547] dark:text-amber-400 mr-2">
                            #{stu.rollNumber}
                          </span>
                          {stu.name}
                        </p>
                        {(stu.fatherName || stu.parentPhone) && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                            {[stu.fatherName, stu.parentPhone].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditStudent(stu)}
                          aria-label={`Edit ${stu.name}`}
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteStudent(stu.id)}
                          aria-label={`Delete ${stu.name}`}
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <tr>
                        <th className="py-2.5 px-3">{t.rollNumber}</th>
                        <th className="py-2.5 px-3">{t.studentName}</th>
                        <th className="py-2.5 px-3">{t.fatherName}</th>
                        <th className="py-2.5 px-3">{t.parentPhone}</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredStudents.map((stu) => (
                        <tr key={stu.id}>
                          <td className="py-2.5 px-3 font-mono-nums font-semibold text-[#0F2547] dark:text-amber-400">
                            {stu.rollNumber}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100">
                            {stu.name}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                            {stu.fatherName || '—'}
                          </td>
                          <td className="py-2.5 px-3 font-mono-nums text-slate-600 dark:text-slate-300">
                            {stu.parentPhone || '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openEditStudent(stu)}
                                className="min-h-[40px] px-3 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                              >
                                {t.edit}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteStudent(stu.id)}
                                className="min-h-[40px] px-3 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                              >
                                {t.delete}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};
