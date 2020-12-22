const express = require("express");

const authController = require("../controllers/auth");
const userValidator = require("../middleware/validators/userValidator");

const router = express.Router();

router.get("/signup", authController.getSignup);

router.post("/signup", userValidator.signupValidator, authController.postSignup);

router.get("/login", authController.getLogin);

router.post("/login", userValidator.loginValidator, authController.postLogin);

router.post("/logout", authController.postLogout);

router.get("/reset", authController.getReset);

router.post("/reset", authController.postReset);

router.get("/reset/:token", authController.getNewPassword);

router.post("/new-password", authController.postNewPassword);

module.exports = router;