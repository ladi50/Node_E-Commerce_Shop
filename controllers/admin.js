const product = require("../models/product");
const Product = require("../models/product");
const fileHelper = require("../util/file");

exports.getAddProduct = (req, res, next) => {
    res.render("admin/edit-product", { 
        pageTitle: "Add Product", 
        path: "/admin/add-product",
        editing: false,
        isAuthenticated: req.session.isLoggedIn,
        hasError: false,
        product: {},
        errors: []
    });
};

exports.postAddProduct = (req, res) => {
    const { title, price, description } = req.body;
    const image = req.file;
    const product = new Product({ 
        title,
        price,
        description,
        imageUrl: image.path.substring(6),
        userId: req.user
    });

    product
        .save()
        .then(() => {
            console.log("Created product!");
            res.redirect("/admin/products");
        })
        .catch(err => {
            console.log(err);
            return res.redirect("/500");
        });
};

exports.getEditProduct = (req, res, next) => {
    const editMode = req.query.edit;
    if (!editMode) {
        return res.redirect("/");
    }
    const { productId } = req.params;
    Product.findById(productId)
    .then((product) => {
        if (!product) return res.redirect("/");
        res.render("admin/edit-product", { 
            pageTitle: "Edit Product", 
            path: "/admin/edit-product",
            editing: editMode,
            product: product,
            isAuthenticated: req.session.isLoggedIn,
            hasError: false,
            errors: []
        });
    })
    .catch(err => console.log(err));
};

exports.postEditProduct = (req, res, next) => {
    const { productId, title, price, description } = req.body;
    const image = req.file;

    Product.findById(productId)
        .then(product => {
            if (product.userId.toString() === req.user._id.toString()) {
                product.title = title;
                product.price = price;
                product.description = description;
                if (image) {
                    fileHelper.deleteFile("public/" + product.imageUrl);
                    product.imageUrl = image.path;
                }
                return product.save()
                    .then(() => {
                        console.log("Updated product!");
                        res.redirect("/admin/products");
                    })
            }
        })
        .catch(err => {
            console.log(err);
            return res.redirect("/500");
        });
};

exports.getProducts = (req, res, next) => {
    Product.find({ userId: req.user._id })
        .then(products => {
            res.render("admin/products", { 
                prods: products, 
                pageTitle: "Admin Products", 
                path: "/admin/products",
                isAuthenticated: req.session.isLoggedIn
            });
        })
        .catch(err => console.log(err));
};

exports.deleteProduct = (req, res, next) => {
    const { productId } = req.body;

    Product.findById(productId)
        .then(product => {
            if (!product) throw new Error("Product not found!");
            fileHelper.deleteFile("public/" + product.imageUrl);
            return Product.deleteOne({ _id: productId, userId: req.user._id })
        })
        .then(() => {
            res.redirect("/admin/products");
        })
        .catch(err => {
            console.log(err);
        });
};