import React, { useState } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const FaqItem = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid var(--border-color)', padding: '0.75rem 0' }}>
       <div 
         onClick={() => setIsOpen(!isOpen)} 
         style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}
       >
         {question}
         <span>{isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
       </div>
       {isOpen && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem', lineHeight: '1.5' }}>{answer}</div>}
    </div>
  );
};

function SettingsModal({ onClose }) {
  const { userProfile, setUserProfile } = useAppContext();

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setUserProfile(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.2s ease-out' }}>
      
      <div className="card glass" style={{ width: '95%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', margin: '0 auto', display: 'flex', flexDirection: 'column', padding: '0', background: '#f0f2f5' }}>
        
        {/* Sticky Header */}
        <div style={{ position: 'sticky', top: 0, zIndex: 10, background: '#fff', padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Settings & Preferences</h2>
          <button onClick={onClose} style={{ background: 'rgba(0,0,0,0.05)', border: 'none', color: 'var(--text-primary)', borderRadius: '50%', padding: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.5rem 1rem' }}>
          
          {/* HELP & FAQ SECTION */}
          <section>
            <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.5rem', marginLeft: '0.5rem', letterSpacing: '0.5px' }}>Help & Support</h3>
            <div style={{ background: '#fff', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '0 1rem' }}>
               <FaqItem 
                  question="How do I export my mileage for taxes?" 
                  answer="Go to the Auto/Drive tab and tap 'Download IRS Log' in the top right. It instantly exports an IRS-compliant Excel worksheet of all drives you classified as 'Business'." 
               />
               <FaqItem 
                  question="Why isn't the AI finding my item?" 
                  answer="The AI pricing tool requires a clear, well-lit photo containing identifying angles. If an object is completely generic with no branding (e.g. a plain blue cord), our strict accuracy guardrails will reject it rather than making a wild guess that could lose you money." 
               />
               <FaqItem 
                  question="Where do the Map Radar yard sales come from?" 
                  answer="Map Radar bypasses strict proxy firewalls to harvest live, real-time yard sale and estate sale coordinates directly from actual classified databases in your zip code area." 
               />
               <FaqItem 
                  question="How do I unlock unlimited mapping limits?" 
                  answer="Tap the orange Upgrade button on the top right of the main app header to unlock full Pro capabilities, including unlimited routing stops and unlimited AI appraisal scans." 
               />
            </div>
          </section>

          {/* ABOUT & LEGAL SECTION */}
          <section>
            <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.5rem', marginLeft: '0.5rem', letterSpacing: '0.5px' }}>About & Legal</h3>
            <div style={{ background: '#fff', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>App Version</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>1.0.0</span>
                </div>
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <a href="/privacy.html" target="_blank" style={{ fontSize: '0.85rem', color: 'var(--accent-color)', textDecoration: 'none', fontWeight: 600 }}>Privacy Policy</a>
                    <a href="/terms.html" target="_blank" style={{ fontSize: '0.85rem', color: 'var(--accent-color)', textDecoration: 'none', fontWeight: 600 }}>Terms of Service</a>
                </div>
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                    <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                        Liability: Track My Flip is for organizational use. Do not interact while driving. All tax outputs require CPA verification. App interfaces and calculations are provided 'As-Is'. <br />
                        © Mind Motion Studios L.L.C., Phoenix, AZ. 
                    </p>
                </div>
                <button 
                  onClick={() => { localStorage.removeItem('trackMyFlip_termsAccepted'); window.location.reload(); }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.75rem', textDecoration: 'underline', cursor: 'pointer', textAlign: 'left', padding: 0, marginTop: '0.25rem' }}
                >
                  Review Initial Safety Agreement
                </button>
            </div>
          </section>

          {/* DANGER ZONE SECTION */}
          <section style={{ marginTop: '0.5rem' }}>
            <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#ef4444', marginBottom: '0.5rem', marginLeft: '0.5rem', letterSpacing: '0.5px' }}>Danger Zone</h3>
            <div style={{ background: '#fff', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '12px', overflow: 'hidden' }}>
                <button 
                  onClick={async () => {
                    const { isSupabaseConfigured, supabase } = await import('../config/supabaseClient');
                    if (isSupabaseConfigured) { await supabase.auth.signOut(); window.location.reload(); }
                  }}
                  style={{ width: '100%', padding: '1rem', background: '#fff', color: 'var(--text-primary)', border: 'none', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left', transition: 'background 0.2s' }}
                  onMouseOver={(e) => e.target.style.background = 'rgba(0,0,0,0.02)'}
                  onMouseOut={(e) => e.target.style.background = '#fff'}
                >
                  Log Out Safely
                </button>
                <button 
                  onClick={async () => {
                    if (window.confirm("CRITICAL WARNING: This will permanently purge your user profile and request the permanent deletion of your account. This cannot be undone. Do you wish to proceed?")) {
                        const { isSupabaseConfigured, supabase } = await import('../config/supabaseClient');
                        if (isSupabaseConfigured) {
                            const userInfo = await supabase.auth.getUser();
                            if (userInfo?.data?.user?.id) {
                                await supabase.from('inventory').delete().eq('user_id', userInfo.data.user.id);
                                await supabase.from('tracked_drives').delete().eq('user_id', userInfo.data.user.id);
                                await supabase.from('user_profiles').delete().eq('user_id', userInfo.data.user.id);
                            }
                            localStorage.clear();
                            await supabase.auth.signOut();
                            alert("Account deletion initiated and user data scrubbed. You will now be logged out.");
                            window.location.reload();
                        }
                    }
                  }}
                  style={{ width: '100%', padding: '1rem', background: 'rgba(239, 68, 68, 0.05)', color: '#ef4444', border: 'none', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left', transition: 'background 0.2s' }}
                  onMouseOver={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.1)'}
                  onMouseOut={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.05)'}
                >
                  Delete Account...
                </button>
            </div>
          </section>

          <button className="btn btn-primary" onClick={onClose} style={{ width: '100%', padding: '1rem', fontSize: '1rem' }}>
            Done
          </button>
          
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
