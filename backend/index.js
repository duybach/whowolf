const express = require('express');
const app = express();
const cors = require('cors');
const server = require('http').createServer(app);
const port = 3000;
const io = require('socket.io')(server);
const bodyParser = require('body-parser');

const db = require('./loaders/db');

const User = require('./models/user');
const Lobby = require('./models/lobby');
const Game = require('./models/game');

const { notifyLobbyUsers } = require('./services/lobby')(io);
const whowolf = require('./services/whowolf')(io);
const { userInLobby } = require('./services/function');

const startServer = () => {
  app.use(cors());
  app.use(bodyParser.json());

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
          status: 'LOBBY_NOT_READY',
          timeLeft: 30,
          amountWerwolfPlayers: 1,
          witch: true,
          seer: false
        }));

        user.alias = alias;
        user.lobbyId = lobby.id;
        user.status = 'PLAYER_NOT_READY';

        await User.updateById(user.id, user);
      } catch(e) {
        console.log(e);
        return;
      }

      socket.join(lobby.id, () => {
        fn({ lobbyId: lobby.id });
      });
    });

    socket.on('joinLobby', async (lobbyId, alias, fn) => {
      let lobby;
      try {
        lobby = await Lobby.getById(lobbyId);
        let user = await User.getById(socket.id);

        user.alias = alias;
        user.lobbyId = lobby.id;
        user.status = 'PLAYER_NOT_READY';

        await User.updateById(user.id, user);
      } catch(e) {
        console.log(e);
        return;
      }

      socket.join(lobby.id, () => {
        notifyLobbyUsers(lobby.id);
        fn({lobbyId: lobby.id});
      });
    });

    socket.on('chat', async (chatMessage) => {
      let user;
      try {
        user = await User.getById(socket.id)
      } catch(e) {
        console.log(e);
        return;
      }

      io.to(user.lobbyId).emit('chat', { alias: user.alias, chatMessage: chatMessage });
    });

    socket.on('lobbyStatus', async (fn) => {
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
        fn({ ...lobby, players: users });
        return;
      }

      fn({ ...lobby, players: users, game: game });
    });

    socket.on('lobby', async (action, message) => {
      let user;
      let lobby;
      try {
        user = await User.getById(socket.id);
        lobby = await Lobby.getById(user.lobbyId);
      } catch(e) {
        console.log(e);
        return;
      }

      console.log(action);

      switch(action) {
        case 'PLAYER_READY':
          let users;

          user.status = message.status ? 'PLAYER_READY' : 'PLAYER_NOT_READY';

          try {
            await User.updateById(user.id, user);
            users = await User.getAllByLobbyId(lobby.id);
          } catch(e) {
            console.log(e);
            return;
          }

          let allPlayersReady = true;
          for (lobbyUser of users) {
            if (lobbyUser.status !== 'PLAYER_READY') {
              allPlayersReady = false;
              break;
            }
          }

          lobby.status = allPlayersReady ? 'LOBBY_READY' : 'LOBBY_NOT_READY';

          try {
            await Lobby.updateById(lobby.id, lobby);
          } catch(e) {
            console.log(e);
            return;
          }

          break;
        case 'KICK_PLAYER':
          if (socket.id === lobby.hostId) {
            let kickUser;
            try {
              kickUser = await User.getById(message.playerId);
            } catch(e) {
              console.log(e);
              return;
            }

            if (kickUser.lobbyId === lobby.id) {
              kickUser.lobbyId = null;

              try {
                await User.updateById(kickUser.id, kickUser);
              } catch(e) {
                console.log(e);
                return;
              }

              io.sockets.connected[kickUser.id].emit('kicked', {});
              io.sockets.connected[kickUser.id].leave(lobby.id);
            }
          }

          break;
        case 'LOBBY_SETTING':
          if (socket.id === lobby.hostId && ['LOBBY_NOT_READY', 'LOBBY_READY', 'GAME_END'].includes(lobby.status)) {
            let users;

            try {
              users = await User.getAllByLobbyId(lobby.id);
            } catch(e) {
              console.log(e);
              return;
            }

            lobby.timeLeft = Math.min(90, Math.max(message.timeLeft, 30));
            lobby.amountWerwolfPlayers = Math.min(Math.floor(users.length / 2), Math.max(message.amountWerwolfPlayers, 1));
            lobby.witch = message.witch ? true : false;
            lobby.seer = message.seer ? true : false;

            try {
              await Lobby.updateById(lobby.id, lobby);
            } catch(e) {
              console.log(e);
              return;
            }
          }

          break;
        case 'START_GAME':
          if (socket.id === lobby.hostId && ['LOBBY_READY', 'GAME_END'].includes(lobby.status)) {
            await whowolf.initWhoWolfLobby(socket, lobby.id);
          }

          break;
        default:
          break;
      }io

      notifyLobbyUsers(lobby.id);
    });

    socket.on('game', async (action, message) => {
      let user;
      try {
        user = await User.getById(socket.id);
      } catch(e) {
        console.log(e);
        return;
      }

      if (user.status !== 'PLAYER_ALIVE') {
        return;
      }

      let game;
      let users;
      try {
        game = await Game.getByLobbyId(user.lobbyId);
        users = await User.getAllByLobbyId(user.lobbyId);
      } catch(e) {
        console.log(e);
        return;
      }

      switch(action) {
        case 'PLAYER_VOTE':
          if (game.round !== 0 && game.phase === 0) {
            if (userInLobby(users, message.playerId)) {
              user.targetPlayerId = message.playerId;
              await User.updateById(user.id, user);
            }
          }

          break;
        case 'PLAYER_KILL':
          if (game.phase === 1 && user.role === 'WERWOLF') {
            if (userInLobby(users, message.playerId)) {
              user.targetPlayerId = message.playerId;
              await User.updateById(user.id, user);
            }
          }

          break;
        case 'PLAYER_HEAL':
          if (game.phase === 2 && user.role === 'WITCH') {
            if (userInLobby(users, message.playerId)) {
              if (user.healLeft > 0) {
                user.targetPlayerId = message.playerId;
                await User.updateById(user.id, user);
              }
            }
          }

          break;
        default:
          break;
      }

      let lobby;
      try {
        lobby = await Lobby.getById(user.lobbyId);
      } catch(e) {
        console.log(e);
        return;
      }

      notifyLobbyUsers(lobby.id);
    });

    socket.on('disconnect', (reason) => {
      console.log(`${socket.id} left because of ${reason}`);
    });
  });

  server.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
  });
};

startServer();
