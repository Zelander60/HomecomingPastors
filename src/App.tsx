import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  collection,
  doc,
  getDocs,
  getDocsFromServer,
  onSnapshot,
  setDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import {
  ArrowLeftRight,
  Camera,
  Check,
  ChevronRight,
  ClipboardCopy,
  ClipboardPaste,
  Coins,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  FileCheck2,
  KeyRound,
  Lock,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Share2,
  ShieldCheck,
  Trash2,
  Unlock,
  Users,
} from 'lucide-react';
import { db } from './firebase';
import {
  ActiveTab,
  Participant,
  Pastor,
  PaymentStatus,
  ParsedImportRow,
  UnlockedSession,
} from './types';
import {
  INITIAL_PARTICIPANTS,
  INITIAL_PASTORS,
  SUPREME_PASTOR_CODE,
  formatPhoneDisplay,
  isLegacySeedParticipantId,
  sanitizeParticipantPayload,
  sanitizePastorPayload,
  splitNameAndFirstName,
} from './data/initialData';
import { PastorAccessModal } from './components/PastorAccessModal';
import { SmartImportModal } from './components/SmartImportModal';
import { ParticipantDetailModal } from './components/ParticipantDetailModal';
import { CnibGalleryPage } from './components/CnibGalleryPage';
import { FundraisingPage } from './components/FundraisingPage';
import { PWAInstallButton, OfflineIndicator } from './components/PWAInstallButton';

const STORAGE_PASTORS_KEY = 'hc_ghana_2026_pastors_v2';
const STORAGE_PARTICIPANTS_KEY = 'hc_ghana_2026_participants_v4';
const LEGACY_PARTICIPANT_KEYS = [
  'hc_ghana_2026_participants_v1',
  'hc_ghana_2026_participants_v2',
  'hc_ghana_2026_participants_v3',
];
const STORAGE_SESSION_KEY = 'hc_ghana_2026_session_v2';
const STORAGE_SUPREME_CODE_KEY = 'hc_ghana_2026_supreme_unlocked_v1';

function detectOfficerCnibRoute(): boolean {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.toLowerCase().replace(/\/+$/, '');
  const hash = window.location.hash.toLowerCase();
  const params = new URLSearchParams(window.location.search);
  return (
    path === '/photoscnib' ||
    path.endsWith('/photoscnib') ||
    hash === '#/photoscnib' ||
    hash === '#photoscnib' ||
    params.get('page')?.toLowerCase() === 'photoscnib'
  );
}

function loadSupremeUnlocked(): boolean {
  try {
    return localStorage.getItem(STORAGE_SUPREME_CODE_KEY) === 'true';
  } catch {
    return false;
  }
}

function normalizeSequentialParticipants(list: Participant[]): Participant[] {
  return [...list]
    .filter((p) => p && p.id && !isLegacySeedParticipantId(p.id))
    .sort((a, b) => {
      const diff = (a.orderIndex || 0) - (b.orderIndex || 0);
      if (diff !== 0) return diff;
      return (a.id || '').localeCompare(b.id || '');
    });
}

function loadCachedPastors(): Pastor[] {
  try {
    const raw = localStorage.getItem(STORAGE_PASTORS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore storage read error
  }
  return INITIAL_PASTORS;
}

function loadCachedParticipants(): Participant[] {
  try {
    // Purge legacy keys that may have been frozen by 5MB base64 quota overflow
    LEGACY_PARTICIPANT_KEYS.forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch {
        // ignore
      }
    });
    const raw = localStorage.getItem(STORAGE_PARTICIPANTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return normalizeSequentialParticipants(parsed);
      }
    }
  } catch {
    // ignore storage read error
  }
  return INITIAL_PARTICIPANTS;
}

function loadCachedSession(): UnlockedSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_SESSION_KEY);
    if (raw !== null) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  // Default to unlocked Coordinator mode so Pastors can immediately add members,
  // upload CNIB Recto/Verso, and enter raised funds without getting blocked
  return {
    role: 'coordinator',
    pastorId: 'all',
    pastorName: 'Tous les Pasteurs',
  };
}

