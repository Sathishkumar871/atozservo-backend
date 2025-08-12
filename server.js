const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");
const dotenv = require("dotenv");
const cloudinary = require("cloudinary").v2;
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const ytdl = require("ytdl-core");

dotenv.config();

const servicesRoutes = require('./routes/servicesRoutes');
const otpRoutes = require('./routes/otpRoutes');
const userRoutes = require('./routes/userRoutes');
const MatchLog = require('./models/MatchLog');
const User = require('./models/User');

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  "https://www.atozservo.xyz",
  "https://atozservo-frontend-git-main-sathishs-projects-287a647c.vercel.app",
  "https://atozservo-backend.onrender.com",
  "http://localhost:5173"
];

// ✅ Express CORS (API)
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // Allow non-browser requests
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error("CORS not allowed for this origin"), false);
    }
  },
  credentials: true
}));

app.use(express.json());

// ✅ Socket.IO CORS
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// ✅ Cloudinary Config
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ MongoDB Connect
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Error:', err.message));

// ======== Matchmaking Data =========
const waitingChatUsers = [];
const waitingCallUsers = [];
const waitingAudioUsers = [];
const activeCallRooms = new Map();

const generateUniqueRoomId = () =>
  Math.random().toString(36).substring(2, 15) +
  Math.random().toString(36).substring(2, 15);

// ✅ Socket Auth Middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (token) {
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      socket.user = { anonymous: true };
    }
  } else {
    socket.user = { anonymous: true };
  }
  next();
});

// ✅ Socket Connection Events
io.on("connection", (socket) => {
  console.log("🟢 Socket connected:", socket.id);

  // Chat Partner Matching
  socket.on("find_chat_partner", async () => {
    if (waitingChatUsers.length > 0) {
      const partnerSocketId = waitingChatUsers.shift();
      const partnerSocket = io.sockets.sockets.get(partnerSocketId);

      if (partnerSocket?.connected) {
        const roomId = generateUniqueRoomId();
        socket.join(roomId);
        partnerSocket.join(roomId);

        await MatchLog.create({
          user1: socket.user?.id || 'anonymous',
          user2: partnerSocket.user?.id || 'anonymous',
          matchedAt: new Date()
        });

        const currentUser = await User.findById(partnerSocket.user?.id || "");
        const partnerUser = await User.findById(socket.user?.id || "");

        socket.emit('chat_partner_found', {
          roomId,
          partnerId: partnerSocket.id,
          partner: {
            name: currentUser?.name || "Anonymous",
            avatar: currentUser?.avatarUrl || null
          }
        });

        partnerSocket.emit('chat_partner_found', {
          roomId,
          partnerId: socket.id,
          partner: {
            name: partnerUser?.name || "Anonymous",
            avatar: partnerUser?.avatarUrl || null
          }
        });
      } else {
        waitingChatUsers.push(socket.id);
      }
    } else {
      waitingChatUsers.push(socket.id);
      socket.emit('searching', { type: 'chat' });
    }
  });

  // Video Call Partner Matching
  socket.on("find_call_partner", () => {
    if (waitingCallUsers.length > 0) {
      const partnerSocketId = waitingCallUsers.shift();
      const partnerSocket = io.sockets.sockets.get(partnerSocketId);

      if (partnerSocket?.connected) {
        const roomId = generateUniqueRoomId();
        socket.join(roomId);
        partnerSocket.join(roomId);

        activeCallRooms.set(roomId, [socket.id, partnerSocketId]);

        socket.emit('call_partner_found', { roomId, partnerId: partnerSocketId });
        partnerSocket.emit('call_partner_found', { roomId, partnerId: socket.id });
      } else {
        waitingCallUsers.push(socket.id);
      }
    } else {
      waitingCallUsers.push(socket.id);
      socket.emit('searching', { type: 'call' });
    }
  });

  // Audio Partner Matching
  socket.on('find_partner', (user) => {
    if (waitingAudioUsers.length > 0) {
      const partnerSocketId = waitingAudioUsers.shift();
      if (io.sockets.sockets.has(partnerSocketId)) {
        io.to(socket.id).emit('partner_found', { 
          id: partnerSocketId, 
          name: 'Partner', 
          avatar: 'https://ui-avatars.com/api/?name=Partner', 
          audioOnly: true 
        });
        io.to(partnerSocketId).emit('partner_found', { 
          id: socket.id, 
          name: user.name, 
          avatar: user.avatar, 
          audioOnly: true 
        });
      } else {
        waitingAudioUsers.push(socket.id);
      }
    } else {
      waitingAudioUsers.push(socket.id);
    }
  });

  // WebRTC Signaling
  socket.on('signal', (data) => {
    io.to(data.to).emit('signal_from_peer', {
      signal: data.signal,
      from: data.from,
    });
  });

  socket.on("join-video-call-room", (roomId) => {
    socket.join(roomId);
    socket.to(roomId).emit('peer-joined-call', socket.id);
  });

  socket.on("offer", ({ roomId, offer }) => {
    socket.to(roomId).emit("offer", offer);
  });

  socket.on("answer", ({ roomId, answer }) => {
    socket.to(roomId).emit("answer", answer);
  });

  socket.on("ice-candidate", ({ roomId, candidate }) => {
    socket.to(roomId).emit("ice-candidate", candidate);
  });

  socket.on("end-call", (roomId) => {
    socket.to(roomId).emit("call-ended");
    io.sockets.in(roomId).socketsLeave(roomId);
    activeCallRooms.delete(roomId);
  });

  socket.on("cancel_search", () => {
    [waitingChatUsers, waitingCallUsers, waitingAudioUsers].forEach(list => {
      const index = list.indexOf(socket.id);
      if (index > -1) list.splice(index, 1);
    });
  });

  socket.on("disconnect", () => {
    [waitingChatUsers, waitingCallUsers, waitingAudioUsers].forEach(list => {
      const index = list.indexOf(socket.id);
      if (index > -1) list.splice(index, 1);
    });
    activeCallRooms.forEach((participants, roomId) => {
      if (participants.includes(socket.id)) {
        const otherId = participants.find(id => id !== socket.id);
        if (otherId) {
          io.to(otherId).emit("call-ended-by-disconnect", roomId);
          io.sockets.in(roomId).socketsLeave(roomId);
          activeCallRooms.delete(roomId);
        }
      }
    });
    console.log(`🔴 Socket disconnected: ${socket.id}`);
  });
});

// ✅ Video Streaming API
app.get('/api/stream', async (req, res) => {
  const videoURL = req.query.url;
  if (!videoURL) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const info = await ytdl.getInfo(videoURL);
    const format = ytdl.chooseFormat(info.formats, { quality: 'highest', filter: 'audioandvideo' });
    if (!format) {
      return res.status(404).json({ error: 'No suitable format found' });
    }

    res.setHeader('Content-Type', 'video/mp4');
    ytdl(videoURL, { format }).pipe(res);
  } catch (err) {
    res.status(500).json({ error: 'Failed to stream video' });
  }
});

// ✅ API Routes
app.use('/api/services', servicesRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/user', userRoutes);

// ✅ Static Files (Production)
if (process.env.NODE_ENV === 'production') {
  const distPath = path.resolve(__dirname, '../frontend/dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
