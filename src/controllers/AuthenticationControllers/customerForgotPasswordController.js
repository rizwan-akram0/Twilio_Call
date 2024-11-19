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
        text: `Hello, Your OTP is ${otp}`,
        html: `<div style="font-family: Helvetica,Arial,sans-serif;min-width:1000px;overflow:auto;line-height:2">
          <div style="margin:50px auto;width:70%;padding:20px 0">
            <div style="border-bottom:1px solid #eee">
              <a href="" style="font-size:1.4em;color: #00466a;text-decoration:none;font-weight:600">Welcome to Faceme Time</a>
            </div>
            <p style="font-size:1.1em">Hi,</p>
            <p>
              You recently requested to reset your password for your Faceme Time account. Use the OTP below to reset it.
            </p>
            <h2 style="background: #00466a;margin: 0 auto;width: max-content;padding: 0 10px;color: #fff;border-radius: 4px;">${otp}</h2>
            <p style="font-size:0.9em;">Regards,<br />Faceme Time</p>
            <hr style="border:none;border-top:1px solid #eee" />
            <div style="float:right;padding:8px 0;color:#aaa;font-size:0.8em;line-height:1;font-weight:300">
              <p>Faceme Time Inc</p>
            </div>
          </div>
        </div>`,
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

      const otp = generateOTP();
      if (!customerForgotPassword) {
        const newCustomerForgotPassword = new CustomerForgotPassword({
          email: email,
          otp: otp,
        });
        await newCustomerForgotPassword.save();
      }
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
        text: `Hello, Your OTP is ${otp}`,
        html: `<div style="font-family: Helvetica,Arial,sans-serif;min-width:1000px;overflow:auto;line-height:2">
          <div style="margin:50px auto;width:70%;padding:20px 0">
            <div style="border-bottom:1px solid #eee">
              <a href="" style="font-size:1.4em;color: #00466a;text-decoration:none;font-weight:600">Welcome to Faceme Time</a>
            </div>
            <p style="font-size:1.1em">Hi,</p>
            <p>
              You recently requested to reset your password for your Faceme Time account. Use the OTP below to reset it.
            </p>
            <h2 style="background: #00466a;margin: 0 auto;width: max-content;padding: 0 10px;color: #fff;border-radius: 4px;">${otp}</h2>
            <p style="font-size:0.9em;">Regards,<br />Faceme Time</p>
            <hr style="border:none;border-top:1px solid #eee" />
            <div style="float:right;padding:8px 0;color:#aaa;font-size:0.8em;line-height:1;font-weight:300">
              <p>Faceme Time Inc</p>
            </div>
          </div>
        </div>`,
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

  changePassword: async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
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

      const salt = crypto.randomBytes(16).toString("hex");
      const hashedPassword = bcrypt.hashSync(salt + password, 10);
      await Customer.updateOne(
        { email: email },
        { password: hashedPassword, salt: salt }
      );

      return res
        .status(200)
        .json({ status: "success", message: "Password changed successfully" });
    } catch (err) {
      return res.status(500).json({ status: "error", message: err.message });
    }
  },
};
