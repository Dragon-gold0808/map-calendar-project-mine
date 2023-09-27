const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  // username: {
  //   type: String,
  //   // required: true,
  //   min: 3,
  //   max: 20,
  //   // unique: true,
  // },
  email: {
    type: String,
    required: true,
    unique: true,
    max: 50,
  },
  password: {
    type: String,
    // required: true,
    min: 8,
  },
  roll: {
    type: String,
    required: true,
    default: "user",
  },
  state: {
    type: Number,
    required: true,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now, // Set the default value to the current date and time
  },
});

const User = mongoose.model("User", userSchema);

module.exports = User;
