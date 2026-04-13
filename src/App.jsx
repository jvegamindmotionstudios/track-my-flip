import React, { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import RoutePlanner from './pages/RoutePlanner';
import BudgetTracker from './pages/BudgetTracker';
import InventoryManager from './pages/InventoryManager';
import PriceEstimator from './pages/PriceEstimator';
import FindSales from './pages/FindSales';
import MileageTracker from './pages/MileageTracker';
import SettingsModal from './components/SettingsModal';
import Auth from './pages/Auth';
import Pricing from './pages/Pricing';
import InstallPrompt from './components/InstallPrompt';
import GlobalDrivePrompt from './components/GlobalDrivePrompt';
import { AppProvider, useAppContext } from './context/AppContext';
import { supabase, isSupabaseConfigured } from './config/supabaseClient';
import { Settings, ShieldCheck, Car, FileText, AlertTriangle } from 'lucide-react';

function MainInterface({ session }) {
  const [currentTab, setCurrentTab] = useState('find');
  const [showSettings, setShowSettings] = useState(false);
  const [showToS, setShowToS] = useState(false);
  const [hasAgreedToS, setHasAgreedToS] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  
  const { isPro, isTrialing, trialDaysLeft } = useAppContext();

  useEffect(() => {
    const accepted = localStorage.getItem('trackMyFlip_termsAccepted');
    if (!accepted) {
      setShowToS(true);
    }
  }, []);

  const handleAcceptTerms = () => {
    if (hasAgreedToS) {
      localStorage.setItem('trackMyFlip_termsAccepted', 'true');
      setShowToS(false);
    }
  };

  const handleSubscribe = (billingCycle) => {
    // Replace these URLs once your Stripe Payment Links are generated:
    const monthlyURL = "https://buy.stripe.com/test_placeholder_monthly";
    const yearlyURL = "https://buy.stripe.com/test_placeholder_yearly";
    
    const checkoutUrl = billingCycle === 'monthly' ? monthlyURL : yearlyURL;
    // We append the Supabase user ID so Stripe webhooks can securely credit this exact account later!
    window.location.href = `${checkoutUrl}?client_reference_id=${session?.user?.id || 'guest'}`;
  };

  const renderContent = () => {
    // Explicit Upgrade Modal Trigger
    if (showPricing) {
       return <Pricing onClose={() => setShowPricing(false)} onSubscribeClick={handleSubscribe} />;
    }

    // Pro Paywall Blocks (AI Price Estimator is hardblocked post-trial)
    if (!isPro && !isTrialing && currentTab === 'price') {
      return <Pricing onClose={() => setCurrentTab('find')} onSubscribeClick={handleSubscribe} />;
    }

    switch (currentTab) {
      case 'find': return <FindSales />;
      case 'route': return <RoutePlanner />;
      case 'budget': return <BudgetTracker />;
      case 'inventory': return <InventoryManager />;
      case 'price': return <PriceEstimator />;
      case 'auto': return <MileageTracker />;
      default: return <FindSales />;
    }
  };

  const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div className="app-container">
      <header style={{ padding: '1.5rem 1.5rem 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/logo.png?v=2" alt="Track My Flip Logo" style={{ width: '64px', height: '64px', objectFit: 'contain', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.2))' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
              <span style={{ color: '#0f3a8b' }}>Track My </span><span style={{ color: '#3f9b0b' }}>Flip</span>
            </h1>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Route to Profit</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {!isPro && (
             <button onClick={() => setShowPricing(true)} style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)', color: 'white', padding: '0.4rem 0.75rem', borderRadius: '16px', fontSize: '0.75rem', fontWeight: 800, border: 'none', cursor: 'pointer', boxShadow: '0 2px 4px rgba(245, 158, 11, 0.4)' }}>
                {isTrialing ? `TRIAL: ${trialDaysLeft} DAYS` : 'UPGRADE PRO'}
             </button>
          )}
          <div style={{ background: 'rgba(0,0,0,0.03)', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 600 }}>
            {currentDate}
          </div>
          <button onClick={() => setShowSettings(true)} style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.4rem', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             <Settings size={20} />
          </button>
        </div>
      </header>

      <main className="view-content">
        {renderContent()}
      </main>
      
      <Navigation currentTab={currentTab} setCurrentTab={setCurrentTab} />
      <InstallPrompt />
      <GlobalDrivePrompt />

      {/* Global Initial Terms of Service Modal */}
      {showToS && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(10px)', animation: 'fadeIn 0.3s ease-out' }}>
          <div className="card glass" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.5rem', background: '#fff' }}>
            
            <div style={{ textAlign: 'center', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'inline-flex', background: 'rgba(15, 58, 139, 0.1)', padding: '1rem', borderRadius: '50%', marginBottom: '0.5rem' }}>
                <ShieldCheck size={36} color="#0f3a8b" />
              </div>
              <h2 style={{ margin: '0.5rem 0 0 0', fontWeight: 800 }}>Terms of Service & Safety</h2>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Please review and acknowledge the following to access Track My Flip.</p>
            </div>

            <div style={{ display: 'flex', gap: '1rem', background: 'rgba(239, 68, 68, 0.05)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
               <Car size={24} color="#ef4444" style={{ flexShrink: 0 }} />
               <div>
                 <h4 style={{ margin: '0 0 0.25rem 0', color: '#dc2626' }}>Safe Operation & Distracted Driving</h4>
                 <p style={{ margin: 0, fontSize: '0.8rem', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
                   Do not type, manually interact with, or view estimations on this app while actively driving. You assume full responsibility for adhering to local distracted driving laws and safely operating your vehicle.
                 </p>
               </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', background: 'rgba(59, 130, 246, 0.05)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
               <FileText size={24} color="#3b82f6" style={{ flexShrink: 0 }} />
               <div>
                 <h4 style={{ margin: '0 0 0.25rem 0', color: '#2563eb' }}>Tax Liability & Record Keeping</h4>
                 <p style={{ margin: 0, fontSize: '0.8rem', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
                   Track My Flip is an organizational tool. Generated mileage reports do NOT constitute certified tax advice. You alone are responsible for IRS compliance, maintaining contemporaneous logs, and burden of proof during audits.
                 </p>
               </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', background: 'rgba(0, 0, 0, 0.03)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
               <AlertTriangle size={24} color="#f59e0b" style={{ flexShrink: 0 }} />
               <div>
                 <h4 style={{ margin: '0 0 0.25rem 0', color: '#d97706' }}>"As-Is" Indemnification</h4>
                 <p style={{ margin: 0, fontSize: '0.8rem', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
                   This software and its estimations are provided "as-is" without warranty. By using this service, you agree to indemnify and hold the developers harmless from any liabilities, accidents, or financial discrepancies.
                 </p>
               </div>
            </div>

            <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.02)', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
               <strong>www.mindmotionstudios.com L.L.C.</strong><br/>
               4539 N. 22nd St. Suite N<br/>
               Phoenix, AZ 85016<br/>
               jvega@mindmotionstudios.com
            </div>

            <label style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', cursor: 'pointer', background: 'rgba(16, 185, 129, 0.05)', padding: '1rem', borderRadius: '8px', border: hasAgreedToS ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid var(--border-color)', transition: 'all 0.2s', marginTop: '0.5rem' }}>
               <input 
                 type="checkbox" 
                 checked={hasAgreedToS} 
                 onChange={(e) => setHasAgreedToS(e.target.checked)}
                 style={{ width: '20px', height: '20px', marginTop: '2px', cursor: 'pointer', accentColor: '#10b981' }} 
               />
               <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: '1.4' }}>
                 I have read and unconditionally agree to these terms, and I pledge to use Track My Flip safely and legally.
               </span>
            </label>

            <button 
              className="btn" 
              onClick={handleAcceptTerms} 
              disabled={!hasAgreedToS}
              style={{ 
                width: '100%', 
                padding: '1rem', 
                fontSize: '1.1rem',
                fontWeight: 'bold',
                border: 'none',
                borderRadius: '12px',
                background: hasAgreedToS ? '#10b981' : 'var(--border-color)', 
                color: hasAgreedToS ? '#fff' : 'var(--text-secondary)',
                opacity: hasAgreedToS ? 1 : 0.6,
                cursor: hasAgreedToS ? 'pointer' : 'not-allowed',
                transition: 'all 0.3s',
                marginTop: '0.5rem'
              }}>
              I Agree & Proceed
            </button>
          </div>
        </div>
      )}

      {/* Global Settings Modal */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}

function App() {
  const [session, setSession] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setAuthChecking(false);
      return;
    }
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthChecking(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (authChecking) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--text-secondary)' }}>Loading App...</div>;
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <AppProvider>
      <MainInterface session={session} />
    </AppProvider>
  );
}

export default App;
