import React, { useState } from 'react';
import { isSupabaseConfigured, supabase } from '../config/supabaseClient';
import { ShieldCheck, AlertTriangle, User, Lock, Mail, Loader2 } from 'lucide-react';

function Auth({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isSupabaseConfigured) {
    return (
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div className="card glass" style={{ maxWidth: '400px', width: '100%', padding: '2rem', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '50%', marginBottom: '1rem' }}>
            <AlertTriangle size={36} color="#ef4444" />
          </div>
          <h2 style={{ margin: '0 0 1rem 0' }}>Setup Required</h2>
          <p style={{ margin: '0 0 1.5rem 0', color: 'var(--text-secondary)' }}>
            To continue, please open the <code>.env.local</code> file in your project and paste your Supabase <strong>URL</strong> and <strong>Anon Key</strong>.
          </p>
          <div style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <p style={{ marginTop: 0 }}><strong>Steps:</strong></p>
            <ol style={{ margin: 0, paddingLeft: '1.25rem' }}>
              <li>Go to <a href="https://supabase.com" target="_blank" rel="noreferrer" style={{color: '#0f3a8b'}}>supabase.com</a> and create a project.</li>
              <li>Navigate to Project Settings &gt; API.</li>
              <li>Copy the URL and anon key.</li>
              <li>Paste them into your local <code>.env.local</code> file.</li>
              <li>Save the file and refresh this page.</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (onAuthSuccess) onAuthSuccess();
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Check your email for the login link!');
      }
    } catch (error) {
      setErrorMsg(error.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '1rem' }}>
      <div className="card glass" style={{ maxWidth: '400px', width: '100%', padding: '2.5rem 2rem', position: 'relative', overflow: 'hidden' }}>
        {/* Decorative background element */}
        <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px', background: 'radial-gradient(circle, rgba(15, 58, 139, 0.1) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%' }}></div>
        
        <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <img src="/logo.png?v=2" alt="Track My Flip Logo" style={{ width: '80px', height: '80px', objectFit: 'contain', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.15))', marginBottom: '0.5rem' }} />
          <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
            <span style={{ color: '#0f3a8b' }}>Track My </span><span style={{ color: '#3f9b0b' }}>Flip</span>
          </h1>
          <p style={{ margin: '0 0 2rem 0', color: 'var(--text-secondary)', fontWeight: '500' }}>
            {isLogin ? 'Welcome back! Log in to access your data.' : 'Create an account to save your routes and inventory in the cloud.'}
          </p>
        </div>

        {errorMsg && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.75rem', borderRadius: '8px', color: '#ef4444', fontSize: '0.85rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'relative', zIndex: 1 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Email Address</label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
                <Mail size={18} />
              </div>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@email.com"
                style={{ width: '100%', padding: '0.9rem 1rem 0.9rem 2.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '1rem', backgroundColor: '#f9fafb' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
                <Lock size={18} />
              </div>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{ width: '100%', padding: '0.9rem 1rem 0.9rem 2.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '1rem', backgroundColor: '#f9fafb' }}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              width: '100%', 
              padding: '1rem', 
              border: 'none', 
              borderRadius: '12px', 
              background: 'linear-gradient(135deg, #0f3a8b 0%, #0a2558 100%)', 
              color: 'white', 
              fontSize: '1rem', 
              fontWeight: 'bold', 
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 12px rgba(15, 58, 139, 0.25)',
              marginTop: '0.5rem',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? <Loader2 size={20} className="spin" /> : <ShieldCheck size={20} />}
            {isLogin ? 'Log In' : 'Create Account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '2rem', position: 'relative', zIndex: 1 }}>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button 
               onClick={() => { setIsLogin(!isLogin); setErrorMsg(''); }}
               style={{ background: 'none', border: 'none', color: '#0f3a8b', fontWeight: 'bold', cursor: 'pointer', padding: '0 0 0 0.5rem', fontSize: '0.9rem' }}
            >
              {isLogin ? 'Sign Up' : 'Log In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Auth;
