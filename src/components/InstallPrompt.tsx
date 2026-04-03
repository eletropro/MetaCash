import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    const handler = (e: any) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Show the custom prompt
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }

    // We've used the prompt, and can't use it again
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-24 left-4 right-4 z-50 sm:left-auto sm:right-8 sm:w-80"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-brand-100 p-4 flex items-center gap-4">
            <div className="bg-brand-100 p-3 rounded-xl text-brand-600">
              <Download size={24} />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-zinc-900">Instalar CTCrossBol</h4>
              <p className="text-xs text-zinc-500">Acesse mais rápido direto da sua tela inicial.</p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleInstall}
                className="bg-brand-600 text-white text-xs font-bold py-2 px-4 rounded-lg hover:bg-brand-700 transition-colors"
              >
                Instalar
              </button>
              <button
                onClick={() => setShowPrompt(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1 self-center"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
