const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const sgMail = require("@sendgrid/mail");

const User = require("../models/user");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

exports.getSignup = (req, res, next) => {
    res.render("auth/signup", {
        path: "/signup",
        pageTitle: "Signup",
        isAuthenticated: false,
        errors: []
    });
};

exports.postSignup = (req ,res, next) => {
    const { email, password } = req.body;

    bcrypt.hash(password, 12)
        .then(hashedPassword => {
            const user = new User({
                email,
                password: hashedPassword,
                cart: { items: [] }
            });
            return user.save();
        })
        .then(() => {
            sgMail.send({
                to: email,
                from: "gushpanka5@gmail.com",
                subject: "Hello new user!",
                text: "Welcome to my shop!"
            })
            .then(() => res.redirect("/login"));
        })
        .catch(err => {
            console.log(err);
            return res.redirect("/500");
        });
};

exports.getLogin = (req ,res, next) => {
    res.render("auth/login", {
        path: "/login",
        pageTitle: "Login",
        isAuthenticated: req.session.isLoggedIn,
        errorMessage: req.flash("error")[0],
        errors: []
    });
};

exports.postLogin = (req ,res, next) => {
    const { email, password } = req.body;

    User.findOne({ email })
        .then(user => {
            bcrypt.compare(password, user.password)
                .then(samePassword => {
                    if (samePassword) {
                        req.session.isLoggedIn = true;
                        req.session.userId = user._id;
                        req.session.save(err => {
                            res.redirect("/");
                            if (err) { console.log(err); };
                        });
                    } else {
                        req.flash("error", "Password is incorrect!");
                        return req.session.save(() => {
                            res.redirect("back");
                        })
                    }
                })
                .catch(err => console.log(err));
        })
        .catch(err => {
            console.log(err);
            return res.redirect("/500");
        });
};

exports.postLogout = (req, res, next) => {
    req.session.destroy(err => {
        res.redirect("/");
        if (err) {
            console.log(err);
            return res.redirect("/500");
        };
    });
};

exports.getReset = (req, res, next) => {
    res.render("auth/reset", {
        path: "/reset",
        pageTitle: "Reset Password",
        isAuthenticated: false,
        errorMessage: req.flash("error")[0]
    });
};

exports.postReset = (req, res, next) => {
    crypto.randomBytes(32, (err, buffer) => {
        if (err) {
            console.log(err);
            return res.redirect("back");
        }
        const token = buffer.toString("hex");

        User.findOne({ email: req.body.email })
            .then(user => {
                if (!user) {
                    req.flash("error", "No user with that email found.");
                    return res.redirect("back");
                }
                user.resetToken = token;
                user.resetTokenExpiration = Date.now() + 3600000;
                return user.save();
            })
            .then(() => {
                sgMail.send({
                    to: req.body.email,
                    from: "gushpanka5@gmail.com",
                    subject: "Password Reset",
                    html: `
                        <p>U have requested to reset your password,</p>
                        <p>Click this <a href="http://localhost:3000/reset/${token}">link</a> to change your current password.</p>
                    `
                })
                return res.redirect("/");
            })
            .catch(err => {
                console.log(err);
                return res.redirect("/500");
            });
    })
};

exports.getNewPassword = (req, res, next) => {
    const token = req.params.token;

    User.findOne({ resetToken: token, resetTokenExpiration: { $gt: Date.now() } })
        .then(user => {
            res.render("auth/new-password", {
                path: "/new-password",
                pageTitle: "New Password",
                isAuthenticated: false,
                errorMessage: req.flash("error")[0],
                userId: user._id,
                passwordToken: token
            });
        })
        .catch(err => console.log(err));   
}

exports.postNewPassword = (req, res, next) => {
    const newPassword = req.body.password;
    const { userId, passwordToken } = req.body;

    User.findOne({ 
        resetToken: passwordToken,
        resetTokenExpiration: { $gt: Date.now() },
        _id: userId
    })
        .then(user => {
            const hashedNewPassword = bcrypt.hashSync(newPassword, 12);
            user.password = hashedNewPassword;
            user.resetToken, user.resetTokenExpiration = undefined;
            return user.save();
        })
        .then(() => res.redirect("/login"))
        .catch(err => {
            console.log(err);
            return res.redirect("/500");
        });
};