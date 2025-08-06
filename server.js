// chat-backend/server.js
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
  "https://atozservo.onrender.com",
  "http://localhost:5173"
];

// Express app cors configuration
app.use(express.json());
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Socket.IO server cors configuration
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Error:', err.message));

const waitingChatUsers = [];
const waitingCallUsers = [];
const activeCallRooms = new Map();

const generateUniqueRoomId = () => {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
};

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (token) {
    try {
      const user = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = user;
    } catch (err) {
      socket.user = { anonymous: true };
    }
  } else {
    socket.user = { anonymous: true };
  }
  next();
});

io.on("connection", (socket) => {
  console.log("🟢 Socket connected:", socket.id);

  socket.on("join_chat_room", (roomId) => {
    socket.join(roomId);
  });

  socket.on("send_room_message", ({ roomId, message }) => {
    io.to(roomId).emit("message", message);
  });

  socket.on("leave_chat_room", (roomId) => {
    socket.leave(roomId);
  });

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

  socket.on("disconnect", () => {
    const chatIndex = waitingChatUsers.indexOf(socket.id);
    if (chatIndex > -1) waitingChatUsers.splice(chatIndex, 1);

    const callIndex = waitingCallUsers.indexOf(socket.id);
    if (callIndex > -1) waitingCallUsers.splice(callIndex, 1);

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
  });
});

// Stream YouTube video without download
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
    console.error(err);
    res.status(500).json({ error: 'Failed to stream video' });
  }
});

app.use('/api/services', servicesRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/user', userRoutes);

if (process.env.NODE_ENV === 'production') {
  const distPath = path.resolve(__dirname, '../frontend/dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'), err => {
      if (err) res.status(500).send(err);
    });
  });
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\u{1F680} Server running on port ${PORT}`);
});