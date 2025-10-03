const { Router } = require('express');
const adminRouter = Router();
const authMiddleware = require("../middlewares/authMiddleware");
const requireAdmin = require("../middlewares/requireAdmin");
const { getAllUsers } = require("../adminControllers/getUsers");

// get di tutti gli utenti (solo admin)
adminRouter.get('/users', authMiddleware, requireAdmin, getAllUsers);


module.exports = adminRouter;