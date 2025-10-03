// controllers/updateProfile.js
const pool = require("../database/db");

// PATCH /api/auth/update-profile
// body: { username?, first_name?, last_name?, birth_date?, phone_number? }
async function updateProfile(req, res) {
    try {
        const userId = req.user?.id; // preso dal middleware auth
        if (!userId) {
            return res.status(401).json({ message: "Non autenticato" });
        }

        const { username, first_name, last_name, birth_date, phone_number } = req.body;

        // Se non ci sono campi, errore
        if (!username && !first_name && !last_name && !birth_date && !phone_number) {
            return res.status(400).json({ message: "Nessun campo da aggiornare" });
        }

        // Costruiamo query dinamica
        const fields = [];
        const values = [];

        if (username && username.trim()) {
            fields.push("username = ?");
            values.push(username.trim());
        }
        if (first_name && first_name.trim()) {
            fields.push("first_name = ?");
            values.push(first_name.trim());
        }
        if (last_name && last_name.trim()) {
            fields.push("last_name = ?");
            values.push(last_name.trim());
        }
        if (birth_date && birth_date.trim()) {
            const birthDateObj = new Date(birth_date);
            if (isNaN(birthDateObj.getTime())) {
                return res.status(400).json({ message: "Data di nascita non valida (usa formato YYYY-MM-DD)" });
            }
            fields.push("birth_date = ?");
            values.push(birth_date);
        }
        if (phone_number && phone_number.trim()) {
            const phoneNorm = phone_number.trim();
            // 🔒 controllo duplicati
            const [phoneExists] = await pool.query(
                "SELECT id FROM users WHERE phone_number = ? AND id != ? LIMIT 1",
                [phoneNorm, userId]
            );
            if (phoneExists.length > 0) {
                return res.status(409).json({ message: "Numero di telefono già registrato" });
            }
            fields.push("phone_number = ?");
            values.push(phoneNorm);
        }

        if (fields.length === 0) {
            return res.status(400).json({ message: "Nessun campo valido da aggiornare" });
        }

        values.push(userId);

        // Esegui update
        await pool.query(
            `UPDATE users SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            values
        );

        // Recupera i dati aggiornati
        const [rows] = await pool.query(
            "SELECT id, username, first_name, last_name, email, phone_number, birth_date, is_verified FROM users WHERE id = ? LIMIT 1",
            [userId]
        );

        return res.json({
            message: "Profilo aggiornato con successo",
            user: rows[0],
        });
    } catch (err) {
        console.error("Errore in updateProfile:", err);
        return res.status(500).json({ message: "Errore interno del server" });
    }
}

module.exports = { updateProfile };
