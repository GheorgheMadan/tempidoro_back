/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// PATCH: modifica prodotto (NO cambio categoria) — accetta ID o NOME e CREA se non esiste
const connection = require('../database/db');
const { getCategoryQueryParts, getCommonSelectFields, formatBooleans } = require('../utils/productQueryBuilder');

const norm = (s) => (s || '').toLowerCase().trim().replace(/\s+/g, '_');
const toBool = (v) => {
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (v === 'true' || v === '1' || v === 1) return 1;
    if (v === 'false' || v === '0' || v === 0) return 0;
    return undefined;
};

// bucket per tabella extra dalla categoria attuale
const CATEGORY_EXTRA = {
    orologi: {
        table: 'orologi_detail',
        fields: {
            materiale_cassa_id: { dict: 'materiale_cassa', byName: 'materiale_cassa' },
            materiale_cinturino_id: { dict: 'materiale_cinturino', byName: 'materiale_cinturino' },
            misura_ansa_id: { dict: 'misura_ansa', byName: 'misura_ansa' },
            tipologia_movimento_id: { dict: 'tipologia_movimento', byName: 'tipologia_movimento' },
            tipologia_cinturino_id: { dict: 'tipologia_cinturino', byName: 'tipologia_cinturino' },
        }
    },
    cinturini: {
        table: 'cinturini_detail',
        fields: {
            materiale_cinturino_id: { dict: 'materiale_cinturino', byName: 'materiale_cinturino' },
            misura_ansa_id: { dict: 'misura_ansa', byName: 'misura_ansa' },
            tipologia_cinturino_id: { dict: 'tipologia_cinturino', byName: 'tipologia_cinturino' },
        }
    },
    // gioielleria (anelli, bracciali, collane, orecchini, ciondoli, portachiavi, preziosi, cavigliere)
    gioielli: {
        table: 'gioielli_detail',
        fields: {
            pietre_id: { dict: 'pietre', byName: 'pietre' },
            misura_anello_id: { dict: 'misura_anello', byName: 'misura_anello' },
            modello_gioielleria_id: { dict: 'modello_gioielleria', byName: 'modello_gioielleria' },
        }
    },
    occhiali_da_sole: {
        table: 'occhiali_detail',
        fields: { tipo_lenti_id: { dict: 'tipo_lenti', byName: 'tipo_lenti' } }
    },
    montature_da_vista: {
        table: 'occhiali_detail',
        fields: { tipo_lenti_id: { dict: 'tipo_lenti', byName: 'tipo_lenti' } }
    }
};

const categoryBucket = (catNorm) => {
    if (catNorm === 'orologi') return 'orologi';
    if (catNorm === 'cinturini') return 'cinturini';
    if (['anelli', 'bracciali', 'cavigliere', 'ciondoli', 'collane', 'orecchini', 'portachiavi', 'preziosi'].includes(catNorm)) return 'gioielli';
    if (['occhiali_da_sole', 'montature_da_vista'].includes(catNorm)) return catNorm;
    return null;
};

// dentro TRANSAZIONE: restituisce id esistente o lo crea se mancante (richiede UNIQUE su name)
async function ensureDictId(trx, dictTable, name) {
    const value = String(name).trim();
    if (!value) return null;
    // 1) cerca
    const [found] = await trx.query(`SELECT id FROM ${dictTable} WHERE LOWER(name) = LOWER(?) LIMIT 1`, [value]);
    if (found.length) return found[0].id;
    // 2) crea
    const res = await trx.query(`INSERT INTO ${dictTable} (name) VALUES (?)`, [value]);
    // mysql2: res[0].insertId oppure res.insertId a seconda della versione
    const insertId = res[0]?.insertId ?? res.insertId;
    return insertId || null;
}

