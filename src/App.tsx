import { useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from './firebase';
import { AppData, AppSettings, Classroom, TestRecord } from './types';
import { getTranslations } from './i18n';
import {
  createDemoData,
  createEmptyAppData,
  getLocalOnlyPreference,
  loadAppData,
  saveAppData,
  setLocalOnlyPreference,
} from './utils/storage';
import {
  createClassInCloud,
  createTestInCloud,
  deleteClassInCloud,
  deleteTestInCloud,
  ensureValidDocId,
  ensureWorkspaceAndMigrateIfEmpty,
  replaceAllCloudData,
  saveSettingsToCloud,
  subscribeUserWorkspace,
  updateClassInCloud,
  updateTestInCloud,
} from './services/firestoreSync';
import { AppScreen, Navbar } from './components/Navbar';
import { LoginView } from './components/LoginView';
import { HomeView } from './components/HomeView';
import { ClassesView } from './components/ClassesView';
import { TestsView } from './components/TestsView';
import { ResultsView } from './components/ResultsView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [localOnlyMode, setLocalOnlyMode] = useState<boolean>(() =>
    getLocalOnlyPreference()
  );
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'local'>('local');
  const [cloudError, setCloudError] = useState<Error | null>(null);

  const [data, setData] = useState<AppData>(() => loadAppData());
  const [screen, setScreen] = useState<AppScreen>('home');
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [newTestClassId, setNewTestClassId] = useState<string | null>(null);

  // Debounce timers for rapid marks typing / settings edits
  const testWriteTimersRef = useRef<Record<string, number>>({});
  const settingsTimerRef = useRef<number | null>(null);

  // Throw cloud errors to ErrorBoundary cleanly
  if (cloudError) {
    throw cloudError;
  }

  // Listen to Firebase Auth state (persisted across app close/reopen)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        setLocalOnlyMode(false);
        setLocalOnlyPreference(false);
        const cached = loadAppData(nextUser.uid);
        const anonymousLocal = loadAppData();
        // If user cache is empty, start with anonymous local data until Firestore snapshot arrives
        if (cached.classes.length === 0 && anonymousLocal.classes.length > 0) {
          setData(anonymousLocal);
        } else if (cached.classes.length > 0 || cached.settings.schoolName) {
          setData(cached);
        }
        setSyncStatus('syncing');
      } else {
        setSyncStatus('local');
        setData(loadAppData());
      }
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Connect Firestore listeners once authenticated
  useEffect(() => {
    if (!authReady || !user) return;

    let cancelled = false;
    let unsubSnapshot: (() => void) | null = null;

    async function initCloud() {
      if (!user) return;
      try {
        const initialLocal = loadAppData();
        await ensureWorkspaceAndMigrateIfEmpty(user, initialLocal);
        if (cancelled) return;

        unsubSnapshot = subscribeUserWorkspace(user.uid, {
          onSettings: (settings) => {
            setData((prev) => {
              const next = { ...prev, settings };
              saveAppData(next, user.uid);
              return next;
            });
            setSyncStatus('synced');
          },
          onClasses: (classes) => {
            setData((prev) => {
              const next = { ...prev, classes };
              saveAppData(next, user.uid);
              return next;
            });
            setSyncStatus('synced');
          },
          onTests: (tests) => {
            setData((prev) => {
              const next = { ...prev, tests };
              saveAppData(next, user.uid);
              return next;
            });
            setSyncStatus('synced');
          },
          onError: (err) => {
            setCloudError(err);
          },
        });
      } catch (err) {
        if (!cancelled) {
          setCloudError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    }

    initCloud();

    return () => {
      cancelled = true;
      if (unsubSnapshot) unsubSnapshot();
    };
  }, [authReady, user]);

  // Cache data locally whenever it changes
  useEffect(() => {
    if (!authReady) return;
    if (user) {
      saveAppData(data, user.uid);
    } else {
      saveAppData(data);
    }
  }, [data, user, authReady]);

  const t = getTranslations(data.settings.language);

  // Sync Tailwind dark mode class & document RTL direction
  useEffect(() => {
    const root = document.documentElement;
    if (data.settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.dir = data.settings.language === 'ur' ? 'rtl' : 'ltr';
    root.lang = data.settings.language;
  }, [data.settings.theme, data.settings.language]);

  const handleNewTest = (classId?: string) => {
    if (data.classes.length === 0) {
      setScreen('classes');
      return;
    }
    setNewTestClassId(classId ?? data.classes[0].id);
    setScreen('tests');
  };

  const handleCreateClass = (name: string, subjects: string[]): string => {
    const id = ensureValidDocId(
      `class-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      'class'
    );
    const newClass: Classroom = { id, name, subjects, students: [] };
    setData((prev) => ({ ...prev, classes: [...prev.classes, newClass] }));
    if (user) {
      setSyncStatus('syncing');
      createClassInCloud(user.uid, newClass)
        .then(() => setSyncStatus('synced'))
        .catch((err) => setCloudError(err instanceof Error ? err : new Error(String(err))));
    }
    return id;
  };

  const handleUpdateClass = (updated: Classroom) => {
    setData((prev) => ({
      ...prev,
      classes: prev.classes.map((c) => (c.id === updated.id ? updated : c)),
    }));
    if (user) {
      setSyncStatus('syncing');
      updateClassInCloud(user.uid, updated)
        .then(() => setSyncStatus('synced'))
        .catch((err) => setCloudError(err instanceof Error ? err : new Error(String(err))));
    }
  };

  const handleDeleteClass = (id: string) => {
    const relatedTestIds = data.tests
      .filter((item) => item.classId === id)
      .map((item) => item.id);
    setData((prev) => ({
      ...prev,
      classes: prev.classes.filter((c) => c.id !== id),
      tests: prev.tests.filter((testItem) => testItem.classId !== id),
    }));
    if (selectedClassId === id) setSelectedClassId(null);
    if (user) {
      setSyncStatus('syncing');
      deleteClassInCloud(user.uid, id, relatedTestIds)
        .then(() => setSyncStatus('synced'))
        .catch((err) => setCloudError(err instanceof Error ? err : new Error(String(err))));
    }
  };

  const handleCreateTest = (test: TestRecord) => {
    const safeTest: TestRecord = {
      ...test,
      id: ensureValidDocId(test.id, 'test'),
      classId: ensureValidDocId(test.classId, 'class'),
    };
    setData((prev) => ({ ...prev, tests: [...prev.tests, safeTest] }));
    setNewTestClassId(null);
    if (user) {
      setSyncStatus('syncing');
      createTestInCloud(user.uid, safeTest)
        .then(() => setSyncStatus('synced'))
        .catch((err) => setCloudError(err instanceof Error ? err : new Error(String(err))));
    }
  };

  const handleUpdateTest = (updated: TestRecord) => {
    setData((prev) => ({
      ...prev,
      tests: prev.tests.map((item) => (item.id === updated.id ? updated : item)),
    }));
    if (user) {
      setSyncStatus('syncing');
      if (testWriteTimersRef.current[updated.id]) {
        window.clearTimeout(testWriteTimersRef.current[updated.id]);
      }
      testWriteTimersRef.current[updated.id] = window.setTimeout(() => {
        updateTestInCloud(user.uid, updated)
          .then(() => setSyncStatus('synced'))
          .catch((err) => setCloudError(err instanceof Error ? err : new Error(String(err))));
      }, 350);
    }
  };

  const handleDeleteTest = (id: string) => {
    setData((prev) => ({
      ...prev,
      tests: prev.tests.filter((item) => item.id !== id),
    }));
    if (selectedTestId === id) setSelectedTestId(null);
    if (user) {
      setSyncStatus('syncing');
      deleteTestInCloud(user.uid, id)
        .then(() => setSyncStatus('synced'))
        .catch((err) => setCloudError(err instanceof Error ? err : new Error(String(err))));
    }
  };

  const handleUpdateSettings = (nextSettings: AppSettings) => {
    setData((prev) => ({ ...prev, settings: nextSettings }));
    if (user) {
      setSyncStatus('syncing');
      if (settingsTimerRef.current) {
        window.clearTimeout(settingsTimerRef.current);
      }
      settingsTimerRef.current = window.setTimeout(() => {
        saveSettingsToCloud(user.uid, nextSettings)
          .then(() => setSyncStatus('synced'))
          .catch((err) => setCloudError(err instanceof Error ? err : new Error(String(err))));
      }, 350);
    }
  };

  const applyFullDataReplace = (nextData: AppData) => {
    const prevClassIds = data.classes.map((c) => c.id);
    const prevTestIds = data.tests.map((item) => item.id);
    setData(nextData);
    setSelectedClassId(nextData.classes[0]?.id ?? null);
    setSelectedTestId(nextData.tests[1]?.id ?? nextData.tests[0]?.id ?? null);
    if (user) {
      setSyncStatus('syncing');
      replaceAllCloudData(user.uid, nextData, prevClassIds, prevTestIds)
        .then(() => setSyncStatus('synced'))
        .catch((err) => setCloudError(err instanceof Error ? err : new Error(String(err))));
    }
  };

  const handleLoadDemoData = () => {
    applyFullDataReplace(createDemoData(data.settings));
  };

  const handleRestoreData = (restored: AppData) => {
    applyFullDataReplace(restored);
  };

  const handleClearAllData = () => {
    applyFullDataReplace(createEmptyAppData());
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setLocalOnlyMode(false);
    setLocalOnlyPreference(false);
    setScreen('home');
  };

  const handleContinueOffline = () => {
    setLocalOnlyMode(true);
    setLocalOnlyPreference(true);
  };

  const handleOpenLogin = () => {
    setLocalOnlyMode(false);
    setLocalOnlyPreference(false);
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-[#0F2547] dark:border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Loading saved workspace...
          </p>
        </div>
      </div>
    );
  }

  if (!user && !localOnlyMode) {
    const localSnapshot = loadAppData();
    return (
      <LoginView
        t={t}
        language={data.settings.language}
        onChangeLanguage={(lang) =>
          handleUpdateSettings({ ...data.settings, language: lang })
        }
        onContinueOffline={handleContinueOffline}
        hasLocalData={localSnapshot.classes.length > 0 || localSnapshot.tests.length > 0}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-24 md:pb-10 print:pb-0 print:bg-white">
      <Navbar
        activeScreen={screen}
        onNavigate={(next) => {
          setNewTestClassId(null);
          setScreen(next);
        }}
        onNewTest={() => handleNewTest()}
        t={t}
        language={data.settings.language}
      />

      <main className="max-w-6xl mx-auto px-4 pt-5 sm:pt-6 print:max-w-none print:p-0">
        {screen === 'home' && (
          <HomeView
            data={data}
            t={t}
            accountEmail={user?.email ?? null}
            onNewTest={(cid) => handleNewTest(cid)}
            onOpenClass={(cid) => {
              setSelectedClassId(cid);
              setScreen('classes');
            }}
            onOpenTestMarks={(tid) => {
              setSelectedTestId(tid);
              setNewTestClassId(null);
              setScreen('tests');
            }}
            onOpenTestResults={(tid) => {
              setSelectedTestId(tid);
              setScreen('results');
            }}
            onOpenClassesTab={() => setScreen('classes')}
            onLoadDemoData={handleLoadDemoData}
          />
        )}

        {screen === 'classes' && (
          <ClassesView
            classes={data.classes}
            selectedClassId={selectedClassId}
            onSelectClass={setSelectedClassId}
            onCreateClass={handleCreateClass}
            onUpdateClass={handleUpdateClass}
            onDeleteClass={handleDeleteClass}
            t={t}
          />
        )}

        {screen === 'tests' && (
          <TestsView
            classes={data.classes}
            tests={data.tests}
            selectedTestId={selectedTestId}
            initialClassIdForNew={newTestClassId}
            settings={data.settings}
            t={t}
            onSelectTest={setSelectedTestId}
            onCreateTest={handleCreateTest}
            onUpdateTest={handleUpdateTest}
            onDeleteTest={handleDeleteTest}
            onOpenResults={(tid) => {
              setSelectedTestId(tid);
              setScreen('results');
            }}
            onGoToClasses={() => setScreen('classes')}
          />
        )}

        {screen === 'results' && (
          <ResultsView
            classes={data.classes}
            tests={data.tests}
            selectedTestId={selectedTestId}
            settings={data.settings}
            t={t}
            onSelectTest={setSelectedTestId}
            onOpenMarks={(tid) => {
              setSelectedTestId(tid);
              setScreen('tests');
            }}
            onOpenReports={(tid) => {
              setSelectedTestId(tid);
              setScreen('reports');
            }}
          />
        )}

        {screen === 'reports' && (
          <ReportsView
            classes={data.classes}
            tests={data.tests}
            selectedTestId={selectedTestId}
            settings={data.settings}
            t={t}
            onSelectTest={setSelectedTestId}
            onUpdateTest={handleUpdateTest}
          />
        )}

        {screen === 'settings' && (
          <SettingsView
            data={data}
            t={t}
            userEmail={user?.email ?? null}
            userName={user?.displayName ?? null}
            syncStatus={syncStatus}
            onSignOut={handleSignOut}
            onOpenLogin={handleOpenLogin}
            onUpdateSettings={handleUpdateSettings}
            onRestoreData={handleRestoreData}
            onClearAllData={handleClearAllData}
          />
        )}
      </main>
    </div>
  );
}
