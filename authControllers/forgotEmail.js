const twilio = require("twilio");
const crypto = require("crypto");
const pool = require("../database/db");

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const FROM = process.env.TWILIO_PHONE_NUMBER;

// hash helper
const sha256Hex = (v) => crypto.createHash("sha256").update(String(v)).digest("hex");

/**
 * POST /api/auth/public/change-email/request
 * body: { phone_number, new_email }
 */
async function requestChangeEmailPublic(req, res) {
    try {
        const { phone_number, new_email } = req.body;
        if (!phone_number || !new_email) {
            return res.status(400).json({ message: "Numero e email obbligatori" });
        }

        const phoneNorm = String(phone_number).trim();
        const emailNorm = String(new_email).trim().toLowerCase();

        // utente
        const [urows] = await pool.query("SELECT id FROM users WHERE phone_number = ? LIMIT 1", [phoneNorm]);
        if (!urows.length) return res.json({ message: "Se il numero è valido riceverai un SMS" });
        const user = urows[0];

        // OTP + hash
        const otp = String(Math.floor(100000 + Math.random() * 900000)); // 6 cifre
        const otpHash = sha256Hex(otp);
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

        // invalida pendenti
        await pool.query(
            "UPDATE password_resets SET used_at = NOW() WHERE user_id=? AND reason='email-change' AND used_at IS NULL",
            [user.id]
        );

        // salva richiesta (reason = 'email-change')
        await pool.query(
            `INSERT INTO password_resets (user_id, reason, new_email, token_hash, expires_at)
       VALUES (?, 'email-change', ?, ?, ?)`,
            [user.id, emailNorm, otpHash, expiresAt]
        );

        // E.164
        const to = phoneNorm.startsWith("+") ? phoneNorm : `+39${phoneNorm.replace(/\D/g, "")}`;

        // invia SMS
        await client.messages.create({
            from: FROM,
            to,
            body: `Il tuo codice per cambiare email è: ${otp}`
        });

        return res.json({ message: "Se il numero è valido riceverai un SMS" });
    } catch (err) {
        console.error("Errore requestChangeEmailPublic:", err);
        return res.status(500).json({ message: "Errore interno del server" });
    }
}

/**
 * POST /api/auth/public/change-email/confirm
 * body: { phone_number, code }
 */
async function confirmChangeEmailPublic(req, res) {
    try {
        const { phone_number, code } = req.body;
        if (!phone_number || !code) {
            return res.status(400).json({ message: "Numero e codice obbligatori" });
        }

        const [urows] = await pool.query("SELECT id FROM users WHERE phone_number = ? LIMIT 1", [phone_number]);
        if (!urows.length) return res.status(400).json({ message: "Dati non validi" });
        const userId = urows[0].id;

        // ultima richiesta pendente
        const [prRows] = await pool.query(
            `SELECT id, new_email, expires_at, token_hash
       FROM password_resets
       WHERE user_id=? AND reason='email-change' AND used_at IS NULL
       ORDER BY created_at DESC LIMIT 1`,
            [userId]
        );
        if (!prRows.length) return res.status(400).json({ message: "Nessuna richiesta trovata" });

        const pr = prRows[0];
        if (new Date(pr.expires_at).getTime() < Date.now()) {
            return res.status(400).json({ message: "Codice scaduto" });
        }

        // verifica OTP usando l'hash
        const codeHash = sha256Hex(code);
        if (pr.token_hash !== codeHash) {
            return res.status(400).json({ message: "Codice non valido" });
        }

        // aggiorna email
        await pool.query("UPDATE users SET email=? WHERE id=?", [pr.new_email, userId]);

        // marca usato
        await pool.query("UPDATE password_resets SET used_at=NOW() WHERE id=?", [pr.id]);

        return res.json({ message: "Email aggiornata con successo", email: pr.new_email });
    } catch (err) {
        console.error("Errore confirmChangeEmailPublic:", err);
        return res.status(500).json({ message: "Errore interno del server" });
    }
}

module.exports = { requestChangeEmailPublic, confirmChangeEmailPublic };
