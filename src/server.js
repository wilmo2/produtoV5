require('dotenv').config()
const session = require('express-session')
const express = require('express')
const helmet = require('helmet')
const cors = require('cors')
const path = require('path')

const app = express()

// Porta de teste
const PORT = process.env.PORT || 4000

// Middlewares de segurança
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: false,
}))
app.use(cors())

// Permitir receber dados de formulário
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

// Arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')))

app.use(session({
  secret: process.env.SESSION_SECRET || 'inquerito_secreto_wxt_2026',
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  }
}))

// Supabase Client para API
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');
const crypto = require('crypto');
const upload = multer({ storage: multer.memoryStorage() });

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://liwlkstsfmjrpzupniux.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxpd2xrc3RzZm1qcnB6dXBuaXV4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMxMjA4NiwiZXhwIjoyMDgzODg4MDg2fQ.z6cMtMwOjYQqsjrFcKTsmmBQD0qL9rrfLhQRGSAK17g';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// API de Pagamento Integrada
app.post('/api/visitor', async (req, res) => {
  const visitor_id = crypto.randomUUID();
  await supabase.from('visitors').insert({ id: visitor_id, status: 'free', paid_until: null });
  res.json({ visitor_id });
});

app.get('/api/access/:id', async (req, res) => {
  const { id } = req.params;
  
  // Sincroniza o visitor_id com a sessão do servidor
  if (req.session) {
    req.session.visitor_id = id;
  }

  const { data: visitor } = await supabase.from('visitors').select('status, paid_until').eq('id', id).single();
  if (!visitor) return res.json({ access: false });
  
  const now = new Date();
  const paidUntil = visitor.paid_until ? new Date(visitor.paid_until) : null;
  const access = visitor.status === 'paid' && paidUntil && paidUntil > now;
  
  res.json({ access, paid_until: visitor.paid_until });
});

app.get('/api/payment/status/:visitor_id', async (req, res) => {
  const { visitor_id } = req.params;
  const { data } = await supabase.from('payment_requests').select('status').eq('visitor_id', visitor_id).order('created_at', { ascending: false }).limit(1).single();
  res.json({ status: data ? data.status : 'none' });
});

app.post('/api/payment', upload.single('receipt'), async (req, res) => {
  const { name, whatsapp, visitor_id } = req.body;
  if (!req.file) return res.status(400).json({ error: 'Comprovante obrigatório' });
  const fileName = `${Date.now()}_${req.file.originalname}`;
  await supabase.storage.from('receipts').upload(fileName, req.file.buffer, { contentType: req.file.mimetype });
  await supabase.from('payment_requests').insert({ visitor_id, name, whatsapp: whatsapp.replace(/\D/g, ''), receipt_path: fileName, status: 'pending' });
  res.json({ ok: true });
});

app.get('/api/admin/payments', async (req, res) => {
  const { data, error } = await supabase.from('payment_requests').select('id, name, whatsapp, visitor_id, receipt_path').eq('status', 'pending');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

app.post('/api/admin/approve', async (req, res) => {
  const { payment_id, visitor_id } = req.body;
  await supabase.from('payment_requests').update({ status: 'approved' }).eq('id', payment_id);
  const paidUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const { data: visitor } = await supabase.from('visitors').select('id').eq('id', visitor_id).single();
  if (!visitor) {
    await supabase.from('visitors').insert({ id: visitor_id, status: 'paid', paid_until: paidUntil.toISOString() });
  } else {
    await supabase.from('visitors').update({ status: 'paid', paid_until: paidUntil.toISOString() }).eq('id', visitor_id);
  }
  res.json({ ok: true });
});

app.post('/api/recover', async (req, res) => {
  let { whatsapp } = req.body;
  if (!whatsapp) return res.json({ ok: false });
  const { data: payment } = await supabase.from('payment_requests').select('visitor_id').eq('whatsapp', whatsapp.replace(/\D/g, '')).eq('status', 'approved').order('created_at', { ascending: false }).limit(1).single();
  if (!payment) return res.json({ ok: false });
  res.json({ ok: true, visitor_id: payment.visitor_id });
});

// Rotas do Site
const indexRoutes = require('./routes/index.routes')
app.use('/', indexRoutes)
/*
// Servidor (Local)
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`)
  })
}
*/


app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});


// Exportar para Vercel
module.exports = app;