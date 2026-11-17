import * as XLSX from 'xlsx';
import { Student } from '../types';

export interface ParsedStudentRow {
  rowNumber: number;
  rollNumber: string;
  name: string;
  fatherName?: string;
  parentPhone?: string;
}

export interface ImportErrorItem {
  rowNumber: number;
  reason: string;
  rawText: string;
}

export interface StudentImportResult {
  validRows: ParsedStudentRow[];
  errors: ImportErrorItem[];
  totalRows: number;
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function mapColumnKey(header: string): 'rollNumber' | 'name' | 'fatherName' | 'parentPhone' | null {
  const n = normalizeHeader(header);
  if (['roll', 'rollno', 'rollnumber', 'regno', 'id'].includes(n)) return 'rollNumber';
  if (['name', 'studentname', 'fullname', 'student'].includes(n)) return 'name';
  if (['father', 'fathername', 'guardian', 'guardianname'].includes(n)) return 'fatherName';
  if (['phone', 'parentphone', 'mobile', 'contact', 'phonenumber'].includes(n)) return 'parentPhone';
  return null;
}

export async function parseStudentImportFile(
  file: File,
  existingStudents: Student[]
): Promise<StudentImportResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return {
      validRows: [],
      errors: [{ rowNumber: 1, reason: 'File contains no worksheet or data.', rawText: '' }],
      totalRows: 0,
    };
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });

  if (rows.length < 2) {
    return {
      validRows: [],
      errors: [{ rowNumber: 1, reason: 'File must contain a header row and at least one student row.', rawText: '' }],
      totalRows: 0,
    };
  }

  const headerRow = rows[0].map((cell) => String(cell ?? '').trim());
  const colIndex: Partial<Record<'rollNumber' | 'name' | 'fatherName' | 'parentPhone', number>> = {};

  headerRow.forEach((header, idx) => {
    const mapped = mapColumnKey(header);
    if (mapped && colIndex[mapped] === undefined) {
      colIndex[mapped] = idx;
    }
  });

  // Fallback positional mapping if headers aren't matched cleanly
  if (colIndex.rollNumber === undefined && colIndex.name === undefined) {
    colIndex.rollNumber = 0;
    colIndex.name = 1;
    if (headerRow.length > 2) colIndex.fatherName = 2;
    if (headerRow.length > 3) colIndex.parentPhone = 3;
  }

  const existingRollSet = new Set(
    existingStudents.map((s) => s.rollNumber.trim().toLowerCase())
  );
  const seenRollSet = new Set<string>();

  const validRows: ParsedStudentRow[] = [];
  const errors: ImportErrorItem[] = [];
  let totalRows = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!Array.isArray(row) || row.every((c) => String(c ?? '').trim() === '')) {
      continue;
    }
    totalRows += 1;
    const excelRowNum = i + 1;

    const rollRaw =
      colIndex.rollNumber !== undefined ? String(row[colIndex.rollNumber] ?? '').trim() : '';
    const nameRaw =
      colIndex.name !== undefined ? String(row[colIndex.name] ?? '').trim() : '';
    const fatherRaw =
      colIndex.fatherName !== undefined ? String(row[colIndex.fatherName] ?? '').trim() : '';
    const phoneRaw =
      colIndex.parentPhone !== undefined ? String(row[colIndex.parentPhone] ?? '').trim() : '';

    const rawText = row.map((c) => String(c ?? '').trim()).filter(Boolean).join(' | ');

    if (!rollRaw) {
      errors.push({
        rowNumber: excelRowNum,
        reason: 'Missing Roll Number',
        rawText,
      });
      continue;
    }

    if (!nameRaw) {
      errors.push({
        rowNumber: excelRowNum,
        reason: 'Missing Student Name',
        rawText,
      });
      continue;
    }

    const rollNorm = rollRaw.toLowerCase();
    if (seenRollSet.has(rollNorm)) {
      errors.push({
        rowNumber: excelRowNum,
        reason: `Duplicate Roll Number "${rollRaw}" in import file`,
        rawText,
      });
      continue;
    }

    if (existingRollSet.has(rollNorm)) {
      errors.push({
        rowNumber: excelRowNum,
        reason: `Roll Number "${rollRaw}" already exists in this class`,
        rawText,
      });
      continue;
    }

    seenRollSet.add(rollNorm);
    validRows.push({
      rowNumber: excelRowNum,
      rollNumber: rollRaw,
      name: nameRaw,
      fatherName: fatherRaw || undefined,
      parentPhone: phoneRaw || undefined,
    });
  }

  return {
    validRows,
    errors,
    totalRows,
  };
}

export function downloadStudentTemplateCsv(): void {
  const csvContent = [
    'Roll Number,Student Name,Father Name,Parent Phone',
    '101,Ayesha Siddiqui,Tariq Siddiqui,0300-1112233',
    '102,Bilal Ahmed,Rashid Ahmed,0301-2223344',
    '103,Fatima Zahra,Imran Ali,0302-3334455',
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'students-import-template.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
