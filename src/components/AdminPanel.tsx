/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useFirebase } from '../lib/FirebaseProvider';
import { db, handleFirestoreError } from '../lib/firebase';
import { CollectionReference, collection, query, where, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { Committee, Delegation, OperationType } from '../types';
import { Plus, Trash2, Globe, Users, FileText, Check, Settings, Sparkles, AlertCircle } from 'lucide-react';

interface Preset {
  name: string;
  description: string;
  countries: string[];
}

const COMMITTEE_PRESETS: Preset[] = [
  {
    name: "Conseil de Sécurité (UNSC)",
    description: "Les 5 membres permanents (P5) avec droit de veto + 10 membres élus.",
    countries: [
      "États-Unis", "Chine", "Russie", "France", "Royaume-Uni",
      "Algérie", "Équateur", "Guyane", "Japon", "Malte",
      "Mozambique", "République de Corée", "Sierra Leone", "Slovénie", "Suisse"
    ]
  },
  {
    name: "Membres du G7",
    description: "Les sept puissances économiques majeures.",
    countries: [
      "États-Unis", "Canada", "Japon", "Allemagne", "France", "Royaume-Uni", "Italie"
    ]
  },
  {
    name: "Vide",
    description: "Ajouter vos délégations manuellement (recommandé pour comités sur mesure).",
    countries: []
  }
];

export default function AdminPanel() {
  const { user } = useFirebase();
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [language, setLanguage] = useState<'FR' | 'EN'>('FR');
  const [chairEmail, setChairEmail] = useState('');
  const [chairPassword, setChairPassword] = useState('');

  // Sync user's committees in real-time
  useEffect(() => {
    if (!user) return;

    const path = 'committees';
    const q = query(collection(db, path), where('creatorId', '==', user.uid));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Committee[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          name: data.name,
          description: data.description || '',
          creatorId: data.creatorId,
          delegations: data.delegations || [],
          language: data.language || 'FR',
          chairEmail: data.chairEmail || '',
          chairPassword: data.chairPassword || '',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        } as Committee);
      });
      // Sort newest first
      list.sort((a, b) => {
        const aT = a.createdAt?.seconds || 0;
        const bT = b.createdAt?.seconds || 0;
        return bT - aT;
      });
      setCommittees(list);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, [user]);

  // Create Committee in Firestore
  const handleCreateCommittee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!name.trim()) {
      setStatusMessage({ type: 'error', text: "Le nom du comité est requis." });
      return;
    }
    if (!chairEmail.trim() || !chairPassword.trim()) {
      setStatusMessage({ type: 'error', text: "L'email et le mot de passe de la présidence sont requis." });
      return;
    }

    setCreating(true);
    setStatusMessage(null);

    const path = 'committees';
    try {
      const docRef = doc(collection(db, path));
      const committeeId = docRef.id;

      const newCommittee = {
        id: committeeId,
        name: name.trim(),
        description: description.trim(),
        creatorId: user.uid,
        delegations: [], // Start with empty delegation list
        language: language,
        chairEmail: chairEmail.trim(),
        chairPassword: chairPassword.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(docRef, newCommittee);
      
      // Reset main fields
      setName('');
      setDescription('');
      setChairEmail('');
      setChairPassword('');
      setLanguage('FR');
      setStatusMessage({ type: 'success', text: `Comité "${newCommittee.name}" créé avec succès !` });
      
      // Auto dismiss success message after 4s
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (error) {
      console.error(error);
      setStatusMessage({ type: 'error', text: "Une erreur est survenue lors du stockage du comité." });
    } finally {
      setCreating(false);
    }
  };

  // Delete Committee
  const handleDeleteCommittee = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      setTimeout(() => {
        setConfirmDeleteId(prev => prev === id ? null : prev);
      }, 4000);
      return;
    }

    const path = `committees/${id}`;
    try {
      await deleteDoc(doc(db, 'committees', id));
      setConfirmDeleteId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header Info */}
      <div className="mb-10 rounded-[28px] bg-white p-6 sm:p-8 text-neutral-950 border border-neutral-200/50 shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 w-80 h-80 bg-neutral-950/[0.01] rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-4xl relative z-10">
          <div className="inline-flex items-center space-x-2 rounded-full border border-neutral-200 bg-neutral-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-neutral-500">
            <Sparkles className="h-3.5 w-3.5 text-neutral-900" />
            <span>Console Organisateur</span>
          </div>
          <h2 className="mt-4 font-sans text-2xl sm:text-3xl font-black tracking-tight uppercase leading-tight text-neutral-950">
            Initialisez vos comités MUN
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-neutral-500 leading-relaxed font-semibold max-w-2xl">
            Gérez globalement l'attribution des délégations, configurez les préréglages structurels et préparez les débats. Toute modification est répercutée instantanément.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Column: List of existing Committees */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-[28px] border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4 mb-4">
              <h3 className="font-sans text-xs font-black uppercase tracking-widest text-neutral-900 flex items-center space-x-2">
                <Globe className="h-4 w-4 text-neutral-500" />
                <span>Mes Séances Actives ({committees.length})</span>
              </h3>
            </div>

            {loading ? (
              <div className="flex h-40 items-center justify-center">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-950 border-t-transparent" />
              </div>
            ) : committees.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="rounded-2xl bg-neutral-50 p-4 mb-3 border border-neutral-200/50">
                  <AlertCircle className="h-5 w-5 text-neutral-400" />
                </div>
                <p className="text-xs font-black uppercase tracking-widest text-neutral-900">Aucun comité configuré</p>
                <p className="mt-2 text-[11px] text-neutral-500 font-semibold max-w-[240px]">
                  Utilisez le volet de droite pour créer votre première instance de débat.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 max-h-[500px] overflow-y-auto pr-1">
                {committees.map((com) => (
                  <div key={com.id} className="group py-4 flex items-start justify-between">
                    <div className="min-w-0 pr-3">
                      <h4 className="text-xs font-black uppercase tracking-wider text-neutral-900 truncate">{com.name}</h4>
                      <p className="text-[11px] text-neutral-500 font-medium truncate mt-1">{com.description || "Aucun thème principal configuré"}</p>
                      <div className="mt-3 flex items-center space-x-3 text-[10px] font-bold uppercase tracking-wide text-neutral-450 font-semibold">
                        <span className="flex items-center space-x-1.5 text-neutral-500">
                          <Users className="h-3.5 w-3.5" />
                          <span>{com.delegations?.length || 0} DELEGATIONS</span>
                        </span>
                      </div>
                    </div>
                    {confirmDeleteId === com.id ? (
                      <button
                        onClick={() => handleDeleteCommittee(com.id)}
                        className="rounded-xl px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[9px] font-black uppercase tracking-wider transition-colors focus:outline-none"
                        title="Confirmer la suppression"
                      >
                        Confirmer?
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDeleteCommittee(com.id)}
                        className="rounded-full p-2 text-neutral-400 hover:bg-red-50 hover:text-red-650 border border-transparent transition-colors focus:outline-none"
                        title="Supprimer le comité"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Creation Form */}
        <div className="lg:col-span-7">
          <form onSubmit={handleCreateCommittee} className="rounded-[28px] border border-neutral-200 bg-white p-6 sm:p-8 space-y-6 shadow-sm">
            <h3 className="font-sans text-xs font-black uppercase tracking-widest text-neutral-900 flex items-center space-x-2 pb-3 border-b border-neutral-100">
              <Settings className="h-4.5 w-4.5 text-neutral-500" />
              <span>Créer une nouvelle instance de débat</span>
            </h3>

            {/* Display message */}
            {statusMessage && (
              <div className={`rounded-2xl p-4 text-xs font-bold leading-relaxed border ${
                statusMessage.type === 'success' 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-100' 
                  : 'bg-red-50 text-red-800 border-red-100'
              }`}>
                {statusMessage.text}
              </div>
            )}

            {/* Invariant Inputs */}
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 pl-1">
                  Nom de l'Organe / Comité
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex. Conseil de Sécurité (UNSC), DISEC..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3.5 text-xs font-semibold text-neutral-900 placeholder-neutral-450 outline-none transition-all focus:border-neutral-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 pl-1">
                  Thématique / Sujet de Discussion
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex. Résolution des tensions territoriales dans l'Arctique..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs font-semibold text-neutral-900 placeholder-neutral-450 outline-none transition-all focus:border-neutral-400 focus:bg-white"
                />
              </div>

              {/* Language and Presidency Credentials */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 pl-1">
                    Langue de Débat
                  </label>
                  <div className="flex bg-neutral-100 p-1 rounded-2xl border border-neutral-200/50">
                    <button
                      type="button"
                      onClick={() => setLanguage('FR')}
                      className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all rounded-xl ${
                        language === 'FR' ? 'bg-neutral-950 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-900'
                      }`}
                    >
                      Français (FR)
                    </button>
                    <button
                      type="button"
                      onClick={() => setLanguage('EN')}
                      className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all rounded-xl ${
                        language === 'EN' ? 'bg-neutral-950 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-900'
                      }`}
                    >
                      English (EN)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 pl-1">
                    Email de la présidence
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="presidence.unsc@mun.org"
                    value={chairEmail}
                    onChange={(e) => setChairEmail(e.target.value)}
                    className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs font-semibold text-neutral-900 placeholder-neutral-450 outline-none transition-all focus:border-neutral-400 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 pl-1">
                  Mot de passe de la présidence
                </label>
                <input
                  type="password"
                  required
                  placeholder="Mot de passe secret présidence"
                  value={chairPassword}
                  onChange={(e) => setChairPassword(e.target.value)}
                  className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs font-bold text-neutral-900 placeholder-neutral-450 outline-none transition-all focus:border-neutral-400 focus:bg-white"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={creating}
              className="flex w-full items-center justify-center space-x-2 rounded-2xl bg-neutral-950 px-4 py-3.5 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-neutral-900 active:scale-95 duration-150 focus:outline-none disabled:opacity-75"
            >
              {creating ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              <span>Créer le Comité</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
