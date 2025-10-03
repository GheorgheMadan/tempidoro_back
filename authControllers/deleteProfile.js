const bcrypt = require("bcrypt");
const pool = require("../database/db");

// DELETE /api/auth/delete-profile
// body: { password }
async function deleteProfile(req, res) {
    const userId = req.user?.id;
    const { password } = req.body;

    if (!userId) return res.status(401).json({ message: "Non autenticato" });
    if (!password) return res.status(400).json({ message: "Password obbligatoria" });

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // 1) Prendo hash corrente
        const [rows] = await conn.query(
            "SELECT password_hash FROM users WHERE id = ? LIMIT 1",
            [userId]
        );
        if (!rows.length) {
            await conn.rollback();
            return res.status(404).json({ message: "Utente non trovato" });
        }

        // 2) Verifica password
        const ok = await bcrypt.compare(password, rows[0].password_hash);
        if (!ok) {
            await conn.rollback();
            return res.status(401).json({ message: "Password errata" });
        }

        // 3) pulizia dati collegati
        await conn.query("DELETE FROM password_resets WHERE user_id = ?", [userId]);

        // 4) Cancella utente
        await conn.query("DELETE FROM users WHERE id = ?", [userId]);

        await conn.commit();
        return res.json({ message: "Profilo eliminato con successo" });
    } catch (err) {
        console.error("Errore in deleteProfile:", err);
        try { await conn.rollback(); } catch { }
        return res.status(500).json({ message: "Errore interno del server" });
    } finally {
        conn.release();
    }
}

module.exports = { deleteProfile };
