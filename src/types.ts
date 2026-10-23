export type PaymentStatus = 'paid' | 'partial' | 'pending';

export interface Pastor {
  id: string;
  name: string;
  zone: string;
  raisedAmount: number;
  fundraisingNote: string;
  accessPin: string;
  order: number;
  updatedAt: string;
}

export interface Participant {
  id: string;
  lastName: string;
  firstName: string;
  fullName: string;
  phone: string;
  pastorId: string;
  paymentStatus: PaymentStatus;
  amountPaid: number;
  cnibRectoUrl: string;
  cnibVersoUrl: string;
  cnibUpdatedAt: string;
  notes: string;
  orderIndex: number;
  updatedAt: string;
}

export interface ParsedImportRow {
  tempId: string;
  rawLine: string;
  lastName: string;
  firstName: string;
  phone: string;
  paymentStatus: PaymentStatus;
  selected: boolean;
}

export interface UnlockedSession {
  role: 'pastor' | 'coordinator';
  pastorId: string | 'all';
  pastorName: string;
}

export type ActiveTab = 'participants' | 'cnib-gallery' | 'fundraising' | 'export';
