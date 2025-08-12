// ✅ Import Core Modules
const express = require('express');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const path = require('path');
const cors = require('cors');
const http = require('http');
const serviceRoutes = require('./routes/servicesRoutes');
const otpRoutes = require('./routes/otpRoutes');
const userRoutes = require('./routes/user');
const { Server } = require('socket.io');

// Import the new socket handler file
const handleSocketConnections = require('./socketHandler');

dotenv.config();
const app = express();
const server = http.createServer(app); 

const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});


handleSocketConnections(io);


app.use(express.json());
app.use(cors());


app.use('/api/services', serviceRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/user', userRoutes);

// ✅ Cloudinary Config
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

cloudinary.api.ping()
  .then(result => console.log('✅ Cloudinary Connected:', result))
  .catch(err => console.error('❌ Cloudinary Error:', err));

// ✅ MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));


app.use(express.static(path.join(__dirname, 'frontend', 'dist'))); 


app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'dist', 'index.html')); 
});


const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server + WebSocket running on port ${PORT}`);
});