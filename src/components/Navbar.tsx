import React from 'react';
import {
  Home,
  Users,
  ClipboardEdit,
  FileText,
  Settings,
  Plus,
} from 'lucide-react';
import { Translations } from '../i18n';
import { AppLanguage } from '../types';

export type AppScreen = 'home' | 'classes' | 'tests' | 'results' | 'reports' | 'settings';

interface NavbarProps {
  activeScreen: AppScreen;
  onNavigate: (screen: AppScreen) => void;
  onNewTest: () => void;
  t: Translations;
  language: AppLanguage;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeScreen,
  onNavigate,
  onNewTest,
  t,
  language,
}) => {
  const isUrdu = language === 'ur';

  const navItems: Array<{ id: AppScreen; label: string; icon: React.ReactNode }> = [
    { id: 'home', label: t.navHome, icon: <Home className="w-5 h-5" /> },
    { id: 'classes', label: t.navClasses, icon: <Users className="w-5 h-5" /> },
    { id: 'tests', label: t.navTests, icon: <ClipboardEdit className="w-5 h-5" /> },
    { id: 'reports', label: t.navReports, icon: <FileText className="w-5 h-5" /> },
    { id: 'settings', label: t.navSettings, icon: <Settings className="w-5 h-5" /> },
  ];

  const isNavActive = (id: AppScreen) =>
    activeScreen === id || (id === 'tests' && activeScreen === 'results');

  return (
    <>
      {/* Desktop & Mobile Top Header (3-zone contract on desktop, compact 52px on mobile) */}
      <header className="no-print sticky top-0 z-30 h-14 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto h-full px-4 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className={`text-base sm:text-lg font-bold tracking-tight text-[#0F2547] dark:text-slate-100 whitespace-nowrap shrink-0 min-h-[44px] flex items-center cursor-pointer ${
              isUrdu ? 'font-urdu' : ''
            }`}
          >
            {t.appName}
          </button>

          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => {
              const active = isNavActive(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={`min-h-[44px] px-1 text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer border-b-2 ${
                    active
                      ? 'text-[#0F2547] dark:text-amber-400 border-[#B8860B] dark:border-amber-400'
                      : 'text-slate-600 dark:text-slate-300 border-transparent hover:text-[#0F2547] dark:hover:text-white'
                  } ${isUrdu ? 'font-urdu' : ''}`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={onNewTest}
              className={`min-h-[40px] px-4 py-2 rounded-lg bg-[#0F2547] hover:bg-[#16325C] dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer ${
                isUrdu ? 'font-urdu' : ''
              }`}
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>{t.newTest}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Fixed Bottom Tab Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="no-print md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid grid-cols-5 h-16 items-center">
          {navItems.map((item) => {
            const active = isNavActive(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`min-h-[44px] h-full flex flex-col items-center justify-center gap-0.5 px-1 transition-colors cursor-pointer ${
                  active
                    ? 'text-[#0F2547] dark:text-amber-400 font-semibold'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <span className={active ? 'text-[#B8860B] dark:text-amber-400' : ''}>
                  {item.icon}
                </span>
                <span
                  className={`text-[11px] leading-tight truncate max-w-full ${
                    isUrdu ? 'font-urdu text-[10px]' : ''
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
