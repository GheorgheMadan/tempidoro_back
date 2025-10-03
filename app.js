const express = require('express');
const cors = require('cors');
require('dotenv').config(); // Carica le variabili d'ambiente dal file .env

const app = express();
const port = process.env.PORT || 3000;

const productsRouter = require('./routers/productsRouters');
const categoryFilterRouter = require('./routers/categoryFilterRouter');
const authRouter = require('./routers/authRouter');
const adminRouter = require('./routers/adminRouter');


// Middleware per abilitare CORS solo da localhost:5173 (frontend Vite tipico)
app.use(cors([
    { origin: "http://localhost:5173" },
    { origin: "http://localhost:5174" }
]));

// Middleware per il parsing del JSON nel corpo delle richieste
app.use(express.json());

// Importo il router dei prodotti
app.use('/api/products', productsRouter);

// Importo il router per i filtri di categoria
app.use('/api/category-filters', categoryFilterRouter);

// Importo il router per l'autenticazione
app.use('/api/auth', authRouter);

// Importo il router per le funzionalità admin
app.use('/api/admin', adminRouter);

// Rotta di test base
app.get('/', (req, res) => {
    res.send('🚀 Server Express attivo e funzionante! 🎉');
});

app.listen(port, () => {
    console.log(`✅ Server is running on port ${port}! http://localhost:${port} 🚀`);
});