# Security Specification — Homecoming Ghana 2026

## 1. Data Invariants

1. **Strict Document IDs (`isValidId`)**: Every document ID in `/pastors/{pastorId}` and `/participants/{participantId}` must match `^[a-zA-Z0-9_\-]+$`, have length between 1 and 64 characters, and match the internal `id` property of the payload.
2. **Strict Key Allowlisting (`hasAll` & `hasOnly`)**:
   - `Pastor` documents must contain exactly `['id', 'name', 'zone', 'raisedAmount', 'fundraisingNote', 'accessPin', 'order', 'updatedAt']`. Shadow or injected fields are strictly rejected.
   - `Participant` documents must contain exactly `['id', 'lastName', 'firstName', 'fullName', 'phone', 'pastorId', 'paymentStatus', 'amountPaid', 'cnibRectoUrl', 'cnibVersoUrl', 'cnibUpdatedAt', 'notes', 'orderIndex', 'updatedAt']`.
3. **Bounded String & Numeric Constraints**:
   - Every string field has an explicit `.size() <= MAX` bound matching `firebase-blueprint.json`.
   - `paymentStatus` must be strictly one of `'paid'`, `'partial'`, or `'pending'`.
   - `raisedAmount` and `amountPaid` must be non-negative numbers (`>= 0`).
4. **Immutable Identity Fields on Update**:
   - During `update`, `incoming().id == existing().id` is strictly enforced so a document's internal ID can never diverge from its path variable.

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Shadow Field Injection on Pastor**: `{ id: "ps-pierre", ..., isSuperAdmin: true }` -> Rejected by `hasOnly()`.
2. **Shadow Field Injection on Participant**: `{ id: "p-1", ..., HackedField: "malicious" }` -> Rejected by `hasOnly()`.
3. **ID Poisoning Attack**: Document path `/participants/../../../../etc/passwd` or 2KB string ID -> Rejected by `isValidId(participantId)`.
4. **ID Mismatch Attack**: Path `/pastors/ps-pierre` with payload `{ id: "ps-other", ... }` -> Rejected by `incoming().id == pastorId`.
5. **Oversized FullName Denial-of-Wallet**: `fullName` with 10,000 characters -> Rejected by `data.fullName.size() <= 200`.
6. **Invalid Payment Status Enum**: `paymentStatus: "free_bypass"` -> Rejected by `data.paymentStatus in ['paid', 'partial', 'pending']`.
7. **Negative Fundraising Amount**: `raisedAmount: -500000` -> Rejected by `data.raisedAmount >= 0`.
8. **Negative Participant Amount Paid**: `amountPaid: -100` -> Rejected by `data.amountPaid >= 0`.
9. **Oversized CNIB Payload Attack**: `cnibRectoUrl` exceeding 350,000 characters -> Rejected by `data.cnibRectoUrl.size() <= 350000`.
10. **Missing Required Field on Create**: Omitting `pastorId` or `paymentStatus` -> Rejected by `hasAll()`.
11. **Type Confusion on Phone**: Sending `phone: 61023361` (number instead of string) -> Rejected by `data.phone is string`.
12. **Unprotected Catch-All Collection Write**: Writing to `/random_collection/doc1` -> Rejected by global `match /{document=**} { allow read, write: if false; }`.
