/* Serveur AMDA BTP : sert le site statique, reçoit les demandes et expose le back-office. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const config = require('./config');
const db = require('./db');
const { valider } = require('./formulaires');
const { notifier } = require('./notifications');
const vues = require('./admin');

const DOSSIER_FICHIERS = path.join(config.dataDir, 'fichiers');

const TYPES_MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.pdf': 'application/pdf',
};

/* Pièces jointes acceptées : plans, croquis, photos et listes de matériaux. */
const EXTENSIONS_AUTORISEES = {
  'application/pdf': '.pdf', 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
};

/* ------------------------------------------------------------------ Utilitaires */

function envoyer(res, code, corps, entetes = {}) {
  res.writeHead(code, {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'same-origin',
    ...entetes,
  });
  res.end(corps);
}

const envoyerJson = (res, code, objet) =>
  envoyer(res, code, JSON.stringify(objet), { 'Content-Type': 'application/json; charset=utf-8' });

const envoyerHtml = (res, code, html) =>
  envoyer(res, code, html, { 'Content-Type': 'text/html; charset=utf-8' });

const rediriger = (res, url) => envoyer(res, 303, '', { Location: url });

function lireCorps(req, limite) {
  return new Promise((resolve, reject) => {
    const morceaux = [];
    let taille = 0;
    req.on('data', morceau => {
      taille += morceau.length;
      if (taille > limite) {
        reject(Object.assign(new Error('Corps de requête trop volumineux.'), { code: 413 }));
        req.destroy();
        return;
      }
      morceaux.push(morceau);
    });
    req.on('end', () => resolve(Buffer.concat(morceaux)));
    req.on('error', reject);
  });
}

const ipDe = req => {
  if (config.derriereProxy) {
    const transmis = (req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    if (transmis) return transmis.replace(/^::ffff:/, '');
  }
  return (req.socket.remoteAddress || 'inconnue').replace(/^::ffff:/, '');
};

/* Limitation simple en mémoire : suffisante pour un site à trafic modéré. */
const compteurs = new Map();
function limiteAtteinte(cle, max) {
  const fenetre = config.limites.fenetreMinutes * 60000;
  const maintenant = Date.now();
  const tentatives = (compteurs.get(cle) || []).filter(t => maintenant - t < fenetre);
  tentatives.push(maintenant);
  compteurs.set(cle, tentatives);
  if (compteurs.size > 5000) compteurs.clear();
  return tentatives.length > max;
}

/* ------------------------------------------------------------------- Sessions */

function secretSession() {
  if (!config.admin.secretSession) {
    throw new Error('SESSION_SECRET est absent du fichier .env — back-office désactivé.');
  }
  return config.admin.secretSession;
}

function creerJeton(utilisateur) {
  const expiration = Date.now() + config.admin.dureeSessionH * 3600000;
  const charge = Buffer.from(JSON.stringify({ u: utilisateur, exp: expiration })).toString('base64url');
  const signature = crypto.createHmac('sha256', secretSession()).update(charge).digest('base64url');
  return `${charge}.${signature}`;
}

function verifierJeton(jeton) {
  if (!jeton || !jeton.includes('.')) return null;
  const [charge, signature] = jeton.split('.');
  const attendue = crypto.createHmac('sha256', secretSession()).update(charge).digest('base64url');
  const a = Buffer.from(signature);
  const b = Buffer.from(attendue);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const donnees = JSON.parse(Buffer.from(charge, 'base64url').toString());
    return donnees.exp > Date.now() ? donnees : null;
  } catch { return null; }
}

function lireCookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').map(morceau => {
    const i = morceau.indexOf('=');
    return i === -1 ? ['', ''] : [morceau.slice(0, i).trim(), decodeURIComponent(morceau.slice(i + 1).trim())];
  }).filter(([cle]) => cle));
}

const cookieSession = (valeur, secondes) =>
  `amda_session=${valeur}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${secondes}` +
  (config.siteUrl.startsWith('https://') ? '; Secure' : '');

function verifierMotDePasse(motDePasse) {
  const stocke = config.admin.motDePasseHash;
  if (!stocke.startsWith('scrypt$')) return false;
  const [, sel, cle] = stocke.split('$');
  const attendue = Buffer.from(cle, 'hex');
  const calculee = crypto.scryptSync(motDePasse, Buffer.from(sel, 'hex'), attendue.length);
  return crypto.timingSafeEqual(attendue, calculee);
}

/* ------------------------------------------------------- Réception des demandes */

