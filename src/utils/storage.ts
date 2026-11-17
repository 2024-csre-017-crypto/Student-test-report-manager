import { AppData, AppSettings, Classroom, GradeBand, TestRecord } from '../types';

const STORAGE_KEY = 'student_result_manager_data_v1';
const LOCAL_MODE_KEY = 'student_result_manager_local_mode_v1';

export function getLocalOnlyPreference(): boolean {
  try {
    return localStorage.getItem(LOCAL_MODE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setLocalOnlyPreference(enabled: boolean): void {
  try {
    if (enabled) {
      localStorage.setItem(LOCAL_MODE_KEY, 'true');
    } else {
      localStorage.removeItem(LOCAL_MODE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

export const DEFAULT_GRADING_SCALE: GradeBand[] = [
  { grade: 'A+', minPercentage: 80 },
  { grade: 'A', minPercentage: 70 },
  { grade: 'B', minPercentage: 60 },
  { grade: 'C', minPercentage: 50 },
  { grade: 'D', minPercentage: 40 },
  { grade: 'E', minPercentage: 33 },
  { grade: 'F', minPercentage: 0 },
];

export const DEFAULT_SETTINGS: AppSettings = {
  schoolName: '',
  schoolLogoDataUrl: undefined,
  gradingScale: DEFAULT_GRADING_SCALE,
  defaultPassPercentage: 33,
  classTeacherName: '',
  principalName: '',
  language: 'en',
  theme: 'light',
  aiRemarksEnabled: false,
};

export function createEmptyAppData(): AppData {
  return {
    version: 1,
    classes: [],
    tests: [],
    settings: { ...DEFAULT_SETTINGS, gradingScale: DEFAULT_GRADING_SCALE.map((g) => ({ ...g })) },
  };
}

export function loadAppData(uid?: string): AppData {
  try {
    const key = uid ? `${STORAGE_KEY}_${uid}` : STORAGE_KEY;
    const raw = localStorage.getItem(key);
    if (!raw) return createEmptyAppData();
    const parsed = JSON.parse(raw) as Partial<AppData>;
    return normalizeAppData(parsed);
  } catch {
    return createEmptyAppData();
  }
}

export function saveAppData(data: AppData, uid?: string): void {
  try {
    const key = uid ? `${STORAGE_KEY}_${uid}` : STORAGE_KEY;
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
  }
}

export function normalizeAppData(input: Partial<AppData>): AppData {
  const empty = createEmptyAppData();
  const settings: AppSettings = {
    ...empty.settings,
    ...(input.settings ?? {}),
    gradingScale:
      Array.isArray(input.settings?.gradingScale) && input.settings.gradingScale.length > 0
        ? input.settings.gradingScale.map((g) => ({
            grade: String(g.grade ?? 'F'),
            minPercentage: Number(g.minPercentage) || 0,
          }))
        : empty.settings.gradingScale,
  };

  const classes: Classroom[] = Array.isArray(input.classes)
    ? input.classes.map((c) => ({
        id: String(c.id),
        name: String(c.name ?? 'Class'),
        subjects: Array.isArray(c.subjects) ? c.subjects.map(String) : [],
        students: Array.isArray(c.students)
          ? c.students.map((s) => ({
              id: String(s.id),
              rollNumber: String(s.rollNumber ?? ''),
              name: String(s.name ?? ''),
              fatherName: s.fatherName ? String(s.fatherName) : undefined,
              parentPhone: s.parentPhone ? String(s.parentPhone) : undefined,
            }))
          : [],
      }))
    : [];

  const tests: TestRecord[] = Array.isArray(input.tests)
    ? input.tests.map((t) => ({
        id: String(t.id),
        name: String(t.name ?? 'Test'),
        date: String(t.date ?? new Date().toISOString().slice(0, 10)),
        classId: String(t.classId ?? ''),
        subjectTotals: t.subjectTotals ?? {},
        passPercentage: Number(t.passPercentage) || 33,
        marks: t.marks ?? {},
        remarks: t.remarks ?? {},
        attendance: t.attendance ?? {},
        createdAt: Number(t.createdAt) || Date.now(),
      }))
    : [];

  return {
    version: 1,
    classes,
    tests,
    settings,
  };
}

export function downloadBackupFile(data: AppData): void {
  const payload = JSON.stringify(data, null, 2);
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `result-manager-backup-${dateStr}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function createDemoData(existingSettings: AppSettings): AppData {
  const classId = 'demo-class-9a';
  const students = [
    { id: 'stu-1', rollNumber: '101', name: 'Ayesha Siddiqui', fatherName: 'Tariq Siddiqui', parentPhone: '0300-1112233' },
    { id: 'stu-2', rollNumber: '102', name: 'Bilal Ahmed', fatherName: 'Rashid Ahmed', parentPhone: '0301-2223344' },
    { id: 'stu-3', rollNumber: '103', name: 'Fatima Zahra', fatherName: 'Imran Ali', parentPhone: '0302-3334455' },
    { id: 'stu-4', rollNumber: '104', name: 'Hamza Khan', fatherName: 'Salman Khan', parentPhone: '0303-4445566' },
    { id: 'stu-5', rollNumber: '105', name: 'Zainab Noor', fatherName: 'Noor Muhammad', parentPhone: '0304-5556677' },
    { id: 'stu-6', rollNumber: '106', name: 'Usman Farooq', fatherName: 'Farooq Hassan', parentPhone: '0305-6667788' },
    { id: 'stu-7', rollNumber: '107', name: 'Maryam & Sana', fatherName: 'Kamran Raza', parentPhone: '0306-7778899' },
    { id: 'stu-8', rollNumber: '108', name: 'Saad Mahmood', fatherName: 'Mahmood Iqbal', parentPhone: '0307-8889900' },
    { id: 'stu-9', rollNumber: '109', name: 'Hira Batool', fatherName: 'Asif Hussain', parentPhone: '0308-9990011' },
    { id: 'stu-10', rollNumber: '110', name: 'Omar Tariq', fatherName: 'Tariq Jamil', parentPhone: '0309-0001122' },
    { id: 'stu-11', rollNumber: '111', name: 'Amina Khalid', fatherName: 'Khalid Mehmood', parentPhone: '0310-1122334' },
    { id: 'stu-12', rollNumber: '112', name: 'Daniyal Akram', fatherName: 'Akram Malik', parentPhone: '0311-2233445' },
  ];

  const subjects = ['English', 'Mathematics', 'Science & Lab', 'Urdu'];

  const test1: TestRecord = {
    id: 'demo-test-feb',
    name: 'Monthly Test February',
    date: '2026-02-18',
    classId,
    subjectTotals: { English: 50, Mathematics: 50, 'Science & Lab': 50, Urdu: 50 },
    passPercentage: 33,
    marks: {
      'stu-1': { English: 44, Mathematics: 48, 'Science & Lab': 45, Urdu: 43 },
      'stu-2': { English: 39, Mathematics: 42, 'Science & Lab': 40, Urdu: 38 },
      'stu-3': { English: 45, Mathematics: 47, 'Science & Lab': 45, Urdu: 43 },
      'stu-4': { English: 28, Mathematics: 31, 'Science & Lab': 25, Urdu: 30 },
      'stu-5': { English: 41, Mathematics: 38, 'Science & Lab': 42, Urdu: 40 },
      'stu-6': { English: 35, Mathematics: 14, 'Science & Lab': 33, Urdu: 36 },
      'stu-7': { English: 38, Mathematics: 39, 'Science & Lab': 36, Urdu: 37 },
      'stu-8': { English: 30, Mathematics: 29, 'Science & Lab': 31, Urdu: 32 },
      'stu-9': { English: 46, Mathematics: 45, 'Science & Lab': 47, Urdu: 44 },
      'stu-10': { English: 'ABSENT', Mathematics: 'ABSENT', 'Science & Lab': 'ABSENT', Urdu: 'ABSENT' },
      'stu-11': { English: 37, Mathematics: 40, 'Science & Lab': 38, Urdu: 35 },
      'stu-12': { English: 22, Mathematics: 18, 'Science & Lab': 20, Urdu: 24 },
    },
    remarks: {
      'stu-1': 'Consistent and attentive across all subjects.',
      'stu-3': 'Excellent analytical skills in Mathematics and Science.',
      'stu-6': 'Needs extra practice in Mathematics fundamentals.',
    },
    attendance: {
      'stu-1': '23/24',
      'stu-2': '22/24',
      'stu-3': '24/24',
      'stu-10': '14/24',
    },
    createdAt: Date.now() - 86400000 * 25,
  };

  const test2: TestRecord = {
    id: 'demo-test-mar',
    name: 'Monthly Test March',
    date: '2026-03-20',
    classId,
    subjectTotals: { English: 100, Mathematics: 100, 'Science & Lab': 100, Urdu: 100 },
    passPercentage: 33,
    marks: {
      'stu-1': { English: 88, Mathematics: 94, 'Science & Lab': 91, Urdu: 85 },
      'stu-2': { English: 76, Mathematics: 82, 'Science & Lab': 78, Urdu: 74 },
      'stu-3': { English: 89, Mathematics: 95, 'Science & Lab': 90, Urdu: 84 }, // Tie with stu-1 (358)
      'stu-4': { English: 54, Mathematics: 60, 'Science & Lab': 48, Urdu: 58 },
      'stu-5': { English: 81, Mathematics: 79, 'Science & Lab': 84, Urdu: 82 },
      'stu-6': { English: 68, Mathematics: 28, 'Science & Lab': 62, Urdu: 70 },
      'stu-7': { English: 77, Mathematics: 75, 'Science & Lab': 74, Urdu: 78 },
      'stu-8': { English: 61, Mathematics: 63, 'Science & Lab': 59, Urdu: 64 },
      'stu-9': { English: 92, Mathematics: 91, 'Science & Lab': 93, Urdu: 88 },
      'stu-10': { English: 'ABSENT', Mathematics: 'ABSENT', 'Science & Lab': 'ABSENT', Urdu: 'ABSENT' },
      'stu-11': { English: 72, Mathematics: 78, 'Science & Lab': 75, Urdu: 71 },
      'stu-12': { English: 42, Mathematics: 31, 'Science & Lab': 36, Urdu: 45 },
    },
    remarks: {
      'stu-1': 'Outstanding overall performance. Keep up the great focus.',
      'stu-3': 'Strong command over Mathematics & Science. Well done!',
      'stu-9': 'Top performer with balanced excellence across every subject.',
      'stu-6': 'Good effort in languages; focus on Mathematics problem solving.',
    },
    attendance: {
      'stu-1': '24/24',
      'stu-2': '23/24',
      'stu-3': '24/24',
      'stu-9': '24/24',
      'stu-10': '16/24',
    },
    createdAt: Date.now() - 86400000 * 2,
  };

  return {
    version: 1,
    classes: [
      {
        id: classId,
        name: 'Grade 9-A (Demo)',
        subjects,
        students,
      },
    ],
    tests: [test1, test2],
    settings: {
      ...existingSettings,
      schoolName: existingSettings.schoolName || 'Crescent Model High School (Demo)',
      classTeacherName: existingSettings.classTeacherName || 'Mrs. Nadia Tariq',
      principalName: existingSettings.principalName || 'Mr. Waqar Ahmed',
    },
  };
}
