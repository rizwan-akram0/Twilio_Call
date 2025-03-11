const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const bcrypt = require("bcrypt");

const customerCounterSchema = new Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const customerCounter = mongoose.model(
  "customerCounter",
  customerCounterSchema
);

async function getNextCustomerId() {
  const result = await customerCounter.findByIdAndUpdate(
    { _id: "customerId" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return result.seq;
}

const customerSchema = new Schema(
  {
    customerID: {
      type: Number,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    salt: {
      type: String,
      required: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    balance: {
      type: Number,
      default: 0,
    },
    availableMinutes: {
      type: Number,
      default: 3,
    },
    registeredNumber: {
      type: String,
      sparse: true,
    },
    callSid: {
      type: String,
      required: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    }
  },
  {
    timestamps: true,
  }
);

customerSchema.methods.generateHash = function (salt, password) {
  return bcrypt.hashSync(salt + password, 10);
};

customerSchema.methods.validatePassword = function (salt, password) {
  return bcrypt.compareSync(salt + password, this.password);
};

customerSchema.pre("save", async function (next) {
  if (this.isNew) {
    const nextId = await getNextCustomerId();
    this.customerID = nextId;
  }
  next();
});

const Customer = mongoose.model("Customer", customerSchema);

module.exports = Customer;
