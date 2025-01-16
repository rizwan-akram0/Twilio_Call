const twilio = require("twilio");
const AccessToken = twilio.jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;
const Customer = require("../../models/customerModel/customerModel");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const apiKey = process.env.TWILIO_API_KEY;
const apiSecret = process.env.TWILIO_API_SECRET;
const twimlAppSid = process.env.TWILIO_APP_SID;
const twilioPhoneNumber = process.env.TWILIO_CALLER_ID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

module.exports = {
  getAvailableMinutes: async (req, res) => {
    try {
      const customerInfo = req.auth;
      const customer = await Customer.findById(customerInfo.id);
      res.send({ availableMinutes: customer?.availableMinutes });
    } catch (error) {
      console.error("Error fetching available minutes:", error);
      res.status(500).send({ error: "Error fetching available minutes" });
    }
  },

  updateAvailableMinutes: async (req, res) => {
    try {
      const customerInfo = req.auth;
      const { minutes } = req.body;
      // Validate minutes input
      if (isNaN(minutes)) {
        return res.status(400).send({ error: "Invalid minutes value" });
      }

      const customer = await Customer.findById(customerInfo.id);
      if (!customer) {
        return res.status(404).send({ error: "Customer not found" });
      }

      // Ensure customer has enough minutes
      const currentMinutes = parseInt(customer.availableMinutes) || 0;
      const minutesToDeduct = parseInt(minutes);

      if (currentMinutes < minutesToDeduct) {
        return res.status(400).send({
          error: "Insufficient available minutes",
          availableMinutes: currentMinutes,
        });
      }

      const availableMinutes = currentMinutes - 1;
      if (availableMinutes == minutes) {
        customer.availableMinutes = availableMinutes;
      } else if (availableMinutes > minutes) {
        customer.availableMinutes = currentMinutes - 1;
      } else if (availableMinutes < minutes) {
        customer.availableMinutes = currentMinutes + 1;
      }
      await customer.save();

      res.send({
        availableMinutes: customer.availableMinutes,
        minutesDeducted: minutesToDeduct,
      });
    } catch (error) {
      console.error("Error updating available minutes:", error);
      res.status(500).send({ error: "Error updating available minutes" });
    }
  },
  getAccountBalance: async (req, res) => {
    try {
      const customerInfo = req.auth;

      const customer = await Customer.findById(customerInfo.id);
      if (!customer) {
        return res.status(404).send({ error: "Customer not found" });
      }

      const data = await client.balance.fetch();
      const balance = Math.round(data.balance * 100) / 100;

      // Get all customers with available minutes
      const customersWithMinutes = await Customer.find({
        availableMinutes: { $gt: 0 },
      });

      // Extract minutes array and calculate total
      const minutesArray = customersWithMinutes.map(
        (item) => item.availableMinutes
      );
      const totalMinutes = minutesArray.reduce(
        (sum, minutes) => sum + minutes,
        0
      );

      let final = balance - totalMinutes * 0.5;
      if(final <= 0 && balance > 0){
        final = 1;
      }

      const currency = data.currency;
      res.send({
        balance: final,
        currency,
      });
    } catch (error) {
      console.error("Error fetching balance:", error);
      res.status(500).send({ error: "Error fetching balance" });
    }
  },

  getToken: async (req, res) => {
    const customerInfo = req.auth;

    const customer = await Customer.findById(customerInfo.id);
    if (!customer) {
      return res.status(404).send({ error: "Customer not found" });
    }
    const identity = customer.registeredNumber;
    // const identity = twilioPhoneNumber;

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
      const caller = req.body.Caller.replace(/\D/g, "");
      const VoiceResponse = twilio.twiml.VoiceResponse;
      const twiml = new VoiceResponse();
      const to = req.body.To.toString();
      const from = `+${caller}`;

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
  createCallerId: async (req, res) => {
    const phoneNumber = req.body.phoneNumber;
    const customerInfo = req.auth;

    if (!phoneNumber) {
      return res.status(400).send({ error: "Phone number is required" });
    }

    const phone = await Customer.findOne({ registeredNumber: phoneNumber });
    if (phone) {
      return res.status(400).send({ error: "Phone number already registered" });
    }

    // Ensure the customer exists
    const customer = await Customer.findById(customerInfo.id);
    if (!customer) {
      return res.status(404).send({ error: "Customer not found" });
    }

    try {
      // Step 1: Create Caller ID validation request
      const validationRequest = await client.validationRequests.create({
        phoneNumber: phoneNumber,
        friendlyName: customer.name,
        statusCallback: `${process.env.CALLBACK_URL}/api/call/webhooks/twilio/verifyCallback`, // Twilio will call this URL on status change
      });

      // Step 2: Send SMS
      await client.messages.create({
        body: `Your validation code for Faceme Time is: ${validationRequest.validationCode}`,
        from: twilioPhoneNumber, // Your Twilio phone number
        to: phoneNumber,
      });

      const updatedCustomer = await Customer.findByIdAndUpdate(
        customerInfo.id,
        { callSid: validationRequest.callSid }
      );

      res.send({
        message: "Validation process started. Awaiting Twilio confirmation.",
      });
    } catch (error) {
      console.error("Error creating Caller ID:", error);
      res.status(500).send({ error: "Error creating Caller ID" });
    }
  },
  handleTwilioCallback: async (req, res) => {
    const { VerificationStatus, To, CallSid } = req.body;

    if (VerificationStatus === "success") {
      try {
        // Find the customer linked to this phone number
        const customer = await Customer.findOne({ callSid: CallSid });

        if (!customer) {
          return res.status(404).send({ error: "Customer not found" });
        }

        customer.registeredNumber = To;
        customer.isVerified = true;
        await customer.save();

        res.status(200).send({ message: "Phone number verified and saved." });
      } catch (error) {
        console.error("Error saving phone number:", error);
        res.status(500).send({ error: "Error saving phone number" });
      }
    } else {
      console.log("Verification failed:", VerificationStatus);
      res.status(400).send({ error: "Verification failed." });
    }
  },
  // Add this to your backend API endpoints
  getVerificationStatus: async (req, res) => {
    try {
      const customerInfo = req.auth;

      const customer = await Customer.findById(customerInfo.id);
      if (!customer) {
        return res.status(404).send({ error: "Customer not found" });
      }

      res.send({
        isVerified: customer.isVerified,
        registeredNumber: customer.registeredNumber,
      });
    } catch (error) {
      console.error("Error checking verification status:", error);
      res.status(500).send({ error: "Error checking verification status" });
    }
  },
  updateMinutesAndBalance: async (req,res)=>{
    try {
      const {
        minutes,balance, email
      } = req.query;

      if(!minutes || !balance || !email){
        return res.status(400).send({error:"Provide all fields"});
      }

      const customer = await Customer.findOne({email});
      if (!customer) {
        return res.status(404).send({ error: "Customer not found" });
      }

      customer.availableMinutes = minutes;
      customer.balance = balance;

      await customer.save();

      res.send({
        availableMinutes: customer.availableMinutes,
        balance: customer.balance
      });
      
    } catch (error) {
      console.error("Error changing balance:", error);
      res.status(500).send({ error: "Error changing balance" });
    }
  }
};
