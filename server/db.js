/* Base SQLite : schéma, références de suivi et accès aux demandes. */
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const config = require('./config');

fs.mkdirSync(config.dataDir, { recursive: true });
fs.mkdirSync(path.join(config.dataDir, 'fichiers'), { recursive: true });

const db = new DatabaseSync(path.join(config.dataDir, 'amda.db'));

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS demandes (
    id         INTEGER PRIMARY KEY,
    reference  TEXT NOT NULL UNIQUE,
    type       TEXT NOT NULL,
    statut     TEXT NOT NULL DEFAULT 'nouvelle',
    nom        TEXT,
    telephone  TEXT,
    whatsapp   TEXT,
    email      TEXT,
    ville      TEXT,
    resume     TEXT,
    donnees    TEXT NOT NULL,
    note       TEXT,
    cree_le    TEXT NOT NULL,
    maj_le     TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS fichiers (
    id         INTEGER PRIMARY KEY,
    demande_id INTEGER NOT NULL REFERENCES demandes(id) ON DELETE CASCADE,
    nom        TEXT NOT NULL,
    stocke     TEXT NOT NULL,
    taille     INTEGER NOT NULL,
    mime       TEXT,
    cree_le    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id         INTEGER PRIMARY KEY,
    demande_id INTEGER NOT NULL REFERENCES demandes(id) ON DELETE CASCADE,
    canal      TEXT NOT NULL,
    etat       TEXT NOT NULL,
    detail     TEXT,
    cree_le    TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_demandes_cree ON demandes(cree_le DESC);
  CREATE INDEX IF NOT EXISTS idx_demandes_statut ON demandes(statut);
  CREATE INDEX IF NOT EXISTS idx_fichiers_demande ON fichiers(demande_id);
`);

const STATUTS = ['nouvelle', 'en cours', 'devis envoyé', 'validée', 'clôturée', 'sans suite'];

const maintenant = () => new Date().toISOString();

/* Référence de suivi : AMDA-2026-000125, ou PRO-AMDA-2026-000014 pour un projet. */
function prochaineReference(type) {
  const prefixe = type === 'projet' ? 'PRO-AMDA' : 'AMDA';
  const debut = `${prefixe}-${new Date().getFullYear()}-`;
  const ligne = db.prepare(
    `SELECT reference FROM demandes WHERE reference LIKE ? || '%' ORDER BY reference DESC LIMIT 1`
  ).get(debut);
  const dernier = ligne ? parseInt(ligne.reference.slice(debut.length), 10) : 0;
  return debut + String(dernier + 1).padStart(6, '0');
}

function creerDemande({ type, donnees, resume, contact, fichiers }) {
  const horodatage = maintenant();
  const reference = prochaineReference(type);

  const info = db.prepare(`
    INSERT INTO demandes (reference, type, nom, telephone, whatsapp, email, ville, resume, donnees, cree_le, maj_le)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(reference, type, contact.nom || null, contact.telephone || null, contact.whatsapp || null,
    contact.email || null, contact.ville || null, resume, JSON.stringify(donnees), horodatage, horodatage);

  const id = Number(info.lastInsertRowid);

  const insertFichier = db.prepare(
    `INSERT INTO fichiers (demande_id, nom, stocke, taille, mime, cree_le) VALUES (?, ?, ?, ?, ?, ?)`
  );
  for (const f of fichiers) insertFichier.run(id, f.nom, f.stocke, f.taille, f.mime, horodatage);

  return { id, reference };
}

function journaliserNotification(demandeId, canal, etat, detail) {
  db.prepare(
    `INSERT INTO notifications (demande_id, canal, etat, detail, cree_le) VALUES (?, ?, ?, ?, ?)`
  ).run(demandeId, canal, etat, detail ? String(detail).slice(0, 500) : null, maintenant());
}

function listerDemandes({ statut, type, recherche, page = 1, parPage = 25 }) {
  const conditions = [];
  const params = [];
  if (statut) { conditions.push('statut = ?'); params.push(statut); }
  if (type) { conditions.push('type = ?'); params.push(type); }
  if (recherche) {
    conditions.push('(reference LIKE ? OR nom LIKE ? OR telephone LIKE ? OR resume LIKE ?)');
    const motif = `%${recherche}%`;
    params.push(motif, motif, motif, motif);
  }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const total = db.prepare(`SELECT COUNT(*) AS n FROM demandes ${where}`).get(...params).n;
  const lignes = db.prepare(`
    SELECT d.*, (SELECT COUNT(*) FROM fichiers f WHERE f.demande_id = d.id) AS nb_fichiers
    FROM demandes d ${where} ORDER BY d.cree_le DESC LIMIT ? OFFSET ?
  `).all(...params, parPage, (page - 1) * parPage);
  return { total, lignes };
}

const lireDemande = id => db.prepare('SELECT * FROM demandes WHERE id = ?').get(id);

const lireFichiers = demandeId =>
  db.prepare('SELECT * FROM fichiers WHERE demande_id = ? ORDER BY id').all(demandeId);

const lireFichier = id => db.prepare('SELECT * FROM fichiers WHERE id = ?').get(id);

const lireNotifications = demandeId =>
  db.prepare('SELECT * FROM notifications WHERE demande_id = ? ORDER BY id').all(demandeId);

function majDemande(id, { statut, note }) {
  const actuelle = lireDemande(id);
  if (!actuelle) return false;
  db.prepare('UPDATE demandes SET statut = ?, note = ?, maj_le = ? WHERE id = ?')
    .run(STATUTS.includes(statut) ? statut : actuelle.statut,
      note === undefined ? actuelle.note : String(note).slice(0, 2000),
      maintenant(), id);
  return true;
}

function compteurs() {
  const lignes = db.prepare('SELECT statut, COUNT(*) AS n FROM demandes GROUP BY statut').all();
  const total = lignes.reduce((s, l) => s + l.n, 0);
  return { total, parStatut: Object.fromEntries(lignes.map(l => [l.statut, l.n])) };
}

module.exports = {
  db, STATUTS, creerDemande, journaliserNotification, listerDemandes,
  lireDemande, lireFichiers, lireFichier, lireNotifications, majDemande, compteurs,
};
