const express = require("express");
const router = express.Router();
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

const authenticateJWT = require("../../middlewares/authenticateJWT");

const customerLoginController = require("../../controllers/AuthenticationControllers/customerLoginController");
const customerRegisterController = require("../../controllers/AuthenticationControllers/customerRegisterController");
const customerForgotPassswordController = require("../../controllers/AuthenticationControllers/customerForgotPasswordController");

router.post("/login", customerLoginController.login);
router.post("/register", customerRegisterController.register);
router.post("/verifyEmail", customerRegisterController.verifyEmail);
router.post(
  "/forgotPassword",
  customerForgotPassswordController.forgotPassword
);
router.post(
  "/resendEmailVerification",
  customerRegisterController.resendEmailVerificationOTP
);
router.post("/verifyEmail", customerRegisterController.verifyEmail);
router.post(
  "/changePassword",
  customerForgotPassswordController.changePassword
);
router.post("/resetPassword", customerForgotPassswordController.resetPassword);
router.post("/resendOTP", customerForgotPassswordController.resendOTP);
router.post("/verifyOTP", customerForgotPassswordController.verifyOTP);
router.post("/logout", authenticateJWT, customerLoginController.logout);
router.get("/deleteAccount", customerRegisterController.deleteCustomer);
router.delete("/deleteAccount", customerRegisterController.deleteCustomer);
router.post("/deleteAccount", customerRegisterController.deleteCustomer);

module.exports = router;
