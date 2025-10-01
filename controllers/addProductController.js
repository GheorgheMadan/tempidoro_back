const connection = require('../database/db');
const { getOrInsert } = require('../utils/functions');

async function addProduct(req, res) {

    const product = req.body

    // Verifico che il prodotto sia stato inviato correttamente
    if (!product) return res.status(400).json({ message: 'I dati del prodotto sono obbligatori' });
    // Verifico che la categoria sia stata inserita
    if (!product.categoria) return res.status(400).json({ message: 'La categoria è obbligatoria' });

    // uso una transazione per inserire tutto in modo atomico
    const conn = await connection.getConnection();
    try {
        await conn.beginTransaction();

        // Creo la query per ottenere l'ID della categoria
        const sqlCategory = `SELECT * FROM categories WHERE category_name = ?`;

        // Eseguo la query per ottenere l'ID della categoria
        const [categoryResults] = await conn.query(sqlCategory, [product.categoria]);

        if (categoryResults.length === 0) {
            // se la categoria non esiste interrompo
            await conn.rollback();
            conn.release();
            return res.status(400).json({ message: 'Categoria non trovata' });
        }

        // Estraggo l'ID della categoria
        const categoryId = categoryResults[0].id;

        // Creo o ricavo l'ID del brand usando la funzione getOrInsert
        // (getOrInsert può accettare opzionalmente la connessione della transazione come terzo argomento)
        const brandId = await getOrInsert('brands', product.brand, conn);

        // prodotto da inserire nel db
        const productToInsert = {
            title: product.title,
            marca_id: brandId,
            codice: product.codice || null,
            price: Number(product.price),
            discount: product.discount ?? null,
            description: product.description || null,
            available: product.available ? 1 : 0,
            stock: Number(product.stock ?? 0),
            in_promozione: product.in_promozione ? 1 : 0,
            in_evidenza: product.in_evidenza ? 1 : 0,
            codice_ean: product.codice_ean || null,
            image: product.image || null,
            category_id: categoryId
        }

        // Creo la query per inserire il nuovo prodotto
        const sqlInsert = `INSERT INTO products 
        (title, marca_id, codice, price, discount, description, available, stock, in_promozione, in_evidenza, codice_ean, image, category_id) 
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`;

        // Eseguo la query per inserire il nuovo prodotto
        const [insertResults] = await conn.query(sqlInsert, [
            productToInsert.title,
            productToInsert.marca_id,
            productToInsert.codice,
            productToInsert.price,
            productToInsert.discount,
            productToInsert.description,
            productToInsert.available,
            productToInsert.stock,
            productToInsert.in_promozione,
            productToInsert.in_evidenza,
            productToInsert.codice_ean,
            productToInsert.image,
            productToInsert.category_id
        ]);

        // Ricavo o inserisco il materiale
        const materialeId = product.materiale ? await getOrInsert('materiale', product.materiale, conn) : null;

        // Ricavo o inserisco il colore
        const coloreId = product.colore ? await getOrInsert('colore', product.colore, conn) : null;

        // Ricavo o inserisco la finitura
        const finituraId = product.finitura ? await getOrInsert('finitura', product.finitura, conn) : null;

        // Ricavo o inserisco la tipologia
        const tipologiaId = product.tipologia ? await getOrInsert('tipologia', product.tipologia, conn) : null;

        // Ricavo o inserisco la collezione
        const collezioneId = product.collezione ? await getOrInsert('collezione', product.collezione, conn) : null;

        // Ricavo o inserisco il genere
        const genereId = product.genere ? await getOrInsert('genere', product.genere, conn) : null;

        // Ora hai tutti gli id necessari per products_detail
        const productDetailToInsert = {
            prodotto_id: insertResults.insertId, // 👈 l'ID che hai ottenuto da products
            materiale_id: materialeId,
            colore_id: coloreId,
            finitura_id: finituraId,
            tipologia_id: tipologiaId,
            collezione_id: collezioneId,
            genere_id: genereId
        }

        // Creo la query per inserire i dettagli
        const sqlInsertDetail = `INSERT INTO products_detail 
        (prodotto_id, confezione, garanzia, codice_produttore, novita, materiale_id, colore_id, genere_id, finitura_id, tipologia_id, collezione_id) 
        VALUES (?,?,?,?,?,?,?,?,?,?,?)`;

        // Eseguo la query per inserire i dettagli del prodotto
        await conn.query(sqlInsertDetail, [
            productDetailToInsert.prodotto_id,
            product.confezione || null,
            product.garanzia || null,
            product.codice_produttore || null,
            product.novita ? 1 : 0,
            productDetailToInsert.materiale_id,
            productDetailToInsert.colore_id,
            productDetailToInsert.genere_id,
            productDetailToInsert.finitura_id,
            productDetailToInsert.tipologia_id,
            productDetailToInsert.collezione_id
        ]);

        //=================================================================================//
        // Collegamento dettagli gioielleria         
        //=================================================================================//
        // ora verifico se ci sono le caratteristiche da inserire per categoria
        if (product.categoria === 'orologi' || product.categoria === 'outlet' || product.categoria === 'cinturini') {
            // ricavo gli id necessari
            const materialeCassaId = product.materiale_cassa
                ? await getOrInsert('materiale_cassa', product.materiale_cassa, conn)
                : null;
            const materialeCinturinoId = product.materiale_cinturino
                ? await getOrInsert('materiale_cinturino', product.materiale_cinturino, conn)
                : null;
            const tipologiaMovimentoId = product.tipologia_movimento
                ? await getOrInsert('tipologia_movimento', product.tipologia_movimento, conn)
                : null;
            const tipologiaCinturinoId = product.tipologia_cinturino
                ? await getOrInsert('tipologia_cinturino', product.tipologia_cinturino, conn)
                : null;
            const misuraAnsaId = product.misura_ansa
                ? await getOrInsert('misura_ansa', product.misura_ansa, conn)
                : null;

            // creo la query per inserire nel dettaglio orologi
            const sqlOrologiDetail = `
        INSERT INTO orologi_detail
        (prodotto_id, materiale_cassa_id, materiale_cinturino_id, tipologia_movimento_id, tipologia_cinturino_id, misura_ansa_id)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

            await conn.query(sqlOrologiDetail, [
                insertResults.insertId,      // id del prodotto
                materialeCassaId,
                materialeCinturinoId,
                tipologiaMovimentoId,
                tipologiaCinturinoId,
                misuraAnsaId
            ]);
        }
        //=================================================================================//

        //=================================================================================//
        // Collegamento dettagli gioielleria         
        //=================================================================================//
        if (product.categoria === 'portachiavi' ||
            product.categoria === 'outlet' ||
            product.categoria === 'ciondoli' ||
            product.categoria === 'collane' ||
            product.categoria === 'bracciali' ||
            product.categoria === 'cavigliere' ||
            product.categoria === 'anelli' ||
            product.categoria === 'preziosi' ||
            product.categoria === 'orecchini'
        ) {
            // ricavo gli id necessari
            const pietreId = product.pietre
                ? await getOrInsert('pietre', product.pietre, conn)
                : null;
            const misuraAnelloId = product.misura_anello
                ? await getOrInsert('misura_anello', product.misura_anello, conn)
                : null;
            const modelloGioielleriaId = product.modello_gioielleria
                ? await getOrInsert('modello_gioielleria', product.modello_gioielleria, conn)
                : null;

            // creo la query per inserire nel dettaglio orologi
            const sqlGioielliDetail = `
        INSERT INTO gioielli_detail
        (prodotto_id, pietre_id, misura_anello_id, modello_gioielleria_id)
        VALUES (?, ?, ?, ?)
    `;

            await conn.query(sqlGioielliDetail, [
                insertResults.insertId,      // id del prodotto
                pietreId,
                misuraAnelloId,
                modelloGioielleriaId
            ]);
        }
        //=================================================================================//
        //=================================================================================//
        // Collegamento dettagli occhiali        
        //=================================================================================//
        if (product.categoria === 'occhiali_da_sole' ||
            product.categoria === 'montature_da_vista' ||
            product.categoria === 'outlet'
        ) {
            // ricavo gli id necessari
            const lentiId = product.tipo_lenti
                ? await getOrInsert('tipo_lenti', product.tipo_lenti, conn)
                : null;

            // creo la query per inserire nel dettaglio orologi
            const sqlGioielliDetail = `
        INSERT INTO occhiali_detail
        (prodotto_id, tipo_lenti_id)
        VALUES (?, ?)
    `;

            await conn.query(sqlGioielliDetail, [
                insertResults.insertId,      // id del prodotto
                lentiId,
            ]);
        }
        //=================================================================================//
        // tutto ok -> commit
        await conn.commit();
        conn.release();

        // Rispondo con un messaggio di successo e l'ID del nuovo prodotto
        return res.status(201).json({ message: 'Prodotto aggiunto con successo!', productId: insertResults.insertId });

    } catch (err) {
        // se qualcosa va storto faccio rollback
        try { await conn.rollback(); } catch (e) { }
        conn.release();
        console.error("Error in addProduct:", err);
        return res.status(500).json({ message: 'Errore interno del server' });
    }
}

module.exports = { addProduct };
