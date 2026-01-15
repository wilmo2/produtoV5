const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

exports.verificarAcesso = async (req, res, next) => {
  if (!req.session || !req.session.inqueritoOK) {
    return res.redirect('/');
  }

  const visitor_id = req.session.visitor_id;
  if (!visitor_id) {
    return res.redirect('/pagamento');
  }

  try {
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
  return res.redirect('/');
};
