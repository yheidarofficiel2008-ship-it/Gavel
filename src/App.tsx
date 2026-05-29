/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { FirebaseProvider, useFirebase } from './lib/FirebaseProvider';
import Navbar from './components/Navbar';
import HomeSection from './components/HomeSection';
import AdminPanel from './components/AdminPanel';
import AdminLoginModal from './components/AdminLoginModal';

function AppContent() {
  const { user } = useFirebase();
  const [activeTab, setActiveTab] = useState<'home' | 'admin'>('home');
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  // Safely toggling administrative access
  const handleOpenAdmin = () => {
    if (user) {
      setActiveTab('admin');
    } else {
      setIsAdminModalOpen(true);
    }
  };

  const handleAdminLoginSuccess = () => {
    setActiveTab('admin');
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] font-sans text-neutral-900 selection:bg-neutral-950 selection:text-white antialiased">
      {/* Premium Navigation Header */}
      <Navbar 
        onOpenAdmin={handleOpenAdmin} 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
          if (tab === 'admin' && !user) {
            setIsAdminModalOpen(true);
          } else {
            setActiveTab(tab);
          }
        }} 
      />

      {/* Main Container Views with fade-ins */}
      <main className="relative min-h-[calc(100vh-4rem)]">
        {activeTab === 'home' ? (
          <HomeSection onAdminClick={handleOpenAdmin} />
        ) : (
          user && <AdminPanel />
        )}
      </main>

      {/* Authentication Gateway Overlay */}
      <AdminLoginModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        onSuccess={handleAdminLoginSuccess}
      />
    </div>
  );
}

export default function App() {
  return (
    <FirebaseProvider>
      <AppContent />
    </FirebaseProvider>
  );
}
