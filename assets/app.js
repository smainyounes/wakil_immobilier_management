/* El Wakil Immobilier — prototype de démonstration (pages statiques).
 * Toutes les données viennent de assets/data.js (extraites du fichier Excel).
 * Les modifications (RDV ajoutés, rôles, paramètres…) sont stockées dans localStorage. */
(function () {
  const D = window.WK_DATA;
  const TODAY = '2026-11-19';
  const CUR_MONTH = '2026-11';

  /* ───────────────────────── Storage ───────────────────────── */
  const DATA_VERSION = 5;
  try { if (localStorage.getItem('wk.v') !== String(DATA_VERSION)) { Object.keys(localStorage).filter(k => k.startsWith('wk.')).forEach(k => localStorage.removeItem(k)); localStorage.setItem('wk.v', String(DATA_VERSION)); } } catch (e) {}
  const store = {
    get(k, def) { try { const v = localStorage.getItem('wk.' + k); return v ? JSON.parse(v) : (typeof def === 'function' ? def() : def); } catch (e) { return typeof def === 'function' ? def() : def; } },
    set(k, v) { localStorage.setItem('wk.' + k, JSON.stringify(v)); },
    del(k) { localStorage.removeItem('wk.' + k); },
  };

  /* ───────────────────────── Permissions ───────────────────────── */
  const PERMISSIONS = [
    { group: 'Tableau de bord', icon: 'layout-dashboard', items: [
      ['dashboard.view', 'Voir le tableau de bord', 'Indicateurs opérationnels (nombre de RDV, équipe…)'],
      ['finance.view', 'Voir les montants financiers', 'Chiffre d\'affaires, bénéfices, marges et ROI'],
      ['espace.view', 'Espace commercial personnel', 'Ses RDV, sa rémunération, ses clients et relances'],
    ] },
    { group: 'Rendez-vous', icon: 'calendar-check', items: [
      ['rdv.view', 'Consulter les rendez-vous', ''],
      ['rdv.create', 'Ajouter un rendez-vous', ''],
      ['rdv.edit', 'Modifier un rendez-vous', ''],
      ['rdv.delete', 'Supprimer un rendez-vous', 'Action irréversible, tracée dans le journal'],
      ['rdv.export', 'Exporter (Excel / CSV)', ''],
    ] },
    { group: 'Clients (CRM)', icon: 'contact', items: [
      ['crm.view', 'Accéder au fichier clients', 'Vendeurs, acheteurs, locataires et bailleurs'],
      ['crm.viewAll', 'Voir les clients de toute l\'agence', 'Sinon, uniquement les clients qui lui sont attribués'],
      ['crm.create', 'Ajouter un client', ''],
      ['crm.edit', 'Compléter une fiche client', 'Notes, appels, informations complémentaires, relances'],
      ['crm.assign', 'Réattribuer un client', 'Changer le commercial responsable'],
      ['crm.phone', 'Voir tous les numéros de téléphone', 'Sinon, numéros masqués pour les clients des autres'],
      ['crm.export', 'Exporter le fichier clients', 'Protège la base contre la copie'],
      ['crm.delete', 'Supprimer un client', ''],
    ] },
    { group: 'Équipe terrain', icon: 'map-pinned', items: [
      ['missions.view', 'Consulter missions et présences', ''],
      ['missions.manage', 'Déclarer / valider des missions', ''],
      ['missions.editFees', 'Modifier les frais d\'une mission', 'Ajuster repas, frais et hôtel d\'une mission précise sans changer le barème'],
    ] },
    { group: 'Encaissements', icon: 'wallet', items: [
      ['encaissements.view', 'Consulter les versements CCP', ''],
      ['encaissements.create', 'Enregistrer un versement', ''],
    ] },
    { group: 'Finance', icon: 'landmark', items: [
      ['agents.view', 'Performance & rentabilité des agents', 'Salaires, net et ROI par commercial'],
      ['sponsoring.view', 'Consulter le sponsoring', ''],
      ['sponsoring.manage', 'Saisir les budgets sponsoring', ''],
      ['paie.view', 'Consulter la paie', ''],
      ['paie.validate', 'Valider et clôturer la paie', ''],
      ['rentabilite.view', 'Compte de résultat', ''],
    ] },
    { group: 'Clients', icon: 'message-square-heart', items: [
      ['enquetes.view', 'Résultats des enquêtes', ''],
    ] },
    { group: 'Administration', icon: 'shield-check', items: [
      ['users.manage', 'Gérer les utilisateurs et les rôles', 'Inviter, suspendre, attribuer des rôles'],
      ['settings.manage', 'Modifier les règles de calcul', 'Primes, charges, taux de change, frais de mission'],
      ['audit.view', 'Consulter le journal d\'activité', ''],
    ] },
  ];
  const ALL_PERMS = PERMISSIONS.flatMap(g => g.items.map(i => i[0]));

  const DEFAULT_ROLES = [
    { id: 'owner', nom: 'Propriétaire', desc: 'Accès complet. Ne peut pas être modifié ni supprimé.', color: 'violet', system: true, perms: ALL_PERMS },
    { id: 'admin', nom: 'Administrateur', desc: 'Gère l\'équipe, les accès et les règles. Accès complet aux finances.', color: 'blue', system: false, perms: ALL_PERMS },
    { id: 'comptable', nom: 'Comptable', desc: 'Finances, paie et encaissements. Pas de gestion des accès.', color: 'emerald', system: false,
      perms: ['dashboard.view', 'finance.view', 'rdv.view', 'rdv.export', 'missions.view', 'missions.editFees', 'crm.view', 'crm.viewAll', 'encaissements.view', 'encaissements.create', 'agents.view', 'sponsoring.view', 'paie.view', 'paie.validate', 'rentabilite.view', 'audit.view'] },
    { id: 'superviseur', nom: 'Superviseur commercial', desc: 'Pilote l\'activité des commerciaux et du terrain, sans les montants.', color: 'amber', system: false,
      perms: ['dashboard.view', 'rdv.view', 'rdv.create', 'rdv.edit', 'rdv.export', 'missions.view', 'missions.manage', 'missions.editFees', 'enquetes.view', 'crm.view', 'crm.viewAll', 'crm.create', 'crm.edit', 'crm.assign', 'crm.phone'] },
    { id: 'saisie', nom: 'Agent de saisie', desc: 'Saisit les RDV, missions et versements. Aucun accès aux finances.', color: 'slate', system: false,
      perms: ['dashboard.view', 'rdv.view', 'rdv.create', 'rdv.edit', 'missions.view', 'missions.manage', 'encaissements.view', 'encaissements.create', 'crm.view', 'crm.viewAll', 'crm.create', 'crm.edit', 'crm.phone'] },
    { id: 'commercial', nom: 'Commercial', desc: 'Compte vendeur : ses RDV, ses clients, le fichier clients partagé. Aucun chiffre de l\'agence.', color: 'emerald', system: false,
      perms: ['espace.view', 'crm.view', 'crm.viewAll', 'crm.create', 'crm.edit', 'rdv.view', 'rdv.create'] },
  ];

  const DEFAULT_USERS = [
    { id: 1, nom: 'Hakim Benali', email: 'h.benali@elwakil-immo.dz', role: 'owner', statut: 'Actif', last: 'Il y a 2 min', tel: '0550 •• •• 12' },
    { id: 2, nom: 'Yasmine Tahri', email: 'y.tahri@elwakil-immo.dz', role: 'admin', statut: 'Invitation envoyée', last: '—', tel: '0661 •• •• 40' },
    { id: 3, nom: 'Karim Mansouri', email: 'k.mansouri@elwakil-immo.dz', role: 'comptable', statut: 'Actif', last: 'Hier, 18:42', tel: '0770 •• •• 08' },
    { id: 4, nom: 'Sofiane Rahmani', email: 's.rahmani@elwakil-immo.dz', role: 'superviseur', statut: 'Actif', last: 'Aujourd\'hui, 09:15', tel: '0555 •• •• 31' },
    { id: 5, nom: 'Nadia Belkacem', email: 'n.belkacem@elwakil-immo.dz', role: 'saisie', statut: 'Actif', last: 'Il y a 12 min', tel: '0698 •• •• 77' },
    { id: 6, nom: 'Lamia Ouali', email: 'l.ouali@elwakil-immo.dz', role: 'saisie', statut: 'Suspendu', last: '02 oct. 2026', tel: '0540 •• •• 19' },
    { id: 7, nom: 'Asma Hadjadj', email: 'a.hadjadj@elwakil-immo.dz', role: 'commercial', agent: 'Asma', statut: 'Actif', last: 'Il y a 5 min', tel: '0661 •• •• 52' },
    { id: 8, nom: 'Lina Meziane', email: 'l.meziane@elwakil-immo.dz', role: 'commercial', agent: 'Lina', statut: 'Actif', last: 'Aujourd\'hui, 10:02', tel: '0550 •• •• 63' },
    { id: 9, nom: 'Walid Ferhat', email: 'w.ferhat@elwakil-immo.dz', role: 'commercial', agent: 'Walid', statut: 'Actif', last: 'Hier, 20:15', tel: '0772 •• •• 21' },
    { id: 10, nom: 'Sabrina Kaci', email: 's.kaci@elwakil-immo.dz', role: 'commercial', agent: 'Sabrina', statut: 'Invitation envoyée', last: '—', tel: '0698 •• •• 05' },
  ];

  /* ───────────────────────── Business settings ───────────────────────── */
  const DEFAULT_SETTINGS = {
    primeRdv: 1000, bonusWhatsapp: 1500, chargeRdv: 4000, tauxUSD: 256, fraisSponsoring: 5,
    fraisNuitee: 5000, fraisJournee: 3000, repas: 500, hotel: 4000, absence: 3000, conge: 3000, bonus5rdv: 1500,
    wilayasBase: ['Alger', 'Blida', 'Boumerdès', 'Tipaza'],
    wilayasProches: ['Médéa', 'Bouira', 'Aïn Defla', 'Tizi Ouzou', 'Chlef', 'Djelfa'],
    agence: 'El Wakil Immobilier',
  };

  const DEFAULT_TEAM = {
    commerciaux: [
      { nom: 'Asma', type: 'interne', base: 25000, actif: true },
      { nom: 'Lina', type: 'interne', base: 25000, actif: true },
      { nom: 'Rania', type: 'interne', base: 20000, actif: true },
      { nom: 'Walid', type: 'interne', base: 25000, actif: true },
      { nom: 'Nassim', type: 'interne', base: 25000, actif: true },
      { nom: 'Sabrina', type: 'whatsapp', base: 0, actif: true },
      { nom: 'Chaima', type: 'whatsapp', base: 0, actif: true },
      { nom: 'Nesrine', type: 'whatsapp', base: 0, actif: true },
      { nom: 'Hiba', type: 'whatsapp', base: 0, actif: true },
      { nom: 'Ikram', type: 'whatsapp', base: 0, actif: true },
      { nom: 'Selma', type: 'whatsapp', base: 0, actif: true },
      { nom: 'Yousra', type: 'whatsapp', base: 0, actif: true },
      { nom: 'Feriel', type: 'whatsapp', base: 0, actif: true },
      { nom: 'Manel', type: 'whatsapp', base: 0, actif: true },
      { nom: 'Kenza', type: 'interne', base: 25000, actif: false },
      { nom: 'Ryma', type: 'whatsapp', base: 0, actif: false },
    ],
    terrain: [
      { nom: 'Anis', base: 70000, actif: true, poste: 'Photographe · chef d\'équipe', repos: ['Samedi', 'Vendredi'] },
      { nom: 'Farouk', base: 65000, actif: true, poste: 'Photographe', repos: ['Jeudi', 'Vendredi'] },
      { nom: 'Mehdi', base: 65000, actif: true, poste: 'Photographe', repos: ['Mardi', 'Mercredi'] },
      { nom: 'Amine', base: 25000, actif: true, poste: 'Photographe · week-end', repos: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi'] },
      { nom: 'Hamza', base: 60000, actif: false, poste: 'Photographe' },
      { nom: 'Riad', base: 60000, actif: false, poste: 'Photographe' },
      { nom: 'Lotfi', base: 60000, actif: false, poste: 'Photographe' },
      { nom: 'Islam', base: 60000, actif: false, poste: 'Photographe' },
      { nom: 'Bachir', base: 60000, actif: false, poste: 'Photographe' },
      { nom: 'Samir', base: 60000, actif: false, poste: 'Photographe' },
    ],
  };


  // Missions validées saisies dans le fichier (novembre) — les autres sont détectées depuis les RDV hors wilaya.
  const SEED_MISSIONS = [
    { id: 'm1', date: '2026-11-01', agent: 'Anis', destination: 'Djelfa · Bouira', type: 'journee', repas: 500, frais: 3000, hotel: 0, statut: 'Validée', source: 'Saisie' },
    { id: 'm2', date: '2026-11-17', agent: 'Anis', destination: 'Oran', type: 'nuitee', repas: 1000, frais: 5000, hotel: 4000, statut: 'Validée', source: 'Saisie' },
  ];

  const settings = () => Object.assign({}, DEFAULT_SETTINGS, store.get('settings', {}));
  const team = () => store.get('team', DEFAULT_TEAM);
  const roles = () => store.get('roles', DEFAULT_ROLES);
  const users = () => store.get('users', DEFAULT_USERS);

  function currentRoleId() { return store.get('role', 'owner'); }
  function currentRole() { return roles().find(r => r.id === currentRoleId()) || roles()[0]; }
  function currentUser() { return users().find(u => u.role === currentRoleId() && u.statut === 'Actif') || { nom: currentRole().nom, email: '', role: currentRoleId() }; }
  function can(p) { return currentRole().perms.includes(p); }

  /* ───────────────────────── Data access ───────────────────────── */
  function rdvs() {
    const added = store.get('rdvs.added', []);
    const deleted = new Set(store.get('rdvs.deleted', []));
    return added.concat(D.rdvs).filter(r => !deleted.has(r.id));
  }
  const byMonth = (list, m) => list.filter(r => r.date.startsWith(m));
  const sum = (arr, f) => arr.reduce((a, x) => a + (typeof f === 'function' ? f(x) : x[f] || 0), 0);
  const months = () => [...new Set(D.rdvs.map(r => r.date.slice(0, 7)))].sort();
  function sponsoring(m) { const o = store.get('sponsoring', {}); return Object.assign({}, D.sponsoring[m] || {}, o[m] || {}); }
  function ccp() { return store.get('ccp.added', []).concat(D.ccp); }

  function agentStats(m, opts = {}) {
    const s = settings(), list = byMonth(rdvs(), m), sp = sponsoring(m);
    const until = opts.until;
    const L = until ? list.filter(r => r.date <= until) : list;
    return team().commerciaux.map(a => {
      const r = L.filter(x => x.agent === a.nom);
      const n = r.length, ca = sum(r, 'revenu');
      const charges = n * s.chargeRdv;
      const salaire = a.type === 'interne' ? a.base + n * s.primeRdv : n * (s.primeRdv + s.bonusWhatsapp);
      const usd = sp[a.nom] || 0;
      const spons = usd * (1 + s.fraisSponsoring / 100) * s.tauxUSD;
      const net = ca - charges - salaire - spons;
      return { ...a, rdv: n, ca, charges, salaire, usd, spons, net, roi: spons ? net / spons : null, list: r };
    }).filter(a => a.actif || a.rdv > 0);
  }

  function missions(m) {
    const s = settings();
    const saved = store.get('missions', SEED_MISSIONS);
    const out = saved.filter(x => x.date.startsWith(m));
    const known = new Set(saved.map(x => x.agent + '|' + x.date));
    const groups = {};
    byMonth(rdvs(), m).forEach(r => {
      if (!r.terrain || r.wilaya === 'Autre' || s.wilayasBase.includes(r.wilaya)) return;
      const k = r.terrain + '|' + r.date;
      if (known.has(k)) return;
      (groups[k] = groups[k] || []).push(r);
    });
    Object.entries(groups).forEach(([k, rs]) => {
      const [agent, date] = k.split('|');
      const wil = [...new Set(rs.map(r => r.wilaya))];
      const proche = wil.every(w => s.wilayasProches.includes(w));
      out.push({ id: 'auto-' + k, date, agent, destination: wil.join(' · '), type: proche ? 'journee' : 'nuitee',
        repas: s.repas, frais: proche ? s.fraisJournee : s.fraisNuitee, hotel: proche ? 0 : s.hotel,
        statut: 'À valider', source: 'Détectée', rdvs: rs.map(r => r.lieu) });
    });
    return out.sort((a, b) => a.date.localeCompare(b.date));
  }
  const missionTotal = x => (x.repas || 0) + (x.frais || 0) + (x.hotel || 0);

  function fieldStats(m) {
    const list = byMonth(rdvs(), m), ms = missions(m);
    return team().terrain.map(a => {
      const r = list.filter(x => x.terrain === a.nom);
      const mine = ms.filter(x => x.agent === a.nom);
      const valid = mine.filter(x => x.statut === 'Validée');
      const frais = sum(valid, missionTotal);
      return { ...a, rdv: r.length, ca: sum(r, 'revenu'), missions: mine, fraisValides: frais, fraisAttente: sum(mine.filter(x => x.statut !== 'Validée'), missionTotal), net: a.base + frais };
    }).filter(a => a.actif || a.rdv > 0);
  }

  /* ── CRM ── */
  const STAGES = [
    { id: 'Nouveau', color: 'bg-slate-400', tone: 'gray' }, { id: 'Contacté', color: 'bg-sky-500', tone: 'blue' },
    { id: 'Visite programmée', color: 'bg-violet-500', tone: 'violet' }, { id: 'Négociation', color: 'bg-amber-500', tone: 'amber' },
    { id: 'Gagné', color: 'bg-emerald-500', tone: 'green' }, { id: 'Perdu', color: 'bg-red-400', tone: 'red' },
  ];
  const clients = () => store.get('crm.clients', D.clients || []);
  const saveClients = c => store.set('crm.clients', c);
  function myAgent() { return currentUser().agent || null; }
  function visibleClients() { const me = myAgent(); return clients().filter(c => can('crm.viewAll') || (me && c.agent === me)); }
  function canSeePhone(c) { return can('crm.phone') || (myAgent() && c.agent === myAgent()); }
  const maskPhone = t => t ? t.slice(0, 4) + ' •• •• ' + t.slice(-2) : '—';
  function canEditClient(c) { return can('crm.edit') && (can('crm.viewAll') || c.agent === myAgent()); }
  function canMoveClient(c) { return can('crm.edit') && (!myAgent() || c.agent === myAgent() || can('crm.assign')); }
  function home() {
    if (can('dashboard.view')) return 'dashboard.html';
    if (can('espace.view')) return 'espace.html';
    const f = NAV.flatMap(s => s.items).find(i => can(i.perm)); return f ? f.href : 'aide.html';
  }

  function excelGap() { const L = byMonth(rdvs(), CUR_MONTH).slice(39); return { n: L.length, ca: sum(L, 'revenu') }; }

  function monthly() {
    return months().map(m => { const l = byMonth(rdvs(), m); return { m, rdv: l.length, ca: sum(l, 'revenu') }; });
  }

  /* ───────────────────────── Formatting ───────────────────────── */
  const nf = new Intl.NumberFormat('fr-FR');
  const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const MOIS_C = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  // Montants en dinars : nombre entier complet (pas de décimales ni d'abréviation k / M), groupé par milliers.
  const grp = v => { const n = Math.round(Math.abs(+v || 0)); return ((+v || 0) < 0 && n ? '−' : '') + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0'); };
  const fmt = {
    n: v => grp(v),
    da: v => grp(v) + '\u00a0DA',
    daShort: v => grp(v) + '\u00a0DA',
    money: (v, cls = '') => `<span class="tnum whitespace-nowrap ${cls}">${grp(v)}<span class="ml-1 text-[0.6em] font-semibold tracking-wide opacity-50">DA</span></span>`,
    signed: v => (v > 0 ? '+' : v < 0 ? '−' : '') + grp(Math.abs(v)) + '\u00a0DA',
    pct: (v, d = 0) => (v == null || !isFinite(v)) ? '—' : (v * 100).toLocaleString('fr-FR', { maximumFractionDigits: d }) + ' %',
    month: m => { const [y, mo] = m.split('-'); return MOIS[+mo - 1] + ' ' + y; },
    monthShort: m => { const [y, mo] = m.split('-'); return MOIS_C[+mo - 1] + ' ' + y.slice(2); },
    date: d => { const [y, m, j] = d.split('-'); return +j + ' ' + MOIS_C[+m - 1] + ' ' + y; },
    dateShort: d => { const [, m, j] = d.split('-'); return +j + ' ' + MOIS_C[+m - 1]; },
    weekday: d => JOURS[new Date(d + 'T12:00:00').getDay()],
  };

  /* ───────────────────────── UI helpers ───────────────────────── */
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (n, cls = 'w-4 h-4') => `<i data-lucide="${n}" class="${cls}"></i>`;
  // Sur mobile, les tableaux « .m-stack » deviennent des cartes : chaque cellule reçoit le titre de sa colonne.
  function labelTables() {
    document.querySelectorAll('table.m-stack').forEach(t => {
      const heads = [...t.querySelectorAll('thead th')].map(th => th.textContent.trim());
      t.querySelectorAll('tbody tr, tfoot tr').forEach(tr => {
        let i = 0;
        [...tr.children].forEach(td => { if (!td.hasAttribute('data-label')) td.setAttribute('data-label', heads[i] || ''); i += +(td.getAttribute('colspan') || 1); });
      });
    });
  }
  const refreshIcons = () => { labelTables(); window.lucide && lucide.createIcons({ attrs: { 'stroke-width': 1.75 } }); };

  const AV = ['bg-sky-100 text-sky-700', 'bg-violet-100 text-violet-700', 'bg-amber-100 text-amber-800', 'bg-emerald-100 text-emerald-700', 'bg-rose-100 text-rose-700', 'bg-indigo-100 text-indigo-700', 'bg-teal-100 text-teal-700', 'bg-orange-100 text-orange-700', 'bg-fuchsia-100 text-fuchsia-700', 'bg-lime-100 text-lime-800'];
  function avatar(name, size = 'w-7 h-7 text-xs') {
    if (!name) return `<span class="${size} rounded-full bg-slate-100 text-slate-400 inline-flex items-center justify-center font-semibold">?</span>`;
    let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const ini = name.replace(/[^A-Za-zÀ-ÿ0-9 ]/g, '').split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
    return `<span class="${size} ${AV[h % AV.length]} rounded-full inline-flex items-center justify-center font-semibold shrink-0">${ini}</span>`;
  }
  const TONES = {
    gray: 'bg-slate-100 text-slate-700 ring-slate-200', blue: 'bg-brand-50 text-brand-800 ring-brand-100', green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    red: 'bg-red-50 text-red-700 ring-red-200', amber: 'bg-amber-50 text-amber-800 ring-amber-200', violet: 'bg-violet-50 text-violet-700 ring-violet-200',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200', slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  };
  const badge = (t, tone = 'gray', ic) => `<span class="inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TONES[tone] || TONES.gray}">${ic ? icon(ic, 'w-3 h-3') : ''}${esc(t)}</span>`;
  const roleBadge = id => { const r = roles().find(x => x.id === id); return r ? badge(r.nom, r.color, r.system ? 'crown' : null) : ''; };
  const TYPE_ICON = { 'Villa': 'house', 'Terrain': 'land-plot', 'Appartement': 'building-2', 'Maison': 'home', 'Local commercial': 'store', 'Carcasse': 'construction', 'Duplex': 'building', 'Immeuble': 'building', 'Ferme': 'tractor', 'Hangar': 'warehouse', 'Projet promotion': 'hard-hat', 'Autre': 'map-pin' };

  function delta(cur, prev, { invert = false, unit = '%' } = {}) {
    if (!prev) return `<span class="text-xs text-slate-400">—</span>`;
    const d = (cur - prev) / Math.abs(prev);
    const good = invert ? d < 0 : d >= 0;
    return `<span class="inline-flex items-center gap-0.5 text-xs font-medium ${good ? 'text-emerald-700' : 'text-red-600'}">${icon(d >= 0 ? 'trending-up' : 'trending-down', 'w-3.5 h-3.5')}${d >= 0 ? '+' : '−'}${Math.abs(d * 100).toFixed(0)}${unit}</span>`;
  }

  function toast(msg, ic = 'check-circle-2') {
    let c = $('#toasts'); if (!c) { c = document.createElement('div'); c.id = 'toasts'; document.body.appendChild(c); }
    const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = icon(ic) + `<span>${esc(msg)}</span>`;
    c.appendChild(t); refreshIcons();
    setTimeout(() => { t.style.transition = 'all .3s'; t.style.opacity = 0; t.style.transform = 'translateY(6px)'; setTimeout(() => t.remove(), 300); }, 3200);
  }

  function openPanel(html, { kind = 'drawer', width } = {}) {
    closePanel();
    const ov = document.createElement('div'); ov.className = 'overlay'; ov.id = 'wk-ov';
    const p = document.createElement('div'); p.className = kind; p.id = 'wk-panel';
    if (width) p.style.setProperty('--w', width);
    p.innerHTML = html;
    document.body.append(ov, p);
    ov.onclick = closePanel;
    $$('[data-close]', p).forEach(b => b.onclick = closePanel);
    refreshIcons();
    requestAnimationFrame(() => { ov.classList.add('show'); p.classList.add('show'); });
    return p;
  }
  function closePanel() {
    const ov = $('#wk-ov'), p = $('#wk-panel'); if (!p) return;
    ov.classList.remove('show'); p.classList.remove('show'); ov.id = ''; p.id = '';
    setTimeout(() => { ov.remove(); p.remove(); }, 250);
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closePanel(); closeMenus(); } });

  const panelHead = (title, sub) => `<div class="flex items-start justify-between gap-4 px-6 py-5 border-b border-slate-100"><div><h2 class="text-base font-semibold text-slate-900">${title}</h2>${sub ? `<p class="text-sm text-slate-500 mt-0.5">${sub}</p>` : ''}</div><button data-close class="btn btn-ghost !p-1.5 -mr-1.5">${icon('x', 'w-5 h-5')}</button></div>`;

  function closeMenus() { $$('.menu.show').forEach(m => m.classList.remove('show')); }
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-menu]');
    if (t) { e.stopPropagation(); const m = document.getElementById(t.dataset.menu); const was = m.classList.contains('show'); closeMenus(); if (!was) m.classList.add('show'); return; }
    if (!e.target.closest('.menu')) closeMenus();
  });

  function seg(el, onChange) {
    el.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; $$('button', el).forEach(x => x.classList.toggle('on', x === b)); onChange(b.dataset.v); });
  }

  function exportCSV(name, rows) {
    const csv = '﻿' + rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = name; a.click();
    toast('Export téléchargé : ' + name, 'download');
  }

  function audit(action, detail) {
    const log = store.get('audit', []);
    log.unshift({ t: new Date().toISOString(), user: currentUser().nom, role: currentRoleId(), action, detail });
    store.set('audit', log.slice(0, 200));
  }

  const lockedBlock = (what = 'ces informations') => `<div class="flex flex-col items-center justify-center text-center py-10 px-6"><span class="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mb-3">${icon('lock', 'w-5 h-5')}</span><p class="text-sm font-medium text-slate-700">Accès restreint</p><p class="text-xs text-slate-500 mt-1 max-w-[260px]">Votre rôle ne permet pas de voir ${what}.</p></div>`;

  /* ───────────────────────── Charts ───────────────────────── */
  const C = { s1: '#28589e', s2: '#b97f00', hi: '#b97f00', soft: '#ecdcae', neg: '#e34948', s3: '#1baf7a', good: '#0f8a5f', bad: '#d93b3a', grid: '#eef1f5', muted: '#64748b', ink: '#0f172a' };
  // Palettes validées (scripts/validate_palette.js) : clair sur #fcfcfb, sombre sur la surface #141a26.
  const PAL = {
    light: { s1: '#28589e', s2: '#b97f00', hi: '#b97f00', soft: '#ecdcae', neg: '#e34948', grid: '#eef1f5', muted: '#64748b' },
    dark: { s1: '#5b8fd9', s2: '#c98500', hi: '#c98500', soft: '#3a3220', neg: '#e66767', grid: '#232c3b', muted: '#8b96a8' },
  };
  const isDark = () => document.documentElement.classList.contains('dark');
  Object.assign(C, PAL[isDark() ? 'dark' : 'light']);
  function setTheme(dark) {
    const before = { ...C };
    document.documentElement.classList.toggle('dark', dark);
    try { localStorage.setItem('wkTheme', dark ? 'dark' : 'light'); } catch (e) {}
    Object.assign(C, PAL[dark ? 'dark' : 'light']);
    const map = {}; Object.keys(PAL.light).forEach(k => { map[before[k].toLowerCase()] = C[k]; });
    const swap = v => Array.isArray(v) ? v.map(swap) : (typeof v === 'string' && map[v.toLowerCase()]) || v;
    if (window.Chart) {
      Chart.defaults.color = C.muted; Chart.defaults.borderColor = C.grid; Chart.defaults.scale.grid.color = C.grid;
      Object.values(Chart.instances).forEach(ch => {
        ch.data.datasets.forEach(ds => ['backgroundColor', 'borderColor', 'pointBackgroundColor', 'hoverBackgroundColor'].forEach(p => { if (ds[p] !== undefined) ds[p] = swap(ds[p]); }));
        Object.values(ch.options.scales || {}).forEach(sc => { if (sc.grid && typeof sc.grid.color === 'string') sc.grid.color = C.grid; if (sc.ticks) sc.ticks.color = C.muted; });
        ch.update('none');
      });
    }
    $$('[data-theme-toggle]').forEach(b => { b.innerHTML = icon(dark ? 'sun' : 'moon', 'w-5 h-5'); b.title = dark ? 'Passer en mode clair' : 'Passer en mode sombre'; });
    refreshIcons();
  }
  document.addEventListener('click', e => { if (e.target.closest('[data-theme-toggle]')) setTheme(!isDark()); });
  function chartDefaults() {
    if (!window.Chart) return;
    Chart.defaults.font.family = 'Inter, ui-sans-serif, system-ui';
    Chart.defaults.font.size = 12;
    Chart.defaults.color = C.muted;
    Chart.defaults.borderColor = C.grid;
    Chart.defaults.maintainAspectRatio = false;
    Chart.defaults.animation.duration = 500;
    Object.assign(Chart.defaults.plugins.tooltip, {
      backgroundColor: '#0d1729', titleColor: '#fff', bodyColor: '#e2e8f0', padding: 10, cornerRadius: 8, boxWidth: 8, boxHeight: 8, boxPadding: 4,
      titleFont: { weight: '600', size: 12 }, bodyFont: { size: 12 }, usePointStyle: true, caretSize: 5,
    });
    Chart.defaults.plugins.legend.display = false;
    Chart.defaults.scale.grid.color = C.grid;
    Chart.defaults.scale.border = { display: false };
    Chart.defaults.scale.ticks.padding = 8;
    Chart.defaults.scales.category.ticks.maxRotation = 0;
    Chart.defaults.scales.category.ticks.autoSkipPadding = 6;
    Chart.defaults.elements.bar.borderRadius = 4;
    Chart.defaults.elements.bar.borderSkipped = 'start';
    Chart.defaults.elements.line.borderWidth = 2;
    Chart.defaults.elements.point.radius = 0;
    Chart.defaults.elements.point.hoverRadius = 5;
    Chart.defaults.interaction = { mode: 'index', intersect: false };
  }

  /* ───────────────────────── Shell ───────────────────────── */
  const NAV = [
    { section: 'Opérations', items: [
      { id: 'dashboard', label: 'Tableau de bord', icon: 'layout-dashboard', href: 'dashboard.html', perm: 'dashboard.view' },
      { id: 'rdv', label: 'Rendez-vous', icon: 'calendar-check', href: 'rdv.html', perm: 'rdv.view', count: () => byMonth(rdvs(), CUR_MONTH).length },
      { id: 'missions', label: 'Équipe terrain', icon: 'map-pinned', href: 'missions.html', perm: 'missions.view', dot: () => missions(CUR_MONTH).some(m => m.statut === 'À valider') },
      { id: 'encaissements', label: 'Encaissements CCP', icon: 'wallet', href: 'encaissements.html', perm: 'encaissements.view' },
    ] },
    { section: 'Commercial', items: [
      { id: 'espace', label: 'Mon espace', icon: 'user-round', href: 'espace.html', perm: 'espace.view' },
      { id: 'crm', label: 'Clients (CRM)', icon: 'contact', href: 'crm.html', perm: 'crm.view', count: () => visibleClients().filter(c => c.relance && c.relance <= TODAY && (!myAgent() || c.agent === myAgent())).length || '' },
    ] },
    { section: 'Finance', items: [
      { id: 'agents', label: 'Performance agents', icon: 'trophy', href: 'agents.html', perm: 'agents.view' },
      { id: 'sponsoring', label: 'Sponsoring', icon: 'megaphone', href: 'sponsoring.html', perm: 'sponsoring.view' },
      { id: 'paie', label: 'Paie', icon: 'banknote', href: 'paie.html', perm: 'paie.view' },
      { id: 'rentabilite', label: 'Rentabilité', icon: 'line-chart', href: 'rentabilite.html', perm: 'rentabilite.view' },
    ] },
    { section: 'Clients', items: [
      { id: 'enquetes', label: 'Enquêtes clients', icon: 'message-square-heart', href: 'enquetes.html', perm: 'enquetes.view' },
    ] },
    { section: 'Administration', items: [
      { id: 'utilisateurs', label: 'Utilisateurs & rôles', icon: 'users-round', href: 'utilisateurs.html', perm: 'users.manage' },
      { id: 'parametres', label: 'Paramètres', icon: 'settings-2', href: 'parametres.html', perm: 'settings.manage' },
    ] },
  ];

  function sidebar(active) {
    const u = currentUser();
    const sections = NAV.map(sec => {
      const items = sec.items.filter(i => can(i.perm));
      if (!items.length) return '';
      return `<div class="mt-6 first:mt-0"><p class="px-3 mb-2 text-2xs font-semibold uppercase tracking-wider text-slate-500">${sec.section}</p><div class="space-y-0.5">${items.map(i => `
        <a href="${i.href}" class="nav-link ${i.id === active ? 'active' : ''}">${icon(i.icon)}<span class="flex-1">${i.label}</span>${i.count && i.count() ? `<span class="text-2xs tnum rounded-md ${i.id === 'crm' ? 'bg-amber-400/20 text-amber-200' : 'bg-white/10 text-slate-300'} px-1.5 py-0.5">${i.count()}</span>` : ''}${i.dot && i.dot() ? '<span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>' : ''}</a>`).join('')}</div></div>`;
    }).join('');
    return `
    <aside id="wk-side" class="fixed inset-y-0 left-0 z-40 w-[260px] bg-night-900 text-white flex flex-col -translate-x-full lg:translate-x-0 transition-transform">
      <a href="${home()}" class="h-16 flex items-center gap-3 px-5 border-b border-white/5">
        <img src="assets/logo.jpg" alt="" class="logo-img w-10 h-10">
        <div class="leading-tight"><p class="font-semibold text-[15px] tracking-tight">El Wakil <span class="text-brand-400">Immobilier</span></p><p class="text-2xs text-slate-400">Espace de gestion</p></div>
      </a>
      <nav class="flex-1 overflow-y-auto side-scroll px-3 py-5">${sections}
        <div class="mt-6"><a href="aide.html" class="nav-link ${active === 'aide' ? 'active' : ''}">${icon('life-buoy')}<span class="flex-1">Aide & guide</span></a></div></nav>
      <div class="p-3 border-t border-white/5">
        <div class="rounded-xl bg-white/[.04] p-3 flex items-center gap-3">
          ${avatar(u.nom, 'w-9 h-9 text-sm')}
          <div class="min-w-0 flex-1"><p class="text-sm font-medium truncate">${esc(u.nom)}</p><p class="text-2xs text-slate-400 truncate">${esc(currentRole().nom)}</p></div>
          <a href="index.html" title="Se déconnecter" class="text-slate-400 hover:text-white p-1">${icon('log-out', 'w-4 h-4')}</a>
        </div>
      </div>
    </aside>
    <div id="wk-side-ov" class="fixed inset-0 bg-black/40 z-30 hidden lg:hidden"></div>`;
  }

  function topbar(opts) {
    const r = currentRole();
    const notifs = [
      can('finance.view') ? ['alert-triangle', 'text-amber-600 bg-amber-50', `Fichier Excel : ${excelGap().n} RDV ignorés dans les totaux`, 'Les formules ne couvrent que les lignes 2 à 40.', 'dashboard.html#anomalies'] : null,
      myAgent() ? ['phone-call', 'text-amber-700 bg-amber-50', `${clients().filter(c => c.agent === myAgent() && c.relance && c.relance <= TODAY).length} relances clients à faire`, 'Retards et relances du jour', 'crm.html?mine=1'] : null,
      can('missions.manage') ? ['map-pinned', 'text-brand-700 bg-brand-50', `${missions(CUR_MONTH).filter(m => m.statut === 'À valider').length} missions hors wilaya à valider`, 'Détectées automatiquement depuis les RDV.', 'missions.html'] : null,
      can('paie.validate') ? ['banknote', 'text-emerald-700 bg-emerald-50', 'Paie de novembre prête à valider', 'Calcul automatique depuis les RDV et missions', 'paie.html'] : null,
      can('users.manage') ? ['user-plus', 'text-violet-700 bg-violet-50', 'Yasmine Tahri n\'a pas encore accepté l\'invitation', 'Envoyée il y a 2 jours', 'utilisateurs.html'] : null,
    ].filter(Boolean);
    return `
    <header class="sticky top-0 z-20 h-16 bg-white/85 backdrop-blur border-b border-slate-200/80">
      <div class="h-full px-3 sm:px-6 lg:px-8 flex items-center gap-1.5 sm:gap-3">
        <button id="wk-burger" class="hidden sm:inline-flex lg:hidden btn btn-ghost !p-2 -ml-2">${icon('menu', 'w-5 h-5')}</button>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1.5 text-xs text-slate-500 min-w-0"><span class="hidden sm:inline">${esc(opts.section || 'Opérations')}</span> <span class="hidden sm:inline">${icon('chevron-right', 'w-3 h-3')}</span> <span class="text-slate-700 font-medium truncate">${esc(opts.title)}</span></div>
        </div>
        <form id="wk-search" class="hidden md:flex items-center relative w-72">
          <span class="absolute left-3 text-slate-400">${icon('search', 'w-4 h-4')}</span>
          <input name="q" class="field !pl-9 !py-1.5 !bg-slate-50 !border-slate-200" placeholder="Rechercher un bien, un agent…">
          <kbd class="absolute right-2 text-2xs text-slate-400 border border-slate-200 rounded px-1.5 py-0.5 bg-white">⌘K</kbd>
        </form>
        <button id="wk-msearch" class="md:hidden btn btn-ghost !p-2" aria-label="Rechercher">${icon('search', 'w-5 h-5')}</button>
        <div class="relative">
          <button data-menu="wk-role-menu" class="flex items-center gap-2 rounded-lg border border-dashed border-amber-300 bg-amber-50/70 px-2.5 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-50">
            ${icon('eye', 'w-3.5 h-3.5')}<span class="hidden sm:inline">Aperçu :</span> <span class="max-w-[84px] sm:max-w-none truncate">${esc(r.nom)}</span> ${icon('chevrons-up-down', 'w-3.5 h-3.5 opacity-60')}
          </button>
          <div id="wk-role-menu" class="menu fixed sm:absolute inset-x-3 top-[60px] sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-72">
            <p class="px-2.5 pt-1.5 pb-2 text-2xs text-slate-500 leading-relaxed">Mode démo : voyez l'application telle que chaque rôle la voit.</p>
            ${roles().map(x => `<button data-role="${x.id}" class="menu-item ${x.id === r.id ? 'bg-slate-50' : ''}">${avatar(x.nom, 'w-6 h-6 text-2xs')}<span class="flex-1"><span class="block font-medium text-slate-800">${esc(x.nom)}</span><span class="block text-2xs text-slate-500">${x.perms.length} permissions</span></span>${x.id === r.id ? icon('check', 'w-4 h-4 !text-brand-700') : ''}</button>`).join('')}
          </div>
        </div>
        <button data-theme-toggle title="${isDark() ? 'Passer en mode clair' : 'Passer en mode sombre'}" class="btn btn-ghost !p-2">${icon(isDark() ? 'sun' : 'moon', 'w-5 h-5')}</button>
        <a href="aide.html${opts.help ? '#' + opts.help : ''}" title="Aide sur cette page" class="hidden sm:inline-flex btn btn-ghost !p-2">${icon('circle-help', 'w-5 h-5')}</a>
        <div class="relative">
          <button data-menu="wk-notif" class="btn btn-ghost !p-2 relative">${icon('bell', 'w-5 h-5')}${notifs.length ? '<span class="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white"></span>' : ''}</button>
          <div id="wk-notif" class="menu fixed sm:absolute inset-x-3 top-[60px] sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-[360px] !p-0">
            <div class="px-4 py-3 border-b border-slate-100 flex items-center justify-between"><p class="text-sm font-semibold">Notifications</p><span class="text-2xs text-slate-500">${notifs.length} nouvelles</span></div>
            <div class="py-1">${notifs.map(n => `<a href="${n[4]}" class="flex gap-3 px-4 py-3 hover:bg-slate-50"><span class="w-8 h-8 rounded-lg ${n[1]} flex items-center justify-center shrink-0">${icon(n[0], 'w-4 h-4')}</span><span class="min-w-0"><span class="block text-sm font-medium text-slate-800">${n[2]}</span><span class="block text-xs text-slate-500 mt-0.5">${n[3]}</span></span></a>`).join('') || '<p class="px-4 py-6 text-sm text-slate-500 text-center">Aucune notification</p>'}</div>
          </div>
        </div>
        ${opts.action || ''}
      </div>
    </header>`;
  }

  function denied(opts) {
    return `<div class="max-w-lg mx-auto mt-16 card p-10 text-center fade-in">
      <span class="mx-auto w-14 h-14 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mb-5">${icon('shield-off', 'w-7 h-7')}</span>
      <h1 class="text-lg font-semibold text-slate-900">Accès non autorisé</h1>
      <p class="text-sm text-slate-500 mt-2 leading-relaxed">Le rôle <b class="text-slate-700">${esc(currentRole().nom)}</b> n'a pas la permission « ${esc(permLabel(opts.perm))} ». Demandez à un administrateur de vous donner l'accès.</p>
      <div class="mt-6 flex justify-center gap-2"><a href="${home()}" class="btn btn-primary">${icon('arrow-left')} Retour à l'accueil</a></div>
    </div>`;
  }
  const permLabel = p => (PERMISSIONS.flatMap(g => g.items).find(i => i[0] === p) || [p, p])[1];

  /* ── Mobile : barre de navigation basse + actions rapides ── */
  const QUICK = [
    { perm: 'rdv.create', icon: 'calendar-plus', label: 'Nouveau rendez-vous', sub: 'Programmer une visite', href: 'rdv.html?new=1', tone: 'bg-brand-50 text-brand-800' },
    { perm: 'crm.create', icon: 'user-plus', label: 'Nouveau client', sub: 'Acheteur, vendeur, locataire…', href: 'crm.html?new=1', tone: 'bg-emerald-50 text-emerald-700' },
    { perm: 'missions.manage', icon: 'map-pinned', label: 'Déclarer une mission', sub: 'Déplacement hors wilaya', href: 'missions.html?new=1', tone: 'bg-violet-50 text-violet-700' },
    { perm: 'encaissements.create', icon: 'wallet', label: 'Nouveau versement CCP', sub: 'Avec photo du reçu', href: 'encaissements.html?new=1', tone: 'bg-sky-50 text-sky-700' },
  ];
  function bottomNav(active) {
    const all = NAV.flatMap(s => s.items).filter(i => can(i.perm));
    const homeId = can('dashboard.view') ? 'dashboard' : can('espace.view') ? 'espace' : null;
    const pick = [];
    const home = all.find(i => i.id === homeId); if (home) pick.push({ ...home, label: 'Accueil', icon: homeId === 'espace' ? 'user-round' : 'house' });
    ['rdv', 'crm', 'missions', 'espace', 'encaissements', 'agents'].forEach(id => { const it = all.find(i => i.id === id); if (it && pick.length < 3 && !pick.some(p => p.id === id)) pick.push(it); });
    const short = { rdv: 'RDV', crm: 'Clients', missions: 'Terrain', espace: 'Mon espace', encaissements: 'CCP', agents: 'Agents' };
    const hasQuick = QUICK.some(q => can(q.perm));
    const item = i => `<a href="${i.href}" class="bnav-item ${i.id === active ? 'on' : ''}">${icon(i.icon, 'w-[22px] h-[22px]')}<span>${i.id === homeId ? 'Accueil' : short[i.id] || i.label}</span>${i.count && i.count() && i.id === 'crm' ? `<b class="bnav-badge">${i.count()}</b>` : ''}</a>`;
    const left = pick.slice(0, 2), right = pick.slice(2, 3);
    return `<nav class="bnav lg:hidden" aria-label="Navigation principale">
      ${left.map(item).join('')}
      ${hasQuick ? `<button id="wk-quick" class="bnav-fab" aria-label="Actions rapides">${icon('plus', 'w-6 h-6')}</button>` : `<button id="wk-msearch2" class="bnav-item">${icon('search', 'w-[22px] h-[22px]')}<span>Rechercher</span></button>`}
      ${right.map(item).join('')}
      <button id="wk-more" class="bnav-item">${icon('layout-grid', 'w-[22px] h-[22px]')}<span>Menu</span></button>
    </nav>`;
  }
  function quickSheet() {
    const Q = QUICK.filter(q => can(q.perm));
    const p = openPanel(`<div class="sheet-handle"></div>
      <div class="px-5 pt-2 pb-6">
        <form id="qs" class="relative">${icon('search', 'w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400')}<input name="q" class="field !pl-11 !py-3 !text-base" placeholder="Rechercher un bien, une commune, un agent…" enterkeyhint="search"></form>
        ${Q.length ? `<p class="mt-5 mb-2 text-2xs font-semibold uppercase tracking-wider text-slate-400">Actions rapides</p>
        <div class="space-y-1.5">${Q.map(q => `<a href="${q.href}" class="flex items-center gap-3.5 rounded-xl p-3 hover:bg-slate-50 active:bg-slate-100"><span class="w-11 h-11 rounded-xl ${q.tone} flex items-center justify-center">${icon(q.icon, 'w-5 h-5')}</span><span class="flex-1"><span class="block text-[15px] font-medium text-slate-900">${q.label}</span><span class="block text-xs text-slate-500">${q.sub}</span></span>${icon('chevron-right', 'w-4 h-4 text-slate-300')}</a>`).join('')}</div>` : ''}
      </div>`, { kind: 'modal sheet', width: '520px' });
    const f = $('#qs', p);
    f.onsubmit = e => { e.preventDefault(); const q = f.q.value.trim(); location.href = 'rdv.html' + (q ? '?q=' + encodeURIComponent(q) : ''); };
  }

  function mount(opts, init) {
    chartDefaults();
    const page = $('#page');
    const content = page ? page.innerHTML : '';
    if (page) page.remove();
    const ok = !opts.perm || can(opts.perm);
    document.body.insertAdjacentHTML('afterbegin', `${sidebar(opts.id)}
      <div class="lg:pl-[260px] min-h-screen flex flex-col min-w-0 overflow-x-clip">
        ${topbar(opts)}
        <main id="wk-main" class="flex-1 px-4 sm:px-6 lg:px-8 pt-5 pb-28 sm:py-6 lg:py-8">${ok ? `<div class="max-w-[1400px] mx-auto fade-in">${content}</div>` : denied(opts)}</main>
      </div>
      ${bottomNav(opts.id)}`);
    $('#wk-quick') && ($('#wk-quick').onclick = quickSheet);
    ['#wk-msearch', '#wk-msearch2'].forEach(id => $(id) && ($(id).onclick = quickSheet));
    $('#wk-more') && ($('#wk-more').onclick = () => { $('#wk-side').classList.remove('-translate-x-full'); $('#wk-side-ov').classList.remove('hidden'); });
    // role switch
    $$('[data-role]').forEach(b => b.onclick = () => { store.set('role', b.dataset.role); location.reload(); });
    // mobile
    const side = $('#wk-side'), sov = $('#wk-side-ov');
    $('#wk-burger').onclick = () => { side.classList.remove('-translate-x-full'); sov.classList.remove('hidden'); };
    sov.onclick = () => { side.classList.add('-translate-x-full'); sov.classList.add('hidden'); };
    // search
    const sf = $('#wk-search');
    if (sf) sf.onsubmit = e => { e.preventDefault(); const q = sf.q.value.trim(); location.href = 'rdv.html' + (q ? '?q=' + encodeURIComponent(q) : ''); };
    document.addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); sf && sf.q.focus(); } });
    // permission-gated elements
    $$('[data-perm]').forEach(el => { if (!el.dataset.perm.split('|').some(can)) el.classList.add('is-hidden'); });
    $$('[data-noperm]').forEach(el => { if (can(el.dataset.noperm)) el.classList.add('is-hidden'); });
    if (ok && init) init();
    refreshIcons();
  }

  window.WK = {
    D, TODAY, CUR_MONTH, store, SEED_MISSIONS, PERMISSIONS, ALL_PERMS, DEFAULT_ROLES, DEFAULT_USERS, DEFAULT_SETTINGS, DEFAULT_TEAM,
    settings, team, roles, users, currentRole, currentRoleId, currentUser, can, permLabel,
    rdvs, byMonth, sum, months, STAGES, clients, saveClients, myAgent, visibleClients, canSeePhone, maskPhone, canEditClient, canMoveClient, home, excelGap, sponsoring, ccp, agentStats, missions, missionTotal, fieldStats, monthly,
    fmt, $, $$, esc, icon, refreshIcons, avatar, badge, roleBadge, TYPE_ICON, delta, toast, openPanel, closePanel, panelHead, seg,
    exportCSV, audit, lockedBlock, C, mount, MOIS, JOURS, isDark, setTheme,
  };
})();
