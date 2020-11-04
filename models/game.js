const camelcaseKeys = require('camelcase-keys')

const db = require('../loaders/db');

const Game = function(game) {
  this.lobbyId = game.lobbyId;
  this.werwolfTarget = game.werwolfTarget;
  this.round = game.round;
  this.phase = game.phase;
  this.timeLeft = game.timeLeft;
  this.amountWerwolfPlayers = game.amountWerwolfPlayers;
  this.amountWitchPlayers = game.amountWitchPlayers;
  this.teamWon = game.teamWon;
};

Game.create = (newGame, result) => {
  db.query(
    'INSERT INTO game (lobby_id, werwolf_target, round, phase, time_left, amount_werwolf_players, amount_witch_players, team_won) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
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

Game.getById = (id, result) => {
  db.query(`SELECT * FROM game WHERE id = "${id}"`, (err, res) => {
    if (err) {
      result(err, null);
    } else if (res.length) {
      result(null, camelcaseKeys(res[0]));
    } else
      result({ error: 'not_found' }, null);
    }
  );
};

Game.getByLobbyId = (id, result) => {
  return new Promise((resolve, reject) => {
    db.query(`SELECT * FROM game WHERE lobby_id = "${id}"`, (err, res) => {
      if (err) {
        reject(err);
      } else if (res.length) {
        resolve(camelcaseKeys(res[0]));
      } else
        reject({ error: 'not_found' });
      }
    );
  });
};

Game.updateById = (id, game, result) => {
  db.query(
    'UPDATE game SET lobby_id = ?, werwolf_target = ?, round = ?, phase = ?, time_left = ?, amount_werwolf_players = ?, amount_witch_players = ?, team_won = ? WHERE id = ?',
    [game.lobbyId, game.werwolfTarget, game.round, game.phase, game.timeLeft, game.amountWerwolfPlayers, game.amountWerwolfPlayers, game.teamWon, id],
    (err, res) => {
      if (err) {
        result(err, null);
      } else if (res.affectedRows === 0) {;
        result({ error: 'not_found' }, null)
      } else {
        result(null, id);
      }
    }
  )
};

module.exports = Game;
