const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://liwlkstsfmjrpzupniux.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxpd2xrc3RzZm1qcnB6dXBuaXV4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMxMjA4NiwiZXhwIjoyMDgzODg4MDg2fQ.z6cMtMwOjYQqsjrFcKTsmmBQD0qL9rrfLhQRGSAK17g';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

exports.verificarAcesso = async (req, res, next) => {
  // 1. Verificar se passou pelo inquérito
  if (!req.session || !req.session.inqueritoOK) {
    console.log('Acesso negado: inqueritoOK ausente na sessão');
    return res.redirect('/');
  }

  // 2. Verificar se tem visitor_id na sessão
  const visitor_id = req.session.visitor_id;
  if (!visitor_id) {
    return res.redirect('/pagamento');
  }

  try {
    // 3. Verificar status no Supabase
    const { data: visitor, error } = await supabase
      .from('visitors')
      .select('status, paid_until')
      .eq('id', visitor_id)
      .single();

    if (error || !visitor) {
      return res.redirect('/pagamento');
    }

    const now = new Date();
    const paidUntil = visitor.paid_until ? new Date(visitor.paid_until) : null;

    const hasAccess = visitor.status === 'paid' && paidUntil && paidUntil > now;

    if (hasAccess) {
      req.session.paid_until = visitor.paid_until;
      return next();
    } else {
      return res.redirect('/pagamento');
    }
  } catch (err) {
    console.error('Erro ao verificar acesso:', err);
    return res.redirect('/pagamento');
  }
};

exports.verificarInquerito = (req, res, next) => {
  if (req.session && req.session.inqueritoOK) {
    return next();
  }
  console.log('Acesso negado ao pagamento: inqueritoOK ausente');
  return res.redirect('/');
};
