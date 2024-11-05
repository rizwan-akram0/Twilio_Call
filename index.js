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

app.get("/token", (req, res) => {
  console.log("Received a token request:", req.query); // Log incoming requests
  const identity = "+13254426199"; // Unique identity for the user
  // const identity = req.query.identity; // Unique identity for the user

  if (!identity) {
    return res.status(400).send({ error: "Identity is required" });
  }

  // Create an access token
  const token = new AccessToken(accountSid, apiKey, apiSecret, {
    identity: identity,
  });

  // Grant the user access to Twilio Programmable Voice
  const voiceGrant = new VoiceGrant({
    outgoingApplicationSid: twimlAppSid,
    incomingAllow: true, // Allow incoming calls
  });
  token.addGrant(voiceGrant);

  res.send({
    token: token.toJwt(),
    deviceToken: token.toJwt(), // Use the same token as a device token
  });
});

// TwiML webhook to handle the actual call
app.post("/voice", (req, res) => {
  console.log("Received a call request:", req.body); // Log incoming requests
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const twiml = new VoiceResponse();
  const to = req.body.To.toString(); // This may need to be set correctly based on your app logic
  // const to = "+923348355785";
  const from = "+13254426199"; // Your Twilio phone number

  if (to) {
    console.log("Dialing the number:", to); // Additional logging
    const dial = twiml.dial({ callerId: from, timeout: 30 }); // Add callerId explicitly
    dial.number(to); // Dial the number
  } else {
    twiml.say("Thank you for calling. This is a dummy text you can change.");
  }

  res.type("text/xml");
  res.send(twiml.toString());
});

// Endpoint to make a call using Twilio's API
app.post("/make-call", async (req, res) => {
  const to = req.body.To.toString(); // Get the number to call from the request body
  // const to = "+923348355785"; // Regular phone number, not a client identity

  const from = "+13254426199"; // Your Twilio number
  const client = twilio(accountSid, apiKey, apiSecret);

  if (!to) {
    return res.status(400).send({ error: "The 'to' parameter is required." });
  }

  try {
    // Place the call to a regular phone number using Twilio's calls API
    const call = await client.calls.create({
      url: "https://e7e0-139-135-43-105.ngrok-free.app/voice", // Your TwiML server endpoint
      to: to, // Calling a regular phone number in E.164 format
      from: from, // Your Twilio phone number
    });

    console.log("Call initiated:", call.sid);
    res.send({ message: "Call initiated", callSid: call.sid });
  } catch (error) {
    console.error("Error making call:", error);
    res.status(500).send({ error: "Error making call" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
