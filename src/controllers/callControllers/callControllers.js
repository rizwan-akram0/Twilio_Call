const twilio = require("twilio");
const AccessToken = twilio.jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const apiKey = process.env.TWILIO_API_KEY;
const apiSecret = process.env.TWILIO_API_SECRET;
const twimlAppSid = process.env.TWILIO_APP_SID;
const twilioPhoneNumber = process.env.TWILIO_CALLER_ID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

module.exports = {
  getAccountBalance: async (req, res) => {
    try {
      const data = await client.balance.fetch();
      const balance = Math.round(data.balance * 100) / 100;
      const currency = data.currency;
      res.send({ balance, currency });
    } catch (error) {
      console.error("Error fetching balance:", error);
      res.status(500).send({ error: "Error fetching balance" });
    }
  },

  getToken: (req, res) => {
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
  },

  makeCall: async (req, res) => {
    const to = req.body.To.toString();

    const from = twilioPhoneNumber;
    const client = twilio(accountSid, authToken);

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
  },

  connectVoiceCall: async (req, res) => {
    try {
      const VoiceResponse = twilio.twiml.VoiceResponse;
      const twiml = new VoiceResponse();
      const to = req.body.To.toString();
      const from = twilioPhoneNumber;

      if (to) {
        const dial = twiml.dial({ callerId: from, timeout: 30 });
        dial.number(to);
      } else {
        twiml.say(
          "Thank you for calling. This is a dummy text you can change."
        );
      }

      res.type("text/xml");
      res.send(twiml.toString());
    } catch (error) {
      console.error("Error connecting voice call:", error);
      res.status(500).send({ error: "Error connecting voice call" });
    }
  },
};
