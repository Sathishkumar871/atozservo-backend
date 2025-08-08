// chats.js

// Required libraries
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { nanoid } = require('nanoid');

// Set up Express and HTTP server
const app = express();
const server = http.createServer(app);

// Update these URLs with your actual deployed domains
const FRONTEND_URL = "https://atozservo.xyz"; // Your Vercel frontend URL
const BACKEND_URL = "https://atozservo-backend.onrender.com"; // Your Render backend URL

app.use(cors({
    origin: [
        FRONTEND_URL,
        BACKEND_URL
    ],
    methods: ["GET", "POST"],
    credentials: true
}));

// Socket.IO CORS
const io = new Server(server, {
    cors: {
        origin: [
            FRONTEND_URL,
            BACKEND_URL
        ],
        methods: ["GET", "POST"],
        credentials: true
    }
});


// --- Server-side data structures ---
const groups = {}; 
const users = {}; 

// --- Auto-deletion logic ---
const DELETION_TIMEOUT = 60000;

const startDeletionTimer = (groupId) => {
    if (groups[groupId] && groups[groupId].deletionTimer) {
        clearTimeout(groups[groupId].deletionTimer);
    }
    
    groups[groupId].deletionTimer = setTimeout(() => {
        if (groups[groupId] && Object.keys(groups[groupId].users).length === 0) {
            console.log(`Group ${groupId} has been empty for a minute. Deleting.`);
            delete groups[groupId];
            io.emit('groupDeleted', groupId); 
        }
    }, DELETION_TIMEOUT);
};

// --- Socket.IO Event Handlers ---
io.on('connection', (socket) => {
    console.log(`🟢 User connected with ID: ${socket.id}`);

    // --- Lobby Events ---
    socket.on('createGroup', (groupData) => {
        // ఫ్రంటెండ్ పంపిన IDని ఉపయోగిస్తున్నాం
        const newGroup = {
            id: groupData.id, 
            ...groupData,
            users: {},
            members: 0,
            deletionTimer: null,
        };
        groups[newGroup.id] = newGroup;
        console.log(`📝 New group created: ${newGroup.topic} (ID: ${newGroup.id})`);
        io.emit('newGroupCreated', newGroup);
    });

    socket.on('getGroups', () => {
        socket.emit('groupsList', Object.values(groups));
    });

    // --- In-room Events ---
    socket.on('joinRoom', ({ groupId, user }) => {
        if (!groups[groupId]) {
             groups[groupId] = {
                 id: groupId,
                 language: 'Unknown',
                 level: 'Any',
                 topic: 'Random Chat',
                 members: 0,
                 users: {},
                 deletionTimer: null,
             };
        }
        
        socket.join(groupId);
        
        const newUser = { ...user, id: socket.id };
        groups[groupId].users[socket.id] = newUser;
        groups[groupId].members = Object.keys(groups[groupId].users).length;
        users[socket.id] = { ...newUser, currentRoom: groupId };
        
        if (groups[groupId].deletionTimer) {
            clearTimeout(groups[groupId].deletionTimer);
            groups[groupId].deletionTimer = null;
        }

        console.log(`👤 User ${user.name} joined room: ${groupId}`);
        io.to(groupId).emit('userJoined', newUser);
    });

    socket.on('leaveRoom', ({ groupId }) => {
        const user = users[socket.id];
        if (user && groups[groupId]) {
            console.log(`👋 User ${user.name} left room: ${groupId}`);
            socket.leave(groupId);
            delete groups[groupId].users[socket.id];
            groups[groupId].members = Object.keys(groups[groupId].users).length;
            
            io.to(groupId).emit('userLeft', socket.id);
            
            if (groups[groupId].members === 0) {
                console.log(`Room ${groupId} is now empty. Starting deletion timer.`);
                startDeletionTimer(groupId);
            }
        }
        delete users[socket.id];
    });

    socket.on('userStatusChange', ({ groupId, status }) => {
        if (groups[groupId] && groups[groupId].users[socket.id]) {
            const user = groups[groupId].users[socket.id];
            groups[groupId].users[socket.id] = { ...user, ...status };
            io.to(groupId).emit('userStatusChange', socket.id, status);
            console.log(`🔄 User ${user.name} in ${groupId} changed status:`, status);
        }
    });

    socket.on('speaking', ({ groupId, isSpeaking }) => {
        io.to(groupId).emit('speaking', socket.id, isSpeaking);
    });
    
    socket.on('sendChatMessage', ({ groupId, senderId, senderName, message }) => {
        console.log(`✉️ Message in ${groupId} from ${senderName}: ${message}`);
        io.to(groupId).emit('chatMessage', { senderId, senderName, message });
    });

    // --- Disconnect Event ---
    socket.on('disconnect', () => {
        console.log(`🔴 User disconnected: ${socket.id}`);
        const user = users[socket.id];
        if (user && groups[user.currentRoom]) {
            const groupId = user.currentRoom;
            delete groups[groupId].users[socket.id];
            groups[groupId].members = Object.keys(groups[groupId].users).length;
            io.to(groupId).emit('userLeft', socket.id);

            if (groups[groupId].members === 0) {
                console.log(`Room ${groupId} is now empty. Starting deletion timer.`);
                startDeletionTimer(groupId);
            }
        }
        delete users[socket.id];
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`✅ Server is running on http://localhost:${PORT}`);
});