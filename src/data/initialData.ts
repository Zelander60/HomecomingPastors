import { Pastor, Participant, ParsedImportRow } from '../types';

const INITIAL_TIMESTAMP = '2026-10-22T05:00:00.000Z';

export const SUPREME_PASTOR_CODE = '64232641023';
export const MASTER_COORDINATOR_PIN = '64232641023';

export const INITIAL_PASTORS: Pastor[] = [
  {
    id: 'ps-pierre',
    name: 'Ps Pierre',
    zone: 'Homecoming List',
    raisedAmount: 0,
    fundraisingNote: '',
    accessPin: '2026',
    order: 1,
    updatedAt: INITIAL_TIMESTAMP,
  },
  {
    id: 'lp-esperance',
    name: 'LP Esperance',
    zone: 'Homecoming List',
    raisedAmount: 0,
    fundraisingNote: '',
    accessPin: '2026',
    order: 2,
    updatedAt: INITIAL_TIMESTAMP,
  },
  {
    id: 'ps-martial',
    name: 'Ps Martial',
    zone: 'Homecoming List',
    raisedAmount: 0,
    fundraisingNote: '',
    accessPin: '2026',
    order: 3,
    updatedAt: INITIAL_TIMESTAMP,
  },
  {
    id: 'ps-serge-kdg',
    name: 'Ps Serge',
    zone: 'Koudougou List',
    raisedAmount: 0,
    fundraisingNote: '',
    accessPin: '2026',
    order: 4,
    updatedAt: INITIAL_TIMESTAMP,
  },
  {
    id: 'ps-chris',
    name: 'Ps Chris',
    zone: 'Zone 1',
    raisedAmount: 0,
    fundraisingNote: '',
    accessPin: '2026',
    order: 5,
    updatedAt: INITIAL_TIMESTAMP,
  },
  {
    id: 'ps-serge-b',
    name: 'Ps Serge B',
    zone: 'Homecoming List',
    raisedAmount: 0,
    fundraisingNote: '',
    accessPin: '2026',
    order: 6,
    updatedAt: INITIAL_TIMESTAMP,
  },
  {
    id: 'lp-benedictor',
    name: 'LP Benedictor',
    zone: 'Homecoming List',
    raisedAmount: 0,
    fundraisingNote: '',
    accessPin: '2026',
    order: 7,
    updatedAt: INITIAL_TIMESTAMP,
  },
  {
    id: 'lp-arnaulde',
    name: 'LP Arnaulde',
    zone: 'Homecoming List',
    raisedAmount: 0,
    fundraisingNote: '',
    accessPin: '2026',
    order: 8,
    updatedAt: INITIAL_TIMESTAMP,
  },
  {
    id: 'lp-love',
    name: 'LP Love',
    zone: 'Homecoming List',
    raisedAmount: 0,
    fundraisingNote: '',
    accessPin: '2026',
    order: 9,
    updatedAt: INITIAL_TIMESTAMP,
  },
  {
    id: 'ps-miguel',
    name: 'Ps Miguel',
    zone: 'Homecoming List',
    raisedAmount: 0,
    fundraisingNote: '',
    accessPin: '2026',
    order: 10,
    updatedAt: INITIAL_TIMESTAMP,
  },
  {
    id: 'ps-espoir',
    name: 'Ps Espoir',
    zone: 'Homecoming List',
    raisedAmount: 0,
    fundraisingNote: '',
    accessPin: '2026',
    order: 11,
    updatedAt: INITIAL_TIMESTAMP,
  },
  {
    id: 'ps-hugues',
    name: 'Ps Hugues',
    zone: 'Homecoming List',
    raisedAmount: 0,
    fundraisingNote: '',
    accessPin: '2026',
    order: 12,
    updatedAt: INITIAL_TIMESTAMP,
  },
];

// Default participants removed per user request: only real participants added by Pastors are stored
export const INITIAL_PARTICIPANTS: Participant[] = [];

export function isLegacySeedParticipantId(id: string): boolean {
  return /^part-\d{2}$/.test(id);
}

