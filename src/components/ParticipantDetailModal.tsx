import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  AlertCircle,
  Camera,
  Check,
  Download,
  ExternalLink,
  FileCheck2,
  Lock,
  RotateCcw,
  Trash2,
  Upload,
  User,
  X,
  ZoomIn,
} from 'lucide-react';
import { Participant, Pastor, PaymentStatus } from '../types';
import { compressCnibImage, downloadCnibImage } from '../data/initialData';

interface ParticipantDetailModalProps {
  participant: Participant | null;
  displayNumber?: number;
  pastors: Pastor[];
  canEdit: boolean;
  onClose: () => void;
  onSaveParticipant: (updated: Participant) => Promise<void>;
  onDeleteParticipant: (participantId: string) => Promise<void>;
  onRequestUnlock: () => void;
  onNavigateToCnibGallery: () => void;
}

export const ParticipantDetailModal: React.FC<ParticipantDetailModalProps> = ({
  participant,
  displayNumber,
  pastors,
  canEdit,
  onClose,
  onSaveParticipant,
  onDeleteParticipant,
  onRequestUnlock,
  onNavigateToCnibGallery,
}) => {
  // Draft form state — ONLY persisted when the user clicks "Enregistrer la fiche"
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [phone, setPhone] = useState('');
  const [pastorId, setPastorId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pending');
  const [amountPaid, setAmountPaid] = useState<string>('0');
  const [notes, setNotes] = useState('');
  const [cnibRectoUrl, setCnibRectoUrl] = useState('');
  const [cnibVersoUrl, setCnibVersoUrl] = useState('');

  const [uploadingSide, setUploadingSide] = useState<'recto' | 'verso' | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);
  const [zoomTitle, setZoomTitle] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const rectoInputRef = useRef<HTMLInputElement>(null);
  const versoInputRef = useRef<HTMLInputElement>(null);

  const loadedParticipantIdRef = useRef<string | null>(null);

  // Sync draft state ONLY when opening a different participant ID (never wipe unsaved draft on background sync!)
  useEffect(() => {
    if (!participant) {
      loadedParticipantIdRef.current = null;
      return;
    }
    if (loadedParticipantIdRef.current !== participant.id) {
      loadedParticipantIdRef.current = participant.id;
      setLastName(participant.lastName || '');
      setFirstName(participant.firstName || '');
      setPhone(participant.phone || '');
      setPastorId(participant.pastorId);
      setPaymentStatus(participant.paymentStatus);
      setAmountPaid(String(participant.amountPaid || 0));
      setNotes(participant.notes || '');
      setCnibRectoUrl(participant.cnibRectoUrl || '');
      setCnibVersoUrl(participant.cnibVersoUrl || '');
      setErrorMsg('');
      setSaveSuccess(false);
      setConfirmDiscardOpen(false);
      setConfirmDeleteOpen(false);
    }
  }, [participant]);

  // Detect if any field or CNIB photo has been modified compared to the saved participant
  const hasUnsavedChanges = useMemo(() => {
    if (!participant) return false;
    const cleanLast = lastName.trim().toUpperCase();
    const origLast = (participant.lastName || '').trim().toUpperCase();
    const cleanFirst = firstName.trim();
    const origFirst = (participant.firstName || '').trim();
    const cleanPhone = phone.trim();
    const origPhone = (participant.phone || '').trim();
    const cleanAmount = Math.max(0, Number(amountPaid) || 0);
    const origAmount = Math.max(0, Number(participant.amountPaid) || 0);
    const cleanNotes = notes.trim();
    const origNotes = (participant.notes || '').trim();

    return (
      cleanLast !== origLast ||
      cleanFirst !== origFirst ||
      cleanPhone !== origPhone ||
      pastorId !== participant.pastorId ||
      paymentStatus !== participant.paymentStatus ||
      cleanAmount !== origAmount ||
      cleanNotes !== origNotes ||
      cnibRectoUrl !== (participant.cnibRectoUrl || '') ||
      cnibVersoUrl !== (participant.cnibVersoUrl || '')
    );
  }, [
    participant,
    lastName,
    firstName,
    phone,
    pastorId,
    paymentStatus,
    amountPaid,
    notes,
    cnibRectoUrl,
    cnibVersoUrl,
  ]);

  if (!participant) return null;

  const isRectoModified = cnibRectoUrl !== (participant.cnibRectoUrl || '');
  const isVersoModified = cnibVersoUrl !== (participant.cnibVersoUrl || '');

  const pastorName =
    pastors.find((p) => p.id === pastorId)?.name || 'Pasteur non défini';

  const resetDraftToSaved = () => {
    setLastName(participant.lastName || '');
    setFirstName(participant.firstName || '');
    setPhone(participant.phone || '');
    setPastorId(participant.pastorId);
    setPaymentStatus(participant.paymentStatus);
    setAmountPaid(String(participant.amountPaid || 0));
    setNotes(participant.notes || '');
    setCnibRectoUrl(participant.cnibRectoUrl || '');
    setCnibVersoUrl(participant.cnibVersoUrl || '');
    setErrorMsg('');
    setConfirmDiscardOpen(false);
  };

  const handleRequestClose = () => {
    if (hasUnsavedChanges) {
      setConfirmDiscardOpen(true);
      return;
    }
    onClose();
  };

  const buildUpdatedParticipant = (): Participant => {
    const cleanLast = lastName.trim().toUpperCase();
    const cleanFirst = firstName.trim();
    const fullName =
      [cleanFirst, cleanLast].filter(Boolean).join(' ').trim() ||
      participant.fullName ||
      'Participant';
    const nowIso = new Date().toISOString();

    const cnibChanged = isRectoModified || isVersoModified;

    return {
      ...participant,
      lastName: cleanLast,
      firstName: cleanFirst,
      fullName,
      phone: phone.trim(),
      pastorId: pastorId || participant.pastorId,
      paymentStatus,
      amountPaid: Math.max(0, Number(amountPaid) || 0),
      cnibRectoUrl,
      cnibVersoUrl,
      cnibUpdatedAt: cnibChanged
        ? cnibRectoUrl || cnibVersoUrl
          ? nowIso
          : ''
        : participant.cnibUpdatedAt || '',
      notes: notes.trim(),
      updatedAt: nowIso,
    };
  };

  // Only prepares/previews the CNIB photo in local draft state — DOES NOT auto-save!
  const handleImageFileChange = async (
    side: 'recto' | 'verso',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingSide(side);
    setErrorMsg('');
    setSaveSuccess(false);
    try {
      const compressedDataUrl = await compressCnibImage(file);
      if (side === 'recto') {
        setCnibRectoUrl(compressedDataUrl);
      } else {
        setCnibVersoUrl(compressedDataUrl);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Erreur lors du traitement de la photo CNIB.'
      );
    } finally {
      setUploadingSide(null);
      if (e.target) e.target.value = '';
    }
  };

  // Only clears the CNIB photo in local draft state — DOES NOT auto-save!
  const handleClearCnibSide = (side: 'recto' | 'verso') => {
    if (!canEdit) {
      onRequestUnlock();
      return;
    }
    setSaveSuccess(false);
    if (side === 'recto') setCnibRectoUrl('');
    else setCnibVersoUrl('');
  };

  // Explicit Save Handler — ONLY called when clicking "Enregistrer la fiche"
  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      onRequestUnlock();
      return;
    }
    const cleanLast = lastName.trim().toUpperCase();
    const cleanFirst = firstName.trim();
    const fullName = [cleanFirst, cleanLast].filter(Boolean).join(' ').trim();
    if (!fullName) {
      setErrorMsg('Veuillez renseigner au moins un nom ou un prénom.');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');
    try {
      const updated = buildUpdatedParticipant();
      await onSaveParticipant(updated);
      setSaveSuccess(true);
      setConfirmDiscardOpen(false);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Erreur lors de la sauvegarde.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-t-3xl sm:rounded-none border-t sm:border-t-0 sm:border-l border-slate-200 w-full max-w-2xl h-[92vh] sm:h-full flex flex-col shadow-2xl overflow-hidden">
        {/* Mobile grab handle */}
        <div className="w-10 h-1.5 bg-slate-300 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

        {/* Top bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-mono-tabular font-semibold text-sm shrink-0">
              #{displayNumber ?? participant.orderIndex}
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                {[firstName, lastName].filter(Boolean).join(' ') || participant.fullName}
              </h2>
              <p className="text-xs text-slate-500 truncate">
                {pastorName} · Homecoming Ghana 2026
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {hasUnsavedChanges && (
              <span className="text-xs font-semibold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-lg">
                Non enregistré
              </span>
            )}
            {!hasUnsavedChanges && saveSuccess && (
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Enregistré
              </span>
            )}
            <button
              type="button"
              onClick={handleRequestClose}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-200/60 transition-colors"
              aria-label="Fermer la fiche"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Unsaved discard confirmation banner */}
        {confirmDiscardOpen && hasUnsavedChanges && (
          <div className="px-4 sm:px-6 py-3 bg-amber-50 border-b border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            <div className="flex items-start gap-2 text-xs text-amber-950">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                <strong>Modifications non enregistrées :</strong> Vous avez modifié cette fiche (ou
                les photos CNIB) sans cliquer sur « Enregistrer la fiche ».
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setConfirmDiscardOpen(false)}
                className="min-h-[38px] px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-100"
              >
                Continuer l’édition
              </button>
              <button
                type="button"
                onClick={() => {
                  resetDraftToSaved();
                  onClose();
                }}
                className="min-h-[38px] px-3 py-1.5 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Fermer sans enregistrer
              </button>
            </div>
          </div>
        )}

        {/* Read-only banner if visitor locked */}
        {!canEdit && (
          <div className="px-4 sm:px-6 py-3 bg-amber-50 border-b border-amber-200 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 text-xs text-amber-900">
              <Lock className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                Mode lecture seule. Déverrouillez l’accès Pasteur avec le Code Suprême pour modifier.
              </span>
            </div>
            <button
              type="button"
              onClick={onRequestUnlock}
              className="min-h-[40px] px-3.5 py-1.5 text-xs font-semibold text-white bg-amber-700 rounded-lg hover:bg-amber-800 whitespace-nowrap shrink-0"
            >
              Déverrouiller
            </button>
          </div>
        )}

        {/* Main Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-medium text-red-700">
              {errorMsg}
            </div>
          )}

          {/* Unsaved Changes Notice Strip */}
          {hasUnsavedChanges && (
            <div className="p-3 bg-amber-50/90 border border-amber-300 rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-amber-950">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  Aperçu en cours : cliquez sur <strong>« Enregistrer la fiche »</strong> en bas
                  pour valider définitivement vos modifications.
                </span>
              </div>
              <button
                type="button"
                onClick={resetDraftToSaved}
                className="px-2.5 py-1.5 text-xs font-semibold text-amber-900 bg-white border border-amber-300 rounded-lg hover:bg-amber-100 flex items-center gap-1 shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Annuler changements
              </button>
            </div>
          )}

          {/* SECTION 1: CNIB Upload & Preview (Recto & Verso) */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-amber-700" />
                  Pièce d’Identité — CNIB (Recto & Verso)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sélectionnez la photo Recto et/ou Verso puis cliquez sur « Enregistrer la fiche »
                  pour valider.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (hasUnsavedChanges) {
                    setConfirmDiscardOpen(true);
                    return;
                  }
                  onClose();
                  onNavigateToCnibGallery();
                }}
                className="text-xs font-semibold text-amber-800 hover:text-amber-900 flex items-center gap-1 underline self-start sm:self-auto"
              >
                <span>Voir toutes les photos CNIB</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Hidden File Inputs */}
            <input
              ref={rectoInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleImageFileChange('recto', e)}
              className="hidden"
            />
            <input
              ref={versoInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleImageFileChange('verso', e)}
              className="hidden"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* CNIB RECTO CARD */}
              <div
                className={`border rounded-2xl p-4 flex flex-col justify-between space-y-3 ${
                  isRectoModified
                    ? 'border-amber-400 bg-amber-50/40'
                    : 'border-slate-200 bg-slate-50/70'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    1. CNIB — Recto (Face avant)
                  </span>
                  <span
                    className={`text-xs font-semibold ${
                      isRectoModified
                        ? 'text-amber-800'
                        : cnibRectoUrl
                        ? 'text-emerald-700'
                        : 'text-slate-500'
                    }`}
                  >
                    {isRectoModified
                      ? 'Modifié (À enregistrer)'
                      : cnibRectoUrl
                      ? 'Enregistré'
                      : 'Manquant'}
                  </span>
                </div>

                {cnibRectoUrl ? (
                  <div className="space-y-3">
                    <div className="relative group aspect-16/10 w-full bg-slate-900 rounded-xl overflow-hidden border border-slate-200">
                      <img
                        src={cnibRectoUrl}
                        alt={`CNIB Recto de ${participant.fullName}`}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setZoomImageUrl(cnibRectoUrl);
                          setZoomTitle(`CNIB Recto — ${participant.fullName}`);
                        }}
                        className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium gap-1.5"
                      >
                        <ZoomIn className="w-4 h-4" /> Agrandir
                      </button>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => downloadCnibImage(cnibRectoUrl, participant, 'Recto')}
                        className="flex-1 min-h-[42px] py-2 px-3 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Télécharger
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          canEdit ? rectoInputRef.current?.click() : onRequestUnlock()
                        }
                        className="min-h-[42px] py-2 px-3 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors"
                      >
                        Changer
                      </button>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleClearCnibSide('recto')}
                          className="min-h-[42px] min-w-[42px] flex items-center justify-center text-slate-400 hover:text-red-600 rounded-xl transition-colors"
                          title="Retirer la photo Recto (nécessite d'enregistrer la fiche)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="aspect-16/10 w-full border-2 border-dashed border-slate-300 rounded-xl bg-white flex flex-col items-center justify-center p-4 text-center">
                    <Camera className="w-6 h-6 text-amber-700 mb-1.5" />
                    <p className="text-xs font-medium text-slate-700">
                      Aucune photo CNIB Recto
                    </p>
                    <button
                      type="button"
                      disabled={uploadingSide === 'recto'}
                      onClick={() =>
                        canEdit ? rectoInputRef.current?.click() : onRequestUnlock()
                      }
                      className="mt-2.5 min-h-[42px] px-4 py-2 text-xs font-semibold text-white bg-amber-700 rounded-xl hover:bg-amber-800 transition-colors flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {uploadingSide === 'recto'
                        ? 'Chargement aperçu...'
                        : 'Choisir CNIB Recto'}
                    </button>
                  </div>
                )}
              </div>

              {/* CNIB VERSO CARD */}
              <div
                className={`border rounded-2xl p-4 flex flex-col justify-between space-y-3 ${
                  isVersoModified
                    ? 'border-amber-400 bg-amber-50/40'
                    : 'border-slate-200 bg-slate-50/70'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    2. CNIB — Verso (Face arrière)
                  </span>
                  <span
                    className={`text-xs font-semibold ${
                      isVersoModified
                        ? 'text-amber-800'
                        : cnibVersoUrl
                        ? 'text-emerald-700'
                        : 'text-slate-500'
                    }`}
                  >
                    {isVersoModified
                      ? 'Modifié (À enregistrer)'
                      : cnibVersoUrl
                      ? 'Enregistré'
                      : 'Manquant'}
                  </span>
                </div>

                {cnibVersoUrl ? (
                  <div className="space-y-3">
                    <div className="relative group aspect-16/10 w-full bg-slate-900 rounded-xl overflow-hidden border border-slate-200">
                      <img
                        src={cnibVersoUrl}
                        alt={`CNIB Verso de ${participant.fullName}`}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setZoomImageUrl(cnibVersoUrl);
                          setZoomTitle(`CNIB Verso — ${participant.fullName}`);
                        }}
                        className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium gap-1.5"
                      >
                        <ZoomIn className="w-4 h-4" /> Agrandir
                      </button>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => downloadCnibImage(cnibVersoUrl, participant, 'Verso')}
                        className="flex-1 min-h-[42px] py-2 px-3 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Télécharger
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          canEdit ? versoInputRef.current?.click() : onRequestUnlock()
                        }
                        className="min-h-[42px] py-2 px-3 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors"
                      >
                        Changer
                      </button>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleClearCnibSide('verso')}
                          className="min-h-[42px] min-w-[42px] flex items-center justify-center text-slate-400 hover:text-red-600 rounded-xl transition-colors"
                          title="Retirer la photo Verso (nécessite d'enregistrer la fiche)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="aspect-16/10 w-full border-2 border-dashed border-slate-300 rounded-xl bg-white flex flex-col items-center justify-center p-4 text-center">
                    <Camera className="w-6 h-6 text-amber-700 mb-1.5" />
                    <p className="text-xs font-medium text-slate-700">
                      Aucune photo CNIB Verso
                    </p>
                    <button
                      type="button"
                      disabled={uploadingSide === 'verso'}
                      onClick={() =>
                        canEdit ? versoInputRef.current?.click() : onRequestUnlock()
                      }
                      className="mt-2.5 min-h-[42px] px-4 py-2 text-xs font-semibold text-white bg-amber-700 rounded-xl hover:bg-amber-800 transition-colors flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {uploadingSide === 'verso'
                        ? 'Chargement aperçu...'
                        : 'Choisir CNIB Verso'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* SECTION 2: Informations Personnelles & Statut de Paiement */}
          <form
            id="participant-detail-form"
            onSubmit={handleSaveDetails}
            className="space-y-4 border-t border-slate-200 pt-5"
          >
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <User className="w-4 h-4 text-slate-700" />
              Informations du Participant & Paiement
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nom de famille (Majuscules)
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Ex: LANKOANDE"
                  className="w-full min-h-[44px] px-3.5 py-2.5 text-sm uppercase font-semibold bg-white disabled:bg-slate-100 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Prénoms
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Ex: Stella"
                  className="w-full min-h-[44px] px-3.5 py-2.5 text-sm bg-white disabled:bg-slate-100 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Numéro de téléphone
                </label>
                <input
                  type="tel"
                  disabled={!canEdit}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ex: +226 61 02 33 61"
                  className="w-full min-h-[44px] px-3.5 py-2.5 text-sm font-mono-tabular bg-white disabled:bg-slate-100 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pasteur référent
                </label>
                <select
                  disabled={!canEdit}
                  value={pastorId}
                  onChange={(e) => setPastorId(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 text-sm bg-white disabled:bg-slate-100 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-600"
                >
                  {pastors.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.zone ? `(${p.zone})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Statut de paiement
                </label>
                <select
                  disabled={!canEdit}
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 text-sm bg-white disabled:bg-slate-100 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-600"
                >
                  <option value="pending">En attente</option>
                  <option value="partial">Paiement partiel</option>
                  <option value="paid">Payé (À jour)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Montant individuel versé (FCFA)
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={500}
                  disabled={!canEdit}
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 text-sm font-mono-tabular bg-white disabled:bg-slate-100 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Observations / Notes (Passeport, Bus, Hébergement...)
              </label>
              <textarea
                rows={2}
                disabled={!canEdit}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes optionnelles sur le participant..."
                className="w-full px-3.5 py-2.5 text-sm bg-white disabled:bg-slate-100 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-600"
              />
            </div>
          </form>
        </div>

        {/* Sticky Bottom Action Bar */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-slate-200 bg-white flex items-center justify-between gap-3 shrink-0">
          {canEdit ? (
            confirmDeleteOpen ? (
              <div className="flex items-center justify-between gap-2 w-full">
                <span className="text-xs font-semibold text-red-800">
                  Supprimer définitivement ce participant ?
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteOpen(false)}
                    className="min-h-[40px] px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200"
                  >
                    Non, annuler
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await onDeleteParticipant(participant.id);
                      onClose();
                    }}
                    className="min-h-[40px] px-3.5 py-1.5 text-xs font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700"
                  >
                    Oui, retirer
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteOpen(true)}
                  className="min-h-[44px] px-3.5 py-2 text-xs font-semibold text-red-700 bg-red-50 rounded-xl hover:bg-red-100 transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Retirer</span>
                </button>

                <div className="flex items-center gap-2.5 flex-1 sm:flex-initial justify-end">
                  <button
                    type="button"
                    onClick={handleRequestClose}
                    className="min-h-[44px] px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    Fermer
                  </button>
                  <button
                    type="submit"
                    form="participant-detail-form"
                    disabled={isSaving || !hasUnsavedChanges}
                    className={`flex-1 sm:flex-initial min-h-[44px] px-5 py-2.5 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 ${
                      hasUnsavedChanges
                        ? 'text-white bg-amber-700 hover:bg-amber-800 shadow-sm'
                        : 'text-slate-400 bg-slate-100 cursor-not-allowed'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    {isSaving
                      ? 'Enregistrement...'
                      : hasUnsavedChanges
                      ? 'Enregistrer la fiche'
                      : 'Fiche à jour'}
                  </button>
                </div>
              </>
            )
          ) : (
            <button
              type="button"
              onClick={onRequestUnlock}
              className="w-full min-h-[44px] rounded-xl bg-amber-700 text-white text-xs font-semibold hover:bg-amber-800 transition-colors flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              Déverrouiller l’accès Pasteur pour modifier
            </button>
          )}
        </div>
      </div>

      {/* Lightbox Zoom Modal */}
      {zoomImageUrl && (
        <div
          className="fixed inset-0 z-60 bg-slate-950/85 flex flex-col items-center justify-center p-4"
          onClick={() => setZoomImageUrl(null)}
        >
          <div
            className="max-w-4xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50">
              <span className="text-sm font-semibold text-slate-900">{zoomTitle}</span>
              <button
                type="button"
                onClick={() => setZoomImageUrl(null)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-500 hover:text-slate-900 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-slate-900 flex items-center justify-center max-h-[75vh] overflow-auto">
              <img
                src={zoomImageUrl}
                alt={zoomTitle}
                referrerPolicy="no-referrer"
                className="max-w-full max-h-[70vh] object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
