// ✅ Import Core Modules
const express = require('express');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const path = require('path');
const cors = require('cors');
const http = require('http'); // 🆕 Required for socket.io

// ✅ Import Routes
const serviceRoutes = require('./routes/servicesRoutes');
const otpRoutes = require('./routes/otpRoutes');
const userRoutes = require('./routes/user');

// ✅ Load .env
dotenv.config();

// ✅ Create App
const app = express();
const server = http.createServer(app); 
const { Server } = require('socket.io');


const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

// ✅ Socket.IO logic
io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);

  // Example: handle a custom event
  socket.on('message', (msg) => {
    console.log('📩 Message received:', msg);
    socket.broadcast.emit('message', msg); // send to all other clients
  });

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

// ✅ Middleware
app.use(express.json());
app.use(cors());

// ✅ API Routes
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