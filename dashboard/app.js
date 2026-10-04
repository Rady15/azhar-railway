/* ══════════════════════════════════════════════════════════════════
   Projects dashboard — login gate plus CRUD over /api/admin/projects.

   The session reuses the Azhar access token from /api/Account/login and is
   kept in localStorage so a refresh does not ask for the password again. The
   token is short lived, so a 401 anywhere drops straight back to the gate.
   ══════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const API = '/api';
  const KEY = 'azhar.dashboard.session';

  const $ = (id) => document.getElementById(id);
  const gate = $('gate'), app = $('app'), grid = $('grid'), empty = $('empty'), stats = $('stats');

  let token = null;
  let projects = [];

  /* ── helpers ─────────────────────────────────────────────── */
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let toastTimer;
  function toast(text, kind = 'ok') {
    const el = $('toast');
    el.className = 'fixed bottom-5 start-1/2 -translate-x-1/2 z-40 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-2xl ' +
      (kind === 'ok' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                     : 'bg-rose-500/15 text-rose-300 border border-rose-500/30');
    el.textContent = text;
    el.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add('hidden'), 3200);
  }

  function showError(el, msg) {
    el.textContent = msg;
    el.classList.remove('hidden');
  }

  async function api(path, options = {}) {
    const res = await fetch(API + path, {
      ...options,
      headers: {
        ...(options.body && !(options.body instanceof Blob) ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
    if (res.status === 401) { signOut(); throw new Error('انتهت الجلسة — سجّل دخول من جديد'); }
    let data = null;
    try { data = await res.json(); } catch { /* empty or non-JSON body */ }
    if (!res.ok) throw new Error(data?.message || friendly(res.status));
    return data;
  }

  const friendly = (code) => ({
    400: 'بيانات غير صحيحة', 401: 'يجب تسجيل الدخول',
    403: 'ليست لديك صلاحية', 404: 'غير موجود',
    409: 'في مشروع بنفس الاسم', 500: 'خطأ في الخادم',
  }[code] || `فشل الطلب (${code})`);

  /* ── session ─────────────────────────────────────────────── */
  const saveSession = (s) => { localStorage.setItem(KEY, JSON.stringify(s)); };
  const readSession = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } };

  function signOut() {
    token = null;
    localStorage.removeItem(KEY);
    projects = [];
    app.classList.add('hidden');
    gate.classList.remove('hidden');
    $('password').value = '';
  }

  async function enter(s) {
    token = s.accessToken;
    saveSession(s);
    gate.classList.add('hidden');
    app.classList.remove('hidden');
    const who = s.user || {};
    $('whoami').textContent = `${who.username || who.email || ''} · ${who.role || ''}`;
    await load();
  }

  $('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('loginErr');
    err.classList.add('hidden');
    const btn = $('loginBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spin inline-block">◠</span><span>جارٍ الدخول…</span>';
    try {
      const res = await fetch(`${API}/Account/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: $('email').value.trim(), password: $('password').value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.accessToken) {
        showError(err, data?.message || 'البريد الإلكتروني أو كلمة المرور غير صحيحة');
        return;
      }
      await enter(data);
    } catch (err2) {
      showError(err, err2?.message || 'تعذر الاتصال');
    } finally {
      btn.disabled = false;
      btn.textContent = 'دخول';
    }
  });

  $('logoutBtn').addEventListener('click', signOut);

  /* ── load + render ───────────────────────────────────────── */
  async function load() {
    try {
      // The admin list also carries soft-deleted rows so they can be reviewed.
      projects = await api('/admin/projects');
      render();
    } catch (e) {
      if (token) toast(e.message, 'bad');
    }
  }

  const visible = () => {
    const q = $('search').value.trim().toLowerCase();
    const f = $('filter').value;
    return projects.filter((p) => {
      if (f === 'live' && (!p.served || p.isDeleted)) return false;
      if (f === 'draft' && (p.served || p.isDeleted)) return false;
      if (f === 'featured' && (!p.featured || p.isDeleted)) return false;
      if (f === 'deleted' && !p.isDeleted) return false;
      if (f !== 'deleted' && p.isDeleted) return false;
      if (!q) return true;
      return [p.name, p.description, p.kind, (p.tags || []).join(' ')]
        .join(' ').toLowerCase().includes(q);
    });
  };

  function renderStats() {
    const live = projects.filter((p) => !p.isDeleted && p.served).length;
    const draft = projects.filter((p) => !p.isDeleted && !p.served).length;
    const gone = projects.filter((p) => p.isDeleted).length;
    const starred = projects.filter((p) => !p.isDeleted && p.featured).length;
    const card = (label, value, tone) => `
      <div class="rounded-2xl bg-ink-900 border border-ink-700 px-4 py-3">
        <div class="text-2xl font-bold ${tone}">${value}</div>
        <div class="text-[11px] text-slate-400 mt-0.5">${label}</div>
      </div>`;
    stats.innerHTML =
      card('منشور', live, 'text-emerald-400') +
      card('غير منشور', draft, 'text-amber-400') +
      card('مميّز', starred, 'text-violet-400') +
      card('محذوف', gone, 'text-slate-400');
  }

  function card(p) {
    const tags = (p.tags || []).slice(0, 4)
      .map((t) => `<span class="rounded-md bg-ink-800 border border-ink-700 px-1.5 py-0.5 text-[10px] text-slate-300">${esc(t)}</span>`)
      .join('');
    const open = p.url
      ? `<a href="${esc(p.url)}" target="_blank" rel="noopener"
            class="inline-flex items-center gap-1 rounded-lg bg-ink-800 hover:bg-ink-700 border border-ink-700 px-3 py-1.5 text-xs font-semibold transition">فتح ↗</a>`
      : '';
    const repo = p.repoUrl
      ? `<a href="${esc(p.repoUrl)}" target="_blank" rel="noopener"
            class="inline-flex items-center gap-1 rounded-lg bg-ink-800 hover:bg-ink-700 border border-ink-700 px-3 py-1.5 text-xs font-semibold transition">GitHub ↗</a>`
      : '';
    const badges = [
      p.isDeleted ? '<span class="rounded-md bg-rose-500/15 border border-rose-500/30 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">محذوف</span>' : '',
      p.served ? '<span class="rounded-md bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">منشور</span>'
               : '<span class="rounded-md bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">غير منشور</span>',
      p.featured ? '<span class="rounded-md bg-violet-500/15 border border-violet-500/30 px-1.5 py-0.5 text-[10px] font-bold text-violet-300">مميّز</span>' : '',
    ].filter(Boolean).join(' ');

    return `
      <article class="rise card-glow relative overflow-hidden rounded-2xl bg-ink-900 border border-ink-700 p-5
                      ${p.isDeleted ? 'opacity-60' : ''}">
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 shrink-0 rounded-xl grid place-items-center text-lg font-bold"
               style="background:rgb(var(--accent)/.14);color:rgb(var(--accent));border:1px solid rgb(var(--accent)/.35)">
            ${esc(p.name.slice(0, 2))}
          </div>
          <div class="min-w-0 flex-1">
            <h3 class="font-bold text-white truncate" dir="auto">${esc(p.name)}</h3>
            <p class="text-[11px] text-slate-500 font-mono truncate" dir="ltr">/${esc(p.slug)}</p>
          </div>
        </div>

        <p class="text-xs text-slate-400 mt-3 leading-relaxed line-clamp-2 min-h-8">${esc(p.description || '—')}</p>

        <div class="flex flex-wrap gap-1.5 mt-3">${tags}</div>
        <div class="flex flex-wrap gap-1.5 mt-2">${badges}</div>

        <div class="flex flex-wrap gap-2 mt-4 pt-3 border-t border-ink-700">
          ${open}${repo}
          <button data-edit="${esc(p.id)}"
                  class="rounded-lg bg-ink-800 hover:bg-ink-700 border border-ink-700 px-3 py-1.5 text-xs font-semibold transition">تعديل</button>
          ${p.isDeleted
            ? `<button data-restore="${esc(p.id)}"
                 class="rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition">استرجاع</button>`
            : `<button data-del="${esc(p.id)}"
                 class="rounded-lg bg-rose-500/10 border border-rose-500/30 px-3 py-1.5 text-xs font-semibold text-rose-300 transition">حذف</button>`}
          <button data-purge="${esc(p.id)}"
                  class="rounded-lg border border-ink-700 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-rose-300 transition"
                  title="حذف نهائي">حذف نهائي</button>
        </div>
      </article>`;
  }

  function render() {
    const list = visible();
    renderStats();
    grid.innerHTML = list.map(card).join('');
    empty.classList.toggle('hidden', list.length > 0);
    grid.classList.toggle('hidden', list.length === 0);
  }

  $('search').addEventListener('input', render);
  $('filter').addEventListener('change', render);

  /* ── editor ──────────────────────────────────────────────── */
  const modal = $('modal');
  const openModal = (p) => {
    $('mTitle').textContent = p ? 'تعديل مشروع' : 'مشروع جديد';
    $('fId').value = p?.id || '';
    $('fName').value = p?.name || '';
    $('fDesc').value = p?.description || '';
    $('fUrl').value = p?.url || '';
    $('fRepo').value = p?.repoUrl || '';
    $('fKind').value = p?.kind || 'static';
    $('fAccent').value = p?.accent || 'cyan';
    $('fSort').value = p?.sortOrder ?? '';
    $('fTags').value = (p?.tags || []).join(', ');
    $('fServed').checked = !!p?.served;
    $('fFeatured').checked = !!p?.featured;
    $('mErr').classList.add('hidden');
    modal.classList.remove('hidden');
    setTimeout(() => $('fName').focus(), 30);
  };
  const closeModal = () => modal.classList.add('hidden');

  $('addBtn').addEventListener('click', () => openModal(null));
  $('mClose').addEventListener('click', closeModal);
  $('mCancel').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  $('mForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('mErr');
    err.classList.add('hidden');
    const id = $('fId').value;
    const body = {
      name: $('fName').value.trim(),
      description: $('fDesc').value.trim(),
      url: $('fUrl').value.trim(),
      repoUrl: $('fRepo').value.trim(),
      kind: $('fKind').value,
      accent: $('fAccent').value,
      sortOrder: $('fSort').value === '' ? undefined : Number($('fSort').value),
      tags: $('fTags').value.split(',').map((t) => t.trim()).filter(Boolean),
      served: $('fServed').checked,
      featured: $('fFeatured').checked,
    };
    const btn = $('mSave');
    btn.disabled = true;
    btn.textContent = 'جارٍ الحفظ…';
    try {
      if (id) {
        await api(`/admin/projects/${id}`, { method: 'PUT', body: JSON.stringify(body) });
        toast('تم تحديث المشروع');
      } else {
        await api('/admin/projects', { method: 'POST', body: JSON.stringify(body) });
        toast('تمت إضافة المشروع');
      }
      closeModal();
      await load();
    } catch (e2) {
      showError(err, e2.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'حفظ';
    }
  });

  /* ── row actions ─────────────────────────────────────────── */
  grid.addEventListener('click', async (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    const id = t.dataset.edit || t.dataset.del || t.dataset.restore || t.dataset.purge;
    if (!id) return;

    const p = projects.find((x) => x.id === id);
    if (!p) return;

    try {
      if (t.dataset.edit) { openModal(p); return; }

      if (t.dataset.del) {
        if (!confirm(`حذف "${p.name}" من اللوحة؟\n\nالمشروع مش هيتشال من GitHub، وهتقدر تسترجعه من فلتر "المحذوفة".`)) return;
        await api(`/admin/projects/${id}`, { method: 'DELETE' });
        toast('تم حذف المشروع');
      } else if (t.dataset.restore) {
        await api(`/admin/projects/${id}`, { method: 'PUT', body: JSON.stringify({ isDeleted: false }) });
        toast('تم استرجاع المشروع');
      } else if (t.dataset.purge) {
        if (!confirm(`حذف نهائي لـ "${p.name}"؟\n\nمش هتقدر ترجعه.`)) return;
        await api(`/admin/projects/${id}?hard=1`, { method: 'DELETE' });
        toast('تم الحذف النهائي');
      }
      await load();
    } catch (e2) {
      toast(e2.message, 'bad');
    }
  });

  /* ── resume an existing session ──────────────────────────── */
  (async () => {
    const s = readSession();
    if (!s?.accessToken) return;
    token = s.accessToken;
    try {
      await enter({ ...s });
    } catch {
      signOut();
    }
  })();
})();
