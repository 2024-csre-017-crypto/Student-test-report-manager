import { AppLanguage } from './types';

export interface Translations {
  appName: string;
  localNotice: string;
  navHome: string;
  navClasses: string;
  navTests: string;
  navReports: string;
  navSettings: string;
  newTest: string;
  loadDemoData: string;
  demoBadge: string;
  classes: string;
  latestTests: string;
  noClassesYet: string;
  noTestsYet: string;
  studentsCount: string;
  subjectsCount: string;
  addClass: string;
  className: string;
  subjects: string;
  addSubject: string;
  students: string;
  addStudent: string;
  editStudent: string;
  rollNumber: string;
  studentName: string;
  fatherName: string;
  parentPhone: string;
  optional: string;
  save: string;
  cancel: string;
  delete: string;
  edit: string;
  importCsvExcel: string;
  downloadTemplate: string;
  importPreview: string;
  importErrors: string;
  importValidRows: string;
  confirmImport: string;
  testName: string;
  testDate: string;
  selectClass: string;
  passPercentage: string;
  subjectTotals: string;
  marksEntry: string;
  absent: string;
  autoSaved: string;
  viewResults: string;
  resultsSummary: string;
  totalMarks: string;
  obtainedMarks: string;
  percentage: string;
  grade: string;
  position: string;
  result: string;
  pass: string;
  fail: string;
  subjectAnalysis: string;
  average: string;
  highest: string;
  lowest: string;
  passRate: string;
  failedStudents: string;
  noFailedStudents: string;
  reports: string;
  reportCard: string;
  classSheet: string;
  studentProgress: string;
  printAllCards: string;
  downloadPdf: string;
  downloadExcel: string;
  print: string;
  teacherRemark: string;
  attendance: string;
  writeRemarkAi: string;
  generating: string;
  classTeacherSig: string;
  principalSig: string;
  schoolName: string;
  schoolLogo: string;
  uploadLogo: string;
  removeLogo: string;
  gradingScale: string;
  minPercentage: string;
  addGradeBand: string;
  resetDefaultScale: string;
  signatures: string;
  language: string;
  theme: string;
  lightMode: string;
  darkMode: string;
  backupRestore: string;
  backupData: string;
  restoreData: string;
  clearAllData: string;
  aiRemarksSetting: string;
  reportCardTitle: string;
  dateLabel: string;
  subjectLabel: string;
  urduPdfNotice: string;
}

