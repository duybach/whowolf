const camelcaseKeys = require('camelcase-keys')

const db = require('../loaders/db');

const Game = function(game) {
  this.lobbyId = game.lobbyId;
  this.werwolfTarget = game.werwolfTarget;
  this.witchTarget = game.witchTarget;
  this.round = game.round;
  this.phase = game.phase;
  this.timeLeft = game.timeLeft;
  this.amountWerwolfPlayers = game.amountWerwolfPlayers;
  this.amountWitchPlayers = game.amountWitchPlayers;
  this.teamWon = game.teamWon;
};

Game.create = (newGame) => {
  return new Promise((resolve, reject) => {
    db.query(
      'INSERT INTO game (lobby_id, werwolf_target, witch_target, round, phase, time_left, amount_werwolf_players, amount_witch_players, team_won) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      Object.values(newGame),
      (err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve({ id: res.insertId, ...newGame });
        }
      }
    );
  });
};

Game.getById = (id) => {
  return new Promise((resolve, reject) => {
    db.query(`SELECT * FROM game WHERE id = "${id}"`, (err, res) => {
      if (err) {
        reject(err);
      } else if (res.length) {
        resolve(camelcaseKeys(res[0]));
      } else
        reject({ error: 'game_not_found' });
      }
    );
  });
};

Game.getByLobbyId = (id) => {
  return new Promise((resolve, reject) => {
    db.query(`SELECT * FROM game WHERE lobby_id = "${id}"`, (err, res) => {
      if (err) {
        reject(err);
      } else if (res.length) {
        resolve(camelcaseKeys(res[0]));
      } else
        reject({ error: 'game_by_lobby_id_not_found' });
      }
    );
  });
};

Game.updateById = (id, game) => {
  return new Promise((resolve, reject) => {
    db.query(
      'UPDATE game SET lobby_id = ?, werwolf_target = ?, witch_target = ?, round = ?, phase = ?, time_left = ?, amount_werwolf_players = ?, amount_witch_players = ?, team_won = ? WHERE id = ?',
      [game.lobbyId, game.werwolfTarget, game.witchTarget, game.round, game.phase, game.timeLeft, game.amountWerwolfPlayers, game.amountWitchPlayers, game.teamWon, id],
      (err, res) => {
        if (err) {
          reject(err);
        } else if (res.affectedRows === 0) {;
          reject({ error: 'game_not_found' })
        } else {
          resolve({ id: id, ...game});
        }
      }
    )
  });
};

module.exports = Game;
