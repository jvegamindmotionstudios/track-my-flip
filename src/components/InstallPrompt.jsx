import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      setIsStandalone(true);
      return;
    }

    // Detect iOS
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIosDevice);

    if (isIosDevice) {
        // Show iOS instructions automatically if not standalone after a short delay
        const timer = setTimeout(() => setShowPrompt(true), 3000);
        return () => clearTimeout(timer);
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  // Don't show if installed or dismissed
  if (!showPrompt || isStandalone) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '80px', // Above navigation
      left: '50%',
      transform: 'translateX(-50%)',
      width: '90%',
      maxWidth: '400px',
      background: '#fff',
      padding: '1rem',
      borderRadius: '12px',
      boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
      border: '1px solid var(--border-color)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
      animation: 'slideUp 0.3s ease-out'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: 'linear-gradient(135deg, #0f3a8b, #3f9b0b)', padding: '0.5rem', borderRadius: '8px' }}>
            <Download color="#fff" size={20} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>Install TrackMyFlip</h4>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Get the full app experience</p>
          </div>
        </div>
        <button onClick={handleDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', color: 'var(--text-secondary)' }}>
          <X size={20} />
        </button>
      </div>

      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        {isIOS ? (
          <p style={{ margin: 0 }}>To install, tap the <strong>Share</strong> icon in your browser menu and select <strong>"Add to Home Screen"</strong>.</p>
        ) : (
          <button 
            onClick={handleInstallClick} 
            className="btn" 
            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: '#0f3a8b', color: '#fff', fontWeight: 'bold', border: 'none' }}
          >
            Add to Home Screen
          </button>
        )}
      </div>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translate(-50%, 20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  );
};

export default InstallPrompt;
