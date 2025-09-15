const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

const productsRouter = require('./routers/productsRouters');
const categoryFilterRouter = require('./routers/categoryFilterRouter');

// Middleware per abilitare CORS solo da localhost:5173 (frontend Vite tipico)
app.use(cors([{ origin: "http://localhost:5173" },
{ origin: "http://localhost:5174" }])); // Aggiungi altri domini se necessario      

// Middleware per il parsing del JSON nel corpo delle richieste
app.use(express.json());

// Importo il router dei prodotti
app.use('/api/products', productsRouter);

app.use('/api/category-filters', categoryFilterRouter);

// Rotta di test base
app.get('/', (req, res) => {
    res.send('🚀 Server Express attivo e funzionante! 🎉');
});

app.listen(port, () => {
    console.log(`✅ Server is running on port ${port}! http://localhost:${port} 🚀`);
});