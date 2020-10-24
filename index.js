const express = require('express');
const app = express();
const cors = require('cors');
const server = require('http').createServer(app);
const port = 3000;
const io = require('socket.io')(server);
const bodyParser = require('body-parser');

const lobby = require('./services/lobby');

app.use(cors());
app.use(bodyParser.json());

var lobbyList = {};

const initWhoWolfLobby = (lobbyId) => {
  lobbyList[lobbyId].status = 'GAME';

  lobbyList[lobbyId].game = {
    round: 0,
    phase: 0,
    timeLeft: 3000,
    discussionTime: 30,
    voteTime: 30,
    teamWon: null,
    werwolfTarget: null,
    amountOfWerWolfPlayers: 2,
    amountOfWitchPlayers: 1
  };

  for (playerId in lobbyList[lobbyId].players) {
    lobbyList[lobbyId].players[playerId].status = 'PLAYER_ALIVE';
    lobbyList[lobbyId].players[playerId].role = 'PEASENT';
  }

  let i = 0;
  while (i < lobbyList[lobbyId].game.amountOfWerWolfPlayers) {
    let randomPlayerId = Object.keys(lobbyList[lobbyId].players)[Math.floor(Math.random() * Math.floor(Object.keys(lobbyList[lobbyId].players).length))];
    if (lobbyList[lobbyId].players[randomPlayerId].role === 'PEASENT') {
      lobbyList[lobbyId].players[randomPlayerId].role = 'WERWOLF';
      i++;
    }
  }

  i = 0;
  while (i < lobbyList[lobbyId].game.amountOfWitchPlayers) {
    let randomPlayerId = Object.keys(lobbyList[lobbyId].players)[Math.floor(Math.random() * Math.floor(Object.keys(lobbyList[lobbyId].players).length))];
    if (lobbyList[lobbyId].players[randomPlayerId].role === 'PEASENT') {
      lobbyList[lobbyId].players[randomPlayerId].role = 'WITCH';
      lobbyList[lobbyId].players[randomPlayerId].healLeft = 1;
      i++;
    }
  }

  const lobbyIntervalId = setInterval(() => {
    lobbyList[lobbyId].game.timeLeft--;
    if (lobbyList[lobbyId].game.timeLeft <= 0) {
      nextPhase(lobbyId);
    }

    if (lobbyList[lobbyId].game.teamWon) {
      clearInterval(lobbyIntervalId);
    }
  }, 1000, lobbyId);
};

const nextPhase = (lobbyId) => {
  if (lobbyList[lobbyId].game.phase === 0) {
    calcEndOfDay(lobbyId);
  } else if (lobbyList[lobbyId].game.phase === 1) {
    let count_sum = {};

    for (playerId in lobbyList[lobbyId].players) {
      if (lobbyList[lobbyId].players[playerId].role !== 'WERWOLF') {
        continue;
      }

      if (lobbyList[lobbyId].players[playerId].targetPlayerId in count_sum) {
        count_sum[lobbyList[lobbyId].players[playerId].targetPlayerId]++;
      } else {
        count_sum[lobbyList[lobbyId].players[playerId].targetPlayerId] = 1;
      }
    }

    let targetPlayerId, maxTarget = 0;
    for (playerId in lobbyList[lobbyId].players) {
      if (count_sum[playerId] > maxTarget) {
        maxTarget = count_sum[playerId];
        targetPlayerId = playerId;
      }
    }

    lobbyList[lobbyId].game.werwolfTarget = targetPlayerId;
  } else if (lobbyList[lobbyId].game.phase === 2) {
    // witch
    for (playerId in lobbyList[lobbyId].players) {
      if (!(lobbyList[lobbyId].players[playerId].role === 'WITCH' && lobbyList[lobbyId].players[playerId].healLeft > 0)) {
        continue;
      }

      lobbyList[lobbyId].game.witchTarget = lobbyList[lobbyId].players[playerId].targetPlayerId;
      lobbyList[lobbyId].players[playerId].healLeft--;
      break;
    }
  }

  lobbyList[lobbyId].game.timeLeft = 30;

  if (lobbyList[lobbyId].game.phase === 2) {
    calcEndOfNight(lobbyId);

    lobbyList[lobbyId].game.round++;
    lobbyList[lobbyId].game.phase = 0;
  } else {
    lobbyList[lobbyId].game.phase++;
  }

  for (playerId in lobbyList[lobbyId].players) {
    lobbyList[lobbyId].players[playerId].targetPlayerId = null;
  }

  io.to(lobbyId).emit('lobbyStatus', lobbyList[lobbyId]);
}

const calcEndOfDay = (lobbyId) => {
  let count_sum = {};

  for (playerId in lobbyList[lobbyId].players) {
    if (lobbyList[lobbyId].players[playerId].targetPlayerId in count_sum) {
      count_sum[lobbyList[lobbyId].players[playerId].targetPlayerId]++;
    } else {
      count_sum[lobbyList[lobbyId].players[playerId].targetPlayerId] = 1;
    }
  }

  let targetPlayerId, maxTarget = 0;
  for (playerId in lobbyList[lobbyId].players) {
    if (count_sum[playerId] > maxTarget) {
      maxTarget = count_sum[playerId];
      targetPlayerId = playerId;
    }
  }

  if (targetPlayerId in lobbyList[lobbyId].players) {
    lobbyList[lobbyId].players[targetPlayerId].status = 'PLAYER_DEAD';

    calcGameResult(lobbyId);
  }
}

