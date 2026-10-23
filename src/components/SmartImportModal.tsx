import React, { useState, useEffect } from 'react';
import { ArrowLeftRight, Check, ClipboardPaste, Plus, Trash2, X } from 'lucide-react';
import { Pastor, ParsedImportRow, PaymentStatus } from '../types';
import { parseParticipantLines } from '../data/initialData';

interface SmartImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  pastors: Pastor[];
  defaultPastorId: string;
  onConfirmImport: (pastorId: string, rows: ParsedImportRow[]) => Promise<void>;
}

export const SmartImportModal: React.FC<SmartImportModalProps> = ({
  isOpen,
  onClose,
  pastors,
  defaultPastorId,
  onConfirmImport,
}) => {
  const [targetPastorId, setTargetPastorId] = useState<string>(
    defaultPastorId !== 'all' ? defaultPastorId : pastors[0]?.id || 'ps-pierre'
  );
  const [rawText, setRawText] = useState<string>('');
  const [previewRows, setPreviewRows] = useState<ParsedImportRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (defaultPastorId !== 'all') {
      setTargetPastorId(defaultPastorId);
    }
  }, [defaultPastorId]);

  useEffect(() => {
    const parsed = parseParticipantLines(rawText);
    setPreviewRows(parsed);
  }, [rawText]);

  if (!isOpen) return null;

  const handleRowChange = (
    tempId: string,
    field: keyof ParsedImportRow,
    value: string | boolean
  ) => {
    setPreviewRows((prev) =>
      prev.map((row) => (row.tempId === tempId ? { ...row, [field]: value } : row))
    );
  };

  const handleSwapName = (tempId: string) => {
    setPreviewRows((prev) =>
      prev.map((row) =>
        row.tempId === tempId
          ? {
              ...row,
              lastName: row.firstName.toUpperCase(),
              firstName: row.lastName,
            }
          : row
      )
    );
  };

  const handleRemoveRow = (tempId: string) => {
    setPreviewRows((prev) => prev.filter((r) => r.tempId !== tempId));
  };

  const handleAddBlankRow = () => {
    setPreviewRows((prev) => [
      ...prev,
      {
        tempId: `manual-${Date.now()}`,
        rawLine: '',
        lastName: '',
        firstName: '',
        phone: '',
        paymentStatus: 'pending',
        selected: true,
      },
    ]);
  };

  const selectedRows = previewRows.filter(
    (r) => r.selected && (r.lastName.trim() || r.firstName.trim())
  );

  const handleConfirm = async () => {
    if (selectedRows.length === 0) return;
    setIsSubmitting(true);
    try {
      await onConfirmImport(targetPastorId, selectedRows);
      setRawText('');
      setPreviewRows([]);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadSampleText = () => {
    setRawText(
      `1. OUEDRAOGO Samuel - 70 12 34 56\n2. Marie Kaboré 65 43 21 00\n3. ZONGO Emmanuel\n4. SAWADOGO Grâce : +226 54 11 22 33`
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <ClipboardPaste className="w-5 h-5 text-amber-700" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Ajout Multiple & Prévisualisation Automatique (Nom / Prénoms / Téléphone)
              </h2>
              <p className="text-xs text-slate-500">
                Collez une liste WhatsApp : les noms, prénoms et numéros sont reconnus automatiquement
                et modifiables avant validation.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left column: Pastor selector + Paste box */}
            <div className="lg:col-span-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  1. Pasteur de rattachement
                </label>
                <select
                  value={targetPastorId}
                  onChange={(e) => setTargetPastorId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-600"
                >
                  {pastors.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.zone ? `(${p.zone})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    2. Coller la liste brute (format WhatsApp ou libre)
                  </label>
                  <button
                    type="button"
                    onClick={loadSampleText}
                    className="text-xs font-medium text-amber-700 hover:text-amber-800 underline"
                  >
                    Tester avec un exemple
                  </button>
                </div>
                <textarea
                  rows={8}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={`Exemple :\n22. Martial BIKOO 61 02 33 61\n33. BOUDA Awa - 05 15 66 21\n51. Bénédicta Pongo: 44 93 10 45`}
                  className="w-full p-3 text-xs font-mono-tabular bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-600"
                />
                <p className="mt-1.5 text-xs text-slate-500">
                  Chaque ligne est analysée instantanément à droite avec séparation automatique du Nom
                  de famille, des Prénoms et du Numéro de téléphone.
                </p>
              </div>
            </div>

            {/* Right column: Interactive Recognition Preview Table */}
            <div className="lg:col-span-7 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-800">
                  3. Prévisualisation des Noms, Prénoms et Téléphones reconnus (
                  <span className="font-mono-tabular">{selectedRows.length}</span> prêt(s))
                </span>
                <button
                  type="button"
                  onClick={handleAddBlankRow}
                  className="text-xs font-medium text-slate-700 hover:text-slate-900 flex items-center gap-1 px-2.5 py-1 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Ajouter une ligne manuelle
                </button>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden flex-1 bg-white">
                {previewRows.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-sm font-medium text-slate-700">
                      Aucun participant en prévisualisation
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Collez une liste dans la zone de gauche ou cliquez sur « Ajouter une ligne
                      manuelle » pour prévisualiser la reconnaissance automatique Nom / Prénoms.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-80">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                          <th className="py-2.5 px-3 w-8">#</th>
                          <th className="py-2.5 px-2">Nom (Reconnu)</th>
                          <th className="py-2.5 px-1 w-8 text-center" title="Inverser Nom et Prénoms">
                            ⇄
                          </th>
                          <th className="py-2.5 px-2">Prénoms (Reconnus)</th>
                          <th className="py-2.5 px-2">Téléphone</th>
                          <th className="py-2.5 px-2">Paiement</th>
                          <th className="py-2.5 px-2 w-8"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-xs">
                        {previewRows.map((row, index) => (
                          <tr key={row.tempId} className="hover:bg-slate-50/80">
                            <td className="py-2 px-3 font-mono-tabular text-slate-500">
                              <input
                                type="checkbox"
                                checked={row.selected}
                                onChange={(e) =>
                                  handleRowChange(row.tempId, 'selected', e.target.checked)
                                }
                                className="rounded border-slate-300 text-amber-700 focus:ring-amber-600 mr-1.5"
                              />
                              {index + 1}
                            </td>
                            <td className="py-2 px-2">
                              <input
                                type="text"
                                value={row.lastName}
                                onChange={(e) =>
                                  handleRowChange(row.tempId, 'lastName', e.target.value)
                                }
                                placeholder="NOM"
                                className="w-full px-2 py-1 text-xs font-semibold uppercase bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-none focus:border-amber-600"
                              />
                            </td>
                            <td className="py-2 px-1 text-center">
                              <button
                                type="button"
                                onClick={() => handleSwapName(row.tempId)}
                                title="Inverser le Nom et le Prénom"
                                className="p-1 text-slate-400 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors"
                              >
                                <ArrowLeftRight className="w-3.5 h-3.5" />
                              </button>
                            </td>
                            <td className="py-2 px-2">
                              <input
                                type="text"
                                value={row.firstName}
                                onChange={(e) =>
                                  handleRowChange(row.tempId, 'firstName', e.target.value)
                                }
                                placeholder="Prénoms"
                                className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-none focus:border-amber-600"
                              />
                            </td>
                            <td className="py-2 px-2">
                              <input
                                type="text"
                                value={row.phone}
                                onChange={(e) =>
                                  handleRowChange(row.tempId, 'phone', e.target.value)
                                }
                                placeholder="Ex: 61 02 33 61"
                                className="w-full px-2 py-1 text-xs font-mono-tabular bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-none focus:border-amber-600"
                              />
                            </td>
                            <td className="py-2 px-2">
                              <select
                                value={row.paymentStatus}
                                onChange={(e) =>
                                  handleRowChange(
                                    row.tempId,
                                    'paymentStatus',
                                    e.target.value as PaymentStatus
                                  )
                                }
                                className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-none focus:border-amber-600"
                              >
                                <option value="pending">En attente</option>
                                <option value="partial">Partiel</option>
                                <option value="paid">Payé</option>
                              </select>
                            </td>
                            <td className="py-2 px-2 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveRow(row.tempId)}
                                className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                                title="Retirer cette ligne"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
          <div className="text-xs text-slate-600">
            Pasteur cible :{' '}
            <strong className="text-slate-900">
              {pastors.find((p) => p.id === targetPastorId)?.name || 'Sélectionné'}
            </strong>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={selectedRows.length === 0 || isSubmitting}
              onClick={handleConfirm}
              className="px-4 py-2 text-xs font-semibold text-white bg-amber-700 rounded-lg hover:bg-amber-800 disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              {isSubmitting
                ? 'Enregistrement...'
                : `Enregistrer ${selectedRows.length} participant(s)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
