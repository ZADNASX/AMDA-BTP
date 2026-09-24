/* Définition et validation des formulaires du site.
   Un champ absent d'un schéma est ignoré : le client ne peut pas injecter de données arbitraires. */
const crypto = require('crypto');

const T = (label, opts = {}) => ({ label, max: 300, ...opts });

const SCHEMAS = {
  contact: {
    titre: 'Message de contact',
    champs: {
      nom: T('Nom complet', { requis: true, max: 120 }),
      telephone: T('Téléphone / WhatsApp', { requis: true, max: 40, type: 'tel' }),
      email: T('Email', { max: 160, type: 'email' }),
      sujet: T('Sujet', { max: 120 }),
      message: T('Message', { requis: true, max: 4000 }),
    },
    resume: d => `${d.sujet || 'Contact'} — ${(d.message || '').slice(0, 120)}`,
  },

  devis: {
    titre: 'Demande de devis',
    champs: {
      type_besoin: T('Type de besoin', { max: 60 }),
      produits: T('Produits ou services concernés', { requis: true, max: 400 }),
      quantite: T('Quantité', { max: 120 }),
      description: T('Description', { max: 4000 }),
      ville: T('Ville', { max: 80 }),
      delai: T('Délai souhaité', { max: 80 }),
      budget: T('Budget indicatif', { max: 80 }),
      niveau_service: T('Niveau de service', { max: 120 }),
      nom: T('Nom', { requis: true, max: 120 }),
      prenom: T('Prénom', { max: 120 }),
      telephone: T('Téléphone / WhatsApp', { requis: true, max: 40, type: 'tel' }),
      whatsapp: T('WhatsApp', { max: 40, type: 'tel' }),
      email: T('Email', { max: 160, type: 'email' }),
      quartier: T('Quartier', { max: 120 }),
      profil: T('Vous êtes', { max: 60 }),
    },
    resume: d => `${d.type_besoin || 'Devis'} — ${d.produits || ''}`,
  },

  produit: {
    titre: 'Recherche de produit',
    champs: {
      nom_produit: T('Nom du produit', { requis: true, max: 200 }),
      categorie: T('Catégorie', { max: 80 }),
      quantite: T('Quantité', { max: 120 }),
      marque: T('Marque souhaitée', { max: 120 }),
      caracteristiques: T('Caractéristiques', { max: 4000 }),
      ville: T('Ville de livraison', { max: 80 }),
      delai: T('Délai souhaité', { max: 80 }),
      budget: T('Budget indicatif', { max: 80 }),
      nom: T('Nom', { requis: true, max: 120 }),
      prenom: T('Prénom', { max: 120 }),
      telephone: T('Téléphone', { requis: true, max: 40, type: 'tel' }),
      whatsapp: T('WhatsApp', { max: 40, type: 'tel' }),
      email: T('Email', { max: 160, type: 'email' }),
      quartier: T('Quartier', { max: 120 }),
      commentaire: T('Commentaire', { max: 2000 }),
    },
    resume: d => `Sourcing — ${d.nom_produit || ''}${d.quantite ? ' (' + d.quantite + ')' : ''}`,
  },

  projet: {
    titre: 'Projet de construction',
    champs: {
      nom: T('Nom', { requis: true, max: 120 }),
      prenom: T('Prénom', { requis: true, max: 120 }),
      telephone: T('Téléphone', { requis: true, max: 40, type: 'tel' }),
      whatsapp: T('WhatsApp', { max: 40, type: 'tel' }),
      email: T('Email', { max: 160, type: 'email' }),
      ville: T('Ville', { max: 80 }),
      quartier: T('Quartier', { max: 120 }),
      nature: T('Nature du projet', { max: 60 }),
      description: T('Description', { requis: true, max: 6000 }),
      terrain: T('Superficie du terrain (m²)', { max: 20, type: 'nombre' }),
      surface: T('Superficie souhaitée (m²)', { max: 20, type: 'nombre' }),
      pieces: T('Nombre de pièces', { max: 10, type: 'nombre' }),
      chambres: T('Nombre de chambres', { max: 10, type: 'nombre' }),
      niveaux: T('Nombre de niveaux', { max: 40 }),
      batiment: T('Type de bâtiment', { max: 60 }),
      finition: T('Niveau de finition', { max: 60 }),
      terrainDispo: T('Terrain déjà disponible', { max: 10 }),
      budget: T('Budget indicatif', { max: 80 }),
      service: T('Niveau de service', { max: 120 }),
    },
    resume: d => `${d.nature || 'Projet'} — ${d.batiment || ''} ${d.surface ? d.surface + ' m²' : ''} · ${d.budget || 'budget à définir'}`,
  },

  pro: {
    titre: 'Candidature professionnel',
    champs: {
      nom: T('Nom', { requis: true, max: 120 }),
      prenom: T('Prénom', { requis: true, max: 120 }),
      telephone: T('Téléphone', { requis: true, max: 40, type: 'tel' }),
      whatsapp: T('WhatsApp', { max: 40, type: 'tel' }),
      email: T('Email', { max: 160, type: 'email' }),
      motdepasse: T('Mot de passe', { requis: true, max: 200, type: 'secret', min: 8 }),
      metier: T('Métier principal', { max: 80 }),
      experience: T('Années d\'expérience', { max: 10, type: 'nombre' }),
      specialites: T('Spécialités', { max: 400 }),
      equipe: T('Travaille', { max: 40 }),
      zones: T('Zones d\'intervention', { max: 300 }),
      tarif: T('Mode de tarification', { max: 80 }),
      disponibilite: T('Disponibilité', { max: 80 }),
      bio: T('Présentation', { max: 4000 }),
      references: T('Références', { max: 2000 }),
      ifu: T('Numéro IFU', { max: 60 }),
    },
    resume: d => `${d.metier || 'Professionnel'} — ${d.prenom || ''} ${d.nom || ''}${d.experience ? ' · ' + d.experience + ' ans' : ''}`,
  },
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TEL = /^[0-9+\s().-]{6,40}$/;

/* Hachage scrypt : le mot de passe d'un candidat n'est jamais stocké ni notifié en clair. */
function hacher(motDePasse) {
  const sel = crypto.randomBytes(16);
  const cle = crypto.scryptSync(motDePasse, sel, 32);
  return `scrypt$${sel.toString('hex')}$${cle.toString('hex')}`;
}

function valider(type, brut) {
  const schema = SCHEMAS[type];
  if (!schema) return { erreurs: ['Type de demande inconnu.'] };

  const erreurs = [];
  const donnees = {};

  for (const [cle, regle] of Object.entries(schema.champs)) {
    const valeur = typeof brut[cle] === 'string' ? brut[cle].trim()
      : typeof brut[cle] === 'number' ? String(brut[cle]) : '';

    if (!valeur) {
      if (regle.requis) erreurs.push(`Le champ « ${regle.label} » est obligatoire.`);
      continue;
    }
    if (valeur.length > regle.max) {
      erreurs.push(`Le champ « ${regle.label} » dépasse ${regle.max} caractères.`);
      continue;
    }
    if (regle.min && valeur.length < regle.min) {
      erreurs.push(`Le champ « ${regle.label} » doit faire au moins ${regle.min} caractères.`);
      continue;
    }
    if (regle.type === 'email' && !EMAIL.test(valeur)) {
      erreurs.push('L\'adresse email n\'est pas valide.');
      continue;
    }
    if (regle.type === 'tel' && !TEL.test(valeur)) {
      erreurs.push(`Le numéro « ${regle.label} » n'est pas valide.`);
      continue;
    }
    if (regle.type === 'nombre' && !/^\d{1,9}$/.test(valeur)) {
      erreurs.push(`Le champ « ${regle.label} » doit être un nombre.`);
      continue;
    }

    donnees[cle] = regle.type === 'secret' ? hacher(valeur) : valeur;
  }

  if (erreurs.length) return { erreurs };

  const nomComplet = [donnees.prenom, donnees.nom].filter(Boolean).join(' ') || donnees.nom || '';
  return {
    donnees,
    resume: String(schema.resume(donnees) || schema.titre).slice(0, 300),
    contact: {
      nom: nomComplet,
      telephone: donnees.telephone || '',
      whatsapp: donnees.whatsapp || donnees.telephone || '',
      email: donnees.email || '',
      ville: donnees.ville || '',
    },
  };
}

/* Champs à afficher dans le back-office et les notifications, secrets exclus. */
function champsLisibles(type, donnees) {
  const schema = SCHEMAS[type];
  if (!schema) return [];
  return Object.entries(schema.champs)
    .filter(([cle, regle]) => regle.type !== 'secret' && donnees[cle])
    .map(([cle, regle]) => [regle.label, donnees[cle]]);
}

const titre = type => (SCHEMAS[type] ? SCHEMAS[type].titre : type);

module.exports = { SCHEMAS, valider, champsLisibles, titre, hacher };