function enregistrerFichiers(bruts) {
  if (!Array.isArray(bruts) || !bruts.length) return { fichiers: [] };
  if (bruts.length > config.limites.fichiersMax) {
    return { erreur: `Maximum ${config.limites.fichiersMax} fichiers par demande.` };
  }

  const fichiers = [];
  for (const brut of bruts) {
    const extension = EXTENSIONS_AUTORISEES[brut?.mime];
    if (!extension) return { erreur: `Format de fichier non accepté : ${String(brut?.nom || '').slice(0, 60)}` };

    let contenu;
    try {
      contenu = Buffer.from(String(brut.donnees || ''), 'base64');
    } catch {
      return { erreur: 'Fichier illisible.' };
    }
    if (!contenu.length) return { erreur: 'Fichier vide.' };
    if (contenu.length > config.limites.fichierMax) {
      return { erreur: `Chaque fichier doit peser moins de ${config.limites.fichierMax / 1048576} Mo.` };
    }

    /* Le nom de stockage est généré : le nom fourni par le client ne touche jamais le disque. */
    const stocke = crypto.randomUUID() + extension;
    fs.writeFileSync(path.join(DOSSIER_FICHIERS, stocke), contenu);
    fichiers.push({
      nom: String(brut.nom || 'document').replace(/[\r\n]/g, ' ').slice(0, 160),
      stocke, taille: contenu.length, mime: brut.mime,
    });
  }
  return { fichiers };
}

async function recevoirDemande(req, res) {
  if (limiteAtteinte('api:' + ipDe(req), config.limites.demandesParFenetre)) {
    return envoyerJson(res, 429, { erreur: 'Trop de demandes envoyées. Réessayez dans quelques minutes ou contactez AMDA par WhatsApp.' });
  }

  let charge;
  try {
    charge = JSON.parse((await lireCorps(req, config.limites.corpsMax)).toString('utf8'));
  } catch (erreur) {
    return envoyerJson(res, erreur.code === 413 ? 413 : 400, {
      erreur: erreur.code === 413 ? 'Les fichiers joints sont trop volumineux.' : 'Requête illisible.',
    });
  }

  /* Piège à robots : un champ masqué que seul un automate remplit. */
  if (charge.societe) return envoyerJson(res, 200, { reference: 'AMDA-0000-000000' });

  const controle = valider(charge.type, charge.donnees || {});
  if (controle.erreurs) return envoyerJson(res, 400, { erreur: controle.erreurs[0], erreurs: controle.erreurs });

  const resultatFichiers = enregistrerFichiers(charge.fichiers);
  if (resultatFichiers.erreur) return envoyerJson(res, 400, { erreur: resultatFichiers.erreur });

  const { id, reference } = db.creerDemande({
    type: charge.type,
    donnees: controle.donnees,
    resume: controle.resume,
    contact: controle.contact,
    fichiers: resultatFichiers.fichiers,
  });

  console.log(`[demande] ${reference} · ${charge.type} · ${controle.contact.nom || 'anonyme'}`);
  notifier({ id, reference, type: charge.type, resume: controle.resume, donnees: controle.donnees, contact: controle.contact },
    resultatFichiers.fichiers);

  envoyerJson(res, 201, { reference });
}

/* ------------------------------------------------------------------ Back-office */

async function lireFormulaire(req) {
  const corps = (await lireCorps(req, 64 * 1024)).toString('utf8');
  return Object.fromEntries(new URLSearchParams(corps));
}

