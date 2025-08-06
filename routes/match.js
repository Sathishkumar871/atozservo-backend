// match.js
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("./models/User");

const connectedUsers = new Map(); // socketId -> user
const waitingQueue = []; // store user info { socket, user }

module.exports = function setupMatching(server) {
  const io = new Server(server, {
    cors: {
      origin: "*"
    }
  });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) return next(new Error("User not found"));
        socket.user = user;
        next();
      } catch (err) {
        return next(new Error("Authentication failed"));
      }
    } else {
      socket.user = null; // anonymous
      next();
    }
  });

  io.on("connection", (socket) => {
    console.log("🔌 New socket:", socket.id);

    socket.on("find-stranger", () => {
      const user = socket.user;
      let matched = false;

      // Try to match with a waiting user who fits preferences
      for (let i = 0; i < waitingQueue.length; i++) {
        const other = waitingQueue[i];

        if (isCompatible(user, other.user)) {
          waitingQueue.splice(i, 1); // Remove matched user from queue

          // Join both sockets to same room
          const roomId = `room-${socket.id}-${other.socket.id}`;
          socket.join(roomId);
          other.socket.join(roomId);

          socket.emit("match-found", { partner: getDisplayInfo(other.user) });
          other.socket.emit("match-found", { partner: getDisplayInfo(user) });

          matched = true;
          break;
        }
      }

      if (!matched) {
        waitingQueue.push({ socket, user });
        socket.emit("waiting", "Searching for a partner...");
      }
    });

    socket.on("disconnect", () => {
      // Remove from queue
      const index = waitingQueue.findIndex((item) => item.socket.id === socket.id);
      if (index !== -1) {
        waitingQueue.splice(index, 1);
      }
    });
  });
};

// Check if userA is compatible with userB
function isCompatible(userA, userB) {
  if (!userA || !userB) return true; // anonymous or fallback

  const prefA = userA.preferences || {};
  const prefB = userB.preferences || {};

  const genderMatch =
    prefA.preferredGender === "any" ||
    userB.gender === prefA.preferredGender;

  const languageMatch =
    prefA.preferredLanguage === "any" ||
    userB.language === prefA.preferredLanguage;

  return genderMatch && languageMatch;
}

// Show only needed info to frontend
function getDisplayInfo(user) {
  if (!user) return { name: "Anonymous" };
  return {
    name: user.username || "User",
    gender: user.gender,
    language: user.language
  };
}
