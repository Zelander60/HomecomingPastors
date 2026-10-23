import { jsPDF } from 'jspdf';
import { Participant, Pastor } from '../types';

interface LoadedImageInfo {
  dataUrl: string;
  width: number;
  height: number;
}

/**
 * Loads any image (Data URL or same-origin asset) into a normalized JPEG data URL
 * along with its natural dimensions so jsPDF can embed it reliably with aspect-ratio preservation.
 */
async function loadNormalizedImage(src: string): Promise<LoadedImageInfo | null> {
  if (!src) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const w = img.naturalWidth || img.width || 800;
        const h = img.naturalHeight || img.height || 500;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        // Fill white background for transparent PNGs
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        const jpegUrl = canvas.toDataURL('image/jpeg', 0.92);
        resolve({ dataUrl: jpegUrl, width: w, height: h });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Draws an image centered ("object-contain") inside a target bounding box in millimeters.
 */
function drawImageContained(
  doc: jsPDF,
  imgInfo: LoadedImageInfo,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number
) {
  const imgRatio = imgInfo.width / imgInfo.height;
  const boxRatio = boxW / boxH;

  let drawW = boxW;
  let drawH = boxH;

  if (imgRatio > boxRatio) {
    drawW = boxW;
    drawH = boxW / imgRatio;
  } else {
    drawH = boxH;
    drawW = boxH * imgRatio;
  }

  const offsetX = boxX + (boxW - drawW) / 2;
  const offsetY = boxY + (boxH - drawH) / 2;

  doc.addImage(imgInfo.dataUrl, 'JPEG', offsetX, offsetY, drawW, drawH);
}

export async function exportParticipantsCnibPdf(params: {
  participants: Participant[];
  pastorMap: Map<string, Pastor>;
  scopeTitle?: string;
  onProgress?: (current: number, total: number) => void;
}): Promise<void> {
  const { participants, pastorMap, scopeTitle, onProgress } = params;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 10;
  const contentWidth = pageWidth - marginX * 2; // 190mm

  // Load official conference logo if available
  const logoInfo = await loadNormalizedImage('/hcoming_Logo.png');

  const completeCount = participants.filter(
    (p) => Boolean(p.cnibRectoUrl) && Boolean(p.cnibVersoUrl)
  ).length;
  const partialCount = participants.filter(
    (p) =>
      (Boolean(p.cnibRectoUrl) && !p.cnibVersoUrl) ||
      (!p.cnibRectoUrl && Boolean(p.cnibVersoUrl))
  ).length;

  const dateStr = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  // Helper to draw the official top banner on a page
  const drawPageHeader = (isFirstPage: boolean): number => {
    if (isFirstPage) {
      // Navy official banner
      doc.setFillColor(15, 23, 42); // #0F172A
      doc.roundedRect(marginX, 10, contentWidth, 28, 3, 3, 'F');

      // Gold accent bar
      doc.setFillColor(180, 83, 9); // #B45309
      doc.rect(marginX, 36.5, contentWidth, 1.5, 'F');

      let textStartX = marginX + 5;
      if (logoInfo) {
        try {
          doc.addImage(logoInfo.dataUrl, 'JPEG', marginX + 4, 13, 20, 20);
          textStartX = marginX + 28;
        } catch {
          // ignore logo error
        }
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(251, 191, 36); // amber-400
      doc.text(
        'GRACE INTERNATIONALE SAHEL  |  HOMECOMING GHANA (3 AU 6 NOVEMBRE 2026)',
        textStartX,
        17.5
      );

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12.5);
      doc.setTextColor(255, 255, 255);
      doc.text(
        'REGISTRE OFFICIEL DES PARTICIPANTS & PHOTOS CNIB (RECTO / VERSO)',
        textStartX,
        24.5
      );

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(203, 213, 225); // slate-300
      const subText = `${
        scopeTitle || 'Tous les groupes'
      }   •   Total : ${participants.length} participant(s)   •   CNIB Complètes : ${completeCount}   •   Partielles : ${partialCount}   •   Extrait le ${dateStr}`;
      doc.text(subText, textStartX, 31.5);

      return 43;
    } else {
      // Compact running header on subsequent pages
      doc.setFillColor(241, 245, 249); // slate-100
      doc.roundedRect(marginX, 10, contentWidth, 10, 2, 2, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(
        'REGISTRE OFFICIEL DES PARTICIPANTS & PHOTOS CNIB — HOMECOMING GHANA 2026',
        marginX + 4,
        16.2
      );

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(scopeTitle || 'Liste Générale', pageWidth - marginX - 4, 16.2, {
        align: 'right',
      });

      return 24;
    }
  };

  if (participants.length === 0) {
    drawPageHeader(true);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text(
      'Aucun participant à afficher pour ce filtre.',
      pageWidth / 2,
      80,
      { align: 'center' }
    );
    doc.save('Registre_CNIB_Homecoming_Ghana_2026.pdf');
    return;
  }

  let currentY = drawPageHeader(true);
  const cardHeight = 114; // 2 cards fit comfortably per A4 page
  const cardGap = 6;

  for (let i = 0; i < participants.length; i++) {
    const p = participants[i];
    if (onProgress) {
      onProgress(i + 1, participants.length);
    }

    // Check if card fits on current page (leaving 14mm for footer)
    if (currentY + cardHeight > pageHeight - 14) {
      doc.addPage();
      currentY = drawPageHeader(false);
    }

    const pastorName = pastorMap.get(p.pastorId)?.name || 'Pasteur';
    const hasRecto = Boolean(p.cnibRectoUrl);
    const hasVerso = Boolean(p.cnibVersoUrl);

    // Outer card border & background
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.35);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(marginX, currentY, contentWidth, cardHeight, 2.5, 2.5, 'FD');

    // Participant top identity bar inside card
    doc.setFillColor(248, 250, 252); // slate-50
    doc.roundedRect(marginX + 0.4, currentY + 0.4, contentWidth - 0.8, 17, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(marginX, currentY + 17.5, marginX + contentWidth, currentY + 17.5);

    // Number badge (#1, #2, ...)
    doc.setFillColor(15, 23, 42); // slate-900
    doc.roundedRect(marginX + 3.5, currentY + 3.2, 12, 11, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`${i + 1}`, marginX + 9.5, currentY + 10.1, { align: 'center' });

    // Full Name (NOM & Prénoms)
    const formattedName = p.lastName
      ? `${p.lastName.toUpperCase()} ${p.firstName || ''}`.trim()
      : p.fullName;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`NOM & PRÉNOMS : ${formattedName}`, marginX + 18.5, currentY + 7.8);

    // Subtitle: Phone + Pastor
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    const phoneLabel = p.phone ? p.phone : 'Non renseigné';
    doc.text(
      `Téléphone : ${phoneLabel}    |    Groupe / Pasteur : ${pastorName}`,
      marginX + 18.5,
      currentY + 13.8
    );

    // Status pill on the right of identity bar
    const badgeWidth = 44;
    const badgeX = marginX + contentWidth - badgeWidth - 3.5;
    if (hasRecto && hasVerso) {
      doc.setFillColor(209, 250, 229); // emerald-100
      doc.setDrawColor(16, 185, 129);
      doc.roundedRect(badgeX, currentY + 4.5, badgeWidth, 8.5, 2, 2, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(6, 95, 70);
      doc.text('CNIB COMPLÈTE (2/2)', badgeX + badgeWidth / 2, currentY + 9.8, {
        align: 'center',
      });
    } else if (hasRecto || hasVerso) {
      doc.setFillColor(254, 243, 199); // amber-100
      doc.setDrawColor(217, 119, 6);
      doc.roundedRect(badgeX, currentY + 4.5, badgeWidth, 8.5, 2, 2, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(146, 64, 14);
      doc.text('CNIB PARTIELLE (1/2)', badgeX + badgeWidth / 2, currentY + 9.8, {
        align: 'center',
      });
    } else {
      doc.setFillColor(241, 245, 249); // slate-100
      doc.setDrawColor(148, 163, 184);
      doc.roundedRect(badgeX, currentY + 4.5, badgeWidth, 8.5, 2, 2, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text('CNIB EN ATTENTE (0/2)', badgeX + badgeWidth / 2, currentY + 9.8, {
        align: 'center',
      });
    }

    // Two side-by-side CNIB photo boxes (Recto & Verso)
    const boxTopY = currentY + 20.5;
    const boxWidth = (contentWidth - 11) / 2; // ~89.5mm each
    const boxHeight = cardHeight - 24; // 90mm tall
    const leftBoxX = marginX + 3.5;
    const rightBoxX = leftBoxX + boxWidth + 4;

    // Draw Left Box (RECTO)
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(leftBoxX, boxTopY, boxWidth, boxHeight, 2, 2, 'FD');

    doc.setFillColor(226, 232, 240);
    doc.rect(leftBoxX, boxTopY, boxWidth, 6.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text('PHOTO CNIB — RECTO (FACE AVANT)', leftBoxX + 3, boxTopY + 4.5);

    // Draw Right Box (VERSO)
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(rightBoxX, boxTopY, boxWidth, boxHeight, 2, 2, 'FD');

    doc.setFillColor(226, 232, 240);
    doc.rect(rightBoxX, boxTopY, boxWidth, 6.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text('PHOTO CNIB — VERSO (FACE ARRIÈRE)', rightBoxX + 3, boxTopY + 4.5);

    // Load & embed Recto and Verso images in parallel
    const [rectoImg, versoImg] = await Promise.all([
      hasRecto ? loadNormalizedImage(p.cnibRectoUrl) : Promise.resolve(null),
      hasVerso ? loadNormalizedImage(p.cnibVersoUrl) : Promise.resolve(null),
    ]);

    const imgAreaY = boxTopY + 8;
    const imgAreaH = boxHeight - 10;
    const imgAreaW = boxWidth - 4;

    if (rectoImg) {
      drawImageContained(doc, rectoImg, leftBoxX + 2, imgAreaY, imgAreaW, imgAreaH);
    } else {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        'Aucune photo CNIB Recto enregistrée',
        leftBoxX + boxWidth / 2,
        boxTopY + boxHeight / 2 + 2,
        { align: 'center' }
      );
    }

    if (versoImg) {
      drawImageContained(doc, versoImg, rightBoxX + 2, imgAreaY, imgAreaW, imgAreaH);
    } else {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        'Aucune photo CNIB Verso enregistrée',
        rightBoxX + boxWidth / 2,
        boxTopY + boxHeight / 2 + 2,
        { align: 'center' }
      );
    }

    currentY += cardHeight + cardGap;
  }

  // Add footer with page numbers on all pages
  const totalPages = doc.getNumberOfPages();
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    doc.setPage(pageNum);
    doc.setDrawColor(226, 232, 240);
    doc.line(marginX, pageHeight - 11, pageWidth - marginX, pageHeight - 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      'Document Officiel — Délégation Grâce Internationale Sahel · Homecoming Ghana (3–6 Novembre 2026)',
      marginX,
      pageHeight - 6.5
    );
    doc.setFont('helvetica', 'bold');
    doc.text(
      `Page ${pageNum} / ${totalPages}`,
      pageWidth - marginX,
      pageHeight - 6.5,
      { align: 'right' }
    );
  }

  const safeScope = (scopeTitle || 'Complet')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_');
  doc.save(`Registre_Officiel_CNIB_${safeScope}_Homecoming_2026.pdf`);
}
