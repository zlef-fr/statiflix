/* Statiflix — mobile sync (E2EE hand-off).
 * Encrypts the current Stats snapshot in the browser, uploads only the ciphertext
 * to the relay, and renders a QR whose fragment carries the decryption key. The
 * key never reaches the server. Scanning opens statiflix.zlef.fr/app#<id>.<key>. */
(function (root) {
  'use strict';
  const RELAY = 'https://statiflix.zlef.fr/api/sync';
  const VIEWER = 'https://statiflix.zlef.fr/app/';

  // snapshotFn: () => snapshot object (stats + meta). Called when modal opens.
  function wire(modalEls, snapshotFn) {
    const { modal, qrBox, status, copyBtn, closeBtn } = modalEls;
    const t = (k, v) => root.STX_I18N.t(k, v);
    let lastUrl = null;

    function close() { modal.classList.add('hidden'); qrBox.textContent = ''; status.textContent = ''; status.className = 'sync-status'; }
    closeBtn.addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    copyBtn.addEventListener('click', () => {
      if (!lastUrl) return;
      navigator.clipboard.writeText(lastUrl).then(() => {
        copyBtn.textContent = t('sync.copied');
        setTimeout(() => (copyBtn.textContent = t('sync.copy')), 1500);
      });
    });

    async function open() {
      modal.classList.remove('hidden');
      qrBox.textContent = '';
      status.className = 'sync-status';
      status.textContent = t('sync.encrypting');
      lastUrl = null;
      try {
        const snap = snapshotFn();
        const { keyStr, blob } = await root.STX_CRYPTO.encrypt(snap);
        const r = await fetch(RELAY, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ blob }),
        });
        if (!r.ok) throw new Error('relay');
        const { id } = await r.json();
        if (!id) throw new Error('relay');
        const url = `${VIEWER}#${id}.${keyStr}`;
        lastUrl = url;
        status.textContent = '';
        const canvas = document.createElement('canvas');
        await root.QRCode.toCanvas(canvas, url, { width: 196, margin: 1, color: { dark: '#141414', light: '#ffffff' } });
        qrBox.appendChild(canvas);
      } catch (e) {
        status.className = 'sync-status err';
        status.textContent = t('sync.failed');
      }
    }

    return { open, close };
  }

  root.STX_SYNC = { wire };
})(typeof window !== 'undefined' ? window : this);
