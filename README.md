# AMDA BTP

Site et back-office d'AMDA BTP — dépôt de matériaux, réseau d'artisans et conduite de chantiers à Parakou (Bénin).

Le front est statique. Le back-end reçoit les demandes des formulaires, les enregistre, notifie l'équipe par email et WhatsApp, et sert un back-office de suivi.

## Démarrer en local

```bash
npm install
cp .env.example .env      # puis compléter
npm run motdepasse -- "MotDePasseDuBackOffice"
npm start
```

- Site : http://localhost:4321
- Back-office : http://localhost:4321/admin

`npm run motdepasse` affiche les valeurs `ADMIN_PASSWORD_HASH` et `SESSION_SECRET` à recopier dans `.env`. Le mot de passe lui-même n'est jamais stocké.

## Structure

```
site/            Front statique
  assets/css     Feuille de styles unique (amda.css)
  assets/js      donnees.js (catalogue, artisans, chantiers) et amda.js (interactions)
  assets/img     Illustrations SVG, visuels produits, logos
server/
  app.js         Serveur HTTP, API /api/demandes, routage /admin
  config.js      Lecture de .env et des variables d'environnement
  db.js          Base SQLite (node:sqlite), tables demandes / fichiers / notifications
  formulaires.js Schémas et validation des cinq types de demande
  notifications.js  Emails et WhatsApp
  admin.js       Back-office
  outils/        motdepasse.js
```

Aucune dépendance en dehors de `nodemailer` : la base passe par `node:sqlite`, intégré à Node.

## Types de demande

| Type      | Origine                         | Référence            |
|-----------|---------------------------------|----------------------|
| `contact` | Nous joindre                    | `AMDA-AAAA-NNNNNN`   |
| `devis`   | Décrire mon besoin — chiffrage  | `AMDA-AAAA-NNNNNN`   |
| `produit` | Recherche de produit            | `AMDA-AAAA-NNNNNN`   |
| `projet`  | Décrire mon besoin — chantier   | `PRO-AMDA-AAAA-NNNNNN` |
| `pro`     | Travailler avec AMDA            | `AMDA-AAAA-NNNNNN`   |

Un champ absent du schéma est ignoré : le formulaire ne peut pas injecter de données arbitraires. Les mots de passe des candidats sont hachés en scrypt avant enregistrement.

## Variables d'environnement

Voir `.env.example`, qui documente chaque entrée. Les trois groupes à compléter pour une mise en production :

- **Back-office** — `ADMIN_USER`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`
- **Email** — `SMTP_USER`, `SMTP_PASS` (mot de passe d'application Google, pas le mot de passe du compte), `MAIL_TO`
- **Adresse publique** — `SITE_URL`, qui sert aux liens des emails et déclenche le cookie `Secure` en HTTPS

Deux variables ne concernent que l'hébergement :

- `DATA_DIR` — emplacement de la base et des pièces jointes, à faire pointer sur un disque persistant
- `TRUST_PROXY=true` — derrière un reverse proxy, pour lire l'IP réelle du visiteur dans `X-Forwarded-For` et que la limitation de débit ne compte pas tous les visiteurs comme un seul

## Déploiement

Le `Dockerfile` construit une image prête à servir. Le volume `/data` doit être persistant, faute de quoi les demandes reçues et les pièces jointes disparaissent à chaque redéploiement.

```bash
docker build -t amda-btp .
docker run -p 4321:4321 -v amda-data:/data --env-file .env amda-btp
```

## Ce qui n'est pas dans le dépôt

`.env`, le dossier `data/` et les maquettes PDF de travail sont exclus par `.gitignore`.
