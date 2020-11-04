const express = require('express');
const app = express();
const cors = require('cors');
const server = require('http').createServer(app);
const port = 3000;
const io = require('socket.io')(server);
const bodyParser = require('body-parser');

const db = require('./loaders/db');
const lobby = require('./services/lobby');

const User = require('./models/user');
const Lobby = require('./models/lobby');
const Game = require('./models/game');

const whowolf = require('./services/whowolf');


const startServer = async () => {
  app.use(cors());
  app.use(bodyParser.json());

  var lobbyList = {};

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
    let amountWerwolfPlayers = 0;

    for (playerId in lobbyList[lobbyId].players) {
      if (lobbyList[lobbyId].players[playerId].status !== 'PLAYER_ALIVE') {
        continue;
      }

      if (lobbyList[lobbyId].players[playerId].role === 'WERWOLF') {
        amountWerwolfPlayers++;
      } else {
        amountOfTownPlayers++;
      }
    }

    if (amountWerwolfPlayers === 0) {
      endGame(lobbyId, 'TOWN');
    } else if (amountOfTownPlayers <= amountWerwolfPlayers) {
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

  io.on('connection', async (socket) => {
    console.log('a user connected');

    await User.create(
      new User({
        id: socket.id,
        lobbyId: null,
        targetPlayerId: null,
        alias: null,
        status: null,
        role: null,
        healLeft: null
      })
    );

    socket.on('createLobby', async (alias, fn) => {
      let user;
      let lobby;
      try {
        user = await User.getById(socket.id)

        lobby = await Lobby.create(new Lobby({
          hostId: user.id,
          status: 'LOBBY_NOT_READY'
        }));

        await User.updateById(user.id, {...user, alias: alias, lobbyId: lobby.id, status: 'PLAYER_NOT_READY'});
      } catch(e) {
        console.log(e);
        return;
      }

      socket.join(lobby.id, () => {
        fn({ lobbyId: lobby.id });
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
              User.updateById(socket.id, { ...user, alias: alias, lobbyId: lobby.id, status: 'PLAYER_NOT_READY'}, (err, userId) => {
                if (err) {
                  console.log(err);
                } else {
                  socket.join(lobby.id, () => {
                    notifiyLobbyUsers();
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

    socket.on('lobbyStatus', async (lobbyId, fn) => {
      let user;
      let lobby;
      let users;
      try {
        user = await User.getById(socket.id);
        lobby = await Lobby.getById(user.lobbyId);
        users = await User.getAllByLobbyId(lobby.id);
      } catch(e) {
        console.log(e);
        return;
      }

      let game;
      try {
        game = await Game.getByLobbyId(lobby.id);
      } catch(e) {
        console.log(e);
        fn({ ...lobby, players: users });
        return;
      }

      fn({ ...lobby, players: users, game: game });
    });

    socket.on('lobby', async (lobbyId, action, message) => {
      let lobby;
      try {
        lobby = await Lobby.getById(lobbyId);
      } catch(e) {
        console.log(e);
        return;
      }
      switch(action) {
        case 'PLAYER_READY':
          let users;
          try {
            let user = await User.getById(socket.id);
            await User.updateById(user.id, { ...user, status: message.status ? 'PLAYER_READY' : 'PLAYER_NOT_READY' });
            users = await User.getAllByLobbyId(lobby.id);
          } catch(e) {
            console.log(e);
            return;
          }

          let allPlayersReady = true;
          for (user of users) {
            if (user.status !== 'PLAYER_READY') {
              allPlayersReady = false;
              break;
            }
          }

          try {
            await Lobby.updateById(lobby.id, { ...lobby, status: allPlayersReady ? 'LOBBY_READY' : 'LOBBY_NOT_READY' });
          } catch(e) {
            console.log(e);
            return;
          }

          notifiyLobbyUsers(lobby.id);

          break;
        case 'KICK_PLAYER':
          if (socket.id === lobby.hostId) {
            User.getById(message.playerId, (err, kickUser) => {
              if (kickUser.lobbyId === lobby.id) {
                User.updateById(kickUser.id, { ...kickUser, lobbyId: null }, (err, kickUserId) => {
                  if (err) {
                    console.log(err);
                  } else {
                    io.sockets.connected[kickUserId].leave(lobby.id);
                    notifiyLobbyUsers();
                  }
                });
              }
            });
          }
          break;
        case 'START_GAME':
        if (socket.id === lobby.hostId && ['LOBBY_READY', 'GAME_END'].includes(lobby.status)) {
            await whowolf.initWhoWolfLobby(socket, lobby.id);
            console.log('notifiyLobbyUsers');
            notifiyLobbyUsers();
          }
          break;
        default:
          break;
      }
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
              User.getAllByLobbyId(lobby.id, (err, users) => {
                if (err) {
                  console.log(err);
                } else {
                  Game.getByLobbyId(lobby.id, (err, users) => {
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
        }
      });
    });

    socket.on('disconnect', (reason) => {
      console.log(`${socket.id} left because of ${reason}`);
    });

    const notifiyLobbyUsers = async (lobbyId) => {
      let lobby;
      let users;
      try {
        lobby = await Lobby.getById(lobbyId);
        users = await User.getAllByLobbyId(lobby.id);
      } catch(e) {
        console.log(e);
        return
      }

      let game;
      try {
        game = await Game.getByLobbyId(lobby.id);
      } catch(e) {
        console.log(e);
      }

      if (game) {
        io.to(lobby.id).emit('lobbyStatus', { ...lobby, players: users, game: game });
        console.log(users);
      } else {
        io.to(lobby.id).emit('lobbyStatus', { ...lobby, players: users });
      }
    };
  });

  server.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
  });
};

startServer();
