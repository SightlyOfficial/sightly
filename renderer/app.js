const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const COLORS = ['#00ff00', '#ffffff', '#ff3b3b', '#00e5ff', '#ffe600', '#ff00c8', '#ff8c00', '#9b59ff'];
const BR_LABEL = { top: '▲', left: '◀', right: '▶', bottom: '▼' };

const SECTIONS = [
  { t: 'Forme', f: [
    { k: 'style', type: 'seg', o: { cross: 'Croix', circle: 'Cercle', dot: 'Point', image: 'Image', none: 'Aucune' } }
  ]},
  { t: 'Branches', f: [
    { type: 'branches' },
    { k: 'size', type: 'range', min: 0, max: 120, l: 'Longueur' },
    { k: 'thickness', type: 'range', min: 1, max: 30, l: 'Épaisseur' },
    { k: 'gap', type: 'range', min: 0, max: 60, l: 'Espace central' },
    { k: 'radius', type: 'range', min: 0, max: 15, l: 'Arrondi' }
  ]},
  { t: 'Couleurs', f: [
    { type: 'palette' },
    { k: 'color', type: 'color', l: 'Couleur' },
    { k: 'opacity', type: 'range', min: 5, max: 100, l: 'Opacité' },
    { k: 'outline', type: 'toggle', l: 'Contour' },
    { k: 'outlineColor', type: 'color', l: 'Couleur du contour' },
    { k: 'outlineThickness', type: 'range', min: 0, max: 12, l: 'Épaisseur du contour' }
  ]},
  { t: 'Point central', f: [
    { k: 'dot', type: 'toggle', l: 'Afficher le point' },
    { k: 'dotStyle', type: 'seg', o: { square: 'Carré', circle: 'Rond', diamond: 'Losange' } },
    { k: 'dotSize', type: 'range', min: 0, max: 40, l: 'Taille du point (0 = auto)' },
    { k: 'dotColor', type: 'color', l: 'Couleur du point' },
    { k: 'dotOutline', type: 'toggle', l: 'Contour du point' }
  ]},
  { t: 'Effets', f: [
    { k: 'glow', type: 'range', min: 0, max: 40, l: 'Lueur' },
    { k: 'shadow', type: 'toggle', l: 'Ombre' },
    { k: 'blink', type: 'toggle', l: 'Clignotement' },
    { k: 'pulse', type: 'toggle', l: 'Pulsation' },
    { k: 'spin', type: 'toggle', l: 'Rotation continue' }
  ]},
  { t: 'Position', f: [
    { k: 'rotation', type: 'range', min: 0, max: 360, l: 'Rotation' },
    { k: 'scale', type: 'range', min: 20, max: 300, l: 'Échelle' },
    { k: 'offsetX', type: 'range', min: -400, max: 400, l: 'Décalage X' },
    { k: 'offsetY', type: 'range', min: -400, max: 400, l: 'Décalage Y' },
    { type: 'buttons' }
  ]},
  { t: 'Image', f: [
    { type: 'file' },
    { k: 'imgSize', type: 'range', min: 8, max: 400, l: 'Taille de l\u2019image' },
    { k: 'imgOpacity', type: 'range', min: 5, max: 100, l: 'Opacité de l\u2019image' },
    { type: 'clearImg' }
  ]}
];
const FIELDS = SECTIONS.flatMap(s => s.f);

let cfg = {}, onModalOk = null, libItems = [], savedItems = [];

function clean() { const { enabled, ...rest } = cfg; return rest; }

function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove('show'), 2200);
}

