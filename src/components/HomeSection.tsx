/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { db, handleFirestoreError, getDbForCommittee } from '../lib/firebase';
import { useFirebase } from '../lib/FirebaseProvider';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc 
} from 'firebase/firestore';
import { Committee, OperationType, Delegation } from '../types';
import CommitteeSessionView from './CommitteeSessionView';
import { 
  Search, 
  Globe, 
  Users, 
  Info, 
  Cpu, 
  ChevronRight, 
  ChevronLeft,
  HelpCircle,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  Clock,
  Shield,
  Award,
  CheckCircle2,
  Tv
} from 'lucide-react';

interface HomeSectionProps {
  onAdminClick: () => void;
}

export default function HomeSection({ onAdminClick }: HomeSectionProps) {
  const { user } = useFirebase();
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCommittee, setSelectedCommittee] = useState<Committee | null>(null);

  // Connection Gate Forms States
  const [selectedRole, setSelectedRole] = useState<'chair' | 'delegate'>('chair');
  const [chairEmailInput, setChairEmailInput] = useState('');
  const [chairPasswordInput, setChairPasswordInput] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [delegateCountry, setDelegateCountry] = useState('');
  const [delegatePasswordInput, setDelegatePasswordInput] = useState('');

  // States for Chair adding new delegation
  const [newCountryName, setNewCountryName] = useState('');
  const [newCountryMdp, setNewCountryMdp] = useState('');

  // Active Session states
  const [joinedRole, setJoinedRole] = useState<'chair' | 'delegate' | null>(null);
  const [joinedName, setJoinedName] = useState('');
  const [joinedCountry, setJoinedCountry] = useState('');
  const [projectorMode, setProjectorMode] = useState(false);

  // Local Timers (mainly driven by Chair, synced back on action)
  const [speakerTimer, setSpeakerTimer] = useState(60); // remaining speaker seconds
  const [speakerTimeTotal, setSpeakerTimeTotal] = useState(60); 
  const [speakerRunning, setSpeakerRunning] = useState(false);

  const [caucusTimer, setCaucusTimer] = useState(600); // 10 mins
  const [caucusTimeTotal, setCaucusTimeTotal] = useState(600);
  const [caucusRunning, setCaucusRunning] = useState(false);
  const [caucusTopic, setCaucusTopic] = useState('');
  const [caucusType, setCaucusType] = useState<'moderated' | 'unmoderated' | 'none'>('none');
  const [caucusSpeakerTime, setCaucusSpeakerTime] = useState(60);

  // Speakers List local input
  const [newSpeakerCountry, setNewSpeakerCountry] = useState('');

  // Interval References
  const speakerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const caucusIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Resolve custom Firestore DB for active session
  const activeSessionDb = getDbForCommittee(selectedCommittee);

  // Sync all committees in real-time
  useEffect(() => {
    // If user is actively joined/inside a debate session, suspend general lobby listener to conserve Firestore read quota
    if (joinedRole !== null) {
      return;
    }

    const path = 'committees';
    const q = query(collection(db, path));
    
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
          activeSpeakers: data.activeSpeakers || [],
          activeCaucus: data.activeCaucus || { type: 'none', topic: '', totalTime: 0, speakerTime: 0, timeLeft: 0, active: false },
          language: data.language || 'FR',
          chairEmail: data.chairEmail || '',
          chairPassword: data.chairPassword || '',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          useCustomFirebase: data.useCustomFirebase || false,
          firebaseApiKey: data.firebaseApiKey || '',
          firebaseAuthDomain: data.firebaseAuthDomain || '',
          firebaseProjectId: data.firebaseProjectId || '',
          firebaseStorageBucket: data.firebaseStorageBucket || '',
          firebaseMessagingSenderId: data.firebaseMessagingSenderId || '',
          firebaseAppId: data.firebaseAppId || '',
          firebaseDatabaseId: data.firebaseDatabaseId || ''
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
  }, [joinedRole]); // Re-evaluate when entering/exiting sessions to start/stop the lobby listener!

  // Keep selected committee synced when list updates
  useEffect(() => {
    if (selectedCommittee) {
      const updatedSelected = committees.find(c => c.id === selectedCommittee.id);
      if (updatedSelected && updatedSelected !== selectedCommittee) {
        setSelectedCommittee(updatedSelected);
      }
    }
  }, [committees]);

  // Live sync the selected committee's actual document from its active database (which is custom if useCustomFirebase is enabled)
  useEffect(() => {
    if (!selectedCommittee) return;

    const activeDocRef = doc(activeSessionDb, 'committees', selectedCommittee.id);
    
    const unsubscribe = onSnapshot(activeDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSelectedCommittee(prev => {
          if (!prev || prev.id !== docSnap.id) return prev;
          return {
            ...prev,
            name: data.name || prev.name,
            description: data.description !== undefined ? data.description : prev.description,
            delegations: data.delegations || prev.delegations || [],
            activeSpeakers: data.activeSpeakers || prev.activeSpeakers || [],
            activeCaucus: data.activeCaucus || prev.activeCaucus,
            language: data.language || prev.language,
            chairEmail: data.chairEmail || prev.chairEmail,
            chairPassword: data.chairPassword || prev.chairPassword,
            createdAt: data.createdAt || prev.createdAt,
            updatedAt: data.updatedAt || prev.updatedAt,
            useCustomFirebase: data.useCustomFirebase !== undefined ? data.useCustomFirebase : prev.useCustomFirebase,
            firebaseApiKey: data.firebaseApiKey !== undefined ? data.firebaseApiKey : prev.firebaseApiKey,
            firebaseAuthDomain: data.firebaseAuthDomain !== undefined ? data.firebaseAuthDomain : prev.firebaseAuthDomain,
            firebaseProjectId: data.firebaseProjectId !== undefined ? data.firebaseProjectId : prev.firebaseProjectId,
            firebaseStorageBucket: data.firebaseStorageBucket !== undefined ? data.firebaseStorageBucket : prev.firebaseStorageBucket,
            firebaseMessagingSenderId: data.firebaseMessagingSenderId !== undefined ? data.firebaseMessagingSenderId : prev.firebaseMessagingSenderId,
            firebaseAppId: data.firebaseAppId !== undefined ? data.firebaseAppId : prev.firebaseAppId,
            firebaseDatabaseId: data.firebaseDatabaseId !== undefined ? data.firebaseDatabaseId : prev.firebaseDatabaseId,
          } as Committee;
        });
      }
    }, (error) => {
      console.warn("Error listening to selected committee on active DB:", error);
    });

    return () => unsubscribe();
  }, [selectedCommittee?.id, activeSessionDb]);

  // Synchronize local timers with Firebase data for Delegate View
  useEffect(() => {
    if (joinedRole === 'delegate' && selectedCommittee) {
      // Sync caucus status
      const fireCaucus = selectedCommittee.activeCaucus;
      if (fireCaucus) {
        setCaucusType(fireCaucus.type);
        setCaucusTopic(fireCaucus.topic);
        setCaucusTimeTotal(fireCaucus.totalTime);
        setCaucusSpeakerTime(fireCaucus.speakerTime);
        setCaucusTimer(fireCaucus.timeLeft);
        setCaucusRunning(fireCaucus.active);
      }

      // Sync active speakers
      const speakers = selectedCommittee.activeSpeakers || [];
      if (speakers.length > 0) {
        const activeSpk = speakers[0];
        setSpeakerTimeTotal(activeSpk.durationTotal);
        setSpeakerTimer(activeSpk.durationTotal - activeSpk.durationUsed);
        setSpeakerRunning(activeSpk.durationUsed < activeSpk.durationTotal && (selectedCommittee as any).speakerRunning);
      } else {
        setSpeakerRunning(false);
        setSpeakerTimer(0);
      }
    }
  }, [selectedCommittee, joinedRole]);

  // Speakers Countdown Clock (Chair only)
  useEffect(() => {
    if (joinedRole === 'chair' && speakerRunning) {
      speakerIntervalRef.current = setInterval(() => {
        setSpeakerTimer(prev => {
          if (prev <= 1) {
            setSpeakerRunning(false);
            if (speakerIntervalRef.current) clearInterval(speakerIntervalRef.current);
            // Handle timer completion - sync state to Firestore
            handleSyncSpeakerTime(speakerTimeTotal);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (speakerIntervalRef.current) clearInterval(speakerIntervalRef.current);
    }

    return () => {
      if (speakerIntervalRef.current) clearInterval(speakerIntervalRef.current);
    };
  }, [speakerRunning, joinedRole, speakerTimeTotal]);

  // Caucus Countdown Clock (Chair only)
  useEffect(() => {
    if (joinedRole === 'chair' && caucusRunning) {
      caucusIntervalRef.current = setInterval(() => {
        setCaucusTimer(prev => {
          if (prev <= 1) {
            setCaucusRunning(false);
            if (caucusIntervalRef.current) clearInterval(caucusIntervalRef.current);
            handleSyncCaucusTime(0, false);
            return 0;
          }
          // Periodically sync every 10 seconds to avoid firestore congestion while showing progress
          if (prev % 10 === 0) {
            handleSyncCaucusTime(prev - 1, true);
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (caucusIntervalRef.current) clearInterval(caucusIntervalRef.current);
    }

    return () => {
      if (caucusIntervalRef.current) clearInterval(caucusIntervalRef.current);
    };
  }, [caucusRunning, joinedRole]);

  // Permissions helper to check if current user can write updates
  const canModifyFirestore = (): boolean => {
    if (!selectedCommittee) return false;
    return (user !== null && user.uid === selectedCommittee.creatorId) || joinedRole === 'chair';
  };

  // Update speakers status in Firestore
  const handleSyncSpeakerTime = async (timeLeft: number) => {
    if (!selectedCommittee || !canModifyFirestore()) return;
    try {
      const currentQueue = [...(selectedCommittee.activeSpeakers || [])];
      if (currentQueue.length > 0) {
        currentQueue[0] = {
          ...currentQueue[0],
          durationUsed: currentQueue[0].durationTotal - timeLeft
        };
        await updateDoc(doc(activeSessionDb, 'committees', selectedCommittee.id), {
          activeSpeakers: currentQueue,
          speakerRunning: speakerRunning
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Update Caucus status in Firestore
  const handleSyncCaucusTime = async (timeLeft: number, active: boolean) => {
    if (!selectedCommittee || !canModifyFirestore()) return;
    try {
      await updateDoc(doc(activeSessionDb, 'committees', selectedCommittee.id), {
        activeCaucus: {
          type: caucusType,
          topic: caucusTopic,
          totalTime: caucusTimeTotal,
          speakerTime: caucusSpeakerTime,
          timeLeft: timeLeft,
          active: active
        }
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Filter committees by search input
  const filteredCommittees = committees.filter(com => 
    com.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    com.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Forms submit logic
  const handleJoinAsChair = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCommittee) return;
    setJoinError(null);

    const isCreator = user && user.uid === selectedCommittee.creatorId;
    const correctEmail = selectedCommittee.chairEmail || '';
    const correctPassword = selectedCommittee.chairPassword || '';

    const inputEmailMatch = chairEmailInput.trim().toLowerCase() === correctEmail.toLowerCase();
    const inputPasswordMatch = chairPasswordInput.trim() === correctPassword;

    if (isCreator || (inputEmailMatch && inputPasswordMatch)) {
      setJoinedRole('chair');
      setJoinedName('Présidence de séance');
      // Set default standard values from selected committee if present
      setSpeakerTimer(65);
      setSpeakerTimeTotal(65);
      setNewSpeakerCountry('');
    } else {
      setJoinError("Email ou mot de passe de présidence incorrect.");
    }
  };

  const handleJoinAsDelegate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCommittee || !delegateCountry) return;
    setJoinError(null);

    const del = selectedCommittee.delegations?.find(
      d => d.country.toLowerCase() === delegateCountry.toLowerCase()
    );

    if (!del) {
      setJoinError("Cette délégation n'existe pas.");
      return;
    }

    const correctPassword = del.password || '';
    if (correctPassword && delegatePasswordInput !== correctPassword) {
      setJoinError("Mot de passe incorrect pour cette délégation.");
      return;
    }

    setJoinedRole('delegate');
    setJoinedName(delegateCountry);
    setJoinedCountry(delegateCountry);
  };

  // Interactive controls for Chair Session
  const toggleSpeakerTimer = () => {
    const nextState = !speakerRunning;
    setSpeakerRunning(nextState);
    // Sync status to Firestore
    if (selectedCommittee && canModifyFirestore()) {
      updateDoc(doc(activeSessionDb, 'committees', selectedCommittee.id), {
        speakerRunning: nextState
      }).catch(err => console.error(err));
    }
  };

  const resetSpeakerTimer = () => {
    setSpeakerRunning(false);
    setSpeakerTimer(speakerTimeTotal);
    handleSyncSpeakerTime(speakerTimeTotal);
  };

  const handleAddSpeaker = async (countryName: string) => {
    if (!selectedCommittee || !countryName) return;
    
    // Check if country exists or duplication logic can be ignored to let multiple entries
    const newEntry = {
      id: Math.random().toString(36).substr(2, 9),
      country: countryName,
      durationTotal: speakerTimeTotal,
      durationUsed: 0
    };

    const currentSpeakers = [...(selectedCommittee.activeSpeakers || []), newEntry];
    
    // Sync directly to firesbase if owner, otherwise client local
    if (canModifyFirestore()) {
      try {
        await updateDoc(doc(activeSessionDb, 'committees', selectedCommittee.id), {
          activeSpeakers: currentSpeakers
        });
      } catch (err) {
        console.error(err);
      }
    } else {
      // Offline fallback / local preview
      setSelectedCommittee({
        ...selectedCommittee,
        activeSpeakers: currentSpeakers
      });
    }
    setNewSpeakerCountry('');
  };

  const handlePopSpeaker = async () => {
    if (!selectedCommittee) return;
    const currentQueue = [...(selectedCommittee.activeSpeakers || [])];
    if (currentQueue.length > 0) {
      currentQueue.shift(); // remove active speaker
    }
    
    setSpeakerRunning(false);
    // Reset timer to standard length
    setSpeakerTimer(speakerTimeTotal);

    if (canModifyFirestore()) {
      try {
        await updateDoc(doc(activeSessionDb, 'committees', selectedCommittee.id), {
          activeSpeakers: currentQueue,
          speakerRunning: false
        });
      } catch (err) {
        console.error(err);
      }
    } else {
      setSelectedCommittee({
        ...selectedCommittee,
        activeSpeakers: currentQueue
      });
    }
  };

  const handleUpdatePresence = async (countryName: string, status: 'absent' | 'present' | 'voting') => {
    if (!selectedCommittee) return;
    
    const updatedDelegations = selectedCommittee.delegations.map(del => {
      if (del.country === countryName) {
        return {
          ...del,
          present: status !== 'absent',
          voting: status === 'voting'
        };
      }
      return del;
    });

    if (canModifyFirestore()) {
      try {
        await updateDoc(doc(activeSessionDb, 'committees', selectedCommittee.id), {
          delegations: updatedDelegations
        });
      } catch (err) {
        console.error(err);
      }
    } else {
      setSelectedCommittee({
        ...selectedCommittee,
        delegations: updatedDelegations
      });
    }
  };

  // Chair capability to add manual delegations live
  const handleAddDelegation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCommittee || !newCountryName.trim()) return;

    const trimmedCountry = newCountryName.trim();
    const passwordVal = newCountryMdp.trim();

    if (selectedCommittee.delegations?.some(d => d.country.toLowerCase() === trimmedCountry.toLowerCase())) {
      alert("Ce pays figure déjà dans la liste.");
      return;
    }

    const newDel: Delegation = {
      country: trimmedCountry,
      present: false,
      voting: false,
      password: passwordVal
    };

    const updatedDelegations = [...(selectedCommittee.delegations || []), newDel];

    if (canModifyFirestore()) {
      try {
        await updateDoc(doc(activeSessionDb, 'committees', selectedCommittee.id), {
          delegations: updatedDelegations
        });
        setNewCountryName('');
        setNewCountryMdp('');
      } catch (err) {
        console.error(err);
      }
    } else {
      setSelectedCommittee({
        ...selectedCommittee,
        delegations: updatedDelegations
      });
      setNewCountryName('');
      setNewCountryMdp('');
    }
  };

  // Chair capability to remove manual delegations live
  const handleDeleteDelegation = async (countryName: string) => {
    if (!selectedCommittee) return;

    const updatedDelegations = selectedCommittee.delegations.filter(d => d.country !== countryName);

    if (canModifyFirestore()) {
      try {
        await updateDoc(doc(activeSessionDb, 'committees', selectedCommittee.id), {
          delegations: updatedDelegations
        });
      } catch (err) {
        console.error(err);
      }
    } else {
      setSelectedCommittee({
        ...selectedCommittee,
        delegations: updatedDelegations
      });
    }
  };

  // Caucus procedures triggers
  const triggerCaucusChange = async (type: 'moderated' | 'unmoderated' | 'none') => {
    setCaucusType(type);
    setCaucusRunning(type !== 'none');
    
    let calcDuration = caucusTimeTotal;
    if (type === 'none') {
      calcDuration = 0;
    }

    if (canModifyFirestore() && selectedCommittee) {
      try {
        await updateDoc(doc(activeSessionDb, 'committees', selectedCommittee.id), {
          activeCaucus: {
            type,
            topic: caucusTopic,
            totalTime: calcDuration,
            speakerTime: caucusSpeakerTime,
            timeLeft: calcDuration,
            active: type !== 'none'
          }
        });
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Ask to speak for official delegates (sends an indicator or appends them)
  const handleRaisePlacard = async () => {
    if (!selectedCommittee || !joinedCountry) return;
    // Append actual delegation to the speakers list queue directly as a requested call
    await handleAddSpeaker(joinedCountry);
    alert(`Votre pancarte (${joinedCountry}) a été levée ! Vous avez été ajouté à la liste des orateurs.`);
  };

  const handleExitSession = () => {
    setJoinedRole(null);
    setJoinedName('');
    setJoinedCountry('');
    setSpeakerRunning(false);
    setCaucusRunning(false);
    setProjectorMode(false);
  };

  // Render format time
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper stats for panel
  const totalDelegates = selectedCommittee?.delegations?.length || 0;
  const presentDelegates = selectedCommittee?.delegations?.filter(d => d.present).length || 0;
  const votingDelegates = selectedCommittee?.delegations?.filter(d => d.voting).length || 0;

  // Render live debate session
  if (joinedRole && selectedCommittee) {
    return (
      <CommitteeSessionView
        committeeId={selectedCommittee.id}
        joinedRole={joinedRole}
        joinedCountry={joinedCountry}
        joinedName={joinedName}
        onExit={handleExitSession}
        committee={selectedCommittee}
      />
    );
  }

  // Else, render the minimalist general lobby view listing committees on the left and connection gate
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 text-neutral-900">
      {/* If no committee is selected - directory listing */}
      {!selectedCommittee ? (
        <div className="space-y-8 animate-fade-in">
          {/* Header */}
          <div className="border-b border-neutral-200 pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="font-sans text-2xl sm:text-3xl font-black tracking-tight text-neutral-900 flex items-center gap-2">
                <span>COMITÉS MUN ACTIFS</span>
                <span className="text-[10px] border border-fuchsia-200 bg-fuchsia-100 text-fuchsia-700 rounded-full font-black px-2.5 py-0.5 tracking-wider uppercase animate-pulse">
                  Live
                </span>
              </h1>
              <p className="mt-1 text-xs text-neutral-500 font-bold uppercase tracking-widest">
                Sélectionnez un organe pour accéder à la salle de débat ou configurer les présidences.
              </p>
            </div>
          </div>

          {/* Search bar centered */}
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="RECHERCHER UN COMITÉ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl border border-neutral-200 bg-white shadow-sm px-4 py-3.5 pl-10 pr-4 text-xs font-bold uppercase tracking-wider text-neutral-900 placeholder-neutral-400 outline-none transition-all focus:border-neutral-450"
            />
          </div>

          {/* Committees list */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[#999999]">Séances Disponibles</h3>

            {loading ? (
              <div className="flex h-40 items-center justify-center rounded-[28px] border border-neutral-200 bg-white shadow-sm">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-950 border-t-transparent" />
              </div>
            ) : filteredCommittees.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-neutral-200 bg-white p-12 text-center max-w-xl mx-auto shadow-sm">
                <Info className="mx-auto h-7 w-7 text-neutral-400" />
                <p className="mt-4 text-sm font-black uppercase tracking-wide text-neutral-800">Aucun comité correspondant</p>
                <p className="mt-1.5 text-xs text-[#999999] font-medium leading-relaxed">Aucune instance n'est pour l'instant configurée. Connectez-vous avec vos identifiants organisateur pour créer un comité.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredCommittees.map((com) => (
                  <button
                    key={com.id}
                    onClick={() => {
                      setSelectedCommittee(com);
                      setDelegateCountry('');
                      setJoinError(null);
                    }}
                    className="group rounded-[28px] border border-neutral-200 p-6 text-left transition-all bg-white hover:bg-neutral-50 hover:scale-[1.01] duration-200 cursor-pointer flex flex-col justify-between min-h-[190px] shadow-sm"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-[9px] border border-neutral-200 px-2.5 py-0.5 font-bold uppercase tracking-wider text-neutral-600 bg-neutral-50 rounded-full">
                          {com.language === 'EN' ? 'English (EN)' : 'Français (FR)'}
                        </span>
                        <ChevronRight className="h-4 w-4 text-neutral-400 transition-transform group-hover:translate-x-1" />
                      </div>
                      <h4 className="text-sm font-black uppercase tracking-widest text-neutral-900 line-clamp-1">{com.name}</h4>
                      <p className="mt-2 text-xs text-neutral-500 line-clamp-2 leading-relaxed font-semibold">{com.description || "Aucun thème principal"}</p>
                    </div>
                    
                    <div className="border-t border-neutral-100 pt-3 mt-4 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-neutral-400">
                      <span className="flex items-center space-x-1.5 text-neutral-550">
                        <Users className="h-4 w-4" />
                        <span>{com.delegations?.length || 0} DELEGATIONS</span>
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* If a committee is selected - Connection view only */
        <div className="max-w-xl mx-auto space-y-6 animate-fade-in py-4">
          {/* Back button */}
          <button
            onClick={() => setSelectedCommittee(null)}
            className="inline-flex items-center space-x-2 text-[11px] font-black uppercase tracking-wider text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer"
          >
            <span>&larr; Retour aux comités</span>
          </button>

          <div className="rounded-[28px] border border-neutral-200 bg-white p-6 sm:p-8 space-y-6 shadow-md animate-fade-in">
            <div>
              <div className="inline-flex items-center space-x-1.5 rounded-full border border-neutral-200 bg-neutral-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-neutral-800 shadow-sm">
                <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
                <span>SALLE DE DÉBAT MUN</span>
              </div>
              <h2 className="mt-4 font-sans text-xl sm:text-2xl font-black tracking-tight text-neutral-900 uppercase">
                {selectedCommittee.name}
              </h2>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[10px] border border-neutral-200 px-2 py-0.5 font-bold uppercase text-neutral-600 bg-neutral-50 rounded-full">
                  {selectedCommittee.language === 'EN' ? 'English (EN)' : 'Français (FR)'}
                </span>
                <span className="text-[10px] text-neutral-400 font-bold uppercase">
                  {selectedCommittee.delegations?.length || 0} PAYS INSCRITS
                </span>
              </div>
              <p className="mt-3.5 text-xs text-neutral-500 leading-relaxed font-semibold">
                {selectedCommittee.description || "La thématique de ce comité n'a pas été renseignée par l'administrateur."}
              </p>
            </div>

            {/* Connection Gate */}
            <div className="border-t border-neutral-150 pt-6 space-y-5">
              <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400 flex items-center gap-1.5">
                <Globe className="h-4 w-4 text-neutral-550" />
                <span>REJOINDRE LA SÉANCE LIVE</span>
              </h3>

              {/* Tab switcher */}
              <div className="flex bg-neutral-100 p-1 rounded-2xl border border-neutral-200">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole('chair');
                    setJoinError(null);
                  }}
                  className={`flex-1 py-1.5 text-[11px] font-black uppercase tracking-wider transition-all rounded-xl cursor-pointer ${
                    selectedRole === 'chair' ? 'bg-neutral-950 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  Présidence
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole('delegate');
                    setJoinError(null);
                  }}
                  className={`flex-1 py-1.5 text-[11px] font-black uppercase tracking-wider transition-all rounded-xl cursor-pointer ${
                    selectedRole === 'delegate' ? 'bg-neutral-950 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  Délégué officiel
                </button>
              </div>

              {joinError && (
                <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-xs text-red-800 leading-relaxed uppercase font-black tracking-wide">
                  {joinError}
                </div>
              )}

              {selectedRole === 'chair' ? (
                <form onSubmit={handleJoinAsChair} className="space-y-4 pt-1">
                  <div>
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 pl-1">
                      Email de la présidence
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="presidence.unsc@mun.org"
                      value={chairEmailInput}
                      onChange={(e) => setChairEmailInput(e.target.value)}
                      className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs font-semibold text-neutral-900 placeholder-neutral-450 outline-none focus:border-neutral-400 focus:bg-white transition-all shadow-inner"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 pl-1">
                      Mot de passe de la présidence
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={chairPasswordInput}
                      onChange={(e) => setChairPasswordInput(e.target.value)}
                      className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs font-bold text-neutral-900 placeholder-neutral-450 outline-none focus:border-neutral-400 focus:bg-white transition-all shadow-inner"
                    />
                  </div>
                  
                  <button
                    type="submit"
                    className="w-full rounded-2xl bg-neutral-950 py-3.5 text-xs font-black uppercase tracking-widest text-white hover:bg-neutral-900 transition-all cursor-pointer active:scale-[0.98] duration-150 shadow-md"
                  >
                    DÉMARRER LA MODÉRATION LIVE
                  </button>
                </form>
              ) : (
                <form onSubmit={handleJoinAsDelegate} className="space-y-4 pt-1">
                  <div>
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 pl-1">
                      Délégation Diplomatique à incarner
                    </label>
                    {selectedCommittee.delegations?.length === 0 ? (
                      <div className="text-xs text-red-800 font-bold uppercase p-4 border border-dashed border-red-200 rounded-2xl bg-red-50">
                        Aucun pays inscrit dans ce comité. Veuillez indiquer à la présidence d'ajouter des délégations depuis son panel.
                      </div>
                    ) : (
                      <select
                        required
                        value={delegateCountry}
                        onChange={(e) => setDelegateCountry(e.target.value)}
                        className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-900 outline-none focus:border-neutral-400 focus:bg-white transition-all cursor-pointer"
                      >
                        <option value="">Choisissez votre pays diplomate...</option>
                        {selectedCommittee.delegations?.map((del) => (
                          <option key={del.country} value={del.country} className="bg-white text-neutral-900">{del.country}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 pl-1">
                      Mot de passe de la délégation (si requis)
                    </label>
                    <input
                      type="password"
                      placeholder="Saisissez le mot de passe de votre pays"
                      value={delegatePasswordInput}
                      onChange={(e) => setDelegatePasswordInput(e.target.value)}
                      className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs font-bold text-neutral-900 placeholder-neutral-450 outline-none focus:border-neutral-400 focus:bg-white transition-all shadow-inner"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!delegateCountry}
                    className="w-full rounded-2xl bg-neutral-950 py-3.5 text-xs font-black uppercase tracking-widest text-white hover:bg-neutral-900 transition-all disabled:opacity-40 cursor-pointer active:scale-[0.98] duration-150 shadow-md"
                  >
                    REJOINDRE LA SÉANCE LIVE
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
