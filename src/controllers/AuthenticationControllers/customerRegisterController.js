const bcrypt = require("bcryptjs");
const Customer = require("../../models/customerModel/customerModel");
const nodemailer = require("nodemailer");
const CustomerEmailVerification = require("../../models/customerModel/customerEmailVerification");

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000)
    .toString()
    .padStart(6, "0");
};

module.exports = {
  register: async (req, res) => {
    try {
      const { name, email, password } = req.body;
      console.log(req.body);
      if (!name || !email || !password) {
        return res
          .status(400)
          .json({ status: "error", message: "Please enter all fields" });
      }

      const customer = await Customer.findOne({
        email: email,
      });
      if (customer) {
        return res
          .status(400)
          .json({ status: "error", message: "User already exists" });
      }
      if (password.length < 6) {
        return res.status(400).json({
          status: "error",
          message: "Password must be at least 6 characters",
        });
      }

      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(salt + password, 10);

      const newCustomer = new Customer({
        name,
        email,
        password: hash,
        salt,
      });

      await newCustomer.save();
      const otp = generateOTP();

      const emailVerification = new CustomerEmailVerification({
        email: email,
        otp: otp,
      });

      await emailVerification.save();

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
        subject: "Email Verification",
        text: `Your OTP is ${otp}`,
      };

      transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          console.log(err);
        } else {
          console.log(info);
        }
      });

      return res
        .status(200)
        .json({ status: "success", message: "User registered successfully" });
    } catch (err) {
      console.log(err);
      return res
        .status(500)
        .json({ status: "error", message: "Internal server error" });
    }
  },

  verifyEmail: async (req, res) => {
    try {
      const { email, otp } = req.body;
      if (!email || !otp) {
        return res
          .status(400)
          .json({ status: "error", message: "Please enter all fields" });
      }

      const emailVerification = await CustomerEmailVerification.findOne({
        email: email,
      });

      if (!emailVerification) {
        return res
          .status(400)
          .json({ status: "error", message: "Email not found" });
      }

      if (emailVerification.otp !== otp) {
        return res
          .status(400)
          .json({ status: "error", message: "Invalid OTP" });
      }

      await CustomerEmailVerification.findOneAndDelete({ email: email });

      await Customer.findOneAndUpdate(
        { email: email },
        { isVerified: true },
        { new: true }
      );

      return res
        .status(200)
        .json({ status: "success", message: "Email verified successfully" });
    } catch (err) {
      console.log(err);
      return res
        .status(500)
        .json({ status: "error", message: "Internal server error" });
    }
  },
};
