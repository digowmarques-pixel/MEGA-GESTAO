/* MEGA Gestão — servidor
   Uso: npm install && npm start  →  http://localhost:3000
   Dados: arquivo data/mega-db.json (padrão) ou PostgreSQL se DATABASE_URL estiver definida. */
const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const core = require('./public/core.js');

const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const COOKIE = 'mega_sid';

/* ---------- armazenamento ---------- */
function fileStore() {
  const file = path.join(DATA_DIR, 'mega-db.json');
  return {
    name: `arquivo ${file}`,
    async load() {
      try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; return null; }
    },
    async save(db) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      const tmp = file + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(db));
      fs.renameSync(tmp, file);
    },
  };
}
function pgStore(url) {
  const { Pool } = require('pg');
  // poucas conexões: o banco pode ser compartilhado com outros sistemas (ex.: Supabase)
  const pool = new Pool({ connectionString: url, max: +process.env.PG_POOL_MAX || 3, ssl: process.env.PGSSL === 'false' ? false : { rejectUnauthorized: false } });
  // Esquema próprio: fora do "public", que o Supabase publica automaticamente pela API dele.
  const schema = process.env.PG_SCHEMA || 'mega_gestao';
  if (!/^[a-z_][a-z0-9_]*$/.test(schema)) throw new Error('PG_SCHEMA inválido: use letras minúsculas, números e _');
  const table = `"${schema}".mega_store`;
  return {
    name: `PostgreSQL (esquema ${schema})`,
    async load() {
      // só cria o esquema se faltar: um usuário de banco restrito não tem permissão para criar esquemas
      const ex = await pool.query('select 1 from pg_namespace where nspname = $1', [schema]);
      if (!ex.rowCount) await pool.query(`create schema "${schema}"`);
      await pool.query(`create table if not exists ${table} (id int primary key, data jsonb not null, updated_at timestamptz default now())`);
      // RLS sem políticas: bloqueia acesso pelas APIs públicas; o dono da tabela (este servidor) continua com acesso
      await pool.query(`alter table ${table} enable row level security`);
      const r = await pool.query(`select data from ${table} where id = 1`);
      return r.rows[0] ? r.rows[0].data : null;
    },
    async save(db) {
      await pool.query(`insert into ${table} (id, data, updated_at) values (1, $1, now()) on conflict (id) do update set data = excluded.data, updated_at = now()`, [JSON.stringify(db)]);
    },
  };
}

async function main() {
  const store = process.env.DATABASE_URL ? pgStore(process.env.DATABASE_URL) : fileStore();
  let db = (await store.load()) || core.emptyDb();

  let saveTimer = null, saving = Promise.resolve();
  const scheduleSave = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { saving = saving.then(() => store.save(db)).catch(e => console.error('Erro ao salvar:', e)); }, 250);
  };
  const flush = async () => { clearTimeout(saveTimer); await saving; await store.save(db); };

  const handle = core.createApi({
    hash: p => bcrypt.hash(p, 10),
    verify: (p, h) => (h ? bcrypt.compare(p, h) : Promise.resolve(false)),
    token: () => crypto.randomBytes(32).toString('hex'),
  });

  // limite de tentativas de login: 10 erros a cada 15 minutos por IP
  const fails = new Map();
  const blocked = ip => { const f = fails.get(ip); return f && f.n >= 10 && f.until > Date.now(); };
  const fail = ip => { const f = fails.get(ip); const now = Date.now(); if (!f || f.until < now) fails.set(ip, { n: 1, until: now + 15 * 60e3 }); else f.n++; };

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '15mb' }));
  app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'SAMEORIGIN');
    res.set('Referrer-Policy', 'same-origin');
    next();
  });

  // as requisições à API rodam uma de cada vez, para não haver gravações concorrentes
  let queue = Promise.resolve();
  app.use('/api', (req, res) => {
    queue = queue.then(async () => {
      try {
        const route = '/api' + req.path.replace(/\/+$/, '');
        if (route === '/api/login' && blocked(req.ip)) return res.status(429).json({ error: 'Muitas tentativas. Aguarde 15 minutos e tente de novo.' });
        const tok = ((req.headers.cookie || '').split(';').map(c => c.trim()).find(c => c.startsWith(COOKIE + '=')) || '').slice(COOKIE.length + 1);
        const r = await handle(db, tok || null, req.method, route, req.body);
        if (route === '/api/login' && r.status === 401) fail(req.ip);
        const secure = req.secure ? '; Secure' : '';
        if (r.setToken) res.set('Set-Cookie', `${COOKIE}=${r.setToken}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${30 * 86400}${secure}`);
        if (r.clearToken) res.set('Set-Cookie', `${COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure}`);
        if (req.method !== 'GET' && !r.readonly) scheduleSave();
        res.set('Cache-Control', 'no-store');
        res.status(r.status).json(r.json);
      } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Erro interno no servidor.' });
      }
    });
  });

  app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

  const server = app.listen(PORT, () => {
    console.log(`MEGA Gestão rodando em http://localhost:${PORT}`);
    console.log(`Dados salvos em: ${store.name}`);
    if (!db.users.length) console.log('Primeiro acesso: abra o endereço acima e crie a conta do administrador.');
  });
  const stop = async () => { server.close(); await flush().catch(() => {}); process.exit(0); };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

main().catch(e => { console.error(e); process.exit(1); });
