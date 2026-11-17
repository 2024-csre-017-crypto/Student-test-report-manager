import { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { AppData, AppSettings, Classroom, MarkValue, TestRecord } from '../types';
import { DEFAULT_GRADING_SCALE, DEFAULT_SETTINGS } from '../utils/storage';

const VALID_ID_REGEX = /^[a-zA-Z0-9_-]+$/;

export function ensureValidDocId(id: string, prefix: string): string {
  const cleaned = id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
  if (cleaned && VALID_ID_REGEX.test(cleaned)) return cleaned;
  return `${prefix}-${Date.now()}`;
}

export function sanitizeSettingsForFirestore(settings: AppSettings): Record<string, unknown> {
  const gradingScale = (
    Array.isArray(settings.gradingScale) && settings.gradingScale.length > 0
      ? settings.gradingScale
      : DEFAULT_GRADING_SCALE
  )
    .slice(0, 20)
    .map((band) => ({
      grade: String(band.grade ?? 'F').slice(0, 12),
      minPercentage: Number(band.minPercentage) || 0,
    }));

  const payload: Record<string, unknown> = {
    schoolName: String(settings.schoolName ?? '').slice(0, 160),
    gradingScale,
    defaultPassPercentage: Math.min(
      100,
      Math.max(0, Number(settings.defaultPassPercentage) || 33)
    ),
    classTeacherName: String(settings.classTeacherName ?? '').slice(0, 120),
    principalName: String(settings.principalName ?? '').slice(0, 120),
    language: settings.language === 'ur' ? 'ur' : 'en',
    theme: settings.theme === 'dark' ? 'dark' : 'light',
    aiRemarksEnabled: Boolean(settings.aiRemarksEnabled),
  };

  if (
    typeof settings.schoolLogoDataUrl === 'string' &&
    settings.schoolLogoDataUrl.length > 0 &&
    settings.schoolLogoDataUrl.length <= 300000
  ) {
    payload.schoolLogoDataUrl = settings.schoolLogoDataUrl;
  }

  return payload;
}

function sanitizeClassroomFields(classroom: Classroom) {
  const subjects = classroom.subjects
    .map((s) => String(s).trim().slice(0, 80))
    .filter(Boolean)
    .slice(0, 30);

  const students = classroom.students.slice(0, 250).map((stu) => {
    const cleanStu: Record<string, string> = {
      id: String(stu.id),
      rollNumber: String(stu.rollNumber ?? '').slice(0, 40),
      name: String(stu.name ?? '').slice(0, 120),
    };
    if (stu.fatherName && stu.fatherName.trim()) {
      cleanStu.fatherName = stu.fatherName.trim().slice(0, 120);
    }
    if (stu.parentPhone && stu.parentPhone.trim()) {
      cleanStu.parentPhone = stu.parentPhone.trim().slice(0, 40);
    }
    return cleanStu;
  });

  return {
    name: (String(classroom.name ?? 'Class').trim() || 'Class').slice(0, 120),
    subjects,
    students,
  };
}

function sanitizeMarksMap(
  marks: Record<string, Record<string, MarkValue>>
): Record<string, Record<string, MarkValue>> {
  const out: Record<string, Record<string, MarkValue>> = {};
  const entries = Object.entries(marks ?? {}).slice(0, 250);
  for (const [stuId, subjMap] of entries) {
    const cleanSubjMap: Record<string, MarkValue> = {};
    for (const [subj, val] of Object.entries(subjMap ?? {}).slice(0, 30)) {
      if (val === 'ABSENT' || val === null || typeof val === 'number') {
        cleanSubjMap[subj] = val;
      }
    }
    out[stuId] = cleanSubjMap;
  }
  return out;
}

function sanitizeStringMap(map: Record<string, string>, maxValLen: number): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(map ?? {}).slice(0, 250)) {
    if (typeof v === 'string') {
      out[k] = v.slice(0, maxValLen);
    }
  }
  return out;
}

