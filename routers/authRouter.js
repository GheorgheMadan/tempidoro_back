const { Router } = require('express');
const { body } = require('express-validator');
const { registerUser, verifyEmail } = require('../authControllers/registerUser');
const { loginUser } = require('../authControllers/loginUser');
const { forgotPassword, resetPassword, changePassword } = require('../authControllers/changePassword');
const authMiddleware = require("../middlewares/authMiddleware");
const { requestChangeEmail, confirmChangeEmail } = require('../authControllers/changeEmail');
const { requestChangeEmailPublic, confirmChangeEmailPublic } = require('../authControllers/forgotEmail');
const { updateProfile } = require('../authControllers/updateProfile');
const { getProfile } = require('../authControllers/getProfile');
const { deleteProfile } = require('../authControllers/deleteProfile');

const authRouter = Router();

// Rotta per la registrazione di un nuovo utente
authRouter.post(
    '/register',
    [
        body('username')
            .trim()
            .isLength({ min: 3, max: 60 })
            .withMessage('Username 3-60 caratteri'),
        body('email')
            .isEmail()
            .withMessage('Email non valida')
            .normalizeEmail(),
        body('password')
            .isLength({ min: 8 })
            .withMessage('Password minimo 8 caratteri'),
        body('phone_number')
            .trim()
            .notEmpty()
            .withMessage('Il numero di telefono è obbligatorio')
            .isLength({ max: 32 })
            .withMessage('Numero troppo lungo')
    ],
    registerUser
);

// Rotta di verifica email
authRouter.get('/verify-email', verifyEmail);

// Rotta di login 
authRouter.post('/login', loginUser)

// Rotta forgot password che invia la mail di reset
authRouter.post("/forgot-password", forgotPassword);

// Rotta reset password che accetta token + new_password
authRouter.post(
    "/reset-password",
    [
        body("token").notEmpty().withMessage("Token mancante"),
        body("new_password")
            .isLength({ min: 8 })
            .withMessage("Password nuova non valida (min 8 caratteri)"),
        body("new_password_confirm")
            .notEmpty().withMessage("Conferma password obbligatoria")
            .custom((value, { req }) => value === req.body.new_password)
            .withMessage("Le due password non coincidono"),
    ],
    resetPassword
);

// Rotta change password che accetta current_password + new_password quindi richiede auth
authRouter.post(
    "/change-password",
    authMiddleware,
    [
        body("current_password").notEmpty().withMessage("Password attuale obbligatoria"),
        body("new_password").isLength({ min: 8 }).withMessage("Password nuova troppo corta"),
        body("new_password_confirm").notEmpty().withMessage("Conferma obbligatoria"),
    ],
    changePassword
);

authRouter.post(
    "/change-email/request",
    authMiddleware,
    [body("new_email").isEmail().withMessage("Email non valida")],
    requestChangeEmail
);

// la conferma via link può essere GET (più comodo da email) o POST
authRouter.get("/change-email/confirm", confirmChangeEmail);

// Richiesta cambio email (NO login): invia OTP
authRouter.post(
    "/public/change-email/request",
    [
        body("phone_number").notEmpty().withMessage("Numero di telefono obbligatorio"),
        body("new_email").isEmail().withMessage("Email non valida"),
    ],
    requestChangeEmailPublic
);

// Conferma cambio email (NO login): verifica OTP e applica
authRouter.post(
    "/public/change-email/confirm",
    [
        body("phone_number").notEmpty().withMessage("Numero di telefono obbligatorio"),
        body("code").notEmpty().withMessage("Codice OTP obbligatorio"),
    ],
    confirmChangeEmailPublic
);

// Rotta delete profile (richiede auth)
authRouter.patch("/update-profile", authMiddleware, updateProfile);

// Rotta get profile (richiede auth)
authRouter.get("/profile", authMiddleware, getProfile);

// Rotta delete profile (richiede auth)
authRouter.delete("/delete-profile", authMiddleware, deleteProfile);

module.exports = authRouter;
