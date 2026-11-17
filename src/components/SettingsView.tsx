import React, { useRef, useState } from 'react';
import {
  Upload,
  Trash2,
  Plus,
  RotateCcw,
  Download,
  FolderUp,
  Sun,
  Moon,
  Sparkles,
  AlertTriangle,
  LogOut,
  LogIn,
  Cloud,
} from 'lucide-react';
import { AppData, AppSettings, GradeBand } from '../types';
import { Translations } from '../i18n';
import {
  DEFAULT_GRADING_SCALE,
  downloadBackupFile,
  normalizeAppData,
} from '../utils/storage';

interface SettingsViewProps {
  data: AppData;
  t: Translations;
  userEmail: string | null;
  userName: string | null;
  syncStatus: 'synced' | 'syncing' | 'local';
  onSignOut: () => void;
  onOpenLogin: () => void;
  onUpdateSettings: (next: AppSettings) => void;
  onRestoreData: (restored: AppData) => void;
  onClearAllData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  data,
  t,
  userEmail,
  userName,
  syncStatus,
  onSignOut,
  onOpenLogin,
  onUpdateSettings,
  onRestoreData,
  onClearAllData,
}) => {
  const { settings } = data;
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const restoreInputRef = useRef<HTMLInputElement | null>(null);
  const [restoreMessage, setRestoreMessage] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 240;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/png');
          onUpdateSettings({ ...settings, schoolLogoDataUrl: dataUrl });
        }
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleGradeChange = (idx: number, field: keyof GradeBand, value: string) => {
    const updated = settings.gradingScale.map((band, i) =>
      i === idx
        ? {
            ...band,
            [field]: field === 'minPercentage' ? Number(value) : value,
          }
        : band
    );
    onUpdateSettings({ ...settings, gradingScale: updated });
  };

  const handleAddGradeBand = () => {
    onUpdateSettings({
      ...settings,
      gradingScale: [...settings.gradingScale, { grade: 'B+', minPercentage: 65 }],
    });
  };

  const handleRemoveGradeBand = (idx: number) => {
    if (settings.gradingScale.length <= 1) return;
    onUpdateSettings({
      ...settings,
      gradingScale: settings.gradingScale.filter((_, i) => i !== idx),
    });
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const normalized = normalizeAppData(parsed);
      onRestoreData(normalized);
      setRestoreMessage(
        `Restored ${normalized.classes.length} class(es) and ${normalized.tests.length} test(s).`
      );
    } catch {
      setRestoreMessage('Invalid backup file. Please choose a valid JSON backup.');
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Account & Cloud Sync */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base sm:text-lg font-bold text-[#0F2547] dark:text-slate-100 flex items-center gap-2">
            <Cloud className="w-5 h-5 text-[#B8860B] dark:text-amber-400" />
            <span>Account & Saved Work</span>
          </h2>
          {userEmail ? (
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              Signed in as <span className="font-semibold">{userName || userEmail}</span>
              {userName ? ` (${userEmail})` : ''} ·{' '}
              <span className="font-medium text-emerald-700 dark:text-emerald-400">
                {syncStatus === 'syncing' ? 'Saving to cloud...' : 'Saved to cloud'}
              </span>
            </p>
          ) : (
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              Currently in local device mode. Sign in with Google to save your work across devices and sessions.
            </p>
          )}
        </div>

        <div className="shrink-0">
          {userEmail ? (
            <button
              type="button"
              onClick={onSignOut}
              className="min-h-[44px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenLogin}
              className="min-h-[44px] px-4 rounded-xl bg-[#0F2547] hover:bg-[#16325C] dark:bg-amber-500 dark:text-slate-950 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign in with Google</span>
            </button>
          )}
        </div>
      </section>

      {/* School Identity */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4">
        <h2 className="text-base sm:text-lg font-bold text-[#0F2547] dark:text-slate-100">
          {t.schoolName} & {t.schoolLogo}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              {t.schoolName}
            </label>
            <input
              type="text"
              value={settings.schoolName}
              onChange={(e) =>
                onUpdateSettings({ ...settings, schoolName: e.target.value })
              }
              placeholder="e.g. Crescent Model High School"
              className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              {t.schoolLogo}
            </label>
            <div className="flex items-center gap-3">
              {settings.schoolLogoDataUrl && (
                <img
                  src={settings.schoolLogoDataUrl}
                  alt="School Logo Preview"
                  className="w-12 h-12 rounded-xl object-contain border border-slate-200 dark:border-slate-700 bg-white p-1"
                  referrerPolicy="no-referrer"
                />
              )}
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="min-h-[44px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>{t.uploadLogo}</span>
              </button>
              {settings.schoolLogoDataUrl && (
                <button
                  type="button"
                  onClick={() =>
                    onUpdateSettings({ ...settings, schoolLogoDataUrl: undefined })
                  }
                  className="min-h-[44px] px-3 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 cursor-pointer"
                >
                  {t.removeLogo}
                </button>
              )}
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Appearance & Language */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-[#0F2547] dark:text-slate-100">
            {t.theme}
          </h3>
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-950">
            <button
              type="button"
              onClick={() => onUpdateSettings({ ...settings, theme: 'light' })}
              className={`min-h-[44px] rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                settings.theme === 'light'
                  ? 'bg-white text-[#0F2547] shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Sun className="w-4 h-4" />
              <span>{t.lightMode}</span>
            </button>
            <button
              type="button"
              onClick={() => onUpdateSettings({ ...settings, theme: 'dark' })}
              className={`min-h-[44px] rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                settings.theme === 'dark'
                  ? 'bg-slate-800 text-amber-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Moon className="w-4 h-4" />
              <span>{t.darkMode}</span>
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-bold text-[#0F2547] dark:text-slate-100">
            {t.language}
          </h3>
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-950">
            <button
              type="button"
              onClick={() => onUpdateSettings({ ...settings, language: 'en' })}
              className={`min-h-[44px] rounded-lg text-xs sm:text-sm font-semibold cursor-pointer ${
                settings.language === 'en'
                  ? 'bg-white dark:bg-slate-800 text-[#0F2547] dark:text-amber-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              English (LTR)
            </button>
            <button
              type="button"
              onClick={() => onUpdateSettings({ ...settings, language: 'ur' })}
              className={`min-h-[44px] rounded-lg text-xs sm:text-sm font-semibold font-urdu cursor-pointer ${
                settings.language === 'ur'
                  ? 'bg-white dark:bg-slate-800 text-[#0F2547] dark:text-amber-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              اردو (RTL)
            </button>
          </div>
        </div>
      </section>

      {/* Pass Percentage & Signature Names */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4">
        <h2 className="text-base sm:text-lg font-bold text-[#0F2547] dark:text-slate-100">
          {t.signatures} & {t.passPercentage}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              {t.passPercentage}
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={settings.defaultPassPercentage}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  defaultPassPercentage: Number(e.target.value) || 33,
                })
              }
              className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-nums"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              {t.classTeacherSig}
            </label>
            <input
              type="text"
              value={settings.classTeacherName}
              onChange={(e) =>
                onUpdateSettings({ ...settings, classTeacherName: e.target.value })
              }
              placeholder="e.g. Mrs. Nadia Tariq"
              className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              {t.principalSig}
            </label>
            <input
              type="text"
              value={settings.principalName}
              onChange={(e) =>
                onUpdateSettings({ ...settings, principalName: e.target.value })
              }
              placeholder="e.g. Mr. Waqar Ahmed"
              className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>
        </div>
      </section>

      {/* Editable Grading Scale */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#0F2547] dark:text-slate-100">
              {t.gradingScale}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Changes immediately recalculate grades across all tests and report cards.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                onUpdateSettings({
                  ...settings,
                  gradingScale: DEFAULT_GRADING_SCALE.map((g) => ({ ...g })),
                })
              }
              className="min-h-[40px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t.resetDefaultScale}</span>
            </button>
            <button
              type="button"
              onClick={handleAddGradeBand}
              className="min-h-[40px] px-3 rounded-xl bg-[#0F2547] dark:bg-amber-500 text-white dark:text-slate-950 text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.addGradeBand}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {settings.gradingScale.map((band, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
            >
              <input
                type="text"
                value={band.grade}
                onChange={(e) => handleGradeChange(idx, 'grade', e.target.value)}
                aria-label="Grade label"
                className="w-16 min-h-[40px] px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold text-center"
              />
              <span className="text-xs text-slate-500">&ge;</span>
              <input
                type="number"
                min={0}
                max={100}
                value={band.minPercentage}
                onChange={(e) =>
                  handleGradeChange(idx, 'minPercentage', e.target.value)
                }
                aria-label="Minimum percentage"
                className="flex-1 min-h-[40px] px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono-nums"
              />
              <span className="text-xs text-slate-500">%</span>
              <button
                type="button"
                onClick={() => handleRemoveGradeBand(idx)}
                aria-label="Remove grade"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:text-red-600 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Optional AI Remarks Setting */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-2">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-[#0F2547] dark:text-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#B8860B] dark:text-amber-400" />
              <span>{t.aiRemarksSetting}</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Adds a &ldquo;Write remark&rdquo; button powered by the server-side Gemini endpoint (/api/remarks). Only subject names, marks, and trends are sent — student names and phone numbers are never transmitted. You can always type or edit remarks manually.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.aiRemarksEnabled}
            onClick={() =>
              onUpdateSettings({
                ...settings,
                aiRemarksEnabled: !settings.aiRemarksEnabled,
              })
            }
            className={`min-h-[44px] px-4 rounded-xl text-xs font-bold shrink-0 cursor-pointer transition-colors ${
              settings.aiRemarksEnabled
                ? 'bg-[#0F2547] dark:bg-amber-500 text-white dark:text-slate-950'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            {settings.aiRemarksEnabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>
      </section>

      {/* Backup, Restore & Clear Data */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[#0F2547] dark:text-slate-100">
            {t.backupRestore}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t.localNotice}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => downloadBackupFile(data)}
            className="min-h-[44px] px-4 rounded-xl bg-[#0F2547] hover:bg-[#16325C] dark:bg-amber-500 dark:text-slate-950 text-white text-sm font-semibold flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{t.backupData}</span>
          </button>

          <button
            type="button"
            onClick={() => restoreInputRef.current?.click()}
            className="min-h-[44px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-semibold flex items-center gap-2 cursor-pointer"
          >
            <FolderUp className="w-4 h-4" />
            <span>{t.restoreData}</span>
          </button>
          <input
            ref={restoreInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleRestoreFile}
            className="hidden"
          />

          {!confirmClear ? (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="min-h-[44px] px-4 rounded-xl text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>{t.clearAllData}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 p-2 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span className="text-xs font-semibold text-red-700 dark:text-red-300">
                Delete all classes & tests?
              </span>
              <button
                type="button"
                onClick={() => {
                  onClearAllData();
                  setConfirmClear(false);
                  setRestoreMessage('All device data cleared.');
                }}
                className="min-h-[36px] px-3 rounded-lg bg-red-600 text-white text-xs font-bold cursor-pointer"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="min-h-[36px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium cursor-pointer"
              >
                {t.cancel}
              </button>
            </div>
          )}
        </div>

        {restoreMessage && (
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
            {restoreMessage}
          </p>
        )}
      </section>
    </div>
  );
};
