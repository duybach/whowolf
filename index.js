const express = require('express');
const app = express();
const cors = require('cors');
const server = require('http').createServer(app);
const port = 3000;
const io = require('socket.io')(server);
const bodyParser = require('body-parser');

app.use(cors());
app.use(bodyParser.json());

var lobbyList = {};

function makeId(length) {
  let result = '';
  let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('createLobby', (alias, fn) => {
    let lobbyId = makeId(5);

    let lobby = {
      id: lobbyId,
      hostId: socket.id,
      status: 'LOBBY_NOT_READY',
      players: {
        [socket.id]: {
          id: socket.id,
          alias: alias,
          status: 'PLAYER_NOT_READY'
        }
      }
    }

    lobbyList[lobbyId] = lobby

    socket.join(lobbyId, () => {
      fn({ lobbyId: lobbyId });
    });
  });

  socket.on('joinLobby', (lobbyId, alias, fn) => {
    if (lobbyId in lobbyList) {
      lobbyList[lobbyId].players[socket.id] = {
        id: socket.id,
        alias: alias,
        status: 'PLAYER_NOT_READY'
      };

      socket.join(lobbyId, () => {
        socket.to(lobbyId).emit('lobbyStatus', lobbyList[lobbyId]);
        fn({lobbyId: lobbyId});
      });
    } else {
      fn({error: 'Lobby does not exist'});
    }
  });

  socket.on('chat', (lobbyId, chatMessage) => {
    io.to(lobbyId).emit('chat', { alias: lobbyList[lobbyId].players[socket.id].alias, chatMessage: chatMessage });
  });

  socket.on('lobbyStatus', (lobbyId, fn) => {
    if (lobbyId in lobbyList && socket.id in lobbyList[lobbyId].players) {
      fn(lobbyList[lobbyId]);
    } else {
      fn({ error: 'Lobby does not exist or player not in lobby'});
    }
  });

  socket.on('lobby', (lobbyId, action, message) => {
    if (!(lobbyId in lobbyList && socket.id in lobbyList[lobbyId].players && ['LOBBY_NOT_READY', 'LOBBY_READY'].includes(lobbyList[lobbyId].status))) {
      return;
    }

    switch(action) {
      case 'PLAYER_READY':
        lobbyList[lobbyId].players[socket.id].status = message.status ? 'PLAYER_READY' : 'PLAYER_NOT_READY';

        let allPlayerReady = true;

        for (let playerId in lobbyList[lobbyId].players) {
          if (lobbyList[lobbyId].players[playerId].status !== 'PLAYER_READY') {
            allPlayerReady = false;
            break
          }
        }

        lobbyList[lobbyId].status = allPlayerReady ? 'LOBBY_READY' : 'LOBBY_NOT_READY';

        break;
      case 'KICK_PLAYER':
        if (socket.id === lobbyList[lobbyId].hostId && socket.id !== message.playerId) {
          if (message.playerId in lobbyList[lobbyId].players) {
            io.sockets.connected[message.playerId].leave(lobbyId);
            delete lobbyList[lobbyId].players[message.playerId];
          }
        }
        break;
      case 'START_GAME':
        if (socket.id === lobbyList[lobbyId].hostId) {
          if (lobbyList[lobbyId].status === 'LOBBY_READY') {
            lobbyList[lobbyId].status = 'GAME';
          }
        }
        break;
      default:
        break;
    }

    io.to(lobbyId).emit('lobbyStatus', lobbyList[lobbyId]);
  });
});

server.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
