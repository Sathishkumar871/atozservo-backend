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

app.use(cors({
    origin: [
        "http://localhost:5173",            
        "https://atozservo.xyz",             
        "https://atozservo-backend.onrender.com"          
    ],
    methods: ["GET", "POST"],
    credentials: true
}));

// Socket.IO CORS
const io = new Server(server, {
    cors: {
        origin: [
            "http://localhost:5173",
            "https://atozservo.xyz",
            "https://atozservo-backend.onrender.com"

        ],
        methods: ["GET", "POST"],
        credentials: true
    }
});


// --- Server-side data structures ---
// To store all active groups and their members
const groups = {}; // { groupId: { id, language, topic, members, users: {}, deletionTimer: null } }
const users = {};  // { userId: { name, imageUrl, currentRoom, ... } }

// --- Auto-deletion logic ---
const DELETION_TIMEOUT = 60000; // 60 seconds

const startDeletionTimer = (groupId) => {
    // If a timer is already running, clear it
    if (groups[groupId] && groups[groupId].deletionTimer) {
        clearTimeout(groups[groupId].deletionTimer);
    }
    
    // Start a new timer
    groups[groupId].deletionTimer = setTimeout(() => {
        if (groups[groupId] && Object.keys(groups[groupId].users).length === 0) {
            console.log(`Group ${groupId} has been empty for a minute. Deleting.`);
            delete groups[groupId];
            io.emit('groupDeleted', groupId); // Tell all clients to remove this group
        }
    }, DELETION_TIMEOUT);
};

// --- Socket.IO Event Handlers ---
io.on('connection', (socket) => {
    console.log(`🟢 User connected with ID: ${socket.id}`);

    // --- Lobby Events ---
    // A client requests to create a new group
    socket.on('createGroup', (groupData) => {
        const newGroup = {
            id: nanoid(6), // Create a short, unique group ID
            ...groupData,
            users: {},
            members: 0,
            deletionTimer: null,
        };
        groups[newGroup.id] = newGroup;
        console.log(`📝 New group created: ${newGroup.topic} (ID: ${newGroup.id})`);
        io.emit('newGroupCreated', newGroup); // Broadcast to all clients
    });

    // A client requests the initial list of groups
    socket.on('getGroups', () => {
        socket.emit('groupsList', Object.values(groups));
    });

    // --- In-room Events ---
    // A client joins a specific room
    socket.on('joinRoom', ({ groupId, user }) => {
        // If the group doesn't exist, create it (in case a user navigates directly)
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
        
        socket.join(groupId); // Add the user to the Socket.IO room
        
        // Add the user to the server's group data
        const newUser = { ...user, id: socket.id };
        groups[groupId].users[socket.id] = newUser;
        groups[groupId].members = Object.keys(groups[groupId].users).length;
        users[socket.id] = { ...newUser, currentRoom: groupId };
        
        // Clear deletion timer if someone joined
        if (groups[groupId].deletionTimer) {
            clearTimeout(groups[groupId].deletionTimer);
            groups[groupId].deletionTimer = null;
        }

        console.log(`👤 User ${user.name} joined room: ${groupId}`);
        io.to(groupId).emit('userJoined', newUser); // Broadcast to everyone in the room
    });

    // A client leaves a room (e.g., from the back button or hang up)
    socket.on('leaveRoom', ({ groupId }) => {
        const user = users[socket.id];
        if (user && groups[groupId]) {
            console.log(`👋 User ${user.name} left room: ${groupId}`);
            socket.leave(groupId);
            delete groups[groupId].users[socket.id];
            groups[groupId].members = Object.keys(groups[groupId].users).length;
            
            // Broadcast to the room that the user left
            io.to(groupId).emit('userLeft', socket.id);
            
            // If the group is now empty, start the deletion timer
            if (groups[groupId].members === 0) {
                console.log(`Room ${groupId} is now empty. Starting deletion timer.`);
                startDeletionTimer(groupId);
            }
        }
        delete users[socket.id];
    });

    // A client changes their microphone/video status
    socket.on('userStatusChange', ({ groupId, status }) => {
        if (groups[groupId] && groups[groupId].users[socket.id]) {
            const user = groups[groupId].users[socket.id];
            // Update the user's status and broadcast the change
            groups[groupId].users[socket.id] = { ...user, ...status };
            io.to(groupId).emit('userStatusChange', socket.id, status);
            console.log(`🔄 User ${user.name} in ${groupId} changed status:`, status);
        }
    });

    // A client's speaking status changes
    socket.on('speaking', ({ groupId, isSpeaking }) => {
        // Broadcast the speaking status to everyone in the room
        io.to(groupId).emit('speaking', socket.id, isSpeaking);
    });
    
    // A client sends a chat message
    socket.on('sendChatMessage', ({ groupId, senderId, senderName, message }) => {
        console.log(`✉️ Message in ${groupId} from ${senderName}: ${message}`);
        io.to(groupId).emit('chatMessage', { senderId, senderName, message });
    });

    // --- Disconnect Event ---
    socket.on('disconnect', () => {
        console.log(`🔴 User disconnected: ${socket.id}`);
        // If the disconnected user was in a room, treat it as a leave event
        const user = users[socket.id];
        if (user && groups[user.currentRoom]) {
            const groupId = user.currentRoom;
            delete groups[groupId].users[socket.id];
            groups[groupId].members = Object.keys(groups[groupId].users).length;
            io.to(groupId).emit('userLeft', socket.id);

            // If the group is now empty, start the deletion timer
            if (groups[groupId].members === 0) {
                console.log(`Room ${groupId} is now empty. Starting deletion timer.`);
                startDeletionTimer(groupId);
            }
        }
        delete users[socket.id];
    });
});

// Start the server on port 3001
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`✅ Server is running on http://localhost:${PORT}`);
});