async function routerAdmin(req, res, url) {
  const chemin = url.pathname;
  const session = verifierJeton(lireCookies(req).amda_session);

  if (chemin === '/admin/connexion' && req.method === 'POST') {
    if (limiteAtteinte('login:' + ipDe(req), 6)) {
      return envoyerHtml(res, 429, vues.connexion({ erreur: 'Trop de tentatives. Patientez quelques minutes.' }));
    }
    const champs = await lireFormulaire(req);
    const utilisateurOk = champs.utilisateur === config.admin.utilisateur;
    const motDePasseOk = utilisateurOk && verifierMotDePasse(champs.motdepasse || '');
    if (!motDePasseOk) {
      return envoyerHtml(res, 401, vues.connexion({ erreur: 'Identifiant ou mot de passe incorrect.' }));
    }
    return envoyer(res, 303, '', {
      Location: '/admin',
      'Set-Cookie': cookieSession(creerJeton(champs.utilisateur), config.admin.dureeSessionH * 3600),
    });
  }

  if (chemin === '/admin/deconnexion' && req.method === 'POST') {
    return envoyer(res, 303, '', { Location: '/admin', 'Set-Cookie': cookieSession('', 0) });
  }

  if (!session) return envoyerHtml(res, chemin === '/admin' ? 200 : 401, vues.connexion());

  if (chemin === '/admin' && req.method === 'GET') {
    const filtres = {
      statut: url.searchParams.get('statut') || '',
      type: url.searchParams.get('type') || '',
      q: (url.searchParams.get('q') || '').slice(0, 80),
    };
    const numPage = Math.max(1, parseInt(url.searchParams.get('page'), 10) || 1);
    const parPage = 25;
    const { total, lignes } = db.listerDemandes({
      statut: filtres.statut, type: filtres.type, recherche: filtres.q, page: numPage, parPage,
    });
    return envoyerHtml(res, 200, vues.liste({ lignes, total, filtres, page: numPage, parPage }));
  }

  const correspondanceDemande = chemin.match(/^\/admin\/demandes\/(\d+)$/);
  if (correspondanceDemande) {
    const id = Number(correspondanceDemande[1]);
    if (req.method === 'POST') {
      const champs = await lireFormulaire(req);
      if (!db.majDemande(id, { statut: champs.statut, note: champs.note || '' })) {
        return envoyerHtml(res, 404, vues.page('Introuvable', '<p class="bo-vide">Demande introuvable.</p>'));
      }
      return rediriger(res, `/admin/demandes/${id}?ok=1`);
    }
    const demande = db.lireDemande(id);
    if (!demande) return envoyerHtml(res, 404, vues.page('Introuvable', '<p class="bo-vide">Demande introuvable.</p>'));
    return envoyerHtml(res, 200, vues.detail(demande, db.lireFichiers(id), db.lireNotifications(id), {
      enregistre: url.searchParams.get('ok') === '1',
    }));
  }

  const correspondanceFichier = chemin.match(/^\/admin\/fichiers\/(\d+)$/);
  if (correspondanceFichier) {
    const fichier = db.lireFichier(Number(correspondanceFichier[1]));
    if (!fichier) return envoyerHtml(res, 404, vues.page('Introuvable', '<p class="bo-vide">Fichier introuvable.</p>'));
    const surDisque = path.join(DOSSIER_FICHIERS, path.basename(fichier.stocke));
    if (!fs.existsSync(surDisque)) {
      return envoyerHtml(res, 410, vues.page('Absent', '<p class="bo-vide">Ce fichier n\'est plus sur le serveur.</p>'));
    }
    /* Téléchargement forcé : un document envoyé par un tiers n'est jamais rendu dans le navigateur. */
    return envoyer(res, 200, fs.readFileSync(surDisque), {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(fichier.nom)}"`,
    });
  }

  return envoyerHtml(res, 404, vues.page('Introuvable', '<p class="bo-vide">Page introuvable.</p>'));
}

/* --------------------------------------------------------------- Site statique */

function servirStatique(req, res, url) {
  let relatif = decodeURIComponent(url.pathname);
  if (relatif.endsWith('/')) relatif += 'index.html';
  if (!path.extname(relatif)) relatif += '.html';

  const fichier = path.join(config.siteDir, path.normalize(relatif));
  if (!fichier.startsWith(config.siteDir)) return envoyer(res, 403, 'Accès refusé.');

  fs.stat(fichier, (erreurStat, infos) => {
    if (erreurStat || !infos.isFile()) {
      return envoyerHtml(res, 404, '<!doctype html><meta charset="utf-8"><title>Page introuvable</title>'
        + '<p style="font-family:sans-serif;padding:40px">Page introuvable. <a href="/">Retour à l\'accueil</a></p>');
    }

    /* Revalidation systématique : une mise à jour du site est visible sans vider le cache. */
    const etag = `"${infos.size.toString(16)}-${infos.mtimeMs.toString(16)}"`;
    const entetes = {
      'Content-Type': TYPES_MIME[path.extname(fichier)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      ETag: etag,
    };
    if (req.headers['if-none-match'] === etag) return envoyer(res, 304, '', entetes);

    fs.readFile(fichier, (erreur, contenu) => {
      if (erreur) return envoyerHtml(res, 404, 'Page introuvable.');
      envoyer(res, 200, contenu, entetes);
    });
  });
}

/* ------------------------------------------------------------------- Démarrage */

const serveur = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (url.pathname === '/api/demandes' && req.method === 'POST') return await recevoirDemande(req, res);
    if (url.pathname.startsWith('/admin')) return await routerAdmin(req, res, url);
    if (req.method !== 'GET' && req.method !== 'HEAD') return envoyer(res, 405, 'Méthode non autorisée.');
    return servirStatique(req, res, url);
  } catch (erreur) {
    console.error('[erreur]', erreur);
    if (!res.headersSent) envoyerJson(res, 500, { erreur: 'Une erreur interne est survenue.' });
  }
});

serveur.listen(config.port, () => {
  console.log(`AMDA BTP — site      : http://localhost:${config.port}`);
  console.log(`AMDA BTP — back-office : http://localhost:${config.port}/admin`);
  if (!config.admin.motDePasseHash) console.warn('⚠  ADMIN_PASSWORD_HASH absent : exécutez « npm run motdepasse ».');
  if (!config.smtp.actif) console.warn('⚠  SMTP non configuré : aucune notification email ne partira.');
  if (!config.whatsapp.actif) console.warn('⚠  WhatsApp non configuré : aucune notification WhatsApp ne partira.');
});
