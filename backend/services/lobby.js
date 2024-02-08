const Lobby = require('../models/lobby');
const Game = require('../models/game');
const User = require('../models/user');

module.exports = (io) => {
  notifyLobbyUsers = async (lobbyId) => {
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
  };

  return {
    notifyLobbyUsers
  };
};
