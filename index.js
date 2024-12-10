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
const paymentRoutes = require("./src/routes/paymentRoutes");

const fs = require("fs"); // Import FileSystem for SSL certificates
const https = require("https"); // Import HTTPS module

dotenv.config(); // Load environment variables

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

app.get("/api/", (req, res) => {
  res.send("Hello World!");
});

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.use("/api/customer", customerAuthenticationRoutes);
app.use("/api/call", callRoutes);
app.use("/api/payments", paymentRoutes);

// Load SSL Certificates
const privateKey = fs.readFileSync("private.key", "utf8");
const certificate = fs.readFileSync("certificate.crt", "utf8");

const credentials = { key: privateKey, cert: certificate };

const IP = process.env.IP || "localhost";
const HTTP_PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 443;

// Start HTTP server
app.listen(HTTP_PORT, IP, () => {
  console.log(`HTTP Server is running on http://${IP}:${HTTP_PORT}`);
});

// Start HTTPS server
https.createServer(credentials, app).listen(HTTPS_PORT, IP, () => {
  console.log(`HTTPS Server is running on https://${IP}:${HTTPS_PORT}`);
});
