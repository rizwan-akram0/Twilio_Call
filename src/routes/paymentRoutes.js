const express = require("express");
const router = express.Router();
const {
  createPaymentIntent,
  handlePaymentSuccess,
} = require("../controllers/paymentController");

const authenticateJWT = require("../middlewares/authenticateJWT");

router.post("/create-payment-intent", authenticateJWT, createPaymentIntent);
router.post("/payment-success", authenticateJWT, handlePaymentSuccess);

module.exports = router;
