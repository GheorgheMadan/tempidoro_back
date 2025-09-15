const connection = require('../database/db');

const filtersPerCategoria = {
    // filtri comuni a (quasi) tutte le categorie
    comuni: [
        { key: 'brand', tab: 'brands', via: 'products.marca_id = brands.id' },
        { key: 'material', tab: 'materiale', via: 'products_detail.materiale_id = materiale.id' },
        { key: 'finish', tab: 'finitura', via: 'products_detail.finitura_id = finitura.id' },
        { key: 'color', tab: 'colore', via: 'products_detail.colore_id = colore.id' },
        { key: 'type', tab: 'tipologia', via: 'products_detail.tipologia_id = tipologia.id' },
        { key: 'collection', tab: 'collezione', via: 'products_detail.collezione_id = collezione.id' },
        { key: 'genre', tab: 'genere', via: 'products_detail.genere_id = genere.id' },
    ],

    // specifici per famiglia
    orologi: [
        { key: 'materiale_cassa', tab: 'materiale_cassa', via: 'orologi_detail.materiale_cassa_id = materiale_cassa.id', need: 'orologi_detail' },
        { key: 'materiale_cinturino', tab: 'materiale_cinturino', via: 'orologi_detail.materiale_cinturino_id = materiale_cinturino.id', need: 'orologi_detail' },
        { key: 'tipologia_movimento', tab: 'tipologia_movimento', via: 'orologi_detail.tipologia_movimento_id = tipologia_movimento.id', need: 'orologi_detail' },
        { key: 'tipologia_cinturino', tab: 'tipologia_cinturino', via: 'orologi_detail.tipologia_cinturino_id = tipologia_cinturino.id', need: 'orologi_detail' },
    ],

    cinturini: [
        { key: 'misura_ansa', tab: 'misura_ansa', via: 'orologi_detail.misura_ansa_id = misura_ansa.id', need: 'orologi_detail' },
        { key: 'tipologia_cinturino', tab: 'tipologia_cinturino', via: 'orologi_detail.tipologia_cinturino_id = tipologia_cinturino.id', need: 'orologi_detail' },
    ],

    gioielli: [
        { key: 'pietre', tab: 'pietre', via: 'gioielli_detail.pietre_id = pietre.id', need: 'gioielli_detail' },
        { key: 'misura_anello', tab: 'misura_anello', via: 'gioielli_detail.misura_anello_id = misura_anello.id', need: 'gioielli_detail' },
        { key: 'modello_gioielleria', tab: 'modello_gioielleria', via: 'gioielli_detail.modello_gioielleria_id = modello_gioielleria.id', need: 'gioielli_detail' },
    ],

    occhiali: [
        { key: 'tipo_lenti', tab: 'tipo_lenti', via: 'occhiali_detail.tipo_lenti_id = tipo_lenti.id', need: 'occhiali_detail' },
    ],
};

// mappa delle categorie → quali gruppi includere
const gruppiPerCategoria = {
    orologi: ['comuni', 'Orologi'],
    cinturini: ['comuni', 'Cinturini'],
    anelli: ['comuni', 'Gioielli'],
    bracciali: ['comuni', 'Gioielli'],
    collane: ['comuni', 'Gioielli'],
    ciondoli: ['comuni', 'Gioielli'],
    orecchini: ['comuni', 'Gioielli'],
    portachiavi: ['comuni', 'Gioielli'],
    cavigliere: ['comuni', 'Gioielli'],
    preziosi: ['comuni', 'Gioielli'],
    montature_da_vista: ['comuni', 'Occhiali'],
    occhiali_da_sole: ['comuni', 'Occhiali'],
    outlet: ['comuni', 'Orologi', 'Cinturini', 'Gioielli', 'Occhiali'],
    sveglie: ['comuni'],
    orologi_da_parete: ['comuni']
};