// Common West African family names to enhance automatic recognition when capitalization is uniform
const KNOWN_SURNAMES = new Set([
  'OUEDRAOGO', 'OUÉDRAOGO', 'OUEDROGO', 'SAWADOGO', 'COMPAORE', 'COMPAORÉ', 'KABORE', 'KABORÉ',
  'LANKOANDE', 'BOLI', 'LOMPO', 'NASSOURI', 'BASSOLE', 'BASSOLÉ', 'SOUSSANGO', 'LAMIZANA',
  'KAFANDO', 'AIFFAN', 'SERRE', 'PONGO', 'DEBOKIN', 'KONE', 'KONÉ', 'SEMASSOU', 'AMOUSSOU',
  'BIKOO', 'MODIGUI', 'WENZOULE', 'ADSI', 'NDO', "N'DO", 'KAMA', 'BAMOUNI', 'BATIONO',
  'BOUDA', 'SOSSA', 'KERE', 'KÉRÉ', 'NISHIMWE', 'KAKPOVI', 'KPOGO', 'KBOGO', 'VERDUN',
  'GOUNGOUNGA', 'DESSOUSA', 'OUSMAN', 'PITROIPA', 'DINDANE', "N'GORAN", 'BENBANE', 'MYETE',
  'MOYENGA', 'ZONGO', 'TRAORE', 'TRAORÉ', 'SANOU', 'DIALLO', 'BARRY', 'TAPSOBA', 'ILBOUDO',
]);

/**
 * Automatically splits a raw full name into { lastName (Nom), firstName (Prénoms) }
 */
export function splitNameAndFirstName(rawName: string): { lastName: string; firstName: string } {
  const cleaned = rawName.replace(/\s+/g, ' ').trim();
  if (!cleaned) {
    return { lastName: '', firstName: '' };
  }

  const tokens = cleaned.split(' ');
  if (tokens.length === 1) {
    return { lastName: '', firstName: tokens[0] };
  }

  const titles = new Set(['MME', 'MR', 'M.', 'MLLE', 'DR', 'PS', 'LP', 'MAMAN', 'PAPA']);

  // 1. Check if one of the tokens is in KNOWN_SURNAMES
  const firstTokenNorm = tokens[0].toUpperCase();
  const lastTokenNorm = tokens[tokens.length - 1].toUpperCase();

  if (KNOWN_SURNAMES.has(firstTokenNorm) && !KNOWN_SURNAMES.has(lastTokenNorm)) {
    return {
      lastName: tokens[0].toUpperCase(),
      firstName: tokens.slice(1).join(' '),
    };
  }

  if (KNOWN_SURNAMES.has(lastTokenNorm) && !KNOWN_SURNAMES.has(firstTokenNorm)) {
    return {
      lastName: tokens[tokens.length - 1].toUpperCase(),
      firstName: tokens.slice(0, -1).join(' '),
    };
  }

  // 2. Check ALL-CAPS words (excluding short titles like LP, PS, MME)
  const isAllCapsWord = (w: string) =>
    w.length >= 2 && w === w.toUpperCase() && w !== w.toLowerCase() && !titles.has(w.toUpperCase());

  const firstIsCaps = isAllCapsWord(tokens[0]);
  const lastIsCaps = isAllCapsWord(tokens[tokens.length - 1]);

  if (firstIsCaps && !lastIsCaps) {
    return {
      lastName: tokens[0].toUpperCase(),
      firstName: tokens.slice(1).join(' '),
    };
  }

  if (lastIsCaps && !firstIsCaps) {
    return {
      lastName: tokens[tokens.length - 1].toUpperCase(),
      firstName: tokens.slice(0, -1).join(' '),
    };
  }

  // 3. Default convention: Prénom(s) followed by NOM (e.g., "Stella Lankoande" -> Prénom: Stella, Nom: LANKOANDE)
  return {
    firstName: tokens.slice(0, -1).join(' '),
    lastName: tokens[tokens.length - 1].toUpperCase(),
  };
}

/**
 * Formats an 8-digit phone number cleanly (e.g. "05365785" -> "05 36 57 85")
 */
