const express = require("express");
const router = express.Router();

const callControllers = require("../../controllers/callControllers/callControllers");

router.get("/accountBalance", callControllers.getAccountBalance);
router.get("/token", callControllers.getToken);
router.post("/makeCall", callControllers.makeCall);
router.post("/voice", callControllers.connectVoiceCall);

module.exports = router;
