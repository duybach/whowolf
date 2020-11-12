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

let notifiyLobbyUsers;

const startServer = async () => {
  app.use(cors());
  app.use(bodyParser.json());

  const userInLobby = (users, userId) => {
    return users.some((user) => {
      return user.id === userId;
    });
  };

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

    socket.on('joinLobby', async (lobbyId, alias, fn) => {
      let lobby;
      try {
        lobby = await Lobby.getById(lobbyId);
        let user = await User.getById(socket.id);
        await User.updateById(user.id, { ...user, alias: alias, lobbyId: lobby.id, status: 'PLAYER_NOT_READY'});
      } catch(e) {
        console.log(e);
        return;
      }

      socket.join(lobby.id, () => {
        notifiyLobbyUsers(lobby.id);
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

      io.to(lobbyId).emit('chat', { alias: user.alias, chatMessage: chatMessage });
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

      switch(action) {
        case 'PLAYER_READY':
          let users;
          try {
            await User.updateById(user.id, { ...user, status: message.status ? 'PLAYER_READY' : 'PLAYER_NOT_READY' });
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

          try {
            await Lobby.updateById(lobby.id, { ...lobby, status: allPlayersReady ? 'LOBBY_READY' : 'LOBBY_NOT_READY' });
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
              try {
                await User.updateById(kickUser.id, { ...kickUser, lobbyId: null });
              } catch(e) {
                console.log(e);
                return;
              }

              io.sockets.connected[kickUser.id].leave(lobby.id);
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
      }

      notifiyLobbyUsers(lobby.id);
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
                await User.updateById(user.id, { ...user, targetPlayerId : message.playerId});
              }
          }

          break;
        case 'PLAYER_KILL':
          if (game.phase === 1 && player.role === 'WERWOLF') {
              if (userInLobby(users, message.playerId)) {
                await User.updateById(user.id, { ...user, targetPlayerId : message.playerId});
              }
          }

          break;
        case 'PLAYER_HEAL':
          if (game.phase === 2 && user.role === 'WITCH') {
              if (userInLobby(users, message.playerId)) {
                if (user.healLeft > 0) {
                  await User.updateById(user.id, { ...user, targetPlayerId : message.playerId, healLeft: user.healLeft - 1});
                }
              }
          }

          break;
        default:
          break;
      }

      let lobby;
      try {
        lobby = Lobby.getById(user.lobbyId);
      } catch(e) {
        console.log(e);
        return;
      }

      notifiyLobbyUsers(lobby.id);
    });

    socket.on('disconnect', (reason) => {
      console.log(`${socket.id} left because of ${reason}`);
    });

    notifiyLobbyUsers = async (lobbyId) => {
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
          io.to(lobby.id).emit('lobbyStatus', { ...lobby, players: users });
          return;
      }

      io.to(lobby.id).emit('lobbyStatus', { ...lobby, players: users, game: game });

      console.log('NOTIFIY IS DONE');
    };
  });

  server.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
  });
};

startServer();

module.exports = {
  notifiyLobbyUsers: notifiyLobbyUsers
}
