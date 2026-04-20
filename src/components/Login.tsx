import { useState } from 'react';
import { getAuth, setAuth, checkLogin, setGhToken, getGhToken } from '../lib/auth';

interface Props {
  onLogin: () => void;
}

export default function Login({ onLogin }: Props) {
  const hasAcc = !!getAuth();
  const [mode, setMode] = useState<'login' | 'setup'>(hasAcc ? 'login' : 'setup');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [token, setToken] = useState(hasAcc ? (getGhToken() || '') : '');
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleSetup() {
    if (!username.trim()) { setError('Username tidak boleh kosong'); return; }
    if (password.length < 4) { setError('Password minimal 4 karakter'); return; }
    if (password !== password2) { setError('Konfirmasi password tidak cocok'); return; }
    setAuth({ username: username.trim(), password });
    if (token.trim()) setGhToken(token.trim());
    onLogin();
  }

  async function handleLogin() {
    if (!username.trim() || !password) { setError('Isi username dan password'); return; }
    setLoading(true);
    setError('');
    await new Promise(r => setTimeout(r, 300));
    if (checkLogin(username.trim(), password)) {
      onLogin();
    } else {
      setError('Username atau password salah');
    }
    setLoading(false);
  }

  return (
    <div className="login-screen">
      <div className="login-box">
        <div className="login-brand">Ad<span>Journal</span></div>
        <div className="login-subtitle">Paid Traffic &amp; Adsense Tracker</div>

        <div className="login-tabs">
          {hasAcc && (
            <>
              <button className={`login-tab${mode === 'login' ? ' active' : ''}`} onClick={() => { setMode('login'); setError(''); }}>Masuk</button>
              <button className={`login-tab${mode === 'setup' ? ' active' : ''}`} onClick={() => { setMode('setup'); setError(''); }}>Ganti Akun</button>
            </>
          )}
        </div>

        <div className="login-form">
          {mode === 'setup' && !hasAcc && (
            <div className="login-welcome">
              <div className="login-welcome-title">Selamat Datang!</div>
              <div className="login-welcome-sub">Buat akun pertama kamu untuk memulai</div>
            </div>
          )}

          <div className="fg">
            <label>Username</label>
            <input
              type="text"
              placeholder="Masukkan username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (mode === 'login' ? handleLogin() : null)}
              autoComplete="username"
            />
          </div>

          <div className="fg" style={{ position: 'relative' }}>
            <label>Password</label>
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="Masukkan password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (mode === 'login' ? handleLogin() : null)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              style={{ paddingRight: 44 }}
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              style={{ position: 'absolute', right: 10, top: 28, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', padding: 4 }}
            >
              {showPw ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
              )}
            </button>
          </div>

          {mode === 'setup' && (
            <div className="fg">
              <label>Konfirmasi Password</label>
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="Ulangi password"
                value={password2}
                onChange={e => setPassword2(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          )}

          <div className="fg">
            <label>GitHub Token <span style={{ color: 'var(--t3)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(untuk sync database - opsional)</span></label>
            <input
              type="password"
              placeholder="ghp_xxxxx"
              value={token}
              onChange={e => setToken(e.target.value)}
            />
            <span style={{ fontSize: 10, color: 'var(--t3)', marginTop: 2 }}>Data akan disimpan di GitHub Gist pribadi kamu (terenkripsi, private)</span>
          </div>

          {error && <div className="login-error">{error}</div>}

          <button
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', height: 44, fontSize: 14, marginTop: 4 }}
            onClick={mode === 'login' ? handleLogin : handleSetup}
            disabled={loading}
          >
            {loading ? 'Memverifikasi...' : mode === 'login' ? 'Masuk' : 'Buat Akun & Mulai'}
          </button>
        </div>

        <div className="login-footer">Data tersimpan aman di browser &amp; GitHub Gist kamu</div>
      </div>
    </div>
  );
}