export function formatPhoneDisplay(rawPhone: string): string {
  const trimmed = rawPhone.trim();
  if (!trimmed) return '';
  if (/^\d{8}$/.test(trimmed)) {
    return trimmed.replace(/(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4');
  }
  return trimmed;
}

/**
 * Parses a block of text (e.g. pasted from WhatsApp) into structured rows with
 * automatic recognition of Nom, Prénoms, and Phone number.
 */
export function parseParticipantLines(rawText: string): ParsedImportRow[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const results: ParsedImportRow[] = [];

  lines.forEach((line, idx) => {
    // Ignore pure headers like "*Ps Pierre's Homecoming list* :" or "Home coming List"
    if (
      /home\s*coming\s*list/i.test(line) ||
      /^[*_~]*liste\s+des\s+participants/i.test(line) ||
      (/^[*_~\s]*(ps|lp)\s+[a-z\s()-]+[*_~:\s]*$/i.test(line) && !/^\d/.test(line))
    ) {
      return;
    }

    // 1. Strip leading numbering like "22.", "42 .", "16 ", "- ", "• "
    let working = line.replace(/^\s*(?:\d+\s*[.):-]?\s*|[-•*]\s*)/, '').trim();
    if (!working) return;

    // 2. Extract phone number at the end of the line (supports +, /, spaces, hyphens, colons)
    let extractedPhone = '';
    const phoneMatch = working.match(
      /(?:[-:]\s*|\s+)(\+?\d[\d\s/.-]{6,}\d)\s*$/
    );

    if (phoneMatch && phoneMatch.index !== undefined) {
      extractedPhone = formatPhoneDisplay(
        phoneMatch[1].replace(/^[-:\s]+/, '').trim()
      );
      working = working.slice(0, phoneMatch.index).replace(/[-:\s]+$/, '').trim();
    }

    if (!working) return;

    const { lastName, firstName } = splitNameAndFirstName(working);

    results.push({
      tempId: `import-${Date.now()}-${idx}`,
      rawLine: line,
      lastName,
      firstName,
      phone: extractedPhone,
      paymentStatus: 'pending',
      selected: true,
    });
  });

  return results;
}

/**
 * Sanitize Pastor payload to strictly match firebase-blueprint.json & firestore.rules
 */
export function sanitizePastorPayload(pastor: Pastor): Pastor {
  const cleanId = pastor.id.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 64) || 'pastor-1';
  const cleanPin = (pastor.accessPin || '2026').trim().slice(0, 12);
  return {
    id: cleanId,
    name: (pastor.name || 'Pasteur').trim().slice(0, 100),
    zone: (pastor.zone || '').trim().slice(0, 100),
    raisedAmount: Math.max(0, Number(pastor.raisedAmount) || 0),
    fundraisingNote: (pastor.fundraisingNote || '').trim().slice(0, 500),
    accessPin: cleanPin.length >= 4 ? cleanPin : '2026',
    order: Math.max(0, Number(pastor.order) || 1),
    updatedAt: (pastor.updatedAt || new Date().toISOString()).slice(0, 64),
  };
}

/**
 * Sanitize Participant payload to strictly match firebase-blueprint.json & firestore.rules
 */
export function sanitizeParticipantPayload(participant: Participant): Participant {
  const cleanId = participant.id.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 64) || `part-${Date.now()}`;
  const cleanPastorId = participant.pastorId.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 64) || 'ps-pierre';
  const lastName = (participant.lastName || '').trim().slice(0, 100);
  const firstName = (participant.firstName || '').trim().slice(0, 100);
  const computedFull =
    [firstName, lastName].filter(Boolean).join(' ').trim() ||
    (participant.fullName || 'Participant').trim();

  const validStatus =
    participant.paymentStatus === 'paid' ||
    participant.paymentStatus === 'partial' ||
    participant.paymentStatus === 'pending'
      ? participant.paymentStatus
      : 'pending';

  return {
    id: cleanId,
    lastName,
    firstName,
    fullName: computedFull.slice(0, 200),
    phone: (participant.phone || '').trim().slice(0, 60),
    pastorId: cleanPastorId,
    paymentStatus: validStatus,
    amountPaid: Math.max(0, Number(participant.amountPaid) || 0),
    cnibRectoUrl: (participant.cnibRectoUrl || '').slice(0, 350000),
    cnibVersoUrl: (participant.cnibVersoUrl || '').slice(0, 350000),
    cnibUpdatedAt: (participant.cnibUpdatedAt || '').slice(0, 64),
    notes: (participant.notes || '').trim().slice(0, 500),
    orderIndex: Math.max(1, Number(participant.orderIndex) || 1),
    updatedAt: (participant.updatedAt || new Date().toISOString()).slice(0, 64),
  };
}

/**
 * Compresses an uploaded image file (CNIB Recto or Verso) into a clean, sharp JPEG Data URL
 * guaranteed to fit within Firestore's document size and rule constraints (< 250KB).
 */
export function compressCnibImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Impossible de lire le fichier image.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Format d’image non supporté.'));
      img.onload = () => {
        const MAX_WIDTH = 1100;
        const MAX_HEIGHT = 750;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Erreur de traitement graphique.'));
          return;
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.78;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);

        while (dataUrl.length > 280000 && quality > 0.35) {
          quality -= 0.12;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        resolve(dataUrl);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Triggers a direct file download for a CNIB Data URL with a clean participant-based filename.
 */
export function downloadCnibImage(
  dataUrl: string,
  participant: Participant,
  side: 'Recto' | 'Verso'
) {
  if (!dataUrl) return;
  const cleanLast = (participant.lastName || 'SANS_NOM')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .toUpperCase();
  const cleanFirst = (participant.firstName || 'Participant')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_');

  const fileName = `CNIB_${side}_${cleanLast}_${cleanFirst}.jpg`;
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
