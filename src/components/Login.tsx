import { useState } from 'react';
import { setToken } from '../lib/auth';
import { loginWithToken } from '../lib/github-db';
import type { GistData } from '../lib/github-db';

interface Props {
  onLogin: (username: string, data: GistData) => void;
}

export default function Login({ onLogin }: Props) {
  const [token, setTokenInput] = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    const t = token.trim();
    if (!t) { setError('Masukkan GitHub Personal Access Token'); return; }
    if (!t.startsWith('gh')) { setError('Token harus dimulai dengan "ghp_" atau "github_pat_"'); return; }

    setLoading(true);
    setError('');

    if (remember) setToken(t);

    const result = await loginWithToken(t);
    if (!result) {
      setError('Token tidak valid atau tidak punya akses Gist. Coba buat token baru.');
      setLoading(false);
      return;
    }

    onLogin(result.username, result.gistData);
    setLoading(false);
  }

  return (
    <div className="login-screen">
      <div className="login-box">
        <div className="login-brand">Ad<span>Journal</span></div>
        <div className="login-subtitle">Paid Traffic &amp; Adsense Tracker</div>

        <div className="login-gh-badge">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
          Masuk dengan GitHub Token
        </div>

        <div className="login-form">
          <div className="login-info-box">
            <div className="login-info-title">Cara mendapatkan token:</div>
            <ol className="login-info-steps">
              <li>Buka <strong>github.com</strong> → Settings</li>
              <li>Developer settings → Personal access tokens → Tokens (classic)</li>
              <li>Generate new token → centang <strong>gist</strong></li>
              <li>Copy token dan paste di sini</li>
            </ol>
          </div>

          <div className="fg">
            <label>GitHub Personal Access Token</label>
            <input
              type="password"
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              value={token}
              onChange={e => { setTokenInput(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <label className="login-remember">
            <input
              type="checkbox"
              checked={remember}
              onChange={e => setRemember(e.target.checked)}
            />
            <span>Ingat token di browser ini</span>
            <span className="login-remember-sub">(tersimpan di localStorage)</span>
          </label>

          {error && <div className="login-error">{error}</div>}

          <button
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', height: 44, fontSize: 14 }}
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <>
                <svg className="spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
                Menghubungkan ke GitHub...
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                Masuk dengan GitHub
              </>
            )}
          </button>
        </div>

        <div className="login-footer">
          Semua data disimpan di <strong>GitHub Gist</strong> (private) milik kamu.<br/>
          Tidak ada server pihak ketiga yang menyimpan datamu.
        </div>
      </div>
    </div>
  );
}
