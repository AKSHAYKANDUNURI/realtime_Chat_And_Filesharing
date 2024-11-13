const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let users = {};

io.on('connection', (socket) => {
  // Handle setting username and update users list
  socket.on('set username', (username) => {
    users[socket.id] = username;
    io.emit('update users', Object.values(users));
  });

  // Handle private messages
  socket.on('private message', (data) => {
    const { to, message } = data;
    const recipientSocketId = Object.keys(users).find(id => users[id] === to);
    const senderUsername = users[socket.id];

    if (recipientSocketId) {
      // Send the private message to the recipient
      io.to(recipientSocketId).emit('private message', { from: senderUsername, message });

      // Send the same message back to the sender's own view
      socket.emit('private message', { from: 'You', message });
    }
  });

  // Handle broadcast messages
  socket.on('broadcast message', (msg) => {
    const username = users[socket.id];
    if (username) {
      io.emit('broadcast message', { from: username, message: msg });
    }
  });

  // Handle file uploads
  socket.on('file upload', (fileData) => {
    const { filename, fileType, content, to } = fileData;
    const username = users[socket.id];
    if (username) {
      if (to) {
        // If recipient is specified, send the file privately to the recipient
        const recipientSocketId = Object.keys(users).find(id => users[id] === to);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('file upload', {
            from: username,
            filename,
            fileType,
            content,
            isPrivate: true
          });

          // Also display the file back to the sender's own view
          socket.emit('file upload', {
            from: 'You',
            filename,
            fileType,
            content,
            isPrivate: true
          });
        }
      } else {
        // If no recipient is specified, broadcast the file to all users
        io.emit('file upload', { from: username, filename, fileType, content, isPrivate: false });
      }
    }
  });

  // Handle user disconnecting
  socket.on('disconnect', () => {
    delete users[socket.id];
    io.emit('update users', Object.values(users));
  });
});
z
server.listen(3000, () => {
  console.log('listening on :3000');
});
