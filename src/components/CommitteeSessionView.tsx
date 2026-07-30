/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { db as masterDb, auth, getDbForCommittee } from '../lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc, 
  addDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  limit, 
  getDocs,
  where,
  setDoc,
  getDocFromServer
} from 'firebase/firestore';
import { Committee, Delegation } from '../types';
import { 
  Users, 
  Clock, 
  MessageSquare, 
  AlertTriangle, 
  FileText, 
  MessageCircle, 
  Send, 
  Trash2, 
  Plus, 
  Volume2, 
  VolumeX, 
  Check, 
  X, 
  Play, 
  Pause, 
  RotateCcw, 
  Eye, 
  Lock, 
  Globe, 
  UserX,
  Radio,
  FileCheck,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Info
} from 'lucide-react';

interface CommitteeSessionViewProps {
  committeeId: string;
  joinedRole: 'chair' | 'delegate';
  joinedCountry: string;
  joinedName: string;
  onExit: () => void;
  committee?: Committee;
}

// Sub-interfaces for Firestore subcollections
interface LiveMessage {
  id: string;
  sender: string;
  text: string;
  type: 'message' | 'privilege';
  target: string; // 'all' or simple country name
  createdAt: number;
}

interface LiveGossip {
  id: string;
  text: string;
  createdAt: number;
}

interface LiveResolution {
  id: string;
  author: string;
  title: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
}

interface GradeRowProps {
  country: string;
  grades: any;
  onUpdateGrade: (country: string, col: string, val: string) => void;
  onUpdateComment: (country: string, text: string) => void;
  calculateAverage: (countryGrades: any) => string;
  language?: string;
}

const GradeRow: React.FC<GradeRowProps> = ({
  country,
  grades,
  onUpdateGrade,
  onUpdateComment,
  calculateAverage,
  language
}) => {
  const [localG1, setLocalG1] = useState(grades?.g1 || '');
  const [localG2, setLocalG2] = useState(grades?.g2 || '');
  const [localG3, setLocalG3] = useState(grades?.g3 || '');
  const [localG4, setLocalG4] = useState(grades?.g4 || '');
  const [localComment, setLocalComment] = useState(grades?.text || '');

  useEffect(() => {
    setLocalG1(grades?.g1 || '');
  }, [grades?.g1]);

  useEffect(() => {
    setLocalG2(grades?.g2 || '');
  }, [grades?.g2]);

  useEffect(() => {
    setLocalG3(grades?.g3 || '');
  }, [grades?.g3]);

  useEffect(() => {
    setLocalG4(grades?.g4 || '');
  }, [grades?.g4]);

  useEffect(() => {
    setLocalComment(grades?.text || '');
  }, [grades?.text]);

  const handleBlurGrade = (col: string, localVal: string) => {
    onUpdateGrade(country, col, localVal);
  };

  const handleBlurComment = () => {
    onUpdateComment(country, localComment);
  };

  return (
    <tr className="border-b border-neutral-100 hover:bg-neutral-50/70 transition-colors">
      <td className="p-3.5 pl-4 text-xs font-black text-neutral-900 uppercase tracking-wide">
        {country}
      </td>
      <td className="p-2">
        <input
          type="number"
          min="0"
          max="20"
          step="0.5"
          placeholder="-"
          value={localG1}
          onChange={(e) => setLocalG1(e.target.value)}
          onBlur={() => handleBlurGrade('g1', localG1)}
          className="w-12 text-center bg-white border border-neutral-200 rounded-lg p-1.5 text-xs text-neutral-800 focus:border-neutral-500 font-bold outline-none"
        />
      </td>
      <td className="p-2">
        <input
          type="number"
          min="0"
          max="20"
          step="0.5"
          placeholder="-"
          value={localG2}
          onChange={(e) => setLocalG2(e.target.value)}
          onBlur={() => handleBlurGrade('g2', localG2)}
          className="w-12 text-center bg-white border border-neutral-200 rounded-lg p-1.5 text-xs text-neutral-800 focus:border-neutral-500 font-bold outline-none"
        />
      </td>
      <td className="p-2">
        <input
          type="number"
          min="0"
          max="20"
          step="0.5"
          placeholder="-"
          value={localG3}
          onChange={(e) => setLocalG3(e.target.value)}
          onBlur={() => handleBlurGrade('g3', localG3)}
          className="w-12 text-center bg-white border border-neutral-200 rounded-lg p-1.5 text-xs text-neutral-800 focus:border-neutral-500 font-bold outline-none"
        />
      </td>
      <td className="p-2">
        <input
          type="number"
          min="0"
          max="20"
          step="0.5"
          placeholder="-"
          value={localG4}
          onChange={(e) => setLocalG4(e.target.value)}
          onBlur={() => handleBlurGrade('g4', localG4)}
          className="w-12 text-center bg-white border border-neutral-200 rounded-lg p-1.5 text-xs text-neutral-800 focus:border-neutral-500 font-bold outline-none"
        />
      </td>
      <td className="p-2">
        <span className="font-mono text-xs font-black bg-neutral-100 text-neutral-850 border border-neutral-200/80 px-2 py-1.5 rounded-lg shadow-sm min-w-[38px] inline-block text-center select-none">
          {calculateAverage(grades)}
        </span>
      </td>
      <td className="p-2 pr-4">
        <input
          type="text"
          placeholder={language === 'EN' ? "Comment or observation..." : "Commentaire ou observation..."}
          value={localComment}
          onChange={(e) => setLocalComment(e.target.value)}
          onBlur={handleBlurComment}
          className="w-full bg-white border border-neutral-200 rounded-lg p-1.5 text-xs text-neutral-800 focus:border-neutral-500 font-medium outline-none"
        />
      </td>
    </tr>
  );
};

