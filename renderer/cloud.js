const SUPABASE_URL = 'https://bhivddmggchvlejgrpal.supabase.co';
const SUPABASE_KEY = 'sb_publishable_U_10W8poBqqxwTGF_5dY4Q_6mLqYMSE';

let session = JSON.parse(localStorage.getItem('sightly_session') || 'null');

function setSession(s) {
  session = s && s.access_token ? s : null;
  if (session) localStorage.setItem('sightly_session', JSON.stringify(session));
  else localStorage.removeItem('sightly_session');
}

async function raw(path, opts, token) {
  const headers = { apikey: SUPABASE_KEY, 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) headers.Authorization = 'Bearer ' + token;
  const r = await fetch(SUPABASE_URL + path, { ...opts, headers });
  const data = await r.json().catch(() => null);
  return { ok: r.ok, status: r.status, data };
}

const errMsg = (d, s) => (d && (d.msg || d.message || d.error_description || d.error)) || 'Erreur ' + s;

async function refreshSession() {
  if (!session || !session.refresh_token) return false;
  const r = await raw('/auth/v1/token?grant_type=refresh_token',
    { method: 'POST', body: JSON.stringify({ refresh_token: session.refresh_token }) }, null);
  if (!r.ok) { setSession(null); return false; }
  setSession(r.data);
  return true;
}

async function req(path, opts = {}) {
  // Renouvelle la session si elle expire dans moins d'une minute
  if (session && session.expires_at && session.expires_at * 1000 < Date.now() + 60000) await refreshSession();
  let r = await raw(path, opts, session && session.access_token);
  if (r.status === 401 && session) {
    if (await refreshSession()) r = await raw(path, opts, session.access_token);
    else r = await raw(path, opts, null);
  }
  if (!r.ok) throw new Error(errMsg(r.data, r.status));
  return r.data;
}

const cloud = {
  user: () => (session ? { email: session.user.email, pseudo: session.user.user_metadata?.pseudo || session.user.email } : null),

  async signUp(email, password, pseudo) {
    const r = await raw('/auth/v1/signup', { method: 'POST', body: JSON.stringify({ email, password, data: { pseudo } }) }, null);
    if (!r.ok) throw new Error(errMsg(r.data, r.status));
    setSession(r.data);
    return cloud.user();
  },

  async signIn(email, password) {
    const r = await raw('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email, password }) }, null);
    if (!r.ok) throw new Error(errMsg(r.data, r.status));
    setSession(r.data);
    return cloud.user();
  },

  signOut() { setSession(null); },

  async publish(name, config) {
    if (!session) throw new Error('Connecte-toi pour publier');
    const author = cloud.user().pseudo;
    const rows = await req('/rest/v1/crosshairs', {
      method: 'POST', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ name, author, config })
    });
    return rows[0];
  },

  library() {
    return req('/rest/v1/crosshairs?select=id,name,author,config,created_at&order=created_at.desc&limit=100');
  },

  async deleteOwn(id) {
    if (!session) throw new Error('Connecte-toi pour supprimer');
    await req('/rest/v1/crosshairs?id=eq.' + id, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
  },

  saved() { return JSON.parse(localStorage.getItem('sightly_saved') || '[]'); },

  saveLocal(name, config) {
    const list = cloud.saved();
    list.unshift({ id: Date.now().toString(), name, config, date: new Date().toISOString() });
    localStorage.setItem('sightly_saved', JSON.stringify(list));
  },

  deleteLocal(id) {
    localStorage.setItem('sightly_saved', JSON.stringify(cloud.saved().filter(x => x.id !== id)));
  }
};

window.cloud = cloud;