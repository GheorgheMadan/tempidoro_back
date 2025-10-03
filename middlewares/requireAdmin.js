// middlewares/requireAdmin.js
function requireAdmin(req, res, next) {
    // req.user viene popolato dal tuo authMiddleware
    if (!req.user) {
        return res.status(401).json({ message: "Non autenticato" });
    }

    if (!req.user.is_admin) {
        return res.status(403).json({ message: "Accesso riservato agli amministratori" });
    }

    next();
}

module.exports = requireAdmin;
