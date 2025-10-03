const crypto = require("crypto");
const bcrypt = require("bcrypt");
const pool = require("../database/db");
const sendEmail = require("../utils/sendEmail");
const { canChangePassword, logManualChange } = require("../utils/passwordChangePolicy");

const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:3000";
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || "10", 10);
const RESET_TOKEN_EXPIRES_HOURS = parseInt(process.env.RESET_TOKEN_EXPIRES_HOURS || "2", 10);

// Utility: sha256 hex
function sha256Hex(value) {
    return crypto.createHash("sha256").update(value).digest("hex");
}

// POST /api/auth/forgot-password
async function forgotPassword(req, res) {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: "Email obbligatoria" });

        const emailNorm = String(email).trim().toLowerCase();

        // Cerca utente (non riveliamo se non esiste)
        const [rows] = await pool.query(
            "SELECT id, username FROM users WHERE email = ? LIMIT 1",
            [emailNorm]
        );

        // Rispondiamo sempre 200 per sicurezza
        if (rows.length === 0) {
            return res.json({ message: "Se l'email esiste, riceverai un link di reset" });
        }

        const user = rows[0];

        // Genera token raw e hash
        const rawToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = sha256Hex(rawToken);

        const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRES_HOURS * 60 * 60 * 1000);

        // Invalida token precedenti di quel user 
        await pool.query(
            "UPDATE password_resets SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL",
            [user.id]
        );

        // Inserisci record
        await pool.query(
            `INSERT INTO password_resets (user_id, token_hash, expires_at)
       VALUES (?, ?, ?)`,
            [user.id, tokenHash, expiresAt]
        );

        // Link di reset (da usare per una pagina FE tipo /reset-password?token=)
        const resetLink = `${APP_BASE_URL}/api/auth/reset-password?token=${rawToken}`;

        // Invia email
        try {
            await sendEmail({
                to: emailNorm,
                subject: "Reimposta la tua password",
                html: `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto">
            <h2>Ciao ${user.username},</h2>
            <p>Hai richiesto di reimpostare la password. Clicca qui sotto per procedere:</p>
            <p style="margin:22px 0">
              <a href="${resetLink}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#111;color:#fff;text-decoration:none">
                Reimposta password
              </a>
            </p>
            <p>Oppure copia e incolla questo link:</p>
            <p style="word-break:break-all">${resetLink}</p>
            <hr/>
            <small>Questo link scade tra ${RESET_TOKEN_EXPIRES_HOURS} ore.</small>
          </div>
        `,
            });
        } catch (mailErr) {
            console.error("Errore invio email reset:", mailErr);
            // Non riveliamo nulla in più
        }

        return res.json({ message: "Se l'email esiste, riceverai un link di reset" });
    } catch (err) {
        console.error("Errore in forgotPassword:", err);
        return res.status(500).json({ message: "Errore interno del server" });
    }
}

// POST /api/auth/reset-password
// accetta token (query o body) + new_password
async function resetPassword(req, res) {
    try {
        const token = req.query.token || req.body.token;
        const { new_password, new_password_confirm } = req.body;

        if (!token) return res.status(400).json({ message: "Token mancante" });
        if (!new_password || new_password.length < 8) {
            return res.status(400).json({ message: "Password nuova non valida (min 8 caratteri)" });
        }

        // se il FE la invia, verifica che coincidano
        if (!new_password || new_password.length < 8) {
            return res.status(400).json({ message: "Password nuova non valida (min 8 caratteri)" });
        }
        if (new_password_confirm == null) {
            return res.status(400).json({ message: "Conferma password obbligatoria" });
        }
        if (new_password !== new_password_confirm) {
            return res.status(400).json({ message: "Le due password non coincidono" });
        }

        const tokenHash = sha256Hex(String(token));

        // Trova token valido e non usato
        const [rows] = await pool.query(
            `SELECT pr.id, pr.user_id, pr.expires_at, pr.used_at
         FROM password_resets pr
        WHERE pr.token_hash = ?
        LIMIT 1`,
            [tokenHash]
        );

        if (rows.length === 0) {
            return res.status(400).json({ message: "Token non valido" });
        }

        const pr = rows[0];
        if (pr.used_at) {
            return res.status(400).json({ message: "Token già utilizzato" });
        }
        if (new Date(pr.expires_at).getTime() < Date.now()) {
            return res.status(400).json({ message: "Token scaduto" });
        }

        // prima dell'UPDATE verifico se la password è diversa
        const [urows] = await pool.query("SELECT password_hash FROM users WHERE id = ? LIMIT 1", [pr.user_id]);
        if (urows.length) {
            const same = await bcrypt.compare(new_password, urows[0].password_hash);
            if (same) return res.status(400).json({ message: "La nuova password deve essere diversa da quella attuale" });
        }

        // Hash nuova password
        const newHash = await bcrypt.hash(new_password, BCRYPT_ROUNDS);

        // Aggiorna password utente
        await pool.query(
            "UPDATE users SET password_hash = ? WHERE id = ?",
            [newHash, pr.user_id]
        );

        // Segna token come usato
        await pool.query(
            "UPDATE password_resets SET used_at = NOW() WHERE id = ?",
            [pr.id]
        );

        return res.json({ message: "Password reimpostata con successo" });
    } catch (err) {
        console.error("Errore in resetPassword:", err);
        return res.status(500).json({ message: "Errore interno del server" });
    }
}

// authControllers/changePasswordController.js
async function changePassword(req, res) {
    try {
        const userId = req.user?.id;
        const { current_password, new_password, new_password_confirm } = req.body;

        if (!userId) return res.status(401).json({ message: "Non autenticato" });
        if (!current_password || !new_password) return res.status(400).json({ message: "current_password e new_password sono obbligatorie" });
        if (new_password.length < 8) return res.status(400).json({ message: "La nuova password deve avere almeno 8 caratteri" });
        if (new_password_confirm != null && new_password !== new_password_confirm) return res.status(400).json({ message: "Le nuove password non coincidono" });

        // Rate-limit
        const policy = await canChangePassword(userId);
        if (!policy.ok) {
            if (policy.reason === "too_soon") return res.status(429).json({ message: `Attendi almeno ${policy.waitMinutes} minuti prima di cambiare di nuovo la password` });
            if (policy.reason === "too_many_24h") return res.status(429).json({ message: `Hai raggiunto il limite di ${policy.max} cambi nelle ultime 24 ore` });
        }

        // Verifica attuale
        const [rows] = await pool.query("SELECT password_hash FROM users WHERE id = ? LIMIT 1", [userId]);
        if (!rows.length) return res.status(404).json({ message: "Utente non trovato" });

        const oldHash = rows[0].password_hash;
        const ok = await bcrypt.compare(current_password, oldHash);
        if (!ok) return res.status(401).json({ message: "Password attuale errata" });

        const same = await bcrypt.compare(new_password, oldHash);
        if (same) return res.status(400).json({ message: "La nuova password deve essere diversa dalla precedente" });

        // Update
        const newHash = await bcrypt.hash(new_password, BCRYPT_ROUNDS);
        await pool.query("UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [newHash, userId]);

        // Log su password_resets (reason=manual)
        await logManualChange(userId, req);

        return res.json({ message: "Password aggiornata con successo" });
    } catch (err) {
        console.error("Errore in changePassword:", err);
        return res.status(500).json({ message: "Errore interno del server" });
    }
}



module.exports = { forgotPassword, resetPassword, changePassword };
