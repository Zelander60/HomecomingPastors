import React, { useState } from 'react';
import { Check, Coins, Edit3, Lock, Users } from 'lucide-react';
import { Participant, Pastor, UnlockedSession } from '../types';

interface FundraisingPageProps {
  pastors: Pastor[];
  participants: Participant[];
  session: UnlockedSession | null;
  onUpdatePastorFundraising: (
    pastorId: string,
    raisedAmount: number,
    fundraisingNote: string
  ) => Promise<void>;
  onRequestUnlock: () => void;
  onSelectPastorForParticipants: (pastorId: string) => void;
}

export const FundraisingPage: React.FC<FundraisingPageProps> = ({
  pastors,
  participants,
  session,
  onUpdatePastorFundraising,
  onRequestUnlock,
  onSelectPastorForParticipants,
}) => {
  const [editingPastorId, setEditingPastorId] = useState<string | null>(null);
  const [amountInput, setAmountInput] = useState<string>('');
  const [noteInput, setNoteInput] = useState<string>('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedToastId, setSavedToastId] = useState<string | null>(null);

  const totalPastorRaised = pastors.reduce((acc, p) => acc + (p.raisedAmount || 0), 0);
  const totalParticipantIndividualPaid = participants.reduce(
    (acc, part) => acc + (part.amountPaid || 0),
    0
  );
  const paidParticipantsCount = participants.filter((p) => p.paymentStatus === 'paid').length;
  const partialParticipantsCount = participants.filter(
    (p) => p.paymentStatus === 'partial'
  ).length;

  const canEditPastor = (pastorId: string) => {
    if (!session) return false;
    return (
      session.role === 'coordinator' ||
      session.pastorId === 'all' ||
      session.pastorId === pastorId
    );
  };

  const startEditing = (pastor: Pastor) => {
    setEditingPastorId(pastor.id);
    setAmountInput(String(pastor.raisedAmount || 0));
    setNoteInput(pastor.fundraisingNote || '');
  };

  const handleSave = async (pastorId: string) => {
    setSavingId(pastorId);
    try {
      const cleanedNumber = Number(String(amountInput).replace(/\s+/g, '')) || 0;
      const numericAmount = Math.max(0, cleanedNumber);
      await onUpdatePastorFundraising(pastorId, numericAmount, noteInput.trim());
      setEditingPastorId(null);
      setSavedToastId(pastorId);
      setTimeout(() => setSavedToastId(null), 2500);
    } catch {
      // Keep editor open if server write failed; parent App already displayed error toast
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-amber-800 mb-1">
              <span>Suivi Financier & Mobilisation</span>
              <span aria-hidden="true">·</span>
              <span>Homecoming Ghana (3–6 Nov 2026)</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">
              Montants Soulevés par Pasteur & Statuts de Paiement
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Chaque pasteur peut saisir directement le montant d’argent qu’il a pu soulever pour
              son groupe et ajouter une note de suivi.
            </p>
          </div>

          {!session && (
            <button
              type="button"
              onClick={onRequestUnlock}
              className="min-h-[44px] px-4 py-2.5 text-xs font-semibold text-white bg-amber-700 rounded-xl hover:bg-amber-800 transition-colors flex items-center justify-center gap-2 self-stretch sm:self-start lg:self-auto whitespace-nowrap shrink-0"
            >
              <Lock className="w-4 h-4" />
              Déverrouiller pour entrer un montant
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5 pt-5 border-t border-slate-200">
          <div className="p-3 bg-emerald-50/60 border border-emerald-200/70 rounded-xl">
            <div className="text-xs text-emerald-900 font-medium">
              Total Soulevé par les Pasteurs
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono-tabular text-emerald-700 mt-0.5">
              {totalPastorRaised.toLocaleString('fr-FR')} FCFA
            </div>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
            <div className="text-xs text-slate-600 font-medium">
              Participants à jour de paiement
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono-tabular text-slate-900 mt-0.5">
              {paidParticipantsCount}{' '}
              <span className="text-xs font-normal text-slate-500">
                payés · {partialParticipantsCount} partiels
              </span>
            </div>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
            <div className="text-xs text-slate-600 font-medium">
              Versements individuels cumulés
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono-tabular text-slate-800 mt-0.5">
              {totalParticipantIndividualPaid.toLocaleString('fr-FR')} FCFA
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE VIEW (< md): Touch-First Cards for each Pastor */}
      <div className="md:hidden space-y-3">
        {pastors.map((pastor, idx) => {
          const groupMembers = participants.filter((p) => p.pastorId === pastor.id);
          const groupPaid = groupMembers.filter((p) => p.paymentStatus === 'paid').length;
          const isEditing = editingPastorId === pastor.id;
          const editable = canEditPastor(pastor.id);

          return (
            <div
              key={pastor.id}
              className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span className="font-mono-tabular">#{idx + 1}</span>
                    <span aria-hidden="true">·</span>
                    <span>{pastor.zone || 'Homecoming'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectPastorForParticipants(pastor.id)}
                    className="text-base font-bold text-slate-900 hover:text-amber-800 text-left mt-0.5"
                  >
                    {pastor.name}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectPastorForParticipants(pastor.id)}
                  className="px-2.5 py-1 text-xs font-mono-tabular bg-slate-100 rounded-lg text-slate-700 flex items-center gap-1"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>{groupMembers.length}</span>
                  <span className="text-emerald-700">({groupPaid} payés)</span>
                </button>
              </div>

              {isEditing ? (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Montant soulevé par {pastor.name} (FCFA)
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1000}
                      autoFocus
                      value={amountInput}
                      onChange={(e) => setAmountInput(e.target.value)}
                      className="w-full min-h-[44px] px-3.5 py-2 text-base font-mono-tabular font-bold bg-white border border-amber-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-600"
                      placeholder="Ex: 150000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Note / Détail de collecte
                    </label>
                    <input
                      type="text"
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      placeholder="Ex: 1ère tranche mobilisée..."
                      className="w-full min-h-[44px] px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-600"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingPastorId(null)}
                      className="flex-1 min-h-[44px] text-xs font-semibold text-slate-700 bg-slate-100 rounded-xl"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      disabled={savingId === pastor.id}
                      onClick={() => handleSave(pastor.id)}
                      className="flex-1 min-h-[44px] text-xs font-semibold text-white bg-emerald-700 rounded-xl flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      {savingId === pastor.id ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] text-slate-500">Montant soulevé</div>
                    <div
                      className={`text-lg font-bold font-mono-tabular ${
                        pastor.raisedAmount > 0 ? 'text-emerald-700' : 'text-slate-600'
                      }`}
                    >
                      {(pastor.raisedAmount || 0).toLocaleString('fr-FR')} FCFA
                    </div>
                    {pastor.fundraisingNote && (
                      <div className="text-xs text-slate-500 mt-0.5">
                        {pastor.fundraisingNote}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {savedToastId === pastor.id && (
                      <span className="text-xs font-semibold text-emerald-700">
                        Enregistré !
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        editable ? startEditing(pastor) : onRequestUnlock()
                      }
                      className="min-h-[44px] px-3.5 py-2 text-xs font-semibold text-amber-900 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Entrer montant</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* DESKTOP VIEW (>= md): High-Density Table of Pastors & Fundraising */}
      <div className="hidden md:block bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-700" />
            Tableau des Fonds Mobilisés par Groupe Pastoral
          </h2>
          <span className="text-xs text-slate-500 font-mono-tabular">
            {pastors.length} pasteurs enregistrés
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4 w-12">#</th>
                <th className="py-3 px-4">Pasteur / Leader</th>
                <th className="py-3 px-4 text-right">Membres inscrits</th>
                <th className="py-3 px-4 text-right">Membres payés</th>
                <th className="py-3 px-4 text-right">Montant Soulevé par le Pasteur</th>
                <th className="py-3 px-4">Note / Observation</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {pastors.map((pastor, idx) => {
                const groupMembers = participants.filter((p) => p.pastorId === pastor.id);
                const groupPaid = groupMembers.filter((p) => p.paymentStatus === 'paid').length;
                const groupPartial = groupMembers.filter(
                  (p) => p.paymentStatus === 'partial'
                ).length;
                const isEditing = editingPastorId === pastor.id;
                const editable = canEditPastor(pastor.id);

                return (
                  <tr key={pastor.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono-tabular text-xs text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() => onSelectPastorForParticipants(pastor.id)}
                        className="font-semibold text-slate-900 hover:text-amber-800 text-left"
                      >
                        {pastor.name}
                      </button>
                      {pastor.zone && (
                        <span className="text-xs text-slate-500 ml-2">· {pastor.zone}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono-tabular text-slate-800">
                      {groupMembers.length}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono-tabular text-xs">
                      <span className="text-emerald-700 font-semibold">{groupPaid} payé(s)</span>
                      {groupPartial > 0 && (
                        <span className="text-amber-700 ml-1.5">· {groupPartial} partiel(s)</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono-tabular">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            step={1000}
                            autoFocus
                            value={amountInput}
                            onChange={(e) => setAmountInput(e.target.value)}
                            className="w-36 px-2.5 py-1.5 text-xs font-mono-tabular text-right bg-white border border-amber-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                            placeholder="Montant en FCFA"
                          />
                          <span className="text-xs text-slate-500">FCFA</span>
                        </div>
                      ) : (
                        <span
                          className={`font-bold ${
                            pastor.raisedAmount > 0 ? 'text-emerald-700' : 'text-slate-500'
                          }`}
                        >
                          {(pastor.raisedAmount || 0).toLocaleString('fr-FR')} FCFA
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      {isEditing ? (
                        <input
                          type="text"
                          value={noteInput}
                          onChange={(e) => setNoteInput(e.target.value)}
                          placeholder="Note (ex: 1ère tranche collectée...)"
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                        />
                      ) : (
                        pastor.fundraisingNote || <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingPastorId(null)}
                            className="px-2.5 py-1.5 text-xs text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                          >
                            Annuler
                          </button>
                          <button
                            type="button"
                            disabled={savingId === pastor.id}
                            onClick={() => handleSave(pastor.id)}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Enregistrer
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          {savedToastId === pastor.id && (
                            <span className="text-xs text-emerald-700 font-medium">
                              Mis à jour
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              editable ? startEditing(pastor) : onRequestUnlock()
                            }
                            className="px-3 py-1.5 text-xs font-medium text-amber-900 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors inline-flex items-center gap-1.5"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            Entrer montant soulevé
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
