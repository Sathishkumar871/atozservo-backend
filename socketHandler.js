
const groups = [];
const rooms = new Map();

const handleSocketConnections = (io) => {
  io.on("connection", (socket) => {
    console.log("🟢 Socket connected:", socket.id);

   

   
    socket.on('getGroups', () => {
        socket.emit('groupsList', groups);
    });
    socket.on('createGroup', (groupData) => {
        const newGroup = {
            id: groupData.id,
            language: groupData.selectedLanguage,
            level: groupData.selectedLevel,
            topic: groupData.customTopic,
            members: 0,
            users: [],
            isPrivate: groupData.isPrivate || false,
        };
        groups.push(newGroup);
        io.emit('newGroupCreated', newGroup);
    });

    // Handles a user joining a specific room
    socket.on('join-room', (roomId) => {
        socket.join(roomId);

        if (!rooms.has(roomId)) {
            rooms.set(roomId, new Map());
        }
        const userInRoom = { id: socket.id, name: "Guest" }; // You can get the user's name from auth
        rooms.get(roomId).set(socket.id, userInRoom);

        const usersInRoom = Array.from(rooms.get(roomId).values());
        io.to(roomId).emit('room-users', usersInRoom);

        const groupIndex = groups.findIndex(g => g.id === roomId);
        if (groupIndex > -1) {
            groups[groupIndex].members = usersInRoom.length;
            io.emit('groupsList', groups);
        }
    });

    // Handles sending a chat message to a room
    socket.on('send-message', ({ roomId, message }) => {
        io.to(roomId).emit('receive-message', message);
    });

    // Handles a user leaving a room
    socket.on('leave-room', (roomId) => {
        socket.leave(roomId);
        if (rooms.has(roomId)) {
            rooms.get(roomId).delete(socket.id);
            const usersInRoom = Array.from(rooms.get(roomId).values());
            io.to(roomId).emit('room-users', usersInRoom);
            
            const groupIndex = groups.findIndex(g => g.id === roomId);
            if (groupIndex > -1) {
                groups[groupIndex].members = usersInRoom.length;
                io.emit('groupsList', groups);
            }

            if (usersInRoom.length === 0) {
                rooms.delete(roomId);
                const groupIndex = groups.findIndex(g => g.id === roomId);
                if (groupIndex > -1) {
                    groups.splice(groupIndex, 1);
                    io.emit('groupDeleted', roomId);
                }
            }
        }
    });
    socket.on('getGroupDetails', (groupId) => {
        const group = groups.find(g => g.id === groupId);
        socket.emit('groupDetails', group);
    });
    socket.on("disconnect", () => {
        console.log(`🔴 Socket disconnected: ${socket.id}`);
    });
  });
};

module.exports = handleSocketConnections;