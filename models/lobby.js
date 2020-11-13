const camelcaseKeys = require('camelcase-keys')

const db = require('../loaders/db');
const { makeId } = require('../services/function');

const Lobby = function(lobby) {
  this.hostId = lobby.hostId;
  this.status = lobby.status;
};

Lobby.create = (newLobby) => {
  let id = makeId(5);
  return new Promise((resolve, reject) => {
    db.query(
      'INSERT INTO lobby (id, host_id, status) VALUES (?, ?, ?)',
      [id, ...Object.values(newLobby)],
      (err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve({ id: id, ...newLobby });
        }
      }
    );
  });
};

Lobby.getById = (id) => {
  return new Promise((resolve, reject) => {
    db.query(
      `SELECT * FROM lobby WHERE id = ?`,
      [id],
      (err, res) => {
      if (err) {
        reject(err);
      } else if (res.length) {
        resolve(camelcaseKeys(res[0]));
      } else {
        reject({ error: 'lobby_not_found' });
      }
    });
  });
};

Lobby.updateById = (id, lobby) => {
  return new Promise((resolve, reject) => {
    db.query(
      'UPDATE lobby SET host_id = ?, status = ? WHERE id = ?',
      [lobby.hostId, lobby.status, id],
      (err, res) => {
        if (err) {
          reject(err);
        } else if (res.affectedRows === 0) {;
          reject({ error: 'lobby_not_found' })
        } else {
          resolve({ id: id, ...lobby});
        }
      }
    )
  });
};

module.exports = Lobby;
