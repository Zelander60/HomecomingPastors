import React, { useState } from 'react';
import {
  Lock,
  Unlock,
  KeyRound,
  ShieldCheck,
  UserPlus,
  X,
  Check,
  Copy,
} from 'lucide-react';
import { Pastor, UnlockedSession } from '../types';
import { MASTER_COORDINATOR_PIN, SUPREME_PASTOR_CODE } from '../data/initialData';

interface PastorAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  pastors: Pastor[];
  session: UnlockedSession | null;
  selectedPastorId: string;
  onUnlock: (session: UnlockedSession) => void;
  onLock: () => void;
  onLockFullApp?: () => void;
  onAddPastor: (name: string, zone: string, pin: string) => Promise<void>;
  onUpdatePastorPin: (pastorId: string, newPin: string) => Promise<void>;
}

export const PastorAccessModal: React.FC<PastorAccessModalProps> = ({
  isOpen,
  onClose,
  pastors,
  session,
  selectedPastorId,
  onUnlock,
  onLock,
  onLockFullApp,
  onAddPastor,
  onUpdatePastorPin,
}) => {
  const [targetId, setTargetId] = useState<string>(
    selectedPastorId !== 'all' ? selectedPastorId : 'all'
  );
  const [pinInput, setPinInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [copiedOfficerUrl, setCopiedOfficerUrl] = useState(false);

  // Create new pastor state
  const [newPastorName, setNewPastorName] = useState('');
  const [newPastorZone, setNewPastorZone] = useState('');
  const [newPastorPin, setNewPastorPin] = useState('2026');
  const [isCreatingPastor, setIsCreatingPastor] = useState(false);

  // Change PIN state
  const [customPin, setCustomPin] = useState('');
  const [pinSavedToast, setPinSavedToast] = useState(false);

  if (!isOpen) return null;

  const handleUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const trimmedPin = pinInput.trim();

    if (targetId === 'all') {
      if (
        trimmedPin === SUPREME_PASTOR_CODE ||
        trimmedPin === MASTER_COORDINATOR_PIN
      ) {
        onUnlock({
          role: 'coordinator',
          pastorId: 'all',
          pastorName: 'Tous les Pasteurs (Coordination)',
        });
        setPinInput('');
        onClose();
      } else {
        setErrorMsg('Code Suprême Pasteur incorrect.');
      }
      return;
    }

    const foundPastor = pastors.find((p) => p.id === targetId);
    if (!foundPastor) {
      setErrorMsg('Veuillez sélectionner un pasteur valide.');
      return;
    }

    if (
      trimmedPin === SUPREME_PASTOR_CODE ||
      trimmedPin === MASTER_COORDINATOR_PIN ||
      trimmedPin === foundPastor.accessPin
    ) {
      onUnlock({
        role: 'pastor',
        pastorId: foundPastor.id,
        pastorName: foundPastor.name,
      });
      setPinInput('');
      onClose();
    } else {
      setErrorMsg(`Code d’accès incorrect pour ${foundPastor.name}.`);
    }
  };

  const handleSwitchPastorSession = (newTargetId: string) => {
    if (newTargetId === 'all') {
      onUnlock({
        role: 'coordinator',
        pastorId: 'all',
        pastorName: 'Tous les Pasteurs (Coordination)',
      });
    } else {
      const found = pastors.find((p) => p.id === newTargetId);
      if (found) {
        onUnlock({
          role: 'pastor',
          pastorId: found.id,
          pastorName: found.name,
        });
      }
    }
  };

  const handleCreatePastor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPastorName.trim()) return;
    setIsCreatingPastor(true);
    try {
      await onAddPastor(
        newPastorName.trim(),
        newPastorZone.trim() || 'Homecoming List',
        newPastorPin.trim() || '2026'
      );
      setNewPastorName('');
      setNewPastorZone('');
      setNewPastorPin('2026');
    } catch {
      // Keep form populated if server write failed
    } finally {
      setIsCreatingPastor(false);
    }
  };

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || session.pastorId === 'all') return;
    if (customPin.trim().length < 4) return;
    try {
      await onUpdatePastorPin(session.pastorId, customPin.trim());
      setCustomPin('');
      setPinSavedToast(true);
      setTimeout(() => setPinSavedToast(false), 2500);
    } catch {
      // Keep customPin input if server write failed
    }
  };

  const handleCopyOfficerLink = () => {
    const url = `${window.location.origin}/photoscnib`;
    navigator.clipboard.writeText(url);
    setCopiedOfficerUrl(true);
    setTimeout(() => setCopiedOfficerUrl(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        <div className="w-10 h-1.5 bg-slate-300 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5">
            {session ? (
              <Unlock className="w-5 h-5 text-emerald-700" />
            ) : (
              <Lock className="w-5 h-5 text-amber-700" />
            )}
            <h2 className="text-base font-bold text-slate-900">
              {session ? 'Espace Pasteur Déverrouillé' : 'Accès Pasteur (Code Suprême)'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-200/60 transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5">
          {!session ? (
            <form onSubmit={handleUnlockSubmit} className="space-y-4">
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Sélectionnez votre profil de pasteur et entrez le Code Suprême Pasteur pour
                déverrouiller l’édition.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Pasteur ou Coordination Générale
                </label>
                <select
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-600"
                >
                  <option value="all">Coordination Générale (Tous les Pasteurs)</option>
                  {pastors.map((pastor) => (
                    <option key={pastor.id} value={pastor.id}>
                      {pastor.name} {pastor.zone ? `— ${pastor.zone}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Code Suprême Pasteur
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    inputMode="numeric"
                    autoFocus
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    placeholder="Entrez le code suprême..."
                    className="w-full min-h-[44px] pl-10 pr-4 py-2.5 text-sm font-mono-tabular font-bold bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-600"
                  />
                </div>
                {errorMsg && (
                  <p className="mt-2 text-xs font-medium text-red-600">{errorMsg}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[44px] px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Fermer
                </button>
                <button
                  type="submit"
                  className="flex-1 sm:flex-initial min-h-[44px] px-5 py-2.5 text-xs font-semibold text-white bg-amber-700 rounded-xl hover:bg-amber-800 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Unlock className="w-4 h-4" />
                  Déverrouiller l’édition
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-5">
              <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Mode Pasteur Actif : {session.pastorName}</span>
                </div>
                <p className="text-xs text-emerald-800 mt-1">
                  Vous avez accès à toutes les pages générales des Pasteurs.
                </p>
              </div>

              {/* Officer Share Link Card */}
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                <div className="text-xs font-bold text-amber-950">
                  Lien dédié Officiers de Police (/photoscnib)
                </div>
                <p className="text-xs text-amber-900">
                  Ce lien ouvre uniquement la page des photos CNIB, isolée de l’application et sans
                  bouton retour vers vos pages générales.
                </p>
                <button
                  type="button"
                  onClick={handleCopyOfficerLink}
                  className="w-full min-h-[40px] px-3 py-2 text-xs font-semibold text-amber-950 bg-white border border-amber-300 rounded-lg hover:bg-amber-100 flex items-center justify-center gap-1.5"
                >
                  {copiedOfficerUrl ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Lien /photoscnib copié !</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copier le lien /photoscnib</span>
                    </>
                  )}
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Changer de profil Pasteur actif
                </label>
                <select
                  value={session.pastorId}
                  onChange={(e) => handleSwitchPastorSession(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-600"
                >
                  <option value="all">Coordination Générale (Tous les Pasteurs)</option>
                  {pastors.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.zone ? `(${p.zone})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {session.pastorId !== 'all' && (
                <form onSubmit={handleUpdatePin} className="space-y-2 border-t border-slate-200 pt-4">
                  <label className="block text-xs font-semibold text-slate-800">
                    Modifier le code PIN personnel de {session.pastorName}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={customPin}
                      onChange={(e) => setCustomPin(e.target.value)}
                      placeholder="Nouveau code (4 à 12 caractères)"
                      minLength={4}
                      maxLength={12}
                      className="flex-1 min-h-[44px] px-3 py-2 text-xs font-mono-tabular border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-600"
                    />
                    <button
                      type="submit"
                      className="min-h-[44px] px-3.5 py-2 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors whitespace-nowrap"
                    >
                      Enregistrer
                    </button>
                  </div>
                  {pinSavedToast && (
                    <p className="text-xs text-emerald-700 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Code d’accès mis à jour.
                    </p>
                  )}
                </form>
              )}

              <form onSubmit={handleCreatePastor} className="space-y-3 border-t border-slate-200 pt-4">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                  <UserPlus className="w-4 h-4 text-amber-700" />
                  <span>Ajouter un nouveau Pasteur / Leader dans la base</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    value={newPastorName}
                    onChange={(e) => setNewPastorName(e.target.value)}
                    placeholder="Nom (ex: Ps David)"
                    className="min-h-[44px] px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-600"
                  />
                  <input
                    type="text"
                    value={newPastorZone}
                    onChange={(e) => setNewPastorZone(e.target.value)}
                    placeholder="Zone / Liste (ex: Zone 2)"
                    className="min-h-[44px] px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-600"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isCreatingPastor || !newPastorName.trim()}
                  className="w-full min-h-[44px] py-2 px-3 text-xs font-semibold text-amber-900 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 disabled:opacity-50 transition-colors"
                >
                  {isCreatingPastor ? 'Création en cours...' : '+ Créer ce groupe pastoral'}
                </button>
              </form>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-3 border-t border-slate-200">
                <div className="flex items-center gap-2">
                  {onLockFullApp && (
                    <button
                      type="button"
                      onClick={() => {
                        onLockFullApp();
                        onClose();
                      }}
                      className="flex-1 sm:flex-initial min-h-[44px] px-3.5 py-2 text-xs font-semibold text-red-700 bg-red-50 rounded-xl hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      Verrouiller l’app (Code Suprême)
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      onLock();
                      onClose();
                    }}
                    className="min-h-[44px] px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    Lecture seule
                  </button>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[44px] px-5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
