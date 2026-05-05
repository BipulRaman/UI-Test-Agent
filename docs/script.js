/* UI Test Agent — landing page interactivity (vanilla, no deps) */
(function () {
  'use strict';

  const $  = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  /* -------- Theme toggle (with localStorage) -------- */
  const root = document.documentElement;
  const themeBtn = $('#themeToggle');
  const STORAGE_KEY = 'uita-theme';

  const stored = (() => {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
  })();
  if (stored === 'dark' || stored === 'light') {
    root.setAttribute('data-theme', stored);
  }

  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const current = root.getAttribute('data-theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = current ? current === 'dark' : prefersDark;
      const next = isDark ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
    });
  }

  /* -------- Mobile nav toggle -------- */
  const burger = $('#hamburger');
  const nav = $('.primary-nav');
  if (burger && nav) {
    burger.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', String(open));
    });
    nav.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') {
        nav.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* -------- Quick-start code tabs -------- */
  const tabs = $$('.code-tab');
  const panels = $$('.code-block[role="tabpanel"]');
  function activateTab(tab) {
    const targetId = tab.dataset.target;
    tabs.forEach(t => {
      const active = t === tab;
      t.classList.toggle('is-active', active);
      t.setAttribute('aria-selected', String(active));
    });
    panels.forEach(p => {
      const show = p.id === targetId;
      p.classList.toggle('is-active', show);
      if (show) { p.removeAttribute('hidden'); } else { p.setAttribute('hidden', ''); }
    });
  }
  tabs.forEach(t => t.addEventListener('click', () => activateTab(t)));

  /* -------- Copy buttons -------- */
  $$('.copy-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const codeEl = btn.parentElement && btn.parentElement.querySelector('code');
      if (!codeEl) return;
      const text = codeEl.textContent || '';
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        // Fallback for older browsers / non-secure contexts
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'absolute';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch { /* ignore */ }
        document.body.removeChild(ta);
      }
      const original = btn.textContent;
      btn.textContent = 'Copied!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = original;
        btn.classList.remove('copied');
      }, 1500);
    });
  });

  /* -------- Footer year -------- */
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();
