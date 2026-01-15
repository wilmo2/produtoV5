require('dotenv').config()
const session = require('express-session')
const express = require('express')
const helmet = require('helmet')
const cors = require('cors')
const path = require('path')
const rateLimit = require('express-rate-limit')
const { createClient } = require('@supabase/supabase-js')
const multer = require('multer')
const crypto = require('crypto')
const axios = require('axios')



const app = express()

// Configurações de Ambiente
const PORT = process.env.PORT || 4000
const isProd = process.env.NODE_ENV === 'production'

// 1. Rate Limiting - Proteção contra DoS e Brute Force
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Limite de 100 requisições por IP
  message: 'Muitas requisições vindas deste IP, por favor tente novamente após 15 minutos.'
})
app.use('/api/', limiter)

// 2. Middlewares de segurança (Helmet com CSP)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https://i.ibb.co", "https://*.supabase.co", "https://*.xnxx-cdn.com", "https://*.phncdn.com"],
      connectSrc: ["'self'", "https://*.supabase.co", "https://*.vercel.app"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
}))

app.use(cors())
app.set('trust proxy', 1)

// 3. Configuração de Sessão Segura
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: '__Host-wxt.sid', // Prefixo de segurança para cookies
  cookie: { 
    secure: isProd,
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  }
}))

app.use(express.urlencoded({ extended: true, limit: '10kb' }))
app.use(express.json({ limit: '10kb' }))
app.use(express.static(path.join(__dirname, 'public')))

// 4. Supabase Client Seguro
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('ERRO CRÍTICO: Credenciais do Supabase não configuradas no .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// 5. Upload Seguro com Multer
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // Limite de 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Apenas imagens (JPG, PNG) são permitidas.'));
    }
  }
});

// API de Pagamento Integrada
app.post('/api/visitor', async (req, res) => {
  try {
    const visitor_id = crypto.randomUUID();
    await supabase.from('visitors').insert({ id: visitor_id, status: 'free', paid_until: null });
    res.json({ visitor_id });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar visitante' });
  }
});

app.get('/api/access/:id', async (req, res) => {
  const { id } = req.params;
  if (req.session) req.session.visitor_id = id;

  try {
    const { data: visitor } = await supabase.from('visitors').select('status, paid_until').eq('id', id).single();
    if (!visitor) return res.json({ access: false });
    
    const now = new Date();
    const paidUntil = visitor.paid_until ? new Date(visitor.paid_until) : null;
    const access = visitor.status === 'paid' && paidUntil && paidUntil > now;
    
    res.json({ access, paid_until: visitor.paid_until });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao verificar acesso' });
  }
});

app.get('/api/payment/status/:visitor_id', async (req, res) => {
  const { visitor_id } = req.params;
  try {
    const { data } = await supabase.from('payment_requests').select('status').eq('visitor_id', visitor_id).order('created_at', { ascending: false }).limit(1).single();
    res.json({ status: data ? data.status : 'none' });
  } catch (error) {
    res.json({ status: 'none' });
  }
});

app.post('/api/payment', upload.single('receipt'), async (req, res) => {
  const { name, whatsapp, visitor_id } = req.body;
  if (!req.file) return res.status(400).json({ error: 'Comprovante obrigatório' });
  
  try {
    const fileName = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}_${req.file.originalname}`;
    const { error: uploadError } = await supabase.storage.from('receipts').upload(fileName, req.file.buffer, { contentType: req.file.mimetype });
    
    if (uploadError) throw uploadError;

    await supabase.from('payment_requests').insert({ 
      visitor_id, 
      name, 
      whatsapp: whatsapp.replace(/\D/g, ''), 
      receipt_path: fileName, 
      status: 'pending' 
    });
    res.json({ ok: true });
  } catch (error) {
    console.error('Erro no upload:', error);
    res.status(500).json({ error: 'Falha ao processar pagamento' });
  }
});

// Middleware de Proteção Admin (Simples para este projeto)
const adminAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader === `Bearer ${process.env.ADMIN_PASSWORD}`) {
    return next();
  }
  res.status(401).json({ error: 'Não autorizado' });
};

app.get('/api/admin/payments', adminAuth, async (req, res) => {
  try {
    const { data, error } = await supabase.from('payment_requests').select('id, name, whatsapp, visitor_id, receipt_path').eq('status', 'pending');
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar pagamentos' });
  }
});

app.post('/api/admin/approve', adminAuth, async (req, res) => {
  const { payment_id, visitor_id } = req.body;
  try {
    await supabase.from('payment_requests').update({ status: 'approved' }).eq('id', payment_id);
    const paidUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    
    const { data: visitor } = await supabase.from('visitors').select('id').eq('id', visitor_id).single();
    if (!visitor) {
      await supabase.from('visitors').insert({ id: visitor_id, status: 'paid', paid_until: paidUntil.toISOString() });
    } else {
      await supabase.from('visitors').update({ status: 'paid', paid_until: paidUntil.toISOString() }).eq('id', visitor_id);
    }
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao aprovar pagamento' });
  }
});

app.post('/api/recover', async (req, res) => {
  let { whatsapp } = req.body;
  if (!whatsapp) return res.json({ ok: false });
  try {
    const { data: payment } = await supabase.from('payment_requests').select('visitor_id').eq('whatsapp', whatsapp.replace(/\D/g, '')).eq('status', 'approved').order('created_at', { ascending: false }).limit(1).single();
    if (!payment) return res.json({ ok: false });
    res.json({ ok: true, visitor_id: payment.visitor_id });
  } catch (error) {
    res.json({ ok: false });
  }
});

// Rotas do Site
const indexRoutes = require('./routes/index.routes')
app.use('/', indexRoutes)

app.get('/ping', (req, res) => res.send('pong'));

// Keep-Alive
const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL;
if (RENDER_EXTERNAL_URL) {
  setInterval(() => {
    axios.get(`${RENDER_EXTERNAL_URL}/ping`).catch(() => {});
  }, 14 * 60 * 1000);
}

// 6. Middleware Global de Erro
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: isProd ? 'Ocorreu um erro interno no servidor.' : err.message 
  });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`)
})
