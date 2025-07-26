const dotenv = require("dotenv");
const mongoose = require("mongoose");
const services = require("./data/services");
const Service = require("./models/Service");

dotenv.config(); // loads .env

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ DB connect error", err);
    process.exit(1);
  }
};

const importData = async () => {
  try {
    await connectDB();
    await Service.deleteMany();
    await Service.insertMany(services);
    console.log("🎉 Services inserted successfully!");
    process.exit();
  } catch (error) {
    console.error("❌ Seeder failed:", error);
    process.exit(1);
  }
};

importData();
