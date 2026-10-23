# Homecoming Ghana 2026 — Plateforme de Gestion des Participants, CNIB & Fonds Pastoraux

Une application collaborative en temps réel conçue pour organiser, suivre et coordonner les participants, leurs documents d'identité (**CNIB Recto / Verso**) et les fonds mobilisés par chaque pasteur pour la conférence **Homecoming au Ghana (du 3 au 6 novembre 2026)**. Elle offre une consultation publique claire de toutes les listes, un espace sécurisé par code d'accès simple pour les pasteurs, ainsi qu'une page dédiée à la visualisation et au téléchargement des pièces d'identité (CNIB) pour les formalités de voyage.

### User Review & Critical Decisions

> [!IMPORTANT]
> Les choix suivants ont été confirmés et enrichis avec vos retours sur la reconnaissance Nom/Prénoms et la gestion des photos CNIB Recto/Verso :

- **Décision Confirmée 1 — Synchronisation Cloud en Temps Réel (Firebase Firestore)** : Toutes les listes de pasteurs, les participants, les statuts de paiement, les photos CNIB (optimisées) et les montants soulevés sont synchronisés en temps réel via Firebase Firestore.
- **Décision Confirmée 2 — Consultation Publique & Édition Réservée aux Pasteurs par Code Simple** : Les visiteurs sans code ont un accès en lecture seule à la liste des membres. Seuls les pasteurs disposant de leur code d'accès simple (PIN) peuvent ajouter ou modifier des participants, téléverser les photos CNIB Recto/Verso, changer les statuts de paiement et saisir le montant soulevé.
- **Décision Confirmée 3 — Prévisualisation Intelligente avec Reconnaissance Automatique (Nom, Prénoms, Téléphone)** : Lors de l'ajout ou du collage d'une liste WhatsApp, l'outil sépare et reconnaît automatiquement le **Nom**, les **Prénoms** et le **Numéro de téléphone**, et affiche un tableau de prévisualisation interactif modifiable avant validation finale.
- **Décision Confirmée 4 — Fiche Participant Détaillée avec Upload CNIB Recto & Verso** : En cliquant sur n'importe quel participant de la liste, une fiche détaillée s'ouvre avec toutes ses informations ainsi que deux zones dédiées pour téléverser (ou prendre en photo depuis son téléphone) sa **CNIB Recto** et sa **CNIB Verso**.
- **Décision Confirmée 5 — Page Dédiée « Galerie & Exploitation des CNIB »** : Une page distincte permet d'afficher les noms et prénoms des participants accompagnés de leurs photos CNIB (Recto et Verso), filtrables par pasteur, avec des boutons de **téléchargement direct** nommés automatiquement au nom du participant (ex: `CNIB_Recto_BIKOO_Martial.jpg`).

---

### 1. Overview & Core Concept

- **Ce que fait l'application** : Centralise l'enregistrement des participants (Nom, Prénoms, Numéro de téléphone, Pasteur référent, Statut de paiement, Photos CNIB Recto & Verso) et la comptabilité des fonds mobilisés par chaque pasteur pour la conférence Homecoming Ghana (3–6 novembre 2026).
- **Public Cible & Personas** :
  - **Pasteurs & Leaders (LP / Ps)** : Déverrouillent leur espace avec un code simple pour inscrire des membres, compléter ultérieurement la fiche de chaque participant en téléversant sa CNIB Recto et Verso, pointer les paiements et déclarer le montant d'argent soulevé.
  - **Équipe Logistique & Coordination Voyage** : Utilise la page dédiée « Galerie & Exploitation CNIB » pour vérifier les pièces d'identité des voyageurs et télécharger en un clic les photos Recto/Verso pour les formalités de passage aux frontières et d'hébergement.
  - **Observateurs (Lecture Seule)** : Consultent facilement la liste générale ou filtrent par pasteur pour vérifier les inscriptions.
- **Valeur Ajoutée Clé** : Combine en un seul outil ultra-simple l'enregistrement initial rapide (avec les 12 pasteurs et 68 participants déjà pré-chargés), la collecte progressive des pièces d'identité CNIB et le suivi financier par pasteur.

---

### 2. User Experience & Visual Design

