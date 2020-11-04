const Lobby = require('../models/lobby');
const Game = require('../models/game');
const User = require('../models/user');

const initWhoWolfLobby = (socket, lobbyId) => {
  Lobby.getById(lobbyId, (err, lobby) => {
    if (err) {
      console.log(err);
    } else {
      Lobby.updateById(lobby.id, { ...lobby, status: 'GAME' }, (err, lobbyId) => {
        if (err) {
          console.log(err);
        } else {
          Game.create(
            new Game({
              lobbyId: lobby.id,
              werwolfTarget: null,
              round: 0,
              phase: 0,
              timeLeft: 30,
              amountWerwolfPlayers: 1,
              amountWitchPlayers: 0,
              teamWon: null
            }), (err, game) => {
              if (err) {
                console.log(err);
              } else {
                User.setAllAliveByLobbyId(lobbyId, (err, lobbyId) => {
                  if (err) {
                    console.log(err);
                  } else {
                    User.getAllByLobbyId(lobbyId, async (err, users) => {
                      if (err) {
                        console.log(err);
                      } else {
                        let i, j = 0
                        while (i < game.amountWerwolfPlayers || j < game.amountWitchPlayers) {
                          let index = Math.floor(Math.random() * users.length);
                          if (i < game.amountWerwolfPlayers && users[index].role === 'PEASENT') {
                            await User.updateById(users[index].id, { ...users[index], role: 'WERWOLF' }, (err, userId) => {
                              if (err) {
                                console.log(err);
                              }
                            });
                            i++;
                          } else if (j < game.amountWitchPlayers && users[index].role === 'PEASENT') {
                            await User.updateById(users[index].id, { ...users[index], role: 'WITCH' }, (err, userId) => {
                              if (err) {
                                console.log(err);
                              }
                            });
                            j++;
                          }
                        }

                        const lobbyIntervalId = setInterval(() => {
                          Game.updateById(game.id, { ...game, timeLeft: game.timeLeft - 1 }, (err, gameId) => {
                            if (err) {
                              console.log(err);
                            } else {
                              Game.getById(gameId, (err, game) => {
                                if (err) {
                                  console.log(err);
                                } else {
                                  if (game.timeLeft <= 0) {
                                    nextPhase(lobbyId);

                                    Game.getById(gameId, (err, game) => {
                                      if (err) {
                                        console.log(err);
                                      } else {
                                        if (game.teamWon) {
                                          clearInterval(lobbyIntervalId);
                                        }
                                      }
                                    });
                                  }
                                }
                              });
                            }
                          });
                        }, 1000, lobbyId);
                      }
                    });
                  }
                });
              }
            }
          );
        }
      });
    }
  });
};

module.exports = {
  initWhoWolfLobby: initWhoWolfLobby
};
