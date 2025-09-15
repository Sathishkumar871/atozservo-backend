// server.js
// Node 16+ recommended
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const AWS = require("aws-sdk");
const fs = require("fs");
require('dotenv').config();
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json({ limit: '10mb' }));
app.use(express.static("public"));

// --- AWS S3 setup (presign) ---
const S3_BUCKET = process.env.S3_BUCKET || "";
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1'
  });
}
const s3 = new AWS.S3();

// Simple room members map
const roomMembers = new Map();

io.on("connection", (socket) => {
  console.log("🔗 connected:", socket.id);

  socket.on("join-room", ({ roomId, name }) => {
    if (!roomId) return;
    socket.data.roomId = roomId;
    socket.data.name = name || `User-${socket.id.slice(0,5)}`;

    if (!roomMembers.has(roomId)) roomMembers.set(roomId, new Set());
    const members = roomMembers.get(roomId);

    // cap at 10
    if (members.size >= 10) {
      socket.emit("room-full");
      return;
    }

    // tell newcomer who exists
    const existing = [...members].map(id => ({ id, name: io.sockets.sockets.get(id)?.data?.name || `User-${id.slice(0,5)}` }));
    socket.emit("existing-participants", existing);

    // join and notify
    members.add(socket.id);
    socket.join(roomId);
    socket.to(roomId).emit("new-participant", { id: socket.id, name: socket.data.name });
    console.log(`${socket.id} joined ${roomId} (${members.size}/10)`);
  });

  // forward signaling
  socket.on("signal", ({ to, payload }) => {
    io.to(to).emit("signal", { from: socket.id, payload });
  });

  // reactions
  socket.on("reaction", ({ roomId, type }) => {
    io.to(roomId).emit("reaction", { from: socket.id, type });
  });

  // transcript events (from browser speech or server)
  socket.on("transcript", ({ roomId, text, interim }) => {
    io.to(roomId).emit("transcript", { from: socket.id, text, interim });
  });

  // chat (optional)
  socket.on("chat", ({ roomId, message }) => {
    const from = { id: socket.id, name: socket.data.name || `User-${socket.id.slice(0,5)}` };
    io.to(roomId).emit("chat", { from, message, ts: Date.now() });
  });

  socket.on("disconnect", () => {
    const roomId = socket.data.roomId;
    if (roomId && roomMembers.has(roomId)) {
      const members = roomMembers.get(roomId);
      members.delete(socket.id);
      socket.to(roomId).emit("participant-left", { id: socket.id });
      if (members.size === 0) roomMembers.delete(roomId);
      console.log(`${socket.id} left ${roomId}`);
    }
    console.log("❌ disconnected:", socket.id);
  });
});

// presign endpoint for uploads (recordings)
app.post("/presign", async (req, res) => {
  const { filename, contentType } = req.body;
  if (!S3_BUCKET) return res.status(500).json({ error: "S3 not configured" });
  const Key = `recordings/${Date.now()}-${filename}`;
  const params = {
    Bucket: S3_BUCKET,
    Key,
    Expires: 60 * 5,
    ContentType: contentType,
    ACL: 'private'
  };
  try {
    const url = await s3.getSignedUrlPromise('putObject', params);
    res.json({ url, key: Key });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// report endpoint (save to disk for prototype)
app.post("/report", (req, res) => {
  const report = req.body;
  fs.appendFileSync('reports.jsonl', JSON.stringify(report) + "\n");
  res.json({ ok: true });
});

// optional: assistant endpoint (stub). For production, integrate OpenAI or other LLM here.
app.post("/assistant", async (req, res) => {
  const { roomId, transcript } = req.body;
  // stub summary generation - replace with call to OpenAI/LLM
  const summary = `Auto-summary (stub): ${transcript.slice(0,200)}`;
  if (roomId) io.to(roomId).emit("assistant-summary", { summary });
  res.json({ summary });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
