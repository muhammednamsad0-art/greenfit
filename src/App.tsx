import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  clearActiveLocalProfile, createLocalProfile, getActiveLocalProfile, getLocalProfiles,
  setActiveLocalProfile, type LocalProfile,
} from '@/lib/local-store';
import type { AppState } from '@/lib/types';
import { DateHeader } from '@/components/DateHeader';
import { StatsBar } from '@/components/StatsBar';
import { ChallengesView } from '@/views/ChallengesView';
import { WaterView } from '@/views/WaterView';
import { ExerciseView } from '@/views/ExerciseView';
import { RoutineView } from '@/views/RoutineView';
import { ZyroView } from '@/views/ZyroView';
import { PostureCameraView } from '@/views/PostureCameraView';
import { MoodCheckinView } from '@/views/MoodCheckinView';
import { SchoolSetupView } from '@/views/SchoolSetupView';
import { DashboardView } from '@/views/DashboardView';
import { WatchView } from '@/views/WatchView';
import { BreathingView } from '@/views/BreathingView';
import { EcoScannerView } from '@/views/EcoScannerView';
import { EcoStepsView } from '@/views/EcoStepsView';
import { ForestFocusView } from '@/views/ForestFocusView';
import {
  Home, Droplet, Activity, Calendar, Bot, Camera, Smile, School, BarChart3,
  Leaf, Menu, X, Trophy, Watch, Wind, TreePine, Footprints, Users,
} from 'lucide-react';

type Tab = 'home' | 'challenges' | 'water' | 'exercise' | 'routine' | 'zyro' | 'camera' | 'mood' | 'school' | 'dashboard' | 'watch' | 'breathing' | 'ecoscanner' | 'ecosteps' | 'forestfocus';

interface NavItem {
  id: Tab;
  label: string;
  icon: React.ElementType;
  color: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: Home, color: 'text-green-600' },
  { id: 'challenges', label: 'Challenges', icon: Trophy, color: 'text-amber-600' },
  { id: 'water', label: 'Water', icon: Droplet, color: 'text-cyan-600' },
  { id: 'exercise', label: 'Exercise', icon: Activity, color: 'text-orange-600' },
  { id: 'routine', label: 'Routine', icon: Calendar, color: 'text-blue-600' },
  { id: 'zyro', label: 'ZYRO AI', icon: Bot, color: 'text-teal-600' },
  { id: 'camera', label: 'Posture Cam', icon: Camera, color: 'text-violet-600' },
  { id: 'mood', label: 'Mood Check', icon: Smile, color: 'text-rose-600' },
  { id: 'dashboard', label: 'Progress', icon: BarChart3, color: 'text-indigo-600' },
  { id: 'watch', label: 'Smartwatch', icon: Watch, color: 'text-blue-600' },
  { id: 'breathing', label: 'Breathing', icon: Wind, color: 'text-teal-600' },
  { id: 'ecosteps', label: 'Eco Steps', icon: Footprints, color: 'text-green-600' },
  { id: 'ecoscanner', label: 'Eco Scanner', icon: Leaf, color: 'text-emerald-600' },
  { id: 'forestfocus', label: 'Forest Focus', icon: TreePine, color: 'text-green-600' },
  { id: 'school', label: 'School', icon: School, color: 'text-slate-600' },
];

async function loadAccountData(userId: string) {
  const [stateResult, trophyResult] = await Promise.all([
    supabase.from('app_state').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('trophies').select('*', { count: 'exact', head: true }),
  ]);

  if (stateResult.error || trophyResult.error) {
    throw new Error('Personal data could not be loaded.');
  }

  return {
    state: stateResult.data as AppState | null,
    trophyCount: trophyResult.count || 0,
  };
}

function getInitialLocalProfile(): LocalProfile | null {
  const profiles = getLocalProfiles();
  if (profiles.length > 1) return null;

  const activeProfile = getActiveLocalProfile();
  if (activeProfile || profiles.length > 0) return activeProfile || profiles[0];
  try {
    return createLocalProfile('My profile');
  } catch {
    return null;
  }
}

