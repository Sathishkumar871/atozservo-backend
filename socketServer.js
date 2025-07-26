const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // Frontend URL or * for all
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log(`🟢 New client connected: ${socket.id}`);

  // Listen for incoming messages from client
  socket.on("message", (msg) => {
    console.log(`📩 Received message:`, msg);

    // Broadcast to all other clients
    socket.broadcast.emit("message", msg);
  });

  socket.on("disconnect", () => {
    console.log(`🔴 Client disconnected: ${socket.id}`);
  });
});

// ✅ Run server on port 5000 (or your choice)
const PORT = 5000;
server.listen(PORT, () => {
  console.log(`🚀 Socket.IO Server running at http://localhost:${PORT}`);
});
