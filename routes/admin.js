const express = require("express");

const adminController = require("../controllers/admin");
const { isAuthenticated } = require("../middleware/is-auth");
const userValidator = require("../middleware/validators/userValidator");

const router = express.Router();

// // admin/add-product => GET
router.get("/add-product", isAuthenticated, adminController.getAddProduct);

// // admin/products => GET
router.get("/products", isAuthenticated, adminController.getProducts);

// // admin/add-product => POST
router.post("/add-product", isAuthenticated, userValidator.addProductValidator, adminController.postAddProduct);

router.get("/edit-product/:productId", isAuthenticated, adminController.getEditProduct);

router.post("/edit-product", isAuthenticated, userValidator.editProductValidator, adminController.postEditProduct);

router.post("/delete-product", isAuthenticated, adminController.deleteProduct);

module.exports = router;