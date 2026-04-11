import React from 'react';
import { X, AlertTriangle, User } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

function SettingsModal({ onClose }) {
  const { userProfile, setUserProfile } = useAppContext();

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setUserProfile(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyItems: 'center', animation: 'fadeIn 0.2s ease-out' }}>
      <div className="card glass" style={{ width: '90%', maxWidth: '450px', maxHeight: '90vh', overflowY: 'auto', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem', background: '#fff' }}>
        <div className="flex-between">
          <h2 style={{ margin: 0 }}>Settings</h2>
          <button onClick={onClose} className="btn" style={{ background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: '50%', padding: '0.5rem' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '8px' }}>
          <h4 style={{ margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={16} /> Business Profile
          </h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Company/Business Name</label>
              <input 
                type="text" 
                name="companyName"
                value={userProfile?.companyName || ''}
                onChange={handleProfileChange}
                className="input-field" 
                placeholder="e.g. My Reselling Business LLC"
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Address</label>
              <input 
                type="text" 
                name="address"
                value={userProfile?.address || ''}
                onChange={handleProfileChange}
                className="input-field" 
                placeholder="123 Main St, City, ST 12345"
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Contact #</label>
                <input 
                  type="tel" 
                  name="phone"
                  value={userProfile?.phone || ''}
                  onChange={handleProfileChange}
                  className="input-field" 
                  placeholder="(555) 123-4567"
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Email</label>
                <input 
                  type="email" 
                  name="email"
                  value={userProfile?.email || ''}
                  onChange={handleProfileChange}
                  className="input-field" 
                  placeholder="contact@email.com"
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                />
              </div>
            </div>
          </div>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>This information is saved locally and can be used to generate professional PDF exports and tax reports.</p>
        </div>

        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '1rem', borderRadius: '8px' }}>
          <h4 style={{ color: '#ef4444', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={16} /> Legal Disclaimer
          </h4>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
            <strong>Disclaimer of Liability:</strong> Track My Flip is designed for informational and organizational purposes only. 
            Do not use, type, or interact with this application while actively operating a motor vehicle. 
            Calculated IRS mileage deductions and generated tax reports DO NOT constitute certified tax advice. 
            Always verify logging accuracy and consult a licensed tax professional (CPA).
            Marketplace estimates are generated from mock averages and are provided entirely "as is" without warranty.
          </p>
          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.7rem', color: 'var(--text-secondary)', textAlign: 'center', lineHeight: '1.4' }}>
             <strong>www.mindmotionstudios.com L.L.C.</strong><br/>
             4539 N. 22nd St. Suite N<br/>
             Phoenix, AZ 85016<br/>
             jvega@mindmotionstudios.com
          </div>
        </div>

        <div style={{ marginTop: '0.25rem' }}>
           <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}><strong>App Version:</strong> 1.0.0 (MVP)</p>
           <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}><strong>Operating Env:</strong> Web (PWA)</p>
        </div>
        
        <button className="btn btn-primary" onClick={onClose} style={{ width: '100%', marginTop: '0.25rem' }}>
          Save & Close Settings
        </button>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
          <button 
            onClick={async () => {
              const { isSupabaseConfigured, supabase } = await import('../config/supabaseClient');
              if (isSupabaseConfigured) {
                await supabase.auth.signOut();
                window.location.reload();
              }
            }}
            style={{ background: 'none', border: '1px solid #ef4444', color: '#ef4444', padding: '0.5rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', textAlign: 'center' }}
          >
            Log Out
          </button>

          <button 
             onClick={() => {
               localStorage.removeItem('trackMyFlip_termsAccepted');
               window.location.reload();
             }}
             style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.75rem', textDecoration: 'underline', cursor: 'pointer', textAlign: 'center' }}
          >
            Reset ToS Acknowledgement
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