function App() {
  const [profiles, setProfiles] = useState<LocalProfile[]>(() => getLocalProfiles());
  const [profile, setProfile] = useState<LocalProfile | null>(() => getInitialLocalProfile());
  const [profileName, setProfileName] = useState('');
  const [profileError, setProfileError] = useState('');
  const [storageReady, setStorageReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [state, setState] = useState<AppState | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [trophyCount, setTrophyCount] = useState(0);

  useEffect(() => {
    const syncProfiles = () => {
      setProfiles(getLocalProfiles());
      setProfile(getActiveLocalProfile());
    };
    window.addEventListener('storage', syncProfiles);
    return () => {
      window.removeEventListener('storage', syncProfiles);
    };
  }, []);

  const userId = profile?.id;

  useEffect(() => {
    if (!userId) {
      setState(null);
      setTrophyCount(0);
      setStorageReady(false);
      setStorageError(false);
      return;
    }

    const accountUserId = userId;
    let active = true;
    setState(null);
    setTrophyCount(0);
    setStorageReady(false);
    setStorageError(false);

    async function initializeAccount() {
      const accountData = await loadAccountData(accountUserId);
      if (!active) return;
      setState(accountData.state);
      setTrophyCount(accountData.trophyCount);
      setStorageReady(true);
    }

    initializeAccount().catch(() => {
      if (active) setStorageError(true);
    });

    return () => {
      active = false;
    };
  }, [userId]);

  const handleStateChange = () => {
    if (!userId) return;
    loadAccountData(userId).then((accountData) => {
      if (profile?.id !== userId) return;
      setState(accountData.state);
      setTrophyCount(accountData.trophyCount);
    }).catch(() => setStorageError(true));
  };

  function selectProfile(profileId: string) {
    try {
      setActiveLocalProfile(profileId);
      setProfile(getLocalProfiles().find((item) => item.id === profileId) || null);
      setProfileError('');
      setActiveTab('home');
      setMenuOpen(false);
    } catch {
      setProfileError('Could not switch local profile. Browser storage may be unavailable.');
    }
  }

  function addProfile() {
    try {
      const nextProfile = createLocalProfile(profileName);
      setProfiles(getLocalProfiles());
      setProfile(nextProfile);
      setProfileName('');
      setProfileError('');
      setActiveTab('home');
      setMenuOpen(false);
    } catch {
      setProfileError('Enter a profile name and make sure browser storage is available.');
    }
  }

  function changeProfile() {
    clearActiveLocalProfile();
    setProfiles(getLocalProfiles());
    setProfile(null);
    setState(null);
    setTrophyCount(0);
    setStorageReady(false);
    setMenuOpen(false);
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <HomeView state={state} onNavigate={setActiveTab} />;
      case 'challenges':
        return <ChallengesView state={state} onStateChange={handleStateChange} />;
      case 'water':
        return <WaterView />;
      case 'exercise':
        return <ExerciseView />;
      case 'routine':
        return <RoutineView />;
      case 'zyro':
        return <ZyroView />;
      case 'camera':
        return <PostureCameraView />;
      case 'mood':
        return <MoodCheckinView />;
      case 'school':
        return <SchoolSetupView state={state} onStateChange={handleStateChange} />;
      case 'dashboard':
        return <DashboardView />;
      case 'watch':
        return <WatchView />;
      case 'breathing':
        return <BreathingView />;
      case 'ecoscanner':
        return <EcoScannerView />;
      case 'ecosteps':
        return <EcoStepsView />;
      case 'forestfocus':
        return <ForestFocusView />;
    }
  };

  const activeNav = NAV_ITEMS.find((n) => n.id === activeTab);

  if (!profile) {
    return (
      <main className="min-h-[100dvh] flex items-center justify-center p-4">
        <section className="glass w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-green-400 via-teal-400 to-cyan-400 shadow-lg">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold gradient-text">GREENFIT</h1>
              <p className="text-sm text-slate-500">Choose a local profile</p>
            </div>
          </div>
          <p className="text-sm text-slate-500 mb-5">
            Activity is saved in this browser only. Choose your profile on shared devices. Local profiles do not sync to other devices.
          </p>
          {profiles.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
              {profiles.map((item) => (
                <button
                  key={item.id}
                  onClick={() => selectProfile(item.id)}
                  className="min-h-12 rounded-xl bg-white/70 px-4 text-left font-bold text-slate-700 hover:bg-white"
                >
                  {item.name}
                </button>
              ))}
            </div>
          )}
          <form onSubmit={(event) => { event.preventDefault(); addProfile(); }} className="flex flex-wrap gap-2">
            <input
              value={profileName}
              onChange={(event) => setProfileName(event.target.value)}
              maxLength={40}
              placeholder="New profile name"
              aria-label="New profile name"
              className="min-w-0 flex-1 px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-green-400 outline-none text-slate-700 bg-white/70"
            />
            <button type="submit" className="min-h-12 px-5 rounded-xl bg-gradient-to-r from-green-500 to-teal-500 text-white font-bold">
              Create profile
            </button>
          </form>
          {profileError && <p className="mt-3 text-sm text-red-600" role="alert">{profileError}</p>}
        </section>
      </main>
    );
  }

  if (!storageReady) {
    return (
      <main className="min-h-[100dvh] flex items-center justify-center p-4">
        <section className="glass w-full max-w-lg rounded-3xl p-6 text-center">
          <h1 className="font-display text-xl font-bold text-slate-800 mb-2">
            {storageError ? 'Local storage unavailable' : 'Loading your profile...'}
          </h1>
          {storageError && (
            <>
              <p className="text-sm text-slate-500 mb-4">
                GreenFit could not load this browser profile. Check that browser storage is enabled, then reload the page.
              </p>
              <button onClick={changeProfile} className="px-4 py-2.5 rounded-xl bg-slate-200 text-slate-700 font-bold">Choose another profile</button>
            </>
          )}
        </section>
      </main>
    );
  }

  return (
    <div className="min-h-screen pb-24 md:pb-4">
      {/* Top bar */}
      <header className="sticky top-0 z-40 glass border-b border-white/40">
        <div className="max-w-[1920px] mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => { setActiveTab('home'); setMenuOpen(false); }}
            className="flex items-center gap-2"
          >
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-green-400 via-teal-400 to-cyan-400 shadow-lg">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <div className="font-display font-bold text-lg gradient-text leading-none">GREENFIT</div>
              <div className="text-[10px] text-slate-500 font-semibold">Health · Eco · Wellbeing</div>
            </div>
          </button>

          {/* Desktop nav */}
          <nav className="hidden min-[1920px]:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5 ${
                    active
                      ? 'bg-gradient-to-r from-green-500 to-teal-500 text-white shadow-md'
                      : 'text-slate-500 hover:bg-white/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <button
            onClick={changeProfile}
            className="hidden min-[1920px]:inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold text-slate-500 hover:bg-white/60"
          >
            <Users className="w-4 h-4" />
            <span className="max-w-24 truncate">{profile.name}</span>
          </button>

          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="min-[1920px]:hidden w-10 h-10 rounded-xl bg-white/60 flex items-center justify-center text-slate-600"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="min-[1920px]:hidden max-h-[calc(100dvh-8rem)] overflow-y-auto overscroll-contain border-t border-white/40 bg-white/80 backdrop-blur-lg">
            <div className="max-w-5xl mx-auto px-4 py-3 grid grid-cols-3 gap-2">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id); setMenuOpen(false); }}
                    className={`flex flex-col items-center gap-1 py-3 rounded-xl text-xs font-bold transition-all ${
                      active
                        ? 'bg-gradient-to-br from-green-500 to-teal-500 text-white'
                        : 'text-slate-500 hover:bg-white/60'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </button>
                );
              })}
            </div>
            <div className="max-w-5xl mx-auto px-4 pb-3">
              <button
                onClick={changeProfile}
                className="w-full min-h-11 rounded-xl bg-white/70 text-slate-600 font-bold text-sm flex items-center justify-center gap-2"
              >
                <Users className="w-4 h-4" />
                Switch / add profile
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Content */}
      <main key={profile.id} className="max-w-5xl mx-auto px-4 py-6">
        {activeTab === 'home' && (
          <>
            <DateHeader />
            <StatsBar state={state} trophyCount={trophyCount} />
          </>
        )}
        {activeTab !== 'home' && activeTab !== 'zyro' && (
          <div className="mb-4">
            <div className="flex items-center gap-2">
              {activeNav && (
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-white/60`}>
                  <activeNav.icon className={`w-5 h-5 ${activeNav.color}`} />
                </div>
              )}
              <h1 className="font-display text-2xl font-bold text-slate-800">
                {activeNav?.label}
              </h1>
            </div>
          </div>
        )}
        {renderContent()}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass border-t border-white/40">
        <div className="flex justify-around items-center px-2 py-1.5">
          {NAV_ITEMS.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all ${
                  active ? 'text-green-600' : 'text-slate-400'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'scale-110' : ''} transition-transform`} />
                <span className="text-[9px] font-bold">{item.label}</span>
              </button>
            );
          })}
          <button
            onClick={() => setMenuOpen(true)}
            className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl text-slate-400"
          >
            <Menu className="w-5 h-5" />
            <span className="text-[9px] font-bold">More</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

// Home view with quick access cards
function HomeView({ state, onNavigate }: { state: AppState | null; onNavigate: (t: Tab) => void }) {
  const quickCards = [
    { tab: 'challenges' as Tab, label: 'Challenges', desc: 'Earn points & trophies', icon: Trophy, color: 'from-amber-400 to-orange-500', bg: 'bg-amber-50' },
    { tab: 'water' as Tab, label: 'Water Tracker', desc: 'Stay hydrated', icon: Droplet, color: 'from-cyan-400 to-blue-500', bg: 'bg-cyan-50' },
    { tab: 'exercise' as Tab, label: 'Exercise', desc: 'Move & burn calories', icon: Activity, color: 'from-orange-400 to-red-500', bg: 'bg-orange-50' },
    { tab: 'routine' as Tab, label: 'Daily Routine', desc: 'Build healthy habits', icon: Calendar, color: 'from-blue-400 to-indigo-500', bg: 'bg-blue-50' },
    { tab: 'zyro' as Tab, label: 'ZYRO AI', desc: 'Ask health questions', icon: Bot, color: 'from-teal-400 to-cyan-500', bg: 'bg-teal-50' },
    { tab: 'camera' as Tab, label: 'Posture Camera', desc: 'Auto mood & posture', icon: Camera, color: 'from-violet-400 to-purple-500', bg: 'bg-violet-50' },
    { tab: 'mood' as Tab, label: 'Mood Check-in', desc: 'How are you feeling?', icon: Smile, color: 'from-rose-400 to-pink-500', bg: 'bg-rose-50' },
    { tab: 'dashboard' as Tab, label: 'Progress', desc: 'Track your stats', icon: BarChart3, color: 'from-indigo-400 to-blue-500', bg: 'bg-indigo-50' },
    { tab: 'watch' as Tab, label: 'Smartwatch', desc: 'Connect BLE watch', icon: Watch, color: 'from-blue-400 to-cyan-500', bg: 'bg-blue-50' },
    { tab: 'breathing' as Tab, label: 'Breathing', desc: 'Guided calm breathing', icon: Wind, color: 'from-teal-400 to-cyan-500', bg: 'bg-teal-50' },
    { tab: 'ecosteps' as Tab, label: 'Eco Steps', desc: 'Walk to save CO2', icon: Footprints, color: 'from-green-400 to-emerald-500', bg: 'bg-green-50' },
    { tab: 'ecoscanner' as Tab, label: 'Eco Scanner', desc: 'Track eco actions', icon: Leaf, color: 'from-emerald-400 to-green-500', bg: 'bg-emerald-50' },
    { tab: 'forestfocus' as Tab, label: 'Forest Focus', desc: 'Nature focus timer', icon: TreePine, color: 'from-green-500 to-teal-600', bg: 'bg-green-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="rounded-3xl p-6 bg-gradient-to-br from-green-400 via-teal-400 to-cyan-400 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-12 -translate-x-12" />
        <div className="relative">
          <h1 className="font-display text-2xl font-bold mb-1">
            {state?.school_name ? `Hi there!` : 'Welcome to GREENFIT!'}
          </h1>
          <p className="text-white/90 text-sm">
            {state?.school_name
              ? `Ready for another healthy, eco-friendly day at ${state.school_name}?`
              : 'Connect your health, wellbeing, and care for the planet — one challenge at a time!'}
          </p>
          {!state?.school_name && (
            <button
              onClick={() => onNavigate('school')}
              className="mt-3 px-4 py-2 rounded-xl bg-white text-green-600 font-bold text-sm shadow-lg active:scale-95 transition-all"
            >
              Set up your school
            </button>
          )}
        </div>
      </div>

      {/* Quick access grid */}
      <div>
        <h2 className="font-display text-lg font-bold text-slate-800 mb-3">Quick Access</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickCards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.tab}
                onClick={() => onNavigate(card.tab)}
                className={`rounded-2xl p-4 text-left card-hover ${card.bg} border border-white/60`}
              >
                <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br ${card.color} shadow-md mb-2`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="font-bold text-sm text-slate-800">{card.label}</div>
                <div className="text-xs text-slate-500">{card.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* School info */}
      {state?.school_name && (
        <div className="glass rounded-2xl p-4 flex items-center gap-3">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-100">
            <School className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-slate-800">{state.school_name}</div>
            <div className="text-sm text-slate-500">
              {state.grade || 'No grade set'}{state.division ? ` · ${state.division}` : ''} · {state.student_count} students
            </div>
          </div>
          <button
            onClick={() => onNavigate('school')}
            className="text-xs font-bold text-indigo-500 hover:text-indigo-600"
          >
            Edit
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
