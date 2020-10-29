const express = require('express');
const app = express();
const cors = require('cors');
const server = require('http').createServer(app);
const port = 3000;
const io = require('socket.io')(server);
const bodyParser = require('body-parser');

const db = require('./loaders/db');
const lobby = require('./services/lobby');

const User = require('./models/user')
const Lobby = require('./models/lobby')

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
    amountWerWolfPlayers: 2,
    amountWitchPlayers: 1
  };

  for (playerId in lobbyList[lobbyId].players) {
    lobbyList[lobbyId].players[playerId].status = 'PLAYER_ALIVE';
    lobbyList[lobbyId].players[playerId].role = 'PEASENT';
  }

  let i = 0;
  while (i < lobbyList[lobbyId].game.amountWerWolfPlayers) {
    let randomPlayerId = Object.keys(lobbyList[lobbyId].players)[Math.floor(Math.random() * Math.floor(Object.keys(lobbyList[lobbyId].players).length))];
    if (lobbyList[lobbyId].players[randomPlayerId].role === 'PEASENT') {
      lobbyList[lobbyId].players[randomPlayerId].role = 'WERWOLF';
      i++;
    }
  }

  i = 0;
  while (i < lobbyList[lobbyId].game.amountWitchPlayers) {
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
  let amountWerWolfPlayers = 0;

  for (playerId in lobbyList[lobbyId].players) {
    if (lobbyList[lobbyId].players[playerId].status !== 'PLAYER_ALIVE') {
      continue;
    }

    if (lobbyList[lobbyId].players[playerId].role === 'WERWOLF') {
      amountWerWolfPlayers++;
    } else {
      amountOfTownPlayers++;
    }
  }

  if (amountWerWolfPlayers === 0) {
    endGame(lobbyId, 'TOWN');
  } else if (amountOfTownPlayers <= amountWerWolfPlayers) {
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

  const newUserSql = new User({
    id: socket.id,
    lobbyId: null,
    targetPlayerId: null,
    alias: null,
    status: null,
    role: null,
    healLeft: null
  });

  User.create(newUserSql, (err, data) => {
    if (err) {
      console.log(err);
    }
  });

  socket.on('createLobby', (alias, fn) => {
    User.getById(socket.id, (err, user) => {
      if (err) {
        console.log(err);
      } else {
        const newLobbySql = new Lobby({
          hostId: user.id,
          status: 'LOBBY_NOT_READY'
        });

        Lobby.create(newLobbySql, (err, lobbyId) => {
          if (err) {
            console.log(err);
          }

          User.updateById(user.id, {...user, alias: alias, lobbyId: lobbyId, status: 'PLAYER_NOT_READY'}, (err, data) => {
            if (err) {
              console.log(err);
            } else {
              socket.join(lobbyId, () => {
                fn({ lobbyId: lobbyId });
              });
            }
          });
        });
      }
    });
  });

  socket.on('joinLobby', (lobbyId, alias, fn) => {
    Lobby.getById(lobbyId, (err, lobby) => {
      if (err) {
        fn({ error: 'Lobby does not exist' })
      } else {
        User.getById(socket.id, (err, user) => {
          if (err) {
            console.log(err);
          } else {
            User.updateById(socket.id, { ...user, alias: alias, lobbyId: lobby.id, status: 'PLAYER_NOT_READY'}, (err, user) => {
              if (err) {
                console.log(err);
              } else {
                socket.join(lobbyId, () => {
                  socket.to(lobbyId).emit('lobbyStatus', lobbyList[lobbyId]);
                  fn({lobbyId: lobbyId});
                });
              }
            });
          }
        });
      }
    });
  });

  socket.on('chat', (lobbyId, chatMessage) => {
    User.getById(socket.id, (err, user) => {
      if (err) {
        console.log(err);
      } else {
        io.to(lobbyId).emit('chat', { alias: user.alias, chatMessage: chatMessage });
      }
    });
  });

  socket.on('lobbyStatus', (lobbyId, fn) => {
    User.getById(socket.id, (err, user) => {
      if (err) {
        console.log(err);
      } else {
        if (user.lobbyId) {
          Lobby.getById(user.lobbyId, (err, lobby) => {
            User.getByLobbyId(lobby.id, (err, users) => {
              if (err) {
                console.log(err);
              } else {
                fn({ ...lobby, players: users });
              }
            });
          });
        }
      }
    });
  });

  socket.on('lobby', (lobbyId, action, message) => {
    /*
    if (!(lobbyId in lobbyList && socket.id in lobbyList[lobbyId].players && ['LOBBY_NOT_READY', 'LOBBY_READY', 'GAME_END'].includes(lobbyList[lobbyId].status))) {
      return;
    }
    */

    switch(action) {
      case 'PLAYER_READY':
        User.getById(socket.id, (err, user) => {
            if (err) {
              console.log(err);
            } else {
              User.updateById(user.id, { ...user, status: message.status ? 'PLAYER_READY' : 'PLAYER_NOT_READY' }, (err, data) => {
                if (err) {
                  console.log(err);
                }
              });
            }
        });

        /*
        let allPlayerReady = true;

        for (let playerId in lobbyList[lobbyId].players) {
          if (lobbyList[lobbyId].players[playerId].status !== 'PLAYER_READY') {
            allPlayerReady = false;
            break
          }
        }

        lobbyList[lobbyId].status = allPlayerReady ? 'LOBBY_READY' : 'LOBBY_NOT_READY';
        */

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

    User.getById(socket.id, (err, user) => {
      if (err) {
        console.log(err);
      } else {
        Lobby.getById(user.lobbyId, (err, lobby) => {
          if (err) {
            console.log(err);
          } else {
            User.getByLobbyId(lobby.id, (err, users) => {
              if (err) {
                console.log(err);
              } else {
                io.to(lobby.id).emit('lobbyStatus', { ...lobby, players: users });
              }
            });
          }
        });
      }
    });
  });

  socket.on('game', (lobbyId, action, message) => {
    /*
    if (!(lobbyId in lobbyList && socket.id in lobbyList[lobbyId].players && ['GAME'].includes(lobbyList[lobbyId].status))) {
      return;
    }
    */

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

    User.getById(socket.id, (err, user) => {
      if (err) {
        console.log(err);
      } else {
        Lobby.getById(user.lobbyId, (err, lobby) => {
          if (err) {
            console.log(err);
          } else {
            User.getByLobbyId(lobby.id, (err, users) => {
              if (err) {
                console.log(err);
              } else {
                io.to(user.lobbyId).emit('lobbyStatus', { ...lobby, players: users });
              }
            });
          }
        });
      }
    });
  });

  socket.on('disconnect', (reason) => {
    console.log(`${socket.id} left because of ${reason}`);
  });
});



server.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