function field(f) {
  switch (f.type) {
    case 'range': return `<label>${f.l} <output id="o-${f.k}"></output></label><input type="range" id="i-${f.k}" min="${f.min}" max="${f.max}">`;
    case 'toggle': return `<label class="toggle"><input type="checkbox" id="i-${f.k}"><span>${f.l}</span></label>`;
    case 'color': return `<label>${f.l} <input type="color" id="i-${f.k}"></label>`;
    case 'seg': return `<div class="seg" data-seg="${f.k}">${Object.entries(f.o).map(([v, n]) => `<button data-v="${v}">${n}</button>`).join('')}</div>`;
    case 'branches': return `<div class="seg" data-br>${Object.entries(BR_LABEL).map(([v, n]) => `<button data-b="${v}">${n}</button>`).join('')}</div>`;
    case 'palette': return `<div class="swatches" data-pal>${COLORS.map(c => `<button data-c="${c}" style="background:${c}"></button>`).join('')}</div>`;
    case 'file': return `<input type="file" id="imgFile" accept="image/*">`;
    case 'buttons': return `<div class="row"><button id="center" class="btn ghost">Recentrer</button><button id="reset" class="btn ghost">Réinitialiser</button></div>`;
    case 'clearImg': return `<div class="row"><button id="imgClear" class="btn ghost">Retirer l\u2019image</button></div>`;
  }
  return '';
}

function renderUI() {
  drawCrosshair($('preview'), cfg, 100, 100);
  FIELDS.forEach(f => {
    if (f.type === 'range') { $('i-' + f.k).value = cfg[f.k]; $('o-' + f.k).textContent = cfg[f.k]; }
    if (f.type === 'toggle') $('i-' + f.k).checked = !!cfg[f.k];
    if (f.type === 'color') $('i-' + f.k).value = cfg[f.k];
    if (f.type === 'seg') document.querySelectorAll(`[data-seg="${f.k}"] button`).forEach(b => b.classList.toggle('on', b.dataset.v === cfg[f.k]));
  });
  document.querySelectorAll('[data-br] button').forEach(b => b.classList.toggle('on', !!cfg.branches[b.dataset.b]));
  document.querySelectorAll('[data-pal] button').forEach(b => b.classList.toggle('on', b.dataset.c === cfg.color));
}

function pulse() {
  const p = $('preview');
  p.classList.remove('pulse'); void p.offsetWidth; p.classList.add('pulse');
}

async function save(patch) {
  cfg = { ...CH_DEFAULTS, ...(await window.api.set(patch)) };
  renderUI(); pulse();
}

let eyeOn = false;
function setEye(on) {
  eyeOn = on;
  $('eye').classList.toggle('active', on);
  $('eyeLabel').textContent = on ? tr('eye_hide') : tr('eye_show');
  $('eyeIcon').textContent = on ? '◎' : '◉';
  $('status').textContent = on ? tr('st_on') : tr('st_off');
}

function buildUI() {
  $('controls').innerHTML = SECTIONS.map(s => `<div class="group"><h3>${s.t}</h3>${s.f.map(field).join('')}</div>`).join('');

  FIELDS.forEach(f => {
    if (f.type === 'range') {
      $('i-' + f.k).oninput = e => { cfg[f.k] = +e.target.value; renderUI(); };
      $('i-' + f.k).onchange = e => save({ [f.k]: +e.target.value });
    }
    if (f.type === 'toggle') $('i-' + f.k).onchange = e => save({ [f.k]: e.target.checked });
    if (f.type === 'color') $('i-' + f.k).oninput = e => save({ [f.k]: e.target.value });
    if (f.type === 'seg') document.querySelectorAll(`[data-seg="${f.k}"] button`).forEach(b => b.onclick = () => save({ [f.k]: b.dataset.v }));
  });
  document.querySelectorAll('[data-br] button').forEach(b => b.onclick = () =>
    save({ branches: { ...cfg.branches, [b.dataset.b]: !cfg.branches[b.dataset.b] } }));
  document.querySelectorAll('[data-pal] button').forEach(b => b.onclick = () => save({ color: b.dataset.c }));

  $('imgFile').onchange = e => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => save({ image: r.result, style: 'image' });
    r.readAsDataURL(f);
  };
  $('imgClear').onclick = () => save({ image: null });
  $('center').onclick = () => save({ offsetX: 0, offsetY: 0, rotation: 0, scale: 100 });
  $('reset').onclick = () => save({ ...CH_DEFAULTS });

  $('eye').onclick = async () => { const s = await window.api.toggle(); setEye(s.enabled); };
  $('min').onclick = () => window.api.minimize();
  $('close').onclick = () => window.api.close();
  document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => showTab(b.dataset.tab));

  $('saveBtn').onclick = () => openModal('Nom de la sauvegarde', name => {
    cloud.saveLocal(name, clean());
    toast('Sauvegardé sur ce PC');
  });
  $('pubBtn').onclick = () => {
    if (!cloud.user()) { showTab('account'); return toast('Connecte-toi pour publier'); }
    openModal('Nom du crosshair publié', async name => {
      await cloud.publish(name, clean());
      toast('Publié dans la bibliothèque');
    });
  };
  $('mCancel').onclick = closeModal;
  $('mOk').onclick = async () => {
    const name = $('mName').value.trim();
    if (!name) return toast('Donne un nom');
    try { await onModalOk(name); closeModal(); } catch (e) { toast(e.message); }
  };
  $('mName').onkeydown = e => { if (e.key === 'Enter') $('mOk').click(); };
}

