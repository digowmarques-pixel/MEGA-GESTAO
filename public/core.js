/* MEGA Gestão — núcleo de regras (login, permissões e sincronização).
   Usado pelo servidor (Node) e pelo modo demonstração no navegador, para que as regras sejam as mesmas. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MegaCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const COLS = ['tags', 'spaces', 'lists', 'tasks', 'notifs', 'autos', 'goals', 'docs', 'equip', 'freelas', 'meetings', 'facc', 'fcat', 'ftx'];
  const DAY = 864e5;

  const PERMS = [
    ['ver_todos_espacos', 'Acessar todos os espaços', 'Sem isso, a pessoa só vê os espaços marcados abaixo.'],
    ['criar_tarefas', 'Criar tarefas', ''],
    ['editar_todas', 'Editar qualquer tarefa', 'Sem isso, edita só as tarefas atribuídas a ela ou criadas por ela. Nas demais, apenas comenta.'],
    ['excluir_tarefas', 'Excluir tarefas', ''],
    ['gerenciar_estrutura', 'Gerenciar espaços, listas, status e tags', ''],
    ['ver_painel', 'Ver o painel de indicadores', ''],
    ['gerenciar_metas', 'Criar e editar metas', ''],
    ['gerenciar_automacoes', 'Criar e editar automações', ''],
    ['editar_documentos', 'Criar e editar documentos', ''],
    ['gerenciar_recursos', 'Cadastrar equipamentos e freelancers', 'A reserva de equipamentos e a escala de freelas num projeto seguem a permissão de gerenciar projetos.'],
  ];
  const PRESETS = {
    funcionario: { criar_tarefas: true },
    lider: { ver_todos_espacos: true, criar_tarefas: true, editar_todas: true, excluir_tarefas: true, gerenciar_estrutura: true, ver_painel: true, gerenciar_metas: true, gerenciar_automacoes: true, editar_documentos: true, gerenciar_recursos: true },
  };

  const emptyWs = () => ({ tags: [], spaces: [], lists: [], tasks: [], notifs: [], autos: [], goals: [], docs: [], equip: [], freelas: [], meetings: [], facc: [], fcat: [], ftx: [] });
  const emptyDb = () => ({ version: 1, users: [], sessions: {}, ws: emptyWs() });
  const isAdmin = u => !!u && u.role === 'admin';
  const can = (u, p) => isAdmin(u) || !!(u && u.perms && u.perms[p]);
  const arr = x => (Array.isArray(x) ? x : []);
  const okItem = x => x && typeof x === 'object' && typeof x.id === 'string' && x.id.length > 0 && x.id.length <= 64;

  function spaceAccess(u) {
    if (isAdmin(u) || can(u, 'ver_todos_espacos')) return null; // null = todos
    return new Set(arr(u.spaces));
  }
  const has = (acc, id) => acc === null || acc.has(id);

  function publicUser(u) {
    return { id: u.id, name: u.name, login: u.login, role: u.role, cargo: u.cargo || '', color: u.color, cap: u.cap,
      perms: u.perms || {}, spaces: arr(u.spaces), funcao: u.funcao || '', active: u.active !== false, lastLogin: u.lastLogin || null,
      createdAt: u.createdAt, mustChange: !!u.mustChange };
  }
  const memberView = u => ({ id: u.id, name: u.name, role: u.cargo || (isAdmin(u) ? 'Administrador' : 'Funcionário'), funcao: u.funcao || '', color: u.color, cap: u.cap || 40, admin: isAdmin(u) });
  // valor e pagamento dos projetos só aparecem para administradores
  const MONEY = ['valor', 'pago'];
  const hideMoney = l => { const c = Object.assign({}, l); MONEY.forEach(k => delete c[k]); return c; };
  // diária e PIX dos freelancers também só para administradores
  const FL_MONEY = ['diaria', 'pix'];
  // metas com valores em reais são só para administradores
  const isFinGoal = g => !!g && (g.fin === true || arr(g.targets).some(t => t && t.unit === 'R$'));
  const hideFl = f => { const c = Object.assign({}, f); FL_MONEY.forEach(k => delete c[k]); return c; };

  function viewFor(db, u) {
    const ws = db.ws, acc = spaceAccess(u);
    const spaces = ws.spaces.filter(s => has(acc, s.id));
    const sids = new Set(spaces.map(s => s.id));
    const lists = ws.lists.filter(l => sids.has(l.spaceId));
    const lids = new Set(lists.map(l => l.id));
    return {
      tags: ws.tags, spaces, lists: isAdmin(u) ? lists : lists.map(hideMoney),
      tasks: ws.tasks.filter(t => lids.has(t.listId)),
      notifs: ws.notifs.filter(n => n.to === u.id).slice(0, 200),
      autos: ws.autos, goals: isAdmin(u) ? ws.goals : ws.goals.filter(g => !isFinGoal(g)),
      docs: ws.docs.filter(d => !d.spaceId || sids.has(d.spaceId)),
      equip: ws.equip,
      freelas: isAdmin(u) ? ws.freelas : ws.freelas.map(hideFl),
      // agenda de reuniões e negociações: só administradores
      meetings: isAdmin(u) ? ws.meetings : [],
      // financeiro (contas, categorias e lançamentos): só administradores
      facc: isAdmin(u) ? ws.facc : [], fcat: isAdmin(u) ? ws.fcat : [], ftx: isAdmin(u) ? ws.ftx : [],
      members: db.users.filter(x => x.active !== false).map(memberView),
    };
  }

  /* Aplica as mudanças enviadas por um usuário, verificando cada uma contra as permissões dele. */
  function applyChanges(db, u, ch) {
    const ws = db.ws, denied = new Set(), acc = spaceAccess(u);
    const up = (ch && ch.upserts) || {}, del = (ch && ch.deletes) || {};
    let changed = false;
    const find = (c, id) => ws[c].find(x => x.id === id);
    const put = (c, x) => { const i = ws[c].findIndex(y => y.id === x.id); if (i < 0) ws[c].push(x); else ws[c][i] = x; changed = true; };
    const drop = (c, id) => { const n = ws[c].length; ws[c] = ws[c].filter(y => y.id !== id); if (ws[c].length !== n) changed = true; };
    const listSpace = id => (ws.lists.find(l => l.id === id) || {}).spaceId;
    const NO_SPACE = 'Você não tem acesso a este espaço.';
    const NO_STRUCT = 'Você não tem permissão para alterar espaços, listas, status ou tags.';
    const own = t => arr(t.assignees).includes(u.id) || t.by === u.id;
    const strip = (t, keys) => { const c = Object.assign({}, t); keys.forEach(k => delete c[k]); return JSON.stringify(c); };

    for (const x of arr(up.tags)) { if (!okItem(x)) continue; if (!can(u, 'gerenciar_estrutura')) { denied.add(NO_STRUCT); continue; } put('tags', x); }

    for (const x of arr(up.spaces)) {
      if (!okItem(x) || !Array.isArray(x.statuses) || !x.statuses.length) continue;
      if (!can(u, 'gerenciar_estrutura')) { denied.add(NO_STRUCT); continue; }
      const old = find('spaces', x.id);
      if (old && !has(acc, old.id)) { denied.add(NO_SPACE); continue; }
      put('spaces', x);
      if (!old && acc !== null) { u.spaces = arr(u.spaces).concat(x.id); acc.add(x.id); }
    }

    for (const x of arr(up.lists)) {
      if (!okItem(x)) continue;
      if (!can(u, 'gerenciar_estrutura')) { denied.add(NO_STRUCT); continue; }
      const old = find('lists', x.id);
      if ((old && !has(acc, old.spaceId)) || !find('spaces', x.spaceId) || !has(acc, x.spaceId)) { denied.add(NO_SPACE); continue; }
      if (!isAdmin(u)) MONEY.forEach(k => { if (old && k in old) x[k] = old[k]; else delete x[k]; });
      put('lists', x);
    }

    for (const x of arr(up.tasks)) {
      if (!okItem(x)) continue;
      const ns = listSpace(x.listId);
      if (!ns || !has(acc, ns)) { denied.add(NO_SPACE); continue; }
      const old = find('tasks', x.id);
      if (!old) {
        if (!can(u, 'criar_tarefas')) { denied.add('Você não tem permissão para criar tarefas.'); continue; }
        if (!x.by) x.by = u.id;
        put('tasks', x); continue;
      }
      if (!has(acc, listSpace(old.listId))) { denied.add(NO_SPACE); continue; }
      if (can(u, 'editar_todas') || own(old)) { x.by = old.by || x.by; put('tasks', x); continue; }
      // sem permissão de edição: aceita apenas comentários e o histórico
      if (strip(x, ['comments', 'activity', 'updatedAt']) !== strip(old, ['comments', 'activity', 'updatedAt']))
        denied.add('Você só pode alterar tarefas atribuídas a você. Nas demais, pode comentar.');
      const next = Object.assign({}, old, { comments: arr(x.comments), activity: arr(x.activity) });
      if (JSON.stringify(next) !== JSON.stringify(old)) put('tasks', next);
    }

    for (const x of arr(up.notifs)) {
      if (!okItem(x)) continue;
      const old = find('notifs', x.id);
      if (old) { if (old.to === u.id && old.read !== !!x.read) { old.read = !!x.read; changed = true; } continue; }
      if (!db.users.some(v => v.id === x.to)) continue;
      put('notifs', { id: x.id, to: x.to, text: String(x.text || '').slice(0, 300), taskId: x.taskId || null, at: Date.now(), read: false });
    }
    if (ws.notifs.length > 3000) { ws.notifs.sort((a, b) => b.at - a.at); ws.notifs.length = 3000; }

    for (const x of arr(up.autos)) {
      if (!okItem(x)) continue;
      const old = find('autos', x.id);
      if (can(u, 'gerenciar_automacoes')) { put('autos', x); continue; }
      if (old && strip(x, ['runs']) === strip(old, ['runs'])) { if (old.runs !== x.runs) { old.runs = x.runs; changed = true; } continue; }
      denied.add('Você não tem permissão para alterar automações.');
    }

    for (const x of arr(up.goals)) {
      if (!okItem(x)) continue;
      if (!can(u, 'gerenciar_metas')) { denied.add('Você não tem permissão para alterar metas.'); continue; }
      if (!isAdmin(u) && (isFinGoal(x) || isFinGoal(find('goals', x.id)))) { denied.add('Apenas administradores podem ver e alterar metas financeiras.'); continue; }
      put('goals', x);
    }

    for (const x of arr(up.docs)) {
      if (!okItem(x)) continue;
      if (!can(u, 'editar_documentos')) { denied.add('Você não tem permissão para editar documentos.'); continue; }
      const old = find('docs', x.id);
      if ((old && old.spaceId && !has(acc, old.spaceId)) || (x.spaceId && !has(acc, x.spaceId))) { denied.add(NO_SPACE); continue; }
      put('docs', x);
    }

    const NO_RES = 'Você não tem permissão para cadastrar equipamentos ou freelancers.';
    for (const x of arr(up.equip)) { if (!okItem(x)) continue; if (!can(u, 'gerenciar_recursos')) { denied.add(NO_RES); continue; } put('equip', x); }
    for (const x of arr(up.freelas)) {
      if (!okItem(x)) continue;
      if (!can(u, 'gerenciar_recursos')) { denied.add(NO_RES); continue; }
      const old = find('freelas', x.id);
      if (!isAdmin(u)) FL_MONEY.forEach(k => { if (old && k in old) x[k] = old[k]; else delete x[k]; });
      put('freelas', x);
    }

    const NO_FIN = 'Apenas administradores acessam o financeiro.';
    for (const c of ['facc', 'fcat', 'ftx']) for (const x of arr(up[c])) { if (!okItem(x)) continue; if (!isAdmin(u)) { denied.add(NO_FIN); continue; } put(c, x); }
    for (const x of arr(up.meetings)) { if (!okItem(x)) continue; if (!isAdmin(u)) { denied.add('Apenas administradores acessam as reuniões.'); continue; } put('meetings', x); }

    // exclusões
    const removeTaskTree = id => {
      const ids = new Set([id]); let grew = true;
      while (grew) { grew = false; ws.tasks.forEach(t => { if (t.parentId && ids.has(t.parentId) && !ids.has(t.id)) { ids.add(t.id); grew = true; } }); }
      ws.tasks = ws.tasks.filter(t => !ids.has(t.id));
      ws.tasks.forEach(t => { if (Array.isArray(t.blockedBy)) t.blockedBy = t.blockedBy.filter(b => !ids.has(b)); });
      changed = true;
    };
    for (const id of arr(del.tasks)) {
      const old = find('tasks', id); if (!old) continue;
      if (!has(acc, listSpace(old.listId))) { denied.add(NO_SPACE); continue; }
      if (!can(u, 'excluir_tarefas') || !(can(u, 'editar_todas') || own(old))) { denied.add('Você não tem permissão para excluir esta tarefa.'); continue; }
      removeTaskTree(id);
    }
    for (const id of arr(del.docs)) {
      const old = find('docs', id); if (!old) continue;
      if (!can(u, 'editar_documentos') || (old.spaceId && !has(acc, old.spaceId))) { denied.add('Você não tem permissão para excluir documentos.'); continue; }
      drop('docs', id);
    }
    for (const [c, field] of [['equip', 'gear'], ['freelas', 'freelas']]) for (const id of arr(del[c])) {
      if (!find(c, id)) continue;
      if (!can(u, 'gerenciar_recursos')) { denied.add(NO_RES); continue; }
      drop(c, id); ws.lists.forEach(l => { if (Array.isArray(l[field])) l[field] = l[field].filter(v => v !== id); });
    }
    for (const c of ['facc', 'fcat', 'ftx']) for (const id of arr(del[c])) { if (!find(c, id)) continue; if (!isAdmin(u)) { denied.add(NO_FIN); continue; } drop(c, id); }
    for (const id of arr(del.meetings)) { if (!find('meetings', id)) continue; if (!isAdmin(u)) { denied.add('Apenas administradores acessam as reuniões.'); continue; } drop('meetings', id); }
    for (const id of arr(del.goals)) { if (!find('goals', id)) continue; if (!can(u, 'gerenciar_metas') || (!isAdmin(u) && isFinGoal(find('goals', id)))) { denied.add('Você não tem permissão para alterar metas.'); continue; } drop('goals', id); }
    for (const id of arr(del.autos)) { if (!find('autos', id)) continue; if (!can(u, 'gerenciar_automacoes')) { denied.add('Você não tem permissão para alterar automações.'); continue; } drop('autos', id); }
    for (const id of arr(del.tags)) {
      if (!find('tags', id)) continue;
      if (!can(u, 'gerenciar_estrutura')) { denied.add(NO_STRUCT); continue; }
      drop('tags', id); ws.tasks.forEach(t => { t.tags = arr(t.tags).filter(g => g !== id); });
    }
    for (const id of arr(del.lists)) {
      const old = find('lists', id); if (!old) continue;
      if (!can(u, 'gerenciar_estrutura') || !has(acc, old.spaceId)) { denied.add(NO_STRUCT); continue; }
      ws.tasks.filter(t => t.listId === id).forEach(t => removeTaskTree(t.id));
      drop('lists', id);
    }
    for (const id of arr(del.spaces)) {
      const old = find('spaces', id); if (!old) continue;
      if (!can(u, 'gerenciar_estrutura') || !has(acc, id)) { denied.add(NO_STRUCT); continue; }
      const lids = ws.lists.filter(l => l.spaceId === id).map(l => l.id);
      ws.tasks.filter(t => lids.includes(t.listId)).forEach(t => removeTaskTree(t.id));
      ws.lists = ws.lists.filter(l => l.spaceId !== id);
      drop('spaces', id);
    }

    if (changed) db.version++;
    return Array.from(denied);
  }

  /* Rotas da API. hash/verify/token são fornecidos por quem usa (bcrypt no servidor). */
  function createApi(opts) {
    const { hash, verify, token } = opts;
    const newId = () => 'u' + token().slice(0, 12);
    const R = (status, json, extra) => Object.assign({ status, json }, extra || {});
    const cleanLogin = s => String(s || '').trim().toLowerCase();
    const validLogin = s => /^[a-z0-9._@-]{3,40}$/.test(s);
    const COLORS = ['#12893F', '#2B6CB0', '#B83280', '#C05621', '#6B46C1', '#2C7A7B', '#9C4221', '#3C6E2F', '#97266D', '#4A5568'];
    const activeAdmins = db => db.users.filter(x => isAdmin(x) && x.active !== false);
    const cleanPerms = p => { const o = {}; PERMS.forEach(([k]) => { if (p && p[k]) o[k] = true; }); return o; };

    function startSession(db, u) {
      const now = Date.now(), t = token();
      for (const k of Object.keys(db.sessions)) if (db.sessions[k].exp < now) delete db.sessions[k];
      db.sessions[t] = { uid: u.id, exp: now + 30 * DAY };
      u.lastLogin = now;
      return t;
    }

    return async function handle(db, tok, method, path, body) {
      body = body || {};
      COLS.forEach(c => { if (!Array.isArray(db.ws[c])) db.ws[c] = []; });
      const now = Date.now();
      const s = tok && db.sessions[tok];
      const u = s && s.exp > now ? db.users.find(x => x.id === s.uid && x.active !== false) : null;

      if (method === 'GET' && path === '/api/me') return R(200, { setup: db.users.length === 0, user: u ? publicUser(u) : null });

      if (method === 'POST' && path === '/api/setup') {
        if (db.users.length) return R(400, { error: 'O sistema já foi configurado. Entre com seu usuário.' });
        const name = String(body.name || '').trim(), login = cleanLogin(body.login), pw = String(body.password || '');
        if (!name) return R(400, { error: 'Informe seu nome.' });
        if (!validLogin(login)) return R(400, { error: 'O usuário deve ter de 3 a 40 caracteres: letras, números, ponto, hífen ou @.' });
        if (pw.length < 6) return R(400, { error: 'A senha precisa ter pelo menos 6 caracteres.' });
        const nu = { id: newId(), name, login, role: 'admin', cargo: 'Administrador', funcao: 'gestao', color: COLORS[0], cap: 40, perms: {}, spaces: [], active: true, createdAt: now, pass: await hash(pw) };
        db.users.push(nu); db.version++;
        return R(200, { user: publicUser(nu) }, { setToken: startSession(db, nu) });
      }

      if (method === 'POST' && path === '/api/login') {
        const login = cleanLogin(body.login);
        const x = db.users.find(v => v.login === login);
        if (!x || !(await verify(String(body.password || ''), x.pass))) return R(401, { error: 'Usuário ou senha incorretos.' });
        if (x.active === false) return R(403, { error: 'Este acesso foi desativado. Fale com o administrador.' });
        return R(200, { user: publicUser(x) }, { setToken: startSession(db, x) });
      }

      if (method === 'POST' && path === '/api/logout') { if (tok) delete db.sessions[tok]; return R(200, { ok: true }, { clearToken: true }); }

      if (!u) return R(401, { error: 'Sua sessão expirou. Entre novamente.' });

      if (method === 'POST' && path === '/api/password') {
        const next = String(body.next || '');
        if (!(await verify(String(body.current || ''), u.pass))) return R(400, { error: 'A senha atual está incorreta.' });
        if (next.length < 6) return R(400, { error: 'A nova senha precisa ter pelo menos 6 caracteres.' });
        u.pass = await hash(next); u.mustChange = false;
        for (const k of Object.keys(db.sessions)) if (db.sessions[k].uid === u.id && k !== tok) delete db.sessions[k];
        return R(200, { user: publicUser(u) });
      }

      if (method === 'POST' && path === '/api/sync') {
        const ch = body.changes;
        const denied = ch ? applyChanges(db, u, ch) : [];
        // sem alterações enviadas = só leitura: o servidor não precisa gravar o banco
        if (!ch && body.version === db.version) return R(200, { same: true, version: db.version }, { readonly: true });
        return R(200, { version: db.version, state: viewFor(db, u), user: publicUser(u), denied }, { readonly: !ch });
      }

      /* ---------- mensagens (chat) ----------
         Ficam fora do estado geral sincronizado: têm rotas próprias e só vão para quem participa da conversa. */
      if (method === 'POST' && path.indexOf('/api/chat/') === 0) {
        if (!db.chat) db.chat = { ver: 1, convs: [{ id: 'geral', type: 'all', name: 'Geral', createdAt: now }], msgs: [], reads: {} };
        const ch = db.chat, route = path.slice(10);
        const canSee = c => c.type === 'all' || arr(c.members).includes(u.id);
        const pub = c => ({ id: c.id, type: c.type, name: c.name || '', members: arr(c.members), createdBy: c.createdBy || null, lastAt: c.lastAt || 0 });
        const findConv = id => { const c = ch.convs.find(x => x.id === id); return c && canSee(c) ? c : null; };
        const NF = R(404, { error: 'Conversa não encontrada.' });

        if (route === 'poll') {
          if (body.ver === ch.ver) return R(200, { same: true, ver: ch.ver }, { readonly: true });
          const vs = ch.convs.filter(canSee), ids = new Set(vs.map(c => c.id)), since = +body.since || 0;
          let msgs;
          if (since) msgs = ch.msgs.filter(m => ids.has(m.convId) && (m.at > since || (m.upd || 0) > since));
          else {
            // primeira carga: as últimas 150 de cada conversa
            const per = {}; msgs = [];
            for (let i = ch.msgs.length - 1; i >= 0; i--) { const m = ch.msgs[i]; if (!ids.has(m.convId)) continue; per[m.convId] = (per[m.convId] || 0) + 1; if (per[m.convId] <= 150) msgs.push(m); }
            msgs.reverse();
          }
          return R(200, { ver: ch.ver, now, convs: vs.map(pub), msgs, reads: ch.reads[u.id] || {} }, { readonly: true });
        }
        if (route === 'history') {
          const c = findConv(body.convId); if (!c) return NF;
          const list = ch.msgs.filter(m => m.convId === c.id && m.at < (+body.before || now));
          return R(200, { msgs: list.slice(-100), more: list.length > 100 }, { readonly: true });
        }
        if (route === 'send') {
          const text = String(body.text || '').trim().slice(0, 4000);
          if (!text) return R(400, { error: 'Escreva uma mensagem.' });
          let c;
          if (body.to) {
            const other = db.users.find(x => x.id === body.to && x.active !== false);
            if (!other || other.id === u.id) return R(400, { error: 'Pessoa não encontrada.' });
            const key = [u.id, other.id].sort().join(':');
            c = ch.convs.find(x => x.type === 'dm' && x.key === key);
            if (!c) { c = { id: 'dm' + token().slice(0, 12), type: 'dm', key, members: [u.id, other.id], createdAt: now }; ch.convs.push(c); }
          } else { c = findConv(body.convId); if (!c) return NF; }
          const m = { id: 'm' + token().slice(0, 14), convId: c.id, from: u.id, text, at: now };
          ch.msgs.push(m);
          if (ch.msgs.length > 20000) ch.msgs.splice(0, ch.msgs.length - 20000);
          c.lastAt = now; (ch.reads[u.id] = ch.reads[u.id] || {})[c.id] = now; ch.ver++;
          return R(200, { msg: m, conv: pub(c) });
        }
        if (route === 'delete') {
          const m = ch.msgs.find(x => x.id === body.id);
          if (!m || m.from !== u.id) return R(403, { error: 'Você só pode apagar as suas mensagens.' });
          m.text = ''; m.deleted = true; m.upd = now; ch.ver++;
          return R(200, { msg: m });
        }
        if (route === 'read') {
          const c = findConv(body.convId); if (!c) return NF;
          const r = ch.reads[u.id] = ch.reads[u.id] || {};
          r[c.id] = Math.max(r[c.id] || 0, Math.min(+body.at || now, now));
          return R(200, { ok: true });
        }
        if (route === 'group') {
          const name = String(body.name || '').trim().slice(0, 60);
          if (!name) return R(400, { error: 'Dê um nome ao grupo.' });
          const members = Array.from(new Set([u.id].concat(arr(body.members)))).filter(id => db.users.some(x => x.id === id && x.active !== false));
          if (members.length < 2) return R(400, { error: 'Escolha pelo menos uma pessoa para o grupo.' });
          if (body.id) {
            const c = findConv(body.id); if (!c || c.type !== 'group') return NF;
            c.name = name; c.members = members; ch.ver++;
            return R(200, { conv: pub(c) });
          }
          const c = { id: 'g' + token().slice(0, 12), type: 'group', name, members, createdBy: u.id, createdAt: now, lastAt: now };
          ch.convs.push(c); ch.ver++;
          return R(200, { conv: pub(c) });
        }
        if (route === 'leave') {
          const c = findConv(body.id); if (!c || c.type !== 'group') return NF;
          c.members = arr(c.members).filter(x => x !== u.id);
          if (!c.members.length) { ch.convs = ch.convs.filter(x => x !== c); ch.msgs = ch.msgs.filter(m => m.convId !== c.id); }
          ch.ver++;
          return R(200, { ok: true });
        }
        return R(404, { error: 'Rota não encontrada.' });
      }

      if (path === '/api/users' || path.indexOf('/api/users/') === 0) {
        if (!isAdmin(u)) return R(403, { error: 'Apenas administradores podem gerenciar usuários.' });
        const id = path.split('/')[3];

        if (method === 'GET' && !id) return R(200, { users: db.users.map(publicUser) });

        if (method === 'POST' && !id) {
          const name = String(body.name || '').trim(), login = cleanLogin(body.login), pw = String(body.password || '');
          if (!name) return R(400, { error: 'Informe o nome.' });
          if (!validLogin(login)) return R(400, { error: 'O usuário deve ter de 3 a 40 caracteres: letras, números, ponto, hífen ou @.' });
          if (db.users.some(v => v.login === login)) return R(400, { error: 'Já existe alguém com esse usuário.' });
          if (pw.length < 6) return R(400, { error: 'A senha precisa ter pelo menos 6 caracteres.' });
          const nu = { id: newId(), name, login, role: body.role === 'admin' ? 'admin' : 'funcionario', cargo: String(body.cargo || '').trim(), funcao: String(body.funcao || '').slice(0, 20),
            color: body.color || COLORS[db.users.length % COLORS.length], cap: Math.max(0, +body.cap || 40), perms: cleanPerms(body.perms),
            spaces: arr(body.spaces).filter(x => typeof x === 'string'), active: true, createdAt: now, mustChange: body.mustChange !== false, pass: await hash(pw) };
          db.users.push(nu); db.version++;
          return R(200, { user: publicUser(nu) });
        }

        const x = db.users.find(v => v.id === id);
        if (!x) return R(404, { error: 'Usuário não encontrado.' });

        if (method === 'PUT') {
          const login = body.login != null ? cleanLogin(body.login) : x.login;
          if (!validLogin(login)) return R(400, { error: 'O usuário deve ter de 3 a 40 caracteres: letras, números, ponto, hífen ou @.' });
          if (db.users.some(v => v.login === login && v.id !== x.id)) return R(400, { error: 'Já existe alguém com esse usuário.' });
          const role = body.role ? (body.role === 'admin' ? 'admin' : 'funcionario') : x.role;
          const active = body.active != null ? !!body.active : x.active !== false;
          if (isAdmin(x) && (role !== 'admin' || !active) && activeAdmins(db).length <= 1) return R(400, { error: 'É preciso manter pelo menos um administrador ativo.' });
          if (body.password) {
            if (String(body.password).length < 6) return R(400, { error: 'A senha precisa ter pelo menos 6 caracteres.' });
            x.pass = await hash(String(body.password)); x.mustChange = body.mustChange !== false;
            for (const k of Object.keys(db.sessions)) if (db.sessions[k].uid === x.id && k !== tok) delete db.sessions[k];
          }
          if (body.name != null && String(body.name).trim()) x.name = String(body.name).trim();
          x.login = login; x.role = role; x.active = active;
          if (body.cargo != null) x.cargo = String(body.cargo).trim();
          if (body.funcao != null) x.funcao = String(body.funcao).slice(0, 20);
          if (body.color) x.color = body.color;
          if (body.cap != null) x.cap = Math.max(0, +body.cap || 0);
          if (body.perms) x.perms = cleanPerms(body.perms);
          if (body.spaces) x.spaces = arr(body.spaces).filter(v => typeof v === 'string');
          if (!active) for (const k of Object.keys(db.sessions)) if (db.sessions[k].uid === x.id) delete db.sessions[k];
          db.version++;
          return R(200, { user: publicUser(x) });
        }

        if (method === 'DELETE') {
          if (x.id === u.id) return R(400, { error: 'Você não pode excluir a sua própria conta.' });
          if (isAdmin(x) && activeAdmins(db).length <= 1) return R(400, { error: 'É preciso manter pelo menos um administrador ativo.' });
          db.users = db.users.filter(v => v !== x);
          for (const k of Object.keys(db.sessions)) if (db.sessions[k].uid === x.id) delete db.sessions[k];
          db.ws.tasks.forEach(t => { t.assignees = arr(t.assignees).filter(a => a !== x.id); });
          db.ws.notifs = db.ws.notifs.filter(n => n.to !== x.id);
          db.version++;
          return R(200, { ok: true });
        }
      }

      return R(404, { error: 'Rota não encontrada.' });
    };
  }

  return { COLS, PERMS, PRESETS, emptyDb, emptyWs, isAdmin, can, viewFor, applyChanges, createApi, publicUser };
});