const updateProduct = async (req, res) => {
    const { id } = req.params;
    const data = req.body || {};

    // categoria NON modificabile: se arriva nel body, ignoro
    if (Object.prototype.hasOwnProperty.call(data, 'categoria')) delete data.categoria;

    // 0) categoria attuale
    const sqlCat = `
    SELECT p.id, c.category_name AS categoria
    FROM products p
    JOIN categories c ON c.id = p.category_id
    WHERE p.id = ?
  `;

    let trx;
    try {
        const [curr] = await connection.query(sqlCat, [id]);
        if (!curr.length) return res.status(404).json({ message: 'Prodotto non trovato' });

        const catName = curr[0].categoria;
        const catNorm = norm(catName);
        const bucket = categoryBucket(catNorm);
        const extraDef = bucket ? CATEGORY_EXTRA[bucket] : null;

        // 1) PREP products
        const P_FIELDS = [
            'title', 'price', 'discount', 'available', 'stock',
            'in_promozione', 'in_evidenza', 'codice', 'codice_ean', 'description', 'image'
        ];
        const pSet = [];
        const pArgs = [];
        for (const k of P_FIELDS) {
            if (Object.prototype.hasOwnProperty.call(data, k)) {
                let v = data[k];
                if (['available', 'in_promozione', 'in_evidenza'].includes(k)) {
                    const b = toBool(v); if (b === undefined) continue; v = b;
                }
                if (k === 'price' && v !== null && v !== '') v = Number(v);
                if (k === 'discount' && v !== null && v !== '') v = Number(v);
                if (k === 'stock' && v !== null && v !== '') v = parseInt(v, 10);
                pSet.push(`${k} = ?`);
                pArgs.push(v);
            }
        }

        // 2) PREP products_detail (ID o NOME)
        const D_COMMON = {
            materiale_id: { table: 'materiale', byName: 'materiale' },
            finitura_id: { table: 'finitura', byName: 'finitura' },
            tipologia_id: { table: 'tipologia', byName: 'tipologia' },
            collezione_id: { table: 'collezione', byName: 'collezione' },
            genere_id: { table: 'genere', byName: 'genere' },
            colore_id: { table: 'colore', byName: 'colore' },
        };
        const dSet = [];
        const dArgs = [];

        // testo libero su products_detail
        if (Object.prototype.hasOwnProperty.call(data, 'confezione')) { dSet.push(`confezione = ?`); dArgs.push(data.confezione); }
        if (Object.prototype.hasOwnProperty.call(data, 'garanzia')) { dSet.push(`garanzia = ?`); dArgs.push(data.garanzia); }
        if (Object.prototype.hasOwnProperty.call(data, 'codice_produttore')) { dSet.push(`codice_produttore = ?`); dArgs.push(data.codice_produttore); }
        if (Object.prototype.hasOwnProperty.call(data, 'novita')) {
            const b = toBool(data.novita); if (b !== undefined) { dSet.push(`novita = ?`); dArgs.push(b); }
        }

        // 3) PREP extra categoria (ID o NOME)
        const eSet = [];
        const eArgs = [];

        // TRANSAZIONE
        trx = await connection.getConnection();
        await trx.beginTransaction();

        // brand: marca_id diretto o 'brand' (nome) con creazione se mancante
        if (Object.prototype.hasOwnProperty.call(data, 'marca_id')) {
            pSet.push('marca_id = ?'); pArgs.push(parseInt(data.marca_id, 10) || null);
        } else if (Object.prototype.hasOwnProperty.call(data, 'brand')) {
            const nomeBrand = String(data.brand || '').trim();
            if (nomeBrand) {
                const brandId = await ensureDictId(trx, 'brands', nomeBrand);
                if (brandId) { pSet.push('marca_id = ?'); pArgs.push(brandId); }
            }
        }

        // comuni: se arriva *_id uso quello, altrimenti cerco/creo da nome
        for (const [idKey, meta] of Object.entries(D_COMMON)) {
            const byNameKey = meta.byName;
            if (Object.prototype.hasOwnProperty.call(data, idKey)) {
                dSet.push(`${idKey} = ?`); dArgs.push(data[idKey]);
            } else if (Object.prototype.hasOwnProperty.call(data, byNameKey)) {
                const dictId = await ensureDictId(trx, meta.table, data[byNameKey]);
                if (dictId) { dSet.push(`${idKey} = ?`); dArgs.push(dictId); }
            }
        }

        // extra per categoria attuale
        if (extraDef) {
            for (const [idKey, meta] of Object.entries(extraDef.fields)) {
                const byNameKey = meta.byName;
                if (Object.prototype.hasOwnProperty.call(data, idKey)) {
                    eSet.push(`${idKey} = ?`); eArgs.push(data[idKey]);
                } else if (byNameKey && Object.prototype.hasOwnProperty.call(data, byNameKey)) {
                    const dictId = await ensureDictId(trx, meta.dict, data[byNameKey]);
                    if (dictId) { eSet.push(`${idKey} = ?`); eArgs.push(dictId); }
                }
            }
        }

        // niente da aggiornare?
        if (pSet.length === 0 && dSet.length === 0 && eSet.length === 0) {
            await trx.rollback(); trx.release();
            return res.status(200).json({ message: 'Nessun campo da aggiornare' });
        }

        // UPDATE products
        if (pSet.length) {
            await trx.query(`UPDATE products SET ${pSet.join(', ')} WHERE id = ?`, [...pArgs, id]);
        }

        // UPSERT products_detail
        if (dSet.length) {
            const [pd] = await trx.query('SELECT prodotto_id FROM products_detail WHERE prodotto_id = ? LIMIT 1', [id]);
            if (!pd.length) {
                const cols = ['prodotto_id', ...dSet.map(s => s.split('=')[0].trim())];
                const ph = cols.map(() => '?').join(', ');
                await trx.query(`INSERT INTO products_detail (${cols.join(', ')}) VALUES (${ph})`, [id, ...dArgs]);
            } else {
                await trx.query(`UPDATE products_detail SET ${dSet.join(', ')} WHERE prodotto_id = ?`, [...dArgs, id]);
            }
        }

        // UPSERT extra categoria
        if (extraDef && eSet.length) {
            const key = 'prodotto_id';
            const [ex] = await trx.query(`SELECT ${key} FROM ${extraDef.table} WHERE ${key} = ? LIMIT 1`, [id]);
            if (!ex.length) {
                const cols = [key, ...eSet.map(s => s.split('=')[0].trim())];
                const ph = cols.map(() => '?').join(', ');
                await trx.query(`INSERT INTO ${extraDef.table} (${cols.join(', ')}) VALUES (${ph})`, [id, ...eArgs]);
            } else {
                await trx.query(`UPDATE ${extraDef.table} SET ${eSet.join(', ')} WHERE ${key} = ?`, [...eArgs, id]);
            }
        }

        await trx.commit();

        // RILETTURA
        const baseSelect = getCommonSelectFields();
        const { join, fields } = getCategoryQueryParts(catName);
        const selectWithExtras = fields
            ? baseSelect.replace(/\nfrom products\s/i, `,\n${fields}\nfrom products `)
            : baseSelect;

        const [rowsUpd] = await connection.query(`
      ${selectWithExtras}
      ${join}
      WHERE products.id = ?
    `, [id]);

        if (!rowsUpd.length) return res.status(200).json({
            message: 'Aggiornato, ma non trovato in rilettura',
            modifiedProduct: null
        });
        return res.json({
            message: 'Prodotto aggiornato con successo!',
            modifiedProduct: formatBooleans(rowsUpd[0])
        });
    } catch (err) {
        if (trx) { try { await trx.rollback(); } catch (_) { } }
        console.error('❌ updateProduct errore:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    } finally {
        if (trx) trx.release();
    }
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

module.exports = { updateProduct };