const en: Translations = {
  appName: 'Result Manager',
  localNotice: 'All data is stored only on this device. Back up regularly in Settings.',
  navHome: 'Home',
  navClasses: 'Classes',
  navTests: 'Tests',
  navReports: 'Reports',
  navSettings: 'Settings',
  newTest: 'New Test',
  loadDemoData: 'Load Demo Data',
  demoBadge: 'Demo Data',
  classes: 'Classes',
  latestTests: 'Latest Tests',
  noClassesYet: 'No classes yet. Create your first class to add students.',
  noTestsYet: 'No tests recorded yet. Tap "New Test" to enter marks.',
  studentsCount: 'students',
  subjectsCount: 'subjects',
  addClass: 'Add Class',
  className: 'Class Name',
  subjects: 'Subjects',
  addSubject: 'Add Subject',
  students: 'Students',
  addStudent: 'Add Student',
  editStudent: 'Edit Student',
  rollNumber: 'Roll No.',
  studentName: 'Student Name',
  fatherName: 'Father Name',
  parentPhone: 'Parent Phone',
  optional: 'Optional',
  save: 'Save',
  cancel: 'Cancel',
  delete: 'Delete',
  edit: 'Edit',
  importCsvExcel: 'Import CSV / Excel',
  downloadTemplate: 'Download Template',
  importPreview: 'Import Preview',
  importErrors: 'Rows with Errors',
  importValidRows: 'Valid Rows Ready to Import',
  confirmImport: 'Import Valid Students',
  testName: 'Test Name',
  testDate: 'Date',
  selectClass: 'Class',
  passPercentage: 'Pass %',
  subjectTotals: 'Subject Total Marks',
  marksEntry: 'Marks Entry',
  absent: 'Absent',
  autoSaved: 'Auto-saved',
  viewResults: 'View Results',
  resultsSummary: 'Results Summary',
  totalMarks: 'Total',
  obtainedMarks: 'Obtained',
  percentage: '%',
  grade: 'Grade',
  position: 'Position',
  result: 'Result',
  pass: 'PASS',
  fail: 'FAIL',
  subjectAnalysis: 'Subject Analysis',
  average: 'Average',
  highest: 'Highest',
  lowest: 'Lowest',
  passRate: 'Pass %',
  failedStudents: 'Students Who Failed Any Subject',
  noFailedStudents: 'All students passed every subject.',
  reports: 'Reports',
  reportCard: 'Report Card',
  classSheet: 'Class Sheet',
  studentProgress: 'Student Progress',
  printAllCards: 'All Report Cards',
  downloadPdf: 'Download PDF',
  downloadExcel: 'Download Excel',
  print: 'Print',
  teacherRemark: 'Teacher Remark',
  attendance: 'Attendance',
  writeRemarkAi: 'Write remark',
  generating: 'Writing...',
  classTeacherSig: 'Class Teacher',
  principalSig: 'Principal',
  schoolName: 'School Name',
  schoolLogo: 'School Logo',
  uploadLogo: 'Upload Logo',
  removeLogo: 'Remove',
  gradingScale: 'Grading Scale',
  minPercentage: 'Min %',
  addGradeBand: 'Add Grade',
  resetDefaultScale: 'Reset Default',
  signatures: 'Signature Names',
  language: 'Language',
  theme: 'Appearance',
  lightMode: 'Light',
  darkMode: 'Dark',
  backupRestore: 'Backup & Restore',
  backupData: 'Backup (Download)',
  restoreData: 'Restore (Load File)',
  clearAllData: 'Clear All Data',
  aiRemarksSetting: 'AI Teacher Remarks (Gemini)',
  reportCardTitle: 'STUDENT REPORT CARD',
  dateLabel: 'Date',
  subjectLabel: 'Subject',
  urduPdfNotice:
    'Note: Direct PDF export uses built-in Latin fonts and cannot shape Urdu Nastaliq script. Use the Print button and select "Save as PDF" for crisp Urdu Nastaliq report cards.',
};