function sanitizeTestFields(test: TestRecord) {
  const subjectTotals: Record<string, number> = {};
  for (const [k, v] of Object.entries(test.subjectTotals ?? {}).slice(0, 30)) {
    subjectTotals[k] = Math.max(1, Number(v) || 100);
  }
  const safeDate = /^\d{4}-\d{2}-\d{2}$/.test(test.date)
    ? test.date
    : new Date().toISOString().slice(0, 10);

  return {
    name: (String(test.name ?? 'Test').trim() || 'Test').slice(0, 160),
    date: safeDate,
    subjectTotals,
    passPercentage: Math.min(100, Math.max(0, Number(test.passPercentage) || 33)),
    marks: sanitizeMarksMap(test.marks),
    remarks: sanitizeStringMap(test.remarks, 500),
    attendance: sanitizeStringMap(test.attendance, 40),
  };
}

export async function ensureWorkspaceAndMigrateIfEmpty(
  user: User,
  localFallbackData: AppData
): Promise<void> {
  const userPath = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return;
    }

    const batch = writeBatch(db);
    batch.set(userRef, {
      ownerId: user.uid,
      email: user.email ?? '',
      displayName: (user.displayName ?? '').slice(0, 120),
      settings: sanitizeSettingsForFirestore(localFallbackData.settings ?? DEFAULT_SETTINGS),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const validClassIds = new Set<string>();
    for (const cls of localFallbackData.classes) {
      const safeClassId = ensureValidDocId(cls.id, 'class');
      validClassIds.add(safeClassId);
      const clsRef = doc(db, 'users', user.uid, 'classes', safeClassId);
      batch.set(clsRef, {
        ownerId: user.uid,
        id: safeClassId,
        ...sanitizeClassroomFields(cls),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    for (const testItem of localFallbackData.tests) {
      const safeClassId = ensureValidDocId(testItem.classId, 'class');
      if (!validClassIds.has(safeClassId)) continue;
      const safeTestId = ensureValidDocId(testItem.id, 'test');
      const testRef = doc(db, 'users', user.uid, 'tests', safeTestId);
      batch.set(testRef, {
        ownerId: user.uid,
        id: safeTestId,
        classId: safeClassId,
        ...sanitizeTestFields(testItem),
        clientCreatedAt: Number(testItem.createdAt) || Date.now(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, userPath);
  }
}

export function subscribeUserWorkspace(
  uid: string,
  callbacks: {
    onSettings: (settings: AppSettings) => void;
    onClasses: (classes: Classroom[]) => void;
    onTests: (tests: TestRecord[]) => void;
    onError: (err: Error) => void;
  }
): () => void {
  const userPath = `users/${uid}`;
  const classesPath = `users/${uid}/classes`;
  const testsPath = `users/${uid}/tests`;

  const unsubUser = onSnapshot(
    doc(db, 'users', uid),
    (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data();
      if (data?.settings) {
        callbacks.onSettings({
          ...DEFAULT_SETTINGS,
          ...data.settings,
        });
      }
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, userPath);
      } catch (wrapped) {
        callbacks.onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );

  const unsubClasses = onSnapshot(
    query(collection(db, 'users', uid, 'classes'), where('ownerId', '==', uid)),
    (snapshot) => {
      const list: Classroom[] = snapshot.docs.map((d) => {
        const raw = d.data();
        return {
          id: String(raw.id ?? d.id),
          name: String(raw.name ?? 'Class'),
          subjects: Array.isArray(raw.subjects) ? raw.subjects.map(String) : [],
          students: Array.isArray(raw.students) ? raw.students : [],
        };
      });
      callbacks.onClasses(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, classesPath);
      } catch (wrapped) {
        callbacks.onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );

  const unsubTests = onSnapshot(
    query(collection(db, 'users', uid, 'tests'), where('ownerId', '==', uid)),
    (snapshot) => {
      const list: TestRecord[] = snapshot.docs.map((d) => {
        const raw = d.data();
        return {
          id: String(raw.id ?? d.id),
          name: String(raw.name ?? 'Test'),
          date: String(raw.date ?? ''),
          classId: String(raw.classId ?? ''),
          subjectTotals: raw.subjectTotals ?? {},
          passPercentage: Number(raw.passPercentage) || 33,
          marks: raw.marks ?? {},
          remarks: raw.remarks ?? {},
          attendance: raw.attendance ?? {},
          createdAt: Number(raw.clientCreatedAt) || Date.now(),
        };
      });
      callbacks.onTests(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, testsPath);
      } catch (wrapped) {
        callbacks.onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );

  return () => {
    unsubUser();
    unsubClasses();
    unsubTests();
  };
}

export async function saveSettingsToCloud(uid: string, settings: AppSettings): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      settings: sanitizeSettingsForFirestore(settings),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function createClassInCloud(uid: string, classroom: Classroom): Promise<void> {
  const safeId = ensureValidDocId(classroom.id, 'class');
  const path = `users/${uid}/classes/${safeId}`;
  try {
    await setDoc(doc(db, 'users', uid, 'classes', safeId), {
      ownerId: uid,
      id: safeId,
      ...sanitizeClassroomFields(classroom),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateClassInCloud(uid: string, classroom: Classroom): Promise<void> {
  const safeId = ensureValidDocId(classroom.id, 'class');
  const path = `users/${uid}/classes/${safeId}`;
  try {
    await updateDoc(doc(db, 'users', uid, 'classes', safeId), {
      ...sanitizeClassroomFields(classroom),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteClassInCloud(
  uid: string,
  classId: string,
  relatedTestIds: string[]
): Promise<void> {
  const safeId = ensureValidDocId(classId, 'class');
  const path = `users/${uid}/classes/${safeId}`;
  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'users', uid, 'classes', safeId));
    for (const tid of relatedTestIds) {
      batch.delete(doc(db, 'users', uid, 'tests', ensureValidDocId(tid, 'test')));
    }
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function createTestInCloud(uid: string, test: TestRecord): Promise<void> {
  const safeId = ensureValidDocId(test.id, 'test');
  const safeClassId = ensureValidDocId(test.classId, 'class');
  const path = `users/${uid}/tests/${safeId}`;
  try {
    await setDoc(doc(db, 'users', uid, 'tests', safeId), {
      ownerId: uid,
      id: safeId,
      classId: safeClassId,
      ...sanitizeTestFields(test),
      clientCreatedAt: Number(test.createdAt) || Date.now(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateTestInCloud(uid: string, test: TestRecord): Promise<void> {
  const safeId = ensureValidDocId(test.id, 'test');
  const path = `users/${uid}/tests/${safeId}`;
  try {
    await updateDoc(doc(db, 'users', uid, 'tests', safeId), {
      ...sanitizeTestFields(test),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteTestInCloud(uid: string, testId: string): Promise<void> {
  const safeId = ensureValidDocId(testId, 'test');
  const path = `users/${uid}/tests/${safeId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'tests', safeId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function replaceAllCloudData(
  uid: string,
  nextData: AppData,
  existingClassIds: string[],
  existingTestIds: string[]
): Promise<void> {
  const path = `users/${uid}`;
  try {
    if (existingTestIds.length > 0 || existingClassIds.length > 0) {
      const deleteBatch = writeBatch(db);
      for (const tid of existingTestIds) {
        deleteBatch.delete(doc(db, 'users', uid, 'tests', ensureValidDocId(tid, 'test')));
      }
      for (const cid of existingClassIds) {
        deleteBatch.delete(doc(db, 'users', uid, 'classes', ensureValidDocId(cid, 'class')));
      }
      await deleteBatch.commit();
    }

    const writeBatchOp = writeBatch(db);
    writeBatchOp.update(doc(db, 'users', uid), {
      settings: sanitizeSettingsForFirestore(nextData.settings),
      updatedAt: serverTimestamp(),
    });

    const validClasses = new Set<string>();
    for (const cls of nextData.classes) {
      const safeCid = ensureValidDocId(cls.id, 'class');
      validClasses.add(safeCid);
      writeBatchOp.set(doc(db, 'users', uid, 'classes', safeCid), {
        ownerId: uid,
        id: safeCid,
        ...sanitizeClassroomFields(cls),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    for (const tItem of nextData.tests) {
      const safeCid = ensureValidDocId(tItem.classId, 'class');
      if (!validClasses.has(safeCid)) continue;
      const safeTid = ensureValidDocId(tItem.id, 'test');
      writeBatchOp.set(doc(db, 'users', uid, 'tests', safeTid), {
        ownerId: uid,
        id: safeTid,
        classId: safeCid,
        ...sanitizeTestFields(tItem),
        clientCreatedAt: Number(tItem.createdAt) || Date.now(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    await writeBatchOp.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}
