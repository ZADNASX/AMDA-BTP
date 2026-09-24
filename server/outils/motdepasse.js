/* Génère les secrets du back-office.
   Usage : npm run motdepasse -- "MonMotDePasse"   (sans argument, un mot de passe est tiré au hasard) */
const crypto = require('crypto');
const { hacher } = require('../formulaires');

const fourni = process.argv[2];
const motDePasse = fourni || crypto.randomBytes(12).toString('base64url');

if (fourni && fourni.length < 10) {
  console.error('Choisissez un mot de passe d\'au moins 10 caractères.');
  process.exit(1);
}

console.log('\nAjoutez ces lignes à votre fichier .env :\n');
console.log(`ADMIN_PASSWORD_HASH=${hacher(motDePasse)}`);
console.log(`SESSION_SECRET=${crypto.randomBytes(32).toString('hex')}`);
console.log(`\nMot de passe à conserver : ${motDePasse}\n`);
