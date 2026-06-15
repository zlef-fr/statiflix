/* Statiflix — background service worker.
 * Intentionally minimal: all heavy lifting (harvest, stats, encryption) happens in
 * the content script / dashboard. We only open the dashboard on toolbar-icon use
 * when there is no popup context, and keep the worker alive long enough to relay
 * nothing. No network, no analytics here. */
'use strict';

chrome.runtime.onInstalled.addListener((d) => {
  if (d.reason === 'install') {
    // First install: drop the user on Netflix's activity page so the popup works.
    chrome.tabs.create({ url: 'https://statiflix.zlef.fr/?installed=1' });
  }
});
