export type MarkValue = number | 'ABSENT' | null;

export interface Student {
  id: string;
  rollNumber: string;
  name: string;
  fatherName?: string;
  parentPhone?: string;
}

export interface Classroom {
  id: string;
  name: string;
  subjects: string[];
  students: Student[];
}

export interface TestRecord {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  classId: string;
  subjectTotals: Record<string, number>;
  passPercentage: number;
  marks: Record<string, Record<string, MarkValue>>; // studentId -> subject -> mark
  remarks: Record<string, string>; // studentId -> remark
  attendance: Record<string, string>; // studentId -> attendance string e.g. "22/24"
  createdAt: number;
}

export interface GradeBand {
  grade: string;
  minPercentage: number;
}

export type AppLanguage = 'en' | 'ur';
export type ThemeMode = 'light' | 'dark';

export interface AppSettings {
  schoolName: string;
  schoolLogoDataUrl?: string;
  gradingScale: GradeBand[];
  defaultPassPercentage: number;
  classTeacherName: string;
  principalName: string;
  language: AppLanguage;
  theme: ThemeMode;
  aiRemarksEnabled: boolean;
}

export interface AppData {
  version: number;
  classes: Classroom[];
  tests: TestRecord[];
  settings: AppSettings;
}

export interface SubjectMarkDetail {
  subject: string;
  total: number;
  obtained: MarkValue;
  percentage: number | null;
  grade: string;
  passed: boolean;
}

export interface StudentResult {
  student: Student;
  subjects: SubjectMarkDetail[];
  totalObtained: number;
  totalMax: number;
  percentage: number;
  grade: string;
  passed: boolean;
  isFullyAbsent: boolean;
  hasBlankMarks: boolean;
  failedSubjects: string[];
  absentSubjects: string[];
  position: number | null;
  remark: string;
  attendance: string;
}

export interface SubjectStats {
  subject: string;
  totalMax: number;
  appearedCount: number;
  absentCount: number;
  blankCount: number;
  average: number;
  averagePercentage: number;
  highest: number;
  lowest: number;
  passCount: number;
  passPercentage: number;
}
