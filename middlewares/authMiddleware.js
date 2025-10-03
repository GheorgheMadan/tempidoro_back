// middlewares/authMiddleware.js
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

function authMiddleware(req, res, next) {
    const authHeader = req.headers["authorization"];
    if (!authHeader) return res.status(401).json({ message: "Token mancante" });

    const token = authHeader.split(" ")[1]; // "Bearer <token>"
    if (!token) return res.status(401).json({ message: "Token mancante" });

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        // coerce a boolean: 1/0 oppure true/false
        const isAdmin = payload.is_admin === 1 || payload.is_admin === true || payload.is_admin === "1";
        req.user = { id: payload.sub, email: payload.email, username: payload.username, is_admin: isAdmin };
        next();
    } catch (err) {
        console.error("Errore JWT:", err);
        return res.status(401).json({ message: "Token non valido o scaduto" });
    }
}

module.exports = authMiddleware;
