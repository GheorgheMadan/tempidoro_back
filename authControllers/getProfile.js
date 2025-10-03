// controllers/getProfile.js
const pool = require("../database/db");

async function getProfile(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: "Non autenticato" });

        const [rows] = await pool.query(
            "SELECT id, username, first_name, last_name, email, phone_number, birth_date, is_verified FROM users WHERE id = ? LIMIT 1",
            [userId]
        );

        if (!rows.length) return res.status(404).json({ message: "Utente non trovato" });

        return res.json({ user: rows[0] });
    } catch (err) {
        console.error("Errore in getProfile:", err);
        return res.status(500).json({ message: "Errore interno del server" });
    }
}

module.exports = { getProfile };
