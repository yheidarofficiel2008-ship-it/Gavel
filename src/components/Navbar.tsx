/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { useFirebase } from '../lib/FirebaseProvider';
import { LogOut, Shield, ChevronDown } from 'lucide-react';

interface NavbarProps {
  onOpenAdmin: () => void;
  activeTab: 'home' | 'admin';
  setActiveTab: (tab: 'home' | 'admin') => void;
}

export default function Navbar({ onOpenAdmin, activeTab, setActiveTab }: NavbarProps) {
  const { user, logout } = useFirebase();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-neutral-200/40 bg-white/85 backdrop-blur-md text-neutral-900 shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          
          {/* Brand Logo & Name */}
          <div 
            onClick={() => setActiveTab('home')} 
            className="flex cursor-pointer items-center space-x-3 transition-opacity hover:opacity-90 active:scale-95 duration-150"
          >
            <img 
              src="https://lh3.googleusercontent.com/d/1JlciNWyDHatL8wFxsN47eer3jAPumey-" 
              alt="Logo" 
              referrerPolicy="no-referrer"
              className="h-9 w-auto object-contain"
            />
          </div>

          {/* Center Tabs for Smooth Switching if Auth is Ready */}
          {user && (
            <div className="hidden bg-neutral-100 p-1 rounded-full border border-neutral-200/60 space-x-1 md:flex shadow-inner">
              <button
                onClick={() => setActiveTab('home')}
                className={`rounded-full px-5 py-1.5 text-[11px] font-black uppercase tracking-wider transition-all duration-200 ${
                  activeTab === 'home'
                    ? 'bg-neutral-950 text-white shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                Accueil (Débats)
              </button>
              <button
                onClick={() => setActiveTab('admin')}
                className={`rounded-full px-5 py-1.5 text-[11px] font-black uppercase tracking-wider transition-all duration-200 ${
                  activeTab === 'admin'
                    ? 'bg-neutral-950 text-white shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                Panel Organisateur
              </button>
            </div>
          )}

          {/* Right Admin controls */}
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center space-x-2 rounded-full border border-neutral-200 bg-white p-1 pr-3 text-xs font-semibold uppercase tracking-wider transition-all hover:bg-neutral-50 focus:outline-none shadow-sm"
                >
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt={user.displayName || 'Admin'} 
                      referrerPolicy="no-referrer"
                      className="h-6 w-6 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-950 text-white font-extrabold text-[10px]">
                      {user.displayName?.[0] || 'A'}
                    </div>
                  )}
                  <div className="hidden text-left sm:block">
                    <p className="max-w-[120px] truncate text-[10px] font-bold text-neutral-900 leading-tight">
                      {user.displayName || 'Organisateur'}
                    </p>
                    <p className="text-[9px] text-emerald-600 font-bold tracking-wide">En ligne</p>
                  </div>
                  <ChevronDown className="h-3 w-3 text-neutral-500" />
                </button>

                {/* Dropdown menu */}
                {dropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setDropdownOpen(false)} 
                    />
                    <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-2xl border border-neutral-200 bg-white p-2 shadow-xl z-20 animate-fade-in text-neutral-800">
                      <div className="px-3 py-2 text-xs border-b border-neutral-100 mb-1">
                        <p className="font-extrabold text-neutral-900 uppercase tracking-wide truncate">{user.displayName}</p>
                        <p className="text-neutral-500 text-[10px] truncate">{user.email}</p>
                      </div>
                      
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          setActiveTab('admin');
                        }}
                        className="flex w-full items-center space-x-2 rounded-xl px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-neutral-800 transition-colors hover:bg-neutral-50"
                      >
                        <Shield className="h-3.5 w-3.5 text-neutral-500" />
                        <span>Créer un Comité</span>
                      </button>

                      <button
                        onClick={async () => {
                          setDropdownOpen(false);
                          await logout();
                          setActiveTab('home');
                        }}
                        className="flex w-full items-center space-x-2 rounded-xl px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-red-600 transition-colors hover:bg-red-50"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        <span>Se déconnecter</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenAdmin}
                className="flex items-center space-x-2 rounded-full bg-neutral-950 px-5 py-2 text-[11px] font-black uppercase tracking-widest text-white shadow-md transition-all hover:bg-neutral-900 active:scale-95 duration-150"
              >
                <Shield className="h-3.5 w-3.5 text-white" />
                <span>Espace Admin</span>
              </button>
            )}
          </div>

        </div>
      </div>
    </nav>
  );
}