function openModal(title, fn) {
  $('mTitle').textContent = title;
  $('mName').value = '';
  onModalOk = fn;
  $('modal').classList.remove('hidden');
  setTimeout(() => $('mName').focus(), 50);
}
function closeModal() { $('modal').classList.add('hidden'); }

function showTab(name) {
  document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === name));
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('on', v.id === name));
  if (name === 'library') loadLibrary();
  if (name === 'saved') loadSaved();
  if (name === 'account') loadAccount();
}

function cards(items, source) {
  if (!items.length) return '<p class="muted">Rien ici pour l\u2019instant.</p>';
  return items.map((it, i) => `
    <div class="card-item">
      <svg id="${source}-${i}" viewBox="-100 -100 200 200"></svg>
      <div><b>${esc(it.name)}</b><small>${esc(it.author || 'Sauvegarde locale')}</small></div>
      <button class="btn" data-load="${i}">Charger</button>
      <button class="btn ghost" data-del="${i}">✕</button>
    </div>`).join('');
}

function bindCards(root, items, source) {
  items.forEach((it, i) => drawCrosshair(document.getElementById(`${source}-${i}`), it.config, 0, 0));
  root.querySelectorAll('[data-load]').forEach(b => b.onclick = () => {
    const it = items[+b.dataset.load];
    const { enabled, ...rest } = it.config;
    save(rest);
    toast(`« ${it.name} » chargé`);
  });
  root.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
    const it = items[+b.dataset.del];
    try {
      if (source === 'lib') await cloud.deleteOwn(it.id); else cloud.deleteLocal(it.id);
      toast('Supprimé');
      showTab(source === 'lib' ? 'library' : 'saved');
    } catch (e) { toast(e.message); }
  });
}

async function loadLibrary() {
  const el = $('library');
  el.innerHTML = '<p class="muted">Chargement…</p>';
  try {
    libItems = await cloud.library();
    el.innerHTML = cards(libItems, 'lib');
    bindCards(el, libItems, 'lib');
  } catch (e) { el.innerHTML = `<p class="muted">${esc(e.message)}</p>`; }
}

function loadSaved() {
  const el = $('saved');
  savedItems = cloud.saved();
  el.innerHTML = cards(savedItems, 'loc');
  bindCards(el, savedItems, 'loc');
}

function loadAccount() {
  const el = $('account');
  const u = cloud.user();
  if (u) {
    el.innerHTML = `<div class="group"><h3>Connecté</h3><p>${esc(u.pseudo)}<br><small class="muted">${esc(u.email)}</small></p>
      <button id="logout" class="btn ghost">Déconnexion</button></div>`;
    $('logout').onclick = () => { cloud.signOut(); toast('Déconnecté'); loadAccount(); };
  } else {
    el.innerHTML = `<div class="group"><h3>Connexion</h3>
      <input type="email" id="em" placeholder="E-mail">
      <input type="password" id="pw" placeholder="Mot de passe">
      <input type="text" id="ps" placeholder="Pseudo (pour l'inscription)">
      <div class="row"><button id="login" class="btn primary">Se connecter</button>
      <button id="signup" class="btn ghost">Créer un compte</button></div></div>`;
    $('login').onclick = async () => {
      try { await cloud.signIn($('em').value, $('pw').value); toast('Connecté'); loadAccount(); }
      catch (e) { toast(e.message); }
    };
    $('signup').onclick = async () => {
      try { await cloud.signUp($('em').value, $('pw').value, $('ps').value || 'Joueur'); toast('Compte créé'); loadAccount(); }
      catch (e) { toast(e.message); }
    };
  }
}

