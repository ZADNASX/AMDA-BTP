/* Lecture de la configuration : variables d'environnement, complétées par le fichier .env. */
const fs = require('fs');
const path = require('path');

const RACINE = path.resolve(__dirname, '..');

function chargerEnv() {
  const fichier = path.join(RACINE, '.env');
  if (!fs.existsSync(fichier)) return;
  for (const ligne of fs.readFileSync(fichier, 'utf8').split(/\r?\n/)) {
    const nette = ligne.trim();
    if (!nette || nette.startsWith('#')) continue;
    const sep = nette.indexOf('=');
    if (sep === -1) continue;
    const cle = nette.slice(0, sep).trim();
    let valeur = nette.slice(sep + 1).trim();
    if ((valeur.startsWith('"') && valeur.endsWith('"')) || (valeur.startsWith("'") && valeur.endsWith("'"))) {
      valeur = valeur.slice(1, -1);
    }
    if (!(cle in process.env)) process.env[cle] = valeur;
  }
}

chargerEnv();

const entier = (valeur, defaut) => {
  const n = parseInt(valeur, 10);
  return Number.isFinite(n) ? n : defaut;
};

module.exports = {
  racine: RACINE,
  siteDir: path.join(RACINE, 'site'),
  dataDir: process.env.DATA_DIR || path.join(RACINE, 'data'),
  port: entier(process.env.PORT, 4321),
  siteUrl: process.env.SITE_URL || 'http://localhost:4321',

  admin: {
    utilisateur: process.env.ADMIN_USER || 'amda',
    motDePasseHash: process.env.ADMIN_PASSWORD_HASH || '',
    secretSession: process.env.SESSION_SECRET || '',
    dureeSessionH: entier(process.env.SESSION_HOURS, 12),
  },

  smtp: {
    actif: Boolean(process.env.SMTP_HOST),
    host: process.env.SMTP_HOST || '',
    port: entier(process.env.SMTP_PORT, 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    expediteur: process.env.MAIL_FROM || 'AMDA BTP <no-reply@amda-btp.bj>',
    destinataire: process.env.MAIL_TO || '',
  },

  whatsapp: {
    actif: Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID),
    token: process.env.WHATSAPP_TOKEN || '',
    phoneId: process.env.WHATSAPP_PHONE_ID || '',
    destinataire: (process.env.WHATSAPP_TO || '').replace(/[^0-9]/g, ''),
    modele: process.env.WHATSAPP_TEMPLATE || '',
    langue: process.env.WHATSAPP_TEMPLATE_LANG || 'fr',
  },

  /* Derrière un reverse proxy (Render, Fly, Nginx…) l'IP réelle du visiteur est dans
     X-Forwarded-For. On ne s'y fie que si l'hébergeur est déclaré : sinon l'en-tête,
     librement falsifiable, permettrait de contourner la limitation de débit. */
  derriereProxy: process.env.TRUST_PROXY === 'true',

  limites: {
    corpsMax: entier(process.env.MAX_BODY_MB, 25) * 1024 * 1024,
    fichierMax: entier(process.env.MAX_FILE_MB, 8) * 1024 * 1024,
    fichiersMax: entier(process.env.MAX_FILES, 6),
    demandesParFenetre: entier(process.env.RATE_LIMIT, 8),
    fenetreMinutes: entier(process.env.RATE_WINDOW_MIN, 10),
  },
};