export default function CommitteeSessionView({ 
  committeeId, 
  joinedRole, 
  joinedCountry, 
  joinedName, 
  onExit,
  committee: initialCommittee
}: CommitteeSessionViewProps) {
  
  const [committee, setCommittee] = useState<Committee | null>(initialCommittee || null);
  const [activeDb, setActiveDb] = useState(getDbForCommittee(initialCommittee));
  const db = activeDb; // Dynamically shadow and route all internal query/update handlers to the active database
  const [customDbPermissionError, setCustomDbPermissionError] = useState(false);
  
  // Real-time subcollection state arrays
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [gossips, setGossips] = useState<LiveGossip[]>([]);
  const [resolutions, setResolutions] = useState<LiveResolution[]>([]);

  // Local interactive UI state
  const [activeTabSide, setActiveTabSide] = useState<'messages' | 'gossip' | 'resolutions'>('messages');
  const [activeTabMain, setActiveTabMain] = useState<'session' | 'members' | 'grades'>('session');

  // Input states — Messages / Privilege
  const [msgInput, setMsgInput] = useState('');
  const [msgTypeInput, setMsgTypeInput] = useState<'message' | 'privilege'>('message');
  const [msgTargetInput, setMsgTargetInput] = useState('all');

  // Input states — Gossip
  const [gossipInput, setGossipInput] = useState('');

  // Input states — Resolution Compose
  const [resTitleInput, setResTitleInput] = useState('');
  const [resContentInput, setResContentInput] = useState('');
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [googleUser, setGoogleUser] = useState<any | null>(null);
  const [recentDocs, setRecentDocs] = useState<any[]>([]);
  const [docLoading, setDocLoading] = useState(false);
  const [selectedDocUrl, setSelectedDocUrl] = useState<string>('');

  // Input states — New Delegation
  const [newCountry, setNewCountry] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPresence, setNewPresence] = useState<'présence' | 'absence' | 'votant'>('présence');

  // Broadcast Popups Creation Form state (Chair)
  const [specialActionsOpen, setSpecialActionsOpen] = useState(false);
  const [fluxControlsOpen, setFluxControlsOpen] = useState(false);
  
  const [broadcastType, setBroadcastType] = useState<'message' | 'vote' | 'crisis'>('message');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastContent, setBroadcastContent] = useState('');

  // Session timer creation form (Chair)
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionProposer, setSessionProposer] = useState('');
  const [sessionDurationMin, setSessionDurationMin] = useState(10); // 10 mins default
  const [sessionSpeakerSec, setSessionSpeakerSec] = useState(60); // 60s default
  const [sessionsHistory, setSessionsHistory] = useState<any[]>([]);
  const [confirmDeleteSessionId, setConfirmDeleteSessionId] = useState<string | null>(null);
  const [confirmDeleteDelegationCountry, setConfirmDeleteDelegationCountry] = useState<string | null>(null);
  const [adjustTimerMinutes, setAdjustTimerMinutes] = useState<number>(1);

  // Sound play tracker
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Filter messages for Chair / Delegates
  const [msgFilterType, setMsgFilterType] = useState<'all' | 'message' | 'privilege'>('all');

  // Timer Ticking state
  const [sessionTimeLeft, setSessionTimeLeft] = useState(0);
  const [speakerTimeLeft, setSpeakerTimeLeft] = useState(0);

  // 1. Listen to the MASTER database permanently to retrieve latest dynamic project configuration changes
  useEffect(() => {
    const unsub = onSnapshot(doc(masterDb, 'committees', committeeId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const masterData = { id: docSnap.id, ...data } as Committee;
        
        // If we don't have initial committee state, populate from master DB
        if (!committee) {
          setCommittee(masterData);
        }

        // Keep activeDb in sync with master DB config (e.g. if custom firebase got enabled/configured)
        const resolvedDb = getDbForCommittee(masterData);
        setActiveDb(resolvedDb);
      }
    }, (error) => {
      console.warn("onSnapshot masterDb committee error:", error);
    });
    return () => unsub();
  }, [committeeId]);

  // 2. Mirror/ensure committee document exists on the custom database
  useEffect(() => {
    if (activeDb === masterDb) return; // on master DB, no need to mirror
    if (!committee) return;

    // Fetch the document on the custom database to check if it exists
    const docRef = doc(activeDb, 'committees', committeeId);
    getDocFromServer(docRef).then((docSnap) => {
      if (!docSnap.exists()) {
        // Copy the master committee document structure to the custom database
        const clone = { ...committee };
        // Remove undefined fields to prevent firestore errors
        Object.keys(clone).forEach(key => (clone as any)[key] === undefined && delete (clone as any)[key]);
        setDoc(docRef, clone).catch(err => {
          console.error("Error backing up committee to custom DB: ", err);
          if (activeDb !== masterDb && (err?.code === 'permission-denied' || err?.message?.includes('permission'))) {
            setCustomDbPermissionError(true);
          }
        });
      }
    }).catch(err => {
      console.warn("Could not check/create committee document on custom DB: ", err);
      if (activeDb !== masterDb && (err?.code === 'permission-denied' || err?.message?.includes('permission'))) {
        setCustomDbPermissionError(true);
      }
    });
  }, [activeDb, committeeId, committee]);

  // 3. Listen to main committee document on active DB for real-time session state sync
  useEffect(() => {
    const unsub = onSnapshot(doc(activeDb, 'committees', committeeId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCommittee({
          id: docSnap.id,
          name: data.name,
          description: data.description || '',
          creatorId: data.creatorId,
          delegations: data.delegations || [],
          activeSpeakers: data.activeSpeakers || [],
          activeCaucus: data.activeCaucus || undefined,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          language: data.language || 'FR',
          chairEmail: data.chairEmail || '',
          chairPassword: data.chairPassword || '',
          // Extended fields
          suspendedDelegations: data.suspendedDelegations || [],
          sessionSuspended: !!data.sessionSuspended,
          activeBroadcast: data.activeBroadcast || null,
          activeSession: data.activeSession || null,
          projectedGossip: data.projectedGossip || null,
          projectedResolution: data.projectedResolution || null,
          gossipEnabled: data.gossipEnabled !== false,
          resolutionsEnabled: data.resolutionsEnabled !== false,
          grades: data.grades || {},
          useCustomFirebase: data.useCustomFirebase || false,
          firebaseApiKey: data.firebaseApiKey || '',
          firebaseAuthDomain: data.firebaseAuthDomain || '',
          firebaseProjectId: data.firebaseProjectId || '',
          firebaseStorageBucket: data.firebaseStorageBucket || '',
          firebaseMessagingSenderId: data.firebaseMessagingSenderId || '',
          firebaseAppId: data.firebaseAppId || '',
          firebaseDatabaseId: data.firebaseDatabaseId || ''
        } as any);
      }
    }, (error) => {
      console.warn("onSnapshot activeDb committee error:", error);
      if (activeDb !== masterDb && (error.code === 'permission-denied' || error.message?.includes('permission'))) {
        setCustomDbPermissionError(true);
      }
    });
    return () => unsub();
  }, [committeeId, activeDb]);

  // Listen to messages subcollection (limited to 100 most recent to prevent massive read spikes)
  useEffect(() => {
    const qSnap = query(
      collection(activeDb, 'committees', committeeId, 'messages'), 
      orderBy('createdAt', 'desc'),
      limit(100)
    );
    const unsub = onSnapshot(qSnap, (snapshot) => {
      const list: LiveMessage[] = [];
      snapshot.forEach((d) => {
        const item = d.data();
        list.push({ id: d.id, ...item } as LiveMessage);
      });
      setMessages(list);
    }, (error) => {
      console.warn("onSnapshot activeDb messages error:", error);
      if (activeDb !== masterDb && (error.code === 'permission-denied' || error.message?.includes('permission'))) {
        setCustomDbPermissionError(true);
      }
    });
    return () => unsub();
  }, [committeeId, activeDb]);

  // Listen to gossip subcollection (limited to 50 most recent)
  useEffect(() => {
    const qSnap = query(
      collection(activeDb, 'committees', committeeId, 'gossip'), 
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const unsub = onSnapshot(qSnap, (snapshot) => {
      const list: LiveGossip[] = [];
      snapshot.forEach((d) => {
        const item = d.data();
        list.push({ id: d.id, ...item } as LiveGossip);
      });
      setGossips(list);
    }, (error) => {
      console.warn("onSnapshot activeDb gossip error:", error);
      if (activeDb !== masterDb && (error.code === 'permission-denied' || error.message?.includes('permission'))) {
        setCustomDbPermissionError(true);
      }
    });
    return () => unsub();
  }, [committeeId, activeDb]);

  // Listen to resolutions subcollection (limited to 30 most recent)
  useEffect(() => {
    const qSnap = query(
      collection(activeDb, 'committees', committeeId, 'resolutions'), 
      orderBy('createdAt', 'desc'),
      limit(30)
    );
    const unsub = onSnapshot(qSnap, (snapshot) => {
      const list: LiveResolution[] = [];
      snapshot.forEach((d) => {
        const item = d.data();
        list.push({ id: d.id, ...item } as LiveResolution);
      });
      setResolutions(list);
    }, (error) => {
      console.warn("onSnapshot activeDb resolutions error:", error);
      if (activeDb !== masterDb && (error.code === 'permission-denied' || error.message?.includes('permission'))) {
        setCustomDbPermissionError(true);
      }
    });
    return () => unsub();
  }, [committeeId, activeDb]);

  // Listen to sessionsHistory subcollection (limited to 30 most recent)
  useEffect(() => {
    const qSnap = query(
      collection(activeDb, 'committees', committeeId, 'sessionsHistory'), 
      orderBy('createdAt', 'desc'),
      limit(30)
    );
    const unsub = onSnapshot(qSnap, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() });
      });
      setSessionsHistory(list);
    }, (error) => {
      console.warn("onSnapshot activeDb sessionsHistory error:", error);
      if (activeDb !== masterDb && (error.code === 'permission-denied' || error.message?.includes('permission'))) {
        setCustomDbPermissionError(true);
      }
    });
    return () => unsub();
  }, [committeeId, activeDb]);

  // Resolve default message target for chair (first delegation)
  useEffect(() => {
    if (joinedRole === 'chair' && msgTargetInput === 'all' && committee?.delegations?.length && committee.delegations.length > 0) {
      setMsgTargetInput(committee.delegations[0].country);
    }
  }, [committee?.delegations, msgTargetInput, joinedRole]);

  // Sync Timer countdown dynamically based on time elapsed to prevent Firestore write spam
  useEffect(() => {
    if (!committee || !committee.activeSession) {
      setSessionTimeLeft(0);
      setSpeakerTimeLeft(0);
      return;
    }

    const { activeSession } = committee as any;
    if (!activeSession || !activeSession.active) {
      setSessionTimeLeft(0);
      setSpeakerTimeLeft(0);
      return;
    }

    const updateCalculatedTimes = () => {
      const durationLeft = activeSession.durationLeft || 0;
      const itemSpeakerTime = activeSession.itemSpeakerTime || 0;
      const currentSpeakerTimeUsed = activeSession.currentSpeakerTimeUsed || 0;
      
      const paused = !!activeSession.paused;
      const lastUpdated = activeSession.lastUpdated || Date.now();

      const speakerPaused = activeSession.speakerPaused !== undefined ? !!activeSession.speakerPaused : paused;
      const speakerLastUpdated = activeSession.speakerLastUpdated || lastUpdated;
      let speakerDurationLeft = activeSession.speakerDurationLeft;
      if (speakerDurationLeft === undefined) {
        speakerDurationLeft = Math.max(0, itemSpeakerTime - currentSpeakerTimeUsed);
      }

      // Calculate global time left
      if (paused) {
        setSessionTimeLeft(durationLeft);
      } else {
        const elapsedSec = Math.floor((Date.now() - lastUpdated) / 1000);
        const calculatedGlob = durationLeft - elapsedSec;
        setSessionTimeLeft(calculatedGlob > 0 ? calculatedGlob : 0);
      }

      // Calculate speaker time left
      if (speakerPaused) {
        setSpeakerTimeLeft(speakerDurationLeft);
      } else {
        const elapsedSec = Math.floor((Date.now() - speakerLastUpdated) / 1005); // slight correction factor for accuracy
        const calculatedSpk = speakerDurationLeft - elapsedSec;
        setSpeakerTimeLeft(calculatedSpk > 0 ? calculatedSpk : 0);
      }
    };

    updateCalculatedTimes();
    const intervalId = setInterval(updateCalculatedTimes, 1000);
    return () => clearInterval(intervalId);
  }, [committee]);

  // Watch for Crisis Alert to play modern electronic alert sound synthetically
  useEffect(() => {
    const br = committee?.activeBroadcast;
    if (br && br.type === 'crisis' && soundEnabled) {
      // Setup Web Audio synth beep
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          audioContextRef.current = ctx;

          // Beep pattern
          let count = 0;
          const playBeep = () => {
            if (count > 6) return;
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.connect(gainNode);
            gainNode.connect(ctx.destination);
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(320, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.35);
            gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
            osc.start();
            osc.stop(ctx.currentTime + 0.4);
            count++;
            setTimeout(playBeep, 800);
          };
          playBeep();
        }
      } catch (err) {
        console.error("Synthesizer sound error: ", err);
      }
    }
  }, [committee?.activeBroadcast?.type, soundEnabled]);

  if (!committee) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F2F2F7] text-neutral-900 p-5">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-950 border-t-transparent mb-4" />
        <span className="text-xs uppercase font-mono tracking-widest text-neutral-500 font-bold">Synchronisation avec le comité live...</span>
      </div>
    );
  }

  // Check individual suspension
  const isEn = committee?.language === 'EN';
  const isSuspendedIndividually = committee.suspendedDelegations?.includes(joinedCountry);
  const isGlobalSessionSuspended = committee.sessionSuspended;

  // Check if debate has started
  const isDebateStarted = !!committee.activeSession && (
    !!committee.activeSession.debateStarted ||
    !committee.activeSession.paused ||
    (typeof committee.activeSession.durationLeft === 'number' && typeof committee.activeSession.durationTotal === 'number' && committee.activeSession.durationLeft < committee.activeSession.durationTotal)
  );

  // Render Full Screen Suspension Screens if triggered
  if (isGlobalSessionSuspended && joinedRole === 'delegate') {
    return (
      <div className="fixed inset-0 bg-[#facc15] font-sans antialiased z-50 flex flex-col items-center justify-center text-center p-8 animate-fade-in select-none">
        <div className="max-w-xl space-y-6">
          <div className="w-16 h-1 bg-black/60 mx-auto mb-4 animate-pulse" />
          <h1 className="font-sans text-4xl sm:text-5xl font-extrabold tracking-tight text-neutral-950 leading-tight uppercase">
            {isEn ? "SESSION SUSPENDED" : "SUSPENSION DE SÉANCE"}
          </h1>
          <p className="font-sans text-xs sm:text-sm font-bold uppercase tracking-wide text-neutral-900 max-w-sm mx-auto leading-relaxed">
            {isEn 
              ? "The Bureau of the Chair has suspended the ongoing debate session. Please wait in formal silence." 
              : "Le Bureau de la Présidence a suspendu la session de débats en cours. Veuillez patienter dans le silence réglementaire."}
          </p>
          <div className="pt-8 flex items-center justify-center space-x-2.5">
            <span className="h-2 w-2 bg-black rounded-full animate-ping" />
            <span className="text-[10px] font-mono tracking-widest text-neutral-950 uppercase font-black">
              {isEn ? "SESSION SYNCHRONIZATION" : "SYNCHRONISATION DE SÉANCE"}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (isSuspendedIndividually && joinedRole === 'delegate') {
    return (
      <div className="fixed inset-0 bg-[#facc15] font-sans antialiased z-50 flex flex-col items-center justify-center text-center p-8 animate-fade-in">
        <div className="max-w-xl space-y-6">
          <AlertTriangle className="h-12 w-12 text-neutral-950 mx-auto animate-bounce" />
          <h1 className="font-sans text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-950 uppercase leading-snug">
            {isEn ? "Delegation Suspended" : "Délégation Suspendue"}
          </h1>
          <p className="font-sans text-xs sm:text-sm font-bold uppercase tracking-wide text-neutral-900 leading-relaxed max-w-md mx-auto">
            {isEn 
              ? `Your delegation (${joinedCountry}) has been temporarily suspended by the committee chair.` 
              : `Votre délégation (${joinedCountry}) a été temporairement suspendue par la présidence du comité.`}
          </p>
          <p className="text-[11px] text-neutral-850 font-semibold uppercase tracking-wider">
            {isEn 
              ? "Your privileges to speak or type have been temporarily frozen." 
              : "Vos privilèges d'écriture et de parole ont été temporairement gelés."}
          </p>
        </div>
      </div>
    );
  }

  // Broadcast presentation screen
  const activeBroadcast = committee.activeBroadcast;
  const showBroadcastDelegate = activeBroadcast && activeBroadcast.type !== 'none' && joinedRole === 'delegate';

  // Toggle Gossip Box
  const handleToggleGossip = async () => {
    try {
      await updateDoc(doc(db, 'committees', committeeId), {
        gossipEnabled: !committee.gossipEnabled
      });
      setFluxControlsOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle Resolutions Submissions
  const handleToggleResolutions = async () => {
    try {
      await updateDoc(doc(db, 'committees', committeeId), {
        resolutionsEnabled: !committee.resolutionsEnabled
      });
      setFluxControlsOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Manage Global Suspension
  const handleToggleGlobalSuspension = async () => {
    try {
      await updateDoc(doc(db, 'committees', committeeId), {
        sessionSuspended: !committee.sessionSuspended
      });
      setFluxControlsOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Publish a Broadcast
  const handlePublishBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, 'committees', committeeId), {
        activeBroadcast: {
          type: broadcastType,
          title: broadcastTitle.trim() || "DIFFUSION OFFICIELLE",
          content: broadcastContent.trim(),
          id: Math.random().toString(36).substr(2, 9),
          status: broadcastType === 'vote' ? 'open' : 'none',
          votes: {}
        }
      });
      setSpecialActionsOpen(false);
      // Reset
      setBroadcastTitle('');
      setBroadcastContent('');
    } catch (err) {
      console.error(err);
    }
  };

  // Stop current broadcast
  const handleStopBroadcast = async () => {
    try {
      await updateDoc(doc(db, 'committees', committeeId), {
        activeBroadcast: null
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Close live screen overlays (projections)
  const handleClearProjectedGossip = async () => {
    try {
      await updateDoc(doc(db, 'committees', committeeId), {
        projectedGossip: null
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearProjectedResolution = async () => {
    try {
      await updateDoc(doc(db, 'committees', committeeId), {
        projectedResolution: null
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Submit vote (Delegate)
  const handleCastVote = async (voteValue: 'POUR' | 'CONTRE' | 'ABSTENTION') => {
    if (!activeBroadcast || activeBroadcast.type !== 'vote' || !joinedCountry) return;
    try {
      const currentVotes = { ...(activeBroadcast.votes || {}) };
      currentVotes[joinedCountry] = voteValue;
      
      await updateDoc(doc(db, 'committees', committeeId), {
        'activeBroadcast.votes': currentVotes
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Session Control (President)
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionTitle.trim()) return;
    try {
      const durationSecs = Number(sessionDurationMin) * 60;
      const speakerAlloc = Number(sessionSpeakerSec);
      await updateDoc(doc(db, 'committees', committeeId), {
        activeSession: {
          id: Math.random().toString(36).substr(2, 9),
          title: sessionTitle.trim(),
          proposer: sessionProposer.trim() || null,
          durationTotal: durationSecs,
          durationLeft: durationSecs,
          itemSpeakerTime: speakerAlloc,
          active: true,
          paused: true,
          speakers: [],
          currentSpeakerIndex: 0,
          currentSpeakerTimeUsed: 0,
          speakerDurationLeft: speakerAlloc,
          speakerPaused: true,
          speakerLastUpdated: Date.now(),
          lastUpdated: Date.now()
        }
      });
      // Clear forms
      setSessionTitle('');
      setSessionProposer('');
    } catch (err) {
      console.error(err);
    }
  };

  // Delegate participates in debate
  const handleDelegateParticipate = async () => {
    if (!committee.activeSession || !joinedCountry) return;
    const { speakers = [] } = committee.activeSession as any;
    if (speakers.includes(joinedCountry)) {
      alert(committee.language === 'EN' ? "Your country is already on the speakers list." : "Votre pays figure déjà dans la liste des orateurs.");
      return;
    }
    if (isDebateStarted) {
      alert(committee.language === 'EN' ? "The debate has already started. Self-registration to the speakers' list is closed." : "Le débat a déjà commencé. Les inscriptions à la liste des orateurs sont closes.");
      return;
    }
    const updatedSpeakers = [...speakers, joinedCountry];
    try {
      await updateDoc(doc(db, 'committees', committeeId), {
        'activeSession.speakers': updatedSpeakers
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Start global Session timer
  const handleStartSessionTimer = async () => {
    const { activeSession } = committee as any;
    if (!activeSession) return;
    try {
      await updateDoc(doc(db, 'committees', committeeId), {
        'activeSession.paused': false,
        'activeSession.debateStarted': true,
        'activeSession.lastUpdated': Date.now()
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Pause global Session timer
  const handlePauseSessionTimer = async () => {
    const { activeSession } = committee as any;
    if (!activeSession || activeSession.paused) return;
    
    const elapsedSec = Math.floor((Date.now() - activeSession.lastUpdated) / 1000);
    const newDurationLeft = Math.max(0, activeSession.durationLeft - elapsedSec);

    try {
      await updateDoc(doc(db, 'committees', committeeId), {
        'activeSession.paused': true,
        'activeSession.durationLeft': newDurationLeft,
        'activeSession.lastUpdated': Date.now()
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Master play: start/resume both timers simultaneously
  const handleStartAllTimers = async () => {
    const { activeSession } = committee as any;
    if (!activeSession) return;
    try {
      let currentLeft = activeSession.speakerDurationLeft;
      if (currentLeft === undefined) {
        currentLeft = Math.max(0, (activeSession.itemSpeakerTime || 0) - (activeSession.currentSpeakerTimeUsed || 0));
      }
      await updateDoc(doc(db, 'committees', committeeId), {
        'activeSession.paused': false,
        'activeSession.speakerPaused': false,
        'activeSession.debateStarted': true,
        'activeSession.speakerDurationLeft': currentLeft,
        'activeSession.speakerLastUpdated': Date.now(),
        'activeSession.lastUpdated': Date.now()
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Master pause: pause both timers simultaneously
  const handlePauseAllTimers = async () => {
    const { activeSession } = committee as any;
    if (!activeSession) return;

    const now = Date.now();
    const elapsedSecGo = activeSession.paused ? 0 : Math.floor((now - activeSession.lastUpdated) / 1000);
    const newGlobalLeft = Math.max(0, activeSession.durationLeft - elapsedSecGo);

    const speakerPaused = activeSession.speakerPaused !== undefined ? !!activeSession.speakerPaused : !!activeSession.paused;
    const speakerLastUpdated = activeSession.speakerLastUpdated || activeSession.lastUpdated || now;
    let currentLeft = activeSession.speakerDurationLeft;
    if (currentLeft === undefined) {
      currentLeft = Math.max(0, (activeSession.itemSpeakerTime || 0) - (activeSession.currentSpeakerTimeUsed || 0));
    }
    const elapsedSecSpk = speakerPaused ? 0 : Math.floor((now - speakerLastUpdated) / 1000);
    const newSpeakerLeft = Math.max(0, currentLeft - elapsedSecSpk);

    try {
      await updateDoc(doc(db, 'committees', committeeId), {
        'activeSession.paused': true,
        'activeSession.speakerPaused': true,
        'activeSession.durationLeft': newGlobalLeft,
        'activeSession.speakerDurationLeft': newSpeakerLeft,
        'activeSession.speakerLastUpdated': now,
        'activeSession.lastUpdated': now
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Start/Resume individual speaker timer
  const handleStartSpeakerTimer = async () => {
    const { activeSession } = committee as any;
    if (!activeSession) return;

    let currentLeft = activeSession.speakerDurationLeft;
    if (currentLeft === undefined) {
      currentLeft = Math.max(0, (activeSession.itemSpeakerTime || 0) - (activeSession.currentSpeakerTimeUsed || 0));
    }

    try {
      await updateDoc(doc(db, 'committees', committeeId), {
        'activeSession.speakerPaused': false,
        'activeSession.debateStarted': true,
        'activeSession.speakerDurationLeft': currentLeft,
        'activeSession.speakerLastUpdated': Date.now()
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Pause individual speaker timer
  const handlePauseSpeakerTimer = async () => {
    const { activeSession } = committee as any;
    if (!activeSession) return;

    const speakerPaused = activeSession.speakerPaused !== undefined ? !!activeSession.speakerPaused : !!activeSession.paused;
    if (speakerPaused) return;

    const speakerLastUpdated = activeSession.speakerLastUpdated || activeSession.lastUpdated || Date.now();
    let currentLeft = activeSession.speakerDurationLeft;
    if (currentLeft === undefined) {
      currentLeft = Math.max(0, (activeSession.itemSpeakerTime || 0) - (activeSession.currentSpeakerTimeUsed || 0));
    }

    const elapsedSec = Math.floor((Date.now() - speakerLastUpdated) / 1000);
    const newSpeakerLeft = Math.max(0, currentLeft - elapsedSec);

    try {
      await updateDoc(doc(db, 'committees', committeeId), {
        'activeSession.speakerPaused': true,
        'activeSession.speakerDurationLeft': newSpeakerLeft,
        'activeSession.speakerLastUpdated': Date.now()
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Adjust global session timer during debate (add or subtract minutes)
  const handleAdjustGlobalTimer = async (mins: number) => {
    const { activeSession } = committee as any;
    if (!activeSession) return;
    try {
      const now = Date.now();
      const isPaused = !!activeSession.paused;
      const currentLeft = activeSession.durationLeft;
      const lastUpdated = activeSession.lastUpdated || now;

      let activeLeft = currentLeft;
      if (!isPaused) {
        const elapsedSec = Math.floor((now - lastUpdated) / 1000);
        activeLeft = Math.max(0, currentLeft - elapsedSec);
      }

      const newDurationLeft = Math.max(0, activeLeft + (mins * 60));
      const newDurationTotal = Math.max(newDurationLeft, (activeSession.durationTotal || 0) + (mins * 60));

      await updateDoc(doc(db, 'committees', committeeId), {
        'activeSession.durationLeft': newDurationLeft,
        'activeSession.durationTotal': newDurationTotal,
        'activeSession.lastUpdated': now
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Move Speaker next index
  const handleNextSpeaker = async () => {
    const { activeSession } = committee as any;
    if (!activeSession) return;
    
    const nextIndex = activeSession.currentSpeakerIndex + 1;
    let updateFields: any = {
      'activeSession.currentSpeakerIndex': nextIndex,
      'activeSession.currentSpeakerTimeUsed': 0,
      'activeSession.speakerDurationLeft': activeSession.itemSpeakerTime || 60,
      'activeSession.speakerPaused': true,
      'activeSession.speakerLastUpdated': Date.now(),
      'activeSession.lastUpdated': Date.now()
    };

    if (activeSession.paused) {
      updateFields['activeSession.paused'] = true;
    }

    try {
      await updateDoc(doc(db, 'committees', committeeId), updateFields);
    } catch (err) {
      console.error(err);
    }
  };

  // Move Speaker index earlier in the list
  const handleMoveSpeakerEarlier = async (idx: number) => {
    const { activeSession } = committee as any;
    if (!activeSession || !activeSession.speakers || idx <= 0) return;
    try {
      const speakers = [...activeSession.speakers];
      const temp = speakers[idx];
      speakers[idx] = speakers[idx - 1];
      speakers[idx - 1] = temp;

      await updateDoc(doc(db, 'committees', committeeId), {
        'activeSession.speakers': speakers
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Move Speaker index later in the list
  const handleMoveSpeakerLater = async (idx: number) => {
    const { activeSession } = committee as any;
    if (!activeSession || !activeSession.speakers || idx >= activeSession.speakers.length - 1) return;
    try {
      const speakers = [...activeSession.speakers];
      const temp = speakers[idx];
      speakers[idx] = speakers[idx + 1];
      speakers[idx + 1] = temp;

      await updateDoc(doc(db, 'committees', committeeId), {
        'activeSession.speakers': speakers
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Remove a speaker from the list
  const handleRemoveSpeaker = async (idx: number) => {
    const { activeSession } = committee as any;
    if (!activeSession || !activeSession.speakers) return;
    try {
      const speakers = [...activeSession.speakers];
      speakers.splice(idx, 1);

      let currentIdx = activeSession.currentSpeakerIndex || 0;
      if (idx < currentIdx) {
        currentIdx = Math.max(0, currentIdx - 1);
      } else if (idx === currentIdx) {
        currentIdx = Math.min(Math.max(0, speakers.length - 1), currentIdx);
      }

      await updateDoc(doc(db, 'committees', committeeId), {
        'activeSession.speakers': speakers,
        'activeSession.currentSpeakerIndex': currentIdx
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Reset Speaker's timer back to allocation
  const handleResetSpeakerTimer = async () => {
    const { activeSession } = committee as any;
    if (!activeSession) return;
    try {
      await updateDoc(doc(db, 'committees', committeeId), {
        'activeSession.currentSpeakerTimeUsed': 0,
        'activeSession.speakerDurationLeft': activeSession.itemSpeakerTime || 60,
        'activeSession.speakerPaused': true,
        'activeSession.speakerLastUpdated': Date.now()
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Close / finish Session
  const handleFinishSession = async () => {
    const { activeSession } = committee as any;
    if (!activeSession) return;
    try {
      // Save details to history subcollection
      await addDoc(collection(db, 'committees', committeeId, 'sessionsHistory'), {
        title: activeSession.title,
        proposer: activeSession.proposer || "Non spécifié",
        speakers: activeSession.speakers || [],
        createdAt: Date.now()
      });

      // Clear the active session details
      await updateDoc(doc(db, 'committees', committeeId), {
        activeSession: null
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Add a delegation manually (President) - defaulted to absent, adjusted later
  const handleAddDelegation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCountry.trim()) return;
    
    const trimmedCountry = newCountry.trim();
    if (committee.delegations?.some(d => d.country.toLowerCase() === trimmedCountry.toLowerCase())) {
      alert(committee.language === 'EN' ? "This country is already in the registry." : "Ce pays figure déjà dans le registre.");
      return;
    }

    const newDel: Delegation = {
      country: trimmedCountry,
      password: newPassword.trim() || undefined,
      present: false, // Default absent, variable afterwards
      voting: false
    };

    try {
      await updateDoc(doc(db, 'committees', committeeId), {
        delegations: [...(committee.delegations || []), newDel]
      });
      // Clear forms
      setNewCountry('');
      setNewPassword('');
    } catch (err) {
      console.error(err);
    }
  };

  // Delete delegation
  const handleDeleteDelegation = async (countryName: string) => {
    if (confirmDeleteDelegationCountry !== countryName) {
      setConfirmDeleteDelegationCountry(countryName);
      setTimeout(() => {
        setConfirmDeleteDelegationCountry(prev => prev === countryName ? null : prev);
      }, 4000);
      return;
    }
    
    const updated = committee.delegations?.filter(d => d.country !== countryName) || [];
    try {
      await updateDoc(doc(db, 'committees', committeeId), {
        delegations: updated
      });
      setConfirmDeleteDelegationCountry(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle delegate state (Present vs Absent vs Present & voting)
  const handleTogglePresence = async (countryName: string, state: 'present' | 'absent' | 'voting') => {
    const updated = committee.delegations?.map(d => {
      if (d.country === countryName) {
        return {
          ...d,
          present: state !== 'absent',
          voting: state === 'voting'
        };
      }
      return d;
    }) || [];

    try {
      await updateDoc(doc(db, 'committees', committeeId), {
        delegations: updated
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle individual delegation suspension (President)
  const handleToggleDelegationSuspension = async (countryName: string) => {
    const list = [...(committee.suspendedDelegations || [])];
    const index = list.indexOf(countryName);
    if (index > -1) {
      list.splice(index, 1);
    } else {
      list.push(countryName);
    }

    try {
      await updateDoc(doc(db, 'committees', committeeId), {
        suspendedDelegations: list
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Send a message or privilege point
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgInput.trim()) return;

    try {
      const type = joinedRole === 'chair' ? 'message' : msgTypeInput;
      const target = joinedRole === 'chair' ? msgTargetInput : 'chair';
      
      await addDoc(collection(db, 'committees', committeeId, 'messages'), {
        sender: joinedRole === 'chair' ? 'Bureau de la Présidence' : joinedCountry,
        text: msgInput.trim(),
        type: type,
        target: target,
        createdAt: Date.now()
      });
      setMsgInput('');
    } catch (err) {
      console.error(err);
    }
  };

  // Send a targeted fast message from President to delegation
  const handleSendPresidentFastMessage = async (targetCountry: string, text: string) => {
    if (!text.trim()) return;
    try {
      await addDoc(collection(db, 'committees', committeeId, 'messages'), {
        sender: committee.language === 'EN' ? 'Bureau of the Chair' : 'Bureau de la Présidence',
        text: text.trim(),
        type: 'message',
        target: targetCountry,
        createdAt: Date.now()
      });
      alert(committee.language === 'EN' ? `Message sent to ${targetCountry}.` : `Message transmis à ${targetCountry}.`);
    } catch (err) {
      console.error(err);
    }
  };

  // Delete message (President)
  const handleDeleteMessage = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'committees', committeeId, 'messages', id));
    } catch (err) {
      console.error(err);
    }
  };

  // Delete historical session index (President)
  const handleDeleteHistoricSession = async (sessionId: string) => {
    if (confirmDeleteSessionId !== sessionId) {
      setConfirmDeleteSessionId(sessionId);
      setTimeout(() => {
        setConfirmDeleteSessionId(prev => prev === sessionId ? null : prev);
      }, 4000);
      return;
    }

    try {
      await deleteDoc(doc(db, 'committees', committeeId, 'sessionsHistory', sessionId));
      setConfirmDeleteSessionId(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Gossip Submit (Delegate / Anonyme)
  const handleSendGossip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gossipInput.trim() || !committee.gossipEnabled) return;
    try {
      await addDoc(collection(db, 'committees', committeeId, 'gossip'), {
        text: gossipInput.trim(),
        createdAt: Date.now()
      });
      setGossipInput('');
    } catch (err) {
      console.error(err);
    }
  };

  // Project Gossip (President)
  const handleProjectGossipPoint = async (gossipText: string) => {
    try {
      await updateDoc(doc(db, 'committees', committeeId), {
        projectedGossip: {
          text: gossipText,
          timestamp: Date.now()
        }
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Delete gossip (President)
  const handleDeleteGossip = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'committees', committeeId, 'gossip', id));
    } catch (err) {
      console.error(err);
    }
  };

  // Google Docs login & select interactions
  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/drive.readonly');
      provider.addScope('https://www.googleapis.com/auth/documents.readonly');
      
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setGoogleAccessToken(credential.accessToken);
        setGoogleUser(result.user);
        fetchRecentDocs(credential.accessToken);
      }
    } catch (err) {
      console.error(err);
      alert(committee.language === 'EN' ? "Google connection interrupted or impossible. Please check your browser permissions." : "Connexion Google interrompue ou impossible. Vérifiez les permissions de votre navigateur.");
    }
  };

  const fetchRecentDocs = async (token: string) => {
    setDocLoading(true);
    try {
      const res = await fetch(
        'https://www.googleapis.com/drive/v3/files?q=mimeType%3D%27application%2Fvnd.google-apps.document%27&orderBy=modifiedTime+desc&pageSize=10',
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setRecentDocs(data.files || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDocLoading(false);
    }
  };

  const handleSelectRecentDoc = (docId: string, title: string) => {
    setSelectedDocUrl(`https://docs.google.com/document/d/${docId}/edit`);
    setResTitleInput(title);
  };

  // Submit resolution (Delegate) - URL-based Google Docs link
  const handleSendResolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resTitleInput.trim() || !selectedDocUrl.trim() || !committee.resolutionsEnabled) return;

    try {
      await addDoc(collection(db, 'committees', committeeId, 'resolutions'), {
        author: joinedCountry,
        title: resTitleInput.trim(),
        content: selectedDocUrl.trim(),
        status: 'pending',
        createdAt: Date.now()
      });
      setResTitleInput('');
      setSelectedDocUrl('');
      alert(committee.language === 'EN' ? "Google Docs Draft Resolution successfully submitted to the Chair!" : "Projet de Résolution Google Docs transmis avec succès au Bureau de la Présidence !");
    } catch (err) {
      console.error(err);
    }
  };

  // Delegation grades helpers
  const calculateAverage = (countryGrades: any) => {
    const g1 = parseFloat(countryGrades?.g1);
    const g2 = parseFloat(countryGrades?.g2);
    const g3 = parseFloat(countryGrades?.g3);
    const g4 = parseFloat(countryGrades?.g4);
    
    const values = [g1, g2, g3, g4].filter(v => !isNaN(v));
    if (values.length === 0) return '-';
    const sum = values.reduce((acc, curr) => acc + curr, 0);
    return (sum / values.length).toFixed(2);
  };

  const handleUpdateGrade = async (country: string, col: string, val: any) => {
    try {
      const currentGrades = (committee as any).grades || {};
      const countryGrades = currentGrades[country] || {};
      const updatedCountryGrades = { ...countryGrades, [col]: val };
      
      await updateDoc(doc(db, 'committees', committeeId), {
        [`grades.${country}`]: updatedCountryGrades
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateComment = async (country: string, text: string) => {
    try {
      const currentGrades = (committee as any).grades || {};
      const countryGrades = currentGrades[country] || {};
      const updatedCountryGrades = { ...countryGrades, text };
      
      await updateDoc(doc(db, 'committees', committeeId), {
        [`grades.${country}`]: updatedCountryGrades
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Project Resolution (President)
  const handleProjectResolutionPoint = async (res: LiveResolution) => {
    try {
      await updateDoc(doc(db, 'committees', committeeId), {
        projectedResolution: {
          title: res.title,
          content: res.content,
          author: res.author
        }
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Approve or Reject resolution (President)
  const handleReviewResolution = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'committees', committeeId, 'resolutions', id), { status });
    } catch (err) {
      console.error(err);
    }
  };

  // Delete resolution (President)
  const handleDeleteResolution = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'committees', committeeId, 'resolutions', id));
    } catch (err) {
      console.error(err);
    }
  };

  // Helper calculation for votes
  const countVotes = () => {
    if (!activeBroadcast || activeBroadcast.type !== 'vote') return { POUR: 0, CONTRE: 0, ABSTENTION: 0, total: 0, pct: 0 };
    const votesObj = activeBroadcast.votes || {};
    let pour = 0;
    let contre = 0;
    let abstention = 0;
    Object.values(votesObj).forEach(val => {
      if (val === 'POUR') pour++;
      if (val === 'CONTRE') contre++;
      if (val === 'ABSTENTION') abstention++;
    });
    const total = pour + contre + abstention;
    const denominator = committee.delegations?.length || 1;
    const pct = Math.round((total / denominator) * 100);
    return { POUR: pour, CONTRE: contre, ABSTENTION: abstention, total, pct };
  };

  const voteStats = countVotes();

  // Highlight current speaker helper
  const getSpeakerLabel = () => {
    const actSes = committee.activeSession;
    if (!actSes || !actSes.speakers || actSes.speakers.length === 0) return "Aucun orateur actif";
    const speakerCountry = actSes.speakers[actSes.currentSpeakerIndex];
    if (!speakerCountry) return "Fin de la liste des orateurs";
    return speakerCountry;
  };

  // Format seconds to high fidelity MM:SS
  const formatSec = (totS: number) => {
    const m = Math.floor(totS / 60);
    const s = totS % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Rich text wrapper helpers (Resolution builder)
  const appendRichFormatting = (tagOpen: string, tagClose: string) => {
    const textarea = document.getElementById('resolutionTextarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    const selectedText = text.substring(start, end);
    const replacement = tagOpen + selectedText + tagClose;

    setResContentInput(
      text.substring(0, start) + replacement + text.substring(end)
    );
    
    // Maintain focus
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tagOpen.length, start + tagOpen.length + selectedText.length);
    }, 50);
  };


  const t = {
    loading: isEn ? "Loading session..." : "Chargement de la session...",
    french: "Français",
    english: "English",
    chair: isEn ? "Chairperson" : "Bureau de la Présidence",
    delegate: isEn ? "Delegate" : "Délégué",
    quitter: isEn ? "Exit" : "Quitter",
    soundMute: isEn ? "Mute sound" : "Couper le son",
    soundUnmute: isEn ? "Unmute sound" : "Activer le son",
    stopBroadcast: isEn ? "Stop ongoing broadcast for all delegates" : "Arrêter la diffusion en cours chez tous les délégués",
    haltBroadcast: isEn ? "HALT BROADCAST" : "INTERROMPRE LA DIFFUSION",
    fluxControls: isEn ? "Flux control" : "Contrôle des flux",
    generalPermissions: isEn ? "General Permissions" : "Permissions Générales",
    enabled: isEn ? "ENABLED" : "ACTIVÉ",
    disabled: isEn ? "DISABLED" : "DÉSACTIVÉ",
    gossipBox: "GOSSIP BOX",
    resolutions: isEn ? "RESOLUTIONS" : "RÉSOLUTIONS",
    resumeSession: isEn ? "RESUME SESSION" : "REPRENDRE LA SÉANCE",
    suspendSession: isEn ? "SUSPEND SESSION" : "SUSPENSION SÉANCE",
    specialActions: isEn ? "Special actions" : "Actions spéciales",
    produceBroadcast: isEn ? "PRODUCE A BROADCAST" : "PRODUIRE UNE DIFFUSION",
    broadcastMode: isEn ? "Broadcast Mode" : "Mode de diffusion",
    fullscreenMessage: isEn ? "FULL SCREEN MESSAGE" : "MESSAGE PLEIN ÉCRAN",
    votingProcedure: isEn ? "VOTING PROCEDURE / BALLOT" : "PROCÉDURE DE VOTE / SCRUTIN",
    diplomaticCrisis: isEn ? "DIPLOMATIC CRISIS ALERT" : "ALERTE DE CRISE DIPLOMATIQUE",
    broadcastTitle: isEn ? "Broadcast Title" : "Titre de la diffusion",
    exDeycorum: isEn ? "E.G. EXCEPTIONAL DECORUM" : "EX. DÉCORUM EXCEPTIONNEL",
    broadcastContentLabel: isEn ? "Content / Message (Optional)" : "Contenu / Message (Facultatif)",
    broadcastPlaceholder: isEn ? "Enter the formal text here (optional)..." : "Saisissez le texte réglementaire ici (facultatif)...",
    broadcastInLive: isEn ? "BROADCAST EXCLUSIVELY LIVE" : "DIFFUSER EN DIRECT EXCLUSIF",

    // Session tabs
    tabSession: isEn ? "Session Debates Tool" : "Outil Sessions Debats",
    tabMembers: isEn ? `Member Registry (${committee?.delegations?.length || 0})` : `Registre des Membres (${committee?.delegations?.length || 0})`,
    tabGrades: isEn ? "Grading" : "Notation",
    
    // Config panel
    configSessionHeader: isEn ? "Configure a new session" : "Configurer une nouvelle session",
    sessionTitleLabel: isEn ? "Session Title" : "Intitulé de la session",
    sessionTitlePlaceholder: isEn ? "e.g. Debate on Draft Resolution" : "ex: Débat sur la clause 4",
    debateTypeLabel: isEn ? "Debate Type" : "Type de débat",
    typeGeneral: isEn ? "GENERAL SPEAKERS' LIST" : "LISTE GÉNÉRALE DES ORATEURS",
    typeModerated: isEn ? "MODERATED CAUCUS" : "CAUCUS MODÉRÉ",
    typeUnmoderated: isEn ? "UNMODERATED CAUCUS" : "CAUCUS NON MODÉRÉ",
    debateTotalTimeLabel: isEn ? "Total Caucus Duration (minutes)" : "Durée totale du caucus (minutes)",
    debateSpeakingTimeLabel: isEn ? "Speaking Time (seconds)" : "Temps de parole (secondes)",
    startSessionButton: isEn ? "INITIATE SESSION & BROADCAST" : "INITIALISER LA SESSION & DIFFUSER EN DIRECT",

    // Active session display
    noActiveSession: isEn ? "No active debate session configured by the Chair." : "Aucune session de débats configurée ou lancée par la Présidence.",
    activeSessionHeader: isEn ? "ACTIVE DEBATE SESSION" : "SESSION DE DÉBAT ACTIVE",
    deleteSession: isEn ? "Delete current session from database" : "Supprimer la session en cours de la base",
    generalListTitle: isEn ? "General Speakers' List" : "Liste Générale des Orateurs",
    moderatedTitle: isEn ? "Moderated Caucus" : "Caucus Modéré",
    unmoderatedTitle: isEn ? "Unmoderated Caucus" : "Caucus Non Modéré",
    individualTimerTitle: isEn ? "Individual Speaker Time" : "Orateur individuel",
    caucusGlobalTimerTitle: isEn ? "Global Debate Duration" : "Chronomètre global caucus",
    speakerListLabel: isEn ? `Speakers' List (${committee?.activeSession?.speakers?.length || 0})` : `Liste des Orateurs (${committee?.activeSession?.speakers?.length || 0})`,
    forceNextSpeaker: isEn ? "Force step to next chronological speaker" : "Forcer le passage à l'orateur suivant chronologiquement",
    nextSpeakerBtn: isEn ? "Next speaker" : "Prochain orateur",
    noSpeakersInQueue: isEn ? "No speakers in queue currently." : "Aucun orateur dans la file pour le moment.",
    registeredInSpeakersList: isEn ? "REGISTERED IN THE SPEAKERS' LIST • WAITING" : "INSCRIT DANS LA LISTE DES ORATEURS • EN ATTENTE",
    resetSpeakerBtn: isEn ? "Reset speaker" : "Orateur",
    skipSpeakerBtn: isEn ? "Skip speaker" : "Orateur",
    speakerInputPlaceholder: isEn ? "Search or select a country..." : "Rechercher ou sélectionner un pays...",
    registerSpeakerBtn: isEn ? "Register Delegation" : "Inscrire la délégation",
    
    // Member registry tab
    registryHeader: isEn ? "Member Registry & Attendance" : "Registre des Membres & Présences",
    registrySubtitle: isEn ? "Declare delegations active in the committee, manage voting status, and suspend roles." : "Déclarez les délégations actives dans le comité, gérez le statut de vote réels et suspendez des rôles.",
    activeDelegationsCount: isEn ? "ACTIVE DELEGATIONS" : "DÉLÉGATIONS INSCRITES",
    newCountryLabel: isEn ? "New Delegation / Country Name" : "Nouvelle Délégation / Nom du Pays",
    countryInputPlaceholder: isEn ? "e.g. United Kingdom" : "ex: Royaume-Uni / Canada / France",
    addDelegationBtn: isEn ? "Add Delegation" : "Ajouter la Délégation",
    tableCountryHeader: isEn ? "Delegation / Nation" : "Délégation / Nation",
    tablePresenceHeader: isEn ? "Attendance Status" : "Statut de Présence",
    tableVotingHeader: isEn ? "Voting Status" : "Statut de Vote",
    tableActionsHeader: isEn ? "Actions & Access" : "Actions & Accès",
    presentAndVoting: isEn ? "Present & Voting" : "Présent et Votant",
    presentSimple: isEn ? "Present" : "Présent Simple",
    absent: isEn ? "Absent" : "Absent",
    votingRequired: isEn ? "Must Vote (No Abstention)" : "Vote Obligatoire",
    votingCanAbstain: isEn ? "Can Abstain" : "Peut s'abstenir",
    statusSuspended: isEn ? "Suspended" : "Suspendu",
    statusActive: isEn ? "Active" : "Actif",
    suspendBtn: isEn ? "Suspend" : "Suspendre",
    unsuspendBtn: isEn ? "Reactivate" : "Réactiver",
    removeBtn: isEn ? "Remove" : "Retirer",
    
    // Sidebars
    tabSideMsgs: isEn ? "MESSAGES" : "MESSAGES",
    tabSideGossip: isEn ? "GOSSIPS & CHATTERS" : "RUMEURS & BAVARDAGES",
    tabSideResolutions: isEn ? "Resolutions" : "Résolutions",
    
    // Message section
    targetAllDelegations: isEn ? "All Delegations (Public)" : "Toutes les délégations (Public)",
    targetPrefix: isEn ? "Secure message to:" : "Message sécurisé pour :",
    placeholderMsg: isEn ? "Type a public or private message..." : "Rédiger un message public ou privé...",
    sendBtn: isEn ? "Send" : "Envoyer",
    publicBadge: isEn ? "Public" : "Public",
    privilegeBadge: isEn ? "Private" : "Privé",
    gossipTitle: isEn ? "Submit an Anonymous Rumor" : "Proposer une rumeur anonyme",
    gossipPlaceholder: isEn ? "Anonymously reveal raw diplomatic gossip... (Be constructive!)" : "Régler vos comptes diplomatiques de façon anonyme... (Soyez constructifs !)",
    submitGossipBtn: isEn ? "Broadcast Anonymous Rumor" : "Diffuser la rumeur anonyme",
    noGossipInList: isEn ? "No rumours or gossips submitted." : "Aucune rumeur n'a été soumise.",
    noMsgInList: isEn ? "No messages exchanged in this session." : "Aucun message échangé pour le moment.",

    // Vote result sidebar widget
    currentPollResults: isEn ? "CURRENT VOTE RESULTS" : "RÉSULTATS DU VOTE EN COURS",
    totalVotesCount: isEn ? "TOTAL VOTES CAST" : "PLURALITÉ EXPRIMÉE",
    ofVoters: isEn ? "of active voters" : "des votants actifs",
    resultsPour: isEn ? "IN FAVOR" : "POUR",
    resultsContre: isEn ? "AGAINST" : "CONTRE",
    resultsAbstention: isEn ? "ABSTENTION" : "ABSTENTION",
    notElected: isEn ? "NOT ELECTED / FAILED" : "NON ÉLU / ÉCHEC",
    elected: isEn ? "ELECTED / PASSED" : "ÉLU / SUCCÈS",

    // Google Docs in Resolution tab
    resolutionsHeader: isEn ? "Google Docs Resolutions" : "Résolutions Google Docs transmises à la Présidence",
    noResolutionsYet: isEn ? "No draft submitted to the Secretariat." : "Aucun texte soumis au Secrétariat.",
    composeResolutionTitle: isEn ? "Draft a Resolution" : "Rédiger une Résolution",
    googleDocUrlLabel: isEn ? "Google Docs draft resolution link" : "Lien Google Docs du projet de résolution",
    googleDocUrlPlaceholder: "https://docs.google.com/document/d/.../edit",
    googleDriveAssocLabel: isEn ? "Associate Google Drive" : "Associer Google Drive",
    googleDriveAssocBtn: isEn ? "Associate" : "Associer",
    googleConnectedStatus: isEn ? "Connected" : "Connecté",
    googleDisconnectBtn: isEn ? "Disconnect" : "Déconnecter",
    selectRecentDocHeader: isEn ? "Or select a recent document:" : "Sélectionnez un document récent :",
    docLoadingText: isEn ? "Searching..." : "Chargement...",
    noRecentDocsFound: isEn ? "No Google Doc documents found on your active Google Drive." : "Aucun document Google Doc trouvé sur votre Drive.",
    submitToTableBtn: isEn ? "Submit to the Chair" : "Transmettre à la table",
    projectedResolutionLabel: isEn ? "Projected Resolution" : "Résolution projetée au tableau",
    hideProjectedBtn: isEn ? "Hide from Board" : "Retirer du tableau",
    projectOnBoardAlert: isEn ? "Projecting on delegate screens" : "Afficher sur les écrans délégués",
    projectOnBoardBtn: isEn ? "Project on Board" : "Projeter",
    approveBtn: isEn ? "Approve" : "Approuver",
    rejectBtn: isEn ? "Reject" : "Rejeter",
    googleDocLinkedDoc: isEn ? "Linked Google Docs Document:" : "Document Google Docs lié :",
    openInGoogleDocsBtn: isEn ? "Open in Google Docs" : "Ouvrir dans Google Docs",
    iframePreviewNotAvailable: isEn ? "Preview not available. Please open the document in a new tab using the button above." : "Aperçu non disponible. Veuillez ouvrir le document dans un nouvel onglet avec le bouton ci-dessus.",

    // Grades / Evaluation Tab
    gradesHeader: isEn ? "Gradebook & Evaluation" : "Carnet de Notes & Notation",
    gradesSubtitle: isEn ? "Enter grades on a scale from 0 to 20. Averages are calculated and saved live." : "Saisissez les notes sur une échelle de 0 &agrave; 20. Les moyennes sont recalculées et enregistrées à la volée.",
    evaluatedDelegationsLabel: isEn ? "EVALUATED DELEGATIONS" : "DÉLÉGATIONS ÉVALUÉES",
    tableColDelegation: isEn ? "Delegation / Country" : "Délégation / Pays",
    tableColAvg: isEn ? "Average" : "Moyenne",
    tableColComment: isEn ? "Notes & Observations" : "Notes & Observations",
    gradesEmptyLabel: isEn ? "Add delegations in the Registry to start evaluating them." : "Saisissez des délégations dans le Registre pour commencer à les évaluer.",

    // Delegate Side Speaking Controls / Buttons
    delegationJoinSpeakerBtn: isEn ? "Request floor" : "S'inscrire sur la liste des orateurs",
    delegationLeaveSpeakerBtn: isEn ? "Retract speaking request" : "Se désinscrire de la liste",
    speakingStatusLabel: isEn ? "SPEECH & FLOOR CONTROL DETECTED" : "RECONNAISSANCE DE PAROLE & CHRONOMÈTRE EN COURS",
    secondsAbbreviated: "s",
    minutesAbbreviated: "m",
    gossipAuthorAnonymous: isEn ? "Anonymous" : "Anonyme",
  };

  const handleCopyRules = () => {
    const rulesText = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /committees/{committeeId} {
      allow read, write: if true;
      match /messages/{messageId} {
        allow read, write: if true;
      }
      match /gossip/{gossipId} {
        allow read, write: if true;
      }
      match /resolutions/{resolutionId} {
        allow read, write: if true;
      }
      match /sessionsHistory/{sessionId} {
        allow read, write: if true;
      }
    }
  }
}`;
    navigator.clipboard.writeText(rulesText);
    alert(isEn ? "Firestore rules copied to clipboard!" : "Règles Firestore copiées dans le presse-papiers ! Collez-les dans votre console Firebase.");
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] text-neutral-900 font-sans flex flex-col antialiased">
      
      {/* 0. Custom Firebase Database Permission Denied Instructions Modal */}
      {customDbPermissionError && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-fade-in overflow-y-auto">
          <div className="bg-white border border-neutral-200 text-neutral-900 rounded-[28px] p-6 md:p-8 max-w-2xl w-full my-8 shadow-2xl relative">
            <button 
              onClick={() => setCustomDbPermissionError(false)}
              className="absolute top-4 right-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-205 rounded-full p-2 transition-colors cursor-pointer"
              title="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
            
            <div className="flex items-center gap-3 text-red-600 mb-4 pl-1">
              <AlertTriangle className="h-6 w-6 stroke-[2.5]" />
              <h2 className="text-lg font-black tracking-tight uppercase">Configuration Firebase requise (Erreur de permission)</h2>
            </div>
            
            <p className="text-neutral-600 text-[12.5px] font-medium leading-relaxed mb-4 pl-1">
              Vous avez connecté ce comité à une <strong>base de données séparée (Firebase externe)</strong>. 
              Pour que les fonctionnalités de débat (messages, gossips, résolutions, orateurs, votes) fonctionnent en temps réel, 
              les <strong>Règles de sécurité Firestore (Firestore Security Rules)</strong> de votre projet Firebase externe doivent être configurées.
            </p>
            
            <div className="bg-neutral-50 px-4 py-3 border border-neutral-200 rounded-2xl mb-5 space-y-2.5">
              <span className="block text-[10px] font-black text-neutral-800 uppercase tracking-wider">Comment résoudre ce problème :</span>
              <ol className="list-decimal list-inside text-neutral-600 text-[11px] font-semibold space-y-1.5 pl-1.5">
                <li>Rendez-vous sur la <a href={`https://console.firebase.google.com/project/${committee?.firebaseProjectId || "votre-projet"}/firestore/rules`} target="_blank" rel="noopener noreferrer" className="text-neutral-950 underline hover:text-neutral-800">Console Firebase &gt; Cloud Firestore &gt; Règles (Rules)</a>.</li>
                <li>Cliquez sur le bouton ci-dessous pour copier les règles requises.</li>
                <li>Remplacez les règles de votre base par celles-ci et cliquez sur <strong>Publier</strong>.</li>
              </ol>
            </div>

            <div className="relative mb-5 pt-4">
              <span className="absolute top-2 left-2 text-[9px] font-black tracking-widest text-neutral-400 uppercase font-mono">CODE DES RÈGLES</span>
              <button
                onClick={handleCopyRules}
                className="absolute top-2 right-2 text-[9px] font-black tracking-widest text-[#101010] bg-amber-400 hover:bg-amber-300 px-2.5 py-1.5 rounded transition-all cursor-pointer shadow-sm uppercase font-sans border border-amber-500"
              >
                Copier les règles
              </button>
              <pre className="bg-neutral-950 text-neutral-200 text-[11px] font-mono p-4 rounded-2xl overflow-x-auto max-h-[180px] border border-neutral-800 mt-4">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /committees/{committeeId} {
      allow read, write: if true;
      match /messages/{messageId} {
        allow read, write: if true;
      }
      match /gossip/{gossipId} {
        allow read, write: if true;
      }
      match /resolutions/{resolutionId} {
        allow read, write: if true;
      }
      match /sessionsHistory/{sessionId} {
        allow read, write: if true;
      }
    }
  }
}`}
              </pre>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-end pt-2">
              <button
                onClick={() => setCustomDbPermissionError(false)}
                className="px-5 py-3 rounded-xl bg-neutral-150 hover:bg-neutral-200 text-neutral-800 border border-neutral-200 text-xs font-bold transition-all text-center"
              >
                Ignorer (Le temps réel risque de ne pas fonctionner)
              </button>
              <a
                href={`https://console.firebase.google.com/project/${committee?.firebaseProjectId || "votre-projet"}/firestore/rules`}
                target="_blank"
                rel="no_referrer noreferrer"
                className="px-5 py-3 rounded-xl bg-neutral-950 hover:bg-neutral-900 text-white text-xs font-bold tracking-wider uppercase transition-all text-center"
              >
                Ouvrir ma Console Firebase
              </a>
            </div>
          </div>
        </div>
      )}
      
      {/* GLOBAL FULL SCREEN OVERLAYS */}
      
      {/* 1. Global Projected Gossip Overlay */}
      {committee.projectedGossip && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md z-40 flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white border border-neutral-200 text-neutral-900 rounded-[28px] p-8 md:p-12 max-w-2xl w-full space-y-7 relative shadow-2xl text-center select-none">
            {joinedRole === 'chair' && (
              <button 
                onClick={handleClearProjectedGossip}
                className="absolute top-4 right-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-205 rounded-full p-2 transition-colors cursor-pointer"
                title={isEn ? "Hide projection from everyone" : "Masquer la projection chez tous"}
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <div className="inline-flex items-center text-[10px] tracking-[0.2em] font-bold text-amber-700 uppercase border border-amber-200 bg-amber-50 px-3 py-1 rounded-full">
              {isEn ? "Projected Gossip Box" : "Gossip Box Projecté"}
            </div>
            
            <p className="text-xl md:text-2xl font-serif italic text-neutral-800 font-light leading-relaxed">
              “ {committee.projectedGossip.text} ”
            </p>

            <div className="text-[10px] text-neutral-400 uppercase tracking-widest font-mono font-bold">
              {isEn ? "Direct Chair Projection \u2022 Anonymous" : "Projection Bureau direct \u2022 Anonyme"}
            </div>
          </div>
        </div>
      )}

      {/* 2. Global Projected Resolution Overlay */}
      {committee.projectedResolution && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md z-40 flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white border border-neutral-200 text-neutral-900 rounded-[28px] p-8 md:p-12 max-w-3xl w-full max-h-[90vh] overflow-y-auto space-y-6 relative shadow-2xl select-none">
            {joinedRole === 'chair' && (
              <button 
                onClick={handleClearProjectedResolution}
                className="absolute top-4 right-4 bg-neutral-100 hover:bg-neutral-200 text-black border border-neutral-200 rounded-full p-2 transition-colors cursor-pointer"
                title={isEn ? "Hide projection" : "Masquer la projection"}
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <div className="border-b border-neutral-200 pb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
              <div>
                <span className="text-[9px] tracking-[0.25em] font-mono text-neutral-700 font-extrabold uppercase border border-neutral-200 bg-neutral-50 px-3 py-1 rounded-full shadow-sm">
                  {isEn ? "OFFICIAL DRAFT RESOLUTION" : "PROJET DE RÉSOLUTION OFFICIELLE"}
                </span>
                <h2 className="text-lg font-extrabold tracking-tight text-neutral-950 uppercase mt-3">
                  {committee.projectedResolution.title}
                </h2>
              </div>
              <span className="text-[10px] font-mono bg-neutral-105 border border-neutral-200 px-3 py-1.5 rounded-full uppercase text-neutral-600 font-bold font-semibold">
                {isEn ? "PROPOSED BY:" : "PROPOSÉ PAR:"} {committee.projectedResolution.author}
              </span>
            </div>

            {committee.projectedResolution.content && (committee.projectedResolution.content.startsWith('http://') || committee.projectedResolution.content.startsWith('https://')) ? (
              <div className="space-y-4 pt-2">
                <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-inner">
                  <div>
                    <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{isEn ? "Linked Google Docs document:" : "Document Google Docs lié :"}</p>
                    <p className="text-xs text-neutral-600 truncate max-w-sm font-mono mt-0.5">{committee.projectedResolution.content}</p>
                  </div>
                  <a 
                    href={committee.projectedResolution.content}
                    target="_blank"
                    rel="noreferrer"
                    referrerPolicy="no-referrer"
                    className="shrink-0 bg-neutral-950 hover:bg-neutral-900 border-none rounded-xl px-4 py-2 text-[10px] font-black tracking-wider uppercase text-white transition-all cursor-pointer shadow-md inline-flex items-center space-x-1 decoration-none"
                    style={{ textDecoration: 'none' }}
                  >
                    <span>{isEn ? "Open in Google Docs" : "Ouvrir dans Google Docs"}</span>
                  </a>
                </div>

                {(() => {
                  const docIdMatch = committee.projectedResolution.content.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
                  const docId = docIdMatch ? docIdMatch[1] : null;
                  if (docId) {
                    return (
                      <div className="relative border border-neutral-200 rounded-[22px] overflow-hidden bg-neutral-50 shadow-inner">
                        <iframe 
                          src={`https://docs.google.com/document/d/${docId}/preview`} 
                          className="w-full h-[450px] border-none bg-white"
                          title={isEn ? "Google Docs Preview" : "Aperçu Google Docs"}
                        />
                      </div>
                    );
                  }
                  return (
                    <div className="p-8 text-center text-xs text-[#999999] italic bg-neutral-50 border rounded-2xl">
                      {isEn ? "Preview not available. Please open the document in a new tab using the button above." : "Aperçu non disponible. Veuillez ouvrir le document dans un nouvel onglet avec le bouton ci-dessus."}
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div 
                className="prose prose-neutral text-xs leading-relaxed max-w-none text-neutral-800 space-y-3 pt-2 font-serif whitespace-pre-line"
                dangerouslySetInnerHTML={{ __html: committee.projectedResolution.content }}
              />
            )}

            <div className="border-t border-neutral-150 pt-4 flex justify-between items-center text-[9px] font-mono text-neutral-400 uppercase tracking-widest font-semibold">
              <span>{isEn ? "United Nations" : "Nations Unies"} &bull; {committee.name}</span>
              <span>{isEn ? "Regulatory \u2022 Active draft" : "Réglementaire \u2022 Projet actif"}</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Global Broadcast Overlay (Delegate side view intercept) */}
      {showBroadcastDelegate && activeBroadcast && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center p-6 bg-neutral-950/75 backdrop-blur-md animate-fade-in text-center select-none">
          <div className={`max-w-2xl w-full space-y-8 p-8 md:p-12 rounded-[28px] shadow-2xl border ${
            activeBroadcast.type === 'crisis'
              ? 'bg-red-950 border-red-800 text-white'
              : 'bg-white border-neutral-200 text-neutral-900 font-sans'
          }`}>
            
            {activeBroadcast.type === 'crisis' ? (
              <div className="space-y-6 font-sans">
                {/* Emergency Alert Header */}
                <div className="inline-flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 font-sans text-[11px] font-extrabold tracking-[0.25em] uppercase border-none animate-pulse rounded-full shadow-md">
                  <AlertTriangle className="h-4.5 w-4.5" />
                  <span>{isEn ? "MAJOR CRISIS ALERT \u2022 BREAKING INFO" : "ALERTE DE CRISE MAJEURE \u2022 FLASH INFO"}</span>
                </div>
                
                <h2 className="font-serif text-3xl md:text-4xl tracking-wide uppercase text-red-100 font-black leading-tight">
                  {activeBroadcast.title}
                </h2>

                {activeBroadcast.content && (
                  <p className="text-sm md:text-base leading-relaxed text-red-200 bg-red-900/40 p-6 border border-red-800/50 font-sans rounded-[16px]">
                    {activeBroadcast.content}
                  </p>
                )}

                <p className="text-[10px] font-sans text-red-400 uppercase tracking-widest font-bold animate-pulse">
                  {isEn ? "ACOUSTIC ALERT & REAL-TIME COUNTER ACTIVE \u2022 MUN SECURITY COUNCIL" : "ALERTE ACOUSTIQUE & COMPTEUR TEMPS RÉEL ACTIF \u2022 CONSEIL SÉCURITÉ MUN"}
                </p>
              </div>
            ) : activeBroadcast.type === 'vote' ? (
              <div className="space-y-6">
                <div className="inline-flex items-center space-x-1.5 bg-neutral-100 text-neutral-850 border border-neutral-250 px-4 py-2 font-mono text-[10px] tracking-widest uppercase font-bold rounded-full">
                  <Radio className="h-3.5 w-3.5 text-blue-500 animate-pulse" />
                  <span>{isEn ? "COMMITTEE VOTING PROCEDURE" : "PROCÉDURE DE VOTE DU COMITÉ"}</span>
                </div>

                <h2 className="font-sans text-2xl tracking-normal uppercase text-neutral-950 font-black leading-snug">
                  {activeBroadcast.title}
                </h2>

                {activeBroadcast.content && (
                  <p className="text-xs text-neutral-500 tracking-wider uppercase font-semibold">
                    {activeBroadcast.content}
                  </p>
                )}

                {/* Live results for delegates? No, show options or show has-voted status */}
                {activeBroadcast.votes && activeBroadcast.votes[joinedCountry] ? (
                  <div className="bg-neutral-50 border border-neutral-200 p-8 rounded-2xl space-y-4 max-w-sm mx-auto shadow-inner">
                    <Check className="h-8 w-8 text-emerald-600 mx-auto" />
                    <p className="text-[10px] font-mono tracking-widest uppercase text-neutral-500 font-black">
                      {isEn ? "YOUR DECISION HAS BEEN RECORDED \u2022 SECRETARIAT" : "VOTRE DÉCISION A ÉTÉ ENREGISTRÉE \u2022 SECRÉTARIAT"}
                    </p>
                    <div className="text-sm font-black uppercase p-3 border border-neutral-200 bg-white text-neutral-900 rounded-xl tracking-widest shadow-sm">
                      {isEn ? "CHOICE:" : "CHOIX:"} {activeBroadcast.votes[joinedCountry]}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 max-w-md mx-auto pt-4">
                    <p className="text-[11px] text-neutral-500 uppercase tracking-widest font-black bg-neutral-100 px-3 py-1 rounded-full border border-neutral-200 inline-block">
                      {isEn ? "Express your State's diplomatic voice" : "Exprimez la voix diplomatique de votre État"}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <button 
                        onClick={() => handleCastVote('POUR')}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 hover:scale-[1.02] text-white rounded-2xl py-5 text-sm font-black uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-emerald-600/10 flex items-center justify-center space-x-2 border-2 border-emerald-500/20"
                      >
                        <Check className="h-5 w-5 stroke-[3]" />
                        <span>{isEn ? "IN FAVOR" : "POUR"}</span>
                      </button>
                      <button 
                        onClick={() => handleCastVote('CONTRE')}
                        className="w-full bg-red-600 hover:bg-red-700 hover:scale-[1.02] text-white rounded-2xl py-5 text-sm font-black uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-red-600/10 flex items-center justify-center space-x-2 border-2 border-red-500/20"
                      >
                        <X className="h-5 w-5 stroke-[3]" />
                        <span>{isEn ? "AGAINST" : "CONTRE"}</span>
                      </button>
                    </div>

                    {/* Only show Abstention if they are not Present & Voting */}
                    {(!committee.delegations?.find(d => d.country === joinedCountry)?.voting) && (
                      <button 
                        onClick={() => handleCastVote('ABSTENTION')}
                        className="w-full mt-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border-2 border-neutral-200 rounded-2xl py-4 text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-sm flex items-center justify-center space-x-1.5"
                      >
                        <Info className="h-4 w-4 text-neutral-500" />
                        <span>{isEn ? "ABSTENTION" : "ABSTENTION"}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              // Simple Message type
              <div className="space-y-6">
                <div className="inline-flex items-center text-[10px] tracking-[0.2em] font-sans text-neutral-600 uppercase border border-neutral-200 bg-neutral-50 px-4 py-1.5 rounded-full">
                  {isEn ? "Message from the Chair" : "Message de la Présidence"}
                </div>
                
                <h2 className="font-sans text-2xl tracking-normal uppercase text-neutral-950 font-black pb-4 border-b border-neutral-100 leading-snug">
                  {activeBroadcast.title}
                </h2>

                {activeBroadcast.content && (
                  <p className="text-lg font-serif italic text-neutral-700 leading-relaxed pt-2">
                    “ {activeBroadcast.content} ”
                  </p>
                )}
              </div>
            )}

            <div className="pt-6 text-[10px] text-neutral-400 font-sans uppercase tracking-[0.2em] font-bold">
              {isEn ? "Controlled live by the Chairperson table" : "Contrôlé en direct par la table de Présidence"}
            </div>
          </div>
        </div>
      )}

      {/* HORIZONTAL BOARD HEADER (TOP BAR) */}
      <header className="sticky top-16 bg-white/85 backdrop-blur-md border-b border-neutral-200/50 px-6 py-4 flex items-center justify-between z-30 text-neutral-900 shadow-sm animate-fade-in">
        <div className="flex items-center space-x-3.5">
          <div className="flex flex-col">
            <div className="flex items-center space-x-2">
              <span className="text-[9px] border border-neutral-200 px-2.5 py-0.5 font-bold uppercase tracking-wider text-neutral-600 bg-neutral-50 rounded-full shadow-sm">
                {committee.language === 'EN' ? 'English' : 'Français'}
              </span>
              <span className={`text-[10px] px-2.5 py-0.5 tracking-wider uppercase font-extrabold border rounded-full shadow-sm ${
                joinedRole === 'chair' 
                  ? 'bg-neutral-950 text-white border-neutral-950' 
                  : 'bg-neutral-100 text-neutral-700 border-neutral-200'
              }`}>
                {joinedRole === 'chair' ? (isEn ? 'Chairperson' : 'Bureau de la Présidence') : (isEn ? `Delegate: ${joinedCountry}` : `Délégué: ${joinedCountry}`)}
              </span>
            </div>
            <h1 className="text-base font-black tracking-widest text-neutral-950 uppercase mt-1.5 leading-snug">
              {committee.name}
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Sounds Mute toggle */}
          <button 
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 border border-neutral-200 rounded-xl hover:bg-neutral-50 text-neutral-500 hover:text-neutral-900 transition-all cursor-pointer bg-white shadow-sm"
            title={soundEnabled ? (isEn ? "Mute sound" : "Couper le son") : (isEn ? "Unmute sound" : "Activer le son")}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-red-500" />}
          </button>

          {/* CHAIR CONTROL PANELS CONTROLS */}
          {joinedRole === 'chair' && (
            <div className="flex items-center space-x-2 relative animate-fade-in">
              
              {/* Broadcast status banner */}
              {activeBroadcast && activeBroadcast.type !== 'none' && (
                <button 
                  onClick={handleStopBroadcast}
                  className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider flex items-center space-x-1 cursor-pointer"
                  title={isEn ? "Stop the ongoing broadcast for all delegates" : "Arrêter la diffusion en cours chez tous les délégués"}
                >
                  <span className="h-1.5 w-1.5 bg-red-600 rounded-full animate-ping mr-1" />
                  <span>{isEn ? "Stop broadcast" : "Arrêter diffusion"}</span>
                </button>
              )}
                              {/* Flux Controls */}
              <div className="relative animate-fade-in">
                <button 
                  onClick={() => {
                    setFluxControlsOpen(!fluxControlsOpen);
                    setSpecialActionsOpen(false);
                  }}
                  className={`border border-neutral-200 rounded-xl px-3.5 py-2 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center space-x-1 shadow-sm ${
                    fluxControlsOpen ? 'bg-neutral-950 text-white border-neutral-950' : 'bg-white text-neutral-750 hover:bg-neutral-50'
                  }`}
                >
                  <span>{isEn ? "Flux control" : "Contrôle des flux"}</span>
                  <ChevronDown className="h-3 w-3" />
                </button>

                {fluxControlsOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-neutral-200 rounded-2xl p-3 shadow-xl z-50 text-left space-y-2 animate-fade-in">
                    <h5 className="text-[9px] font-bold uppercase text-neutral-400 tracking-widest pb-1 border-b border-neutral-100">{isEn ? "General Permissions" : "Permissions Générales"}</h5>
                    
                    <button 
                      onClick={handleToggleGossip}
                      className="w-full text-left py-2 px-2 hover:bg-neutral-50 text-xs font-bold uppercase flex items-center justify-between rounded-xl transition-all"
                    >
                      <span className="text-neutral-700">GOSSIP BOX</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${committee.gossipEnabled ? 'text-emerald-700 bg-emerald-50' : 'text-neutral-400 bg-neutral-100'}`}>
                        {committee.gossipEnabled ? (isEn ? 'ENABLED' : 'ACTIVÉ') : (isEn ? 'DISABLED' : 'DÉSACTIVÉ')}
                      </span>
                    </button>

                    <button 
                      onClick={handleToggleResolutions}
                      className="w-full text-left py-2 px-2 hover:bg-neutral-50 text-xs font-bold uppercase flex items-center justify-between rounded-xl transition-all"
                    >
                      <span className="text-neutral-700">{isEn ? "RESOLUTIONS" : "RÉSOLUTIONS"}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${committee.resolutionsEnabled ? 'text-emerald-700 bg-emerald-50' : 'text-neutral-400 bg-neutral-100'}`}>
                        {committee.resolutionsEnabled ? (isEn ? 'ENABLED' : 'ACTIVÉ') : (isEn ? 'DISABLED' : 'DÉSACTIVÉ')}
                      </span>
                    </button>

                    <div className="border-t border-neutral-100 pt-2">
                      <button 
                        onClick={handleToggleGlobalSuspension}
                        className={`w-full text-center py-2.5 text-[10px] font-black uppercase tracking-widest transition-colors rounded-xl ${
                          committee.sessionSuspended 
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                            : 'bg-red-600 hover:bg-red-700 text-white shadow-sm'
                        }`}
                      >
                        {committee.sessionSuspended ? (isEn ? 'RESUME SESSION' : 'REPRENDRE LA SÉANCE') : (isEn ? 'SUSPEND SESSION' : 'SUSPENSION SÉANCE')}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Special Actions */}
              <div className="relative animate-fade-in">
                <button 
                  onClick={() => {
                    setSpecialActionsOpen(!specialActionsOpen);
                    setFluxControlsOpen(false);
                  }}
                  className={`bg-neutral-950 hover:bg-neutral-900 rounded-xl px-3.5 py-2 text-[10px] font-black uppercase tracking-wider text-white transition-all cursor-pointer flex items-center space-x-1 shadow-md`}
                >
                  <span>{isEn ? "Special actions" : "Actions spéciales"}</span>
                  <Radio className="h-3 w-3 ml-1 text-emerald-400 animate-pulse" />
                </button>

                {specialActionsOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-neutral-200 rounded-[28px] p-5 shadow-2xl z-50 text-left space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-neutral-900">{isEn ? "PRODUCE A BROADCAST" : "PRODUIRE UNE DIFFUSION"}</h4>
                      <button onClick={() => setSpecialActionsOpen(false)}>
                        <X className="h-4 w-4 text-neutral-400 hover:text-black cursor-pointer bg-transparent border-none" />
                      </button>
                    </div>

                    <form onSubmit={handlePublishBroadcast} className="space-y-3.5">
                      <div>
                        <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">{isEn ? "Broadcast Mode" : "Mode de diffusion"}</label>
                        <select 
                          value={broadcastType}
                          onChange={(e: any) => setBroadcastType(e.target.value)}
                          className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wider text-neutral-800 outline-none focus:border-neutral-400 focus:bg-white transition-all shadow-inner"
                        >
                          <option value="message">{isEn ? "FULL SCREEN MESSAGE" : "MESSAGE PLEIN ÉCRAN"}</option>
                          <option value="vote">{isEn ? "VOTING PROCEDURE / BALLOT" : "PROCÉDURE DE VOTE / SCRUTIN"}</option>
                          <option value="crisis">{isEn ? "DIPLOMATIC CRISIS ALERT" : "ALERTE DE CRISE DIPLOMATIQUE"}</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">{isEn ? "Broadcast Title" : "Titre de la diffusion"}</label>
                        <input 
                          type="text"
                          required
                          placeholder={isEn ? "E.G. EXCEPTIONAL DECORUM" : "EX. DÉCORUM EXCEPTIONNEL"}
                          value={broadcastTitle}
                          onChange={(e) => setBroadcastTitle(e.target.value)}
                          className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-wider text-neutral-900 placeholder-neutral-400 outline-none focus:border-neutral-400 focus:bg-white transition-all shadow-inner"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">{isEn ? "Content / Message (Optional)" : "Contenu / Message (Facultatif)"}</label>
                        <textarea 
                          rows={3}
                          placeholder={isEn ? "Enter the formal text here (optional)..." : "Saisissez le texte réglementaire ici (facultatif)..."}
                          value={broadcastContent}
                          onChange={(e) => setBroadcastContent(e.target.value)}
                          className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-xs text-neutral-950 placeholder-neutral-400 outline-none focus:border-neutral-400 focus:bg-white transition-all shadow-inner"
                        />
                      </div>

                      <button 
                        type="submit"
                        className="w-full bg-neutral-950 hover:bg-neutral-900 rounded-xl text-white font-black text-xs py-2.5 uppercase tracking-widest transition-all cursor-pointer shadow-md"
                      >
                        {isEn ? "BROADCAST EXCLUSIVELY LIVE" : "DIFFUSER EN DIRECT EXCLUSIF"}
                      </button>
                    </form>
                  </div>
                )}
              </div>

            </div>
          )}

          <button
            onClick={onExit}
            className="border border-neutral-200 bg-white hover:bg-neutral-50 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-neutral-700 hover:text-neutral-950 transition-colors cursor-pointer shadow-sm active:scale-95 duration-100"
          >
            {isEn ? "Exit" : "Quitter"}
          </button>
        </div>
      </header>

      {/* CENTRAL SPLIT VIEW: RESPONSIVE TWO COLUMNS BOARD */}
      {/* Background and Layout grid */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 py-6 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* COLUMN LEFT: GESTION DU COMITÉ (SIZE 8 on lg, size 12 otherwise) */}
        <section className="lg:col-span-8 space-y-6">

          {/* Real-time Voting Results for President */}
          {joinedRole === 'chair' && activeBroadcast && activeBroadcast.type === 'vote' && (
            <div className="bg-white border border-neutral-200 rounded-[28px] p-6 shadow-md space-y-4 font-sans text-neutral-950 animate-fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div className="flex items-center space-x-2">
                  <Radio className="h-4.5 w-4.5 text-emerald-500 animate-pulse" />
                  <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-neutral-500">{isEn ? "Active Ballot in Real-Time" : "Scrutin Actif en Temps Réel"}</span>
                </div>
                <button
                  type="button"
                  onClick={handleStopBroadcast}
                  className="bg-red-650 hover:bg-red-700 text-white rounded-xl px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider cursor-pointer border-none shadow-sm transition-all active:scale-95 duration-100 animate-pulse"
                  title={isEn ? "Hide ballot and stop voting" : "Masquer le scrutin et arrêter le vote"}
                >
                  {isEn ? "Close Voting" : "Clôturer le Vote"}
                </button>
              </div>

              <div>
                <h4 className="text-sm font-extrabold uppercase tracking-wide text-neutral-900 leading-snug">{activeBroadcast.title}</h4>
                <p className="text-xs text-neutral-500 mt-1">{activeBroadcast.content}</p>
              </div>

              {/* Progress and Bars */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-neutral-50 p-3 border border-neutral-200 rounded-xl shadow-inner">
                  <p className="text-[9px] text-neutral-500 uppercase font-black">{isEn ? "IN FAVOR" : "POUR"}</p>
                  <p className="text-xl font-extrabold text-emerald-600 mt-1">{voteStats.POUR}</p>
                </div>
                <div className="bg-neutral-50 p-3 border border-neutral-200 rounded-xl shadow-inner">
                  <p className="text-[9px] text-neutral-500 uppercase font-black">{isEn ? "AGAINST" : "CONTRE"}</p>
                  <p className="text-xl font-extrabold text-red-600 mt-1">{voteStats.CONTRE}</p>
                </div>
                <div className="bg-neutral-50 p-3 border border-neutral-200 rounded-xl shadow-inner">
                  <p className="text-[9px] text-neutral-500 uppercase font-black">{isEn ? "ABSTENTION" : "ABSTENTION"}</p>
                  <p className="text-xl font-extrabold text-amber-500 mt-1">{voteStats.ABSTENTION}</p>
                </div>
              </div>

              {/* Voting rate */}
              <div className="flex items-center justify-between text-xs font-mono text-neutral-500 font-semibold">
                <span>{isEn ? "Quorum & Participation:" : "Quorum & Participation :"}</span>
                <span>{voteStats.total} / {committee.delegations?.length || 0} {isEn ? "votes" : "votes"} ({voteStats.pct}%)</span>
              </div>
              <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${voteStats.pct}%` }} />
              </div>

              {/* Individual Country votes listing */}
              <div className="pt-3 border-t border-neutral-100">
                <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-2">{isEn ? "Detailed votes per delegation:" : "Détail des votes par délégation :"}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1">
                  {[...(committee.delegations || [])]
                    .filter(d => d.present)
                    .sort((a, b) => a.country.localeCompare(b.country, committee.language === 'EN' ? 'en' : 'fr', { sensitivity: 'base' }))
                    .map(d => {
                    const countryVote = (activeBroadcast.votes || {})[d.country];
                    return (
                      <div key={d.country} className="flex items-center justify-between p-2 bg-neutral-50 border border-neutral-200 rounded-xl text-[10px] font-mono shadow-sm">
                        <span className="text-neutral-700 uppercase truncate max-w-[90px] font-bold">{d.country}</span>
                        {countryVote ? (
                          <span className={`px-1.5 py-0.5 rounded-md font-black text-[9px] ${
                            countryVote === 'POUR' ? 'text-emerald-700 bg-emerald-50' : countryVote === 'CONTRE' ? 'text-red-700 bg-red-50' : 'text-amber-700 bg-amber-50'
                          }`}>
                            {countryVote === 'POUR' && isEn ? 'IN FAVOR' : countryVote === 'CONTRE' && isEn ? 'AGAINST' : countryVote}
                          </span>
                        ) : (
                          <span className="text-neutral-400 italic">{isEn ? "NOT VOTED" : "NON VOTÉ"}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* Active Session card & statistics block */}
          {committee.activeSession && committee.activeSession.active ? (
            <div className="bg-white border border-neutral-200 rounded-[28px] p-6 shadow-sm space-y-6">
              
              {/* Session Core Info */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-neutral-100">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-[10px] px-2.5 py-1 tracking-wider uppercase font-black rounded-full ${
                      committee.activeSession.paused ? 'bg-amber-500 text-white shadow-sm' : 'bg-emerald-600 text-white shadow-sm'
                    }`}>
                      {committee.activeSession.paused ? (isEn ? 'PAUSED' : 'PAUSE') : (isEn ? 'DEBATES IN PROGRESS' : 'DEBATS EN COURS')}
                    </span>
                    {committee.activeSession.proposer && (
                      <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest bg-neutral-100 px-2.5 py-1 rounded-full border border-neutral-200">
                        {isEn ? 'Proposed by:' : 'Proposé par:'} {committee.activeSession.proposer}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-extrabold tracking-tight uppercase text-neutral-950 mt-2">
                    {committee.activeSession.title}
                  </h3>
                </div>

                <div className="text-[9px] font-mono text-neutral-400 uppercase tracking-widest font-bold">
                  ID: {committee.activeSession.id}
                </div>
              </div>

              {/* TIMERS LAYOUT */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 py-2">
                
                {/* Global countdown progress */}
                <div className="border border-neutral-200/80 p-4 rounded-2xl bg-neutral-50/40 relative overflow-hidden flex flex-col justify-between shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black tracking-widest uppercase text-neutral-400">{isEn ? "Global Time" : "Temps global"}</span>
                    <Clock className="h-4 w-4 text-neutral-400" />
                  </div>
                  <div className="my-3 flex items-baseline justify-between gap-2">
                    <div>
                      <span className="text-4xl font-extrabold tracking-tight font-mono text-neutral-950">
                        {formatSec(sessionTimeLeft)}
                      </span>
                      <span className="text-xs text-neutral-400 font-semibold uppercase tracking-widest ml-1">
                        / {formatSec(committee.activeSession.durationTotal)}
                      </span>
                    </div>

                    {joinedRole === 'chair' && (
                      <div className="flex items-center space-x-1">
                        {committee.activeSession.paused ? (
                          <button
                            type="button"
                            onClick={handleStartSessionTimer}
                            className="p-1.5 px-3 bg-neutral-950 hover:bg-neutral-900 rounded-xl text-white text-[10px] font-black uppercase tracking-wide flex items-center space-x-1 cursor-pointer transition-all active:scale-95 duration-100 border-none shadow-md"
                            title={isEn ? "Start global timer" : "Lancer le temps global"}
                          >
                            <Play className="h-3 w-3 fill-current" />
                            <span>PLAY</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handlePauseSessionTimer}
                            className="p-1.5 px-3 bg-amber-500 hover:bg-amber-600 rounded-xl text-white text-[10px] font-black uppercase tracking-wide flex items-center space-x-1 cursor-pointer transition-all active:scale-95 duration-100 border-none shadow-md"
                            title={isEn ? "Pause global timer" : "Pauser le temps global"}
                          >
                            <Pause className="h-3 w-3 fill-current" />
                            <span>PAUSE</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Dynamic Progress Indicator bar */}
                  <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden mt-1 shadow-inner">
                    <div 
                      className="bg-neutral-950 h-full transition-all duration-1000" 
                      style={{ width: `${Math.min(100, (sessionTimeLeft / committee.activeSession.durationTotal) * 100)}%` }}
                    />
                  </div>

                  {joinedRole === 'chair' && (
                    <div className="flex items-center space-x-2 mt-3 pt-2.5 border-t border-neutral-100 text-[9px] font-mono font-bold">
                      <span className="text-neutral-400 uppercase">{isEn ? "Adjust global:" : "Ajuster global :"}</span>
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={adjustTimerMinutes}
                        onChange={(e) => setAdjustTimerMinutes(Math.max(1, Number(e.target.value)))}
                        className="w-12 bg-white border border-neutral-200 rounded-lg px-1.5 py-0.5 text-center font-bold text-neutral-900 outline-none focus:border-neutral-450 focus:bg-white shadow-inner"
                      />
                      <button
                        type="button"
                        onClick={() => handleAdjustGlobalTimer(adjustTimerMinutes)}
                        className="px-2.5 py-0.5 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-100 text-neutral-800 transition-all font-mono font-bold cursor-pointer shadow-sm"
                        title={isEn ? `Add ${adjustTimerMinutes} minute(s)` : `Ajouter ${adjustTimerMinutes} minute(s)`}
                      >
                        +{adjustTimerMinutes}m
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAdjustGlobalTimer(-adjustTimerMinutes)}
                        className="px-2.5 py-0.5 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-100 text-neutral-800 transition-all font-mono font-bold cursor-pointer shadow-sm"
                        title={isEn ? `Remove ${adjustTimerMinutes} minute(s)` : `Enlever ${adjustTimerMinutes} minute(s)`}
                      >
                        -{adjustTimerMinutes}m
                      </button>
                    </div>
                  )}
                </div>

                {/* Individual speaker timer */}
                <div className="border border-neutral-200/80 p-4 rounded-2xl bg-neutral-50/40 relative overflow-hidden flex flex-col justify-between shadow-sm">
                  <div className="flex items-center justify-between font-mono gap-1">
                    <span className="text-[10px] font-black tracking-widest uppercase text-neutral-400">{isEn ? "Individual Speaker" : "Orateur individuel"}</span>
                    <span className="text-[9px] bg-neutral-950 text-white px-2.5 py-0.5 font-extrabold uppercase rounded-full shadow-sm">
                      {getSpeakerLabel()}
                    </span>
                  </div>
                  <div className="my-3 flex items-baseline justify-between gap-2">
                    <div>
                      <span className="text-4xl font-extrabold tracking-tight font-mono text-neutral-950">
                        {formatSec(speakerTimeLeft)}
                      </span>
                      <span className="text-xs text-neutral-400 font-semibold uppercase tracking-widest ml-1">
                        / {formatSec(committee.activeSession.itemSpeakerTime)}
                      </span>
                    </div>

                    {joinedRole === 'chair' && (
                      <div className="flex items-center space-x-1">
                        {(committee.activeSession.speakerPaused !== undefined ? committee.activeSession.speakerPaused : committee.activeSession.paused) ? (
                          <button
                            type="button"
                            onClick={handleStartSpeakerTimer}
                            className="p-1.5 px-3 bg-neutral-950 hover:bg-neutral-900 rounded-xl text-white text-[10px] font-black uppercase tracking-wide flex items-center space-x-1 cursor-pointer transition-all active:scale-95 duration-100 border-none shadow-md"
                            title={isEn ? "Start speaker speaking time" : "Lancer le temps de parole orateur"}
                          >
                            <Play className="h-3 w-3 fill-current" />
                            <span>PLAY</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handlePauseSpeakerTimer}
                            className="p-1.5 px-3 bg-amber-500 hover:bg-amber-600 rounded-xl text-white text-[10px] font-black uppercase tracking-wide flex items-center space-x-1 cursor-pointer transition-all active:scale-95 duration-100 border-none shadow-md"
                            title={isEn ? "Pause speaker speaking time" : "Pauser le temps de parole orateur"}
                          >
                            <Pause className="h-3 w-3 fill-current" />
                            <span>PAUSE</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Progressive speaker timeline bar */}
                  <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden mt-1 shadow-inner">
                    <div 
                      className="bg-neutral-950 h-full transition-all duration-1000" 
                      style={{ width: `${Math.min(100, (speakerTimeLeft / committee.activeSession.itemSpeakerTime) * 100)}%` }}
                    />
                  </div>

                  {joinedRole === 'chair' && (
                    <div className="flex items-center space-x-1.5 mt-3 pt-2.5 border-t border-neutral-100 text-[9px] font-mono font-bold">
                      <span className="text-neutral-400 uppercase">{isEn ? "Adjust speaking:" : "Ajuster parole :"}</span>
                      <button
                        type="button"
                        onClick={async () => {
                          const { activeSession } = committee as any;
                          if (!activeSession) return;
                          try {
                            const now = Date.now();
                            const spkPaused = activeSession.speakerPaused !== undefined ? !!activeSession.speakerPaused : !!activeSession.paused;
                            const spkLastUpdated = activeSession.speakerLastUpdated || activeSession.lastUpdated || now;
                            let currentLeft = activeSession.speakerDurationLeft;
                            if (currentLeft === undefined) {
                              currentLeft = Math.max(0, (activeSession.itemSpeakerTime || 0) - (activeSession.currentSpeakerTimeUsed || 0));
                            }
                            if (!spkPaused) {
                              const elapsed = Math.floor((now - spkLastUpdated) / 1000);
                              currentLeft = Math.max(0, currentLeft - elapsed);
                            }
                            await updateDoc(doc(db, 'committees', committeeId), {
                              'activeSession.speakerDurationLeft': currentLeft + 30,
                              'activeSession.speakerLastUpdated': now
                            });
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                        className="px-2 py-0.5 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-100 text-neutral-800 font-mono font-bold transition-all cursor-pointer"
                        title={isEn ? "Add 30 seconds of speaking time for the current speaker" : "Ajouter 30 secondes de parole pour l'orateur en cours"}
                      >
                        +30s
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const { activeSession } = committee as any;
                          if (!activeSession) return;
                          try {
                            const now = Date.now();
                            const spkPaused = activeSession.speakerPaused !== undefined ? !!activeSession.speakerPaused : !!activeSession.paused;
                            const spkLastUpdated = activeSession.speakerLastUpdated || activeSession.lastUpdated || now;
                            let currentLeft = activeSession.speakerDurationLeft;
                            if (currentLeft === undefined) {
                              currentLeft = Math.max(0, (activeSession.itemSpeakerTime || 0) - (activeSession.currentSpeakerTimeUsed || 0));
                            }
                            if (!spkPaused) {
                              const elapsed = Math.floor((now - spkLastUpdated) / 1000);
                              currentLeft = Math.max(0, currentLeft - elapsed);
                            }
                            await updateDoc(doc(db, 'committees', committeeId), {
                              'activeSession.speakerDurationLeft': Math.max(0, currentLeft - 30),
                              'activeSession.speakerLastUpdated': now
                            });
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                        className="px-2 py-0.5 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-100 text-neutral-800 font-mono font-bold transition-all cursor-pointer"
                        title={isEn ? "Reduce by 30 seconds the speaking time of the current speaker" : "Réduire de 30 secondes de parole de l'orateur en cours"}
                      >
                        -30s
                      </button>
                    </div>
                  )}
                </div>

              </div>

              {/* Dynamic Speakers list queue */}
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-neutral-100">
                  <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">{isEn ? "Speakers' List" : "Liste des Orateurs"} ({committee.activeSession.speakers?.length || 0})</span>
                  {joinedRole === 'chair' && (
                    <button 
                      onClick={handleNextSpeaker}
                      className="text-[10px] font-extrabold text-neutral-950 hover:underline uppercase tracking-wider flex items-center space-x-1 cursor-pointer bg-transparent border-none"
                      title={isEn ? "Force passing to the chronologically next speaker" : "Forcer le passage à l'orateur suivant chronologiquement"}
                    >
                      <span>{isEn ? "Next speaker" : "Prochain orateur"}</span>
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 py-2 max-h-40 overflow-y-auto">
                  {committee.activeSession.speakers && committee.activeSession.speakers.length > 0 ? (
                    committee.activeSession.speakers.map((spk, idx) => {
                      const isCurrent = idx === committee.activeSession?.currentSpeakerIndex;
                      const hasSpoken = idx < (committee.activeSession?.currentSpeakerIndex || 0);

                       return (
                        <div 
                          key={`${spk}-${idx}`} 
                          className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border rounded-xl transition-all flex items-center shrink-0 ${
                            isCurrent 
                              ? 'bg-neutral-950 border-neutral-950 text-white scale-102 shadow-md' 
                              : hasSpoken 
                                ? 'bg-neutral-100 border-neutral-150 text-neutral-400 line-through'
                                : 'bg-white border-neutral-200 text-neutral-700 shadow-sm'
                          }`}
                        >
                          {isCurrent && <Radio className="h-3 w-3.5 animate-pulse text-emerald-400 mr-1.5 inline" />}
                          <span>{spk}</span>

                          {/* Reordering and removal controls for the Chair */}
                          {joinedRole === 'chair' && (
                            <div className={`flex items-center space-x-1 ml-2 border-l pl-2 ${
                              isCurrent ? 'border-neutral-800' : 'border-neutral-200'
                            }`}>
                              {idx > 0 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveSpeakerEarlier(idx);
                                  }}
                                  className={`p-0.5 rounded transition-colors cursor-pointer flex items-center justify-center ${
                                    isCurrent ? 'text-neutral-400 hover:text-white hover:bg-neutral-800' : 'text-neutral-500 hover:text-neutral-950 hover:bg-neutral-100'
                                  }`}
                                  title={isEn ? "Move forward (earlier)" : "Déplacer vers l'avant (plus tôt)"}
                                >
                                  <ChevronLeft className="h-3.5 w-3.5" />
                                </button>
                              )}
                              {idx < committee.activeSession.speakers.length - 1 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveSpeakerLater(idx);
                                  }}
                                  className={`p-0.5 rounded transition-colors cursor-pointer flex items-center justify-center ${
                                    isCurrent ? 'text-neutral-400 hover:text-white hover:bg-neutral-800' : 'text-neutral-500 hover:text-neutral-950 hover:bg-neutral-100'
                                  }`}
                                  title={isEn ? "Move backward (later)" : "Déplacer vers l'arrière (plus tard)"}
                                >
                                  <ChevronRight className="h-3.5 w-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveSpeaker(idx);
                                }}
                                className={`p-0.5 rounded transition-colors cursor-pointer flex items-center justify-center text-red-500 ${
                                  isCurrent ? 'hover:bg-red-950/80 hover:text-red-400' : 'hover:bg-red-50 hover:text-red-600'
                                }`}
                                title={isEn ? "Remove" : "Retirer"}
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <span className="text-xs text-neutral-400 italic font-semibold py-1">{isEn ? "No speaker in queue currently." : "Aucun orateur dans la file pour le moment."}</span>
                  )}
                </div>

                {/* Delegate participation triggers */}
                {joinedRole === 'delegate' && (
                  <div className="pt-2 animate-fade-in">
                    {committee.activeSession.speakers?.includes(joinedCountry) ? (
                      <button 
                        disabled
                        className="w-full bg-neutral-100 text-neutral-400 py-3 text-xs font-black uppercase tracking-widest transition-all rounded-2xl cursor-not-allowed border-none"
                      >
                        {isEn ? "REGISTERED IN THE SPEAKERS' LIST \u2022 WAITING" : "INSCRIT DANS LA LISTE DES ORATEURS \u2022 EN ATTENTE"}
                      </button>
                    ) : isDebateStarted ? (
                      <button 
                        disabled
                        className="w-full bg-red-50 text-red-650 border border-red-200/60 py-3 text-xs font-black uppercase tracking-widest transition-all rounded-2xl cursor-not-allowed"
                      >
                        {isEn ? "REGISTRATIONS CLOSED \u2022 THE DEBATE HAS STARTED" : "INSCRIPTIONS CLOSES \u2022 LE DÉBAT A COMMENCÉ"}
                      </button>
                    ) : (
                      <button 
                        onClick={handleDelegateParticipate}
                        className="w-full bg-neutral-950 hover:bg-neutral-900 text-white py-3 text-xs font-black uppercase tracking-widest transition-all rounded-2xl cursor-pointer shadow-md border-none"
                      >
                        {isEn ? "REQUEST THE FLOOR (REGISTER)" : "DEMANDER LA PAROLE (S'INSCRIRE)"}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* CHAIR ACTIONS CONTROLLER AREA */}
              {joinedRole === 'chair' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-neutral-100 font-mono">
                  {committee.activeSession.paused ? (
                    <button 
                      onClick={handleStartAllTimers}
                      className="bg-neutral-950 hover:bg-neutral-900 text-white border-none py-3 text-xs font-black uppercase tracking-widest cursor-pointer flex items-center justify-center space-x-1.5 rounded-xl transition-all shadow-md active:scale-95 duration-100"
                      title={isEn ? "Launch both timers simultaneously" : "Lancer les deux timers en même temps"}
                    >
                      <Play className="h-3.5 w-3.5" />
                      <span>{isEn ? "Start all" : "Démarrer tout"}</span>
                    </button>
                  ) : (
                    <button 
                      onClick={handlePauseAllTimers}
                      className="bg-amber-600 hover:bg-amber-700 text-white border-none py-3 text-xs font-black uppercase tracking-widest cursor-pointer flex items-center justify-center space-x-1.5 rounded-xl transition-all shadow-md active:scale-95 duration-100"
                      title={isEn ? "Pause both timers" : "Pauser les deux timers"}
                    >
                      <Pause className="h-3.5 w-3.5" />
                      <span>{isEn ? "Pause All" : "Pause Tout"}</span>
                    </button>
                  )}

                  <button 
                    onClick={handleResetSpeakerTimer}
                    className="border border-neutral-200 hover:bg-neutral-50 text-neutral-800 py-3 text-xs font-black uppercase tracking-widest cursor-pointer flex items-center justify-center space-x-1.5 rounded-xl transition-all shadow-sm active:scale-95 duration-100 bg-white"
                    title={isEn ? "Reset current speaker" : "Remettre à zéro l'orateur actuel"}
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-neutral-600" />
                    <span>{isEn ? "Speaker" : "Orateur"}</span>
                  </button>

                  <button 
                    onClick={handleNextSpeaker}
                    className="border border-neutral-200 hover:bg-neutral-50 text-neutral-800 py-3 text-xs font-black uppercase tracking-widest cursor-pointer flex items-center justify-center space-x-1.5 rounded-xl transition-all shadow-sm active:scale-95 duration-100 bg-white"
                    title={isEn ? "Skip the current speaker" : "Sauter l'orateur en cours"}
                  >
                    <ChevronRight className="h-3.5 w-3.5 text-neutral-600" />
                    <span>{isEn ? "Next" : "Suivant"}</span>
                  </button>

                  <button 
                    onClick={handleFinishSession}
                    className="border border-neutral-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200 py-3 text-xs font-black uppercase tracking-widest cursor-pointer flex items-center justify-center space-x-1.5 rounded-xl transition-all shadow-sm active:scale-95 duration-100 bg-white text-neutral-700"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>{isEn ? "Close" : "Fermer"}</span>
                  </button>
                </div>
              )}

            </div>
          ) : (
            // If no active session, show pristine placeholder or session composition panel (if chair)
            <div className="bg-white border border-neutral-200 rounded-[28px] p-8 text-center space-y-4 shadow-sm animate-fade-in">
              <Clock className="h-8 w-8 text-neutral-350 mx-auto" />
              <h4 className="text-xs font-black uppercase tracking-widest text-neutral-400">{isEn ? "No active debate" : "Aucun débat ouvert"}</h4>
              <p className="text-neutral-500 font-semibold text-xs leading-relaxed max-w-sm mx-auto">
                {joinedRole === 'chair' 
                  ? (isEn ? 'Configure the settings below to launch a structured debate session.' : 'Entrez les paramètres ci-dessous pour lancer une séance de débat réglémentée.')
                  : (isEn ? 'Please wait for a member of the Chair to open a debate session to participate.' : 'Veuillez patienter qu’un membre de la Présidence n’ouvre une séance de débats pour participer.')}
              </p>
            </div>
          )}

          {/* TWO MAIN MODULE TABS - SESSION MANAGEMENT vs REGISTRY MEMBERS */}
          {joinedRole === 'chair' && (
            <div className="bg-white border border-neutral-200 rounded-[28px] shadow-sm overflow-hidden animate-fade-in">
              {/* Tab Navigation */}
              <div className="flex border-b border-neutral-100 bg-neutral-50/50">
                <button 
                  onClick={() => setActiveTabMain('session')}
                  className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
                    activeTabMain === 'session' 
                      ? 'border-b-2 border-neutral-950 text-neutral-950 bg-white font-black shadow-inner' 
                      : 'text-neutral-400 hover:text-neutral-700 font-bold'
                  }`}
                >
                  {t.tabSession}
                </button>
                <button 
                  onClick={() => setActiveTabMain('members')}
                  className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
                    activeTabMain === 'members' 
                      ? 'border-b-2 border-neutral-950 text-neutral-950 bg-white font-black shadow-inner' 
                      : 'text-neutral-400 hover:text-neutral-700 font-bold'
                  }`}
                >
                  {t.tabMembers}
                </button>
                <button 
                  onClick={() => setActiveTabMain('grades')}
                  className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
                    activeTabMain === 'grades' 
                      ? 'border-b-2 border-neutral-950 text-neutral-950 bg-white font-black shadow-inner' 
                      : 'text-neutral-400 hover:text-neutral-700 font-bold'
                  }`}
                >
                  {t.tabGrades}
                </button>
              </div>

              {/* Tab Content 1: Debates composition */}
              {activeTabMain === 'session' && (
                <div className="p-6 space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-neutral-400">{t.configSessionHeader}</h4>
                  
                  <form onSubmit={handleCreateSession} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">{isEn ? "Session Title" : "Intitulé de la session"}</label>
                        <input 
                          type="text"
                          required
                          placeholder={isEn ? "EX. GEOPOLITICAL SECURITY DEBATE" : "EX. DÉBAT SÉCURITÉ GÉOPOLITIQUE"}
                          value={sessionTitle}
                          onChange={(e) => setSessionTitle(e.target.value)}
                          className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wider text-neutral-900 placeholder-neutral-400 outline-none focus:border-neutral-450 focus:bg-white transition-all shadow-inner"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">{isEn ? "Proposing Delegation (optional)" : "Délégation proposante (facultatif)"}</label>
                        <input 
                          type="text"
                          placeholder={isEn ? "EX. FRANCE / PROPOSING STATE" : "EX. FRANCE / PAYS PROPOSANT"}
                          value={sessionProposer}
                          onChange={(e) => setSessionProposer(e.target.value)}
                          className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wider text-neutral-900 placeholder-neutral-400 outline-none focus:border-neutral-450 focus:bg-white transition-all shadow-inner"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">{isEn ? "Global Duration (in minutes)" : "Durée globale (en minutes)"}</label>
                        <input 
                          type="number"
                          required
                          value={sessionDurationMin}
                          onChange={(e) => setSessionDurationMin(Number(e.target.value))}
                          className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-neutral-900 outline-none focus:border-neutral-455 focus:bg-white transition-all shadow-inner"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">{isEn ? "Individual Speaking Time (in seconds)" : "Temps de parole individuel (en secondes)"}</label>
                        <input 
                          type="number"
                          required
                          value={sessionSpeakerSec}
                          onChange={(e) => setSessionSpeakerSec(Number(e.target.value))}
                          className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-neutral-900 outline-none focus:border-neutral-455 focus:bg-white transition-all shadow-inner"
                        />
                      </div>
                    </div>

                    <button 
                      type="submit"
                      className="w-full bg-neutral-950 hover:bg-neutral-900 border-none py-3 text-xs font-black uppercase tracking-widest text-white transition-all rounded-xl cursor-pointer shadow-md active:scale-[0.99]"
                    >
                      {isEn ? "DEPLOY THE LIVE SESSION" : "DÉPLOYER LA SÉANCE LIVE"}
                    </button>
                  </form>

                  {/* Past Sessions History */}
                  <div className="pt-6 border-t border-neutral-100">
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-4">{isEn ? "Debate Sessions History" : "Historique des Sessions de Débats"} ({sessionsHistory.length})</h5>

                    {sessionsHistory.length === 0 ? (
                      <p className="text-xs text-neutral-400 italic">{isEn ? "No sessions registered in history." : "Aucune session enregistrée dans l'historique."}</p>
                    ) : (
                      <div className="space-y-3.5 max-h-80 overflow-y-auto pr-1">
                        {sessionsHistory.map((s) => (
                          <div key={s.id} className="p-4 border border-neutral-200 rounded-2xl bg-neutral-50/40 flex flex-col justify-between gap-3 relative shadow-sm">
                            <div className="flex items-start justify-between">
                              <div>
                                <h6 className="text-xs font-black text-neutral-950 uppercase tracking-wide font-sans">{s.title}</h6>
                                <p className="text-[9px] text-neutral-400 uppercase tracking-widest font-black mt-1 bg-white px-2 py-0.5 rounded-full border border-neutral-100 inline-block">
                                  {isEn ? "PROPOSED BY:" : "PROPOSANT:"} <span className="text-neutral-700">{s.proposer || 'N/A'}</span>
                                </p>
                              </div>
                              {joinedRole === 'chair' && (
                                confirmDeleteSessionId === s.id ? (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteHistoricSession(s.id)}
                                    className="bg-red-600 hover:bg-red-700 text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-xl transition-all cursor-pointer shadow-sm animate-pulse"
                                    title={isEn ? "Confirm permanent deletion" : "Confirmer la suppression définitive"}
                                  >
                                    {isEn ? "Confirm?" : "Confirmer?"}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteHistoricSession(s.id)}
                                    className="text-neutral-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-xl transition-all cursor-pointer bg-white border border-neutral-200 shadow-sm"
                                    title={isEn ? "Delete this history record" : "Supprimer cet historique"}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )
                              )}
                            </div>

                            {/* Participating Countries Tag Badges */}
                            <div className="space-y-1.5 pt-2.5 border-t border-neutral-100">
                              <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest">{isEn ? "Participating nations:" : "Pays participants :"}</p>
                              <div className="flex flex-wrap gap-1">
                                {s.speakers && s.speakers.length > 0 ? (
                                  Array.from(new Set<string>(s.speakers)).map((spk) => (
                                    <span key={spk} className="px-2 py-0.5 text-[9px] bg-white border border-neutral-200 text-neutral-700 font-bold uppercase rounded-lg shadow-sm">
                                      {spk}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-[9px] text-neutral-400 italic font-semibold">{isEn ? "No nation took the floor." : "Aucun pays n'a pris la parole."}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab Content 2: Members Register */}
              {activeTabMain === 'members' && (
                <div className="p-6 space-y-6">
                  
                  {/* Register Form addition */}
                  <form onSubmit={handleAddDelegation} className="space-y-4 pt-2 border-b border-neutral-150/60 pb-6">
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{isEn ? "Register a new delegation" : "Inscrire une nouvelle délégation"}</h5>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <input 
                          type="text"
                          required
                          placeholder={isEn ? "Country name (e.g. United Kingdom)" : "Nom pays (ex. Royaume-Uni)"}
                          value={newCountry}
                          onChange={(e) => setNewCountry(e.target.value)}
                          className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wider text-neutral-900 placeholder-neutral-400 outline-none focus:border-neutral-450 focus:bg-white transition-all shadow-inner"
                        />
                      </div>
                      <div>
                        <input 
                          type="text"
                          placeholder={isEn ? "Delegation password (e.g. UK2026)" : "Mdp delegation (ex. UK2026)"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-semibold text-neutral-900 placeholder-neutral-400 outline-none focus:border-neutral-450 focus:bg-white transition-all shadow-inner"
                        />
                      </div>
                      <div>
                        <select
                          value={newPresence}
                          onChange={(e: any) => setNewPresence(e.target.value)}
                          className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wider text-neutral-800 outline-none focus:border-neutral-450 focus:bg-white transition-all shadow-inner"
                        >
                          <option value="présence">{isEn ? "Present" : "Présent"}</option>
                          <option value="absence">{isEn ? "Absent" : "Absent"}</option>
                          <option value="votant">{isEn ? "Present & Voting" : "Présent & Votant"}</option>
                        </select>
                      </div>
                    </div>

                    <button 
                      type="submit"
                      className="w-full bg-white border border-neutral-250 hover:bg-neutral-50 rounded-xl py-2.5 text-xs font-black uppercase tracking-widest text-neutral-800 transition-all cursor-pointer shadow-sm active:scale-[0.99]"
                    >
                      {isEn ? "REGISTER DELEGATION TO THE REGISTRY" : "INSCRIRE LA DÉLÉGATION AU REGISTRE"}
                    </button>
                  </form>

                  {/* List of current delegations */}
                  <div className="space-y-3">
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{isEn ? "Registered Delegation Registry" : "Registre des inscrits"}</h5>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                      {committee.delegations && committee.delegations.length > 0 ? (
                        [...committee.delegations]
                          .sort((a, b) => a.country.localeCompare(b.country, committee.language === 'EN' ? 'en' : 'fr', { sensitivity: 'base' }))
                          .map((del) => {
                          const isSuspended = committee.suspendedDelegations?.includes(del.country);
                          return (
                            <div 
                              key={del.country}
                              className={`p-4 border rounded-[22px] flex flex-col justify-between space-y-3 shadow-sm transition-all ${
                                isSuspended 
                                  ? 'border-red-200 bg-red-50/20' 
                                  : 'border-neutral-200 bg-neutral-55/10 bg-gradient-to-br from-white to-neutral-50/20'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="space-y-0.5">
                                  <h6 className="text-xs font-extrabold uppercase tracking-wide text-neutral-950">{del.country}</h6>
                                  {del.password && (
                                    <p className="text-[9px] font-mono text-neutral-400 font-bold bg-white px-1.5 py-0.5 rounded-lg border border-neutral-100 inline-block mt-0.5 lowercase">mdp: {del.password}</p>
                                  )}
                                </div>
                                
                                {confirmDeleteDelegationCountry === del.country ? (
                                  <button 
                                    onClick={() => handleDeleteDelegation(del.country)}
                                    className="bg-red-600 hover:bg-red-700 text-white text-[8px] font-black uppercase tracking-wider px-2 py-1 rounded-xl border-none transition-all cursor-pointer shadow-md animate-pulse"
                                    title={isEn ? "Confirm deletion" : "Confirmer la suppression"}
                                  >
                                    {isEn ? "Confirm?" : "Confirmer?"}
                                  </button>
                                ) : (
                                  <button 
                                    onClick={() => handleDeleteDelegation(del.country)}
                                    className="text-neutral-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-xl transition-all cursor-pointer bg-white border border-neutral-200 shadow-sm"
                                    title={isEn ? "Delete delegation" : "Supprimer la délégation"}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>

                              {/* Configuration presence */}
                              <div className="flex items-center justify-between pt-2 border-t border-neutral-100 font-mono text-[9px] gap-2">
                                <div className="flex space-x-1">
                                  <button 
                                    onClick={() => handleTogglePresence(del.country, 'absent')}
                                    className={`px-2 py-1 rounded-lg font-black border transition-all cursor-pointer text-[9px] ${!del.present ? 'bg-red-600 text-white border-red-600' : 'text-neutral-500 bg-white border-neutral-200 hover:bg-neutral-50'}`}
                                  >
                                    {isEn ? "ABSENT" : "ABSENT"}
                                  </button>
                                  <button 
                                    onClick={() => handleTogglePresence(del.country, 'present')}
                                    className={`px-2 py-1 rounded-lg font-black border transition-all cursor-pointer text-[9px] ${del.present && !del.voting ? 'bg-amber-500 text-white border-amber-500' : 'text-neutral-500 bg-white border-neutral-200 hover:bg-neutral-50'}`}
                                  >
                                    {isEn ? "PRESENT" : "PRÉSENT"}
                                  </button>
                                  <button 
                                    onClick={() => handleTogglePresence(del.country, 'voting')}
                                    className={`px-2 py-1 rounded-lg font-black border transition-all cursor-pointer text-[9px] ${del.present && del.voting ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'text-neutral-500 bg-white border-neutral-200 hover:bg-neutral-50'}`}
                                  >
                                    {isEn ? "VOTING" : "VOTANT"}
                                  </button>
                                </div>

                                <button 
                                  onClick={() => handleToggleDelegationSuspension(del.country)}
                                  className={`px-2 py-1 rounded-lg border font-black tracking-wider transition-all cursor-pointer text-[9px] ${
                                    isSuspended 
                                      ? 'bg-red-800 text-white border-red-800' 
                                      : 'text-neutral-500 bg-white border-neutral-200 hover:border-red-400 hover:text-red-600'
                                  }`}
                                >
                                  {isSuspended ? (isEn ? 'SUSPENDED' : 'SUSPENDU') : (isEn ? 'SUSPEND' : 'SUSPENDRE')}
                                </button>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs font-semibold text-neutral-400 italic">{isEn ? "No delegation registered in this committee." : "Aucune délégation inscrite dans ce comité."}</p>
                      )}
                    </div>
                  </div>

                </div>
              )}

              {/* Tab Content 3: Grading / Notation View */}
              {activeTabMain === 'grades' && (
                <div className="p-6 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-neutral-100 pb-4 gap-4">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-neutral-400 font-extrabold pb-0.5">{t.gradesHeader}</h4>
                      <p className="text-[10px] text-neutral-500 mt-0.5 font-medium">{t.gradesSubtitle}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[9px] font-black px-2.5 py-1 rounded-lg font-mono bg-neutral-100 text-neutral-600 border border-neutral-200">
                        {t.evaluatedDelegationsLabel} : {committee.delegations?.length || 0}
                      </span>
                    </div>
                  </div>

                  <div className="border border-neutral-200 rounded-[22px] overflow-hidden bg-white shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-neutral-50/75 border-b border-neutral-200 text-[9px] font-black uppercase tracking-wider text-neutral-500">
                            <th className="p-3.5 pl-4">{t.tableColDelegation}</th>
                            <th className="p-3.5 w-16 text-center">G1</th>
                            <th className="p-3.5 w-16 text-center">G2</th>
                            <th className="p-3.5 w-16 text-center">G3</th>
                            <th className="p-3.5 w-16 text-center">G4</th>
                            <th className="p-3.5 w-16 text-center">{t.tableColAvg}</th>
                            <th className="p-3.5">{t.tableColComment}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {committee.delegations && committee.delegations.length > 0 ? (
                            [...committee.delegations]
                              .sort((a, b) => a.country.localeCompare(b.country, committee.language === 'EN' ? 'en' : 'fr', { sensitivity: 'base' }))
                              .map((del: any) => (
                              <GradeRow
                                key={del.country}
                                country={del.country}
                                grades={(committee as any).grades?.[del.country] || {}}
                                onUpdateGrade={handleUpdateGrade}
                                onUpdateComment={handleUpdateComment}
                                calculateAverage={calculateAverage}
                                language={committee.language}
                              />
                            ))
                          ) : (
                            <tr>
                              <td colSpan={7} className="p-8 text-center text-xs font-semibold text-[#999999] italic">
                                {t.gradesEmptyLabel}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* DELEGATE INTERACTION MODULE COURES (Only visible if normal active session) */}
          {joinedRole === 'delegate' && (
            <div className="bg-white border border-neutral-200 rounded-[28px] p-6 shadow-sm space-y-4 animate-fade-in">
              <h4 className="text-xs font-black uppercase tracking-wider text-neutral-400">{isEn ? "Council Status" : "Statut du Conseil"}</h4>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-1 font-mono text-[10px] tracking-wider text-center">
                <div className="p-3.5 bg-neutral-50/50 rounded-2xl border border-neutral-200 shadow-sm flex flex-col justify-center">
                  <p className="text-[9px] text-neutral-400 uppercase font-black">{isEn ? "Registered Nations" : "Pays Inscrits"}</p>
                  <p className="text-lg font-black text-neutral-950 mt-1">{committee.delegations?.length || 0}</p>
                </div>

                <div className="p-3.5 bg-neutral-50/50 rounded-2xl border border-neutral-200 shadow-sm flex flex-col justify-center">
                  <p className="text-[9px] text-neutral-400 uppercase font-black">{isEn ? "Official Presence" : "Présences Réglémentaires"}</p>
                  <p className="text-lg font-black text-emerald-600 mt-1">
                    {committee.delegations?.filter(d => d.present).length || 0}
                  </p>
                </div>

                <div className="p-3.5 bg-neutral-50/50 rounded-2xl border border-neutral-200 shadow-sm flex flex-col justify-center">
                  <p className="text-[9px] text-neutral-400 uppercase font-black">{isEn ? "Present & Voting" : "Présents & Votants"}</p>
                  <p className="text-lg font-black text-indigo-600 mt-1">
                    {committee.delegations?.filter(d => d.present && d.voting).length || 0}
                  </p>
                </div>

                <div className="p-3.5 bg-neutral-50/50 rounded-2xl border border-neutral-200 shadow-sm flex flex-col justify-center">
                  <p className="text-[9px] text-neutral-400 uppercase font-black">{isEn ? "Live Link Status" : "État Liaison Live"}</p>
                  <p className="text-xs font-black text-emerald-600 flex items-center justify-center space-x-1 mt-2">
                    <span className="h-1.5 w-1.5 bg-emerald-600 rounded-full animate-ping mr-1" strokeWidth={2} />
                    <span>{isEn ? "STABLE" : "STABLE"}</span>
                  </p>
                </div>
              </div>
            </div>
          )}

        </section>

        {/* COLUMN RIGHT (SPACE LATÉRAL): COMMUNICATIONS & CONTENUS (SIZE 4 on lg) */}
        <section className="lg:col-span-4 flex flex-col bg-white border border-neutral-200 rounded-[28px] shadow-sm relative min-h-[500px] overflow-hidden">
          
          {/* Side Tab Switcher */}
          <div className="flex border-b border-neutral-100 bg-neutral-50 p-1.5 gap-1.5">
            <button 
              onClick={() => setActiveTabSide('messages')}
              className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-wider text-center transition-all cursor-pointer rounded-2xl ${
                activeTabSide === 'messages' 
                  ? 'bg-white text-neutral-950 font-black shadow-sm border border-neutral-200/50' 
                  : 'text-neutral-400 hover:text-neutral-700 font-bold'
              }`}
            >
              {isEn ? "Messages" : "Messages"}
            </button>
            <button 
              onClick={() => setActiveTabSide('gossip')}
              className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-wider text-center transition-all relative cursor-pointer rounded-2xl ${
                activeTabSide === 'gossip' 
                  ? 'bg-white text-neutral-950 font-black shadow-sm border border-neutral-200/50' 
                  : 'text-neutral-400 hover:text-neutral-700 font-bold'
              }`}
            >
              {isEn ? "Gossip Box" : "Gossip Box"}
              {gossips.length > 0 && (
                <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 bg-amber-500 rounded-full animate-pulse shadow-sm" />
              )}
            </button>
            <button 
              onClick={() => setActiveTabSide('resolutions')}
              className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-wider text-center transition-all cursor-pointer rounded-2xl ${
                activeTabSide === 'resolutions' 
                  ? 'bg-white text-neutral-950 font-black shadow-sm border border-neutral-200/50' 
                  : 'text-neutral-400 hover:text-neutral-700 font-bold'
              }`}
            >
              {isEn ? "Resolutions" : "Résolutions"}
            </button>
          </div>

          {/* TAB 1 CONTENT: MESSAGES & POINTS OF PRIVILEGE */}
          {activeTabSide === 'messages' && (
            <div className="p-5 flex flex-col flex-1 min-h-[460px] justify-between">
              
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2.5 border-b border-neutral-100">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-[#999999]">{isEn ? "COMMITTEE MESSAGING" : "MESSAGERIE DU COMITÉ"}</h4>
                  
                  {/* Message filters for chair */}
                  {joinedRole === 'chair' && (
                    <select 
                      value={msgFilterType}
                      onChange={(e: any) => setMsgFilterType(e.target.value)}
                      className="text-[9px] font-black uppercase tracking-widest bg-neutral-50 border border-neutral-200 rounded-lg p-1.5 cursor-pointer outline-none text-neutral-700"
                    >
                      <option value="all">{isEn ? "FILTER: ALL" : "FILTRE: TOUT"}</option>
                      <option value="message">{isEn ? "ONLY MSG" : "UNIQUEMENT MSG"}</option>
                      <option value="privilege">{isEn ? "PERSONAL PRIVILEGE" : "PRIVILÈGE PERSO"}</option>
                    </select>
                  )}
                </div>

                {/* Messages Live Feed LIST */}
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {messages
                    .filter(m => {
                      if (joinedRole === 'chair') {
                        // Allow filtering by category
                        if (msgFilterType === 'all') return true;
                        return m.type === msgFilterType;
                      } else {
                        // Delegate only sees messages custom-targeted to their country, or sent by them!
                        return m.target === joinedCountry || m.sender === joinedCountry;
                      }
                    })
                    .map((m) => {
                      const isPrivilege = m.type === 'privilege';
                      const isFromPresident = m.sender === 'Bureau de la Présidence';

                      return (
                        <div 
                          key={m.id}
                          className="p-3.5 relative flex flex-col space-y-1.5 rounded-2xl border border-neutral-200/80 bg-white text-neutral-950 shadow-sm hover:border-neutral-300 transition-all"
                        >
                          <div className="flex items-center justify-between font-sans">
                            <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400 bg-neutral-50 px-2 py-0.5 rounded-lg border border-neutral-100">
                              {m.sender} 
                              {m.target && m.target !== 'all' && ` ➔ ${m.target}`}
                            </span>
                            
                            <div className="flex items-center space-x-1.5 font-mono text-[8px] text-neutral-400">
                              {isPrivilege && (
                                <span className="bg-amber-500 text-white px-2 py-0.5 font-bold rounded-lg text-[8px] tracking-wide uppercase shadow-sm">{isEn ? "PRIVILEGE" : "PRIVILÈGE"}</span>
                              )}
                              <span>{formatSec(Math.round(m.createdAt / 1000) % 3600)}</span>
                              
                              {joinedRole === 'chair' && (
                                <button 
                                  onClick={() => handleDeleteMessage(m.id)}
                                  className="text-red-650 hover:underline hover:text-red-700 ml-1.5 select-none font-bold cursor-pointer"
                                >
                                  {isEn ? "Remove" : "Retirer"}
                                </button>
                              )}
                            </div>
                          </div>

                          <p className="text-xs leading-relaxed break-words font-semibold text-neutral-950 font-sans pl-1">{m.text}</p>
                          
                          {/* Fast answer dialog for chair */}
                          {joinedRole === 'chair' && m.sender !== 'Bureau de la Présidence' && (
                            <button 
                              onClick={() => {
                                const ansText = prompt(isEn ? `Reply privately to ${m.sender}:` : `Répondre en privé à ${m.sender}:`);
                                if (ansText) handleSendPresidentFastMessage(m.sender, ansText);
                              }}
                              className="text-left text-[9px] font-extrabold uppercase text-neutral-800 hover:text-black hover:underline mt-1 font-sans pl-1 cursor-pointer"
                            >
                              {isEn ? "Reply privately ➔" : "Répondre en privé ➔"}
                            </button>
                          )}
                        </div>
                      );
                    })}

                  {messages.length === 0 && (
                    <p className="text-xs font-semibold text-neutral-400 italic text-center py-8">{isEn ? "No messages exchanged." : "Aucun message échangé."}</p>
                  )}
                </div>
              </div>

              {/* Message Compose Form */}
              <form onSubmit={handleSendMessage} className="border-t border-neutral-100 pt-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  {joinedRole === 'delegate' ? (
                    <select 
                      value={msgTypeInput}
                      onChange={(e: any) => setMsgTypeInput(e.target.value)}
                      className="text-[10px] font-bold bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-xl p-2 font-sans tracking-wide cursor-pointer outline-none"
                    >
                      <option value="message">{isEn ? "STANDARD MESSAGE" : "MESSAGE STANDARD"}</option>
                      <option value="privilege">{isEn ? "PERSONAL PRIVILEGE POINT" : "POINT DE PRIVILÈGE PERSO"}</option>
                    </select>
                  ) : (
                    <span className="text-[9px] font-bold text-neutral-500 font-mono py-1.5 px-3 bg-neutral-50 border border-neutral-200 rounded-xl uppercase tracking-wide">
                      {isEn ? "DISCREET DIRECT MESSAGE" : "MESSAGE DIRECT DISCRET"}
                    </span>
                  )}

                  {joinedRole === 'chair' && (
                    <select 
                      value={msgTargetInput}
                      onChange={(e) => setMsgTargetInput(e.target.value)}
                      className="text-[10px] font-bold bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-xl p-2 max-w-[150px] cursor-pointer outline-none"
                    >
                      {[...(committee.delegations || [])]
                        .sort((a, b) => a.country.localeCompare(b.country, committee.language === 'EN' ? 'en' : 'fr', { sensitivity: 'base' }))
                        .map(d => (
                          <option key={d.country} value={d.country}>{d.country}</option>
                        ))}
                    </select>
                  )}
                </div>

                <div className="flex gap-2">
                  <input 
                    type="text"
                    required
                    placeholder={msgTypeInput === 'privilege' ? (isEn ? "Explain your point (e.g. air conditioning)" : "Expliquez votre point (ex: climatisation)") : (isEn ? "Type your message..." : "Saisissez votre message...")}
                    value={msgInput}
                    onChange={(e) => setMsgInput(e.target.value)}
                    className="flex-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-semibold text-neutral-900 placeholder-neutral-400 outline-none focus:border-neutral-450 focus:bg-white transition-all shadow-inner"
                  />
                  <button 
                    type="submit"
                    className="bg-neutral-950 text-white hover:bg-neutral-900 border-none px-4 rounded-xl flex items-center justify-center cursor-pointer transition-all active:scale-95 shadow-md"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              </form>

            </div>
          )}

          {/* TAB 2 CONTENT: GOSSIP BOX (ANONYME LIVE FEED) */}
          {activeTabSide === 'gossip' && (
            <div className="p-5 flex flex-col flex-1 justify-between min-h-[460px]">
              
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2.5 border-b border-neutral-100">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-[#999999] flex items-center space-x-2">
                    <span className="h-1.5 w-1.5 bg-amber-500 rounded-full animate-ping" />
                    <span>{isEn ? "Anonymous Gossip Box" : "Gossip Box Anonyme"}</span>
                  </h4>
                  
                  <span className="text-[9px] font-black tracking-widest px-2.5 py-0.5 rounded-full font-mono bg-amber-500/10 text-amber-600 border border-amber-500/10">
                    {committee.gossipEnabled ? (isEn ? 'LIVE OFFICIAL' : 'OFFICIEL LIVE') : (isEn ? 'DISABLED' : 'DÉSACTIVÉ')}
                  </span>
                </div>

                {/* Gossip List Feed */}
                <div className="space-y-3.5 max-h-80 overflow-y-auto pr-1">
                  {gossips.map((g) => (
                    <div 
                      key={g.id}
                      className="p-3.5 bg-[#FAF7F2] border border-secondary-200/50 rounded-2xl relative flex flex-col space-y-1.5 font-serif italic shadow-sm hover:translate-y-[-1px] transition-all duration-150"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] font-mono tracking-wider text-amber-700/80 uppercase not-italic font-black">
                          {isEn ? "Anonymous" : "Anonyme"} &bull; {formatSec(Math.round(g.createdAt / 1000) % 3600)}
                        </span>
                        
                        {joinedRole === 'chair' && (
                          <div className="flex items-center space-x-2 not-italic font-mono text-[8px]">
                            <button 
                              onClick={() => handleProjectGossipPoint(g.text)}
                              className="text-amber-700 hover:text-amber-800 font-black cursor-pointer uppercase bg-white border border-amber-200 shadow-sm px-1.5 py-0.5 rounded-md"
                            >
                              {isEn ? "PROJECT" : "PROJETER"}
                            </button>
                            <button 
                              onClick={() => handleDeleteGossip(g.id)}
                              className="text-red-650 hover:text-red-800 font-extrabold cursor-pointer h-5 w-5 rounded-full hover:bg-red-50 flex items-center justify-center bg-white border border-neutral-200 shadow-sm"
                            >
                              X
                            </button>
                          </div>
                        )}
                      </div>

                      <p className="text-xs text-neutral-800 leading-relaxed font-semibold">“ {g.text} ”</p>
                    </div>
                  ))}

                  {gossips.length === 0 && (
                    <p className="text-xs font-semibold text-neutral-400 italic text-center py-8">{isEn ? "No gossip submitted yet." : "Aucun ragot transmis pour le moment."}</p>
                  )}
                </div>
              </div>

              {/* Compose anonyme message (Delegate) */}
              {joinedRole === 'delegate' ? (
                committee.gossipEnabled ? (
                  <form onSubmit={handleSendGossip} className="border-t border-neutral-100 pt-4 space-y-2">
                    <p className="text-[9px] text-[#999999] uppercase tracking-widest font-bold tracking-widest pl-1">
                      {isEn ? "your identity signature is masked" : "votre signature d'identité est masquée"}
                    </p>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        required
                        placeholder={isEn ? "An anonymous observation on the council..." : "Une observation anonyme sur le conseil..."}
                        value={gossipInput}
                        onChange={(e) => setGossipInput(e.target.value)}
                        className="flex-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2.5 text-xs text-neutral-800 placeholder-neutral-400 outline-none focus:border-neutral-450 focus:bg-white transition-all shadow-inner"
                      />
                      <button 
                        type="submit"
                        className="bg-neutral-950 text-white hover:bg-neutral-900 px-4 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-md transition-all active:scale-95"
                      >
                        {isEn ? "PUBLISH" : "PUBLIER"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="border-t border-neutral-100 pt-5 text-center">
                    <Lock className="h-5 w-5 text-neutral-350 mx-auto" />
                    <p className="text-[10px] text-neutral-400 font-black uppercase tracking-widest mt-2">
                      {isEn ? "Gossip Box Disabled by the Bureau" : "Gossip Box Désactivée par le Bureau"}
                    </p>
                  </div>
                )
              ) : (
                <div className="border-t border-neutral-100 pt-4 text-center font-mono text-[9px] uppercase font-bold text-neutral-400">
                  {isEn ? "Flow controlled from 'Flow Control' action" : "Flux contrôlé depuis l'action \"Contrôle des flux\""}
                </div>
              )}

            </div>
          )}

          {/* TAB 3 CONTENT: RÉSOLUTIONS SUBMISSION & DEBATES REVIEW */}
          {activeTabSide === 'resolutions' && (
            <div className="p-5 flex flex-col flex-1 justify-between min-h-[460px]">
              
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2.5 border-b border-neutral-100">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-[#999999] flex items-center space-x-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    <span>{isEn ? "Resolutions" : "Résolutions"} ({resolutions.length})</span>
                  </h4>

                  <span className="text-[9px] font-black px-2.5 py-0.5 rounded-full font-mono bg-neutral-100 text-neutral-600 border border-neutral-200">
                    {committee.resolutionsEnabled ? (isEn ? 'ACTIVE' : 'ACTIF') : (isEn ? 'DISABLED' : 'DÉSACTIVÉ')}
                  </span>
                </div>

                {/* Resolutions database list */}
                <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1">
                  {resolutions.map((r) => (
                    <div 
                      key={r.id}
                      className="p-3.5 border border-neutral-200 rounded-2xl bg-neutral-55/10 bg-gradient-to-br from-white to-neutral-50/10 relative space-y-2.5 text-left shadow-sm"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h6 className="text-xs font-black text-neutral-950 uppercase tracking-wide truncate max-w-[150px]">{r.title}</h6>
                          <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest mt-0.5">{isEn ? 'Author' : 'Auteur'}: {r.author}</p>
                        </div>
                        
                        <span className={`text-[8px] px-2 py-0.5 rounded-md font-black uppercase tracking-wider ${
                          r.status === 'approved' 
                            ? 'bg-emerald-600 text-white shadow-sm' 
                            : r.status === 'rejected' 
                              ? 'bg-red-650 text-white shadow-sm' 
                              : 'bg-amber-550 bg-amber-500 text-white shadow-sm'
                        }`}>
                          {r.status === 'pending' ? (isEn ? 'PENDING' : 'EN ATTENTE') : r.status === 'approved' ? (isEn ? 'APPROVED' : 'APPROUVÉ') : (isEn ? 'REJECTED' : 'REJETÉ')}
                        </span>
                      </div>

                      {/* Content excerpt preview */}
                      {r.content && (r.content.startsWith('http://') || r.content.startsWith('https://')) ? (
                        <div className="flex items-center space-x-1.5 pt-1">
                          <span className="text-[9px] bg-blue-50 border border-blue-200 text-blue-700 px-2.5 py-1 rounded-lg font-mono font-bold flex items-center space-x-1 uppercase">
                            <FileCheck className="h-3 w-3" />
                            <span>Google Docs</span>
                          </span>
                          <a 
                            href={r.content} 
                            target="_blank" 
                            rel="noreferrer"
                            referrerPolicy="no-referrer"
                            className="text-[10px] text-neutral-500 hover:text-neutral-900 hover:underline font-mono font-black border border-neutral-200 bg-white rounded-lg px-2 py-1 shadow-sm uppercase flex items-center gap-1"
                            style={{ textDecoration: 'none' }}
                          >
                            <span>{isEn ? "View Document \u2192" : "Consulter \u2192"}</span>
                          </a>
                        </div>
                      ) : (
                        <p className="text-[11px] text-neutral-500 line-clamp-3 leading-relaxed whitespace-pre-line font-serif italic border-l-2 border-neutral-250 pl-2">
                          {r.content.replace(/<[^>]*>/g, '')}
                        </p>
                      )}

                      {/* Chair interactive actions */}
                      {joinedRole === 'chair' ? (
                        <div className="flex items-center gap-2.5 pt-2 border-t border-neutral-100 font-mono text-[9px] font-black.">
                          {r.status === 'pending' && (
                            <>
                              <button 
                                onClick={() => handleReviewResolution(r.id, 'approved')}
                                className="text-emerald-700 hover:underline flex items-center space-x-0.5 font-bold cursor-pointer bg-white px-2 py-1 border border-neutral-200 rounded-lg shadow-sm"
                              >
                                <Check className="h-3 w-3 text-emerald-600" />
                                <span>{isEn ? "Approve" : "Approuver"}</span>
                              </button>
                              <button 
                                onClick={() => handleReviewResolution(r.id, 'rejected')}
                                className="text-red-700 hover:underline flex items-center space-x-0.5 font-bold cursor-pointer bg-white px-2 py-1 border border-neutral-200 rounded-lg shadow-sm"
                              >
                                <X className="h-3 w-3 text-red-600" />
                                <span>{isEn ? "Reject" : "Rejeter"}</span>
                              </button>
                            </>
                          )}

                          {r.status === 'approved' && (
                            <button 
                              onClick={() => handleProjectResolutionPoint(r)}
                              className="text-neutral-950 hover:underline font-black flex items-center space-x-1 cursor-pointer bg-white px-2.5 py-1 border border-neutral-250 rounded-lg shadow-sm text-[9px]"
                            >
                              <Eye className="h-3 w-3" />
                              <span>{isEn ? "PROJECT ON BOARD" : "PROJETER SÉANCE"}</span>
                            </button>
                          )}

                          <button 
                            onClick={() => handleDeleteResolution(r.id)}
                            className="text-neutral-400 hover:text-red-600 ml-auto cursor-pointer"
                          >
                            {isEn ? "Delete" : "Supprimer"}
                          </button>
                        </div>
                      ) : (
                        r.status === 'approved' && (
                          <div className="pt-1.5 text-[9px] font-mono font-bold text-neutral-400 uppercase tracking-widest">
                            {isEn ? "Approved by the Chair \u2022 Ready to Project" : "Approuvé par la Présidence \u2022 Disponible à la projection"}
                          </div>
                        )
                      )}
                    </div>
                  ))}

                  {resolutions.length === 0 && (
                    <p className="text-xs font-semibold text-neutral-400 italic text-center py-8">{isEn ? "No draft submitted to the Secretariat." : "Aucun texte soumis au Secrétariat."}</p>
                  )}
                </div>
              </div>

              {/* Compose resolution block */}
              {joinedRole === 'delegate' ? (
                committee.resolutionsEnabled ? (
                  <form onSubmit={handleSendResolution} className="border-t border-neutral-100 pt-4 space-y-3">
                    <h5 className="text-[9px] font-black uppercase tracking-widest text-[#999999] pl-1">{isEn ? "Draft a Resolution" : "Rédiger une Résolution"}</h5>
                    
                    <div>
                      <input 
                        type="text"
                        required
                        placeholder={isEn ? "Resolution Title" : "Titre de la Résolution"}
                        value={resTitleInput}
                        onChange={(e) => setResTitleInput(e.target.value)}
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wider text-neutral-900 placeholder-neutral-400 outline-none focus:border-neutral-450 focus:bg-white transition-all shadow-inner"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5 pl-1">{t.googleDocUrlLabel}</label>
                      <input 
                        type="url"
                        required
                        placeholder="https://docs.google.com/document/d/.../edit"
                        value={selectedDocUrl}
                        onChange={(e) => setSelectedDocUrl(e.target.value)}
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-800 placeholder-neutral-400 outline-none focus:border-neutral-450 focus:bg-white transition-all shadow-inner"
                      />
                    </div>

                    {/* Google Drive integration helper */}
                    <div className="bg-neutral-50/50 border border-neutral-200/60 rounded-[18px] p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider flex items-center space-x-1">
                          <svg className="h-3.5 w-3.5 text-blue-600 mr-1" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46.18 14.25 0 14 0h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.65l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/>
                          </svg>
                          <span>{t.googleDriveAssocLabel}</span>
                        </span>
                        
                        {!googleAccessToken ? (
                          <button
                            type="button"
                            onClick={handleGoogleSignIn}
                            className="bg-white hover:bg-neutral-50 border border-neutral-250 text-neutral-800 text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg transition-all cursor-pointer shadow-sm flex items-center space-x-1"
                          >
                            <span>{t.googleDriveAssocBtn}</span>
                          </button>
                        ) : (
                          <div className="flex items-center space-x-1.5">
                            <span className="text-[9px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">{t.googleConnectedStatus}</span>
                            <button
                              type="button"
                              onClick={() => { setGoogleAccessToken(null); setRecentDocs([]); }}
                              className="text-neutral-400 hover:text-neutral-600 text-[8px] font-bold"
                            >
                              {t.googleDisconnectBtn}
                            </button>
                          </div>
                        )}
                      </div>

                      {googleAccessToken && (
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pt-1">
                          <p className="text-[8px] text-neutral-450 uppercase font-bold tracking-wider">{t.selectRecentDocHeader}</p>
                          {docLoading ? (
                            <div className="text-center py-2 text-neutral-450 text-[10px] font-mono animate-pulse">{t.docLoadingText}</div>
                          ) : recentDocs.length > 0 ? (
                            <div className="grid grid-cols-1 gap-1">
                              {recentDocs.map((docItem) => (
                                <button
                                  key={docItem.id}
                                  type="button"
                                  onClick={() => handleSelectRecentDoc(docItem.id, docItem.name)}
                                  className="w-full text-left text-[10px] bg-white hover:bg-neutral-100 border border-neutral-200 rounded-lg p-2 font-mono flex items-center justify-between transition-all cursor-pointer truncate"
                                >
                                  <span className="font-bold text-neutral-800 truncate mr-2">{docItem.name}</span>
                                  <span className="text-[8px] text-neutral-410 uppercase bg-neutral-50 px-1.5 py-0.5 rounded">Google Doc</span>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[9px] text-neutral-450 italic">{isEn ? "No Google Doc files found on your active Drive." : "Aucun document Google Doc trouvé sur votre Drive."}</p>
                          )}
                        </div>
                      )}
                    </div>

                    <button 
                      type="submit"
                      className="w-full bg-neutral-950 hover:bg-neutral-900 border-none rounded-xl py-2.5 text-xs font-black tracking-widest uppercase text-white transition-all cursor-pointer shadow-md active:scale-[0.99]"
                    >
                      {t.submitToTableBtn}
                    </button>
                  </form>
                ) : (
                  <div className="border-t border-neutral-100 pt-5 text-center">
                    <Lock className="h-5 w-5 text-neutral-350 mx-auto" />
                    <p className="text-[10px] text-neutral-400 font-extrabold uppercase tracking-widest mt-2">
                      {t.googleDocUrlLabel} {isEn ? "Disabled by the Chair" : "Désactivée par le Bureau"}
                    </p>
                  </div>
                )
              ) : (
                <div className="border-t border-neutral-100 pt-4 text-center font-mono text-[9px] uppercase font-bold text-neutral-400">
                  {isEn ? "Flux controlled via Chair dashboard" : "Flux contrôlé depuis l'action \"Contrôle des flux\""}
                </div>
              )}

            </div>
          )}

        </section>

      </main>

    </div>
  );
}
