const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const User = require("../models/User");

const mongoUri =
  process.env.MONGO_URI || "mongodb://localhost:27017/project-assignment";

async function run() {
  try {
    await mongoose.connect(mongoUri, {
      /* use defaults */
    });
    console.log("Connected to", mongoUri);

   

    // const existing = await User.findOne({ username });
    // if (existing) {
    //   console.log(
    //     "User already exists:",
    //     existing.username,
    //     existing._id.toString()
    //   );
    //   await mongoose.disconnect();
    //   return;
    // }

    // const hash = await bcrypt.hash(password, 10);
    // const u = await User.create({ username, email, passwordHash: hash });
    // console.log("Created user:", u.username, u._id.toString());

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error creating user:", err);
    try {
      await mongoose.disconnect();
    } catch (e) {}
    process.exit(1);
  }
}

run();
