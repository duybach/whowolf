const db = require('../loaders/db');

const Game = function(game) {
  this.lobbyId = game.lobbyId;
  this.werwolfTarget = game.werwolfTarget;
  this.round = game.round;
  this.timeLeft = game.timeLeft;
  this.amountWerwolfPlayers = game.amountWerwolfPlayers;
  this.amountWitchPlayers = game.amountWitchPlayers;
  this.teamWon = game.teamWon;
};

Game.create = (newGame, result) => {
  db.query(
    'INSERT INTO game (lobby_id, werwolf_target, round, phase, time_left, amount_werwolf_players, amount_witch_players) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    Object.values(newGame),
    (err, res) => {
      if (err) {
        result(err, null);
      } else {
        result(null, { id: res.insertId, ...newGame });
      }
    }
  );
};

module.exports = Game;