const calcEndOfNight = (lobbyId) => {
  if (lobbyList[lobbyId].game.werwolfTarget !== lobbyList[lobbyId].game.witchTarget) {
    lobbyList[lobbyId].players[lobbyList[lobbyId].game.werwolfTarget].status = 'PLAYER_DEAD';
  }

  lobbyList[lobbyId].game.werwolfTarget = null;
  lobbyList[lobbyId].game.witchTarget = null;

  calcGameResult(lobbyId);
}

const calcGameResult = (lobbyId) => {
  let amountOfTownPlayers = 0;
  let amountOfWerWolfPlayers = 0;

  for (playerId in lobbyList[lobbyId].players) {
    if (lobbyList[lobbyId].players[playerId].status !== 'PLAYER_ALIVE') {
      continue;
    }

    if (lobbyList[lobbyId].players[playerId].role === 'WERWOLF') {
      amountOfWerWolfPlayers++;
    } else {
      amountOfTownPlayers++;
    }
  }

  if (amountOfWerWolfPlayers === 0) {
    endGame(lobbyId, 'TOWN');
  } else if (amountOfTownPlayers <= amountOfWerWolfPlayers) {
    endGame(lobbyId, 'WERWOLF');
  }
}

const endGame = (lobbyId, teamWon) => {
  lobbyList[lobbyId].status = 'GAME_END';
  lobbyList[lobbyId].game.teamWon = teamWon;
}

const playerIsAlive = (lobbyId, playerId) => {
   return lobbyList[lobbyId].players[playerId].status === 'PLAYER_ALIVE';
}

const playerIsRole = (lobbyId, playerId, role) => {
  return lobbyList[lobbyId].players[playerId].role === role;
}

io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('createLobby', (alias, fn) => {
    let lobbyId = lobby.makeId(5);

    let new_lobby = {
      id: lobbyId,
      hostId: socket.id,
      status: 'LOBBY_NOT_READY',
      players: {
        [socket.id]: {
          id: socket.id,
          alias: alias,
          status: 'PLAYER_NOT_READY',
          role: null,
          targetPlayerId: null,
          healLeft: null,
          amountOfReceivedVotes: null
        }
      },
      game: null
    };

    lobbyList[lobbyId] = new_lobby;

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
    if (!(lobbyId in lobbyList && socket.id in lobbyList[lobbyId].players && ['LOBBY_NOT_READY', 'LOBBY_READY', 'GAME_END'].includes(lobbyList[lobbyId].status))) {
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
      if (socket.id === lobbyList[lobbyId].hostId && Object.keys(lobbyList[lobbyId].players).length >= 4) {
          if (['LOBBY_READY', 'GAME_END'].includes(lobbyList[lobbyId].status)) {
            whowolf.initWhoWolfLobby(lobbyId);
          }
        }
        break;
      default:
        break;
    }

    io.to(lobbyId).emit('lobbyStatus', lobbyList[lobbyId]);
  });

  socket.on('game', (lobbyId, action, message) => {
    if (!(lobbyId in lobbyList && socket.id in lobbyList[lobbyId].players && ['GAME'].includes(lobbyList[lobbyId].status)/* && lobbyList[lobbyId].game.round !== 0*/)) {
      return;
    }

    switch(action) {
      case 'PLAYER_VOTE':
        if (lobbyList[lobbyId].game.round !== 0 && lobbyList[lobbyId].game.phase === 0 && playerIsAlive(lobbyId, socket.id)) {
            if (message.playerId in lobbyList[lobbyId].players && playerIsAlive(lobbyId, message.playerId)) {
              lobbyList[lobbyId].players[socket.id].targetPlayerId = message.playerId;
            }
        }

        break;
      case 'PLAYER_KILL':
        if (lobbyList[lobbyId].game.phase === 1 && playerIsAlive(lobbyId, socket.id) && playerIsRole(lobbyId, socket.id, 'WERWOLF')) {
            if (message.playerId in lobbyList[lobbyId].players && playerIsAlive(lobbyId, message.playerId)) {
              lobbyList[lobbyId].players[socket.id].targetPlayerId = message.playerId;
            }
        }

        break;
      case 'PLAYER_HEAL':
        if (lobbyList[lobbyId].game.phase === 2 && playerIsAlive(lobbyId, socket.id) && playerIsRole(lobbyId, socket.id, 'WITCH')) {
            if (message.playerId in lobbyList[lobbyId].players && playerIsAlive(lobbyId, message.playerId)) {
              if (lobbyList[lobbyId].players[socket.id].healLeft > 0) {
                lobbyList[lobbyId].players[socket.id].targetPlayerId = message.playerId;
                lobbyList[lobbyId].players[socket.id].healLeft--;
              }
            }
        }

        break;
      default:
        break;
    }

    io.to(lobbyId).emit('lobbyStatus', lobbyList[lobbyId]);
  });

  socket.on('disconnect', (reason) => {
    console.log(`${socket.id} left because of ${reason}`);
  });
});



server.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
