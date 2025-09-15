const connection = require('../database/db'); // usa il pool PROMISE

// Ricavo l'id se esiste, altrimenti inserisco e ritorno insertId
async function getOrInsert(tableName, dataToInsert) {
    // query di select della tabella
    const sqlSelect = `SELECT * FROM ${tableName} WHERE name = ?`;

    // eseguo la query di select per verificare se il dato esiste
    const [results] = await connection.query(sqlSelect, [dataToInsert]);

    // se il dato non esiste lo inserisco
    if (results.length === 0) {
        const sqlInsert = `INSERT INTO ${tableName} (name) VALUES (?)`;
        const [insertResults] = await connection.query(sqlInsert, [dataToInsert]);
        return insertResults.insertId;
    }

    // se esiste ritorno l'id
    return results[0].id;
}

module.exports = { getOrInsert };
