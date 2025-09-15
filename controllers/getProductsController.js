const connection = require('../database/db');
const {
  getCategoryQueryParts,
  getCommonSelectFields,
  formatBooleans,
  getOrderClause
} = require('../utils/productQueryBuilder'); // importa le utility

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Funzione per mostrare i prodotti in base alla categoria
// Questa funzione gestisce la richiesta GET per ottenere i prodotti filtrati per categoria
// Questa funzione gestisce la richiesta GET per ottenere i prodotti filtrati per categoria

const getProducts = async (req, res) => {
  // Estrai categoria, limit e offset dai parametri della query
  const {
    search = "",
    categoria,
    limit = 40,
    offset = 0,
    order,
    brand,
    isPromo,
    genre,
    collection,
    material,
    isNew,
    finish,
    color,
    type,
    isEvidence,
    materiale_cassa,
    materiale_cinturino,
    misura_ansa,
    tipologia_movimento,
    tipologia_cinturino,
    misura_anello,
    pietre
  } = req.query;

  const isGlobal = !categoria;

  // Ottieni join SQL e campi extra specifici in base alla categoria richiesta
  const { join, fields } = isGlobal ? { join: "", fields: "" } : getCategoryQueryParts(categoria);

  const params = isGlobal ? [] : [categoria];

  let filters = "";

  // filtri che vengono applicate sulle varie categorie in contemporanea
  if (brand) {
    filters += ` AND LOWER(brands.name) = LOWER(?)`;
    params.push(brand);
  }
  if (genre) {
    filters += ` AND LOWER(genere.name) = LOWER(?)`;
    params.push(genre);
  }
  if (collection) {
    filters += ` AND LOWER(collezione.name) = LOWER(?)`;
    params.push(collection);
  }
  if (material) {
    filters += ` AND LOWER(materiale.name) = LOWER(?)`;
    params.push(material);
  }
  if (finish) {
    filters += ` AND LOWER(finitura.name) = LOWER(?)`;
    params.push(finish);
  }
  if (color) {
    filters += ` AND LOWER(colore.name) = LOWER(?)`;
    params.push(color);
  }
  if (type) {
    filters += ` AND LOWER(tipologia.name) = LOWER(?)`;
    params.push(type);
  }

  if (search.trim()) {
    filters += ` AND (products.title LIKE ? OR brands.name LIKE ? OR categories.category_name LIKE ?)`;
    const keyword = `%${search.trim()}%`;
    params.push(keyword, keyword, keyword);
  }

  // filtri applicati senza categoria 
  if (isGlobal) {
    const evidenzaCondizioni = [];

    if (isPromo === 'true') {
      evidenzaCondizioni.push(`products.in_promozione = 1`);
    }

    if (isNew === 'true') {
      evidenzaCondizioni.push(`products_detail.novita = 1`);
    }

    if (isEvidence === 'true') {
      evidenzaCondizioni.push(`products.in_evidenza = 1`);
    }

    if (evidenzaCondizioni.length > 0) {
      filters += ` AND (${evidenzaCondizioni.join(' OR ')})`;
    }
  } else {
    // Se invece c'è la categoria, procedi come prima
    if (isPromo) {
      filters += ` AND products.in_promozione = ?`;
      params.push(isPromo === 'true' ? 1 : 0);
    }

    if (isNew) {
      filters += ` AND products_detail.novita = ?`;
      params.push(isNew === 'true' ? 1 : 0);
    }

    if (isEvidence) {
      filters += ` AND products.in_evidenza = ?`;
      params.push(isEvidence === 'true' ? 1 : 0);
    }
  }

  // FILTRI CATEGORIA OROLOGI
  if (categoria === "orologi" || categoria === 'outlet') {
    if (materiale_cassa) {
      filters += ` AND LOWER(materiale_cassa.name) = LOWER(?)`;
      params.push(materiale_cassa);
    }
    if (tipologia_movimento) {
      filters += ` AND LOWER(tipologia_movimento.name) = LOWER(?)`;
      params.push(tipologia_movimento);
    }
  }

  // FILTRI CATEGORIA OROLOGI E CINTURINI
  if (categoria === "orologi" || categoria === 'cinturini' || categoria === 'outlet') {
    if (materiale_cinturino) {
      filters += ` AND LOWER(materiale_cinturino.name) = LOWER(?)`;
      params.push(materiale_cinturino);
    }
    if (tipologia_cinturino) {
      filters += ` AND LOWER(tipologia_cinturino.name) = LOWER(?)`;
      params.push(tipologia_cinturino);
    }
  }

  // FILTRI CATEGORIA CINTURINI
  if (categoria === 'cinturini' || categoria === 'outlet') {
    if (misura_ansa) {
      filters += ` AND LOWER(misura_ansa.name) = LOWER(?)`;
      params.push(misura_ansa);
    }
  }

  // FILTRI GIOIELLERIA 
  if (
    categoria === 'anelli' ||
    categoria === 'bracciali' ||
    categoria === 'cavigliere' ||
    categoria === 'ciondoli' ||
    categoria === 'collane' ||
    categoria === 'orecchini' ||
    categoria === 'portachiavi' ||
    categoria === 'preziosi' ||
    categoria === 'outlet'
  ) {
    if (pietre) {
      filters += ` AND LOWER(pietre.name) = LOWER(?)`;
      params.push(pietre);
    }
  }

  // categoria anelli e outlet
  if (categoria === 'anelli' || categoria === 'outlet') {
    if (misura_anello) {
      filters += ` AND LOWER(misura_anello.name) = LOWER(?)`;
      params.push(misura_anello);
    }
  }

  // ===============================
  // Costruisci la query SQL principale per ottenere i prodotti
  // ===============================

  // 1) Inserisco i campi extra di categoria PRIMA di "from products"
  const baseSelect = getCommonSelectFields();
  const selectWithExtras = fields
    ? baseSelect.replace(/\nfrom products\s/i, `,\n${fields}\nfrom products `)
    : baseSelect;

  // 2) Ora aggiungo i JOIN extra e il WHERE
  const query = `
    ${selectWithExtras}           -- Campi comuni + (eventuali) campi specifici categoria
    ${join}                       -- Join extra dinamica se necessaria (es. orologi_detail)
    ${isGlobal ? "WHERE 1=1" : "WHERE categories.category_name = ?"}${filters}  -- Filtro per categoria + eventuali filtri
    ${getOrderClause(order)}      -- Clausola di ordinamento
    LIMIT ? OFFSET ?              -- Paginazione
  `;

  // Aggiungi limit e offset alla query principale
  params.push(parseInt(limit), parseInt(offset));

  // Ricrea params, ma senza limit e offset (che sono solo per la query principale)
  const countParams = params.slice(0, -2); // ultimi 2 sono limit e offset

  // Costruisci la query separata per contare il numero totale di prodotti
  const countQuery = `
  SELECT COUNT(DISTINCT products.id) AS total
  FROM products
  JOIN categories ON categories.id = products.category_id
  LEFT JOIN brands ON brands.id = products.marca_id
  LEFT JOIN products_detail ON products_detail.prodotto_id = products.id 
  LEFT JOIN materiale ON materiale.id = products_detail.materiale_id
  LEFT JOIN finitura ON finitura.id = products_detail.finitura_id
  LEFT JOIN tipologia ON tipologia.id = products_detail.tipologia_id
  LEFT JOIN collezione ON collezione.id = products_detail.collezione_id
  LEFT JOIN genere ON genere.id = products_detail.genere_id
  LEFT JOIN colore ON colore.id = products_detail.colore_id
  ${join}
  ${isGlobal ? "WHERE 1=1" : "WHERE categories.category_name = ?"}${filters}
`;

  try {
    // 👇 eseguo la query principale con await (PROMISE client, niente callback)
    const [results] = await connection.query(query, params);

    // Se non ci sono risultati, restituisci errore 404 (Not Found)
    if (results.length === 0) {
      return res.status(404).json({ error: 'Nessun prodotto trovato per questa categoria' });
    }

    // 👇 eseguo la query di conteggio con await
    const [countResult] = await connection.query(countQuery, countParams);

    // Estrai il numero totale di prodotti trovati
    const total = countResult[0]?.total ?? 0; // 👈 aggiungo null-check per sicurezza

    // Converti i campi booleani da 0/1 → true/false
    const formatted = results.map(formatBooleans);

    // Rispondi al client con i dati formattati e la paginazione
    res.json({
      total,                          // Numero totale di risultati per quella categoria
      limit: parseInt(limit),         // Limite per pagina (default 40)
      offset: parseInt(offset),       // Offset (quanti prodotti saltare)
      results: formatted              // Array dei prodotti trovati
    });
  } catch (err) {
    // 👇 gestione errori centralizzata con try/catch
    console.error('❌ Errore durante la query dei prodotti:', err);
    return res.status(500).json({ error: 'Errore interno del server' });
  }
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Funzione per mostrare un singolo prodotto dettagliato (anche con info extra per categoria)
const showProduct = async (req, res) => {
  const { id } = req.params; // Estrai l'id del prodotto dalla route (es: /api/products/123)

  // 0) Prima recupero la categoria del prodotto
  const getCategorySql = `
    SELECT categories.category_name AS categoria
    FROM products
    JOIN categories ON categories.id = products.category_id
    WHERE products.id = ?
  `;

  try {
    // 👇 eseguo la query con await (client promise, niente callback)
    const [catRows] = await connection.query(getCategorySql, [id]);

    if (catRows.length === 0) {
      return res.status(404).json({ message: 'Prodotto non trovato' });
    }

    const categoria = catRows[0].categoria;

    // 1) Campi comuni
    const baseSelect = getCommonSelectFields();

    // 2) Join/campi extra in base alla categoria
    const { join, fields } = getCategoryQueryParts(categoria);

    // 3) Inietto i campi extra PRIMA di "from products" solo se ci sono
    const selectWithExtras = fields
      ? baseSelect.replace(/\nfrom products\s/i, `,\n${fields}\nfrom products `)
      : baseSelect;

    // 4) Query finale: campi comuni + join extra della categoria
    const query = `
      ${selectWithExtras}        -- Campi comuni + (eventuali) campi specifici della categoria
      ${join}                    -- Join extra della categoria (es. orologi_detail / gioielli_detail / occhiali_detail)
      WHERE products.id = ?
    `;

    // 5) Esecuzione
    // 👇 eseguo anche questa con await
    const [results] = await connection.query(query, [id]);

    if (results.length === 0) {
      return res.status(404).json({ message: 'Prodotto non trovato' });
    }

    // 6) Boolean normalize
    const product = formatBooleans(results[0]);

    res.json(product);
  } catch (err) {
    // 👇 gestione errori centralizzata
    console.error('❌ Errore durante la query prodotto/categoria:', err);
    return res.status(500).json({ error: 'Errore interno del server' });
  }
};



/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


module.exports = { getProducts, showProduct };
