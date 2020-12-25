const camelcaseKeys = require('camelcase-keys')

const db = require('../loaders/db');

const User = function(user) {
  this.id = user.id;
  this.lobbyId = user.lobbyId;
  this.targetPlayerId = user.targetPlayerId;
  this.alias = user.alias;
  this.status = user.status;
  this.role = user.role;
  this.actionLeft = user.actionLeft;
};

User.create = (newUser) => {
  return new Promise((resolve, reject) => {
    db.query(
      'INSERT INTO user (id, lobby_id, target_player_id, alias, status, role, action_left) VALUES (?, ?, ?, ?, ?, ?, ?)',
      Object.values(newUser),
      (err, res) => {
        if (err) {
          reject(err, null);
        } else {
          resolve(null, { ...newUser });
        }
      }
    );
  });
};

User.getById = (id) => {
  return new Promise((resolve, reject) => {
    db.query(`SELECT * FROM user WHERE id = "${id}"`, (err, res) => {
      if (err) {
        reject(err);
      } else if (res.length) {
        resolve(camelcaseKeys(res[0]));
      } else
        reject({ error: 'user_not_found' });
      }
    );
  });
};

User.updateById = (id, user) => {
  return new Promise((resolve, reject) => {
    db.query(
      'UPDATE user SET lobby_id = ?, target_player_id = ?, alias = ?, status = ?, role = ?, action_left = ? WHERE id = ?',
      [user.lobbyId, user.targetPlayerId, user.alias, user.status, user.role, user.actionLeft, id],
      (err, res) => {
        if (err) {
          reject(err);
        } else if (res.affectedRows === 0) {
          reject({ error: 'user_not_found' })
        } else {
          resolve({id: id, ...user});
        }
      }
    );
  });
};

User.getAllByLobbyId = (lobbyId) => {
  return new Promise((resolve, reject) => {
    db.query(
      'SELECT * FROM user WHERE lobby_id = ?',
      [lobbyId],
      (err, res) => {
        if (err) {
          reject(err);
        } else if (res.length) {
          let players = [];
          for (player of res) {
            players.push(camelcaseKeys(player));
          }

          resolve(players);
        } else {
          reject({ error: 'users_by_lobby_id_not_found' });
        }
      }
    );
  });
};

User.setAllAliveByLobbyId = (lobbyId) => {
  return new Promise((resolve, reject) => {
    db.query(
      'UPDATE user SET status = "PLAYER_ALIVE", role = "PEASENT" WHERE lobby_id = ?',
      [lobbyId],
      (err, res) => {
        if (err) {
          reject(err);
        } else if (res.affectedRows === 0) {
          reject({ error: 'users_by_lobby_id_not_found' });
        } else {
          resolve(lobbyId);
        }
      }
    );
  });
};

module.exports = User;
