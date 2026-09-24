/* Notification d'AMDA à la réception d'une demande : email (SMTP) et WhatsApp (Meta Cloud API).
   Un échec de notification n'invalide jamais la demande : elle est déjà en base. */
const config = require('./config');
const db = require('./db');
const { champsLisibles, titre } = require('./formulaires');

const echapper = s => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

let transporteur = null;
function getTransporteur() {
  if (!config.smtp.actif) return null;
  if (!transporteur) {
    const nodemailer = require('nodemailer');
    transporteur = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    });
  }
  return transporteur;
}

/* Lien de réponse directe au client depuis le téléphone d'un agent. */
function lienWhatsApp(numero, reference) {
  const propre = String(numero || '').replace(/[^0-9]/g, '');
  if (!propre) return '';
  const texte = encodeURIComponent(`Bonjour, AMDA BTP au sujet de votre demande ${reference}.`);
  return `https://wa.me/${propre}?text=${texte}`;
}

function corpsEmail(demande, lignes, fichiers) {
  const lienClient = lienWhatsApp(demande.contact.whatsapp, demande.reference);
  const lignesHtml = lignes.map(([label, valeur]) =>
    `<tr><td style="padding:6px 14px 6px 0;color:#7d8783;vertical-align:top;white-space:nowrap">${echapper(label)}</td>
         <td style="padding:6px 0;color:#1f4d3a">${echapper(valeur).replace(/\n/g, '<br>')}</td></tr>`).join('');

  const blocFichiers = fichiers.length
    ? `<p style="margin:18px 0 0;color:#4a5450">${fichiers.length} fichier(s) joint(s), consultables depuis le back-office.</p>`
    : '';

  return `<!doctype html><html lang="fr"><body style="margin:0;background:#f7f5f0;font-family:Segoe UI,Arial,sans-serif">
  <div style="max-width:640px;margin:0 auto;padding:24px">
    <div style="background:#1f4d3a;color:#fff;border-radius:12px 12px 0 0;padding:22px 26px">
      <p style="margin:0 0 6px;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#e9a48f">${echapper(titre(demande.type))}</p>
      <h1 style="margin:0;font-size:21px">${echapper(demande.reference)}</h1>
      <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,.8)">${echapper(demande.resume)}</p>
    </div>
    <div style="background:#fff;border:1px solid #e4e6e1;border-top:0;border-radius:0 0 12px 12px;padding:22px 26px">
      <table style="width:100%;border-collapse:collapse;font-size:14px">${lignesHtml}</table>
      ${blocFichiers}
      <p style="margin:22px 0 0">
        <a href="${echapper(config.siteUrl)}/admin/demandes/${demande.id}"
           style="display:inline-block;background:#c8553d;color:#fff;text-decoration:none;font-weight:700;padding:11px 18px;border-radius:8px;font-size:14px">Ouvrir dans le back-office</a>
        ${lienClient ? `<a href="${echapper(lienClient)}" style="display:inline-block;margin-left:10px;background:#25d366;color:#fff;text-decoration:none;font-weight:700;padding:11px 18px;border-radius:8px;font-size:14px">Répondre sur WhatsApp</a>` : ''}
      </p>
    </div>
    <p style="margin:16px 0 0;font-size:12px;color:#7d8783;text-align:center">AMDA BTP · Parakou, Bénin</p>
  </div></body></html>`;
}

async function envoyerEmail(demande, lignes, fichiers) {
  const t = getTransporteur();
  if (!t || !config.smtp.destinataire) {
    db.journaliserNotification(demande.id, 'email', 'ignoré', 'SMTP non configuré');
    return;
  }
  try {
    const info = await t.sendMail({
      from: config.smtp.expediteur,
      to: config.smtp.destinataire,
      replyTo: demande.contact.email || undefined,
      subject: `[${demande.reference}] ${titre(demande.type)} — ${demande.contact.nom || 'nouveau contact'}`,
      text: [`${titre(demande.type)} — ${demande.reference}`, '', ...lignes.map(([l, v]) => `${l} : ${v}`),
        '', `${config.siteUrl}/admin/demandes/${demande.id}`].join('\n'),
      html: corpsEmail(demande, lignes, fichiers),
    });
    db.journaliserNotification(demande.id, 'email', 'envoyé', info.messageId);
  } catch (erreur) {
    db.journaliserNotification(demande.id, 'email', 'échec', erreur.message);
    console.error('[email] échec', erreur.message);
  }
}

async function envoyerWhatsApp(demande, lignes) {
  const wa = config.whatsapp;
  if (!wa.actif || !wa.destinataire) {
    db.journaliserNotification(demande.id, 'whatsapp', 'ignoré', 'WhatsApp non configuré');
    return;
  }

  const resume = [
    `Nouvelle demande AMDA — ${titre(demande.type)}`,
    `Référence : ${demande.reference}`,
    `Client : ${demande.contact.nom || '—'} (${demande.contact.telephone || '—'})`,
    demande.resume,
  ].join('\n');

  /* Hors fenêtre de 24 h, Meta n'autorise qu'un modèle validé ; sinon un message texte suffit. */
  const corps = wa.modele
    ? {
      messaging_product: 'whatsapp', to: wa.destinataire, type: 'template',
      template: {
        name: wa.modele, language: { code: wa.langue },
        components: [{
          type: 'body', parameters: [
            { type: 'text', text: titre(demande.type) },
            { type: 'text', text: demande.reference },
            { type: 'text', text: (demande.contact.nom || 'client').slice(0, 60) },
          ],
        }],
      },
    }
    : { messaging_product: 'whatsapp', to: wa.destinataire, type: 'text', text: { body: resume } };

  try {
    const reponse = await fetch(`https://graph.facebook.com/v21.0/${wa.phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${wa.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(corps),
      signal: AbortSignal.timeout(12000),
    });
    const resultat = await reponse.json().catch(() => ({}));
    if (!reponse.ok) throw new Error(resultat?.error?.message || `HTTP ${reponse.status}`);
    db.journaliserNotification(demande.id, 'whatsapp', 'envoyé', resultat?.messages?.[0]?.id || '');
  } catch (erreur) {
    db.journaliserNotification(demande.id, 'whatsapp', 'échec', erreur.message);
    console.error('[whatsapp] échec', erreur.message);
  }
}

/* Lancé sans await depuis la route : le client reçoit sa confirmation sans attendre les envois. */
function notifier(demande, fichiers) {
  const lignes = champsLisibles(demande.type, demande.donnees);
  Promise.allSettled([
    envoyerEmail(demande, lignes, fichiers),
    envoyerWhatsApp(demande, lignes),
  ]).catch(() => {});
}

module.exports = { notifier, lienWhatsApp, echapper };
