const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const customerForgotPasswordSchema = new Schema(
  {
    email: {
      type: String,
      lowercase: true,
      required: true,
      unique: true,
    },
    otp: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const customerForgotPassword = mongoose.model(
  "customerForgotPassword",
  customerForgotPasswordSchema
);

module.exports = customerForgotPassword;
