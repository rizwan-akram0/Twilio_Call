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
        text: `Hello, Your OTP is ${otp}`,
        html: `<div style="font-family: Helvetica,Arial,sans-serif;min-width:1000px;overflow:auto;line-height:2">
          <div style="margin:50px auto;width:70%;padding:20px 0">
            <div style="border-bottom:1px solid #eee">
              <a href="" style="font-size:1.4em;color: #00466a;text-decoration:none;font-weight:600">Welcome to Faceme Time</a>
            </div>
            <p style="font-size:1.1em">Hi,</p>
            <p>Thank you for choosing Faceme Time. Use the following OTP to complete your Sign Up procedures.</p>
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

  resendEmailVerificationOTP: async (req, res) => {
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
          .json({ status: "error", message: "Email not found" });
      }

      const otp = generateOTP();

      let emailVerification = await CustomerEmailVerification.findOne({
        email: email,
      });

      if (emailVerification) {
        emailVerification.otp = otp;
        await emailVerification.save();
      } else {
        emailVerification = new CustomerEmailVerification({
          email: email,
          otp: otp,
        });
        await emailVerification.save();
      }

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
        text: `Hello, Your OTP is ${otp}`,
        html: `<div style="font-family: Helvetica,Arial,sans-serif;min-width:1000px;overflow:auto;line-height:2">
          <div style="margin:50px auto;width:70%;padding:20px 0">
            <div style="border-bottom:1px solid #eee">
              <a href="" style="font-size:1.4em;color: #00466a;text-decoration:none;font-weight:600">Welcome to Faceme Time</a>
            </div>
            <p style="font-size:1.1em">Hi,</p>
            <p>Thank you for choosing Faceme Time. Use the following OTP to complete your Sign Up procedures.</p>
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
          console.log(err);
        } else {
          console.log(info);
        }
      });

      return res
        .status(200)
        .json({ status: "success", message: "OTP sent successfully" });
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
      const customer = await Customer.findOne({
        email: email,
      });

      if (!customer) {
        return res
          .status(400)
          .json({ status: "error", message: "Email not found" });
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
    } catch (error) {}
  },
};