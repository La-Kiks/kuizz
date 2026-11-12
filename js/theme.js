// Choix du thème clair / sombre. Logique pure (testée) + initialisation du bouton.
export const THEME_KEY = 'kuizz:theme';
export const LABELS = {
  dark: 'Passer au thème sombre',
  light: 'Passer au thème clair',
};
export const ANNOUNCEMENTS = {
  dark: 'Thème sombre activé',
  light: 'Thème clair activé',
};

/** Valeur stockée → 'light' | 'dark' | null (toute valeur invalide est ignorée). */
export function parseStoredTheme(value) {
  return value === 'light' || value === 'dark' ? value : null;
}

/** Thème effectivement affiché : choix enregistré, sinon préférence système. */
export function resolveTheme(stored, systemPrefersDark) {
  return parseStoredTheme(stored) ?? (systemPrefersDark ? 'dark' : 'light');
}

export function nextTheme(current) {
  return current === 'dark' ? 'light' : 'dark';
}

function readStored() {
  try { return parseStoredTheme(localStorage.getItem(THEME_KEY)); } catch { return null; }
}

function writeStored(theme) {
  try { localStorage.setItem(THEME_KEY, theme); } catch { /* stockage bloqué : le choix vaut pour la visite */ }
}

/**
 * Branche le bouton. `announce` : fonction d'annonce vocale.
 * L'état (libellé, icône, data-theme, meta color-scheme) suit le thème affiché.
 */
export function initThemeToggle(button, { announce } = {}) {
  const root = document.documentElement;
  const meta = document.querySelector('meta[name="color-scheme"]');
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  let stored = readStored();

  const current = () => resolveTheme(stored, media.matches);

  function render() {
    const shown = current();
    const target = nextTheme(shown);
    if (stored) root.setAttribute('data-theme', stored);
    else root.removeAttribute('data-theme');
    if (meta) meta.setAttribute('content', shown);
    button.dataset.target = target;
    button.querySelector('.theme-toggle-label').textContent = LABELS[target];
    button.hidden = false;
  }

  button.addEventListener('click', () => {
    stored = nextTheme(current());
    writeStored(stored);
    render();
    announce?.(ANNOUNCEMENTS[stored]);
  });
  media.addEventListener('change', () => { if (!stored) render(); });
  render();
}
