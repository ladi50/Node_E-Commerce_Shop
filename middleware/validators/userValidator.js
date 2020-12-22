const { body, validationResult } = require("express-validator");
const User = require("../../models/user");
const Product = require("../../models/product");

exports.signupValidator = [
    body(
        "email",
        "Please enter a valid email address!"
    )
    .isEmail()
    .normalizeEmail()
    .custom(async value => {
        try {
            const user = await User.findOne({ email: value });
            if (user) {
                return Promise.reject("Email already exists!");
            }
        } catch (err) {
            return console.log(err);
        }
    }),
    body(
        "password",
        "Password must be at least 5 characters long!"
    )
    .isLength({ min: 5 })
    .trim(),
    body(
        "confirmPassword"
    )
    .trim()
    .custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error("Passwords don't match!");
        }
        return true;
    }),
    (req, res, next) => {
        const errors = validationResult(req);
        
        if (!errors.isEmpty()) {
            return res.status(422).render("auth/signup", {
                path: "/signup",
                pageTitle: "Signup",
                isAuthenticated: false,
                errors: errors.array()
            });
        }
        next();
    }
];

exports.loginValidator = [
    body(
        "email",
        "Please enter a valid email address!"
    )
    .isEmail()
    .normalizeEmail()
    .custom(async value => {
        try {
            const user = await User.findOne({ email: value });
            if (!user) {
                return Promise.reject("Email not found!");
            }
        } catch (err) {
            return console.log(err);
        }
    }),
    (req, res, next) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(422).render("auth/login", {
                path: "/login",
                pageTitle: "Login",
                isAuthenticated: false,
                errorMessage: null,
                errors: errors.array()
            });
        }
        next();
    }
];

exports.addProductValidator = [
    body(
        "title",
        "Title must be at least 3 characters long!"
    )
    .isLength({ min: 3 })
    .rtrim(),
    body(
        "image"
    )
    .custom((value, { req }) => {
        if ( !req.file ) {
            throw new Error("Please upload an image!");
        } else if (
            req.file.mimetype === "image/jpg" ||
            req.file.mimetype === "image/jpeg" ||
            req.file.mimetype === "image/png"
            ) 
        {
            return true;
        }
        throw new Error("Only png, jpg and jpeg images are supported!")
    }),
    body(
        "price",
        "Please enter a valid price!"
    )
    .isNumeric(),
    body(
        "description",
        "Description must be at least 10 letters long!"
    )
    .isLength({ min: 10 }),
    (req ,res, next) => {
        const errors = validationResult(req);
        const { title, imageUrl, price, description } = req.body;

        if (!errors.isEmpty()) {
            return res.status(422).render("admin/edit-product", { 
                pageTitle: "Add Product", 
                path: "/admin/add-product",
                editing: false,
                isAuthenticated: req.session.isLoggedIn,
                hasError: true,
                product: { title, price, description },
                errors: errors.array()
            });
        }
        next();
    }
];

exports.editProductValidator = [
    body(
        "title",
        "Title must be at least 3 characters long!"
    )
    .rtrim()
    .isLength({ min: 3 }),
    body(
        "image"
    )
    .custom((value, { req }) => {
        if (req.file) {
            if (
                req.file.mimetype === "image/jpg" ||
                req.file.mimetype === "image/jpeg" ||
                req.file.mimetype === "image/png"
                ) 
            {
                return true;
            } else {
                throw new Error("Only png, jpg and jpeg images are supported!")
            }
        }
        return true;
    }),
    body(
        "price",
        "Please enter a valid price!"
    )
    .isNumeric(),
    body(
        "description",
        "Description must be at least 10 characters long!"
    )
    .isLength({ min: 10 }),
    (async (req ,res, next) => {
        const errors = validationResult(req);
        const { productId, title, price, imageUrl, description } = req.body;
        
        if (!errors.isEmpty()) {
            const product = await Product.findById(productId);
            try {
                if (!product) return res.redirect("/");
                return res.render("admin/edit-product", { 
                    pageTitle: "Edit Product", 
                    path: "/admin/edit-product",
                    editing: true,
                    product: { _id: product._id, title, price, description },
                    isAuthenticated: req.session.isLoggedIn,
                    hasError: true,
                    errors: errors.array()
                }); 
            } catch {
                return console.log(err);
            }
        }
        next();
    })
];