const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

// Create Express app
const app = express();
app.use(cors({
  origin: "https://www.atozservo.xyz", // ✅ Your website
  methods: ["GET", "POST"],
}));
app.use(express.json()); // Optional, good for handling JSON bodies

// Create HTTP server
const server = http.createServer(app);

// Create Socket.IO server
const io = new Server(server, {
  cors: {
    origin: "https://www.atozservo.xyz", // ✅ Allow only your frontend
    methods: ["GET", "POST"]
  }
});

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log(`🟢 Client connected: ${socket.id}`);

  // Message received from a client
  socket.on("message", (msg) => {
    console.log(`📩 Message received:`, msg);

    // Broadcast to all other clients
    socket.broadcast.emit("message", msg);
  });

  // Disconnect event
  socket.on("disconnect", () => {
    console.log(`🔴 Client disconnected: ${socket.id}`);
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Socket.IO Server running at http://localhost:${PORT}`);
});

module.exports = server;
