/* Données de démonstration. À brancher sur le back-office AMDA. */

window.AMDA = {

  articles: [
    { ref: 'CIM-001', famille: 'Liants', nom: 'Ciment CPJ 42.5 — sac de 50 kg', conditionnement: 'Au sac, à partir de 10', prix: 5200, etat: 'dispo', marque: 'CIMBENIN', visuel: 'p-ciment.jpg' },
    { ref: 'CIM-002', famille: 'Liants', nom: 'Ciment CPA 32.5 — sac de 50 kg', conditionnement: 'Au sac, à partir de 10', prix: 4900, etat: 'dispo', marque: 'CIMBENIN', visuel: 'p-ciment.jpg' },
    { ref: 'ACI-012', famille: 'Aciers', nom: 'Barre haute adhérence Ø12 — 12 m', conditionnement: 'À la barre', prix: 6800, etat: 'dispo', marque: 'NOCIBE', visuel: 'p-fer.jpg' },
    { ref: 'ACI-008', famille: 'Aciers', nom: 'Barre haute adhérence Ø8 — 12 m', conditionnement: 'À la barre', prix: 3400, etat: 'dispo', marque: 'NOCIBE', visuel: 'p-fer.jpg' },
    { ref: 'ACI-700', famille: 'Aciers', nom: 'Fil recuit d\'attache — rouleau 25 kg', conditionnement: 'Au rouleau', prix: 22000, etat: 'dispo', marque: 'NOCIBE', visuel: 'p-fer.jpg' },
    { ref: 'COU-030', famille: 'Couverture', nom: 'Bac acier galvanisé 0,30 — 2 m', conditionnement: 'À la feuille', prix: null, etat: 'commande', marque: 'NOCIBE', visuel: 'p-tole.jpg' },
    { ref: 'COU-041', famille: 'Couverture', nom: 'Tôle ondulée aluzinc 0,35 — 3 m', conditionnement: 'À la feuille', prix: 14500, etat: 'dispo', marque: 'NOCIBE', visuel: 'p-tole.jpg' },
    { ref: 'REV-604', famille: 'Revêtements', nom: 'Grès cérame 60×60 sable', conditionnement: 'Au m², carton de 1,44 m²', prix: 9500, etat: 'dispo', marque: 'Lafarge', visuel: 'p-carrelage.jpg' },
    { ref: 'REV-620', famille: 'Revêtements', nom: 'Grès antidérapant 40×40 extérieur', conditionnement: 'Au m²', prix: 8200, etat: 'dispo', marque: 'Lafarge', visuel: 'p-carrelage.jpg' },
    { ref: 'REV-311', famille: 'Revêtements', nom: 'Faïence murale 30×60 blanc mat', conditionnement: 'Au m²', prix: 7200, etat: 'commande', marque: 'Lafarge', visuel: 'p-faience.jpg' },
    { ref: 'CLI-208', famille: 'Climatisation', nom: 'Split mural 1,5 CV inverter', conditionnement: 'À l\'unité', prix: 285000, etat: 'pose', marque: 'NOCIBE', visuel: 'p-clim.jpg' },
    { ref: 'MOB-115', famille: 'Mobilier', nom: 'Bureau de direction 160 cm et fauteuil', conditionnement: 'À l\'ensemble', prix: 345000, etat: 'pose', marque: 'Multi-marques', visuel: 'p-bureau.jpg' },
    { ref: 'MOB-120', famille: 'Mobilier', nom: 'Salon 3+2+1 simili cuir', conditionnement: 'À l\'ensemble', prix: 480000, etat: 'commande', marque: 'Multi-marques', visuel: 'p-bureau.jpg' },
    { ref: 'MAC-015', famille: 'Maçonnerie', nom: 'Parpaing creux 15×20×40', conditionnement: 'À l\'unité, à partir de 100', prix: 450, etat: 'dispo', marque: 'Multi-marques', visuel: 'cat-1.svg' },
    { ref: 'MAC-020', famille: 'Maçonnerie', nom: 'Parpaing creux 20×20×40', conditionnement: 'À l\'unité, à partir de 100', prix: 600, etat: 'dispo', marque: 'Multi-marques', visuel: 'cat-1.svg' },
    { ref: 'GRA-001', famille: 'Granulats', nom: 'Sable de rivière — benne de 10 m³', conditionnement: 'À la benne', prix: 85000, etat: 'dispo', marque: 'Multi-marques', visuel: 'pole-1.svg' },
    { ref: 'GRA-002', famille: 'Granulats', nom: 'Gravier concassé 5/15 — benne de 10 m³', conditionnement: 'À la benne', prix: 110000, etat: 'dispo', marque: 'Multi-marques', visuel: 'pole-1.svg' },
    { ref: 'BOI-300', famille: 'Bois', nom: 'Chevron bois rouge 6×8 — 4 m', conditionnement: 'À l\'unité', prix: 4200, etat: 'dispo', marque: 'Multi-marques', visuel: 'cat-1.svg' },
    { ref: 'EAU-044', famille: 'Eau', nom: 'Tube PVC pression Ø63 — 6 m', conditionnement: 'À la barre', prix: 12500, etat: 'dispo', marque: 'NOCIBE', visuel: 'cat-2.svg' },
    { ref: 'EAU-051', famille: 'Eau', nom: 'Réservoir polytank 1 000 L', conditionnement: 'À l\'unité', prix: 135000, etat: 'pose', marque: 'Multi-marques', visuel: 'cat-2.svg' },
    { ref: 'EAU-500', famille: 'Eau', nom: 'WC céramique complet avec réservoir', conditionnement: 'À l\'ensemble', prix: 92000, etat: 'pose', marque: 'Multi-marques', visuel: 'cat-2.svg' },
    { ref: 'ELE-101', famille: 'Électricité', nom: 'Câble souple 3G2.5 — couronne 100 m', conditionnement: 'À la couronne', prix: 68000, etat: 'dispo', marque: 'NOCIBE', visuel: 'cat-2.svg' },
    { ref: 'ELE-140', famille: 'Électricité', nom: 'Tableau 24 modules équipé', conditionnement: 'À l\'unité', prix: 96000, etat: 'pose', marque: 'NOCIBE', visuel: 'cat-2.svg' },
    { ref: 'FIN-210', famille: 'Finitions', nom: 'Peinture acrylique mate — seau 20 L', conditionnement: 'Au seau', prix: 42000, etat: 'dispo', marque: 'Multi-marques', visuel: 'cat-3.svg' },
    { ref: 'FIN-233', famille: 'Finitions', nom: 'Enduit de lissage — sac 25 kg', conditionnement: 'Au sac', prix: 9800, etat: 'dispo', marque: 'Lafarge', visuel: 'cat-3.svg' },
    { ref: 'MEN-410', famille: 'Menuiseries', nom: 'Porte métallique 90×210 un vantail', conditionnement: 'À l\'unité', prix: 78000, etat: 'pose', marque: 'Multi-marques', visuel: 'cat-4.svg' },
    { ref: 'MEN-422', famille: 'Menuiseries', nom: 'Fenêtre aluminium coulissante 120×120', conditionnement: 'À l\'unité', prix: 125000, etat: 'commande', marque: 'Multi-marques', visuel: 'cat-4.svg' },
    { ref: 'OUT-600', famille: 'Matériel', nom: 'Bétonnière thermique 350 L', conditionnement: 'À l\'unité', prix: null, etat: 'commande', marque: 'Multi-marques', visuel: 'pole-1.svg' }
  ],

  artisans: [
    { nom: 'Issifou A.', metier: 'Maçon', annees: 14, zone: 'Albarika', chantiers: 38, dispo: 'oui', note: 4.8, avis: 23, visuel: 'pro-1.svg' },
    { nom: 'Rachid O.', metier: 'Électricien', annees: 9, zone: 'Banikanni', chantiers: 51, dispo: 'oui', note: 4.9, avis: 31, visuel: 'pro-2.svg' },
    { nom: 'Mariam S.', metier: 'Carreleuse', annees: 6, zone: 'Zongo', chantiers: 27, dispo: 'oui', note: 4.7, avis: 12, visuel: 'pro-3.svg' },
    { nom: 'Boubacar T.', metier: 'Plombier', annees: 11, zone: 'Tchaourou', chantiers: 44, dispo: 'bientot', note: 4.8, avis: 19, visuel: 'pro-4.svg' },
    { nom: 'Karim D.', metier: 'Frigoriste', annees: 7, zone: 'Albarika', chantiers: 33, dispo: 'oui', note: 4.6, avis: 9, visuel: 'pro-2.svg' },
    { nom: 'Samuel K.', metier: 'Coffreur', annees: 12, zone: "N'Dali", chantiers: 29, dispo: 'bientot', note: 4.7, avis: 15, visuel: 'pro-1.svg' },
    { nom: 'Alassane B.', metier: 'Peintre', annees: 8, zone: 'Banikanni', chantiers: 62, dispo: 'oui', note: 4.5, avis: 17, visuel: 'pro-4.svg' },
    { nom: 'Fatima Z.', metier: 'Décoratrice', annees: 5, zone: 'Albarika', chantiers: 21, dispo: 'oui', note: 4.9, avis: 11, visuel: 'pro-3.svg' },
    { nom: 'Moussa G.', metier: 'Ferrailleur', annees: 16, zone: 'Zongo', chantiers: 47, dispo: 'oui', note: 4.7, avis: 28, visuel: 'pro-1.svg' },
    { nom: 'Yacoubou I.', metier: 'Menuisier aluminium', annees: 10, zone: 'Banikanni', chantiers: 35, dispo: 'bientot', note: 4.6, avis: 14, visuel: 'pro-2.svg' },
    { nom: 'Chantal A.', metier: 'Plâtrière', annees: 4, zone: 'Albarika', chantiers: 18, dispo: 'oui', note: 4.4, avis: 8, visuel: 'pro-3.svg' },
    { nom: 'Sourou M.', metier: 'Couvreur', annees: 13, zone: 'Tchaourou', chantiers: 40, dispo: 'oui', note: 4.8, avis: 21, visuel: 'pro-4.svg' }
  ],

  chantiers: [
    {
      titre: 'Villa quatre chambres à Albarika',
      nature: 'Construction neuve', lieu: 'Parakou', annee: 2025,
      duree: '9 mois', surface: '180 m²', engagement: 'Clés en main',
      resume: "Terrain de 600 m² viabilisé, structure poteaux-poutres, toiture quatre pentes. Livrée équipée : climatisation, cuisine, mobilier de chambre.",
      visuel: 'pole-3.svg'
    },
    {
      titre: 'Boutique de quartier en bord de route',
      nature: 'Construction neuve', lieu: 'Banikanni', annee: 2025,
      duree: '4 mois', surface: '62 m²', engagement: 'Chantier complet',
      resume: "Local commercial avec réserve et sanitaire, rideau métallique, raccordement au réseau. Ouvert au public six semaines avant la date promise.",
      visuel: 'constr-hero.svg'
    },
    {
      titre: 'Réfection complète d\'une toiture',
      nature: 'Rénovation', lieu: 'Zongo', annee: 2024,
      duree: '3 semaines', surface: '140 m²', engagement: 'Fourniture et pose',
      resume: "Dépose de l'ancienne couverture, reprise de la charpente attaquée par les termites, pose de bac acier et de gouttières.",
      visuel: 'cat-1.svg'
    },
    {
      titre: 'Aménagement de bureaux',
      nature: 'Aménagement', lieu: 'Centre-ville, Parakou', annee: 2024,
      duree: '6 semaines', surface: '95 m²', engagement: 'Chantier complet',
      resume: "Cloisonnement de trois bureaux et d'une salle de réunion, faux plafond, climatisation, câblage informatique et mobilier.",
      visuel: 'cat-4.svg'
    },
    {
      titre: 'Trois salles de classe',
      nature: 'Construction neuve', lieu: "N'Dali", annee: 2024,
      duree: '5 mois', surface: '210 m²', engagement: 'Chantier complet',
      resume: "Bâtiment scolaire en parpaings pleins, sol béton quartzé, ouvertures métalliques renforcées, préau attenant.",
      visuel: 'pole-1.svg'
    },
    {
      titre: 'Extension d\'une maison familiale',
      nature: 'Extension', lieu: 'Tchaourou', annee: 2023,
      duree: '10 semaines', surface: '48 m²', engagement: 'Main-d\'œuvre et matériaux',
      resume: "Ajout de deux chambres et d'une salle d'eau en prolongement de l'existant, avec reprise de l'étanchéité en jonction.",
      visuel: 'pole-2.svg'
    }
  ],

  familles: ['Liants', 'Aciers', 'Maçonnerie', 'Granulats', 'Couverture', 'Bois',
    'Eau', 'Électricité', 'Revêtements', 'Finitions', 'Menuiseries', 'Climatisation', 'Mobilier', 'Matériel'],

  metiers: ['Maçon', 'Coffreur', 'Ferrailleur', 'Électricien', 'Plombier', 'Frigoriste',
    'Carreleuse', 'Peintre', 'Plâtrière', 'Couvreur', 'Menuisier aluminium', 'Décoratrice'],

  zones: ['Albarika', 'Banikanni', 'Zongo', 'Tchaourou', "N'Dali"]
};
