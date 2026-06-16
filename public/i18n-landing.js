/* Statiflix landing — self-contained i18n + the hero artwork. Shares the language
 * preference key ('statiflix.lang') with the app so the choice carries across. */
(function () {
  'use strict';
  const DICT = {
    en: {
      'nav.how': 'How it works', 'nav.privacy': 'Privacy', 'nav.install': 'Add to Chrome',
      'hero.kicker': 'Spotify Wrapped for your streaming',
      'hero.title': 'Your Netflix viewing,<br><span class="hl">finally visible.</span>',
      'hero.lead': 'Statiflix turns your watch history into a private dashboard — rewatches, abandoned shows, your real binge hours, and the genres you actually watch. Nothing ever leaves your browser.',
      'hero.cta': 'Add to Chrome — free', 'hero.cta2': 'See how it works',
      'hero.micro': '100% local · no account · open source · not affiliated with Netflix',
      'strip.s1n': '0', 'strip.s1': 'data sent to a server',
      'strip.s2n': '7×24', 'strip.s2': 'day × hour heatmap',
      'strip.s3n': 'E2EE', 'strip.s3': 'mobile sync via QR',
      'strip.s4n': '∞', 'strip.s4': 'years of history',
      'feat.1t': 'See what Netflix hides', 'feat.1b': 'Rewatch counts, abandonment rate, total hours and your most-watched titles — the numbers Netflix collects but never shows you.',
      'feat.2t': 'Private by architecture', 'feat.2b': 'All parsing happens locally in your browser. No account, no tracking, no server ever sees your history in readable form.',
      'feat.3t': 'Your real rhythm', 'feat.3b': 'A day-by-hour heatmap reveals the 1am binges and weekend marathons you didn’t realise were a pattern.',
      'feat.4t': 'On your phone, encrypted', 'feat.4b': 'Scan one QR code to open the full dashboard on mobile — end-to-end encrypted, the key never touches our server.',
      'how.title': 'Three taps to your Wrapped',
      'how.1t': 'Install & open Netflix', 'how.1b': 'Add the extension and open netflix.com while signed in. Statiflix reads your own viewing-activity using your existing session.',
      'how.2t': 'Analyze locally', 'how.2b': 'Click “Analyze my history”. Everything is computed on your machine — totals, rewatches, heatmaps and drill-downs into the actual titles.',
      'how.3t': 'Sync to your phone', 'how.3b': 'Optionally scan a QR code to view a poster-rich, encrypted snapshot on mobile, or export a shareable recap card.',
      'priv.title': 'Privacy isn’t a feature. It’s the architecture.',
      'priv.lead': 'Statiflix was built so that your viewing history is yours alone. The mobile sync is end-to-end encrypted — our relay only ever stores ciphertext it cannot read.',
      'priv.1': 'History parsed 100% in your browser', 'priv.2': 'No account, no email, no login',
      'priv.3': 'AES-256 encryption, key only in the QR', 'priv.4': 'Open source — audit every line',
      'get.title': 'Get Statiflix', 'get.lead': 'Free and open source — now on the Chrome Web Store. One click and you’re set:',
      'get.download': 'Add to Chrome — free',
      'get.s1': 'Click <b>Add to Chrome</b> and confirm the install.',
      'get.s2': 'Open <b>netflix.com</b> while signed in.',
      'get.s3': 'Click the <b>Statiflix</b> icon, then <b>Analyze my history</b>.',
      'get.s4': 'Optionally scan the QR code to open your encrypted dashboard on your phone.',
      'get.src': 'Prefer to build from source? It’s open on <a href="https://github.com/zlef-fr/statiflix" target="_blank" rel="noopener">GitHub</a>.',
      'foot.made': 'A free, open-source tool by Claude on zlef.fr. Not affiliated with, or endorsed by, Netflix.',
    },
    fr: {
      'nav.how': 'Comment ça marche', 'nav.privacy': 'Confidentialité', 'nav.install': 'Ajouter à Chrome',
      'hero.kicker': 'Le Spotify Wrapped de vos séries',
      'hero.title': 'Votre Netflix,<br><span class="hl">enfin visible.</span>',
      'hero.lead': 'Statiflix transforme votre historique en tableau de bord privé — re-visionnages, séries abandonnées, vraies heures de binge et les genres que vous regardez vraiment. Rien ne quitte votre navigateur.',
      'hero.cta': 'Ajouter à Chrome — gratuit', 'hero.cta2': 'Voir comment ça marche',
      'hero.micro': '100% local · sans compte · open source · sans lien avec Netflix',
      'strip.s1n': '0', 'strip.s1': 'donnée envoyée à un serveur',
      'strip.s2n': '7×24', 'strip.s2': 'carte jour × heure',
      'strip.s3n': 'E2EE', 'strip.s3': 'sync mobile par QR',
      'strip.s4n': '∞', 'strip.s4': 'années d’historique',
      'feat.1t': 'Ce que Netflix vous cache', 'feat.1b': 'Nombre de re-visionnages, taux d’abandon, heures totales et titres les plus vus — les chiffres que Netflix collecte mais ne vous montre jamais.',
      'feat.2t': 'Privé par conception', 'feat.2b': 'Toute l’analyse se fait localement dans votre navigateur. Aucun compte, aucun tracking, aucun serveur ne voit votre historique en clair.',
      'feat.3t': 'Votre vrai rythme', 'feat.3b': 'Une carte jour-par-heure révèle les binges de 1h du matin et les marathons du week-end que vous ne soupçonniez pas.',
      'feat.4t': 'Sur votre mobile, chiffré', 'feat.4b': 'Scannez un QR code pour ouvrir le tableau de bord complet sur mobile — chiffré de bout en bout, la clé ne touche jamais notre serveur.',
      'how.title': 'Votre Wrapped en trois clics',
      'how.1t': 'Installez & ouvrez Netflix', 'how.1b': 'Ajoutez l’extension et ouvrez netflix.com en étant connecté. Statiflix lit votre propre historique via votre session existante.',
      'how.2t': 'Analyse locale', 'how.2b': 'Cliquez sur « Analyser mon historique ». Tout est calculé sur votre machine — totaux, re-visionnages, cartes de chaleur et détail des titres.',
      'how.3t': 'Sync vers le mobile', 'how.3b': 'Scannez un QR code pour voir un aperçu chiffré et illustré sur mobile, ou exportez une carte récap à partager.',
      'priv.title': 'La confidentialité n’est pas une option. C’est l’architecture.',
      'priv.lead': 'Statiflix est conçu pour que votre historique reste le vôtre. La sync mobile est chiffrée de bout en bout — notre relais ne stocke que du chiffré illisible.',
      'priv.1': 'Historique analysé 100% dans le navigateur', 'priv.2': 'Aucun compte, e-mail ou identifiant',
      'priv.3': 'Chiffrement AES-256, clé uniquement dans le QR', 'priv.4': 'Open source — auditez chaque ligne',
      'get.title': 'Obtenir Statiflix', 'get.lead': 'Gratuit et open source — désormais sur le Chrome Web Store. Un clic et c’est prêt :',
      'get.download': 'Ajouter à Chrome — gratuit',
      'get.s1': 'Cliquez sur <b>Ajouter à Chrome</b> et confirmez l’installation.',
      'get.s2': 'Ouvrez <b>netflix.com</b> en étant connecté.',
      'get.s3': 'Cliquez sur l’icône <b>Statiflix</b>, puis <b>Analyser mon historique</b>.',
      'get.s4': 'Scannez le QR code pour ouvrir votre tableau de bord chiffré sur votre téléphone.',
      'get.src': 'Vous préférez compiler depuis les sources ? C’est ouvert sur <a href="https://github.com/zlef-fr/statiflix" target="_blank" rel="noopener">GitHub</a>.',
      'foot.made': 'Outil libre et gratuit par Claude sur zlef.fr. Sans lien avec Netflix, ni approuvé par Netflix.',
    },
  };
  // da.zlef.fr i18n convention: two locales → NO selector, silent detection.
  // Sitewide `zl-lang` cookie (.zlef.fr) → browser language → en.
  const lang = (function () {
    try { const m = document.cookie.match('(?:^|; )zl-lang=([^;]*)'); const c = m && decodeURIComponent(m[1]); if (c && DICT[c]) return c; } catch (_) {}
    for (const l of (navigator.languages || [navigator.language || 'en'])) { const c = String(l).slice(0, 2).toLowerCase(); if (DICT[c]) return c; }
    return 'en';
  })();
  const t = (k) => (DICT[lang] && DICT[lang][k]) || DICT.en[k] || k;
  function apply() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach((e) => (e.textContent = t(e.getAttribute('data-i18n'))));
    document.querySelectorAll('[data-i18n-html]').forEach((e) => (e.innerHTML = t(e.getAttribute('data-i18n-html'))));
  }

  // Hero artwork: a faithful mini-dashboard in a phone frame (Netflix-themed).
  function heroArt() {
    const wrap = document.getElementById('heroArt');
    wrap.innerHTML = [
      '<div class="phone">',
      '  <div class="notch"></div>',
      '  <div class="screen">',
      '    <div class="p-brand">STATI<span>FLIX</span></div>',
      '    <div class="p-sub">2025 · Alex</div>',
      '    <div class="p-kpis">',
      '      <div><b>312<i>h</i></b><span>watched</span></div>',
      '      <div><b>48</b><span>rewatched</span></div>',
      '      <div><b>23</b><span>abandoned</span></div>',
      '      <div><b>11pm</b><span>peak</span></div>',
      '    </div>',
      '    <div class="p-label">Most watched</div>',
      '    <div class="p-rail">' + ['#3a1c1c,#7a2b2b', '#1c2a3a,#2b5a7a', '#2a1c3a,#5a2b7a', '#1c3a2a,#2b7a4a'].map((g) => '<div class="p-poster" style="background:linear-gradient(135deg,' + g + ')"></div>').join('') + '</div>',
      '    <div class="p-label">When you watch</div>',
      '    <div class="p-heat">' + heatCells() + '</div>',
      '  </div>',
      '</div>',
    ].join('');
  }
  function heatCells() {
    let out = '';
    for (let r = 0; r < 4; r++) { out += '<div class="p-heat-row">'; for (let c = 0; c < 8; c++) { const a = Math.min(1, (Math.sin(r * 1.3 + c * 0.9) * 0.5 + 0.5) * (c / 7 + 0.3)); out += '<i style="background:rgba(229,9,20,' + (0.12 + a * 0.85).toFixed(2) + ')"></i>'; } out += '</div>'; }
    return out;
  }

  apply();
  heroArt();
})();
