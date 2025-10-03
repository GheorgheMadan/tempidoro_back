const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../database/db");
const sendEmail = require("../utils/sendEmail");

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES = process.env.JWT_EXPIRES || "24h";
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || "10", 10);
const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:3000";

async function registerUser(req, res) {
    try {
        const {
            username,
            first_name,
            last_name,
            email,
            password,
            phone_number,
            birth_date
        } = req.body;

        // Caso: tutti i campi mancanti
        if (
            !username &&
            !first_name &&
            !last_name &&
            !email &&
            !password &&
            !phone_number &&
            !birth_date
        ) {
            return res.status(400).json({ message: "Tutti i campi sono obbligatori" });
        }

        // Controlli specifici
        if (!username || !username.trim())
            return res.status(400).json({ message: "Username obbligatorio" });
        if (!first_name || !first_name.trim())
            return res.status(400).json({ message: "Nome obbligatorio" });
        if (!last_name || !last_name.trim())
            return res.status(400).json({ message: "Cognome obbligatorio" });
        if (!email || !email.trim())
            return res.status(400).json({ message: "Email obbligatoria" });
        if (!password)
            return res.status(400).json({ message: "Password obbligatoria" });
        if (!phone_number || !phone_number.trim())
            return res.status(400).json({ message: "Numero di telefono obbligatorio" });
        if (!birth_date || !birth_date.trim())
            return res.status(400).json({ message: "Data di nascita obbligatoria" });

        // Normalizzazione
        const usernameNorm = String(username).trim();
        const firstNameNorm = String(first_name).trim();
        const lastNameNorm = String(last_name).trim();
        const emailNorm = String(email).trim().toLowerCase();
        const phoneNorm = String(phone_number).trim();

        // Validazione data nascita
        const birthDateObj = new Date(birth_date);
        if (isNaN(birthDateObj.getTime())) {
            return res.status(400).json({ message: "Data di nascita non valida (usa formato YYYY-MM-DD)" });
        }

        // Email già registrata?
        const [userExists] = await pool.query(
            "SELECT id FROM users WHERE email = ? LIMIT 1",
            [emailNorm]
        );
        if (userExists.length > 0) {
            return res.status(409).json({ message: "Email già registrata" });
        }

        // Numero già registrato?
        const [phoneExists] = await pool.query(
            "SELECT id FROM users WHERE phone_number = ? LIMIT 1",
            [phoneNorm]
        );
        if (phoneExists.length > 0) {
            return res.status(409).json({ message: "Numero di telefono già registrato" });
        }

        // Hash password
        const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

        // Insert utente
        const [result] = await pool.query(
            `INSERT INTO users 
             (username, first_name, last_name, email, password_hash, phone_number, birth_date, is_verified)
             VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
            [usernameNorm, firstNameNorm, lastNameNorm, emailNorm, password_hash, phoneNorm, birth_date]
        );

        const userId = result.insertId;

        // Genero JWT
        if (!JWT_SECRET) {
            return res.status(500).json({ message: "JWT_SECRET non configurato" });
        }

        const token = jwt.sign(
            { sub: userId, email: emailNorm, username: usernameNorm },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES }
        );

        // Risposta immediata
        res.status(201).json({
            message: "Utente registrato con successo!",
            token,
            user: {
                id: userId,
                username: usernameNorm,
                first_name: firstNameNorm,
                last_name: lastNameNorm,
                email: emailNorm,
                phone_number: phoneNorm,
                birth_date,
                is_verified: 0,
            },
        });

        // Invio email di verifica (fire-and-forget)
        const verifyToken = jwt.sign(
            { sub: userId, email: emailNorm, purpose: "email-verify" },
            JWT_SECRET // senza scadenza
        );

        const verifyLink = `${APP_BASE_URL}/api/auth/verify-email?token=${verifyToken}`;

        try {
            await sendEmail({
                to: emailNorm,
                subject: "Verifica il tuo account",
                html: `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto">
            <h2>Ciao ${firstNameNorm}, benvenuto su Tempi d'Oro!</h2>
            <p>Clicca per verificare il tuo account:</p>
            <p style="margin:22px 0">
              <a href="${verifyLink}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#111;color:#fff;text-decoration:none">
                Verifica il mio account
              </a>
            </p>
            <p>Oppure copia e incolla questo link:</p>
            <p style="word-break:break-all">${verifyLink}</p>
          </div>
        `,
            });
        } catch (mailErr) {
            console.error("Errore invio email:", mailErr);
        }
    } catch (error) {
        console.error("Errore in registerUser:", error);
        res.status(500).json({ message: "Errore interno del server" });
    }
}

async function verifyEmail(req, res) {
    try {
        const { token } = req.query;
        if (!token) return res.status(400).json({ message: "Token mancante" });

        let payload;
        try {
            payload = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
            if (payload.purpose !== "email-verify") {
                return res.status(400).json({ message: "Token non valido" });
            }
        } catch {
            return res.status(400).json({ message: "Token non valido" });
        }

        const userId = payload.sub;

        const [rows] = await pool.query(
            "SELECT is_verified FROM users WHERE id = ? LIMIT 1",
            [userId]
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: "Utente non trovato" });
        }

        if (rows[0].is_verified === 1) {
            return res.json({ message: "Account già verificato" });
        }

        await pool.query("UPDATE users SET is_verified = 1 WHERE id = ?", [userId]);
        return res.json({ message: "Account verificato con successo" });
    } catch (err) {
        console.error("Errore in verifyEmail:", err);
        return res.status(500).json({ message: "Errore interno del server" });
    }
}

module.exports = { registerUser, verifyEmail };