(async () => {
  cfg = { ...CH_DEFAULTS, ...(await window.api.get()) };
  buildUI();
  renderUI();
  setEye(cfg.enabled);
  window.api.onState(s => setEye(s.enabled));
})();

const DISCORD_URL = 'https://discord.gg/c5wPc48Gmy';

const I18N = {
  fr: { tab_settings: 'Réglages', tab_library: 'Bibliothèque', tab_saved: 'Sauvegardes', tab_prefs: 'Paramètres', tab_account: 'Compte',
    save: 'Sauvegarder', publish: 'Publier', pr_discord: 'Serveur Discord', pr_join: 'Rejoindre le serveur',
    pr_theme: 'Thème', th_system: 'Système', th_dark: 'Sombre', th_light: 'Clair', pr_lang: 'Langue',
    eye_show: 'Afficher', eye_hide: 'Masquer', st_on: 'Crosshair actif à l\u2019écran', st_off: 'Crosshair masqué' },
  en: { tab_settings: 'Settings', tab_library: 'Library', tab_saved: 'Saved', tab_prefs: 'Preferences', tab_account: 'Account',
    save: 'Save', publish: 'Publish', pr_discord: 'Discord server', pr_join: 'Join the server',
    pr_theme: 'Theme', th_system: 'System', th_dark: 'Dark', th_light: 'Light', pr_lang: 'Language',
    eye_show: 'Show', eye_hide: 'Hide', st_on: 'Crosshair active on screen', st_off: 'Crosshair hidden' },
  es: { tab_settings: 'Ajustes', tab_library: 'Biblioteca', tab_saved: 'Guardados', tab_prefs: 'Preferencias', tab_account: 'Cuenta',
    save: 'Guardar', publish: 'Publicar', pr_discord: 'Servidor de Discord', pr_join: 'Unirse al servidor',
    pr_theme: 'Tema', th_system: 'Sistema', th_dark: 'Oscuro', th_light: 'Claro', pr_lang: 'Idioma',
    eye_show: 'Mostrar', eye_hide: 'Ocultar', st_on: 'Mira activa en pantalla', st_off: 'Mira oculta' }
};

const prefs = { theme: 'system', lang: 'fr', ...JSON.parse(localStorage.getItem('sightly_prefs') || '{}') };
const tr = k => (I18N[prefs.lang] && I18N[prefs.lang][k]) || I18N.fr[k] || k;
const savePrefs = () => localStorage.setItem('sightly_prefs', JSON.stringify(prefs));

function applyTheme() {
  const dark = prefs.theme === 'system'
    ? !window.matchMedia('(prefers-color-scheme: light)').matches
    : prefs.theme === 'dark';
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}

function applyLang() {
  document.documentElement.lang = prefs.lang;
  document.querySelectorAll('[data-i18n]').forEach(el => el.textContent = tr(el.dataset.i18n));
  setEye(eyeOn);
}

function renderPrefs() {
  document.querySelectorAll('[data-theme-pick]').forEach(b => b.classList.toggle('on', b.dataset.themePick === prefs.theme));
  document.querySelectorAll('[data-lang-pick]').forEach(b => b.classList.toggle('on', b.dataset.langPick === prefs.lang));
}

function setPref(key, value) {
  prefs[key] = value; savePrefs();
  applyTheme(); applyLang(); renderPrefs();
}

document.querySelectorAll('[data-theme-pick]').forEach(b => b.onclick = () => setPref('theme', b.dataset.themePick));
document.querySelectorAll('[data-lang-pick]').forEach(b => b.onclick = () => setPref('lang', b.dataset.langPick));
document.getElementById('discordBtn').onclick = () => window.api.openUrl(DISCORD_URL);
window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => { if (prefs.theme === 'system') applyTheme(); });
document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => { if (b.dataset.tab === 'prefs') renderPrefs(); }));

applyTheme(); applyLang(); renderPrefs();