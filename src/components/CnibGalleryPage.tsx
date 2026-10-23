import React, { useState, useMemo } from 'react';
import {
  Camera,
  Check,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  FileCheck2,
  FileText,
  Loader2,
  Search,
  ShieldCheck,
  X,
  ZoomIn,
} from 'lucide-react';
import { Participant, Pastor, UnlockedSession } from '../types';
import { downloadCnibImage } from '../data/initialData';
import { exportParticipantsCnibPdf } from '../utils/cnibPdfExport';

interface CnibGalleryPageProps {
  participants: Participant[];
  pastors: Pastor[];
  selectedPastorId: string;
  onSelectPastorId: (pastorId: string) => void;
  session?: UnlockedSession | null;
  onSelectParticipant?: (p: Participant) => void;
  onSaveParticipant?: (updated: Participant) => Promise<void>;
  onRequestUnlock?: () => void;
  isOfficerStandalone?: boolean;
}

type CnibFilterMode = 'all' | 'has_any' | 'complete' | 'missing';

export const CnibGalleryPage: React.FC<CnibGalleryPageProps> = ({
  participants,
  pastors,
  selectedPastorId,
  onSelectPastorId,
  onSelectParticipant,
  isOfficerStandalone = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [cnibFilter, setCnibFilter] = useState<CnibFilterMode>('all');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<{ current: number; total: number } | null>(
    null
  );
  const [zoomData, setZoomData] = useState<{
    url: string;
    title: string;
    participant: Participant;
    side: 'Recto' | 'Verso';
  } | null>(null);

  const pastorMap = useMemo(() => {
    const map = new Map<string, Pastor>();
    pastors.forEach((p) => map.set(p.id, p));
    return map;
  }, [pastors]);

  // Filtered participants
  const filteredParticipants = useMemo(() => {
    return participants
      .filter((p) => {
        if (selectedPastorId !== 'all' && p.pastorId !== selectedPastorId) return false;

        const hasRecto = Boolean(p.cnibRectoUrl);
        const hasVerso = Boolean(p.cnibVersoUrl);

        if (cnibFilter === 'has_any' && !hasRecto && !hasVerso) return false;
        if (cnibFilter === 'complete' && (!hasRecto || !hasVerso)) return false;
        if (cnibFilter === 'missing' && hasRecto && hasVerso) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName =
            p.fullName.toLowerCase().includes(q) ||
            p.lastName.toLowerCase().includes(q) ||
            p.firstName.toLowerCase().includes(q);
          const matchPhone = p.phone.toLowerCase().includes(q);
          if (!matchName && !matchPhone) return false;
        }

        return true;
      })
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }, [participants, selectedPastorId, cnibFilter, searchQuery]);

  // Stats for current Pastor scope
  const scopedParticipants = useMemo(() => {
    return selectedPastorId === 'all'
      ? participants
      : participants.filter((p) => p.pastorId === selectedPastorId);
  }, [participants, selectedPastorId]);

  const stats = useMemo(() => {
    let completeCount = 0;
    let partialCount = 0;
    let totalPhotosCount = 0;
    scopedParticipants.forEach((p) => {
      const r = Boolean(p.cnibRectoUrl);
      const v = Boolean(p.cnibVersoUrl);
      if (r) totalPhotosCount++;
      if (v) totalPhotosCount++;
      if (r && v) completeCount++;
      else if (r || v) partialCount++;
    });
    return {
      total: scopedParticipants.length,
      completeCount,
      partialCount,
      missingCount: scopedParticipants.length - completeCount - partialCount,
      totalPhotosCount,
    };
  }, [scopedParticipants]);

  const handleDownloadAllVisible = () => {
    let delay = 0;
    filteredParticipants.forEach((p) => {
      if (p.cnibRectoUrl) {
        setTimeout(() => downloadCnibImage(p.cnibRectoUrl, p, 'Recto'), delay);
        delay += 220;
      }
      if (p.cnibVersoUrl) {
        setTimeout(() => downloadCnibImage(p.cnibVersoUrl, p, 'Verso'), delay);
        delay += 220;
      }
    });
  };

  const handleExportPdf = async () => {
    if (isExportingPdf || filteredParticipants.length === 0) return;
    setIsExportingPdf(true);
    setPdfProgress({ current: 0, total: filteredParticipants.length });
    try {
      const selectedPastorName =
        selectedPastorId === 'all'
          ? 'Tous les Groupes'
          : pastorMap.get(selectedPastorId)?.name || 'Groupe Pasteur';

      await exportParticipantsCnibPdf({
        participants: filteredParticipants,
        pastorMap,
        scopeTitle: selectedPastorName,
        onProgress: (current, total) => setPdfProgress({ current, total }),
      });
    } finally {
      setIsExportingPdf(false);
      setPdfProgress(null);
    }
  };

  const getOfficerShareUrl = () => {
    const origin = window.location.origin;
    return `${origin}/photoscnib`;
  };

  const handleCopyOfficerUrl = () => {
    navigator.clipboard.writeText(getOfficerShareUrl());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner for CNIB Exploitation Page */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <img
              src="/hcoming_Logo.png"
              alt="Grâce Internationale Sahel — Homecoming Ghana 2026"
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover shadow-xs shrink-0"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-amber-800 mb-1">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  {isOfficerStandalone
                    ? 'Portail Officiel de Contrôle & Exploitation des Pièces d’Identité (CNIB)'
                    : 'Dossiers Voyage & Frontières'}
                </span>
                <span aria-hidden="true">·</span>
                <span>Homecoming Ghana (3–6 Novembre 2026)</span>
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900">
                {isOfficerStandalone
                  ? 'Registre des Participants & Photos CNIB (Recto / Verso)'
                  : 'Galerie & Exploitation des Photos CNIB (Recto / Verso)'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                {isOfficerStandalone
                  ? 'Consultation officielle, extraction PDF et téléchargement des pièces d’identité (CNIB Recto et Verso) des participants de la délégation Grâce Internationale Sahel — Homecoming Ghana 2026.'
                  : 'Visualisez, extrayez en PDF officiel ou partagez le lien dédié /photoscnib aux officiers de police et de frontière.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {!isOfficerStandalone && (
              <>
                <button
                  type="button"
                  onClick={handleCopyOfficerUrl}
                  className="min-h-[42px] px-3.5 py-2 text-xs font-semibold text-amber-900 bg-amber-50 border border-amber-300 rounded-xl hover:bg-amber-100 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-700" />
                      <span>Lien /photoscnib copié !</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copier lien Officier (/photoscnib)</span>
                    </>
                  )}
                </button>
                <a
                  href="/photoscnib"
                  className="min-h-[42px] px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-300 rounded-xl hover:bg-slate-200 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Ouvrir /photoscnib</span>
                </a>
              </>
            )}

            <button
              type="button"
              disabled={isExportingPdf || filteredParticipants.length === 0}
              onClick={handleExportPdf}
              className="min-h-[42px] px-4 py-2.5 text-xs font-semibold text-white bg-amber-700 rounded-xl hover:bg-amber-800 disabled:opacity-40 transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 shadow-xs"
            >
              {isExportingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>
                    Génération PDF (
                    {pdfProgress ? `${pdfProgress.current}/${pdfProgress.total}` : '...'})
                  </span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>
                    Extraire en PDF — Noms & Photos CNIB ({filteredParticipants.length})
                  </span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={stats.totalPhotosCount === 0}
              onClick={handleDownloadAllVisible}
              className="min-h-[42px] px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-800 disabled:opacity-40 transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              <Download className="w-4 h-4" />
              Télécharger toutes les CNIB ({stats.totalPhotosCount} photo(s))
            </button>
          </div>
        </div>

        {/* Summary Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-slate-200">
          <div>
            <div className="text-xs text-slate-500">Participants enregistrés</div>
            <div className="text-xl font-bold font-mono-tabular text-slate-900 mt-0.5">
              {stats.total}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Dossiers CNIB Complets (Recto + Verso)</div>
            <div className="text-xl font-bold font-mono-tabular text-emerald-700 mt-0.5">
              {stats.completeCount}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Dossiers Partiels (1 face reçue)</div>
            <div className="text-xl font-bold font-mono-tabular text-amber-700 mt-0.5">
              {stats.partialCount}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">En attente de CNIB</div>
            <div className="text-xl font-bold font-mono-tabular text-slate-600 mt-0.5">
              {stats.missingCount}
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Pastor Select */}
          <select
            value={selectedPastorId}
            onChange={(e) => onSelectPastorId(e.target.value)}
            className="min-h-[40px] px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-600"
          >
            <option value="all">Tous les Groupes ({participants.length})</option>
            {pastors.map((p) => {
              const count = participants.filter((part) => part.pastorId === p.id).length;
              return (
                <option key={p.id} value={p.id}>
                  {p.name} ({count})
                </option>
              );
            })}
          </select>

          {/* Segmented Filter Control */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setCnibFilter('all')}
              className={`min-h-[34px] px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                cnibFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tous ({scopedParticipants.length})
            </button>
            <button
              type="button"
              onClick={() => setCnibFilter('has_any')}
              className={`min-h-[34px] px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                cnibFilter === 'has_any'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Avec Photos ({stats.completeCount + stats.partialCount})
            </button>
            <button
              type="button"
              onClick={() => setCnibFilter('complete')}
              className={`min-h-[34px] px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                cnibFilter === 'complete'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Complets ({stats.completeCount})
            </button>
            <button
              type="button"
              onClick={() => setCnibFilter('missing')}
              className={`min-h-[34px] px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                cnibFilter === 'missing'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Incomplets ({stats.missingCount + stats.partialCount})
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher nom, prénom, téléphone..."
            className="w-full min-h-[40px] pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-600"
          />
        </div>
      </div>

      {/* Cards Grid */}
      {filteredParticipants.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <FileCheck2 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-900">
            Aucun dossier participant trouvé pour ce filtre
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {isOfficerStandalone
              ? 'Aucun participant ne correspond aux critères de recherche sélectionnés.'
              : 'Modifiez le filtre de statut CNIB ou cliquez sur un participant pour téléverser ses photos Recto et Verso.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredParticipants.map((participant, idx) => {
            const pastor = pastorMap.get(participant.pastorId);
            const hasRecto = Boolean(participant.cnibRectoUrl);
            const hasVerso = Boolean(participant.cnibVersoUrl);

            return (
              <div
                key={participant.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between space-y-4"
              >
                {/* Participant Identity Header */}
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                      <span className="font-mono-tabular font-semibold text-slate-700">
                        N° {idx + 1}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-medium text-amber-800">
                        {pastor?.name || 'Groupe'}
                      </span>
                      {participant.phone && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono-tabular text-slate-600">
                            {participant.phone}
                          </span>
                        </>
                      )}
                    </div>
                    {isOfficerStandalone || !onSelectParticipant ? (
                      <h3 className="text-base font-bold text-slate-900">
                        {participant.lastName ? (
                          <>
                            <span className="uppercase">{participant.lastName}</span>{' '}
                            <span>{participant.firstName}</span>
                          </>
                        ) : (
                          participant.fullName
                        )}
                      </h3>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSelectParticipant(participant)}
                        className="text-left group"
                      >
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-amber-800 transition-colors">
                          {participant.lastName ? (
                            <>
                              <span className="uppercase">{participant.lastName}</span>{' '}
                              <span>{participant.firstName}</span>
                            </>
                          ) : (
                            participant.fullName
                          )}
                        </h3>
                      </button>
                    )}
                  </div>

                  {/* Clean text status + Download Both or Open Fiche action */}
                  <div className="flex items-center gap-2 shrink-0">
                    {hasRecto && hasVerso && (
                      <button
                        type="button"
                        onClick={() => {
                          downloadCnibImage(participant.cnibRectoUrl, participant, 'Recto');
                          setTimeout(
                            () => downloadCnibImage(participant.cnibVersoUrl, participant, 'Verso'),
                            250
                          );
                        }}
                        className="min-h-[36px] px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Recto + Verso
                      </button>
                    )}
                    {!isOfficerStandalone && onSelectParticipant && (
                      <button
                        type="button"
                        onClick={() => onSelectParticipant(participant)}
                        className="min-h-[36px] px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-1 whitespace-nowrap"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Ouvrir la fiche
                      </button>
                    )}
                  </div>
                </div>

                {/* Two-Column CNIB Recto & Verso Exploitation Frames */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* RECTO */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">CNIB — Recto</span>
                      <span className={hasRecto ? 'text-emerald-700 font-medium' : 'text-slate-400'}>
                        {hasRecto ? 'Disponible' : 'Non téléversé'}
                      </span>
                    </div>

                    {hasRecto ? (
                      <div className="space-y-2">
                        <div className="relative group aspect-16/10 bg-slate-900 rounded-lg overflow-hidden border border-slate-200">
                          <img
                            src={participant.cnibRectoUrl}
                            alt={`CNIB Recto ${participant.fullName}`}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setZoomData({
                                url: participant.cnibRectoUrl,
                                title: `CNIB Recto — ${participant.fullName}`,
                                participant,
                                side: 'Recto',
                              })
                            }
                            className="absolute inset-0 bg-slate-900/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium gap-1.5"
                          >
                            <ZoomIn className="w-4 h-4" /> Voir en grand
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            downloadCnibImage(participant.cnibRectoUrl, participant, 'Recto')
                          }
                          className="w-full min-h-[38px] py-1.5 px-3 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Télécharger Recto
                        </button>
                      </div>
                    ) : (
                      <div className="aspect-16/10 border border-dashed border-slate-300 rounded-lg bg-slate-50 flex flex-col items-center justify-center p-3 text-center">
                        <Camera className="w-5 h-5 text-slate-400 mb-1" />
                        <span className="text-[11px] text-slate-500">Aucun Recto</span>
                        {!isOfficerStandalone && onSelectParticipant && (
                          <button
                            type="button"
                            onClick={() => onSelectParticipant(participant)}
                            className="mt-2 px-2.5 py-1 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100 flex items-center gap-1"
                          >
                            <span>Ajouter via la fiche</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* VERSO */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">CNIB — Verso</span>
                      <span className={hasVerso ? 'text-emerald-700 font-medium' : 'text-slate-400'}>
                        {hasVerso ? 'Disponible' : 'Non téléversé'}
                      </span>
                    </div>

                    {hasVerso ? (
                      <div className="space-y-2">
                        <div className="relative group aspect-16/10 bg-slate-900 rounded-lg overflow-hidden border border-slate-200">
                          <img
                            src={participant.cnibVersoUrl}
                            alt={`CNIB Verso ${participant.fullName}`}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setZoomData({
                                url: participant.cnibVersoUrl,
                                title: `CNIB Verso — ${participant.fullName}`,
                                participant,
                                side: 'Verso',
                              })
                            }
                            className="absolute inset-0 bg-slate-900/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium gap-1.5"
                          >
                            <ZoomIn className="w-4 h-4" /> Voir en grand
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            downloadCnibImage(participant.cnibVersoUrl, participant, 'Verso')
                          }
                          className="w-full min-h-[38px] py-1.5 px-3 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Télécharger Verso
                        </button>
                      </div>
                    ) : (
                      <div className="aspect-16/10 border border-dashed border-slate-300 rounded-lg bg-slate-50 flex flex-col items-center justify-center p-3 text-center">
                        <Camera className="w-5 h-5 text-slate-400 mb-1" />
                        <span className="text-[11px] text-slate-500">Aucun Verso</span>
                        {!isOfficerStandalone && onSelectParticipant && (
                          <button
                            type="button"
                            onClick={() => onSelectParticipant(participant)}
                            className="mt-2 px-2.5 py-1 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100 flex items-center gap-1"
                          >
                            <span>Ajouter via la fiche</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox Modal for Full-Screen Inspection & Download */}
      {zoomData && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/85 flex items-center justify-center p-4"
          onClick={() => setZoomData(null)}
        >
          <div
            className="bg-white rounded-xl max-w-4xl w-full overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{zoomData.title}</h3>
                <p className="text-xs text-slate-500">
                  Téléchargement renommé automatiquement au nom du participant
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    downloadCnibImage(zoomData.url, zoomData.participant, zoomData.side)
                  }
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-amber-700 rounded-lg hover:bg-amber-800 flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Télécharger {zoomData.side}
                </button>
                <button
                  type="button"
                  onClick={() => setZoomData(null)}
                  className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 bg-slate-900 flex items-center justify-center max-h-[75vh] overflow-auto">
              <img
                src={zoomData.url}
                alt={zoomData.title}
                referrerPolicy="no-referrer"
                className="max-w-full max-h-[68vh] object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
