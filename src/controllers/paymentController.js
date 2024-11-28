const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Customer = require("../models/customerModel/customerModel");

const createPaymentIntent = async (req, res) => {
  try {
    const { minutesToAdd } = req.body;
    const customerEmail = req.auth.email;

    if (!minutesToAdd) {
      return res.status(400).json({
        success: false,
        message: "Minutes to add is required",
      });
    }

    const amount = minutesToAdd * 0.5;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: "usd",
      metadata: {
        customerEmail,
        minutesToAdd,
      },
    });

    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error("Payment intent creation error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating payment intent",
    });
  }
};

const handlePaymentSuccess = async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== "succeeded") {
      return res.status(400).json({
        success: false,
        message: "Payment has not succeeded",
      });
    }

    const customer = await Customer.findOne({
      email: paymentIntent.metadata.customerEmail,
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const existingMinutes = customer.availableMinutes || 0;
    const minutesToAdd = parseInt(paymentIntent.metadata.minutesToAdd);
    const totalMinutes = existingMinutes + minutesToAdd;

    const updatedCustomer = await Customer.findOneAndUpdate(
      { email: paymentIntent.metadata.customerEmail },
      {
        $set: {
          isPaid: true,
          balance: (customer.balance || 0) + paymentIntent.amount / 100,
          availableMinutes: totalMinutes,
        },
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Payment processed successfully",
      customer: {
        email: updatedCustomer.email,
        availableMinutes: updatedCustomer.availableMinutes,
        balance: updatedCustomer.balance,
        previousMinutes: existingMinutes,
        addedMinutes: minutesToAdd,
      },
    });
  } catch (error) {
    console.error("Payment processing error:", error);
    res.status(500).json({
      success: false,
      message: "Error processing payment",
    });
  }
};

module.exports = {
  createPaymentIntent,
  handlePaymentSuccess,
};
