const mongoose = require("mongoose");
const user = require("./user");

const User = require("./user");

const orderSchema = new mongoose.Schema({
    products: [
        {
            product: { type: Object, required: true },
            quantity: { type: Number, required: true }
        }
    ],
    user: {
        email: { type: String, required: true },
        userId: { 
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "User"
        }
    }
});

const order = mongoose.model("Order", orderSchema);

module.exports = order;