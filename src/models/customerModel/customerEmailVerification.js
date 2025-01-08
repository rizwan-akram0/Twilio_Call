const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const customerEmailVerificationSchema = new Schema(
  {
    email: {
      type: String,
      lowercase: true,
      required: true,
    },
    otp: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const customerEmailVerification = mongoose.model(
  "customerEmailVerification",
  customerEmailVerificationSchema
);

module.exports = customerEmailVerification;