export default function App() {
  // Hybrid Optimistic Local + Cloud Firestore State
  const [pastors, setPastors] = useState<Pastor[]>(() => loadCachedPastors());
  const [participants, setParticipants] = useState<Participant[]>(() =>
    loadCachedParticipants()
  );
  const [isLoadingCloud, setIsLoadingCloud] = useState<boolean>(false);

  // Navigation & Filtering state
  const [activeTab, setActiveTab] = useState<ActiveTab>('participants');
  const [selectedPastorId, setSelectedPastorId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | PaymentStatus>('all');
  const [pastorSidebarQuery, setPastorSidebarQuery] = useState<string>('');

  // Pastor Simple Access Code Session
  const [session, setSession] = useState<UnlockedSession | null>(() =>
    loadCachedSession()
  );
  const [isAccessModalOpen, setIsAccessModalOpen] = useState<boolean>(false);
  const [isSmartImportOpen, setIsSmartImportOpen] = useState<boolean>(false);
  const [activeParticipantId, setActiveParticipantId] = useState<string | null>(null);

  // Quick Add Member Form State (with automatic Nom & Prénoms recognition preview)
  const [quickFullNameInput, setQuickFullNameInput] = useState<string>('');
  const [quickLastName, setQuickLastName] = useState<string>('');
  const [quickFirstName, setQuickFirstName] = useState<string>('');
  const [isManualNameEdit, setIsManualNameEdit] = useState<boolean>(false);
  const [quickPhone, setQuickPhone] = useState<string>('');
  const [quickPastorId, setQuickPastorId] = useState<string>('ps-pierre');
  const [quickPaymentStatus, setQuickPaymentStatus] = useState<PaymentStatus>('pending');
  const [isAddingMember, setIsAddingMember] = useState<boolean>(false);

  // Inline Pastor Fundraising Quick Edit
  const [inlineRaisedInput, setInlineRaisedInput] = useState<string>('');
  const [isEditingInlineRaised, setIsEditingInlineRaised] = useState<boolean>(false);

  // Dedicated Police / Border Officers route (/photoscnib) & Supreme Code Gate
  const [isOfficerRoute, setIsOfficerRoute] = useState<boolean>(() =>
    detectOfficerCnibRoute()
  );
  const [isSupremeUnlocked, setIsSupremeUnlocked] = useState<boolean>(() =>
    loadSupremeUnlocked()
  );
  const [supremeCodeInput, setSupremeCodeInput] = useState<string>('');
  const [supremeCodeError, setSupremeCodeError] = useState<string>('');
  const [copiedOfficerUrl, setCopiedOfficerUrl] = useState<boolean>(false);

  // Toast feedback & WhatsApp Export Mode
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState<boolean>(false);
  const [exportMode, setExportMode] = useState<'detailed' | 'simplified'>('simplified');
  const [isSyncingServer, setIsSyncingServer] = useState<boolean>(false);
  const [confirmInlineDeleteId, setConfirmInlineDeleteId] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3000);
  }, []);

  useEffect(() => {
    const syncRoute = () => setIsOfficerRoute(detectOfficerCnibRoute());
    window.addEventListener('popstate', syncRoute);
    window.addEventListener('hashchange', syncRoute);
    return () => {
      window.removeEventListener('popstate', syncRoute);
      window.removeEventListener('hashchange', syncRoute);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SUPREME_CODE_KEY, String(isSupremeUnlocked));
    } catch {
      // ignore
    }
  }, [isSupremeUnlocked]);

  // Persist pastors, participants, and session to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PASTORS_KEY, JSON.stringify(pastors));
    } catch {
      // ignore quota warning
    }
  }, [pastors]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PARTICIPANTS_KEY, JSON.stringify(participants));
    } catch {
      // If CNIB base64 images exceed the browser's 5MB localStorage limit, store lightweight
      // metadata so the local participant count & names NEVER freeze on an old snapshot!
      try {
        const lightweight = participants.map((p) => ({
          ...p,
          cnibRectoUrl: '',
          cnibVersoUrl: '',
        }));
        localStorage.setItem(STORAGE_PARTICIPANTS_KEY, JSON.stringify(lightweight));
      } catch {
        // ignore
      }
    }
  }, [participants]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
    } catch {
      // ignore
    }
  }, [session]);

  // Sync quickPastorId with selectedPastorId or unlocked session
  useEffect(() => {
    if (selectedPastorId !== 'all') {
      setQuickPastorId(selectedPastorId);
    } else if (session && session.pastorId !== 'all') {
      setQuickPastorId(session.pastorId);
    }
  }, [selectedPastorId, session]);

  // Automatic recognition of Nom and Prénoms as the user types in Quick Add
  useEffect(() => {
    if (!isManualNameEdit) {
      const { lastName, firstName } = splitNameAndFirstName(quickFullNameInput);
      setQuickLastName(lastName);
      setQuickFirstName(firstName);
    }
  }, [quickFullNameInput, isManualNameEdit]);

  // Read-only authoritative pull from Firestore server (never writes stale local cache to server!)
  const refreshFromFirestoreServer = useCallback(
    async (silent = true) => {
      if (!silent) setIsSyncingServer(true);
      try {
        let partSnap;
        try {
          partSnap = await getDocsFromServer(collection(db, 'participants'));
        } catch {
          partSnap = await getDocs(collection(db, 'participants'));
        }
        const remoteParticipants = normalizeSequentialParticipants(
          partSnap.docs.map((d) => d.data() as Participant)
        );
        setParticipants(remoteParticipants);

        let pastorSnap;
        try {
          pastorSnap = await getDocsFromServer(collection(db, 'pastors'));
        } catch {
          pastorSnap = await getDocs(collection(db, 'pastors'));
        }
        if (!pastorSnap.empty) {
          const remotePastors = pastorSnap.docs.map((d) => d.data() as Pastor);
          const mergedMap = new Map<string, Pastor>();
          INITIAL_PASTORS.forEach((p) => mergedMap.set(p.id, p));
          remotePastors.forEach((rp) => {
            if (rp && rp.id) mergedMap.set(rp.id, rp);
          });
          setPastors(
            Array.from(mergedMap.values()).sort((a, b) => (a.order || 0) - (b.order || 0))
          );
        }

        if (!silent) {
          showToast(
            `Synchronisé avec le serveur (${remoteParticipants.length} participant(s)).`
          );
        }
      } catch (err) {
        if (!silent) {
          showToast('Impossible de joindre le serveur actuellement.');
        }
        console.warn('Lecture serveur:', err);
      } finally {
        setIsLoadingCloud(false);
        if (!silent) setIsSyncingServer(false);
      }
    },
    [showToast]
  );

  // Attach 100% READ-ONLY Firestore listeners (NEVER write local/cached snapshots back to server!)
  // + Automatically pull fresh server truth whenever a background tab wakes up or gains focus
  useEffect(() => {
    let pastorsSeedingStarted = false;

    const unsubPastors = onSnapshot(
      collection(db, 'pastors'),
      async (snapshot) => {
        if (snapshot.empty) {
          if (!pastorsSeedingStarted) {
            pastorsSeedingStarted = true;
            try {
              const batch = writeBatch(db);
              INITIAL_PASTORS.forEach((pastor) => {
                const cleanPastor = sanitizePastorPayload(pastor);
                batch.set(doc(db, 'pastors', cleanPastor.id), cleanPastor);
              });
              await batch.commit();
            } catch (err) {
              console.warn('Synchronisation initiale des pasteurs en cours:', err);
            }
          }
        } else {
          // Server docs are strictly authoritative (never let stale local state override server)
          const remoteDocs = snapshot.docs.map((d) => d.data() as Pastor);
          const mergedMap = new Map<string, Pastor>();
          INITIAL_PASTORS.forEach((p) => mergedMap.set(p.id, p));
          remoteDocs.forEach((rp) => {
            if (rp && rp.id) mergedMap.set(rp.id, rp);
          });
          setPastors(
            Array.from(mergedMap.values()).sort((a, b) => (a.order || 0) - (b.order || 0))
          );
        }
        setIsLoadingCloud(false);
      },
      (error) => {
        setIsLoadingCloud(false);
        console.warn('Erreur lecture pastors:', error.message);
      }
    );

    const unsubParticipants = onSnapshot(
      collection(db, 'participants'),
      (snapshot) => {
        // Strictly READ-ONLY: replace local state with the exact documents in Firestore
        const rawDocs = snapshot.docs.map((d) => d.data() as Participant);
        const sortedList = normalizeSequentialParticipants(rawDocs);
        setParticipants(sortedList);
        setIsLoadingCloud(false);
      },
      (error) => {
        setIsLoadingCloud(false);
        console.warn('Erreur lecture participants:', error.message);
      }
    );

    // Force an immediate server pull on mount and whenever a sleeping computer/phone tab wakes up
    refreshFromFirestoreServer(true);

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        refreshFromFirestoreServer(true);
      }
    };
    const handleWindowFocus = () => {
      refreshFromFirestoreServer(true);
    };
    const handleOnline = () => {
      refreshFromFirestoreServer(true);
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('online', handleOnline);

    return () => {
      unsubPastors();
      unsubParticipants();
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('online', handleOnline);
    };
  }, [refreshFromFirestoreServer]);

  // Derived maps & permissions
  const pastorMap = useMemo(() => {
    const map = new Map<string, Pastor>();
    pastors.forEach((p) => map.set(p.id, p));
    return map;
  }, [pastors]);

  const selectedPastor = useMemo(() => {
    if (selectedPastorId === 'all') return null;
    return pastorMap.get(selectedPastorId) || null;
  }, [selectedPastorId, pastorMap]);

  const activeParticipant = useMemo(() => {
    if (!activeParticipantId) return null;
    return participants.find((p) => p.id === activeParticipantId) || null;
  }, [activeParticipantId, participants]);

  const canEditPastorScope = (pastorId: string) => {
    if (!session) return false;
    return (
      session.role === 'coordinator' ||
      session.pastorId === 'all' ||
      session.pastorId === pastorId
    );
  };

  const canAddInCurrentView = useMemo(() => {
    if (!session) return false;
    if (session.role === 'coordinator' || session.pastorId === 'all') return true;
    return selectedPastorId === 'all' || selectedPastorId === session.pastorId;
  }, [session, selectedPastorId]);

  // Filtered participants for main table / cards
  const filteredParticipants = useMemo(() => {
    return participants
      .filter((p) => {
        if (selectedPastorId !== 'all' && p.pastorId !== selectedPastorId) return false;
        if (paymentFilter !== 'all' && p.paymentStatus !== paymentFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName =
            p.fullName.toLowerCase().includes(q) ||
            p.lastName.toLowerCase().includes(q) ||
            p.firstName.toLowerCase().includes(q);
          const matchPhone = p.phone.toLowerCase().includes(q);
          const pastorName = pastorMap.get(p.pastorId)?.name.toLowerCase() || '';
          if (!matchName && !matchPhone && !pastorName.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }, [participants, selectedPastorId, paymentFilter, searchQuery, pastorMap]);

  // Global & Scoped KPI metrics
  const kpiStats = useMemo(() => {
    const scoped =
      selectedPastorId === 'all'
        ? participants
        : participants.filter((p) => p.pastorId === selectedPastorId);

    const withPhone = scoped.filter((p) => Boolean(p.phone && p.phone.trim())).length;
    const cnibComplete = scoped.filter(
      (p) => Boolean(p.cnibRectoUrl) && Boolean(p.cnibVersoUrl)
    ).length;
    const cnibPartial = scoped.filter(
      (p) =>
        (Boolean(p.cnibRectoUrl) && !p.cnibVersoUrl) ||
        (!p.cnibRectoUrl && Boolean(p.cnibVersoUrl))
    ).length;
    const paidCount = scoped.filter((p) => p.paymentStatus === 'paid').length;
    const partialCount = scoped.filter((p) => p.paymentStatus === 'partial').length;

    const totalRaised =
      selectedPastorId === 'all'
        ? pastors.reduce((acc, p) => acc + (p.raisedAmount || 0), 0)
        : pastorMap.get(selectedPastorId)?.raisedAmount || 0;

    return {
      totalCount: scoped.length,
      withPhone,
      cnibComplete,
      cnibPartial,
      paidCount,
      partialCount,
      totalRaised,
    };
  }, [participants, pastors, selectedPastorId, pastorMap]);

  // Atomic Single-Document Firestore Handlers (NEVER rewrites other participants!)
  const handleSaveParticipant = async (updated: Participant) => {
    const clean = sanitizeParticipantPayload(updated);
    const previousParticipants = participants;

    // 1. Immediate UI update for this single participant
    setParticipants((prev) => {
      const exists = prev.some((p) => p.id === clean.id);
      const nextList = exists
        ? prev.map((p) => (p.id === clean.id ? clean : p))
        : [...prev, clean];
      return normalizeSequentialParticipants(nextList);
    });

    // 2. Single-document write to Cloud Firestore
    try {
      await setDoc(doc(db, 'participants', clean.id), clean);
      showToast(`Participant ${clean.fullName} enregistré sur le serveur.`);
    } catch (error) {
      console.error('Erreur sauvegarde serveur:', error);
      setParticipants(previousParticipants);
      showToast(
        'Erreur réseau : la modification n’a pas pu être enregistrée sur le serveur.'
      );
      throw error;
    }
  };

  const handleDeleteParticipant = async (participantId: string) => {
    const previousParticipants = participants;
    // 1. Immediate UI removal
    setParticipants((prev) => prev.filter((p) => p.id !== participantId));
    setConfirmInlineDeleteId(null);

    // 2. Strictly delete ONLY this single document in Firestore (never batch-set remaining docs!)
    try {
      await deleteDoc(doc(db, 'participants', participantId));
      showToast('Participant définitivement supprimé sur le serveur.');
    } catch (error) {
      console.error('Erreur lors de la suppression sur le serveur:', error);
      setParticipants(previousParticipants);
      showToast(
        'Erreur réseau : impossible de supprimer sur le serveur. Vérifiez votre connexion.'
      );
    }
  };

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanLast = quickLastName.trim().toUpperCase();
    const cleanFirst = quickFirstName.trim();
    const fullName =
      [cleanFirst, cleanLast].filter(Boolean).join(' ').trim() ||
      quickFullNameInput.trim();

    if (!fullName) return;

    const targetPastor =
      session && session.pastorId !== 'all' ? session.pastorId : quickPastorId;

    setIsAddingMember(true);
    const previousParticipants = participants;
    try {
      const maxExistingOrder = participants.reduce(
        (max, p) => Math.max(max, p.orderIndex || 0),
        0
      );
      const nextOrderIndex = maxExistingOrder + 1;
      const displayNumber = participants.length + 1;
      const nowIso = new Date().toISOString();
      const newParticipant: Participant = sanitizeParticipantPayload({
        id: `part-${Date.now()}`,
        lastName: cleanLast,
        firstName: cleanFirst,
        fullName,
        phone: formatPhoneDisplay(quickPhone),
        pastorId: targetPastor,
        paymentStatus: quickPaymentStatus,
        amountPaid: 0,
        cnibRectoUrl: '',
        cnibVersoUrl: '',
        cnibUpdatedAt: '',
        notes: '',
        orderIndex: nextOrderIndex,
        updatedAt: nowIso,
      });

      // 1. Immediate UI update
      setParticipants((prev) => normalizeSequentialParticipants([...prev, newParticipant]));
      setQuickFullNameInput('');
      setQuickLastName('');
      setQuickFirstName('');
      setQuickPhone('');
      setIsManualNameEdit(false);

      // 2. Single-document write to Cloud Firestore
      await setDoc(doc(db, 'participants', newParticipant.id), newParticipant);
      showToast(`${newParticipant.fullName} ajouté à la liste (N° ${displayNumber}).`);
    } catch (error) {
      console.error('Erreur ajout serveur:', error);
      setParticipants(previousParticipants);
      showToast('Erreur réseau : impossible d’ajouter le participant sur le serveur.');
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleBulkImportConfirm = async (
    targetPastorId: string,
    rows: ParsedImportRow[]
  ) => {
    let currentMaxIndex = participants.reduce(
      (max, p) => Math.max(max, p.orderIndex || 0),
      0
    );
    const nowIso = new Date().toISOString();
    const createdParticipants: Participant[] = rows.map((row, i) => {
      currentMaxIndex += 1;
      const cleanLast = row.lastName.trim().toUpperCase();
      const cleanFirst = row.firstName.trim();
      const fullName = [cleanFirst, cleanLast].filter(Boolean).join(' ').trim();
      return sanitizeParticipantPayload({
        id: `part-${Date.now()}-${i}`,
        lastName: cleanLast,
        firstName: cleanFirst,
        fullName: fullName || 'Participant',
        phone: formatPhoneDisplay(row.phone),
        pastorId: targetPastorId,
        paymentStatus: row.paymentStatus,
        amountPaid: 0,
        cnibRectoUrl: '',
        cnibVersoUrl: '',
        cnibUpdatedAt: '',
        notes: '',
        orderIndex: currentMaxIndex,
        updatedAt: nowIso,
      });
    });

    const previousParticipants = participants;
    // 1. Immediate UI update
    setParticipants((prev) =>
      normalizeSequentialParticipants([...prev, ...createdParticipants])
    );

    // 2. Persist only the newly created participants to Cloud Firestore
    try {
      await Promise.all(
        createdParticipants.map((docItem) =>
          setDoc(doc(db, 'participants', docItem.id), docItem)
        )
      );
      showToast(`${createdParticipants.length} participant(s) importé(s) sur le serveur.`);
    } catch (error) {
      console.error('Erreur import serveur:', error);
      setParticipants(previousParticipants);
      showToast('Erreur réseau lors de l’importation sur le serveur.');
    }
  };


  const handleUpdatePastorFundraising = async (
    pastorId: string,
    raisedAmount: number,
    fundraisingNote: string
  ) => {
    const existingPastor = pastorMap.get(pastorId);
    if (!existingPastor) return;
    const previousPastors = pastors;
    const updated = sanitizePastorPayload({
      ...existingPastor,
      raisedAmount: Math.max(0, Number(raisedAmount) || 0),
      fundraisingNote,
      updatedAt: new Date().toISOString(),
    });

    // 1. Immediate UI update
    setPastors((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));

    // 2. Verified Cloud Firestore persistence
    try {
      await setDoc(doc(db, 'pastors', updated.id), updated);
      showToast(
        `Montant de ${updated.name} enregistré sur le serveur : ${updated.raisedAmount.toLocaleString(
          'fr-FR'
        )} FCFA`
      );
    } catch (error) {
      console.error('Erreur sauvegarde montant pasteur:', error);
      setPastors(previousPastors);
      showToast(
        'Erreur réseau : le montant n’a pas pu être enregistré sur le serveur.'
      );
      throw error;
    }
  };

  const handleAddPastor = async (name: string, zone: string, pin: string) => {
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const id = `${slug || 'pasteur'}-${Date.now().toString().slice(-4)}`;
    const nextOrder = pastors.reduce((max, p) => Math.max(max, p.order || 0), 0) + 1;
    const previousPastors = pastors;
    const newPastor = sanitizePastorPayload({
      id,
      name,
      zone,
      raisedAmount: 0,
      fundraisingNote: '',
      accessPin: pin,
      order: nextOrder,
      updatedAt: new Date().toISOString(),
    });

    // 1. Immediate UI update
    setPastors((prev) => [...prev, newPastor]);
    setSelectedPastorId(newPastor.id);

    // 2. Verified Cloud persistence
    try {
      await setDoc(doc(db, 'pastors', newPastor.id), newPastor);
      showToast(`Groupe pastoral ${newPastor.name} enregistré sur le serveur.`);
    } catch (error) {
      console.error('Erreur ajout pasteur:', error);
      setPastors(previousPastors);
      showToast('Erreur réseau : impossible d’enregistrer le groupe pastoral sur le serveur.');
      throw error;
    }
  };

  const handleUpdatePastorPin = async (pastorId: string, newPin: string) => {
    const existingPastor = pastorMap.get(pastorId);
    if (!existingPastor) return;
    const previousPastors = pastors;
    const updated = sanitizePastorPayload({
      ...existingPastor,
      accessPin: newPin,
      updatedAt: new Date().toISOString(),
    });

    setPastors((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));

    try {
      await setDoc(doc(db, 'pastors', updated.id), updated);
      showToast(`Code d'accès de ${updated.name} enregistré sur le serveur.`);
    } catch (error) {
      console.error('Erreur sauvegarde PIN pasteur:', error);
      setPastors(previousPastors);
      showToast('Erreur réseau : impossible de modifier le code PIN sur le serveur.');
      throw error;
    }
  };

  // Format amount like "50,000 fcfa" or "0 fcfa"
  const formatFcfaContribution = (amount: number): string => {
    const clean = Math.max(0, Number(amount) || 0);
    return `${clean.toLocaleString('en-US')} fcfa`;
  };

  // Generate Simplified WhatsApp Report (Pastors + Total Participants + Raised Funds even if 0 fcfa)
  const whatsAppSimplifiedText = useMemo(() => {
    const totalRaisedAll = pastors.reduce((acc, p) => acc + (p.raisedAmount || 0), 0);
    const blocks: string[] = [
      `*Rapport de Contribution pour la Conférence* ‼️⛔`,
      ``,
    ];

    pastors.forEach((pastor) => {
      const memberCount = participants.filter((p) => p.pastorId === pastor.id).length;
      const raised = pastor.raisedAmount || 0;

      blocks.push(`${pastor.name}`);
      blocks.push(`- Nombre de Participants: ${memberCount}`);
      blocks.push(`- Contributions: ${formatFcfaContribution(raised)}`);
      blocks.push(``);
    });

    blocks.push(`*Total Général*`);
    blocks.push(`- Total Participants: ${participants.length}`);
    blocks.push(`- Total Contributions: ${formatFcfaContribution(totalRaisedAll)}`);

    return blocks.join('\n');
  }, [pastors, participants]);

  // Generate Detailed WhatsApp formatted text matching the conference list (always including Pastor funds even if 0 FCFA)
  const whatsAppFormattedText = useMemo(() => {
    let globalCounter = 1;
    const totalRaisedAll = pastors.reduce((acc, p) => acc + (p.raisedAmount || 0), 0);
    const blocks: string[] = [
      `*HOMECOMING GHANA (3 AU 6 NOVEMBRE 2026)*`,
      `Total inscrits : ${participants.length} participants`,
      `Total fonds soulevés : ${formatFcfaContribution(totalRaisedAll)}`,
      ``,
    ];

    pastors.forEach((pastor) => {
      const members = participants
        .filter((p) => p.pastorId === pastor.id)
        .sort((a, b) => a.orderIndex - b.orderIndex);

      const headerTitle =
        pastor.zone && pastor.zone !== 'Homecoming List'
          ? `*${pastor.name} (${pastor.zone})* :`
          : `*${pastor.name}'s Homecoming List* :`;

      const raised = pastor.raisedAmount || 0;

      blocks.push(headerTitle);
      blocks.push(`- Nombre de Participants: ${members.length}`);
      blocks.push(`- Contributions: ${formatFcfaContribution(raised)}`);

      if (members.length === 0) {
        blocks.push(`(Aucun participant enregistré)`);
      } else {
        members.forEach((m) => {
          const displayName = [m.firstName, m.lastName].filter(Boolean).join(' ') || m.fullName;
          const phonePart = m.phone ? ` - ${m.phone}` : '';
          const paidTag =
            m.paymentStatus === 'paid'
              ? ' [Payé]'
              : m.paymentStatus === 'partial'
              ? ' [Partiel]'
              : '';
          blocks.push(`${globalCounter}. ${displayName}${phonePart}${paidTag}`);
          globalCounter++;
        });
      }
      blocks.push(``);
    });

    return blocks.join('\n');
  }, [pastors, participants]);

  const activeWhatsAppText =
    exportMode === 'simplified' ? whatsAppSimplifiedText : whatsAppFormattedText;

  const handleDownloadCsv = () => {
    if (exportMode === 'simplified') {
      const headers = [
        'Numero',
        'Pasteur',
        'Zone',
        'Nombre_de_Participants',
        'Contributions_FCFA',
        'Note_Collecte',
      ];
      const rows = pastors.map((pastor, idx) => {
        const count = participants.filter((p) => p.pastorId === pastor.id).length;
        const raised = pastor.raisedAmount || 0;
        return [
          idx + 1,
          `"${(pastor.name || '').replace(/"/g, '""')}"`,
          `"${(pastor.zone || '').replace(/"/g, '""')}"`,
          count,
          raised,
          `"${(pastor.fundraisingNote || '').replace(/"/g, '""')}"`,
        ].join(',');
      });

      const totalRaisedAll = pastors.reduce((acc, p) => acc + (p.raisedAmount || 0), 0);
      rows.push(
        [
          '',
          '"TOTAL GENERAL"',
          '""',
          participants.length,
          totalRaisedAll,
          '""',
        ].join(',')
      );

      const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Rapport_Contribution_Pasteurs_Homecoming_2026.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    }

    const headers = [
      'Numero',
      'Nom',
      'Prenoms',
      'Nom_Complet',
      'Telephone',
      'Pasteur',
      'Fonds_Souleves_Pasteur_FCFA',
      'Statut_Paiement',
      'Montant_Individuel_FCFA',
      'CNIB_Recto',
      'CNIB_Verso',
      'Notes',
    ];
    const rows = participants.map((p, idx) => {
      const pastorObj = pastorMap.get(p.pastorId);
      const pastorName = pastorObj?.name || p.pastorId;
      const pastorRaised = pastorObj?.raisedAmount || 0;
      const statusLabel =
        p.paymentStatus === 'paid'
          ? 'Paye'
          : p.paymentStatus === 'partial'
          ? 'Partiel'
          : 'En_attente';
      return [
        idx + 1,
        `"${(p.lastName || '').replace(/"/g, '""')}"`,
        `"${(p.firstName || '').replace(/"/g, '""')}"`,
        `"${(p.fullName || '').replace(/"/g, '""')}"`,
        `"${(p.phone || '').replace(/"/g, '""')}"`,
        `"${pastorName.replace(/"/g, '""')}"`,
        pastorRaised,
        statusLabel,
        p.amountPaid || 0,
        p.cnibRectoUrl ? 'Oui' : 'Non',
        p.cnibVersoUrl ? 'Oui' : 'Non',
        `"${(p.notes || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    // Append Pastor Fundraising Summary section at the bottom of the detailed CSV
    rows.push('');
    rows.push('"RESUME DES CONTRIBUTIONS PAR PASTEUR"');
    rows.push('"Pasteur","Nombre_de_Participants","Contributions_FCFA"');
    pastors.forEach((pastor) => {
      const count = participants.filter((p) => p.pastorId === pastor.id).length;
      const raised = pastor.raisedAmount || 0;
      rows.push(
        `"${(pastor.name || '').replace(/"/g, '""')}",${count},${raised}`
      );
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Homecoming_Ghana_2026_Participants_et_Contributions.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredSidebarPastors = useMemo(() => {
    if (!pastorSidebarQuery.trim()) return pastors;
    const q = pastorSidebarQuery.toLowerCase();
    return pastors.filter(
      (p) => p.name.toLowerCase().includes(q) || p.zone.toLowerCase().includes(q)
    );
  }, [pastors, pastorSidebarQuery]);

  const handleSupremeUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSupremeCodeError('');
    if (supremeCodeInput.trim() === SUPREME_PASTOR_CODE) {
      setIsSupremeUnlocked(true);
      setSupremeCodeInput('');
      if (!session) {
        setSession({
          role: 'coordinator',
          pastorId: 'all',
          pastorName: 'Tous les Pasteurs (Coordination)',
        });
      }
      showToast('Accès Suprême Pasteur déverrouillé.');
    } else {
      setSupremeCodeError(
        'Code Suprême incorrect. Seuls les pasteurs disposant du Code Suprême peuvent accéder aux pages générales.'
      );
    }
  };

  const handleNavigateToOfficerPage = () => {
    try {
      window.history.pushState({}, '', '/photoscnib');
    } catch {
      window.location.hash = '#/photoscnib';
    }
    setIsOfficerRoute(true);
  };

  // 1. ISOLATED POLICE / BORDER OFFICER PAGE (/photoscnib) — No return button, no other tabs
  if (isOfficerRoute) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
        <OfflineIndicator />
        <main className="flex-1 max-w-[1440px] w-full mx-auto p-3 sm:p-6">
          <CnibGalleryPage
            participants={participants}
            pastors={pastors}
            selectedPastorId={selectedPastorId}
            onSelectPastorId={setSelectedPastorId}
            isOfficerStandalone={true}
          />
        </main>
        <footer className="mt-auto border-t border-slate-200 bg-white px-6 py-4">
          <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
            <span>
              Portail Officiel de Vérification des Pièces d’Identité (CNIB) · Homecoming Ghana (3–6
              Novembre 2026)
            </span>
            <span>Accès réservé au contrôle et téléchargement des CNIB Recto / Verso</span>
          </div>
        </footer>
      </div>
    );
  }

  // 2. SUPREME CODE GATE FOR ALL GENERAL PASTOR PAGES
  if (!isSupremeUnlocked) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-[#F8FAFC] text-[#0F172A] p-4">
        <OfflineIndicator />
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden">
          <div className="px-6 py-5 bg-slate-900 text-white flex items-center gap-4">
            <img
              src="/hcoming_Logo.png"
              alt="Grâce Internationale Sahel — Homecoming Ghana 2026"
              className="w-14 h-14 rounded-2xl object-cover shadow-md shrink-0"
            />
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 mb-0.5">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>Homecoming Ghana · 3–6 Nov 2026</span>
              </div>
              <h1 className="text-base sm:text-lg font-bold leading-snug">
                Accès Général Réservé aux Pasteurs
              </h1>
              <p className="text-xs text-slate-300 mt-0.5">
                Entrez le Code Suprême connu des Pasteurs pour accéder aux pages générales.
              </p>
            </div>
          </div>

          <form onSubmit={handleSupremeUnlockSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Code Suprême des Pasteurs
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  inputMode="numeric"
                  autoFocus
                  value={supremeCodeInput}
                  onChange={(e) => setSupremeCodeInput(e.target.value)}
                  placeholder="Entrez le Code Suprême..."
                  className="w-full min-h-[46px] pl-10 pr-4 py-2.5 text-sm font-mono-tabular font-bold bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-600"
                />
              </div>
              {supremeCodeError && (
                <p className="mt-2 text-xs font-medium text-red-600">{supremeCodeError}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full min-h-[46px] py-2.5 px-4 text-xs font-semibold text-white bg-amber-700 rounded-xl hover:bg-amber-800 transition-colors flex items-center justify-center gap-2"
            >
              <Unlock className="w-4 h-4" />
              Accéder aux Pages Générales des Pasteurs
            </button>
          </form>

          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 space-y-2.5">
            <div className="text-xs font-semibold text-slate-700">
              Officiers de Police & Contrôle Frontières :
            </div>
            <button
              type="button"
              onClick={handleNavigateToOfficerPage}
              className="w-full min-h-[42px] px-4 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
            >
              <FileCheck2 className="w-4 h-4 text-amber-700" />
              Ouvrir uniquement la page Photos CNIB (/photoscnib)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden flex flex-col bg-[#F8FAFC] text-[#0F172A] pb-20 lg:pb-0">
      <OfflineIndicator />

      {/* STRICT 3-ZONE TOP BAR CONTRACT */}
      <header className="sticky top-0 z-30 w-full max-w-full flex items-center justify-between gap-2 sm:gap-6 px-3 sm:px-6 h-14 bg-white/95 backdrop-blur-md border-b border-slate-200">
        {/* Zone 1: Official Logo + Wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('participants');
          }}
          className="flex items-center gap-2 sm:gap-2.5 text-sm sm:text-base lg:text-lg font-bold tracking-tight text-slate-900 min-w-0 flex-1 lg:flex-initial font-display"
        >
          <img
            src="/hcoming_Logo.png"
            alt="Homecoming Ghana 2026"
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-cover shrink-0 shadow-xs"
          />
          <span className="truncate">Homecoming Ghana 2026</span>
        </a>

        {/* Zone 2: 4 concise single-line navigation links (Desktop) */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600">
          <button
            type="button"
            onClick={() => setActiveTab('participants')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'participants'
                ? 'border-amber-700 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Participants ({participants.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cnib-gallery')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'cnib-gallery'
                ? 'border-amber-700 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Photos CNIB
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('fundraising')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'fundraising'
                ? 'border-amber-700 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Fonds Pasteurs
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'export'
                ? 'border-amber-700 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Export & App
          </button>
        </nav>

        {/* Zone 3: Sync button + 1 primary action button */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => refreshFromFirestoreServer(false)}
            disabled={isSyncingServer}
            title="Forcer l'actualisation depuis le serveur"
            className="min-h-[36px] sm:min-h-[40px] px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-colors flex items-center gap-1.5 shrink-0"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 shrink-0 ${isSyncingServer ? 'animate-spin text-amber-700' : ''}`}
            />
            <span className="hidden sm:inline">Actualiser</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAccessModalOpen(true)}
            className={`min-h-[36px] sm:min-h-[40px] px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              session
                ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            {session ? (
              <>
                <Unlock className="w-3.5 h-3.5 shrink-0" />
                <span className="max-w-[95px] sm:max-w-[180px] truncate">
                  {session.pastorName}
                </span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span>Accès Pasteur</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 lg:bottom-6 right-4 left-4 sm:left-auto z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2.5 border border-slate-700">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* WORKSPACE CANVAS: Desktop Sidebar (272px) + Mobile Pastor Bar + Main Content Viewport */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-[1440px] w-full min-w-0 overflow-x-hidden mx-auto">
        {/* MOBILE HORIZONTAL PASTOR SELECTOR (< lg) */}
        <div className="lg:hidden w-full max-w-full min-w-0 overflow-hidden bg-white border-b border-slate-200 px-3 sm:px-4 py-2.5 space-y-2">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="text-xs font-bold text-slate-700 truncate">
              Filtrer par Pasteur ({pastors.length}) :
            </span>
            <PWAInstallButton variant="compact" />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar w-full">
            <button
              type="button"
              onClick={() => {
                setSelectedPastorId('all');
                setIsEditingInlineRaised(false);
              }}
              className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                selectedPastorId === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Tous ({participants.length})
            </button>
            {pastors.map((pastor) => {
              const count = participants.filter((p) => p.pastorId === pastor.id).length;
              const isSelected = selectedPastorId === pastor.id;
              return (
                <button
                  key={pastor.id}
                  type="button"
                  onClick={() => {
                    setSelectedPastorId(pastor.id);
                    setIsEditingInlineRaised(false);
                  }}
                  className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-colors flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-amber-700 text-white font-semibold'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>{pastor.name}</span>
                  <span
                    className={`font-mono-tabular text-[11px] ${
                      isSelected ? 'text-amber-100' : 'text-slate-500'
                    }`}
                  >
                    ({count})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* DESKTOP LEFT SIDEBAR (lg:flex) */}
        <aside className="hidden lg:flex w-[272px] shrink-0 bg-[#F1F5F9] border-r border-slate-200 p-4 flex-col gap-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800">
                Groupes par Pasteur ({pastors.length})
              </span>
              <button
                type="button"
                onClick={() => setIsAccessModalOpen(true)}
                className="text-xs font-semibold text-amber-800 hover:underline"
              >
                + Pasteur
              </button>
            </div>

            <div className="relative mb-2.5">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={pastorSidebarQuery}
                onChange={(e) => setPastorSidebarQuery(e.target.value)}
                placeholder="Filtrer un pasteur..."
                className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-600"
              />
            </div>

            {/* All Pastors Button */}
            <button
              type="button"
              onClick={() => {
                setSelectedPastorId('all');
                setIsEditingInlineRaised(false);
              }}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors flex items-center justify-between mb-1.5 ${
                selectedPastorId === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-800 hover:bg-slate-200/70 border border-slate-200/80'
              }`}
            >
              <span className="truncate">Vue Générale (Tous)</span>
              <span className="font-mono-tabular ml-2 shrink-0">
                {participants.length} mbr
              </span>
            </button>

            {/* Individual Pastors List */}
            <div className="space-y-1 max-h-[calc(100vh-260px)] overflow-y-auto pr-0.5">
              {filteredSidebarPastors.map((pastor) => {
                const count = participants.filter((p) => p.pastorId === pastor.id).length;
                const isSelected = selectedPastorId === pastor.id;

                return (
                  <button
                    key={pastor.id}
                    type="button"
                    onClick={() => {
                      setSelectedPastorId(pastor.id);
                      setIsEditingInlineRaised(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-amber-700 text-white font-semibold'
                        : 'text-slate-700 hover:bg-slate-200/70'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="truncate">{pastor.name}</div>
                      {pastor.raisedAmount > 0 && (
                        <div
                          className={`text-[11px] font-mono-tabular truncate ${
                            isSelected ? 'text-amber-100' : 'text-emerald-700 font-medium'
                          }`}
                        >
                          {pastor.raisedAmount.toLocaleString('fr-FR')} FCFA
                        </div>
                      )}
                    </div>
                    <span
                      className={`font-mono-tabular text-xs shrink-0 ${
                        isSelected ? 'text-white font-bold' : 'text-slate-500'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-auto pt-3 border-t border-slate-200">
            <PWAInstallButton variant="compact" />
          </div>
        </aside>

        {/* Main Viewport Content */}
        <main className="flex-1 p-3 sm:p-6 space-y-5 min-w-0">
          {activeTab === 'cnib-gallery' ? (
            <CnibGalleryPage
              participants={participants}
              pastors={pastors}
              selectedPastorId={selectedPastorId}
              onSelectPastorId={setSelectedPastorId}
              session={session}
              onSelectParticipant={(p) => setActiveParticipantId(p.id)}
              onSaveParticipant={handleSaveParticipant}
              onRequestUnlock={() => setIsAccessModalOpen(true)}
            />
          ) : activeTab === 'fundraising' ? (
            <FundraisingPage
              pastors={pastors}
              participants={participants}
              session={session}
              onUpdatePastorFundraising={handleUpdatePastorFundraising}
              onRequestUnlock={() => setIsAccessModalOpen(true)}
              onSelectPastorForParticipants={(pastorId) => {
                setSelectedPastorId(pastorId);
                setActiveTab('participants');
              }}
            />
          ) : activeTab === 'export' ? (
            <div className="space-y-5">
              {/* Dedicated Police / Border Officers Share Link Card */}
              <div className="bg-white border border-amber-300 rounded-2xl p-4 sm:p-6 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-800 mb-1">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Lien Dédié Officiers de Police (/photoscnib)</span>
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900">
                      Page Isolée des Photos CNIB (Sans Retour vers l’Application)
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1">
                      Partagez ce lien aux officiers de police : ils verront uniquement la galerie
                      des photos CNIB (Recto/Verso) avec téléchargement, sans aucun accès ni bouton
                      retour vers vos autres pages.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const officerUrl = `${window.location.origin}/photoscnib`;
                        navigator.clipboard.writeText(officerUrl);
                        setCopiedOfficerUrl(true);
                        setTimeout(() => setCopiedOfficerUrl(false), 2500);
                      }}
                      className="flex-1 sm:flex-initial min-h-[44px] px-4 py-2.5 text-xs font-semibold text-white bg-amber-700 rounded-xl hover:bg-amber-800 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
                    >
                      {copiedOfficerUrl ? (
                        <>
                          <Check className="w-4 h-4" /> Lien /photoscnib copié !
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" /> Copier le lien /photoscnib
                        </>
                      )}
                    </button>
                    <a
                      href="/photoscnib"
                      className="min-h-[44px] px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-300 rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Tester /photoscnib
                    </a>
                  </div>
                </div>
              </div>

              {/* Install App Card */}
              <PWAInstallButton variant="card" />

              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="text-lg sm:text-xl font-bold text-slate-900">
                      Export WhatsApp & Tableur Excel (CSV)
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1">
                      Choisissez entre le <strong>Mode Simplifié</strong> (Rapport de Contribution
                      par Pasteur avec nombre de participants et fonds soulevés même à 0 FCFA) ou la{' '}
                      <strong>Liste Détaillée</strong> (tous les participants + fonds soulevés).
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleDownloadCsv}
                      className="flex-1 sm:flex-initial min-h-[44px] px-4 py-2.5 text-xs font-semibold text-slate-800 bg-slate-100 border border-slate-300 rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
                    >
                      <Download className="w-4 h-4" />
                      {exportMode === 'simplified'
                        ? 'Télécharger CSV (Rapport)'
                        : 'Télécharger CSV (Complet)'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(activeWhatsAppText);
                        setCopiedWhatsApp(true);
                        setTimeout(() => setCopiedWhatsApp(false), 2500);
                      }}
                      className="flex-1 sm:flex-initial min-h-[44px] px-4 py-2.5 text-xs font-semibold text-white bg-amber-700 rounded-xl hover:bg-amber-800 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
                    >
                      {copiedWhatsApp ? (
                        <>
                          <Check className="w-4 h-4" /> Copié !
                        </>
                      ) : (
                        <>
                          <ClipboardCopy className="w-4 h-4" />{' '}
                          {exportMode === 'simplified'
                            ? 'Copier le Rapport Simplifié'
                            : 'Copier la Liste Complète'}
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Mode Selector: Mode Simplifié vs Liste Détaillée */}
                <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100 rounded-xl border border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => setExportMode('simplified')}
                    className={`flex-1 sm:flex-initial min-h-[40px] px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${
                      exportMode === 'simplified'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    <Coins className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Mode Simplifié (Rapport de Contribution)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportMode('detailed')}
                    className={`flex-1 sm:flex-initial min-h-[40px] px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${
                      exportMode === 'detailed'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Liste Détaillée (Participants + Fonds Soulevés)</span>
                  </button>
                </div>

                <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono-tabular overflow-x-auto max-h-[60vh] leading-relaxed whitespace-pre-wrap">
                  {activeWhatsAppText}
                </pre>
              </div>
            </div>
          ) : (
            /* DEFAULT TAB: PARTICIPANTS LIST & MANAGEMENT */
            <>
              {/* Conference Context & KPI Strip */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-200">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 mb-1">
                      <span>Homecoming Ghana</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-semibold text-amber-800">
                        3 au 6 Novembre 2026
                      </span>
                    </div>
                    <h1 className="text-lg sm:text-xl font-bold text-slate-900">
                      {selectedPastor
                        ? `Liste de ${selectedPastor.name} ${
                            selectedPastor.zone && selectedPastor.zone !== 'Homecoming List'
                              ? `(${selectedPastor.zone})`
                              : ''
                          }`
                        : 'Liste Générale des Participants'}
                    </h1>
                  </div>

                  {/* Selected Pastor Fundraising Quick Box OR Global Action */}
                  {selectedPastor ? (
                    <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-medium text-emerald-900">
                          Montant d’argent soulevé par {selectedPastor.name}
                        </div>
                        {isEditingInlineRaised ? (
                          <div className="flex items-center gap-2 mt-2">
                            <input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              step={1000}
                              autoFocus
                              value={inlineRaisedInput}
                              onChange={(e) => setInlineRaisedInput(e.target.value)}
                              className="w-36 min-h-[40px] px-3 py-1.5 text-sm font-mono-tabular font-bold bg-white border border-amber-600 rounded-lg focus:outline-none"
                              placeholder="Montant FCFA"
                            />
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await handleUpdatePastorFundraising(
                                    selectedPastor.id,
                                    Number(inlineRaisedInput) || 0,
                                    selectedPastor.fundraisingNote
                                  );
                                  setIsEditingInlineRaised(false);
                                } catch {
                                  // Keep input open if server write failed
                                }
                              }}
                              className="min-h-[40px] px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800"
                            >
                              Enregistrer
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsEditingInlineRaised(false)}
                              className="min-h-[40px] px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900"
                            >
                              Annuler
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-lg font-bold font-mono-tabular text-emerald-700">
                              {(selectedPastor.raisedAmount || 0).toLocaleString('fr-FR')} FCFA
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                if (canEditPastorScope(selectedPastor.id)) {
                                  setInlineRaisedInput(String(selectedPastor.raisedAmount || 0));
                                  setIsEditingInlineRaised(true);
                                } else {
                                  setIsAccessModalOpen(true);
                                }
                              }}
                              className="min-h-[36px] px-3 py-1 text-xs font-semibold text-amber-900 bg-white border border-amber-300 rounded-lg hover:bg-amber-50 flex items-center gap-1"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Entrer / Modifier</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setActiveTab('cnib-gallery')}
                        className="min-h-[40px] px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <FileCheck2 className="w-3.5 h-3.5 text-amber-700" />
                        Photos CNIB
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('fundraising')}
                        className="min-h-[40px] px-3.5 py-2 text-xs font-semibold text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <Coins className="w-3.5 h-3.5 text-emerald-700" />
                        Entrer Fonds Pasteur
                      </button>
                    </div>
                  )}
                </div>

                {/* Responsive Tabular KPI Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-4">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="text-[11px] text-slate-500">Participants</div>
                    <div className="text-lg sm:text-xl font-bold font-mono-tabular text-slate-900 mt-0.5">
                      {kpiStats.totalCount}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="text-[11px] text-slate-500">Téléphones</div>
                    <div className="text-lg sm:text-xl font-bold font-mono-tabular text-slate-900 mt-0.5">
                      {kpiStats.withPhone}{' '}
                      <span className="text-xs font-normal text-slate-400">
                        / {kpiStats.totalCount}
                      </span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="text-[11px] text-slate-500">CNIB Complètes</div>
                    <div className="text-lg sm:text-xl font-bold font-mono-tabular text-amber-800 mt-0.5">
                      {kpiStats.cnibComplete}{' '}
                      {kpiStats.cnibPartial > 0 && (
                        <span className="text-xs font-normal text-slate-500">
                          (+{kpiStats.cnibPartial})
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="text-[11px] text-slate-500">Statut Payé</div>
                    <div className="text-lg sm:text-xl font-bold font-mono-tabular text-emerald-700 mt-0.5">
                      {kpiStats.paidCount}{' '}
                      {kpiStats.partialCount > 0 && (
                        <span className="text-xs font-normal text-amber-700">
                          (+{kpiStats.partialCount})
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="col-span-2 sm:col-span-1 p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200/60">
                    <div className="text-[11px] text-emerald-900">Fonds Soulevés</div>
                    <div className="text-lg sm:text-xl font-bold font-mono-tabular text-emerald-700 mt-0.5">
                      {kpiStats.totalRaised.toLocaleString('fr-FR')}{' '}
                      <span className="text-xs font-normal">FCFA</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* PASTOR QUICK-ADD PANEL WITH AUTOMATIC NOM & PRENOMS PREVIEW */}
              {canAddInCurrentView ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">
                        Ajouter un Participant (Reconnaissance automatique Nom & Prénoms)
                      </h2>
                      <p className="text-xs text-slate-500">
                        Tapez le nom et le numéro : le Nom et les Prénoms sont reconnus
                        automatiquement avant d’enregistrer.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsSmartImportOpen(true)}
                      className="min-h-[42px] px-3.5 py-2 text-xs font-semibold text-amber-900 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors flex items-center justify-center gap-1.5 self-stretch sm:self-auto whitespace-nowrap shrink-0"
                    >
                      <ClipboardPaste className="w-4 h-4" />
                      Coller une liste WhatsApp
                    </button>
                  </div>

                  <form onSubmit={handleQuickAddSubmit} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      <div className="sm:col-span-4">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Nom & Prénoms du participant
                        </label>
                        <input
                          type="text"
                          value={quickFullNameInput}
                          onChange={(e) => {
                            setIsManualNameEdit(false);
                            setQuickFullNameInput(e.target.value);
                          }}
                          placeholder="Ex: Martial BIKOO ou Stella Lankoande"
                          className="w-full min-h-[44px] px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-600"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Numéro de téléphone
                        </label>
                        <input
                          type="tel"
                          value={quickPhone}
                          onChange={(e) => setQuickPhone(e.target.value)}
                          placeholder="Ex: 61 02 33 61"
                          className="w-full min-h-[44px] px-3.5 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-600"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Pasteur référent
                        </label>
                        <select
                          disabled={session?.role === 'pastor' && session.pastorId !== 'all'}
                          value={
                            session?.role === 'pastor' && session.pastorId !== 'all'
                              ? session.pastorId
                              : quickPastorId
                          }
                          onChange={(e) => setQuickPastorId(e.target.value)}
                          className="w-full min-h-[44px] px-3.5 py-2 text-sm bg-white disabled:bg-slate-100 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-600"
                        >
                          {pastors.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-2 flex items-end">
                        <button
                          type="submit"
                          disabled={
                            isAddingMember ||
                            (!quickFullNameInput.trim() &&
                              !quickLastName.trim() &&
                              !quickFirstName.trim())
                          }
                          className="w-full min-h-[44px] py-2.5 px-4 text-xs font-semibold text-white bg-amber-700 rounded-xl hover:bg-amber-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
                        >
                          <Plus className="w-4 h-4" />
                          Ajouter
                        </button>
                      </div>
                    </div>

                    {/* Automatic Recognition Preview Bar */}
                    {(quickFullNameInput.trim() ||
                      quickLastName.trim() ||
                      quickFirstName.trim()) && (
                      <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2.5 flex-1">
                          <span className="text-xs font-bold text-amber-900">
                            Reconnu automatiquement :
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-slate-600">Nom :</span>
                            <input
                              type="text"
                              value={quickLastName}
                              onChange={(e) => {
                                setIsManualNameEdit(true);
                                setQuickLastName(e.target.value.toUpperCase());
                              }}
                              placeholder="NOM"
                              className="w-28 sm:w-32 min-h-[36px] px-2.5 py-1 text-xs font-bold uppercase bg-white border border-slate-300 rounded-lg"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setIsManualNameEdit(true);
                              const prevLast = quickLastName;
                              setQuickLastName(quickFirstName.toUpperCase());
                              setQuickFirstName(prevLast);
                            }}
                            className="min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-600 hover:text-amber-800 bg-white border border-slate-300 rounded-lg"
                            title="Inverser Nom et Prénoms"
                          >
                            <ArrowLeftRight className="w-3.5 h-3.5" />
                          </button>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-slate-600">Prénoms :</span>
                            <input
                              type="text"
                              value={quickFirstName}
                              onChange={(e) => {
                                setIsManualNameEdit(true);
                                setQuickFirstName(e.target.value);
                              }}
                              placeholder="Prénoms"
                              className="w-32 sm:w-36 min-h-[36px] px-2.5 py-1 text-xs font-medium bg-white border border-slate-300 rounded-lg"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-600">Paiement :</span>
                          <select
                            value={quickPaymentStatus}
                            onChange={(e) =>
                              setQuickPaymentStatus(e.target.value as PaymentStatus)
                            }
                            className="min-h-[36px] px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg"
                          >
                            <option value="pending">En attente</option>
                            <option value="partial">Partiel</option>
                            <option value="paid">Payé</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </form>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-slate-600">
                    <strong className="text-slate-900">Mode Consultation :</strong> Déverrouillez
                    votre accès Pasteur avec le Code Suprême pour ajouter un membre, téléverser une
                    CNIB ou entrer le montant soulevé.
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAccessModalOpen(true)}
                    className="min-h-[42px] px-4 py-2 text-xs font-semibold text-white bg-amber-700 rounded-xl hover:bg-amber-800 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Déverrouiller l’accès Pasteur
                  </button>
                </div>
              )}

              {/* Search & Payment Filter Toolbar + Participants List */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="p-3.5 sm:p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
                  {/* Segmented Payment Filter */}
                  <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl overflow-x-auto no-scrollbar">
                    <button
                      type="button"
                      onClick={() => setPaymentFilter('all')}
                      className={`min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                        paymentFilter === 'all'
                          ? 'bg-white text-slate-900 shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Tous ({kpiStats.totalCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentFilter('paid')}
                      className={`min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                        paymentFilter === 'paid'
                          ? 'bg-white text-emerald-800 shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Payés ({kpiStats.paidCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentFilter('partial')}
                      className={`min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                        paymentFilter === 'partial'
                          ? 'bg-white text-amber-800 shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Partiels ({kpiStats.partialCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentFilter('pending')}
                      className={`min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                        paymentFilter === 'pending'
                          ? 'bg-white text-slate-900 shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      En attente (
                      {kpiStats.totalCount - kpiStats.paidCount - kpiStats.partialCount})
                    </button>
                  </div>

                  {/* Search Input */}
                  <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Rechercher nom, prénom, téléphone..."
                      className="w-full min-h-[40px] pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-600"
                    />
                  </div>
                </div>

                {/* Empty / Loading / Populated States */}
                {isLoadingCloud ? (
                  <div className="p-6 space-y-3">
                    {[1, 2, 3, 4].map((n) => (
                      <div
                        key={n}
                        className="h-12 bg-slate-100 animate-pulse rounded-xl w-full"
                      />
                    ))}
                  </div>
                ) : filteredParticipants.length === 0 ? (
                  <div className="p-10 text-center">
                    <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <h3 className="text-sm font-semibold text-slate-900">
                      Aucun participant enregistré dans cette vue
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                      {selectedPastor
                        ? `La liste de ${selectedPastor.name} ne contient pas encore de participant pour ce filtre.`
                        : 'Aucun participant ne correspond à votre recherche.'}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* MOBILE TAP LIST ROWS (< md) */}
                    <div className="md:hidden divide-y divide-slate-100">
                      {filteredParticipants.map((part, idx) => {
                        const pastor = pastorMap.get(part.pastorId);
                        const hasRecto = Boolean(part.cnibRectoUrl);
                        const hasVerso = Boolean(part.cnibVersoUrl);
                        const canEditRow = canEditPastorScope(part.pastorId);
                        const isConfirmingDelete = confirmInlineDeleteId === part.id;

                        return (
                          <div
                            key={part.id}
                            onClick={() => setActiveParticipantId(part.id)}
                            className="p-4 active:bg-amber-50/70 transition-colors flex flex-col gap-2.5 cursor-pointer"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-2.5 min-w-0">
                                <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 font-mono-tabular font-semibold text-xs flex items-center justify-center shrink-0 mt-0.5">
                                  {idx + 1}
                                </span>
                                <div className="min-w-0">
                                  <div className="text-sm font-bold text-slate-900 leading-snug">
                                    {part.lastName ? (
                                      <>
                                        <span className="uppercase">{part.lastName}</span>{' '}
                                        <span>{part.firstName}</span>
                                      </>
                                    ) : (
                                      <span>{part.fullName}</span>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                                    <span className="font-medium text-amber-800">
                                      {pastor?.name || 'Pasteur'}
                                    </span>
                                    {part.phone && (
                                      <>
                                        <span aria-hidden="true">·</span>
                                        <span className="font-mono-tabular text-slate-700 flex items-center gap-1">
                                          <Phone className="w-3 h-3 text-slate-400" />
                                          {part.phone}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div
                                className="flex items-center gap-1.5 shrink-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {canEditRow &&
                                  (isConfirmingDelete ? (
                                    <div className="flex items-center gap-1 bg-red-50 border border-red-200 rounded-lg px-2 py-1">
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteParticipant(part.id)}
                                        className="px-2 py-1 text-[11px] font-bold text-white bg-red-600 rounded hover:bg-red-700"
                                      >
                                        Supprimer
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setConfirmInlineDeleteId(null)}
                                        className="px-1.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900"
                                      >
                                        Non
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setConfirmInlineDeleteId(part.id)}
                                      title="Supprimer ce participant"
                                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  ))}
                                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                              </div>
                            </div>

                            {/* Bottom quick action strip on mobile row */}
                            <div className="flex items-center justify-between gap-2 pl-10 pt-1">
                              <div className="flex items-center gap-2 text-xs">
                                <span
                                  className={`px-2.5 py-1 rounded-lg font-semibold border ${
                                    part.paymentStatus === 'paid'
                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                      : part.paymentStatus === 'partial'
                                      ? 'bg-amber-50 border-amber-200 text-amber-800'
                                      : 'bg-slate-100 border-slate-200 text-slate-600'
                                  }`}
                                >
                                  {part.paymentStatus === 'paid'
                                    ? 'Payé'
                                    : part.paymentStatus === 'partial'
                                    ? 'Partiel'
                                    : 'En attente'}
                                </span>
                              </div>

                              <span
                                className={`text-xs font-medium flex items-center gap-1 ${
                                  hasRecto && hasVerso
                                    ? 'text-emerald-700 font-semibold'
                                    : hasRecto || hasVerso
                                    ? 'text-amber-700'
                                    : 'text-amber-800'
                                }`}
                              >
                                <Camera className="w-3.5 h-3.5" />
                                {hasRecto && hasVerso
                                  ? 'CNIB Recto+Verso'
                                  : hasRecto || hasVerso
                                  ? 'CNIB (1 face)'
                                  : 'Ajouter CNIB →'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* DESKTOP HIGH-DENSITY DATA TABLE (>= md) */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                            <th className="py-2.5 px-4 w-14">N°</th>
                            <th className="py-2.5 px-4">Nom & Prénoms</th>
                            <th className="py-2.5 px-4">Numéro de Téléphone</th>
                            <th className="py-2.5 px-4">Pasteur</th>
                            <th className="py-2.5 px-4">CNIB (Recto / Verso)</th>
                            <th className="py-2.5 px-4">Statut Paiement</th>
                            <th className="py-2.5 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-sm">
                          {filteredParticipants.map((part, idx) => {
                            const pastor = pastorMap.get(part.pastorId);
                            const hasRecto = Boolean(part.cnibRectoUrl);
                            const hasVerso = Boolean(part.cnibVersoUrl);
                            const canEditRow = canEditPastorScope(part.pastorId);
                            const isConfirmingDelete = confirmInlineDeleteId === part.id;

                            return (
                              <tr
                                key={part.id}
                                onClick={() => setActiveParticipantId(part.id)}
                                className="h-11 hover:bg-amber-50/50 cursor-pointer transition-colors group"
                              >
                                <td className="py-2.5 px-4 font-mono-tabular text-xs text-slate-500">
                                  {idx + 1}
                                </td>
                                <td className="py-2.5 px-4">
                                  <div className="font-medium text-slate-900 group-hover:text-amber-900">
                                    {part.lastName ? (
                                      <>
                                        <span className="font-semibold uppercase">
                                          {part.lastName}
                                        </span>{' '}
                                        <span>{part.firstName}</span>
                                      </>
                                    ) : (
                                      <span>{part.fullName}</span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2.5 px-4 font-mono-tabular text-xs">
                                  {part.phone ? (
                                    <span className="text-slate-800 font-medium">
                                      {part.phone}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">Non renseigné</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-4 text-xs text-slate-600">
                                  {pastor?.name || 'Pasteur'}
                                  {pastor?.zone && pastor.zone !== 'Homecoming List' && (
                                    <span className="text-slate-400"> · {pastor.zone}</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-4 text-xs">
                                  {hasRecto && hasVerso ? (
                                    <span className="text-emerald-700 font-semibold">
                                      Recto + Verso reçus
                                    </span>
                                  ) : hasRecto || hasVerso ? (
                                    <span className="text-amber-700 font-medium">
                                      1 face reçue ({hasRecto ? 'Recto' : 'Verso'})
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">À téléverser</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-4 text-xs">
                                  <span
                                    className={`font-semibold ${
                                      part.paymentStatus === 'paid'
                                        ? 'text-emerald-700'
                                        : part.paymentStatus === 'partial'
                                        ? 'text-amber-700'
                                        : 'text-slate-500'
                                    }`}
                                  >
                                    {part.paymentStatus === 'paid'
                                      ? 'Payé'
                                      : part.paymentStatus === 'partial'
                                      ? 'Partiel'
                                      : 'En attente'}
                                    {part.amountPaid > 0 && (
                                      <span className="font-mono-tabular font-normal ml-1 text-slate-500">
                                        ({part.amountPaid.toLocaleString('fr-FR')} F)
                                      </span>
                                    )}
                                  </span>
                                </td>
                                <td
                                  className="py-2 px-4 text-right whitespace-nowrap"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="inline-flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setActiveParticipantId(part.id)}
                                      className="text-xs font-medium text-amber-800 hover:underline"
                                    >
                                      Ouvrir / CNIB →
                                    </button>
                                    {canEditRow &&
                                      (isConfirmingDelete ? (
                                        <span className="inline-flex items-center gap-1 bg-red-50 border border-red-200 rounded-lg px-2 py-0.5">
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteParticipant(part.id)}
                                            className="px-2 py-0.5 text-[11px] font-bold text-white bg-red-600 rounded hover:bg-red-700"
                                          >
                                            Oui, supprimer
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setConfirmInlineDeleteId(null)}
                                            className="px-1.5 py-0.5 text-[11px] font-semibold text-slate-600 hover:text-slate-900"
                                          >
                                            Non
                                          </button>
                                        </span>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => setConfirmInlineDeleteId(part.id)}
                                          title="Supprimer ce participant"
                                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      ))}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {/* MOBILE FIXED BOTTOM TAB BAR (Pattern 1 from 10_mobile_touch_apps.md) */}
      <nav
        aria-label="Navigation principale mobile"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 grid grid-cols-4 items-center h-16 px-1"
      >
        <button
          type="button"
          onClick={() => setActiveTab('participants')}
          className={`min-h-[48px] flex flex-col items-center justify-center rounded-xl transition-colors ${
            activeTab === 'participants'
              ? 'text-amber-800 font-bold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px] tracking-tight mt-0.5">
            Membres ({participants.length})
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cnib-gallery')}
          className={`min-h-[48px] flex flex-col items-center justify-center rounded-xl transition-colors ${
            activeTab === 'cnib-gallery'
              ? 'text-amber-800 font-bold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileCheck2 className="w-5 h-5" />
          <span className="text-[10px] tracking-tight mt-0.5">Photos CNIB</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('fundraising')}
          className={`min-h-[48px] flex flex-col items-center justify-center rounded-xl transition-colors ${
            activeTab === 'fundraising'
              ? 'text-amber-800 font-bold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Coins className="w-5 h-5" />
          <span className="text-[10px] tracking-tight mt-0.5">Fonds FCFA</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('export')}
          className={`min-h-[48px] flex flex-col items-center justify-center rounded-xl transition-colors ${
            activeTab === 'export'
              ? 'text-amber-800 font-bold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Share2 className="w-5 h-5" />
          <span className="text-[10px] tracking-tight mt-0.5">Export & App</span>
        </button>
      </nav>

      {/* Desktop Footer */}
      <footer className="hidden lg:block mt-auto border-t border-slate-200 bg-white px-6 py-4">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-2 text-xs text-slate-500">
          <span>Conférence Homecoming au Ghana · Du 3 au 6 Novembre 2026</span>
          <span>
            Cliquez sur un participant pour ouvrir sa fiche et téléverser sa CNIB Recto / Verso
          </span>
        </div>
      </footer>

      {/* Modals & Slide-overs */}
      <PastorAccessModal
        isOpen={isAccessModalOpen}
        onClose={() => setIsAccessModalOpen(false)}
        pastors={pastors}
        session={session}
        selectedPastorId={selectedPastorId}
        onUnlock={(newSession) => {
          setSession(newSession);
          if (newSession.pastorId !== 'all') {
            setSelectedPastorId(newSession.pastorId);
          }
          showToast(`Mode édition activé : ${newSession.pastorName}`);
        }}
        onLock={() => {
          setSession(null);
          showToast('Mode consultation seule activé.');
        }}
        onLockFullApp={() => {
          setIsSupremeUnlocked(false);
          setSession(null);
          showToast('Application verrouillée par Code Suprême.');
        }}
        onAddPastor={handleAddPastor}
        onUpdatePastorPin={handleUpdatePastorPin}
      />

      <SmartImportModal
        isOpen={isSmartImportOpen}
        onClose={() => setIsSmartImportOpen(false)}
        pastors={pastors}
        defaultPastorId={
          session && session.pastorId !== 'all' ? session.pastorId : selectedPastorId
        }
        onConfirmImport={handleBulkImportConfirm}
      />

      <ParticipantDetailModal
        participant={activeParticipant}
        displayNumber={
          activeParticipant
            ? filteredParticipants.findIndex((p) => p.id === activeParticipant.id) + 1 ||
              participants.findIndex((p) => p.id === activeParticipant.id) + 1
            : undefined
        }
        pastors={pastors}
        canEdit={
          activeParticipant ? canEditPastorScope(activeParticipant.pastorId) : false
        }
        onClose={() => setActiveParticipantId(null)}
        onSaveParticipant={handleSaveParticipant}
        onDeleteParticipant={handleDeleteParticipant}
        onRequestUnlock={() => setIsAccessModalOpen(true)}
        onNavigateToCnibGallery={() => setActiveTab('cnib-gallery')}
      />
    </div>
  );
}