- **Parcours Utilisateurs Clés** :
  1. **Vue Globale & Navigation par Pasteur (Lecture Seule par défaut)** : Dès l'ouverture, l'utilisateur visualise le bandeau récapitulatif de la conférence Homecoming Ghana (3–6 Nov 2026) avec 5 indicateurs clés : *Total Participants inscrits*, *Téléphones renseignés*, *CNIB complètes (Recto+Verso)*, *Participants à jour de paiement*, et *Montant Total Soulevé par les Pasteurs*. La barre latérale affiche la vue « Tous les Pasteurs » suivie des 12 pasteurs.
  2. **Déverrouillage Espace Pasteur (Code d'accès simple)** : Un bouton principal « Accès Pasteur » dans l'en-tête ouvre une fenêtre légère où le pasteur sélectionne son nom et saisit son code PIN. Une fois déverrouillé, toutes les fonctions d'ajout, d'édition et d'upload CNIB s'activent.
  3. **Ajout & Import avec Prévisualisation Automatique (Nom / Prénoms / Téléphone)** : En mode Pasteur déverrouillé, le pasteur peut soit ajouter un participant via le formulaire rapide, soit coller une liste brute. L'analyseur détecte automatiquement chaque ligne et présente un **tableau de prévisualisation interactif** affichant distinctement les colonnes `Nom reconnu`, `Prénoms reconnus` et `Téléphone reconnu` (avec possibilité de corriger une case avant de cliquer sur « Enregistrer les participants »).
  4. **Clic sur un Participant → Fiche Détaillée & Upload CNIB Recto / Verso** : Lorsqu'un pasteur clique sur une ligne de participant, un panneau latéral (ou modale détaillée) s'ouvre avec :
     - Ses informations modifiables (*Nom*, *Prénoms*, *Téléphone*, *Pasteur*, *Statut de paiement*, *Montant versé*, *Notes*).
     - **Deux champs d'upload visuels dédiés** : **1. CNIB — Recto (Face avant)** et **2. CNIB — Verso (Face arrière)**, acceptant les images depuis la galerie ou l'appareil photo du téléphone, avec compression automatique haute netteté, aperçu immédiat et remplacement facile.
  5. **Page Dédiée « Galerie & Exploitation des CNIB »** : Accessible via l'onglet principal « Dossiers CNIB & Photos », cette page complètement distincte est pensée pour l'exploitation administrative :
     - Filtre par pasteur, recherche par nom, et filtre par statut de document (*Tous*, *CNIB Complète*, *CNIB Manquante ou Partielle*).
     - Grille visuelle présentant pour chaque participant son **Nom & Prénoms**, son **Pasteur**, son **Numéro de téléphone**, ainsi que les miniatures haute visibilité de sa **CNIB Recto** et de sa **CNIB Verso** (avec loupe plein écran au clic).
     - **Boutons Télécharger** : Un bouton « Télécharger Recto », un bouton « Télécharger Verso » et un bouton « Télécharger Recto + Verso » sur chaque fiche, renommant automatiquement le fichier téléchargé avec le nom et prénom du participant pour faciliter le classement.
  6. **Mise à jour du Montant Soulevé par Pasteur** : Chaque pasteur peut saisir et actualiser à tout moment le montant total d'argent qu'il a pu soulever pour son groupe.

- **Identité Visuelle & Thème (SaaS & Dashboard Architecture)** :
  - *Direction Esthétique* : Tableau de bord éditorial et institutionnel clair, haute lisibilité, hiérarchie nette.
  - *Palette de Couleurs (Discipline 60-30-10)* :
    - **60% Toile Neutre Dominante (`--background`)** : Blanc pur (`#FFFFFF`) et ardoise très pâle (`#F8FAFC`).
    - **30% Surfaces Structurelles (`--surface` / `--border`)** : Barre latérale structurée (`#F1F5F9`), bordures fines de `1px` (`#E2E8F0`) à élévation unique, texte principal anthracite (`#0F172A`) et métadonnées sobres (`#64748B`).
    - **10% Budget d'Accentuation (`--primary` / `--accent`)** : Or ambré profond & terre du Ghana (`#B45309` / `#D97706`) combiné à un vert émeraude institutionnel (`#15803D`).
    - *Couleurs Sémantiques (toujours accompagnées d'un libellé explicite)* : Vert (`#16A34A` — *Payé / CNIB Complète*), Ambre (`#D97706` — *Partiel / 1 face reçue*), Rouge (`#DC2626` — *En attente / CNIB manquante*).
  - *Typographie & Discipline Tabulaire (Règle 2+1)* :
    - **Titres & Navigation (`Display`)** : `Plus Jakarta Sans` (SemiBold/Bold 600–700).
    - **Corps & Listes (`Body`)** : `Public Sans` (Regular 400 / Medium 500, 14px–15px).
    - **Données, Numéros de Téléphone & Montants (`Monospace / Tabular`)** : `JetBrains Mono` avec `font-variant-numeric: tabular-nums` obligatoire sur tous les compteurs, numéros d'ordre, téléphones et montants financiers.
  - *Architecture Spatiale & Composants* :
    - **Contrat de Barre Supérieure (Top Bar 3 zones)** : Zone 1 : Titre sur une ligne (`Homecoming Ghana 2026`) · Zone 2 : 4 liens de navigation (`Participants`, `Dossiers CNIB & Photos`, `Fonds par Pasteur`, `Import & Export`) · Zone 3 : Bouton d'action unique (`Accès Pasteur` ou `Mode Pasteur Actif`).
    - **Discipline Zéro-Pill pour les Métadonnées** : Les informations secondaires sont affichées sous forme de texte épuré séparé par des points médians (`·`).

---

### 3. Key Product Decisions & Trade-Offs

- **Décision 1 : Fiche Participant Progressive (Enregistrement Rapide puis Ajout CNIB Recto/Verso)**
  - *Approche choisie* : L'inscription initiale ne bloque jamais sur les documents (seuls les noms/prénoms suffisent, comme dans la liste actuelle de 68 personnes). Plus tard, le pasteur clique simplement sur un participant existant pour ouvrir son tiroir de détails et téléverser sa CNIB Recto et Verso dès qu'il les reçoit.
  - *Pourquoi* : Permet d'enregistrer immédiatement tout le monde puis de collecter les pièces d'identité au fil de l'eau sans ralentir les pasteurs.

- **Décision 2 : Compression Intelligente Côté Client pour le Stockage Cloud des CNIB**
  - *Approche choisie* : Lorsqu'un pasteur sélectionne une photo de CNIB (souvent 4 à 8 Mo depuis un smartphone), l'application redimensionne et compresse automatiquement l'image sur un canevas HTML5 (résolution optimale de lecture `1200px`, JPEG qualité `0.78`, env. `80–140 Ko` par face) avant de la sauvegarder dans Firestore.
  - *Pourquoi* : Garantit un chargement instantané sur la page « Galerie & Exploitation des CNIB », respecte les limites de taille de document Firestore (`1 Mo`) et fonctionne sur mobile même avec une connexion modérée.

- **Décision 3 : Séparation Automatique Nom / Prénoms avec Prévisualisation Interactive**
  - *Approche choisie* : L'analyseur de texte sépare intelligemment le nom de famille et les prénoms (en tenant compte des majuscules comme `Esperance AIFFAN` ou de l'ordre habituel `BOUDA Awa`) et présente toujours un écran de prévisualisation où chaque colonne (`Nom`, `Prénoms`, `Téléphone`) peut être vérifiée ou inversée en un clic avant sauvegarde.
  - *Pourquoi* : Évite toute erreur d'enregistrement lors de l'importation de listes rédigées dans des formats variés par différents pasteurs.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Hiérarchie des Composants** :

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                         HOMECOMING GHANA 2026 APP                              │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ Top Bar (3 Zones): [Homecoming Ghana 2026] — [4 Vues] — [Accès Pasteur]  │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ Bandeau KPI: Effectif │ Téléphones │ CNIB Complètes │ Payés │ Fonds (CFA)│  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                │
│  ┌──────────────────────────┐  ┌────────────────────────────────────────────┐  │
│  │ Barre Latérale Pasteurs  │  │ VUE 1 : LISTE & GESTION DES PARTICIPANTS   │  │
│  │ (260px)                  │  │ - En-tête Pasteur + Montant Soulevé (CFA)  │  │
│  │ - Tous les Pasteurs (68) │  │ - Ajout rapide & Import avec Prévisualisat°│  │
│  │ - 12 Pasteurs pré-créés  │  │ - Table des Participants (Clic sur ligne)  │  │
│  │   (Effectif, CNIB, Fonds)│  │        │                                   │  │
│  └──────────────────────────┘  │        ▼                                   │  │
│                                │ ┌────────────────────────────────────────┐ │  │
│                                │ │ TIROIR / MODALE FICHE PARTICIPANT      │ │  │
│                                │ │ - Nom, Prénoms, Téléphone, Paiement    │ │  │
│                                │ │ - Upload CNIB Recto + Upload CNIB Verso│ │  │
│                                │ └────────────────────────────────────────┘ │  │
│                                └────────────────────────────────────────────┘  │
│                                ┌────────────────────────────────────────────┐  │
│                                │ VUE 2 : PAGE GALERIE & EXPLOITATION CNIB   │  │
│                                │ - Filtres: Pasteur, Recherche, Statut CNIB │  │
│                                │ - Grille Cartes: Nom & Prénoms + Pasteur   │  │
│                                │ - Aperçu HD Recto & Verso + Loupe Zoom     │  │
│                                │ - Boutons: Télécharger Recto / Verso       │  │
│                                └────────────────────────────────────────────┘  │
└───────────────────────────────────────┬────────────────────────────────────────┘
                                        │ Synchronisation Temps Réel (onSnapshot)
                                        ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│                      FIREBASE FIRESTORE & LOCAL FALLBACK                       │
│  ┌───────────────────────────────────┐  ┌────────────────────────────────────┐ │
│  │ Collection: /pastors/{pastorId}   │  │ Collection: /participants/{id}     │ │
│  │ - name, zone, order               │  │ - lastName, firstName, fullName    │ │
│  │ - raisedAmount, fundraisingNote   │  │ - phone, pastorId, paymentStatus   │ │
│  │ - accessPin, updatedAt            │  │ - cnibRectoUrl, cnibVersoUrl       │ │
│  └───────────────────────────────────┘  └────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────┘
```

- **Modèle de Données & Entités** :
  - **Entité `Pastor` (`/pastors/{pastorId}`)** :
    - `id` (string) : Identifiant unique (ex: `ps-pierre`, `lp-esperance`, `ps-martial`, etc.)
    - `name` (string) : Nom affiché (ex: `Ps Pierre`, `LP Esperance`, `Ps Serge (Koudougou)`)
    - `zone` (string) : Zone ou localité optionnelle (ex: `Koudougou`, `Zone 1`)
    - `raisedAmount` (number) : Montant total d'argent soulevé par ce pasteur (en FCFA)
    - `fundraisingNote` (string) : Note sur la collecte du pasteur
    - `accessPin` (string) : Code d'accès simple (4 chiffres)
    - `order` (number) : Ordre d'affichage
  - **Entité `Participant` (`/participants/{participantId}`)** :
    - `id` (string) : Identifiant unique du participant
    - `lastName` (string) : Nom de famille reconnu (ex: `LANKOANDE`, `BIKOO`)
    - `firstName` (string) : Prénoms reconnus (ex: `Stella`, `Martial`)
    - `fullName` (string) : Nom complet combiné pour recherche rapide
    - `phone` (string) : Numéro de téléphone
    - `pastorId` (string) : Référence au pasteur (`Pastor.id`)
    - `paymentStatus` (enum) : `'paid'` (*Payé*) | `'partial'` (*Partiel*) | `'pending'` (*En attente*)
    - `amountPaid` (number) : Montant individuel versé (optionnel)
    - `cnibRectoUrl` (string) : Image compressée de la CNIB Recto (Data URL JPEG optimisée, vide par défaut)
    - `cnibVersoUrl` (string) : Image compressée de la CNIB Verso (Data URL JPEG optimisée, vide par défaut)
    - `cnibUpdatedAt` (string) : Date d'ajout/mise à jour des photos CNIB
    - `notes` (string) : Observation éventuelle
    - `updatedAt` (string) : Horodatage de dernière modification

- **Cartographie des Interactions & Gestion d'État** :
  - **Analyseur & Prévisualisation d'Import (`SmartImportPreviewModal`)** :
    - Extrait automatiquement le numéro d'ordre, le numéro de téléphone (formats 8 chiffres, espaces, `+226`, `+357`, `+257`), le `Nom` et le `Prénoms`.
    - Affiche une table de prévisualisation où chaque ligne détectée montre `Nom`, `Prénoms`, `Téléphone` dans des champs éditables, avec un bouton « Inverser Nom/Prénom » et un compteur de participants prêts à être importés.
  - **Tiroir / Modale de Fiche Participant (`ParticipantDetailModal`)** :
    - S'ouvre au clic sur n'importe quel participant de la liste.
    - Permet de visualiser et modifier ses informations (`Nom`, `Prénoms`, `Téléphone`, `Pasteur`, `Statut de paiement`).
    - Intègre deux zones d'upload (`CNIB Recto` et `CNIB Verso`) avec glisser-déposer ou sélection depuis le téléphone, compression automatique sur `<canvas>` et sauvegarde immédiate dans Firestore.
  - **Page Galerie & Exploitation des CNIB (`CnibExploitationPage`)** :
    - Vue dédiée sur une page séparée affichant chaque participant sous forme de carte documentaire avec ses photos Recto et Verso côte à côte.
    - Inclut une visionneuse plein écran (zoom/rotation) pour vérifier la lisibilité des numéros de CNIB et dates d'expiration.
    - Génère au clic sur « Télécharger Recto » ou « Télécharger Verso » un téléchargement direct (`<a download="CNIB_Recto_NOM_Prenom.jpg">`) prêt pour l'exploitation administrative.
