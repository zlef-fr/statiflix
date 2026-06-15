/* Statiflix — i18n (English default + French).
 * Language is auto-detected from the browser, switchable in-app, and persisted.
 * English is the fallback for any missing key. Same dictionary is shared by the
 * extension popup, the dashboard, and the mobile PWA. */
(function (root) {
  'use strict';

  const DICT = {
    en: {
      // popup
      'app.name': 'Statiflix',
      'app.tagline': 'Your Netflix viewing, quantified.',
      'popup.intro': 'Build a private, Wrapped-style dashboard from your Netflix history. Nothing leaves this browser.',
      'popup.analyze': 'Analyze my history',
      'popup.open': 'Open dashboard',
      'popup.refresh': 'Refresh data',
      'popup.go_netflix': 'Open Netflix first',
      'popup.go_netflix_hint': 'You need an open netflix.com tab while signed in.',
      'popup.fetching': 'Reading your history…',
      'popup.fetched_items': '{n} entries',
      'popup.last_sync': 'Last updated {when}',
      'popup.never': 'never',
      'popup.err_login': 'You appear to be signed out of Netflix. Sign in and try again.',
      'popup.err_generic': 'Could not read your history. Open a netflix.com tab and retry.',
      'popup.private': '100% local · no account · no tracking',
      'load.history': 'Reading your history… {done} / {total}',
      'load.meta': 'Fetching runtimes… {done} / {total}',
      'load.art': 'Fetching artwork… {done} / {total}',
      'load.starting': 'Opening Netflix…',
      'err.login_title': 'Sign in to Netflix',
      'err.login_body': 'Open netflix.com, sign in to your profile, then try again.',
      'err.empty_title': 'No history found',
      'err.empty_body': 'This Netflix profile has no viewing activity yet.',
      'err.api_title': 'Netflix changed something',
      'err.api_body': 'Statiflix couldn’t read the history feed. Netflix may have updated its site — try again later.',
      'err.generic_title': 'Something went wrong',
      'err.generic_body': 'Could not read your history. Make sure you’re signed in to Netflix and try again.',
      // dashboard chrome
      'dash.title': 'Statiflix',
      'dash.overview': '{year} overview',
      'dash.all_years': 'All time',
      'dash.export': 'Export',
      'dash.sync': 'Sync to phone',
      'dash.empty_title': 'No data yet',
      'dash.empty_body': 'Open the Statiflix popup on a netflix.com tab and hit “Analyze my history”.',
      'dash.profile': 'Profile',
      // stat cards
      'stat.hours': 'Hours watched',
      'stat.titles': 'Titles',
      'stat.episodes': 'Episodes',
      'stat.movies': 'Movies',
      'stat.rewatched': 'Rewatched',
      'stat.abandoned': 'Abandoned',
      'stat.peak_hour': 'Peak hour',
      'stat.peak_day': 'Peak day',
      'stat.longest_binge': 'Longest binge',
      'stat.streak': 'Longest streak',
      'stat.days': 'days',
      'stat.titles_unit': 'titles',
      'stat.shows_unit': 'shows',
      'stat.hours_unit': 'h',
      // sections
      'sec.when': 'When you watch',
      'sec.when_sub': 'day × hour',
      'sec.top': 'Most watched',
      'sec.rewatched': 'Most rewatched',
      'sec.rewatched_sub': 'comfort viewing',
      'sec.abandoned': 'Abandoned',
      'sec.abandoned_sub': 'shows you quit',
      'sec.genres': 'Top genres',
      'sec.byday': 'By weekday',
      'sec.bymonth': 'Across the year',
      'sec.binge': 'Biggest binge day',
      // misc labels
      'label.episodes_n': '{n} episodes',
      'label.times_n': '{n}×',
      'label.quit_after': 'quit after {ep}',
      'label.ep_n': 'ep. {n}',
      'label.eps_of': '{n} of {total} episodes',
      'label.pct_watched': 'stopped at {pct}%',
      'label.hours_n': '{n}h',
      'label.min_n': '{n} min',
      'label.of_comfort': '{h} of re-runs',
      'label.genres_off': 'Enable genre enrichment to see your taste breakdown.',
      'label.genres_loading': 'Looking up genres…',
      'label.movie': 'Movie',
      'label.series': 'Series',
      'label.no_items': 'Nothing here.',
      'days.short': 'Mon,Tue,Wed,Thu,Fri,Sat,Sun',
      'months.short': 'Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec',
      // sync modal
      'sync.title': 'Open on your phone',
      'sync.body': 'Scan with your phone camera. Your stats are end-to-end encrypted — the key lives only in this QR code, never on our server.',
      'sync.encrypting': 'Encrypting…',
      'sync.expires': 'Link expires in 24h.',
      'sync.copy': 'Copy link',
      'sync.copied': 'Copied!',
      'sync.failed': 'Sync failed. Try again.',
      'sync.close': 'Close',
      // export
      'export.json': 'Download JSON',
      'export.csv': 'Download CSV',
      'export.recap': 'Share card (PNG)',
      // pwa
      'pwa.title': 'Statiflix',
      'pwa.loading': 'Decrypting your stats…',
      'pwa.error': 'Could not load these stats. The link may have expired.',
      'pwa.secured': 'End-to-end encrypted · decrypted on your device',
      'pwa.rescan': 'Scan a new code',
      'pwa.install': 'Add to Home Screen',
      // landing (selected keys; landing also has inline copy)
      'nav.how': 'How it works',
      'nav.privacy': 'Privacy',
      'nav.install': 'Add to Chrome',
      'foot.made': 'A free, open-source tool. Not affiliated with Netflix.',
    },
    fr: {
      'app.name': 'Statiflix',
      'app.tagline': 'Votre Netflix, en chiffres.',
      'popup.intro': 'Créez un tableau de bord privé, façon Wrapped, à partir de votre historique Netflix. Rien ne quitte ce navigateur.',
      'popup.analyze': 'Analyser mon historique',
      'popup.open': 'Ouvrir le tableau de bord',
      'popup.refresh': 'Actualiser les données',
      'popup.go_netflix': 'Ouvrez d’abord Netflix',
      'popup.go_netflix_hint': 'Il faut un onglet netflix.com ouvert et connecté.',
      'popup.fetching': 'Lecture de votre historique…',
      'popup.fetched_items': '{n} entrées',
      'popup.last_sync': 'Mis à jour {when}',
      'popup.never': 'jamais',
      'popup.err_login': 'Vous semblez déconnecté de Netflix. Connectez-vous et réessayez.',
      'popup.err_generic': 'Lecture impossible. Ouvrez un onglet netflix.com et réessayez.',
      'popup.private': '100% local · sans compte · sans tracking',
      'load.history': 'Lecture de votre historique… {done} / {total}',
      'load.meta': 'Récupération des durées… {done} / {total}',
      'load.art': 'Récupération des visuels… {done} / {total}',
      'load.starting': 'Ouverture de Netflix…',
      'err.login_title': 'Connectez-vous à Netflix',
      'err.login_body': 'Ouvrez netflix.com, connectez-vous à votre profil, puis réessayez.',
      'err.empty_title': 'Aucun historique',
      'err.empty_body': 'Ce profil Netflix n’a pas encore d’activité de visionnage.',
      'err.api_title': 'Netflix a changé quelque chose',
      'err.api_body': 'Statiflix n’a pas pu lire l’historique. Netflix a peut-être mis à jour son site — réessayez plus tard.',
      'err.generic_title': 'Une erreur est survenue',
      'err.generic_body': 'Lecture impossible. Vérifiez que vous êtes connecté à Netflix et réessayez.',
      'dash.title': 'Statiflix',
      'dash.overview': 'Aperçu {year}',
      'dash.all_years': 'Depuis le début',
      'dash.export': 'Exporter',
      'dash.sync': 'Envoyer au mobile',
      'dash.empty_title': 'Aucune donnée',
      'dash.empty_body': 'Ouvrez le popup Statiflix sur un onglet netflix.com puis « Analyser mon historique ».',
      'dash.profile': 'Profil',
      'stat.hours': 'Heures vues',
      'stat.titles': 'Titres',
      'stat.episodes': 'Épisodes',
      'stat.movies': 'Films',
      'stat.rewatched': 'Revus',
      'stat.abandoned': 'Abandonnés',
      'stat.peak_hour': 'Heure de pointe',
      'stat.peak_day': 'Jour de pointe',
      'stat.longest_binge': 'Plus gros binge',
      'stat.streak': 'Plus longue série',
      'stat.days': 'jours',
      'stat.titles_unit': 'titres',
      'stat.shows_unit': 'séries',
      'stat.hours_unit': 'h',
      'sec.when': 'Quand vous regardez',
      'sec.when_sub': 'jour × heure',
      'sec.top': 'Les plus vus',
      'sec.rewatched': 'Les plus revus',
      'sec.rewatched_sub': 'doudou télé',
      'sec.abandoned': 'Abandonnés',
      'sec.abandoned_sub': 'séries lâchées',
      'sec.genres': 'Genres préférés',
      'sec.byday': 'Par jour',
      'sec.bymonth': 'Sur l’année',
      'sec.binge': 'Journée la plus chargée',
      'label.episodes_n': '{n} épisodes',
      'label.times_n': '{n}×',
      'label.quit_after': 'lâché après {ep}',
      'label.ep_n': 'ép. {n}',
      'label.eps_of': '{n} sur {total} épisodes',
      'label.pct_watched': 'arrêté à {pct} %',
      'label.hours_n': '{n} h',
      'label.min_n': '{n} min',
      'label.of_comfort': '{h} de re-visionnage',
      'label.genres_off': 'Activez l’enrichissement des genres pour voir vos goûts.',
      'label.genres_loading': 'Recherche des genres…',
      'label.movie': 'Film',
      'label.series': 'Série',
      'label.no_items': 'Rien ici.',
      'days.short': 'Lun,Mar,Mer,Jeu,Ven,Sam,Dim',
      'months.short': 'Jan,Fév,Mar,Avr,Mai,Juin,Juil,Aoû,Sep,Oct,Nov,Déc',
      'sync.title': 'Ouvrir sur votre téléphone',
      'sync.body': 'Scannez avec l’appareil photo. Vos stats sont chiffrées de bout en bout — la clé n’existe que dans ce QR code, jamais sur notre serveur.',
      'sync.encrypting': 'Chiffrement…',
      'sync.expires': 'Le lien expire dans 24 h.',
      'sync.copy': 'Copier le lien',
      'sync.copied': 'Copié !',
      'sync.failed': 'Échec de l’envoi. Réessayez.',
      'sync.close': 'Fermer',
      'export.json': 'Télécharger JSON',
      'export.csv': 'Télécharger CSV',
      'export.recap': 'Carte à partager (PNG)',
      'pwa.title': 'Statiflix',
      'pwa.loading': 'Déchiffrement de vos stats…',
      'pwa.error': 'Chargement impossible. Le lien a peut-être expiré.',
      'pwa.secured': 'Chiffré de bout en bout · déchiffré sur votre appareil',
      'pwa.rescan': 'Scanner un nouveau code',
      'pwa.install': 'Ajouter à l’écran d’accueil',
      'nav.how': 'Comment ça marche',
      'nav.privacy': 'Confidentialité',
      'nav.install': 'Ajouter à Chrome',
      'foot.made': 'Outil libre et gratuit. Sans lien avec Netflix.',
    },
  };

  // da.zlef.fr convention: sitewide language lives in the `zl-lang` cookie scoped
  // to .zlef.fr (shared across every property). Resolution: cookie → browser → en.
  // (On the chrome-extension origin there is no such cookie, so it falls to the
  // browser language — a silent, selector-free choice, per the two-locale rule.)
  function readCookie(name) {
    try { const m = document.cookie.match('(?:^|; )' + name + '=([^;]*)'); return m ? decodeURIComponent(m[1]) : null; }
    catch (_) { return null; }
  }
  function detect() {
    const c = readCookie('zl-lang'); if (c && DICT[c]) return c;
    const nav = (navigator.languages || [navigator.language || 'en']);
    for (const l of nav) { const x = String(l).slice(0, 2).toLowerCase(); if (DICT[x]) return x; }
    return 'en';
  }

  let lang = detect();

  function t(key, vars) {
    let s = (DICT[lang] && DICT[lang][key]) || DICT.en[key] || key;
    if (vars) for (const k in vars) s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]);
    return s;
  }
  function getLang() { return lang; }
  function setLang(l) {
    if (!DICT[l]) return;
    lang = l;
    // Persist sitewide so the choice follows the visitor across *.zlef.fr.
    try { document.cookie = 'zl-lang=' + l + '; domain=.zlef.fr; path=/; max-age=31536000; samesite=lax'; } catch (_) {}
    applyDOM(document);
    if (typeof root.onLangChange === 'function') root.onLangChange(l);
  }
  function list(key) { return t(key).split(','); } // for days/months
  // Apply translations to any element carrying data-i18n / data-i18n-attr.
  function applyDOM(scope) {
    (scope || document).querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    (scope || document).querySelectorAll('[data-i18n-html]').forEach((el) => {
      el.innerHTML = t(el.getAttribute('data-i18n-html'));
    });
    (scope || document).querySelectorAll('[data-i18n-attr]').forEach((el) => {
      el.getAttribute('data-i18n-attr').split(';').forEach((pair) => {
        const [attr, key] = pair.split(':');
        if (attr && key) el.setAttribute(attr.trim(), t(key.trim()));
      });
    });
    try { document.documentElement.lang = lang; } catch (_) {}
  }

  root.STX_I18N = { t, getLang, setLang, list, applyDOM, langs: Object.keys(DICT) };
})(typeof window !== 'undefined' ? window : this);
