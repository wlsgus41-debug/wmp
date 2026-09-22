import React, { useState } from 'react';
import {
  X,
  LogIn,
  UserPlus,
  Mail,
  Lock,
  User,
  Sparkles,
  ShieldCheck,
  Globe,
  ExternalLink,
  Check,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import type { UserProfile, PlatformPasses } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup' | 'passes';
  currentUser?: UserProfile | null;
  onLoginSuccess: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  currentUser,
  onLoginSuccess,
}) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'channeling_verify' | 'passes'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Active Channeling Provider during SSO flow
  const [activeChannelingProvider, setActiveChannelingProvider] = useState<any | null>(null);

  // Passes edit state
  const [editPasses, setEditPasses] = useState<PlatformPasses>(
    currentUser?.passes || { melon: true, bugs: false, spotify: false, flo: false, genie: false }
  );

  if (!isOpen) return null;

  // Channeling Providers Configuration
  const channelingProviders = [
    {
      id: 'melon',
      name: '멜론으로 로그인',
      domain: 'melon.com',
      badge: 'Melon',
      loginUrl: 'https://member.melon.com/muid/web/login/login_inform.htm',
      btnClass: 'bg-[#00cd3c]/15 hover:bg-[#00cd3c]/25 text-[#00cd3c] border-[#00cd3c]/40',
      dotClass: 'bg-[#00cd3c]',
    },
    {
      id: 'bugs',
      name: '벅스로 로그인',
      domain: 'music.bugs.co.kr',
      badge: 'Bugs',
      loginUrl: 'https://secure.bugs.co.kr/member/login',
      btnClass: 'bg-[#ff3c3c]/15 hover:bg-[#ff3c3c]/25 text-[#ff4c4c] border-[#ff3c3c]/40',
      dotClass: 'bg-[#ff3c3c]',
    },
    {
      id: 'spotify',
      name: '스포티파이로 로그인',
      domain: 'open.spotify.com',
      badge: 'Spotify',
      loginUrl: 'https://accounts.spotify.com/login',
      btnClass: 'bg-[#1ed760]/15 hover:bg-[#1ed760]/25 text-[#1ed760] border-[#1ed760]/40',
      dotClass: 'bg-[#1ed760]',
    },
    {
      id: 'flo',
      name: '플로(FLO)로 로그인',
      domain: 'music-flo.com',
      badge: 'FLO',
      loginUrl: 'https://www.music-flo.com/login',
      btnClass: 'bg-[#6236ff]/15 hover:bg-[#6236ff]/25 text-[#8b6aff] border-[#6236ff]/40',
      dotClass: 'bg-[#6236ff]',
    },
    {
      id: 'genie',
      name: '지니뮤직으로 로그인',
      domain: 'genie.co.kr',
      badge: 'Genie',
      loginUrl: 'https://www.genie.co.kr/auth/signIn',
      btnClass: 'bg-[#0096ff]/15 hover:bg-[#0096ff]/25 text-[#38b6ff] border-[#0096ff]/40',
      dotClass: 'bg-[#0096ff]',
    },
    {
      id: 'google',
      name: 'Google 계정으로 로그인',
      domain: 'google.com',
      badge: 'Google',
      loginUrl: 'https://accounts.google.com/signin',
      btnClass: 'bg-white/10 hover:bg-white/20 text-white border-white/20',
      dotClass: 'bg-amber-400',
    },
  ];

  // Open Official Site Login Window and proceed to verification
  const handleOpenChannelingWindow = (provider: typeof channelingProviders[0]) => {
    setActiveChannelingProvider(provider);
    setError(null);

    // Open official platform login window in a popup
    const width = 540;
    const height = 680;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    window.open(
      provider.loginUrl,
      `${provider.id}_login_popup`,
      `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`
    );

    // Transition to verification mode
    setMode('channeling_verify');
  };

  // Complete Channeling Login - automatically sets passes based on provider
  const handleCompleteChanneling = () => {
    if (!activeChannelingProvider) return;

    const providerId = activeChannelingProvider.id;
    // Google is not a music streaming platform → no passes
    // For other platforms: logging in = assumed to have subscription
    const passes: PlatformPasses = {
      melon: providerId === 'melon',
      bugs: providerId === 'bugs',
      spotify: providerId === 'spotify',
      flo: providerId === 'flo',
      genie: providerId === 'genie',
    };

    const user: UserProfile = {
      id: `${providerId}-${Date.now()}`,
      name: `${activeChannelingProvider.badge} 회원`,
      email: `user_${providerId}@${activeChannelingProvider.domain}`,
      provider: providerId,
      passes,
      joinedAt: new Date().toLocaleDateString('ko-KR')
    };

    localStorage.setItem('wmp_user', JSON.stringify(user));
    onLoginSuccess(user);
    onClose();
  };

  // Load Registered Users DB from localStorage
  const getRegisteredUsers = (): UserProfile[] => {
    try {
      const db = localStorage.getItem('wmp_registered_users');
      return db ? JSON.parse(db) : [];
    } catch {
      return [];
    }
  };

  const saveRegisteredUsers = (users: UserProfile[]) => {
    localStorage.setItem('wmp_registered_users', JSON.stringify(users));
  };

  // Handle Standard Email/Password Sign-Up
  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('닉네임/이름을 입력해주세요.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('올바른 이메일 주소를 입력해주세요.');
      return;
    }
    if (!password || password.length < 4) {
      setError('비밀번호를 4자 이상 입력해주세요.');
      return;
    }

    const users = getRegisteredUsers();
    if (users.some(u => u.email.toLowerCase() === email.trim().toLowerCase())) {
      setError('이미 가입된 이메일 주소입니다. 로그인해주세요.');
      return;
    }

    const newUser: UserProfile = {
      id: `user-${Date.now()}`,
      name: name.trim(),
      email: email.trim(),
      password,
      provider: 'email',
      passes: {
        melon: false,
        bugs: false,
        spotify: false,
        flo: false,
        genie: false
      },
      joinedAt: new Date().toLocaleDateString('ko-KR')
    };

    users.push(newUser);
    saveRegisteredUsers(users);

    // Automatically log in
    localStorage.setItem('wmp_user', JSON.stringify(newUser));
    setSuccessMsg('회원가입이 완료되었습니다! 로그인 상태로 전환됩니다.');
    setTimeout(() => {
      onLoginSuccess(newUser);
      onClose();
    }, 600);
  };

  // Handle Standard Email/Password Login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('이메일을 입력해주세요.');
      return;
    }
    if (!password) {
      setError('비밀번호를 입력해주세요.');
      return;
    }

    const users = getRegisteredUsers();
    const found = users.find(
      u => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password
    );

    if (found) {
      localStorage.setItem('wmp_user', JSON.stringify(found));
      onLoginSuccess(found);
      onClose();
    } else {
      setError('이메일 또는 비밀번호가 일치하지 않습니다. 다시 확인해주세요.');
    }
  };

  // Save updated passes
  const handleSavePasses = () => {
    if (!currentUser) return;
    const updatedUser: UserProfile = {
      ...currentUser,
      passes: editPasses
    };
    localStorage.setItem('wmp_user', JSON.stringify(updatedUser));
    onLoginSuccess(updatedUser);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      {/* Modal Card */}
      <div
        className="relative w-full max-w-md bg-zinc-900/95 border border-zinc-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Decorative Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-gradient-to-r from-rose-500/30 to-indigo-500/30 blur-3xl pointer-events-none -z-10" />

        {/* Header */}
        <div className="p-5 border-b border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-rose-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-rose-500/20 text-white font-bold">
              {mode === 'login' ? <LogIn className="w-4 h-4" /> :
               mode === 'signup' ? <UserPlus className="w-4 h-4" /> :
               mode === 'passes' ? <ShieldCheck className="w-4 h-4" /> :
               <Globe className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {mode === 'login' ? '온 세상의 뮤직 로그인' :
                 mode === 'signup' ? '온 세상의 뮤직 회원가입' :
                 mode === 'passes' ? '음원 사이트 이용권 관리' :
                 `${activeChannelingProvider?.badge || '채널링'} 계정 연동`}
              </h2>
              <p className="text-[11px] text-zinc-400">
                {mode === 'passes'
                  ? '보유 중인 음원 사이트 이용권을 체크해 무제한 재생을 설정하세요'
                  : '유튜브 뮤직은 기본 풀버전 / 음원 사이트는 이용권 연동 시 풀버전 지원'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
            title="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher (Only in login/signup modes) */}
        {(mode === 'login' || mode === 'signup') && (
          <div className="px-5 pt-3 flex gap-2">
            <button
              onClick={() => {
                setMode('login');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                mode === 'login'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                  : 'bg-zinc-800/60 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              로그인
            </button>
            <button
              onClick={() => {
                setMode('signup');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                mode === 'signup'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-zinc-800/60 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              회원가입
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 overflow-y-auto no-scrollbar space-y-4">
          {/* Alerts */}
          {error && (
            <div className="px-3.5 py-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {successMsg && (
            <div className="px-3.5 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ─── MODE: Channeling Verify Window ─── */}
          {mode === 'channeling_verify' && activeChannelingProvider && (
            <div className="space-y-4 text-center py-2">
              <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 flex flex-col items-center gap-2.5">
                <span className={`w-3.5 h-3.5 rounded-full ${activeChannelingProvider.dotClass} animate-ping`} />
                <h3 className="text-sm font-bold text-white">
                  {activeChannelingProvider.badge} 공식 로그인 창이 열렸습니다
                </h3>
                <p className="text-xs text-zinc-400 max-w-xs">
                  열린 팝업 창에서 <strong>{activeChannelingProvider.badge}</strong> 계정 로그인을 완료한 후 아래 버튼을 눌러 연동을 완료하세요.
                </p>

                <a
                  href={activeChannelingProvider.loginUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 text-[11px] text-rose-400 hover:text-rose-300 underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" /> 로그인 창 다시 열기
                </a>
              </div>

              {/* Auto Pass Info */}
              {activeChannelingProvider.id !== 'google' ? (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-left flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-emerald-300">
                      {activeChannelingProvider.badge} 이용권 자동 연동
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      로그인 완료 후 연동 버튼을 누르면 <strong>{activeChannelingProvider.badge}</strong> 이용권이 자동으로 설정되어 <strong>전곡 풀버전</strong>으로 재생됩니다.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-zinc-800/60 border border-zinc-700/60 text-left flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-zinc-300">Google 계정 연동</div>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Google은 음원 스트리밍 서비스가 아닙니다. 연동 후 이용권 관리에서 보유 이용권을 별도로 설정할 수 있습니다.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs transition"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleCompleteChanneling}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>로그인 연동 완료</span>
                </button>
              </div>
            </div>
          )}

          {/* ─── MODE: Passes Management ─── */}
          {mode === 'passes' && (
            <div className="space-y-4">
              <div className="p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800">
                <p className="text-xs text-zinc-300 font-medium">
                  <strong>유튜브 뮤직:</strong> 기본 풀버전 지원<br />
                  <strong>멜론/벅스/스포티파이/플로/지니:</strong> 이용권 보유 시 풀버전, 미보유 시 1분 미리듣기 적용
                </p>
              </div>

              <div className="space-y-2">
                {[
                  { id: 'melon', name: '멜론 (melon.com)', domain: 'melon.com' },
                  { id: 'bugs', name: '벅스 (music.bugs.co.kr)', domain: 'music.bugs.co.kr' },
                  { id: 'spotify', name: '스포티파이 (open.spotify.com)', domain: 'open.spotify.com' },
                  { id: 'flo', name: '플로 (music-flo.com)', domain: 'music-flo.com' },
                  { id: 'genie', name: '지니뮤직 (genie.co.kr)', domain: 'genie.co.kr' },
                ].map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-zinc-200">{p.name}</div>
                      <div className="text-[10px] text-zinc-400">
                        {editPasses[p.id as keyof PlatformPasses] ? '이용권 보유 (풀버전 재생)' : '이용권 미보유 (1분 미리듣기)'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setEditPasses(prev => ({
                          ...prev,
                          [p.id]: !prev[p.id as keyof PlatformPasses]
                        }))
                      }
                      className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                        editPasses[p.id as keyof PlatformPasses]
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                      }`}
                    >
                      {editPasses[p.id as keyof PlatformPasses] ? '보유중' : '미보유'}
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleSavePasses}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 text-white font-bold text-xs shadow-lg transition"
              >
                이용권 설정 저장하기
              </button>
            </div>
          )}

          {/* ─── MODE: Login & Sign-Up ─── */}
          {(mode === 'login' || mode === 'signup') && (
            <>
              {/* Channeling Buttons */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-zinc-400 flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-rose-400" /> 공식 음원 사이트 채널링 로그인
                  </span>
                  <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-0.5">
                    <Sparkles className="w-3 h-3" /> 외부 창 연동
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {channelingProviders.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleOpenChannelingWindow(p)}
                      className={`flex items-center justify-start gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all shadow-sm active:scale-95 ${p.btnClass}`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${p.dotClass} shrink-0`} />
                      <span className="truncate">{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="relative flex items-center justify-center my-2">
                <div className="w-full border-t border-zinc-800" />
                <span className="absolute px-3 bg-zinc-900 text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">
                  또는 본 페이지 자체 계정
                </span>
              </div>

              {/* Standard Form */}
              <form onSubmit={mode === 'login' ? handleLogin : handleSignUp} className="space-y-3">
                {mode === 'signup' && (
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                      닉네임 / 이름
                    </label>
                    <div className="relative flex items-center">
                      <User className="absolute left-3 w-4 h-4 text-zinc-500 pointer-events-none" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="이름 또는 닉네임"
                        className="w-full h-10 pl-9 pr-3 rounded-xl bg-zinc-950/80 border border-zinc-800 focus:border-indigo-500 focus:outline-none text-xs text-zinc-100 placeholder-zinc-600 transition"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                    이메일 주소 (아이디)
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3 w-4 h-4 text-zinc-500 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="wmp@worldmusic.com"
                      className="w-full h-10 pl-9 pr-3 rounded-xl bg-zinc-950/80 border border-zinc-800 focus:border-rose-500 focus:outline-none text-xs text-zinc-100 placeholder-zinc-600 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                    비밀번호
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3 w-4 h-4 text-zinc-500 pointer-events-none" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="비밀번호 입력"
                      className="w-full h-10 pl-9 pr-3 rounded-xl bg-zinc-950/80 border border-zinc-800 focus:border-rose-500 focus:outline-none text-xs text-zinc-100 placeholder-zinc-600 transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-rose-600/20 transition active:scale-95"
                >
                  {mode === 'login' ? '홈페이지 계정으로 로그인' : '홈페이지 회원가입 완료'}
                </button>
              </form>

              {/* Notice */}
              <div className="p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <p className="text-[10px] text-zinc-400 leading-tight">
                  유튜브 뮤직 검색 및 재생은 1분 제한 없이 항상 전곡 풀버전으로 감상할 수 있습니다.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
