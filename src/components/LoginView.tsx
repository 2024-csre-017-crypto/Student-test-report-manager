import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { ShieldCheck, Cloud, Smartphone, AlertCircle, LogIn } from 'lucide-react';
import { auth, googleProvider } from '../firebase';
import { AppLanguage } from '../types';
import { Translations } from '../i18n';

interface LoginViewProps {
  t: Translations;
  language: AppLanguage;
  onChangeLanguage: (lang: AppLanguage) => void;
  onContinueOffline: () => void;
  hasLocalData: boolean;
}

export const LoginView: React.FC<LoginViewProps> = ({
  t,
  language,
  onChangeLanguage,
  onContinueOffline,
  hasLocalData,
}) => {
  const [signingIn, setSigningIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const isUrdu = language === 'ur';

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      if (code === 'auth/popup-closed-by-user') {
        setErrorMsg(
          isUrdu
            ? 'سائن ان پاپ اپ بند ہو گیا۔ دوبارہ کوشش کریں۔'
            : 'Sign-in window was closed. Tap "Sign in with Google" to try again.'
        );
      } else if (code === 'auth/unauthorized-domain') {
        setErrorMsg(
          isUrdu
            ? 'یہ ڈومین Firebase Auth میں شامل نہیں ہے۔ لوکل ڈیوائس موڈ استعمال کریں یا Firebase Console میں ڈومین شامل کریں۔'
            : `This domain (${window.location.hostname}) is not yet added under Firebase Console > Authentication > Settings > Authorized domains. You can add it there or continue on this device below.`
        );
      } else if (code === 'auth/popup-blocked') {
        setErrorMsg(
          isUrdu
            ? 'براؤزر نے پاپ اپ بلاک کر دیا۔ براہ کرم پاپ اپ کی اجازت دیں۔'
            : 'Pop-up was blocked by your browser. Please allow pop-ups for this site and try again.'
        );
      } else {
        setErrorMsg(
          err instanceof Error
            ? err.message
            : 'Sign-in failed. Please check your internet connection.'
        );
      }
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div
      dir={isUrdu ? 'rtl' : 'ltr'}
      className={`min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between p-4 sm:p-6 ${
        isUrdu ? 'font-urdu' : ''
      }`}
    >
      {/* Top Language Toggle */}
      <div className="max-w-md w-full mx-auto flex justify-end">
        <div className="inline-flex p-1 rounded-xl bg-slate-200/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => onChangeLanguage('en')}
            className={`min-h-[40px] px-3.5 rounded-lg text-xs font-semibold cursor-pointer ${
              language === 'en'
                ? 'bg-white dark:bg-slate-800 text-[#0F2547] dark:text-amber-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => onChangeLanguage('ur')}
            className={`min-h-[40px] px-3.5 rounded-lg text-xs font-semibold font-urdu cursor-pointer ${
              language === 'ur'
                ? 'bg-white dark:bg-slate-800 text-[#0F2547] dark:text-amber-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            اردو
          </button>
        </div>
      </div>

      {/* Center Login Card */}
      <main className="max-w-md w-full mx-auto my-auto py-6">
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          {/* Navy Header Banner */}
          <div className="bg-[#0F2547] text-white p-6 space-y-2 border-b-2 border-[#B8860B]">
            <h1
              className="text-xl sm:text-2xl font-bold tracking-tight"
              style={{ textWrap: 'balance' }}
            >
              {t.appName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {isUrdu
                ? 'اپنی تمام کلاسز، طلبہ، ٹیسٹ اور نمبر محفوظ رکھنے کے لیے سائن ان کریں۔ ایپ بند کر کے دوبارہ کھولنے پر آپ کا پچھلا کام خودکار طور پر واپس آ جائے گا۔'
                : 'Sign in so your classes, students, marks, and report cards stay saved even after closing the app or switching phones.'}
            </p>
          </div>

          <div className="p-6 space-y-5">
            <div className="space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              <div className="flex items-start gap-3">
                <Cloud className="w-5 h-5 text-[#B8860B] dark:text-amber-400 shrink-0 mt-0.5" />
                <span>
                  {isUrdu
                    ? 'ہر تبدیلی خودکار طور پر آپ کے اکاؤنٹ میں محفوظ ہوتی ہے۔'
                    : 'Every class, test mark, and remark saves automatically to your account.'}
                </span>
              </div>
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#B8860B] dark:text-amber-400 shrink-0 mt-0.5" />
                <span>
                  {isUrdu
                    ? 'آپ کا ڈیٹا صرف آپ کے اپنے اکاؤنٹ تک محدود اور محفوظ رہتا ہے۔'
                    : 'Your student records remain private to your signed-in Google account.'}
                </span>
              </div>
              {hasLocalData && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
                  {isUrdu
                    ? 'اس ڈیوائس پر پہلے سے موجود کام سائن ان کرنے پر آپ کے اکاؤنٹ میں خودکار طور پر منتقل ہو جائے گا۔'
                    : 'Existing work found on this device will automatically transfer to your account when you sign in.'}
                </div>
              )}
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                disabled={signingIn}
                onClick={handleGoogleSignIn}
                className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-[#0F2547] hover:bg-[#16325C] dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 font-semibold text-sm flex items-center justify-center gap-2.5 transition-colors cursor-pointer disabled:opacity-60"
              >
                <LogIn className="w-5 h-5" />
                <span>
                  {signingIn
                    ? isUrdu
                      ? 'سائن ان ہو رہا ہے...'
                      : 'Signing in...'
                    : isUrdu
                    ? 'Google کے ساتھ سائن ان کریں'
                    : 'Sign in with Google'}
                </span>
              </button>

              <button
                type="button"
                onClick={onContinueOffline}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Smartphone className="w-4 h-4" />
                <span>
                  {isUrdu
                    ? 'بغیر لاگ اِن صرف اس ڈیوائس پر استعمال کریں'
                    : 'Continue on this device only (without sign-in)'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </main>

      <footer className="max-w-md w-full mx-auto text-center text-xs text-slate-400">
        {isUrdu
          ? 'محفوظ کلاؤڈ اور آف لائن کیش سپورٹ'
          : 'Your session stays signed in when you reopen the app'}
      </footer>
    </div>
  );
};
