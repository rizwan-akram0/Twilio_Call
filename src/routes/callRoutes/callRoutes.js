const express = require("express");
const router = express.Router();

const callControllers = require("../../controllers/callControllers/callControllers");
const authenticateJWT = require("../../middlewares/authenticateJWT");

router.get(
  "/accountBalance",
  authenticateJWT,
  callControllers.getAccountBalance
);
router.get("/token", authenticateJWT, callControllers.getToken);
router.post("/makeCall", callControllers.makeCall);
router.post("/voice", callControllers.connectVoiceCall);
router.post("/createCallerId", authenticateJWT, callControllers.createCallerId);
router.get(
  "/verificationStatus",
  authenticateJWT,
  callControllers.getVerificationStatus
);
router.post(
  "/webhooks/twilio/verifyCallback",
  callControllers.handleTwilioCallback
);
router.get(
  "/availableMinutes",
  authenticateJWT,
  callControllers.getAvailableMinutes
);
router.post(
  "/updateAvailableMinutes",
  authenticateJWT,
  callControllers.updateAvailableMinutes
);
router.get(
  "/admin-a1b2c3/updateMinutesAndBalance",
  callControllers.updateMinutesAndBalance
);

module.exports = router;
