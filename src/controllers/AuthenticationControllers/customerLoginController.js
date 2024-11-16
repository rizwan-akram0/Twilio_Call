const Customer = require("../../models/customerModel/customerModel");
const jwt = require("jsonwebtoken");

module.exports = {
  login: async (req, res) => {
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
      if (!customer.isVerified) {
        return res
          .status(400)
          .json({ status: "error", message: "User is not verified" });
      }
      if (!customer.validatePassword(customer.salt, password)) {
        return res
          .status(400)
          .json({ status: "error", message: "Invalid credentials" });
      }

      const token = jwt.sign(
        {
          id: customer._id,
          email: customer.email,
          name: customer.name,
          registeredNumber: customer.registeredNumber,
          isPaid: customer.isPaid,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
          expiresIn: "6m",
        }
      );

      const refreshToken = jwt.sign(
        {
          id: customer._id,
          email: customer.email,
          name: customer.name,
          registeredNumber: customer.registeredNumber,
          isPaid: customer.isPaid,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
          expiresIn: "1y",
        }
      );

      res.cookie("jwt", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
      });

      return res.status(200).json({
        status: "success",
        message: "Logged in successfully",
        data: {
          token: token,
          customer: {
            id: customer._id,
            email: customer.email,
            name: customer.name,
            registeredNumber: customer.registeredNumber,
            isPaid: customer.isPaid,
          },
        },
      });
    } catch (error) {
      console.error("Error logging in:", error);
      res.status(500).json({ error: "Error logging in" });
    }
  },

  logout: async (req, res) => {
    try {
      const token = req.cookies.jwt;
      if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      res.clearCookie("jwt", {
        httpOnly: true,
        secure: true,
        sameSite: "none",
      });
      res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
      console.error("Error logging out:", error);
      res.status(500).json({ error: "Error logging out" });
    }
  },

  refreshToken: async (req, res) => {
    try {
      const token = req.cookies.jwt;
      if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      jwt.verify(token, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
        if (err) {
          return res.status(403).json({ error: "Forbidden" });
        }
        const customer = Customer.findById(user.id);
        if (!customer) {
          return res.status(400).json({ error: "User does not exist" });
        }
        const token = jwt.sign(
          {
            id: user.id,
            email: user.email,
            name: user.name,
            registeredNumber: user.registeredNumber,
            isPaid: user.isPaid,
          },
          process.env.ACCESS_TOKEN_SECRET,
          {
            expiresIn: "6m",
          }
        );
        return res.status(200).json({
          status: "success",
          message: "Token refreshed successfully",
          data: {
            token: token,
            refreshToken: refreshToken,
            customer: {
              id: customer._id,
              email: customer.email,
              name: customer.name,
              registeredNumber: customer.registeredNumber,
              isPaid: customer.isPaid,
            },
          },
        });
      });
    } catch (error) {
      console.error("Error refreshing token:", error);
      res.status(500).json({ error: "Error refreshing token" });
    }
  },
};
