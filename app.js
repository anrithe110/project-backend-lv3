require("dotenv").config();
const Product = require("./product");
const User = require("./User");
const Cart = require("./cart")
const upload = require("./Storage");
const Deletefile = require("./Delete");
const fs = require("fs");
const express = require("express");
const bodyParser = require("body-parser");
const db = require("./db");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy; // Require the LocalStrategy for passport
const app = express();

////////////////////////////////////////////////////////////////////////////////////////////////////////
// Express and Passport Configuration
////////////////////////////////////////////////////////////////////////////////////////////////////////

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

////////////////////////////////////////////////////////////////////////////////////////////////////////
// Passport Configuration
////////////////////////////////////////////////////////////////////////////////////////////////////////
const secret = process.env.SECRET;
app.use(
  session({
    secret: secret,
    resave: true,
    saveUninitialized: true,
  })
);
app.use(passport.initialize());
app.use(passport.session()); 
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

////////////////////////////////////////////////////////////////////////////////////////////////////////
// Routing
////////////////////////////////////////////////////////////////////////////////////////////////////////

app.route("/").get(async (req, res) => {
  try {
    const itemss = await Product.find();
    res.render("home", { items: itemss });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

///////////////////////////////////////////////////////////////////////////////////////////////////////
// register
///////////////////////////////////////////////////////////////////////////////////////////////////////

app
  .route("/register")
  .get((req, res) => {
    res.render("register");
  })
  .post(async (req, res) => {
    try {
      const existingUser = await User.findOne({ username: req.body.username });
      if (existingUser) {
        return res.render("register", {
          error: "User already exists. Please choose a different email.",
        });
      }
      User.register(
        new User({
          username: req.body.username,
          isadmin: req.body.isadmin === "on",
        }),
        req.body.password,
        (err, user) => {
          if (err) {
            console.log(err);
            res.redirect("/register");
          } else {
            passport.authenticate("local")(req, res, () => {
              res.redirect("/login");
            });
          }
        }
      );
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
// login
////////////////////////////////////////////////////////////////////////////////////////////////////////////

app
  .route("/login")
  .get((req, res) => {
    res.render("login");
  })
  .post(
    passport.authenticate("local", {
      successRedirect: "/adminDashboard",
      failureRedirect: "/login",
    })
  );

///////////////////////////////////////////////////////////////////////////////////////////////////////////////
// adding product via admin
///////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.route("/adminDashboard").get((req, res) => {
  if (req.isAuthenticated() && req.user.isadmin) {
    res.render("adminDashboard");
  } else if (req.isAuthenticated()) {
    res.redirect("/UserCart");
  } else {
    res.redirect("/login");
  }
})
  .post(upload, (req, res) => {
    const files = req.files;
    const filenames = files.map((file) => file.filename);
    const product = new Product({
      name: req.body.name,
      specs: req.body.specs,
      price: req.body.price,
      class: req.body.class,
      productCode: req.body.productcode,
      image: filenames
    });
    product
      .save()
      .then(() => {
        console.log("Saved product: ", product,);
        res.redirect("/login");
      })
      .catch((error) => {
        console.error("Error saving product: ", error);
        res.redirect("/login");
      });
  });

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
// deleting item access via admin
//////////////////////////////////////////////////////////////////////////////////////////////////////////////

app.route("/Delete").get((req, res) => {
  if (req.isAuthenticated()) {
    Product.find().then((Items) => {
      res.render("Delete", { items: Items });
    });
  } else {
    res.redirect("/login");
  }
});
app.post("/delete", async (req, res) => {
  const deleting_Item_ID = req.body.deleting;
  await Deletefile(deleting_Item_ID, fs, Product);
});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
// finding specific item
//////////////////////////////////////////////////////////////////////////////////////////////////////////////

app.get("/Product/:Productid", async (req, res) => {
  const requestedProductId = req.params.Productid;
  try {
    const items1 = await Product.find({ _id: requestedProductId });
    res.render("product", { items: items1 });
  } catch (error) {
    res.status(500).send(error.message);
  }
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//cart
//////////////////////////////////////////////////////////////////////////////////////////////////////////////

app.route("/UserCart").get(async (req, res) => {
  if (req.isAuthenticated() && !req.user.isadmin) {
    try {
      // Find the user's cart items
      const items = await Cart.find({ user: req.user._id }).populate("product");
      res.render("usercart", { items }); // Render the cart page with the cart items
    } catch (error) {
      console.error("Error retrieving cart items:", error);
      res.redirect("/"); // Redirect to the homepage or an error page
    }
  } else {
    res.redirect("/login"); // Redirect to the login page if the user is not authenticated or is an admin
  }
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.post("/addToCart", async (req, res) => {
  if (req.isAuthenticated()) {
    const productId = req.body.productId; // Assuming the product ID is submitted in the request body
    const productQuantity = req.body.productQuantity;
    try {
      // Find the product by ID
      const product = await Product.findById(productId);

      if (!product) {
        return res.status(404).send("Product not found");
      }

      // Create a new cart item
      const cartItem = new Cart({
        user: req.user._id,
        product: productId,
        quantity: productQuantity, // You can adjust the quantity as needed
      });

      // Save the cart item to the database
      await cartItem.save();

      res.redirect("/UserCart"); // Redirect the user to the cart page
    } catch (error) {
      console.error("Error adding product to cart:", error);
      res.redirect("/"); // Redirect to the homepage or an error page
    }
  } else {
    res.redirect("/login"); // Redirect to the login page if the user is not authenticated
  }
});


////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Error handling middleware
////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const errorHandler = (err, req, res, next) => {
  console.error(err);
  res.status(500).send("Internal Server Error");
};
app.use(errorHandler);

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// port config
////////////////////////////////////////////////////////////////////////////////////////////////////////////////

app.listen(3000, () => {
  console.log("Server started on port 3000");
});
