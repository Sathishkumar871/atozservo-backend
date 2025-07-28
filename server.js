// chat-backend/server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const cloudinary = require('cloudinary').v2;
const http = require('http');
const { Server } = require('socket.io');

dotenv.config(); // Load environment variables from .env file

const servicesRoutes = require('./routes/servicesRoutes'); // Your existing API routes
const otpRoutes = require('./routes/otpRoutes'); // Your existing API routes

const app = express();
const server = http.createServer(app); // Create HTTP server from Express app

// Configure CORS for Socket.IO and Express
// IMPORTANT: Adjust 'origin' to your actual frontend URLs in production
const allowedOrigins = [
   "http://localhost:5173",
  "https://atozservo.onrender.com",  
  "https://atozservo.xyz"             

];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(express.json()); // Middleware to parse JSON request bodies
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Error:', err.message));

// --- Socket.IO Matching & Signaling Logic ---
const waitingChatUsers = []; // Sockets waiting for a chat partner
const waitingCallUsers = []; // Sockets waiting for a call partner
const activeCallRooms = new Map(); // Map to store active call rooms and their participants (roomId -> [socketId1, socketId2])

// Helper to generate a unique room ID
const generateUniqueRoomId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

io.on("connection", (socket) => {
  console.log("🟢 Socket connected:", socket.id);

  // --- Chat Specific Events ---
  // Client requests to join a specific chat room
  socket.on("join_chat_room", (roomId) => {
    socket.join(roomId);
    console.log(`${socket.id} joined chat room: ${roomId}`);
  });

  // Handle incoming messages for a specific chat room
  socket.on("send_room_message", ({ roomId, message }) => {
    console.log(`📨 Message for chat room ${roomId} from ${socket.id}:`, message);
    // Emit message to all clients in the specific room (including sender)
    io.to(roomId).emit("message", message);
  });

  // Client leaves a specific chat room
  socket.on("leave_chat_room", (roomId) => {
    socket.leave(roomId);
    console.log(`${socket.id} left chat room: ${roomId}`);
  });

  // Handle request to find a chat partner
  socket.on("find_chat_partner", () => {
    console.log(`${socket.id} is looking for a chat partner.`);
    if (waitingChatUsers.length > 0) {
      const partnerSocketId = waitingChatUsers.shift(); // Get the first waiting user
      const partnerSocket = io.sockets.sockets.get(partnerSocketId);

      if (partnerSocket && partnerSocket.connected) { // Ensure partner is still connected
        const roomId = generateUniqueRoomId();
        socket.join(roomId); // Current socket joins the room
        partnerSocket.join(roomId); // Partner socket joins the room

        console.log(`✨ Chat match found! Room: ${roomId}, Users: ${socket.id}, ${partnerSocketId}`);

        // Notify both users that a chat partner is found
        socket.emit('chat_partner_found', { roomId: roomId, partnerId: partnerSocketId });
        partnerSocket.emit('chat_partner_found', { roomId: roomId, partnerId: socket.id });
      } else {
        // Partner disconnected, add current user back to queue
        waitingChatUsers.push(socket.id); // Add current user back if partner is gone
      }
    } else {
      waitingChatUsers.push(socket.id); // No partner, add to waiting list
      socket.emit('searching', { type: 'chat' }); // Notify client they are searching
    }
  });

  // --- Call Specific Events (WebRTC Signaling) ---

  // Handle request to find a call partner
  socket.on("find_call_partner", () => {
    console.log(`${socket.id} is looking for a call partner.`);
    if (waitingCallUsers.length > 0) {
      const partnerSocketId = waitingCallUsers.shift();
      const partnerSocket = io.sockets.sockets.get(partnerSocketId);

      if (partnerSocket && partnerSocket.connected) {
        const roomId = generateUniqueRoomId();
        socket.join(roomId);
        partnerSocket.join(roomId);

        activeCallRooms.set(roomId, [socket.id, partnerSocketId]); // Track participants in the call room

        console.log(`📞 Call match found! Room: ${roomId}, Users: ${socket.id}, ${partnerSocketId}`);

        // Notify both users that a call partner is found
        socket.emit('call_partner_found', { roomId: roomId, partnerId: partnerSocketId });
        partnerSocket.emit('call_partner_found', { roomId: roomId, partnerId: socket.id });
      } else {
        waitingCallUsers.push(socket.id); // Add current user back if partner is gone
      }
    } else {
      waitingCallUsers.push(socket.id);
      socket.emit('searching', { type: 'call' }); // Notify client they are searching
    }
  });

  // Client requests to join a specific video call room
  socket.on("join-video-call-room", (roomId) => {
    socket.join(roomId);
    console.log(`${socket.id} joined video call room: ${roomId}`);
    // Notify the other peer in the room that a new peer has joined
    // This helps in initiating WebRTC negotiation
    socket.to(roomId).emit('peer-joined-call', socket.id);
  });

  // Client sends an SDP offer
  socket.on("offer", ({ roomId, offer }) => {
    console.log(`Offer from ${socket.id} for room ${roomId}`);
    // Forward the offer to the other peer in the same room
    socket.to(roomId).emit("offer", offer);
  });

  // Client sends an SDP answer
  socket.on("answer", ({ roomId, answer }) => {
    console.log(`Answer from ${socket.id} for room ${roomId}`);
    // Forward the answer to the other peer in the same room
    socket.to(roomId).emit("answer", answer);
  });

  // Client sends an ICE candidate
  socket.on("ice-candidate", ({ roomId, candidate }) => {
    console.log(`ICE candidate from ${socket.id} for room ${roomId}`);
    // Forward the ICE candidate to the other peer in the same room
    socket.to(roomId).emit("ice-candidate", candidate);
  });

  // Client ends a call explicitly
  socket.on("end-call", (roomId) => {
    console.log(`${socket.id} is ending call in room ${roomId}`);
    // Notify the other peer in the room that the call has ended
    socket.to(roomId).emit("call-ended");
    // Make all sockets in this room leave it
    io.sockets.in(roomId).socketsLeave(roomId);
    activeCallRooms.delete(roomId); // Remove room from active tracking
  });

  // --- Disconnect Handling ---
  socket.on("disconnect", () => {
    console.log("🔴 Socket disconnected:", socket.id);

    // Remove disconnected socket from any waiting queues
    const chatIndex = waitingChatUsers.indexOf(socket.id);
    if (chatIndex > -1) {
      waitingChatUsers.splice(chatIndex, 1);
      console.log(`Removed ${socket.id} from chat waiting list.`);
    }
    const callIndex = waitingCallUsers.indexOf(socket.id);
    if (callIndex > -1) {
      waitingCallUsers.splice(callIndex, 1);
      console.log(`Removed ${socket.id} from call waiting list.`);
    }

    // If a user disconnects from an active call, notify the other participant
    activeCallRooms.forEach((participants, roomId) => {
      if (participants.includes(socket.id)) {
        const otherParticipantId = participants.find(id => id !== socket.id);
        if (otherParticipantId) {
          // Notify the remaining participant that their peer disconnected
          io.to(otherParticipantId).emit("call-ended-by-disconnect", roomId);
          // Make all sockets in this room leave it (including the remaining one)
          io.sockets.in(roomId).socketsLeave(roomId);
          activeCallRooms.delete(roomId); // Remove room from active tracking
          console.log(`Call in room ${roomId} ended due to ${socket.id} disconnect.`);
        }
      }
    });
  });
});

// API routes
app.use('/api/services', servicesRoutes);
app.use('/api/otp', otpRoutes);

// Serve frontend static files
// Assumes your React frontend build (`dist` folder) is in '../frontend/dist' relative to this backend

// ✅ Corrected Static Serving

const path = require('path');

if (process.env.NODE_ENV === 'production') {
  const distPath = path.resolve(__dirname, '../frontend/dist');

  app.use(express.static(distPath));

  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'), (err) => {
      if (err) {
        res.status(500).send(err);
      }
    });
  });
}




// Start the server (important: use `server.listen()`, not `app.listen()`)
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
