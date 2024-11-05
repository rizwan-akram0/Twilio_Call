const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const twilio = require("twilio");
require("dotenv").config();

const app = express();
app.use(cors({ origin: "*" }));
app.use(bodyParser.json()); // Parse JSON bodies

app.use(bodyParser.urlencoded({ extended: true })); // Add this to support form-encoded data

const AccessToken = twilio.jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const apiKey = process.env.TWILIO_API_KEY;
const apiSecret = process.env.TWILIO_API_SECRET;
const twimlAppSid = process.env.TWILIO_APP_SID;
const twilioPhoneNumber = process.env.TWILIO_CALLER_ID;

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/token", (req, res) => {
  const identity = twilioPhoneNumber;

  if (!identity) {
    return res.status(400).send({ error: "Identity is required" });
  }

  const token = new AccessToken(accountSid, apiKey, apiSecret, {
    identity: identity,
  });

  const voiceGrant = new VoiceGrant({
    outgoingApplicationSid: twimlAppSid,
    incomingAllow: true,
  });

  token.addGrant(voiceGrant);

  res.send({
    token: token.toJwt(),
    deviceToken: token.toJwt(),
  });
});

app.post("/voice", (req, res) => {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const twiml = new VoiceResponse();
  const to = req.body.To.toString();
  const from = twilioPhoneNumber;

  if (to) {
    const dial = twiml.dial({ callerId: from, timeout: 30 });
    dial.number(to);
  } else {
    twiml.say("Thank you for calling. This is a dummy text you can change.");
  }

  res.type("text/xml");
  res.send(twiml.toString());
});

app.post("/make-call", async (req, res) => {
  const to = req.body.To.toString();

  const from = twilioPhoneNumber;
  const client = twilio(accountSid, apiKey, apiSecret);

  if (!to) {
    return res.status(400).send({ error: "The 'to' parameter is required." });
  }

  try {
    const call = await client.calls.create({
      url: process.env.IP + process.env.PORT + "/voice",
      to: to,
      from: from,
    });

    res.send({ message: "Call initiated", callSid: call.sid });
  } catch (error) {
    console.error("Error making call:", error);
    res.status(500).send({ error: "Error making call" });
  }
});

const IP = process.env.IP || "localhost";
const PORT = process.env.PORT || 3000;
app.listen(PORT, IP, () => {
  console.log(`Server is running on http://${IP}:${PORT}`);
});
