import { useEffect, useState } from 'react';
import { AppData, AppSettings, Classroom, TestRecord } from './types';
import { getTranslations } from './i18n';
import {
  createDemoData,
  createEmptyAppData,
  loadAppData,
  saveAppData,
} from './utils/storage';
import { AppScreen, Navbar } from './components/Navbar';
import { HomeView } from './components/HomeView';
import { ClassesView } from './components/ClassesView';
import { TestsView } from './components/TestsView';
import { ResultsView } from './components/ResultsView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';

export default function App() {
  const [data, setData] = useState<AppData>(() => loadAppData());
  const [screen, setScreen] = useState<AppScreen>('home');
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [newTestClassId, setNewTestClassId] = useState<string | null>(null);

  const t = getTranslations(data.settings.language);

  // Auto-save whenever data changes
  useEffect(() => {
    saveAppData(data);
  }, [data]);

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
    const id = `class-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newClass: Classroom = { id, name, subjects, students: [] };
    setData((prev) => ({ ...prev, classes: [...prev.classes, newClass] }));
    return id;
  };

  const handleUpdateClass = (updated: Classroom) => {
    setData((prev) => ({
      ...prev,
      classes: prev.classes.map((c) => (c.id === updated.id ? updated : c)),
    }));
  };

  const handleDeleteClass = (id: string) => {
    setData((prev) => ({
      ...prev,
      classes: prev.classes.filter((c) => c.id !== id),
      tests: prev.tests.filter((testItem) => testItem.classId !== id),
    }));
    if (selectedClassId === id) setSelectedClassId(null);
  };

  const handleCreateTest = (test: TestRecord) => {
    setData((prev) => ({ ...prev, tests: [...prev.tests, test] }));
    setNewTestClassId(null);
  };

  const handleUpdateTest = (updated: TestRecord) => {
    setData((prev) => ({
      ...prev,
      tests: prev.tests.map((item) => (item.id === updated.id ? updated : item)),
    }));
  };

  const handleDeleteTest = (id: string) => {
    setData((prev) => ({
      ...prev,
      tests: prev.tests.filter((item) => item.id !== id),
    }));
    if (selectedTestId === id) setSelectedTestId(null);
  };

  const handleUpdateSettings = (nextSettings: AppSettings) => {
    setData((prev) => ({ ...prev, settings: nextSettings }));
  };

  const handleLoadDemoData = () => {
    const demo = createDemoData(data.settings);
    setData(demo);
    setSelectedClassId(demo.classes[0]?.id ?? null);
    setSelectedTestId(demo.tests[1]?.id ?? demo.tests[0]?.id ?? null);
  };

  const handleRestoreData = (restored: AppData) => {
    setData(restored);
    setSelectedClassId(restored.classes[0]?.id ?? null);
    setSelectedTestId(restored.tests[0]?.id ?? null);
  };

  const handleClearAllData = () => {
    setData(createEmptyAppData());
    setSelectedClassId(null);
    setSelectedTestId(null);
  };

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
            onUpdateSettings={handleUpdateSettings}
            onRestoreData={handleRestoreData}
            onClearAllData={handleClearAllData}
          />
        )}
      </main>
    </div>
  );
}
