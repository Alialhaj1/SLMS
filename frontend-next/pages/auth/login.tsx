/**
 * ============================================================================
 * SLMS PROFESSIONAL LANDING + LOGIN PAGE
 * ============================================================================
 * Full landing page with:
 *   - Sticky navbar with logo, nav links, login icon dropdown
 *   - Hero section with animated slider
 *   - About Us section
 *   - Services section
 *   - Products section
 *   - Features grid (from DB)
 *   - News & Announcements
 *   - FAQ / Help
 *   - Terms & Conditions summary
 *   - Footer with contact info
 *   - Login modal: "Platform Clients" / "Platform Admin"
 *   - Account request modal
 *   - All admin-configurable from /admin/platform/login-page
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';
import { useLocale } from '../../contexts/LocaleContext';
import { useTheme } from '../../contexts/ThemeContext';
import MultiStageLoginForm from '../../components/auth/MultiStageLoginForm';
import loginPageService from '../../lib/loginPageService';
import type { LoginPageContent, LoginPageSettings, LoginPageContentItem } from '../../lib/loginPageService';
import {
  ShieldCheckIcon, SunIcon, MoonIcon, GlobeAltIcon, TruckIcon,
  CurrencyDollarIcon, BanknotesIcon, ShoppingCartIcon, FolderIcon,
  SparklesIcon, UserPlusIcon,
  QuestionMarkCircleIcon, NewspaperIcon, MegaphoneIcon,
  EnvelopeIcon, PhoneIcon, ChatBubbleLeftRightIcon,
  ChevronDownIcon, StarIcon, CheckBadgeIcon,
  RocketLaunchIcon, CubeTransparentIcon, ClockIcon, MapPinIcon,
  DocumentCheckIcon, BuildingOffice2Icon, GlobeAmericasIcon,
  BoltIcon, PresentationChartBarIcon, Bars3Icon, XMarkIcon,
  UserCircleIcon, UsersIcon, WrenchScrewdriverIcon,
  ArrowRightIcon, ArrowLeftIcon, InformationCircleIcon,
  HeartIcon, CubeIcon, ServerStackIcon, ChartBarIcon,
  ArrowUpIcon, LockClosedIcon, CloudArrowUpIcon,
  LightBulbIcon, ComputerDesktopIcon, DevicePhoneMobileIcon,
  BuildingStorefrontIcon, ScaleIcon, AcademicCapIcon,
} from '@heroicons/react/24/outline';

/* ━━━ ICON MAP ━━━ */
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  TruckIcon, CurrencyDollarIcon, BanknotesIcon, ShoppingCartIcon, FolderIcon,
  SparklesIcon, ShieldCheckIcon, RocketLaunchIcon, CubeTransparentIcon,
  ClockIcon, MapPinIcon, DocumentCheckIcon, BuildingOffice2Icon,
  GlobeAmericasIcon, BoltIcon, PresentationChartBarIcon, StarIcon,
  CheckBadgeIcon, NewspaperIcon, MegaphoneIcon, ServerStackIcon,
  ChartBarIcon, LockClosedIcon, CloudArrowUpIcon,
};
function DIcon({ name, className }: { name: string | null; className?: string }) {
  const I = name ? ICON_MAP[name] : null;
  return I ? <I className={className} /> : <SparklesIcon className={className} />;
}

/* ━━━ FLOATING PARTICLES ━━━ */
function Particles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 25 }).map((_, i) => (
        <div key={i} className="absolute rounded-full bg-white/10"
          style={{
            width: `${2 + Math.random() * 4}px`, height: `${2 + Math.random() * 4}px`,
            left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
            animation: `slmsFloat ${8 + Math.random() * 14}s ease-in-out ${Math.random() * 6}s infinite alternate`,
          }} />
      ))}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[150px] -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] translate-y-1/3 -translate-x-1/4" />
      <div className="absolute top-1/2 left-1/2 w-[350px] h-[350px] bg-cyan-500/5 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2" />
    </div>
  );
}

/* ━━━ SCROLL TO TOP ━━━ */
function ScrollTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const h = () => setShow(window.scrollY > 400);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);
  if (!show) return null;
  return (
    <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-6 end-6 z-50 w-12 h-12 rounded-full bg-blue-600 text-white shadow-lg shadow-blue-500/30 flex items-center justify-center hover:bg-blue-700 transition-all hover:scale-110 animate-[slmsFadeUp_0.3s_ease-out]">
      <ArrowUpIcon className="w-5 h-5" />
    </button>
  );
}

