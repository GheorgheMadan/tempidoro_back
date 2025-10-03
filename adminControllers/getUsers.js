// controllers/adminUsers.js
const pool = require("../database/db");

async function getAllUsers(req, res) {
    try {
        const [rows] = await pool.query(
            `SELECT 
                id,
                username,
                first_name,
                last_name,
                email,
                phone_number,
                birth_date,
                is_verified,
                is_admin,
                created_at,
                updated_at
             FROM users
             ORDER BY created_at DESC`
        );

        return res.json({ users: rows });
    } catch (err) {
        console.error("Errore in getAllUsers:", err);
        return res.status(500).json({ message: "Errore interno del server" });
    }
}

module.exports = { getAllUsers };
