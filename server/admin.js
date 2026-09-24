/* Rendu HTML du back-office AMDA. Toute valeur issue de la base est échappée avant affichage. */
const db = require('./db');
const { champsLisibles, titre, SCHEMAS } = require('./formulaires');
const { lienWhatsApp, echapper: e } = require('./notifications');

/* Fonds de pastille : assez foncés pour porter du texte blanc. */
const COULEURS = {
  'nouvelle': '#c85512', 'en cours': '#1d4ed8', 'devis envoyé': '#6b4e9e',
  'validée': '#1f8f4d', 'clôturée': '#4b5563', 'sans suite': '#9ca3af',
};

const dateFr = iso => new Date(iso).toLocaleString('fr-FR', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

const poids = o => (o < 1024 ? o + ' o' : o < 1048576 ? (o / 1024).toFixed(0) + ' Ko' : (o / 1048576).toFixed(1) + ' Mo');

const pastille = statut =>
  `<span class="statut" style="background:${COULEURS[statut] || '#64748b'}">${e(statut)}</span>`;

function page(titrePage, contenu, { connecte = true } = {}) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${e(titrePage)} — Back-office AMDA</title>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/css/amda.css">
<link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
<style>
  body { background: var(--creme); }
  .bo-header { background: var(--vert); color: #fff; padding: 14px 0; }
  .bo-header .enveloppe { display: flex; align-items: center; gap: 20px; }
  .bo-header img { height: 30px; }
  .bo-header a { color: rgba(255,255,255,.8); font-size: 14px; font-weight: 600; font-family: var(--titre); }
  .bo-header a:hover { color: #fff; text-decoration: none; }
  .bo-header nav { display: flex; gap: 18px; margin-left: auto; align-items: center; }
  .statut { display: inline-block; color: #fff; font-size: 11.5px; font-weight: 700;
            padding: 3px 9px; border-radius: 999px; white-space: nowrap; }
  .bo-table { width: 100%; border-collapse: collapse; background: #fff;
              border: 1px solid var(--filet); border-radius: var(--r); overflow: hidden; }
  .bo-table th { text-align: left; font-family: var(--titre); font-size: 11px; letter-spacing: .08em;
                 text-transform: uppercase; color: var(--discret); padding: 12px 16px; border-bottom: 1px solid var(--filet); }
  .bo-table td { padding: 13px 16px; border-bottom: 1px solid var(--filet); font-size: 13.5px; vertical-align: top; }
  .bo-table tr:last-child td { border-bottom: 0; }
  .bo-table tr:hover td { background: #fbfcfe; }
  .bo-ref { font-family: var(--titre); font-weight: 700; color: var(--encre); }
  .bo-stats { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px; }
  .bo-stat { background: #fff; border: 1px solid var(--filet); border-radius: var(--r);
             padding: 12px 18px; min-width: 120px; }
  .bo-stat b { display: block; font-family: var(--titre); font-size: 22px; color: var(--encre); }
  .bo-stat span { font-size: 12.5px; color: var(--discret); }
  .bo-filtres { display: flex; gap: 10px; flex-wrap: wrap; align-items: end; margin-bottom: 18px; }
  .bo-filtres select, .bo-filtres input { width: auto; min-width: 150px; }
  .bo-vide { text-align: center; padding: 50px; color: var(--discret); background: #fff;
             border: 1px solid var(--filet); border-radius: var(--r); }
  .bo-login { max-width: 380px; margin: 70px auto; }
  .recap { border: 1px solid var(--filet); margin: 0; }
  .recap__row { display: grid; grid-template-columns: 200px 1fr; gap: 16px;
                padding: 13px 16px; border-bottom: 1px solid var(--filet); font-size: 14px; }
  .recap__row:last-child { border-bottom: 0; }
  .recap__row:nth-child(odd) { background: #fbfaf7; }
  .recap__row dt { color: var(--discret); margin: 0; }
  .recap__row dd { margin: 0; color: var(--encre); }
  .bo-erreur { background: #fdecec; color: #b3261e; border-radius: var(--r);
               padding: 11px 14px; font-size: 13.5px; margin-bottom: 16px; }
</style>
</head>
<body>
${connecte ? `<header class="bo-header">
  <div class="enveloppe">
    <img src="/assets/img/logo-amda-btp-clair.png" alt="AMDA BTP">
    <strong style="font-family:var(--titre)">Back-office</strong>
    <nav>
      <a href="/admin">Demandes</a>
      <a href="/" target="_blank">Voir le site ↗</a>
      <form method="post" action="/admin/deconnexion" style="margin:0">
        <button class="bouton bouton--clair bouton--petit" type="submit">Déconnexion</button>
      </form>
    </nav>
  </div>
</header>` : ''}
<main class="enveloppe" style="padding:${connecte ? '28px' : '0'} 0 60px">
${contenu}
</main>
</body>
</html>`;
}

function connexion({ erreur } = {}) {
  return page('Connexion', `
  <div class="bo-login">
    <div style="text-align:center;margin-bottom:22px">
      <img src="/assets/img/logo-amda-btp.png" alt="AMDA BTP" style="height:46px;margin:0 auto">
    </div>
    <form class="encadre" method="post" action="/admin/connexion">
      <h1 style="font-size:20px;margin-bottom:6px">Back-office AMDA</h1>
      <p class="menu-texte" style="margin-bottom:20px">Accès réservé à l'équipe.</p>
      ${erreur ? `<p class="bo-erreur">${e(erreur)}</p>` : ''}
      <div class="champ"><label for="u">Identifiant</label><input id="u" name="utilisateur" type="text" autocomplete="username" required></div>
      <div class="champ"><label for="p">Mot de passe</label><input id="p" name="motdepasse" type="password" autocomplete="current-password" required></div>
      <button class="bouton bouton--accent bouton--plein" type="submit">Se connecter</button>
    </form>
  </div>`, { connecte: false });
}

function liste({ lignes, total, filtres, page: numPage, parPage }) {
  const c = db.compteurs();
  const stats = ['nouvelle', 'en cours', 'devis envoyé', 'validée'].map(s =>
    `<div class="bo-stat"><b>${c.parStatut[s] || 0}</b><span>${e(s)}</span></div>`).join('');

  const options = (valeurs, selection) => valeurs.map(v =>
    `<option value="${e(v)}"${v === selection ? ' selected' : ''}>${e(v || 'Tous')}</option>`).join('');

  const corps = lignes.length ? `<table class="bo-table">
    <thead><tr><th>Référence</th><th>Type</th><th>Client</th><th>Résumé</th><th>Statut</th><th>Reçue le</th></tr></thead>
    <tbody>${lignes.map(d => `<tr>
      <td><a class="bo-ref" href="/admin/demandes/${d.id}">${e(d.reference)}</a>
          ${d.nb_fichiers ? `<br><span class="menu-texte">${d.nb_fichiers} fichier(s)</span>` : ''}</td>
      <td>${e(titre(d.type))}</td>
      <td>${e(d.nom || '—')}<br><span class="menu-texte">${e(d.telephone || '')}</span></td>
      <td style="max-width:320px">${e(d.resume || '')}</td>
      <td>${pastille(d.statut)}</td>
      <td class="menu-texte">${e(dateFr(d.cree_le))}</td>
    </tr>`).join('')}</tbody></table>` : '<p class="bo-vide">Aucune demande ne correspond à ces critères.</p>';

  const pages = Math.ceil(total / parPage) || 1;
  const lien = n => {
    const p = new URLSearchParams({ ...filtres, page: n });
    return `/admin?${p.toString()}`;
  };

  return page('Demandes', `
  <h1 style="font-size:25px">Demandes reçues <span class="muted" style="font-weight:400">(${total})</span></h1>
  <div class="bo-stats">${stats}</div>
  <form class="bo-filtres" method="get" action="/admin">
    <label class="champ" style="margin:0"><span class="etiquette-champ">Statut</span>
      <select name="statut">${options(['', ...db.STATUTS], filtres.statut)}</select></label>
    <label class="champ" style="margin:0"><span class="etiquette-champ">Type</span>
      <select name="type">${options(['', ...Object.keys(SCHEMAS)], filtres.type)}</select></label>
    <label class="champ" style="margin:0"><span class="etiquette-champ">Recherche</span>
      <input name="q" type="text" value="${e(filtres.q || '')}" placeholder="Référence, nom, téléphone…"></label>
    <button class="bouton bouton--vert" type="submit">Filtrer</button>
    <a class="bouton bouton--fantome" href="/admin">Réinitialiser</a>
  </form>
  ${corps}
  ${pages > 1 ? `<nav class="pagination">${Array.from({ length: pages }, (_, i) =>
    `<a class="bouton bouton--fantome bouton--petit"${i + 1 === numPage ? ' style="background:var(--vert);color:#fff;border-color:var(--vert)"' : ''} href="${lien(i + 1)}">${i + 1}</a>`).join('')}</nav>` : ''}
  `);
}

function detail(demande, fichiers, notifications, { enregistre } = {}) {
  const donnees = JSON.parse(demande.donnees);
  const lignes = champsLisibles(demande.type, donnees);
  const wa = lienWhatsApp(demande.whatsapp || demande.telephone, demande.reference);

  const tableau = lignes.map(([label, valeur]) => `<div class="recap__row" style="grid-template-columns:200px 1fr">
      <dt>${e(label)}</dt><dd style="font-weight:400;white-space:pre-wrap">${e(valeur)}</dd></div>`).join('');

  const blocFichiers = fichiers.length ? `<div class="fichiers">${fichiers.map(f =>
    `<div class="fichiers__ligne"><a href="/admin/fichiers/${f.id}"><strong>${e(f.nom)}</strong></a>
       <span class="menu-texte">${e(poids(f.taille))}</span></div>`).join('')}</div>`
    : '<p class="menu-texte">Aucun fichier joint.</p>';

  const blocNotifs = notifications.length ? notifications.map(n =>
    `<li>${e(n.canal)} — <strong>${e(n.etat)}</strong> <span class="menu-texte">${e(dateFr(n.cree_le))}${n.detail ? ' · ' + e(n.detail) : ''}</span></li>`).join('')
    : '<li class="muted">Aucune notification enregistrée.</li>';

  return page(demande.reference, `
  <p class="menu-texte"><a href="/admin">← Toutes les demandes</a></p>
  <div class="split" style="align-items:start;margin-top:14px">
    <div>
      <p class="surtitre">${e(titre(demande.type))}</p>
      <h1 style="font-size:27px;margin-bottom:8px">${e(demande.reference)}</h1>
      <p class="chapeau" style="margin-bottom:8px">${e(demande.resume || '')}</p>
      <p class="menu-texte">Reçue le ${e(dateFr(demande.cree_le))} · dernière mise à jour ${e(dateFr(demande.maj_le))}</p>

      <dl class="recap" style="margin-top:22px">${tableau}</dl>

      <h3 style="font-size:16px;margin:28px 0 12px">Fichiers joints</h3>
      ${blocFichiers}
    </div>

    <aside>
      ${enregistre ? '<p class="bo-erreur" style="background:#e7f6ec;color:#1b7a42">Modifications enregistrées.</p>' : ''}
      <form class="encadre" method="post" action="/admin/demandes/${demande.id}">
        <h3 style="font-size:16px">Suivi</h3>
        <div class="champ"><label for="s">Statut</label>
          <select id="s" name="statut">${db.STATUTS.map(s =>
    `<option value="${e(s)}"${s === demande.statut ? ' selected' : ''}>${e(s)}</option>`).join('')}</select></div>
        <div class="champ"><label for="n">Note interne</label>
          <textarea id="n" name="note" style="min-height:120px" placeholder="Compte rendu d'appel, prix obtenu, prochaine action…">${e(demande.note || '')}</textarea></div>
        <button class="bouton bouton--accent bouton--plein" type="submit">Enregistrer</button>
      </form>

      <div class="encadre" style="margin-top:16px">
        <h3 style="font-size:16px">Contacter le client</h3>
        <p class="menu-texte">${e(demande.nom || '—')}<br>${e(demande.telephone || '')}${demande.email ? '<br>' + e(demande.email) : ''}</p>
        ${wa ? `<a class="bouton bouton--vert bouton--plein" href="${e(wa)}" target="_blank" rel="noopener">Répondre sur WhatsApp</a>` : ''}
        ${demande.telephone ? `<a class="bouton bouton--fantome bouton--plein" style="margin-top:8px" href="tel:${e(demande.telephone.replace(/[^0-9+]/g, ''))}">Appeler</a>` : ''}
        ${demande.email ? `<a class="bouton bouton--fantome bouton--plein" style="margin-top:8px" href="mailto:${e(demande.email)}?subject=${encodeURIComponent('AMDA BTP — ' + demande.reference)}">Écrire un email</a>` : ''}
      </div>

      <div class="encadre" style="margin-top:16px">
        <h3 style="font-size:16px">Notifications</h3>
        <ul class="menu-texte" style="padding-left:18px;margin:0;display:grid;gap:7px">${blocNotifs}</ul>
      </div>
    </aside>
  </div>`);
}

module.exports = { page, connexion, liste, detail };