function buildDistinctQuery({ categoria, key, tab, via, need }) {
    // base: products + categories + products_detail
    let sql = `
    SELECT DISTINCT ${tab}.name AS value
    FROM products
    JOIN categories ON categories.id = products.category_id
    LEFT JOIN products_detail ON products_detail.prodotto_id = products.id
  `;

    // join opzionali a seconda del filtro
    if (need === 'orologi_detail') {
        sql += `\nLEFT JOIN orologi_detail ON orologi_detail.prodotto_id = products.id`;
    }
    if (need === 'gioielli_detail') {
        sql += `\nLEFT JOIN gioielli_detail ON gioielli_detail.prodotto_id = products.id`;
    }
    if (need === 'occhiali_detail') {
        sql += `\nLEFT JOIN occhiali_detail ON occhiali_detail.prodotto_id = products.id`;
    }

    // join della tabella dizionario specifica
    sql += `\nLEFT JOIN ${tab} ON ${via}`;

    // filtro categoria + non null/empty
    sql += `
    WHERE categories.category_name = ?
      AND ${tab}.name IS NOT NULL
      AND ${tab}.name != ''
    ORDER BY ${tab}.name ASC
  `;

    return { sql, params: [categoria], key };
}

// 👇 reso async e convertito alle promise
const getCategoryFilters = async (req, res) => {
    const categoria = req.params.category_name || req.query.categoria;

    if (!categoria) {
        return res.status(400).json({ error: "Categoria mancante" });
    }
    if (!gruppiPerCategoria[categoria]) {
        return res.status(400).json({ error: "Categoria non supportata" });
    }

    // compongo la lista dei filtri da estrarre per questa categoria
    const gruppi = gruppiPerCategoria[categoria];
    const filtriDaFare = [
        ...filtersPerCategoria.comuni,
        ...gruppi
            .filter(g => g !== 'comuni')
            .flatMap(g => filtersPerCategoria[g] || [])
    ];

    try {
        // 👇 eseguo tutte le query in parallelo con Promise.all e await
        const parts = await Promise.all(
            filtriDaFare.map(async (def) => {
                const queryDef = buildDistinctQuery({ categoria, ...def });
                const [rows] = await connection.query(queryDef.sql, queryDef.params); // 👈 niente callback
                return { key: def.key, values: rows.map(r => r.value) };
            })
        );

        // raggruppo in un oggetto { key: array }
        const filters = {};
        for (const p of parts) {
            // includo solo se esiste almeno un valore
            if (p.values && p.values.length) {
                filters[p.key] = p.values;
            }
        }
        return res.json({ category_name: categoria, filters });
    } catch (err) {
        console.error('❌ Errore durante la query filtri:', err);
        return res.status(500).json({ error: 'Errore nel recupero dei filtri' });
    }
};

// 👇 reso async e convertito alle promise
const showCategories = async (req, res) => {

    const sql = `select * from categories`;

    try {
        const [results] = await connection.query(sql); // 👈 niente callback
        if (results.length === 0) {
            return res.status(404).json({ message: "Nessuna categoria trovata" });
        }
        return res.json({ results });
    } catch (err) {
        console.error("❌ Errore durante il recupero delle categorie:", err);
        return res.status(500).json({ error: "Errore interno del server" });
    }
}

const ALLOWED_TABLES = [
    "brands",
    "categories",
    "collezione",
    "colore",
    "finitura",
    "genere",
    "materiale",
    "materiale_cassa",
    "materiale_cinturino",
    "misura_ansa",
    "misura_anello",
    "modello_gioielleria",
    "pietre",
    "tipo_lenti",
    "tipologia",
    "tipologia_cinturino",
    "tipologia_movimento"
];

const showTableData = async (req, res) => {
    const tableName = req.params.table_name;

    if (!tableName) {
        return res.status(400).json({ error: "Nome tabella mancante" });
    }

    if (!ALLOWED_TABLES.includes(tableName)) {
        return res.status(400).json({ error: "Tabella non permessa" });
    }

    const sql = "SELECT * FROM ??"; // 👈 usa ?? per i nomi di tabella
    try {
        const [results] = await connection.query(sql, [tableName]);
        if (results.length === 0) {
            return res.status(404).json({ message: "Nessun dato trovato" });
        }
        return res.json({ results });
    } catch (err) {
        console.error("❌ Errore durante il recupero dei dati della tabella:", err);
        return res.status(500).json({ error: "Errore interno del server" });
    }
};


module.exports = { getCategoryFilters, showCategories, showTableData };
