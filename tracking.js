const io = require("socket.io")(5002, {
  cors: { origin: "*" }
});

const orders = {}; // orderId: {status, deliveryBoy}

io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  socket.on("placeOrder", ({ orderId, restoId, userId }) => {
    orders[orderId] = { status: "Order Placed", deliveryBoy: null };
    // Emit status update to user
    socket.emit("orderStatusUpdate", orders[orderId].status);

    // Simulate acceptance after 3s
    setTimeout(() => {
      orders[orderId].status = "Accepted by restaurant";
      socket.emit("orderStatusUpdate", orders[orderId].status);

      // Simulate preparing food 5s later
      setTimeout(() => {
        orders[orderId].status = "Food is being prepared";
        socket.emit("orderStatusUpdate", orders[orderId].status);

        // Simulate delivery boy assignment 5s later
        setTimeout(() => {
          const deliveryBoy = { name: "Ramesh", lat: 17.385, lng: 78.486 }; // example
          orders[orderId].deliveryBoy = deliveryBoy;
          socket.emit("orderStatusUpdate", "Out for delivery");
          socket.emit("deliveryBoyLocation", deliveryBoy);

          // Simulate moving delivery boy every 2s
          let count = 0;
          const interval = setInterval(() => {
            deliveryBoy.lat += 0.001;
            deliveryBoy.lng += 0.001;
            socket.emit("deliveryBoyLocation", deliveryBoy);
            count++;
            if (count > 10) clearInterval(interval);
          }, 2000);

        }, 5000);

      }, 5000);

    }, 3000);
  });

  socket.on("joinOrderTracking", ({ orderId }) => {
    if (orders[orderId]) {
      socket.emit("orderStatusUpdate", orders[orderId].status);
      if (orders[orderId].deliveryBoy) socket.emit("deliveryBoyLocation", orders[orderId].deliveryBoy);
    }
  });
});
