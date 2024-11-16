const nodemailer = require("nodemailer");
const Customer = require("../../models/customerModel/customerModel");
const CustomerForgotPassword = require("../../models/customerModel/customerForgotPassword");
const crypto = require("crypto");
const bcrypt = require("bcrypt");

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000)
    .toString()
    .padStart(6, "0");
};

module.exports = {
  forgotPassword: async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res
          .status(400)
          .json({ status: "error", message: "Please enter all fields" });
      }

      const customer = await Customer.findOne({
        email: email,
      });
      if (!customer) {
        return res
          .status(400)
          .json({ status: "error", message: "User does not exist" });
      }
      if (!customer.isVerified) {
        return res
          .status(400)
          .json({ status: "error", message: "User is not verified" });
      }

      const customerForgotPassword = await CustomerForgotPassword.findOne({
        email: email,
      });
      if (customerForgotPassword) {
        await CustomerForgotPassword.deleteOne({ email: email });
      }

      const otp = generateOTP();
      const newCustomerForgotPassword = new CustomerForgotPassword({
        email: email,
        otp: otp,
      });
      await newCustomerForgotPassword.save();

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL,
          pass: process.env.PASSWORD,
        },
      });
      const mailOptions = {
        from: process.env.EMAIL,
        to: email,
        subject: "Password Reset OTP",
        text: `Your OTP for password reset is ${otp}`,
      };
      transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          return res
            .status(500)
            .json({ status: "error", message: err.message });
        }
        return res
          .status(200)
          .json({ status: "success", message: "OTP sent to email" });
      });
    } catch (err) {
      return res.status(500).json({ status: "error", message: err.message });
    }
  },

  resetPassword: async (req, res) => {
    try {
      const { email, otp, password } = req.body;
      if (!email || !otp || !password) {
        return res
          .status(400)
          .json({ status: "error", message: "Please enter all fields" });
      }

      const customer = await Customer.findOne({
        email: email,
      });
      if (!customer) {
        return res
          .status(400)
          .json({ status: "error", message: "User does not exist" });
      }

      const customerForgotPassword = await CustomerForgotPassword.findOne({
        email: email,
      });
      if (!customerForgotPassword) {
        return res
          .status(400)
          .json({ status: "error", message: "OTP not sent" });
      }

      if (customerForgotPassword.otp !== otp) {
        return res
          .status(400)
          .json({ status: "error", message: "Invalid OTP" });
      }

      const salt = crypto.randomBytes(16).toString("hex");
      const hashedPassword = bcrypt.hashSync(salt + password, 10);
      await Customer.updateOne(
        { email: email },
        { password: hashedPassword, salt: salt }
      );
      await CustomerForgotPassword.deleteOne({ email: email });

      return res
        .status(200)
        .json({ status: "success", message: "Password reset successful" });
    } catch (err) {
      return res.status(500).json({ status: "error", message: err.message });
    }
  },

  verifyOTP: async (req, res) => {
    try {
      const { email, otp } = req.body;
      if (!email || !otp) {
        return res
          .status(400)
          .json({ status: "error", message: "Please enter all fields" });
      }

      const customerForgotPassword = await CustomerForgotPassword.findOne({
        email: email,
      });
      if (!customerForgotPassword) {
        return res
          .status(400)
          .json({ status: "error", message: "Invalid OTP" });
      }

      if (customerForgotPassword.otp !== otp) {
        return res
          .status(400)
          .json({ status: "error", message: "Invalid OTP" });
      }

      return res
        .status(200)
        .json({ status: "success", message: "OTP verified successfully" });
    } catch (err) {
      return res.status(500).json({ status: "error", message: err.message });
    }
  },

  resendOTP: async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res
          .status(400)
          .json({ status: "error", message: "Please enter all fields" });
      }

      const customer = await Customer.findOne({
        email: email,
      });
      if (!customer) {
        return res
          .status(400)
          .json({ status: "error", message: "User does not exist" });
      }
      if (!customer.isVerified) {
        return res
          .status(400)
          .json({ status: "error", message: "User is not verified" });
      }

      const customerForgotPassword = await CustomerForgotPassword.findOne({
        email: email,
      });
      if (!customerForgotPassword) {
        return res
          .status(400)
          .json({ status: "error", message: "OTP not sent" });
      }

      const otp = generateOTP();
      await CustomerForgotPassword.updateOne({ email: email }, { otp: otp });

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL,
          pass: process.env.PASSWORD,
        },
      });
      const mailOptions = {
        from: process.env.EMAIL,
        to: email,
        subject: "Password Reset OTP",
        text: `Your OTP for password reset is ${otp}`,
      };
      transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          return res
            .status(500)
            .json({ status: "error", message: err.message });
        }
        return res
          .status(200)
          .json({ status: "success", message: "OTP sent to email" });
      });
    } catch (err) {
      return res.status(500).json({ status: "error", message: err.message });
    }
  },
};
