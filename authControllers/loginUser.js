const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../database/db");

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES = process.env.JWT_EXPIRES || "24h";

async function loginUser(req, res) {
    try {
        const { email, password } = req.body;

        // 1) Controllo campi
        if (!email || !password) {
            return res.status(400).json({ message: "Email e password sono obbligatorie" });
        }

        const emailNorm = String(email).trim().toLowerCase();

        // 2) Trovo l’utente
        const [rows] = await pool.query(
            `SELECT id, username, email, password_hash, phone_number, is_verified, is_admin
       FROM users WHERE email = ? LIMIT 1`,
            [emailNorm]
        );

        if (rows.length === 0) {
            return res.status(401).json({ message: "Credenziali non valide" });
        }

        const user = rows[0];

        // 3) Controllo se verificato
        if (user.is_verified === 0) {
            return res.status(403).json({ message: "Devi prima verificare la tua email" });
        }

        // 4) Confronto password
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) {
            return res.status(401).json({ message: "Password non valida" });
        }

        // 5) Genero JWT
        const token = jwt.sign(
            { sub: user.id, email: user.email, username: user.username, is_admin: user.is_admin },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES }
        );

        // 6) Risposta finale
        return res.json({
            message: "Login effettuato con successo",
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                phone_number: user.phone_number,
                is_verified: user.is_verified,
            },
        });
    } catch (error) {
        console.error("Errore in loginUser:", error);
        return res.status(500).json({ message: "Errore interno del server" });
    }
}

module.exports = { loginUser };
