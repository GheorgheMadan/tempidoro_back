// utils/passwordChangePolicy.js
const crypto = require("crypto");
const pool = require("../database/db");

const MIN_MIN = parseInt(process.env.PASSWORD_CHANGE_MIN_INTERVAL_MIN || "10", 10);
const MAX_24H = parseInt(process.env.PASSWORD_CHANGE_MAX_PER_24H || "3", 10);

async function canChangePassword(userId) {
    // ultimo cambio (manual o reset) basato su used_at
    const [lastRows] = await pool.query(
        `SELECT used_at
       FROM password_resets
      WHERE user_id = ? AND used_at IS NOT NULL
      ORDER BY used_at DESC
      LIMIT 1`,
        [userId]
    );
    if (lastRows.length) {
        const last = new Date(lastRows[0].used_at).getTime();
        const diffMin = (Date.now() - last) / (1000 * 60);
        if (diffMin < MIN_MIN) {
            return { ok: false, reason: "too_soon", waitMinutes: Math.ceil(MIN_MIN - diffMin) };
        }
    }

    // conteggio nelle ultime 24h (manual + reset)
    const [countRows] = await pool.query(
        `SELECT COUNT(*) AS cnt
       FROM password_resets
      WHERE user_id = ?
        AND used_at IS NOT NULL
        AND used_at >= (NOW() - INTERVAL 24 HOUR)`,
        [userId]
    );
    if ((countRows[0].cnt || 0) >= MAX_24H) {
        return { ok: false, reason: "too_many_24h", max: MAX_24H };
    }

    return { ok: true };
}

// Logga un cambio "manual" creando una riga con token_hash fittizio
async function logManualChange(userId, req) {
    const tokenHash = crypto.createHash("sha256")
        .update(`manual:${userId}:${Date.now()}:${Math.random()}`)
        .digest("hex");
    const ip = req?.ip || null;
    const ua = req?.headers?.["user-agent"] || null;

    // per coerenza: settiamo subito used_at = NOW() (è un evento già avvenuto)
    await pool.query(
        `INSERT INTO password_resets (user_id, reason, ip, user_agent, token_hash, expires_at, used_at)
     VALUES (?, 'manual', ?, ?, ?, NOW(), NOW())`,
        [userId, ip, ua, tokenHash]
    );
}

// Per i reset via email, tu già marchi used_at quando il token viene usato: quello vale come log.
module.exports = { canChangePassword, logManualChange };
