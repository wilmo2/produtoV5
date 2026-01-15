const express = require('express')
const router = express.Router()

const auth = require('../middlewares/auth.middleware')
const indexController = require('../controllers/index.controller')
const path = require('path')

// Inquérito (LIVRE)
router.get('/', indexController.home)
router.post('/inquerito', indexController.handleForm)

// Pagamento e Admin
router.get('/pagamento', auth.verificarInquerito, indexController.pagamento)
router.get('/admin', indexController.admin)
router.get('/recover', indexController.recover)

// Tela principal (PROTEGIDA POR PAGAMENTO)
router.get('/home', auth.verificarAcesso, indexController.mainPage)

// Páginas (PROTEGIDAS POR PAGAMENTO)
router.get('/pagina1', auth.verificarAcesso, indexController.pagina1)
router.get('/pagina2', auth.verificarAcesso, indexController.pagina2)
router.get('/pagina3', auth.verificarAcesso, indexController.pagina3)

// Página do Criador (LIVRE)
router.get('/criador', indexController.criador)
router.get('/privacidade', (req, res) => res.sendFile(path.join(__dirname, '../views/privacidade.html')))
router.get('/gratis', (req, res) => res.sendFile(path.join(__dirname, '../views/gratis.html')))

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// API de busca e download (PROTEGIDAS POR PAGAMENTO)
router.get('/api/search', auth.verificarAcesso, indexController.apiSearch)
router.get('/api/info', auth.verificarAcesso, indexController.apiInfo)

// Suporte IA (LIVRE)
router.post('/api/support', indexController.apiSupport)

module.exports = router