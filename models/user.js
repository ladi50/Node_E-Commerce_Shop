const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    password: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    resetToken: String,
    resetTokenExpiration: Date,
    cart: {
        items: [{
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Product",
                required: true
            },
            quantity: {
                type: Number,
                required: true
            }
        }]
    }
});

userSchema.methods.addToCart = function(product) {
    const cartProductIndex = this.cart.items.findIndex(cp => {
        return cp.productId.toString() === product._id.toString();
    });
    let newQuantity = 1;
    const updatedCartItems = [ ...this.cart.items ];

    if (cartProductIndex >= 0) {
        newQuantity = this.cart.items[cartProductIndex].quantity + 1;
        updatedCartItems[cartProductIndex].quantity = newQuantity;
    }
    else {
        updatedCartItems.push({
            productId: product._id ,
            quantity: newQuantity
        });
    }
    const updatedCart = { items: updatedCartItems };
    this.cart = updatedCart;
    return this.save();
};

userSchema.methods.deleteCartItem = function(productId) {
    const oldCartProds = [  ...this.cart.items ];
    const cartProducts = oldCartProds.filter(p => p.productId._id.toString() !== productId.toString());
    this.cart.items = cartProducts;
    return this.save();
};

userSchema.methods.clearCart = function() {
    this.cart.items = [];
    return this.save();
};

const user = mongoose.model("User", userSchema);

module.exports = user;