const ur: Translations = {
  appName: 'رزلٹ مینیجر',
  localNotice: 'تمام ڈیٹا صرف اسی ڈیوائس پر محفوظ ہے۔ سیٹنگز سے باقاعدگی سے بیک اپ لیں۔',
  navHome: 'ہوم',
  navClasses: 'کلاسز',
  navTests: 'ٹیسٹ',
  navReports: 'رپورٹس',
  navSettings: 'سیٹنگز',
  newTest: 'نیا ٹیسٹ',
  loadDemoData: 'ڈیمو ڈیٹا لوڈ کریں',
  demoBadge: 'ڈیمو ڈیٹا',
  classes: 'کلاسز',
  latestTests: 'حالیہ ٹیسٹ',
  noClassesYet: 'ابھی کوئی کلاس نہیں ہے۔ طلبہ شامل کرنے کے لیے پہلی کلاس بنائیں۔',
  noTestsYet: 'ابھی کوئی ٹیسٹ درج نہیں ہوا۔ نمبر درج کرنے کے لیے نیا ٹیسٹ بنائیں۔',
  studentsCount: 'طلبہ',
  subjectsCount: 'مضامین',
  addClass: 'کلاس شامل کریں',
  className: 'کلاس کا نام',
  subjects: 'مضامین',
  addSubject: 'مضمون شامل کریں',
  students: 'طلبہ',
  addStudent: 'طالب علم شامل کریں',
  editStudent: 'طالب علم میں ترمیم',
  rollNumber: 'رول نمبر',
  studentName: 'طالب علم کا نام',
  fatherName: 'والد کا نام',
  parentPhone: 'والدین کا فون',
  optional: 'اختیاری',
  save: 'محفوظ کریں',
  cancel: 'منسوخ کریں',
  delete: 'حذف کریں',
  edit: 'ترمیم',
  importCsvExcel: 'ایکسسل / CSV درآمد کریں',
  downloadTemplate: 'ٹیمپلیٹ ڈاؤن لوڈ کریں',
  importPreview: 'درآمد کا پیش نظارہ',
  importErrors: 'غلطیوں والی قطاریں',
  importValidRows: 'درآمد کے لیے درست قطاریں',
  confirmImport: 'درست طلبہ شامل کریں',
  testName: 'ٹیسٹ کا نام',
  testDate: 'تاریخ',
  selectClass: 'کلاس',
  passPercentage: 'پاس فیصد',
  subjectTotals: 'مضامین کے کل نمبر',
  marksEntry: 'نمبر درج کریں',
  absent: 'غیر حاضر',
  autoSaved: 'خودکار محفوظ',
  viewResults: 'نتائج دیکھیں',
  resultsSummary: 'نتائج کا خلاصہ',
  totalMarks: 'کل نمبر',
  obtainedMarks: 'حاصل کردہ نمبر',
  percentage: 'فیصد',
  grade: 'گریڈ',
  position: 'پوزیشن',
  result: 'نتیجہ',
  pass: 'پاس',
  fail: 'فیل',
  subjectAnalysis: 'مضمون وار تجزیہ',
  average: 'اوسط',
  highest: 'سب سے زیادہ',
  lowest: 'سب سے کم',
  passRate: 'پاس شرح',
  failedStudents: 'کسی بھی مضمون میں فیل طلبہ',
  noFailedStudents: 'تمام طلبہ ہر مضمون میں پاس ہیں۔',
  reports: 'رپورٹس',
  reportCard: 'رپورٹ کارڈ',
  classSheet: 'کلاس رزلٹ شیٹ',
  studentProgress: 'طالب علم کی کارکردگی',
  printAllCards: 'تمام رپورٹ کارڈز',
  downloadPdf: 'PDF ڈاؤن لوڈ',
  downloadExcel: 'Excel ڈاؤن لوڈ',
  print: 'پرنٹ / PDF محفوظ کریں',
  teacherRemark: 'استاد کے ریمارکس',
  attendance: 'حاضری',
  writeRemarkAi: 'ریمارکس لکھیں',
  generating: 'لکھا جا رہا ہے...',
  classTeacherSig: 'کلاس ٹیچر',
  principalSig: 'پرنسپل',
  schoolName: 'اسکول کا نام',
  schoolLogo: 'اسکول لوگو',
  uploadLogo: 'لوگو اپ لوڈ کریں',
  removeLogo: 'ہٹائیں',
  gradingScale: 'گریڈنگ اسکیل',
  minPercentage: 'کم از کم فیصد',
  addGradeBand: 'گریڈ شامل کریں',
  resetDefaultScale: 'ڈیفالٹ بحال کریں',
  signatures: 'دستخط کے نام',
  language: 'زبان',
  theme: 'ظاہری شکل',
  lightMode: 'لائٹ',
  darkMode: 'ڈارک',
  backupRestore: 'بیک اپ اور بحالی',
  backupData: 'بیک اپ (ڈاؤن لوڈ)',
  restoreData: 'بحال کریں (فائل لوڈ)',
  clearAllData: 'تمام ڈیٹا صاف کریں',
  aiRemarksSetting: 'AI استاد ریمارکس (Gemini)',
  reportCardTitle: 'طالب علم کا رپورٹ کارڈ',
  dateLabel: 'تاریخ',
  subjectLabel: 'مضمون',
  urduPdfNotice:
    'نوٹ: براہِ راست PDF ڈاؤن لوڈ میں اردو نستعلیق رسم الخط درست نہیں آتا۔ صاف اردو نستعلیق رپورٹ کارڈ کے لیے "پرنٹ / PDF محفوظ کریں" بٹن استعمال کریں اور Save as PDF منتخب کریں۔',
};

export function getTranslations(lang: AppLanguage): Translations {
  return lang === 'ur' ? ur : en;
}
