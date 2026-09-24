/* AMDA BTP — interface : navigation, listes filtrables et envoi des demandes. */
(function () {
  'use strict';

  var API = '/api/demandes';
  var POIDS_FICHIER = 8 * 1024 * 1024;
  var POIDS_TOTAL = 18 * 1024 * 1024;

  var un = function (sel, sous) { return (sous || document).querySelector(sel); };
  var tous = function (sel, sous) { return Array.prototype.slice.call((sous || document).querySelectorAll(sel)); };
  var fcfa = function (n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA'; };
  var poids = function (o) {
    return o < 1024 ? o + ' o' : o < 1048576 ? Math.round(o / 1024) + ' Ko' : (o / 1048576).toFixed(1) + ' Mo';
  };
  var texte = function (s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };

  /* --------------------------------------------------------------- Menu */
  function menu() {
    var tete = un('.tete');
    var bouton = un('.tete__menu');
    if (!tete || !bouton) return;
    bouton.addEventListener('click', function () {
      var ouvert = tete.classList.toggle('ouvert');
      bouton.setAttribute('aria-expanded', String(ouvert));
    });
  }

  /* -------------------------------------------------------------- Avis */
  var minuteur;
  function avis(message, type) {
    var boite = un('.avis');
    if (!boite) {
      boite = document.createElement('div');
      boite.className = 'avis';
      boite.setAttribute('role', 'status');
      document.body.appendChild(boite);
    }
    boite.textContent = message;
    boite.classList.toggle('avis--erreur', type === 'erreur');
    requestAnimationFrame(function () { boite.classList.add('visible'); });
    clearTimeout(minuteur);
    minuteur = setTimeout(function () { boite.classList.remove('visible'); }, 6000);
  }

  /* -------------------------------------------------- Pièces jointes */
  var jointes = new WeakMap();

  function enBase64(fichier) {
    return new Promise(function (ok, non) {
      var lecteur = new FileReader();
      lecteur.onload = function () { ok(String(lecteur.result).split(',')[1] || ''); };
      lecteur.onerror = function () { non(new Error('Lecture impossible : ' + fichier.name)); };
      lecteur.readAsDataURL(fichier);
    });
  }

  function listerFichiers(bloc) {
    var liste = jointes.get(bloc) || [];
    tous('[data-liste-fichiers]', bloc).forEach(function (cible) {
      cible.innerHTML = liste.map(function (f, i) {
        return '<div class="fichiers__ligne"><span>' + texte(f.nom) + '</span>'
          + '<span>' + poids(f.poids) + ' · <button type="button" class="retirer" data-retirer="' + i + '">retirer</button></span></div>';
      }).join('');
    });
  }

  function initFichiers(bloc) {
    if (!tous('input[data-fichiers]', bloc).length) return;
    jointes.set(bloc, []);

    tous('input[data-fichiers]', bloc).forEach(function (champ) {
      champ.addEventListener('change', function () {
        var liste = jointes.get(bloc);
        Promise.all(Array.prototype.map.call(champ.files, function (f) {
          if (f.size > POIDS_FICHIER) throw new Error('« ' + f.name + ' » dépasse 8 Mo.');
          return enBase64(f).then(function (donnees) {
            return { nom: f.name, mime: f.type || 'application/octet-stream', poids: f.size, donnees: donnees };
          });
        })).then(function (ajouts) {
          var cumul = liste.concat(ajouts).reduce(function (s, f) { return s + f.poids; }, 0);
          if (cumul > POIDS_TOTAL) {
            avis('Les fichiers dépassent 18 Mo au total. Envoyez les plus lourds par WhatsApp.', 'erreur');
            return;
          }
          jointes.set(bloc, liste.concat(ajouts));
          listerFichiers(bloc);
        }).catch(function (e) { avis(e.message, 'erreur'); })
          .then(function () { champ.value = ''; });
      });
    });

    bloc.addEventListener('click', function (e) {
      var b = e.target.closest('[data-retirer]');
      if (!b) return;
      e.preventDefault();
      var liste = jointes.get(bloc).slice();
      liste.splice(parseInt(b.dataset.retirer, 10), 1);
      jointes.set(bloc, liste);
      listerFichiers(bloc);
    });
  }

  /* ------------------------------------------------ Envoi des demandes */
  function recolter(form) {
    var donnees = {};
    tous('[name]', form).forEach(function (champ) {
      /* Une branche masquée ne doit rien envoyer. */
      if (champ.closest('[data-branche][hidden]')) return;
      if (champ.type === 'radio' || champ.type === 'checkbox') {
        if (champ.checked) donnees[champ.name] = champ.value;
        return;
      }
      var v = String(champ.value || '').trim();
      if (v) donnees[champ.name] = v;
    });
    return donnees;
  }

  function messageErreur(form, contenu) {
    var zone = un('[data-erreur]', form);
    if (!zone) {
      zone = document.createElement('p');
      zone.className = 'erreur-formulaire';
      zone.setAttribute('data-erreur', '');
      form.insertBefore(zone, form.firstChild);
    }
    zone.textContent = contenu || '';
    zone.hidden = !contenu;
  }

  function confirmation(reference) {
    return '<div class="confirmation">'
      + '<span class="confirmation__marque">✓</span>'
      + '<h2>C\'est enregistré</h2>'
      + '<p>Gardez ce numéro, il suit votre dossier d\'un bout à l\'autre :</p>'
      + '<p class="confirmation__ref">' + texte(reference) + '</p>'
      + '<p class="menu-texte">Un responsable vous rappelle sous 48 heures ouvrées.</p>'
      + '<p style="margin-top:24px"><a class="bouton bouton--vert" href="index.html">Revenir à l\'accueil</a> '
      + '<a class="bouton bouton--fantome" href="https://wa.me/22901000000" style="margin-left:8px">Écrire sur WhatsApp</a></p>'
      + '</div>';
  }

  function envoyer(form) {
    var bouton = un('button[type="submit"]', form);
    var libelle = bouton ? bouton.textContent : '';
    var type = form.dataset.type;

    /* Le parcours unique choisit son type selon la branche retenue. */
    var choixType = un('[name="__branche"]:checked', form);
    if (choixType) type = choixType.value;

    messageErreur(form, '');
    if (bouton) { bouton.disabled = true; bouton.textContent = 'Envoi…'; }

    var donnees = recolter(form);
    delete donnees.__branche;

    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: type,
        donnees: donnees,
        societe: '',
        fichiers: (jointes.get(form) || []).map(function (f) {
          return { nom: f.nom, mime: f.mime, donnees: f.donnees };
        })
      })
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (corps) {
        if (!r.ok) throw new Error(corps.erreur || 'Envoi impossible. Réessayez dans un instant.');
        return corps;
      });
    }).then(function (corps) {
      avis((form.dataset.succes || 'Demande enregistrée : {ref}').replace('{ref}', corps.reference));
      if (form.hasAttribute('data-remplace')) {
        form.innerHTML = confirmation(corps.reference);
        window.scrollTo({ top: form.getBoundingClientRect().top + window.scrollY - 110, behavior: 'smooth' });
      } else {
        form.reset();
        jointes.set(form, []);
        listerFichiers(form);
      }
    }).catch(function (e) {
      messageErreur(form, e.message + ' Vous pouvez aussi appeler le +229 01 00 00 00 00.');
      avis(e.message, 'erreur');
    }).then(function () {
      if (bouton) { bouton.disabled = false; bouton.textContent = libelle; }
    });
  }

  function initFormulaires() {
    tous('form[data-type]').forEach(function (form) {
      initFichiers(form);
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!form.reportValidity()) return;
        envoyer(form);
      });
    });
  }

  /* --------------------------------------- Parcours de demande unique */
  function initBranches() {
    var form = un('[data-branches]');
    if (!form) return;

    function appliquer() {
      var choisi = un('[name="__branche"]:checked', form);
      var valeur = choisi ? choisi.value : '';
      tous('[data-branche]', form).forEach(function (bloc) {
        var actif = bloc.dataset.branche === valeur;
        bloc.hidden = !actif;
        tous('[required]', bloc).forEach(function (c) { c.disabled = !actif; });
      });
    }

    tous('[name="__branche"]', form).forEach(function (r) { r.addEventListener('change', appliquer); });
    appliquer();
  }

  /* --------------------------------------------------- Catalogue */
  function carteArticle(a) {
    var etiquette = a.etat === 'dispo' ? '<span class="etiquette etiquette--dispo">En dépôt</span>'
      : a.etat === 'pose' ? '<span class="etiquette etiquette--pose">Pose possible</span>'
        : '<span class="etiquette etiquette--commande">Sur commande</span>';
    return '<article class="article">'
      + '<div class="article__visuel"><img src="assets/img/' + a.visuel + '" alt="' + texte(a.nom) + '" loading="lazy"></div>'
      + '<div class="article__corps">'
      + '<p class="article__ref">' + texte(a.famille) + ' · ' + texte(a.ref) + '</p>'
      + '<h3 class="article__nom">' + texte(a.nom) + '</h3>'
      + '<p class="article__unite">' + texte(a.conditionnement) + '</p>'
      + '<div class="article__pied"><span class="article__prix">'
      + (a.prix === null ? 'Prix sur demande' : fcfa(a.prix)) + '</span>' + etiquette + '</div>'
      + '</div></article>';
  }

  function initCatalogue() {
    var grille = un('#liste-articles');
    if (!grille) return;

    var tout = (window.AMDA && window.AMDA.articles) || [];
    var compte = un('#compte-articles');
    var famille = un('#f-famille');
    var etat = un('#f-etat');
    var tranche = un('#f-prix');
    var tri = un('#f-tri');
    var recherche = un('#f-recherche');

    function afficher() {
      var q = (recherche && recherche.value || '').trim().toLowerCase();
      var liste = tout.filter(function (a) {
        if (famille.value && a.famille !== famille.value) return false;
        if (etat.value && a.etat !== etat.value) return false;
        if (tranche.value) {
          var t = a.prix === null ? 'na' : a.prix < 10000 ? 'bas' : a.prix <= 100000 ? 'moyen' : 'haut';
          if (t !== tranche.value) return false;
        }
        if (q && (a.nom + ' ' + a.famille + ' ' + a.ref).toLowerCase().indexOf(q) === -1) return false;
        return true;
      });

      if (tri.value === 'prix-bas' || tri.value === 'prix-haut') {
        liste = liste.slice().sort(function (x, y) {
          var a = x.prix === null ? Infinity : x.prix;
          var b = y.prix === null ? Infinity : y.prix;
          return tri.value === 'prix-bas' ? a - b : b - a;
        });
      } else if (tri.value === 'nom') {
        liste = liste.slice().sort(function (a, b) { return a.nom.localeCompare(b.nom, 'fr'); });
      }

      grille.innerHTML = liste.length ? liste.map(carteArticle).join('')
        : '<p class="vide">Rien ne correspond à cette combinaison. <a href="#introuvable">Demandez-nous ce produit</a>, nous le sourçons.</p>';
      if (compte) compte.innerHTML = '<strong>' + liste.length + '</strong> référence' + (liste.length > 1 ? 's' : '');
    }

    [famille, etat, tranche, tri].forEach(function (c) { if (c) c.addEventListener('change', afficher); });
    if (recherche) recherche.addEventListener('input', afficher);
    var raz = un('#f-raz');
    if (raz) raz.addEventListener('click', function () {
      [famille, etat, tranche].forEach(function (c) { c.value = ''; });
      tri.value = 'pertinence';
      if (recherche) recherche.value = '';
      afficher();
    });

    afficher();
  }

  /* --------------------------------------------------- Artisans */
  function ligneArtisan(a) {
    var dispo = a.dispo === 'oui'
      ? '<span class="point point--oui">Disponible</span>'
      : '<span class="point point--bientot">Sous quinzaine</span>';
    return '<article class="profil">'
      + '<div class="profil__portrait"><img src="assets/img/' + a.visuel + '" alt="" loading="lazy"></div>'
      + '<div>'
      + '<span class="controle">Dossier contrôlé</span>'
      + '<h3 class="profil__nom">' + texte(a.nom) + '</h3>'
      + '<p class="profil__metier">' + texte(a.metier) + ' · intervient à ' + texte(a.zone) + '</p>'
      + '<div class="profil__faits">'
      + '<span><b>' + a.annees + ' ans</b> de métier</span>'
      + '<span><b>' + a.chantiers + '</b> chantiers avec AMDA</span>'
      + '<span><b>' + a.note.toFixed(1).replace('.', ',') + '</b> sur ' + a.avis + ' avis</span>'
      + '</div></div>'
      + '<div class="profil__actions">' + dispo
      + '<a class="bouton bouton--fantome bouton--petit" href="demande.html">Demander cet artisan</a>'
      + '</div></article>';
  }

  function initArtisans() {
    var liste = un('#liste-artisans');
    if (!liste) return;

    var tout = (window.AMDA && window.AMDA.artisans) || [];
    var compte = un('#compte-artisans');
    var metier = un('#a-metier');
    var zone = un('#a-zone');
    var dispo = un('#a-dispo');
    var tri = un('#a-tri');

    function afficher() {
      var res = tout.filter(function (a) {
        if (metier.value && a.metier !== metier.value) return false;
        if (zone.value && a.zone !== zone.value) return false;
        if (dispo.value && a.dispo !== dispo.value) return false;
        return true;
      });
      if (tri.value === 'note') res = res.slice().sort(function (a, b) { return b.note - a.note; });
      if (tri.value === 'experience') res = res.slice().sort(function (a, b) { return b.annees - a.annees; });
      if (tri.value === 'chantiers') res = res.slice().sort(function (a, b) { return b.chantiers - a.chantiers; });

      liste.innerHTML = res.length ? res.map(ligneArtisan).join('')
        : '<p class="vide">Aucun profil ne correspond. <a href="demande.html">Décrivez votre besoin</a>, nous affectons quelqu\'un.</p>';
      if (compte) compte.innerHTML = '<strong>' + res.length + '</strong> professionnel' + (res.length > 1 ? 's' : '');
    }

    [metier, zone, dispo, tri].forEach(function (c) { if (c) c.addEventListener('change', afficher); });
    tous('[data-metier]').forEach(function (j) {
      j.addEventListener('click', function () {
        metier.value = metier.value === j.dataset.metier ? '' : j.dataset.metier;
        tous('[data-metier]').forEach(function (x) { x.classList.toggle('actif', x.dataset.metier === metier.value); });
        afficher();
      });
    });
    afficher();
  }

  /* ------------------------------------------------ Réalisations */
  function initChantiers() {
    var grille = un('#liste-chantiers');
    if (!grille) return;
    var tout = (window.AMDA && window.AMDA.chantiers) || [];
    var filtre = un('#c-nature');

    function afficher() {
      var res = tout.filter(function (c) { return !filtre || !filtre.value || c.nature === filtre.value; });
      grille.innerHTML = res.map(function (c) {
        return '<article class="chantier">'
          + '<img src="assets/img/' + c.visuel + '" alt="" loading="lazy">'
          + '<div class="chantier__corps">'
          + '<p class="chantier__meta">' + texte(c.nature) + ' · ' + texte(c.lieu) + ' · ' + c.annee + '</p>'
          + '<h3>' + texte(c.titre) + '</h3>'
          + '<p>' + texte(c.resume) + '</p>'
          + '<div class="chantier__faits">'
          + '<div><b>' + texte(c.duree) + '</b>durée</div>'
          + '<div><b>' + texte(c.surface) + '</b>surface</div>'
          + '<div><b>' + texte(c.engagement) + '</b>engagement</div>'
          + '</div></div></article>';
      }).join('');
    }

    if (filtre) filtre.addEventListener('change', afficher);
    afficher();
  }

  /* --------------------------------------------------- Démarrage */
  document.addEventListener('DOMContentLoaded', function () {
    menu();
    initFormulaires();
    initBranches();
    initCatalogue();
    initArtisans();
    initChantiers();

    var quete = un('#quete');
    if (quete) quete.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = un('input', quete).value.trim();
      window.location.href = 'acheter.html' + (v ? '?q=' + encodeURIComponent(v) : '');
    });

    var params = new URLSearchParams(window.location.search);
    var q = params.get('q');
    var rech = un('#f-recherche');
    if (q && rech) { rech.value = q; rech.dispatchEvent(new Event('input')); }
  });
})();
