const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const { ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.STRIPE_KEY);

const Product = require("../models/product");
const Order = require("../models/order");

const ITEMS_PER_PAGE = 2;

exports.getProducts = (req, res, next) => {
    const page = Number(req.query.page) || 1;
    let totalItems;

    Product.find()
        .countDocuments()
        .then(numProducts => {
            totalItems = numProducts;
            return Product.find()
                .skip((page - 1) * ITEMS_PER_PAGE)
                .limit(ITEMS_PER_PAGE)
        })
        .then(products => {
            res.render("shop/product-list", { 
                prods: products, 
                pageTitle: "Products", 
                path: "/products",
                isAuthenticated: req.session.isLoggedIn,
                currentPage: page,
                hasNextPage: ITEMS_PER_PAGE * page < totalItems,
                hasPreviousPage: page > 1,
                nextPage: page + 1,
                previousPage: page - 1,
                lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)
            });
        })
        .catch(err => console.log(err));
};

exports.getProduct = (req ,res, next) => {
    const { productId } = req.params;
    Product.findById({ _id: ObjectId(productId) })
    .then(product => {
        res.render("shop/product-detail", { 
            product: product,
            pageTitle: product.title,
            path: "/products",
            isAuthenticated: req.session.isLoggedIn
        });
        console.log(product);
    })
    .catch(err => console.log(err));
};

exports.getIndex = (req, res, next) => {
    const page = Number(req.query.page) || 1;
    let totalItems;

    Product.find()
        .countDocuments()
        .then(numProducts => {
            totalItems = numProducts;
            return Product.find()
                .skip((page - 1) * ITEMS_PER_PAGE)
                .limit(ITEMS_PER_PAGE)
        })
        .then(products => {
            res.render("shop/index", { 
                prods: products, 
                pageTitle: "Shop", 
                path: "/",
                isAuthenticated: req.session.isLoggedIn,
                currentPage: page,
                hasNextPage: ITEMS_PER_PAGE * page < totalItems,
                hasPreviousPage: page > 1,
                nextPage: page + 1,
                previousPage: page - 1,
                lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)
            });
        })
        .catch(err => console.log(err));
};

exports.getCheckout = (req, res, next) => {
    let products, total = 0;
    
    req.user.populate("cart.items.productId")
        .execPopulate()
        .then(user => {
            products = user.cart.items;
            total = 0;
            products.forEach(p => {
                total += p.quantity * p.productId.price;
            })
            return stripe.checkout.sessions.create({
                payment_method_types: ["card"],
                line_items: products.map(p => {
                    return {
                        name: p.productId.title,
                        description: p.productId.description,
                        amount: p.productId.price * 100,
                        currency: "usd",
                        quantity: p.quantity
                    }
                }),
                success_url: req.protocol + "://" + req.get("host") + "/checkout/success",
                cancel_url: req.protocol + "://" + req.get("host") + "/checkout/cancel"
            });
        })
        .then(session => {
            res.render("shop/checkout", {
                path: "/checkout",
                pageTitle: "Checkout",
                products: products,
                isAuthenticated: req.session.isLoggedIn,
                totalSum: total,
                sessionId: session.id
            });
        })
        .catch(err => {
            return res.redirect("/500");
        });
};

exports.getCheckoutSuccess = (req ,res, next) => {
    req.user.populate("cart.items.productId")
        .execPopulate()
        .then(user => {
            const products = user.cart.items.map(i => {
                return { quantity: i.quantity, product: { ...i.productId } };
            });
            
            const order = new Order({
                user: {
                    email: req.user.email,
                    userId: req.user._id
                },
                products
            });

            order.save();
            req.user.clearCart();

            res.redirect("/orders");
        })
        .catch(err => {
            console.log(err);
            return res.redirect("/500");
        });
};

exports.getCart = (req, res, next) => {
    req.user.populate("cart.items.productId")
        .execPopulate()
        .then(user => {
            const products = user.cart.items;
            res.render("shop/cart", {
                path: "/cart",
                pageTitle: "Your Cart",
                products: products,
                isAuthenticated: req.session.isLoggedIn
            });
        })
        .catch(err => console.log(err));
};

exports.postCart = (req ,res, next) => {
    const { productId } = req.body;
    Product.findById(productId)
        .then(product => req.user.addToCart(product))
        .then(result => {
            res.redirect("/cart");
        })
        .catch(err => {
            console.log(err);
            return res.redirect("/500");
        });
};

exports.postCartDeleteProduct = (req, res, next) => {
    const { productId } = req.body;

    req.user.deleteCartItem(productId)
        .then(() => res.redirect("/cart"))
        .catch(err => console.log(err));
};

exports.getOrders = (req, res, next) => {
    if (req.session.userId) {
        Order.find({ "user.userId": req.user._id })
            .then(orders => {
                res.render("shop/orders", {
                    path: "/orders",
                    pageTitle: "Your Orders",
                    orders,
                    isAuthenticated: req.session.isLoggedIn
                });
            })
            .catch(err => console.log(err));
    }
    else { res.redirect("/login"); }
};

exports.getInvoice = (req, res, next) => {
    const { orderId } = req.params;
    Order.findById(orderId)
        .then(order => {
            if (!order) {
                throw new Error("No order found!");
            }
            if (order.user.userId.toString() !== req.user._id.toString()) {
                throw new Error("Unauthorized!");
            }
            const invoiceName = "invoice-" + orderId + ".pdf";
            const invoicePath = path.join("data", "invoices", invoiceName);
        
            const pdfDoc = new PDFDocument();
            pdfDoc.pipe(fs.createWriteStream(invoicePath));
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `inline; filename=${invoiceName}`);
            pdfDoc.pipe(res);

            pdfDoc.fontSize(26).text("Invoice", {
                underline: true
            });
            pdfDoc.text("----------------");
            let productPrices = [];
            order.products.forEach(product => {
                let productPrice = product.quantity * product.product.price;
                pdfDoc.fontSize(14).text(`Product: ${product.product.title}`)
                pdfDoc.fontSize(14).text(`Quantity: ${product.quantity}`)
                pdfDoc.fontSize(14).text(`Price: ${productPrice}$`)
                pdfDoc.fontSize(14).text("-----------------------------");
                productPrices.push(productPrice);
            });
            const total = productPrices.reduce((a, b) => a + b);
            pdfDoc.fontSize(20).text(`Total Price: ${total}$`);
            
            pdfDoc.on("error", err => {
                return res.end(err);
            });
            pdfDoc.end();
        })
        .catch(err => {
            console.log(err);
            return res.redirect("/500");
        });
};