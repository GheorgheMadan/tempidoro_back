const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const pool = require("../database/db");
const sendEmail = require("../utils/sendEmail");

const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:3000";
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES = process.env.JWT_EXPIRES || "24h";
const CHANGE_EMAIL_EXPIRES_HOURS = parseInt(process.env.CHANGE_EMAIL_EXPIRES_HOURS || "24", 10);

const sha256Hex = (v) => crypto.createHash("sha256").update(String(v)).digest("hex");

/**
 * POST /api/auth/change-email/request
 * body: { new_email }
 * auth: Bearer
 * Effetto: invia un link di conferma alla NUOVA email
 */
async function requestChangeEmail(req, res) {
    try {
        const userId = req.user?.id;
        const { new_email } = req.body;
        if (!userId) return res.status(401).json({ message: "Non autenticato" });
        if (!new_email) return res.status(400).json({ message: "Nuova email obbligatoria" });

        const newEmailNorm = String(new_email).trim().toLowerCase();

        // non deve esistere già
        const [exists] = await pool.query("SELECT id FROM users WHERE email = ? LIMIT 1", [newEmailNorm]);
        if (exists.length) return res.status(409).json({ message: "Email già in uso" });

        // prendo anche la vecchia email, per notifica opzionale
        const [urows] = await pool.query("SELECT email, username FROM users WHERE id = ? LIMIT 1", [userId]);
        if (!urows.length) return res.status(404).json({ message: "Utente non trovato" });
        const { email: oldEmail, username } = urows[0];

        // genera token raw e hash
        const rawToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = sha256Hex(rawToken);
        const expiresAt = new Date(Date.now() + CHANGE_EMAIL_EXPIRES_HOURS * 60 * 60 * 1000);

        // invalidiamo eventuali richieste precedenti non usate (per pulizia)
        await pool.query(
            "UPDATE password_resets SET used_at = NOW() WHERE user_id = ? AND reason = 'email-change' AND used_at IS NULL",
            [userId]
        );

        // salva richiesta
        await pool.query(
            `INSERT INTO password_resets (user_id, reason, new_email, token_hash, expires_at)
       VALUES (?, 'email-change', ?, ?, ?)`,
            [userId, newEmailNorm, tokenHash, expiresAt]
        );

        // link di conferma inviato ALLA NUOVA EMAIL
        const confirmLink = `${APP_BASE_URL}/api/auth/change-email/confirm?token=${rawToken}`;

        // invia email di conferma alla nuova email
        await sendEmail({
            to: newEmailNorm,
            subject: "Conferma cambio email",
            html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto">
          <h2>Ciao ${username},</h2>
          <p>Hai richiesto di cambiare l'email del tuo account su Tempi d'Oro.</p>
          <p>Per confermare, clicca qui sotto:</p>
          <p style="margin:22px 0">
            <a href="${confirmLink}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#111;color:#fff;text-decoration:none">
              Conferma nuova email
            </a>
          </p>
          <p>Oppure copia e incolla questo link:</p>
          <p style="word-break:break-all">${confirmLink}</p>
          <hr/>
          <small>Questo link scade tra ${CHANGE_EMAIL_EXPIRES_HOURS} ore.</small>
        </div>
      `,
        });

        // (opzionale) notifica alla vecchia email
        try {
            await sendEmail({
                to: oldEmail,
                subject: "Richiesta cambio email in corso",
                html: `
          <p>Ciao ${username}, è stata avviata una richiesta di cambio email del tuo account.</p>
          <p>Se non sei stato tu, cambia subito la password e contatta il supporto.</p>
        `,
            });
        } catch { }

        return res.json({ message: "Ti abbiamo inviato un link di conferma alla nuova email" });
    } catch (err) {
        console.error("Errore in requestChangeEmail:", err);
        return res.status(500).json({ message: "Errore interno del server" });
    }
}

/**
 * GET o POST /api/auth/change-email/confirm
 * query/body: { token }
 * Effetto: applica il cambio email se il token è valido
 */
async function confirmChangeEmail(req, res) {
    try {
        const token = req.query.token || req.body.token;
        if (!token) return res.status(400).json({ message: "Token mancante" });

        const tokenHash = sha256Hex(token);

        const [rows] = await pool.query(
            `SELECT id, user_id, new_email, expires_at, used_at
         FROM password_resets
        WHERE token_hash = ? AND reason = 'email-change'
        LIMIT 1`,
            [tokenHash]
        );

        if (!rows.length) return res.status(400).json({ message: "Token non valido" });

        const pr = rows[0];
        if (pr.used_at) return res.status(400).json({ message: "Token già utilizzato" });
        if (new Date(pr.expires_at).getTime() < Date.now())
            return res.status(400).json({ message: "Token scaduto" });

        // doppio controllo unicità (nel frattempo qualcuno potrebbe aver preso quell'email)
        const [exists] = await pool.query("SELECT id FROM users WHERE email = ? LIMIT 1", [pr.new_email]);
        if (exists.length) return res.status(409).json({ message: "Email già in uso" });

        // aggiorna email
        await pool.query("UPDATE users SET email = ? WHERE id = ?", [pr.new_email, pr.user_id]);

        // marca usato
        await pool.query("UPDATE password_resets SET used_at = NOW() WHERE id = ?", [pr.id]);

        // (opzionale) emetti nuovo JWT “coerente” con la nuova email (se vuoi far restare loggato l’utente)
        let tokenJwt = null;
        if (JWT_SECRET) {
            // recupero username per payload pulito
            const [u] = await pool.query("SELECT username FROM users WHERE id = ? LIMIT 1", [pr.user_id]);
            const username = u.length ? u[0].username : undefined;
            tokenJwt = jwt.sign(
                { sub: pr.user_id, email: pr.new_email, username },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRES }
            );
        }

        // puoi anche fare redirect a una pagina FE
        // return res.redirect(302, `${APP_BASE_URL}/email-change-success`);

        return res.json({
            message: "Email aggiornata con successo",
            token: tokenJwt, // o null se non vuoi emettere un nuovo token qui
            user: { id: pr.user_id, email: pr.new_email }
        });
    } catch (err) {
        console.error("Errore in confirmChangeEmail:", err);
        return res.status(500).json({ message: "Errore interno del server" });
    }
}

module.exports = { requestChangeEmail, confirmChangeEmail };
