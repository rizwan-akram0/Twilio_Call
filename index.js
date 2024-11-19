const express = require("express");
require("./src/config/config");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const multer = require("multer");
const cors = require("cors");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const authenticateJWT = require("./src/middlewares/authenticateJWT");
const dotenv = require("dotenv");
const callRoutes = require("./src/routes/callRoutes/callRoutes");
const customerAuthenticationRoutes = require("./src/routes/AuthenticationRoutes/customerAuthenticationRoutes");

const app = express();
app.use(cookieParser());
app.use(
  cors({
    origin: "*",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); // Add this to support form-encoded data
app.use(multer().none());

dotenv.config();

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.use("/api/customer", customerAuthenticationRoutes);
app.use("/api/call", callRoutes);


const IP = process.env.IP || "localhost";
const PORT = process.env.PORT || 3000;
app.listen(PORT, IP, () => {
  console.log(`Server is running on http://${IP}:${PORT}`);
});
