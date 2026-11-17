import {
  Classroom,
  GradeBand,
  MarkValue,
  StudentResult,
  SubjectMarkDetail,
  SubjectStats,
  TestRecord,
} from '../types';

export function getGrade(percentage: number, gradingScale: GradeBand[]): string {
  const sorted = [...gradingScale].sort((a, b) => b.minPercentage - a.minPercentage);
  const rounded = Math.round(percentage * 100) / 100;
  for (const band of sorted) {
    if (rounded >= band.minPercentage) {
      return band.grade;
    }
  }
  return sorted[sorted.length - 1]?.grade ?? 'F';
}

export function getTestSubjects(test: TestRecord, classroom: Classroom): string[] {
  const fromTotals = Object.keys(test.subjectTotals);
  const ordered = classroom.subjects.filter((s) => fromTotals.includes(s));
  const extra = fromTotals.filter((s) => !ordered.includes(s));
  return [...ordered, ...extra];
}

export function computeTestResults(
  test: TestRecord,
  classroom: Classroom,
  gradingScale: GradeBand[]
): {
  studentResults: StudentResult[];
  subjectStats: SubjectStats[];
  failedStudents: StudentResult[];
} {
  const subjects = getTestSubjects(test, classroom);
  const passPct = test.passPercentage;

  const rawResults: StudentResult[] = classroom.students.map((student) => {
    const studentMarks = test.marks[student.id] ?? {};
    let totalObtained = 0;
    let totalMax = 0;
    let numericCount = 0;
    let absentCount = 0;
    let blankCount = 0;
    const failedSubjects: string[] = [];
    const absentSubjects: string[] = [];

    const subjectDetails: SubjectMarkDetail[] = subjects.map((subject) => {
      const total = Number(test.subjectTotals[subject]) || 100;
      const obtained: MarkValue =
        subject in studentMarks ? studentMarks[subject] : null;
      totalMax += total;

      if (obtained === 'ABSENT') {
        absentCount += 1;
        absentSubjects.push(subject);
        failedSubjects.push(subject);
        return {
          subject,
          total,
          obtained: 'ABSENT',
          percentage: 0,
          grade: getGrade(0, gradingScale),
          passed: false,
        };
      }

      if (obtained === null || obtained === undefined || Number.isNaN(obtained)) {
        blankCount += 1;
        failedSubjects.push(subject);
        return {
          subject,
          total,
          obtained: null,
          percentage: null,
          grade: '—',
          passed: false,
        };
      }

      numericCount += 1;
      totalObtained += obtained;
      const pct = total > 0 ? (obtained / total) * 100 : 0;
      const passedSubj = pct + 1e-9 >= passPct;
      if (!passedSubj) {
        failedSubjects.push(subject);
      }

      return {
        subject,
        total,
        obtained,
        percentage: pct,
        grade: getGrade(pct, gradingScale),
        passed: passedSubj,
      };
    });

    const isFullyAbsent = subjects.length > 0 && absentCount === subjects.length;
    const hasBlankMarks = blankCount > 0;
    const percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
    const grade = isFullyAbsent ? getGrade(0, gradingScale) : getGrade(percentage, gradingScale);
    const passed =
      subjects.length > 0 &&
      failedSubjects.length === 0 &&
      percentage + 1e-9 >= passPct;

    return {
      student,
      subjects: subjectDetails,
      totalObtained,
      totalMax,
      percentage,
      grade,
      passed,
      isFullyAbsent,
      hasBlankMarks,
      failedSubjects,
      absentSubjects,
      position: null,
      remark: test.remarks?.[student.id] ?? '',
      attendance: test.attendance?.[student.id] ?? '',
    };
  });

  // Rank students who appeared in at least 1 subject using standard competition ranking (1, 2, 2, 4)
  const rankable = rawResults
    .filter((r) => !r.isFullyAbsent && r.subjects.some((s) => typeof s.obtained === 'number'))
    .sort((a, b) => {
      if (b.totalObtained !== a.totalObtained) return b.totalObtained - a.totalObtained;
      return b.percentage - a.percentage;
    });

  let currentRank = 0;
  let lastScoreKey = '';
  rankable.forEach((res, idx) => {
    const scoreKey = `${res.totalObtained.toFixed(4)}`;
    if (scoreKey !== lastScoreKey) {
      currentRank = idx + 1;
      lastScoreKey = scoreKey;
    }
    res.position = currentRank;
  });

  // Compute subject-wise statistics
  const subjectStats: SubjectStats[] = subjects.map((subject) => {
    const totalMax = Number(test.subjectTotals[subject]) || 100;
    const numericValues: number[] = [];
    let absentCount = 0;
    let blankCount = 0;
    let passCount = 0;

    for (const r of rawResults) {
      const detail = r.subjects.find((s) => s.subject === subject);
      if (!detail) continue;
      if (detail.obtained === 'ABSENT') {
        absentCount += 1;
      } else if (detail.obtained === null) {
        blankCount += 1;
      } else {
        numericValues.push(detail.obtained);
        if (detail.passed) passCount += 1;
      }
    }

    const appearedCount = numericValues.length;
    const sum = numericValues.reduce((acc, v) => acc + v, 0);
    const average = appearedCount > 0 ? sum / appearedCount : 0;
    const averagePercentage = totalMax > 0 ? (average / totalMax) * 100 : 0;
    const highest = appearedCount > 0 ? Math.max(...numericValues) : 0;
    const lowest = appearedCount > 0 ? Math.min(...numericValues) : 0;
    const denom = appearedCount + absentCount;
    const passPercentage = denom > 0 ? (passCount / denom) * 100 : 0;

    return {
      subject,
      totalMax,
      appearedCount,
      absentCount,
      blankCount,
      average,
      averagePercentage,
      highest,
      lowest,
      passCount,
      passPercentage,
    };
  });

  const failedStudents = rawResults.filter(
    (r) => r.failedSubjects.length > 0 && !(r.hasBlankMarks && r.subjects.every((s) => s.obtained === null))
  );

  return {
    studentResults: rawResults,
    subjectStats,
    failedStudents,
  };
}

export function computeStudentProgress(
  studentId: string,
  classroom: Classroom,
  tests: TestRecord[],
  gradingScale: GradeBand[]
): Array<{
  test: TestRecord;
  result: StudentResult;
}> {
  const classTests = tests
    .filter((t) => t.classId === classroom.id)
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);

  const items: Array<{ test: TestRecord; result: StudentResult }> = [];
  for (const test of classTests) {
    const { studentResults } = computeTestResults(test, classroom, gradingScale);
    const found = studentResults.find((r) => r.student.id === studentId);
    if (found) {
      items.push({ test, result: found });
    }
  }
  return items;
}

export function formatOrdinal(pos: number | null): string {
  if (pos === null) return '—';
  const mod100 = pos % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${pos}th`;
  switch (pos % 10) {
    case 1:
      return `${pos}st`;
    case 2:
      return `${pos}nd`;
    case 3:
      return `${pos}rd`;
    default:
      return `${pos}th`;
  }
}