/* ━━━ NAVBAR ━━━ */
interface NavProps {
  isRTL: boolean; locale: string; setLocale: (l: string) => void;
  theme: string; toggleTheme: () => void; onLogin: (type: 'tenant' | 'admin') => void;
}
function Navbar({ isRTL, locale, setLocale, theme, toggleTheme, onLogin }: NavProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const loginRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (loginRef.current && !loginRef.current.contains(e.target as Node)) setLoginOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const scrollTo = (id: string) => { setMobileOpen(false); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); };
  const navItems = [
    { id: 'about', label: isRTL ? 'من نحن' : 'About Us' },
    { id: 'services', label: isRTL ? 'خدماتنا' : 'Services' },
    { id: 'products', label: isRTL ? 'منتجاتنا' : 'Products' },
    { id: 'features', label: isRTL ? 'المميزات' : 'Features' },
    { id: 'news', label: isRTL ? 'الأخبار' : 'News' },
    { id: 'faq', label: isRTL ? 'المساعدة' : 'Help' },
  ];

  return (
    <nav className={`fixed top-0 inset-x-0 z-[100] transition-all duration-500 ${scrolled ? 'bg-slate-900/95 backdrop-blur-xl shadow-xl shadow-black/10 border-b border-white/5' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <button onClick={() => scrollTo('hero')} className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-all group-hover:scale-105">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <span className="text-white font-bold text-lg tracking-tight">SLMS</span>
              <span className="hidden sm:block text-blue-400/60 text-[10px] font-medium tracking-widest uppercase">
                {isRTL ? 'اللوجستيات الذكية' : 'Smart Logistics'}
              </span>
            </div>
          </button>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-1">
            {navItems.map(n => (
              <button key={n.id} onClick={() => scrollTo(n.id)}
                className="px-3 py-2 text-sm text-white/70 hover:text-white font-medium rounded-lg hover:bg-white/5 transition-all">
                {n.label}
              </button>
            ))}
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            <button onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}
              className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all" title={isRTL ? 'English' : 'عربي'}>
              <GlobeAltIcon className="w-5 h-5" />
            </button>
            <button onClick={toggleTheme} className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all">
              {theme === 'dark' ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
            </button>

            {/* Login Dropdown */}
            <div ref={loginRef} className="relative">
              <button onClick={() => setLoginOpen(!loginOpen)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-semibold hover:from-blue-500 hover:to-cyan-400 transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:scale-105">
                <UserCircleIcon className="w-5 h-5" />
                <span className="hidden sm:inline">{isRTL ? 'تسجيل الدخول' : 'Sign In'}</span>
              </button>
              {loginOpen && (
                <div className="absolute end-0 mt-2 w-64 bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 overflow-hidden animate-[slmsFadeUp_0.2s_ease-out]">
                  <div className="p-3 border-b border-white/5">
                    <p className="text-white/40 text-xs font-medium uppercase tracking-wider px-1">
                      {isRTL ? 'اختر نوع الدخول' : 'Choose Login Type'}
                    </p>
                  </div>
                  <div className="p-2">
                    <button onClick={() => { setLoginOpen(false); onLogin('tenant'); }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-white/80 hover:text-white transition-all group">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/20 transition-all">
                        <UsersIcon className="w-5 h-5 text-blue-400" />
                      </div>
                      <div className={isRTL ? 'text-right' : 'text-left'}>
                        <p className="text-sm font-semibold">{isRTL ? 'عملاء المنصة' : 'Platform Clients'}</p>
                        <p className="text-xs text-white/40">{isRTL ? 'دخول الشركات والمستخدمين' : 'Companies & users login'}</p>
                      </div>
                    </button>
                    <button onClick={() => { setLoginOpen(false); onLogin('admin'); }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-white/80 hover:text-white transition-all group">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/20 transition-all">
                        <ShieldCheckIcon className="w-5 h-5 text-purple-400" />
                      </div>
                      <div className={isRTL ? 'text-right' : 'text-left'}>
                        <p className="text-sm font-semibold">{isRTL ? 'إدارة المنصة' : 'Platform Admin'}</p>
                        <p className="text-xs text-white/40">{isRTL ? 'لوحة تحكم المنصة' : 'Platform management panel'}</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all">
              {mobileOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>
      {/* Mobile nav */}
      {mobileOpen && (
        <div className="lg:hidden bg-slate-900/98 backdrop-blur-xl border-t border-white/5 animate-[slmsFadeUp_0.2s_ease-out]">
          <div className="px-4 py-3 space-y-1">
            {navItems.map(n => (
              <button key={n.id} onClick={() => scrollTo(n.id)}
                className="block w-full text-start px-4 py-3 text-white/70 hover:text-white hover:bg-white/5 rounded-xl transition-all text-sm font-medium">
                {n.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}

/* ━━━ HERO SECTION ━━━ */
function HeroSection({ slides, isRTL, interval, onLogin }: { slides: LoginPageContentItem[]; isRTL: boolean; interval: number; onLogin: () => void }) {
  const [cur, setCur] = useState(0);
  const timer = useRef<NodeJS.Timeout>();
  const reset = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    if (slides.length > 1) timer.current = setInterval(() => setCur(p => (p + 1) % slides.length), interval);
  }, [slides.length, interval]);
  useEffect(() => { reset(); return () => { if (timer.current) clearInterval(timer.current); }; }, [reset]);

  const fallbackSlides = slides.length ? slides : [{
    id: 0, section: 'hero_slide' as const, title: 'Smart Logistics Management System', title_ar: 'نظام إدارة اللوجستيات الذكي',
    subtitle: 'Streamline your operations with AI-powered logistics solutions', subtitle_ar: 'بسّط عملياتك مع حلول لوجستية مدعومة بالذكاء الاصطناعي',
    icon: 'TruckIcon', sort_order: 1, body: null, body_ar: null, image_url: null, link_url: null, link_label: null, link_label_ar: null,
    badge_text: null, badge_text_ar: null, bg_color: null, text_color: null,
  }];
  const s = fallbackSlides[cur % fallbackSlides.length];

  return (
    <section id="hero" className="relative min-h-screen flex items-center overflow-hidden">
      <Particles />
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(59,130,246,0.08),transparent_50%)]" />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-24 pb-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div key={cur} className="animate-[slmsFadeUp_0.6s_ease-out]">
            {s.badge_text && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-bold uppercase tracking-wider rounded-full mb-6">
                <SparklesIcon className="w-3.5 h-3.5" />
                {isRTL ? s.badge_text_ar || s.badge_text : s.badge_text}
              </span>
            )}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.1] mb-6">
              {isRTL ? s.title_ar || s.title : s.title || s.title_ar}
            </h1>
            <p className="text-lg sm:text-xl text-blue-200/70 leading-relaxed mb-8 max-w-xl">
              {isRTL ? s.subtitle_ar || s.subtitle : s.subtitle || s.subtitle_ar}
            </p>
            <div className="flex flex-wrap gap-4">
              <button onClick={onLogin}
                className="group flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold rounded-2xl shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105 transition-all text-base">
                {isRTL ? 'ابدأ الآن' : 'Get Started'}
                {isRTL ? <ArrowLeftIcon className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> : <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
              </button>
              <button onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
                className="flex items-center gap-2 px-8 py-4 bg-white/5 border border-white/10 text-white font-semibold rounded-2xl hover:bg-white/10 transition-all text-base">
                {isRTL ? 'اكتشف المزيد' : 'Learn More'}
              </button>
            </div>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 mt-12 pt-8 border-t border-white/5">
              {[
                { n: '500+', l: isRTL ? 'شركة' : 'Companies' },
                { n: '10K+', l: isRTL ? 'مستخدم' : 'Users' },
                { n: '99.9%', l: isRTL ? 'وقت التشغيل' : 'Uptime' },
              ].map(st => (
                <div key={st.n}>
                  <p className="text-2xl sm:text-3xl font-black text-white">{st.n}</p>
                  <p className="text-white/40 text-sm mt-1">{st.l}</p>
                </div>
              ))}
            </div>
          </div>
          {/* Right side – dashboard mockup */}
          <div className="hidden lg:block relative">
            <div className="relative bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 p-6 shadow-2xl shadow-blue-500/5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-400/60" /><div className="w-3 h-3 rounded-full bg-amber-400/60" /><div className="w-3 h-3 rounded-full bg-emerald-400/60" />
                <span className="ms-2 text-white/30 text-xs">SLMS Dashboard</span>
              </div>
              <div className="space-y-3">
                <div className="h-8 bg-white/5 rounded-lg w-3/4 animate-pulse" />
                <div className="grid grid-cols-3 gap-3">
                  {['from-blue-500/20 to-blue-600/10', 'from-emerald-500/20 to-emerald-600/10', 'from-purple-500/20 to-purple-600/10'].map((g, i) => (
                    <div key={i} className={`h-20 bg-gradient-to-br ${g} rounded-xl border border-white/5 p-3`}>
                      <div className="h-2 bg-white/10 rounded w-1/2 mb-2" /><div className="h-4 bg-white/5 rounded w-3/4" />
                    </div>
                  ))}
                </div>
                <div className="h-32 bg-white/5 rounded-xl border border-white/5 p-4">
                  <div className="flex items-end gap-2 h-full">
                    {[40,65,45,80,55,70,90,60,75,85,50,95].map((h,i) => (
                      <div key={i} className="flex-1 bg-gradient-to-t from-blue-500/30 to-cyan-500/10 rounded-t" style={{height:`${h}%`}} />
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3"><div className="h-16 bg-white/5 rounded-xl border border-white/5" /><div className="h-16 bg-white/5 rounded-xl border border-white/5" /></div>
              </div>
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/10 via-cyan-500/5 to-purple-500/10 rounded-[2rem] blur-xl -z-10" />
            </div>
          </div>
        </div>
        {fallbackSlides.length > 1 && (
          <div className="flex justify-center gap-2 mt-12">
            {fallbackSlides.map((_, i) => (
              <button key={i} onClick={() => { setCur(i); reset(); }}
                className={`h-2 rounded-full transition-all duration-300 ${i === cur % fallbackSlides.length ? 'w-8 bg-blue-400' : 'w-2 bg-white/20 hover:bg-white/40'}`} />
            ))}
          </div>
        )}
      </div>
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center pt-2">
          <div className="w-1.5 h-3 bg-white/40 rounded-full animate-[slmsScrollDot_1.5s_ease-in-out_infinite]" />
        </div>
      </div>
    </section>
  );
}

/* ━━━ ABOUT US ━━━ */
function AboutSection({ isRTL }: { isRTL: boolean }) {
  return (
    <section id="about" className="py-24 bg-gradient-to-b from-slate-950 to-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(59,130,246,0.05),transparent_50%)]" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="inline-flex items-center gap-2 text-blue-400 text-sm font-bold uppercase tracking-widest mb-4">
              <InformationCircleIcon className="w-5 h-5" />{isRTL ? 'من نحن' : 'About Us'}
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-6 leading-tight">
              {isRTL ? 'نقود الابتكار في عالم اللوجستيات' : 'Leading Innovation in Logistics'}
            </h2>
            <p className="text-blue-200/60 leading-relaxed mb-6">
              {isRTL
                ? 'نظام SLMS هو منصة متكاملة لإدارة اللوجستيات والسلسلة التوريدية، مصمم خصيصًا لتلبية احتياجات الشركات في المنطقة. نقدم حلولًا ذكية تعتمد على أحدث التقنيات لتبسيط العمليات وتحسين الكفاءة وخفض التكاليف.'
                : 'SLMS is an integrated logistics and supply chain management platform, designed specifically to meet the needs of enterprises in the region. We deliver smart solutions powered by the latest technologies to streamline operations, improve efficiency, and reduce costs.'}
            </p>
            <p className="text-blue-200/60 leading-relaxed mb-8">
              {isRTL
                ? 'فريقنا من الخبراء المتخصصين يعمل بشكل مستمر على تطوير النظام وإضافة ميزات جديدة تواكب متطلبات السوق المتغيرة، مع الحفاظ على أعلى معايير الأمان والجودة.'
                : 'Our team of specialized experts continuously works on developing the system and adding new features that keep pace with changing market demands, while maintaining the highest standards of security and quality.'}
            </p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: <AcademicCapIcon className="w-5 h-5" />, t: isRTL ? 'خبرة +15 عامًا' : '15+ Years Experience' },
                { icon: <GlobeAmericasIcon className="w-5 h-5" />, t: isRTL ? 'تغطية إقليمية' : 'Regional Coverage' },
                { icon: <ShieldCheckIcon className="w-5 h-5" />, t: isRTL ? 'أمان مؤسسي' : 'Enterprise Security' },
                { icon: <HeartIcon className="w-5 h-5" />, t: isRTL ? 'دعم متواصل 24/7' : '24/7 Support' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className="text-blue-400">{item.icon}</div>
                  <span className="text-white/80 text-sm font-medium">{item.t}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="grid grid-cols-2 gap-4">
              {[
                { n: '500+', l: isRTL ? 'شركة تثق بنا' : 'Trusted Companies', c: 'from-blue-500/20 to-blue-600/5 border-blue-500/10' },
                { n: '50+', l: isRTL ? 'وحدة نظامية' : 'System Modules', c: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/10' },
                { n: '10K+', l: isRTL ? 'مستخدم نشط' : 'Active Users', c: 'from-purple-500/20 to-purple-600/5 border-purple-500/10' },
                { n: '99.9%', l: isRTL ? 'وقت تشغيل' : 'Uptime SLA', c: 'from-amber-500/20 to-amber-600/5 border-amber-500/10' },
              ].map((s, i) => (
                <div key={i} className={`p-6 rounded-2xl bg-gradient-to-br ${s.c} border backdrop-blur-sm text-center hover:scale-105 transition-all`}>
                  <p className="text-3xl font-black text-white mb-2">{s.n}</p>
                  <p className="text-white/50 text-sm">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ━━━ SERVICES ━━━ */
function ServicesSection({ isRTL }: { isRTL: boolean }) {
  const services = [
    { icon: <TruckIcon className="w-7 h-7" />, t: isRTL ? 'إدارة الشحنات' : 'Shipment Management', d: isRTL ? 'تتبع وإدارة جميع شحناتك في الوقت الفعلي مع تنبيهات ذكية وتقارير شاملة' : 'Track and manage all shipments in real-time with smart alerts and comprehensive reports', c: 'from-blue-500/20 to-blue-600/5 border-blue-500/10 hover:border-blue-500/30', ic: 'text-blue-400' },
    { icon: <BanknotesIcon className="w-7 h-7" />, t: isRTL ? 'الإدارة المالية' : 'Financial Management', d: isRTL ? 'نظام محاسبي متكامل يشمل دفتر أستاذ، ذمم مدينة ودائنة، وتسوية بنكية' : 'Complete accounting system with GL, AP/AR, and bank reconciliation', c: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/10 hover:border-emerald-500/30', ic: 'text-emerald-400' },
    { icon: <ShoppingCartIcon className="w-7 h-7" />, t: isRTL ? 'المشتريات والتوريد' : 'Procurement & Supply', d: isRTL ? 'إدارة دورة المشتريات الكاملة من طلبات عروض الأسعار إلى أوامر الشراء' : 'Manage complete procurement cycle from RFQs to purchase orders', c: 'from-purple-500/20 to-purple-600/5 border-purple-500/10 hover:border-purple-500/30', ic: 'text-purple-400' },
    { icon: <FolderIcon className="w-7 h-7" />, t: isRTL ? 'إدارة المشاريع' : 'Project Management', d: isRTL ? 'تتبع المشاريع والمراحل والميزانيات وربطها بالشحنات والمصروفات' : 'Track projects, phases, budgets, and link to shipments and expenses', c: 'from-amber-500/20 to-amber-600/5 border-amber-500/10 hover:border-amber-500/30', ic: 'text-amber-400' },
    { icon: <ChartBarIcon className="w-7 h-7" />, t: isRTL ? 'التقارير والتحليلات' : 'Reports & Analytics', d: isRTL ? 'لوحات معلومات تفاعلية وتقارير مفصلة لاتخاذ قرارات مبنية على البيانات' : 'Interactive dashboards and detailed reports for data-driven decisions', c: 'from-cyan-500/20 to-cyan-600/5 border-cyan-500/10 hover:border-cyan-500/30', ic: 'text-cyan-400' },
    { icon: <ShieldCheckIcon className="w-7 h-7" />, t: isRTL ? 'الأمان والامتثال' : 'Security & Compliance', d: isRTL ? 'مصادقة متعددة العوامل وتحكم بالصلاحيات وسجل تدقيق كامل للامتثال' : 'Multi-factor auth, role-based access control, and full audit trail', c: 'from-rose-500/20 to-rose-600/5 border-rose-500/10 hover:border-rose-500/30', ic: 'text-rose-400' },
  ];
  return (
    <section id="services" className="py-24 bg-slate-900 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 text-cyan-400 text-sm font-bold uppercase tracking-widest mb-4">
            <WrenchScrewdriverIcon className="w-5 h-5" />{isRTL ? 'خدماتنا' : 'Our Services'}
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
            {isRTL ? 'حلول شاملة لكل احتياجاتك' : 'Comprehensive Solutions for Every Need'}
          </h2>
          <p className="text-blue-200/50 max-w-2xl mx-auto">{isRTL ? 'نقدم مجموعة متكاملة من الخدمات المصممة لتحسين كفاءة عملياتك اللوجستية' : 'We offer a complete suite of services designed to optimize your logistics operations'}</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((s, i) => (
            <div key={i} className={`group p-6 rounded-2xl bg-gradient-to-br ${s.c} border backdrop-blur-sm hover:scale-[1.02] transition-all duration-300`}>
              <div className={`w-14 h-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center mb-4 ${s.ic} group-hover:scale-110 transition-transform`}>{s.icon}</div>
              <h3 className="text-white font-bold text-lg mb-2">{s.t}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ━━━ PRODUCTS ━━━ */
function ProductsSection({ isRTL }: { isRTL: boolean }) {
  const products = [
    { icon: <ComputerDesktopIcon className="w-8 h-8" />, name: isRTL ? 'SLMS Enterprise' : 'SLMS Enterprise', desc: isRTL ? 'النظام الكامل للشركات الكبيرة - إدارة شاملة لكل العمليات اللوجستية والمالية والتشغيلية' : 'Full system for large enterprises — comprehensive logistics, financial & operational management', tag: isRTL ? 'الأكثر طلبًا' : 'Most Popular', tagColor: 'bg-blue-500/20 text-blue-300 border-blue-500/20' },
    { icon: <DevicePhoneMobileIcon className="w-8 h-8" />, name: isRTL ? 'SLMS Mobile' : 'SLMS Mobile', desc: isRTL ? 'تطبيق الجوال للوصول السريع - تتبع الشحنات والموافقات وإدارة المهام من أي مكان' : 'Mobile app for quick access — track shipments, approvals & task management from anywhere', tag: isRTL ? 'قريبًا' : 'Coming Soon', tagColor: 'bg-amber-500/20 text-amber-300 border-amber-500/20' },
    { icon: <BuildingStorefrontIcon className="w-8 h-8" />, name: isRTL ? 'SLMS Marketplace' : 'SLMS Marketplace', desc: isRTL ? 'سوق إلكتروني متكامل - منصة تجارة إلكترونية مدمجة مع النظام اللوجستي' : 'Integrated marketplace — e-commerce platform embedded with the logistics system', tag: isRTL ? 'جديد' : 'New', tagColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/20' },
  ];
  return (
    <section id="products" className="py-24 bg-gradient-to-b from-slate-900 to-slate-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(147,51,234,0.05),transparent_50%)]" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 text-purple-400 text-sm font-bold uppercase tracking-widest mb-4">
            <CubeIcon className="w-5 h-5" />{isRTL ? 'منتجاتنا' : 'Our Products'}
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">{isRTL ? 'منتجات مصممة لنجاحك' : 'Products Built for Your Success'}</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {products.map((p, i) => (
            <div key={i} className="group relative p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-white/15 backdrop-blur-sm transition-all duration-500 hover:bg-white/[0.04]">
              <span className={`inline-flex px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border mb-6 ${p.tagColor}`}>{p.tag}</span>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/5 flex items-center justify-center text-white/70 mb-6 group-hover:scale-110 transition-transform">{p.icon}</div>
              <h3 className="text-xl font-bold text-white mb-3">{p.name}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ━━━ FEATURES GRID (from DB) ━━━ */
function FeaturesSection({ features, isRTL }: { features: LoginPageContentItem[]; isRTL: boolean }) {
  const colors = [
    'from-blue-500/15 to-blue-600/5 border-blue-400/10', 'from-emerald-500/15 to-emerald-600/5 border-emerald-400/10',
    'from-purple-500/15 to-purple-600/5 border-purple-400/10', 'from-amber-500/15 to-amber-600/5 border-amber-400/10',
    'from-cyan-500/15 to-cyan-600/5 border-cyan-400/10', 'from-rose-500/15 to-rose-600/5 border-rose-400/10',
  ];
  const iconC = ['text-blue-400', 'text-emerald-400', 'text-purple-400', 'text-amber-400', 'text-cyan-400', 'text-rose-400'];
  if (!features.length) return null;
  return (
    <section id="features" className="py-24 bg-slate-950 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 text-emerald-400 text-sm font-bold uppercase tracking-widest mb-4">
            <RocketLaunchIcon className="w-5 h-5" />{isRTL ? 'المميزات' : 'Features'}
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">{isRTL ? 'مميزات تمنحك التفوق' : 'Features That Give You the Edge'}</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f, i) => (
            <div key={f.id} className={`group p-5 rounded-2xl bg-gradient-to-br ${colors[i % colors.length]} border backdrop-blur-sm hover:scale-[1.04] transition-all duration-300`}>
              <DIcon name={f.icon} className={`w-7 h-7 ${iconC[i % iconC.length]} mb-3 group-hover:scale-110 transition-transform`} />
              <h3 className="text-white font-bold text-sm mb-1.5">{isRTL ? f.title_ar || f.title : f.title || f.title_ar}</h3>
              <p className="text-white/40 text-xs leading-relaxed line-clamp-3">{isRTL ? f.subtitle_ar || f.subtitle : f.subtitle || f.subtitle_ar}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ━━━ NEWS & ANNOUNCEMENTS ━━━ */
function NewsSection({ news, announcements, isRTL }: { news: LoginPageContentItem[]; announcements: LoginPageContentItem[]; isRTL: boolean }) {
  if (!news.length && !announcements.length) return null;
  return (
    <section id="news" className="py-24 bg-gradient-to-b from-slate-950 to-slate-900 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 text-amber-400 text-sm font-bold uppercase tracking-widest mb-4">
            <NewspaperIcon className="w-5 h-5" />{isRTL ? 'آخر الأخبار والإعلانات' : 'Latest News & Announcements'}
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">{isRTL ? 'ابقَ على اطلاع' : 'Stay Informed'}</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {announcements.map(a => (
            <div key={a.id} className="group p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/10 hover:border-amber-500/25 transition-all">
              <div className="flex items-center gap-2 mb-3">
                <MegaphoneIcon className="w-5 h-5 text-amber-400" />
                <span className="text-amber-400/60 text-xs font-bold uppercase tracking-wider">{isRTL ? 'إعلان' : 'Announcement'}</span>
              </div>
              <h3 className="text-white font-bold mb-2">{isRTL ? a.title_ar || a.title : a.title || a.title_ar}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{isRTL ? a.subtitle_ar || a.subtitle : a.subtitle || a.subtitle_ar}</p>
            </div>
          ))}
          {news.map(n => (
            <div key={n.id} className="group p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/15 transition-all">
              <div className="flex items-center gap-2 mb-3">
                <DIcon name={n.icon} className="w-5 h-5 text-blue-400" />
                <span className="text-blue-400/60 text-xs font-bold uppercase tracking-wider">{isRTL ? 'خبر' : 'News'}</span>
              </div>
              <h3 className="text-white font-bold mb-2">{isRTL ? n.title_ar || n.title : n.title || n.title_ar}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{isRTL ? n.subtitle_ar || n.subtitle : n.subtitle || n.subtitle_ar}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ━━━ FAQ / HELP ━━━ */
function FAQSection({ faqs, isRTL }: { faqs: LoginPageContentItem[]; isRTL: boolean }) {
  const [open, setOpen] = useState<number | null>(null);
  const defaultFaqs = [
    { q: isRTL ? 'كيف أقوم بتسجيل الدخول؟' : 'How do I log in?', a: isRTL ? 'اضغط على زر تسجيل الدخول في الأعلى، اختر نوع الدخول، ثم أدخل رمز الشركة (مثال: ACME-001) متبوعًا ببياناتك' : 'Click the Sign In button at the top, choose login type, then enter your company code (e.g., ACME-001) followed by your credentials' },
    { q: isRTL ? 'كيف أطلب فتح حساب جديد؟' : 'How do I request a new account?', a: isRTL ? 'اضغط على "طلب فتح حساب" في صفحة الدخول واملأ النموذج بمعلومات شركتك وسنتواصل معك خلال يوم عمل' : 'Click "Request Account" on the login page, fill in your company details, and we\'ll contact you within 1 business day' },
    { q: isRTL ? 'هل يدعم النظام اللغة العربية؟' : 'Does the system support Arabic?', a: isRTL ? 'نعم، النظام يدعم اللغتين العربية والإنجليزية بالكامل مع واجهة RTL احترافية' : 'Yes, the system fully supports both Arabic and English with professional RTL interface' },
    { q: isRTL ? 'ما هي الأجهزة المدعومة؟' : 'What devices are supported?', a: isRTL ? 'يعمل النظام على جميع المتصفحات الحديثة وعلى الأجهزة المكتبية والأجهزة اللوحية والهواتف الذكية' : 'The system works on all modern browsers and on desktops, tablets, and smartphones' },
    { q: isRTL ? 'كيف أتواصل مع الدعم الفني؟' : 'How do I contact support?', a: isRTL ? 'يمكنك التواصل معنا عبر البريد الإلكتروني أو الهاتف أو واتساب الموجودة في أسفل الصفحة' : 'You can reach us via email, phone, or WhatsApp listed at the bottom of the page' },
  ];
  const items = faqs.length ? faqs : defaultFaqs.map((f, i) => ({
    id: 9000 + i, section: 'faq' as const, title: f.q, title_ar: f.q, subtitle: f.a, subtitle_ar: f.a, body: f.a, body_ar: f.a,
    image_url: null, icon: null, link_url: null, link_label: null, link_label_ar: null, badge_text: null, badge_text_ar: null, bg_color: null, text_color: null, sort_order: i,
  }));
  return (
    <section id="faq" className="py-24 bg-slate-900 relative overflow-hidden">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 text-purple-400 text-sm font-bold uppercase tracking-widest mb-4">
            <QuestionMarkCircleIcon className="w-5 h-5" />{isRTL ? 'المساعدة والأسئلة الشائعة' : 'Help & FAQ'}
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">{isRTL ? 'كيف يمكننا مساعدتك؟' : 'How Can We Help?'}</h2>
        </div>
        <div className="space-y-3">
          {items.map((f, i) => (
            <div key={f.id} className="rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden hover:border-white/10 transition-all">
              <button onClick={() => setOpen(open === i ? null : i)} className="w-full flex items-center justify-between p-5 text-start">
                <span className="text-white font-semibold text-sm pe-4">{isRTL ? f.title_ar || f.title : f.title || f.title_ar}</span>
                <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center transition-transform ${open === i ? 'rotate-180' : ''}`}>
                  <ChevronDownIcon className="w-4 h-4 text-white/40" />
                </div>
              </button>
              {open === i && (
                <div className="px-5 pb-5 text-sm text-white/50 leading-relaxed animate-[slmsFadeUp_0.2s_ease-out]">
                  {isRTL ? f.body_ar || f.body || f.subtitle_ar || f.subtitle : f.body || f.body_ar || f.subtitle || f.subtitle_ar}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ━━━ TERMS BANNER ━━━ */
function TermsBanner({ isRTL }: { isRTL: boolean }) {
  return (
    <section className="py-16 bg-gradient-to-r from-blue-950 via-slate-950 to-indigo-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.05),transparent_60%)]" />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <ScaleIcon className="w-10 h-10 text-blue-400/60 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-3">{isRTL ? 'الشروط والأحكام' : 'Terms & Conditions'}</h2>
        <p className="text-blue-200/50 text-sm max-w-2xl mx-auto mb-6 leading-relaxed">
          {isRTL
            ? 'باستخدامك لنظام SLMS فإنك توافق على الشروط والأحكام وسياسة الخصوصية الخاصة بنا. نلتزم بحماية بياناتك وفقًا لأعلى معايير الأمان الدولية وأنظمة حماية البيانات المعمول بها.'
            : 'By using SLMS you agree to our Terms & Conditions and Privacy Policy. We are committed to protecting your data according to the highest international security standards and applicable data protection regulations.'}
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/terms" className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/70 text-sm font-medium hover:bg-white/10 hover:text-white transition-all">{isRTL ? 'الشروط والأحكام' : 'Terms & Conditions'}</Link>
          <Link href="/privacy" className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/70 text-sm font-medium hover:bg-white/10 hover:text-white transition-all">{isRTL ? 'سياسة الخصوصية' : 'Privacy Policy'}</Link>
        </div>
      </div>
    </section>
  );
}

/* ━━━ FOOTER ━━━ */
function Footer({ settings, isRTL }: { settings: LoginPageSettings | null; isRTL: boolean }) {
  const email = settings?.contact_email || 'ali@alhajco.com';
  const phone = settings?.contact_phone || '+966 533845104';
  const whatsapp = settings?.contact_whatsapp || '+966533845104';
  return (
    <footer className="bg-slate-950 border-t border-white/5 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <div>
                <span className="text-white font-bold text-lg">SLMS</span>
                <p className="text-blue-400/50 text-xs">Smart Logistics Management System</p>
              </div>
            </div>
            <p className="text-white/40 text-sm leading-relaxed max-w-md mb-6">
              {isRTL ? 'منصة متكاملة لإدارة اللوجستيات وسلسلة التوريد، مصممة لتمكين الشركات من تحقيق أقصى كفاءة تشغيلية.' : 'An integrated logistics and supply chain management platform, designed to empower businesses to achieve maximum operational efficiency.'}
            </p>
          </div>
          <div>
            <h4 className="text-white font-bold text-sm mb-4">{isRTL ? 'روابط سريعة' : 'Quick Links'}</h4>
            <div className="space-y-2">
              {[
                { id: 'about', l: isRTL ? 'من نحن' : 'About Us' },
                { id: 'services', l: isRTL ? 'خدماتنا' : 'Services' },
                { id: 'products', l: isRTL ? 'منتجاتنا' : 'Products' },
                { id: 'faq', l: isRTL ? 'المساعدة' : 'Help' },
              ].map(lk => (
                <button key={lk.id} onClick={() => document.getElementById(lk.id)?.scrollIntoView({ behavior: 'smooth' })}
                  className="block text-white/40 hover:text-white/70 text-sm transition-colors">{lk.l}</button>
              ))}
              <Link href="/terms" className="block text-white/40 hover:text-white/70 text-sm transition-colors">{isRTL ? 'الشروط والأحكام' : 'Terms'}</Link>
              <Link href="/privacy" className="block text-white/40 hover:text-white/70 text-sm transition-colors">{isRTL ? 'سياسة الخصوصية' : 'Privacy'}</Link>
            </div>
          </div>
          <div>
            <h4 className="text-white font-bold text-sm mb-4">{isRTL ? 'تواصل معنا' : 'Contact Us'}</h4>
            <div className="space-y-3">
              <a href={`mailto:${email}`} className="flex items-center gap-3 text-white/40 hover:text-white/70 text-sm transition-colors">
                <EnvelopeIcon className="w-4 h-4 flex-shrink-0" /> {email}
              </a>
              <a href={`tel:${phone.replace(/\s/g, '')}`} className="flex items-center gap-3 text-white/40 hover:text-white/70 text-sm transition-colors">
                <PhoneIcon className="w-4 h-4 flex-shrink-0" /> <span dir="ltr">{phone}</span>
              </a>
              <a href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-emerald-400/60 hover:text-emerald-400 text-sm transition-colors">
                <ChatBubbleLeftRightIcon className="w-4 h-4 flex-shrink-0" /> WhatsApp
              </a>
            </div>
          </div>
        </div>
        <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-white/25 text-xs">
            &copy; {new Date().getFullYear()} {isRTL ? settings?.footer_text_ar || 'نظام إدارة اللوجستيات الذكي' : settings?.footer_text || 'SLMS'} — {isRTL ? 'جميع الحقوق محفوظة' : 'All rights reserved'}
          </p>
          <div className="flex items-center gap-4 text-xs text-white/25">
            <Link href="/terms" className="hover:text-white/50 transition-colors">{isRTL ? 'الشروط' : 'Terms'}</Link>
            <Link href="/privacy" className="hover:text-white/50 transition-colors">{isRTL ? 'الخصوصية' : 'Privacy'}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ━━━ LOGIN MODAL ━━━ */
function LoginModal({ isOpen, loginType, onClose, onSwitchType, isRTL }: {
  isOpen: boolean; loginType: 'tenant' | 'admin'; onClose: () => void; onSwitchType: (t: 'tenant' | 'admin') => void; isRTL: boolean;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
      <div className="relative w-full max-w-md animate-[slmsFadeUp_0.3s_ease-out]" onClick={e => e.stopPropagation()}>
        {/* Type switcher */}
        <div className="flex mb-3 bg-slate-800/80 backdrop-blur-xl rounded-2xl p-1 border border-white/5">
          <button onClick={() => onSwitchType('tenant')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${loginType === 'tenant' ? 'bg-blue-600 text-white shadow-lg' : 'text-white/50 hover:text-white/80'}`}>
            <UsersIcon className="w-4 h-4" />{isRTL ? 'عملاء المنصة' : 'Platform Clients'}
          </button>
          <button onClick={() => onSwitchType('admin')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${loginType === 'admin' ? 'bg-purple-600 text-white shadow-lg' : 'text-white/50 hover:text-white/80'}`}>
            <ShieldCheckIcon className="w-4 h-4" />{isRTL ? 'إدارة المنصة' : 'Platform Admin'}
          </button>
        </div>
        {/* Login card */}
        <div className="bg-slate-900/95 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${loginType === 'admin' ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-blue-500/10 border border-blue-500/20'}`}>
                {loginType === 'admin' ? <ShieldCheckIcon className="w-6 h-6 text-purple-400" /> : <UsersIcon className="w-6 h-6 text-blue-400" />}
              </div>
              <div>
                <h2 className="text-white font-bold text-lg">{loginType === 'admin' ? (isRTL ? 'إدارة المنصة' : 'Platform Admin') : (isRTL ? 'دخول الشركات' : 'Company Login')}</h2>
                <p className="text-white/40 text-xs">{loginType === 'admin' ? (isRTL ? 'لوحة تحكم المنصة' : 'Platform management panel') : (isRTL ? 'أدخل بياناتك للوصول إلى النظام' : 'Enter your credentials to access the system')}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-all"><XMarkIcon className="w-5 h-5" /></button>
          </div>
          {/* Helper Tips */}
          <div className={`mb-5 p-3 rounded-xl text-xs leading-relaxed ${loginType === 'admin' ? 'bg-purple-500/5 border border-purple-500/10 text-purple-300/60' : 'bg-blue-500/5 border border-blue-500/10 text-blue-300/60'}`}>
            <div className="flex items-start gap-2">
              <LightBulbIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                {loginType === 'admin'
                  ? <p>{isRTL ? 'أدخل بيانات مدير المنصة للوصول إلى لوحة التحكم. مثال: admin@example.com' : 'Enter platform admin credentials. Example: admin@example.com'}</p>
                  : <p>{isRTL ? 'الخطوة 1: أدخل رمز الشركة (مثال: ACME-001). الخطوة 2: أدخل بريدك الإلكتروني وكلمة المرور' : 'Step 1: Enter company code (e.g., ACME-001). Step 2: Enter your email and password'}</p>
                }
              </div>
            </div>
          </div>
          <MultiStageLoginForm mode={loginType === 'admin' ? 'admin' : 'tenant'} />
          {loginType === 'tenant' && (
            <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-center gap-4 text-xs">
              <button onClick={() => { onClose(); document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' }); }}
                className="text-white/40 hover:text-white/70 transition-colors flex items-center gap-1">
                <QuestionMarkCircleIcon className="w-3.5 h-3.5" />{isRTL ? 'مساعدة' : 'Help'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ━━━ ACCOUNT REQUEST MODAL ━━━ */
function AccountRequestModal({ isOpen, onClose, isRTL }: { isOpen: boolean; onClose: () => void; isRTL: boolean }) {
  const [form, setForm] = useState({ company_name: '', company_name_ar: '', company_code: '', admin_name: '', admin_email: '', phone: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const handleSubmit = async () => {
    if (!form.company_name || !form.admin_name || !form.admin_email) return;
    setSubmitting(true);
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
      await fetch(`${API}/tenant-requests`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      setSubmitted(true);
    } catch { /* silent */ }
    setSubmitting(false);
  };
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
      <div className="relative w-full max-w-lg bg-slate-900/95 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto animate-[slmsFadeUp_0.3s_ease-out]"
        dir={isRTL ? 'rtl' : 'ltr'} onClick={e => e.stopPropagation()}>
        {submitted ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckBadgeIcon className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{isRTL ? 'تم إرسال طلبك بنجاح!' : 'Request Submitted!'}</h3>
            <p className="text-white/40 text-sm mb-6">{isRTL ? 'سيتم مراجعة طلبك والتواصل معك قريبًا.' : 'We will review your request and contact you soon.'}</p>
            <button onClick={onClose} className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors">{isRTL ? 'حسنًا' : 'OK'}</button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <UserPlusIcon className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{isRTL ? 'طلب فتح حساب جديد' : 'New Account Request'}</h3>
                <p className="text-white/40 text-xs">{isRTL ? 'أملأ النموذج وسنتواصل معك' : 'Fill the form and we will contact you'}</p>
              </div>
              <button onClick={onClose} className="ms-auto p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-all"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              {[
                { key: 'company_name', label: isRTL ? 'اسم الشركة (English)' : 'Company Name', req: true },
                { key: 'company_name_ar', label: isRTL ? 'اسم الشركة (عربي)' : 'Company Name (Arabic)' },
                { key: 'company_code', label: isRTL ? 'رمز الشركة المقترح' : 'Suggested Code' },
                { key: 'admin_name', label: isRTL ? 'اسم المسؤول' : 'Admin Name', req: true },
                { key: 'admin_email', label: isRTL ? 'البريد الإلكتروني' : 'Email', type: 'email', req: true },
                { key: 'phone', label: isRTL ? 'رقم الهاتف' : 'Phone' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-sm font-medium text-white/60 mb-1">{f.label} {f.req && <span className="text-red-400">*</span>}</label>
                  <input type={f.type || 'text'} value={(form as any)[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    dir={f.key.includes('_ar') ? 'rtl' : 'ltr'}
                    className="w-full px-4 py-2.5 border border-white/10 rounded-xl bg-white/5 text-white text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40 transition-all placeholder:text-white/20"
                    placeholder={f.key === 'company_code' ? (isRTL ? 'مثال: ACME-001' : 'e.g., ACME-001') : ''} />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-white/60 mb-1">{isRTL ? 'ملاحظات' : 'Notes'}</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
                  className="w-full px-4 py-2.5 border border-white/10 rounded-xl bg-white/5 text-white text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40 transition-all resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-white/50 font-medium hover:bg-white/5 transition-colors text-sm">{isRTL ? 'إلغاء' : 'Cancel'}</button>
              <button onClick={handleSubmit} disabled={submitting || !form.company_name || !form.admin_name || !form.admin_email}
                className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm">
                {submitting ? (isRTL ? 'جاري الإرسال...' : 'Submitting...') : (isRTL ? 'إرسال الطلب' : 'Submit')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ━━━ CTA SECTION ━━━ */
function CTASection({ isRTL, onLogin, onAccountRequest }: { isRTL: boolean; onLogin: () => void; onAccountRequest: () => void }) {
  return (
    <section className="py-24 bg-gradient-to-br from-blue-950 via-slate-950 to-indigo-950 relative overflow-hidden">
      <Particles />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">{isRTL ? 'جاهز للبدء؟' : 'Ready to Get Started?'}</h2>
        <p className="text-blue-200/50 max-w-xl mx-auto mb-8">
          {isRTL ? 'انضم إلى مئات الشركات التي تثق بنظام SLMS لإدارة عملياتها اللوجستية بكفاءة واحترافية' : 'Join hundreds of companies that trust SLMS to manage their logistics operations efficiently and professionally'}
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <button onClick={onLogin}
            className="group flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold rounded-2xl shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105 transition-all">
            {isRTL ? 'تسجيل الدخول' : 'Sign In Now'}<UserCircleIcon className="w-5 h-5" />
          </button>
          <button onClick={onAccountRequest}
            className="group flex items-center gap-2 px-8 py-4 bg-white/5 border border-white/10 text-white font-semibold rounded-2xl hover:bg-white/10 transition-all">
            <UserPlusIcon className="w-5 h-5" />{isRTL ? 'طلب فتح حساب' : 'Request Account'}
          </button>
        </div>
      </div>
    </section>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * MAIN PAGE COMPONENT
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export default function TenantLoginPage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { locale, setLocale } = useLocale();
  const { theme, toggleTheme } = useTheme();
  const isRTL = locale === 'ar';

  const [content, setContent] = useState<LoginPageContent>({});
  const [settings, setSettings] = useState<LoginPageSettings | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginType, setLoginType] = useState<'tenant' | 'admin'>('tenant');
  const [accountRequestOpen, setAccountRequestOpen] = useState(false);

  useEffect(() => {
    Promise.allSettled([loginPageService.getContent(), loginPageService.getSettings()])
      .then(([c, s]) => {
        if (c.status === 'fulfilled') setContent(c.value);
        if (s.status === 'fulfilled') setSettings(s.value);
      });
  }, []);

  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      const redirectUrl = typeof router.query.redirect_url === 'string' ? router.query.redirect_url : null;
      if (user.must_change_password) { router.replace('/auth/change-password'); return; }
      const isPlatformUser = !user.tenant_id && (user.roles?.includes('super_admin') || user.roles?.includes('platform_admin') || (user as any).is_platform_admin);
      if (isPlatformUser) { router.replace(redirectUrl || '/admin/platform'); return; }
      if (user.tenant_id) { router.replace(redirectUrl || '/dashboard'); return; }
    }
  }, [isAuthenticated, user, authLoading, router]);

  const openLogin = (type: 'tenant' | 'admin') => { setLoginType(type); setLoginOpen(true); };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="inline-block w-14 h-14 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4" />
          <p className="text-white/60 font-medium text-sm">{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{isRTL ? 'SLMS - نظام إدارة اللوجستيات الذكي' : 'SLMS - Smart Logistics Management System'}</title>
        <meta name="description" content={isRTL ? 'منصة متكاملة لإدارة اللوجستيات وسلسلة التوريد' : 'Integrated logistics and supply chain management platform'} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <style>{`
          @keyframes slmsFloat { 0% { transform: translateY(0) translateX(0); opacity: 0.3; } 50% { opacity: 0.7; } 100% { transform: translateY(-30px) translateX(15px); opacity: 0.15; } }
          @keyframes slmsFadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes slmsScrollDot { 0%,100% { transform: translateY(0); opacity: 0.4; } 50% { transform: translateY(6px); opacity: 1; } }
          html { scroll-behavior: smooth; }
        `}</style>
      </Head>

      <div dir={isRTL ? 'rtl' : 'ltr'} className="bg-slate-950 text-white">
        <Navbar isRTL={isRTL} locale={locale} setLocale={setLocale} theme={theme} toggleTheme={toggleTheme} onLogin={openLogin} />
        <HeroSection slides={content.hero_slide || []} isRTL={isRTL} interval={settings?.auto_slide_interval || 5000} onLogin={() => openLogin('tenant')} />

        {settings?.show_announcements !== false && (content.announcement || []).length > 0 && (
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-amber-500/10 border-y border-amber-500/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
              <MegaphoneIcon className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <p className="text-amber-200/80 text-sm font-medium truncate">
                {isRTL ? content.announcement![0].title_ar || content.announcement![0].title : content.announcement![0].title || content.announcement![0].title_ar}
                {' — '}
                <span className="text-amber-300/50">{isRTL ? content.announcement![0].subtitle_ar || content.announcement![0].subtitle : content.announcement![0].subtitle || content.announcement![0].subtitle_ar}</span>
              </p>
            </div>
          </div>
        )}

        <AboutSection isRTL={isRTL} />
        <ServicesSection isRTL={isRTL} />
        <ProductsSection isRTL={isRTL} />
        {settings?.show_features !== false && <FeaturesSection features={content.feature || []} isRTL={isRTL} />}
        {(settings?.show_news !== false || settings?.show_announcements !== false) && <NewsSection news={content.news || []} announcements={content.announcement || []} isRTL={isRTL} />}
        <FAQSection faqs={content.faq || []} isRTL={isRTL} />
        <TermsBanner isRTL={isRTL} />
        <CTASection isRTL={isRTL} onLogin={() => openLogin('tenant')} onAccountRequest={() => setAccountRequestOpen(true)} />
        <Footer settings={settings} isRTL={isRTL} />

        <ScrollTop />
        <LoginModal isOpen={loginOpen} loginType={loginType} onClose={() => setLoginOpen(false)} onSwitchType={setLoginType} isRTL={isRTL} />
        <AccountRequestModal isOpen={accountRequestOpen} onClose={() => setAccountRequestOpen(false)} isRTL={isRTL} />
      </div>
    </>
  );
}
