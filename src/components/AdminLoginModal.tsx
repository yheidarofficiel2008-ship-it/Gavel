/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useFirebase } from '../lib/FirebaseProvider';
import { motion, AnimatePresence } from 'motion/react';
import { X, Shield, HelpCircle, CheckCircle, Mail, Lock } from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AdminLoginModal({ isOpen, onClose, onSuccess }: AdminLoginModalProps) {
  const { loginWithEmail } = useFirebase();
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Veuillez remplir tous les champs.");
      return;
    }

    setError(null);
    setSigningIn(true);
    try {
      await loginWithEmail(email, password);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/operation-not-allowed' || err.message?.includes('operation-not-allowed')) {
        setError("La méthode d'authentification Email/Mot de passe n'est pas encore activée sur votre projet Firebase. Veuillez l'activer dans votre Console Firebase (onglet Authentication > Sign-in method > Messagerie et mot de passe > Activer).");
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError("Identifiants incorrects. Veuillez réessayer.");
      } else if (err.code === 'auth/email-already-in-use') {
        setError("Cette adresse email est déjà enregistrée.");
      } else if (err.code === 'auth/weak-password') {
        setError("Le mot de passe doit contenir au moins 6 caractères.");
      } else {
        setError("La connexion a échoué. Assurez-vous de vos identifiants.");
      }
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-gray-500/20 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-md overflow-hidden rounded-[24px] border border-neutral-200/65 bg-white/95 backdrop-blur-xl p-6 shadow-2xl z-10 text-neutral-900"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full p-2 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-950 focus:outline-none"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Title / Header */}
            <div className="flex flex-col items-center text-center mt-2 mb-6">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-950 text-white shadow-md">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="font-sans text-xs font-black uppercase tracking-widest text-neutral-900">
                ESPACE ORGANISATEUR MUN
              </h3>
              <p className="mt-2 text-xs text-neutral-500 max-w-xs leading-relaxed font-semibold">
                Connectez-vous pour configurer vos comités, attribuer des délégations et piloter vos débats.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 rounded-2xl bg-red-50 p-4 text-[11px] text-red-800 leading-relaxed border border-red-200 uppercase font-black tracking-wide">
                {error}
              </div>
            )}

            {/* Credentials Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] text-neutral-400 uppercase tracking-widest font-black mb-1.5 pl-1">
                  Adresse Email
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-neutral-400">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input
                    type="email"
                    required
                    placeholder="organisateur@ex.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 py-3 pl-11 pr-4 text-xs font-semibold text-neutral-900 placeholder-neutral-450 outline-none transition-all focus:border-neutral-400 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-neutral-400 uppercase tracking-widest font-black mb-1.5 pl-1">
                  Mot de passe
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-neutral-400">
                    <Lock className="h-4 w-4" />
                  </span>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 py-3 pl-11 pr-4 text-xs font-semibold text-neutral-900 placeholder-neutral-450 outline-none transition-all focus:border-neutral-400 focus:bg-white"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={signingIn}
                  className="flex w-full items-center justify-center space-x-3 rounded-2xl bg-neutral-950 text-white px-4 py-3 text-xs font-black uppercase tracking-widest transition-all hover:bg-neutral-900 active:scale-95 duration-150 focus:outline-none disabled:opacity-75"
                >
                  {signingIn ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : null}
                  <span>{signingIn ? "TRAITEMENT..." : "SE CONNECTER"}</span>
                </button>
              </div>
            </form>

            {/* Supporting Information Box */}
            <div className="mt-6 rounded-2xl bg-neutral-50 p-4 border border-neutral-200/50">
              <div className="flex items-start space-x-2.5">
                <HelpCircle className="h-4 w-4 text-neutral-850 mt-0.5" />
                <div className="text-left">
                  <h4 className="text-xs font-bold uppercase tracking-wide text-neutral-850">Aide de connexion</h4>
                  <p className="mt-1 text-[11px] text-neutral-500 leading-relaxed font-semibold">
                    Vos comités seront liés en toute sécurité à votre compte organisateur. Le serveur d'authentification vérifie vos identifiants pour garantir les droits d'administration exclusifs en temps réel.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-center space-x-1.5 text-[11px] text-neutral-450 font-bold uppercase tracking-wide">
              <CheckCircle className="h-3.5 w-3.5 text-neutral-300" />
              <span>Modération Sécurisée</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
