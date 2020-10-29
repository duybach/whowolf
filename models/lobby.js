const camelcaseKeys = require('camelcase-keys')

const db = require('../loaders/db');
const lobby = require('../services/lobby');

const Lobby = function(lobby) {
  this.hostId = lobby.hostId;
  this.status = lobby.status;
};

Lobby.create = (newLobby, result) => {
  let id = lobby.makeId(5);
  db.query(
    'INSERT INTO lobby (id, host_id, status) VALUES (?, ?, ?)',
    [id, ...Object.values(newLobby)],
    (err, res) => {
      if (err) {
        result(err, null);
      } else {
        result(null, id);
      }
    }
  );
};

Lobby.getById = (id, result) => {
  db.query(
    `SELECT * FROM lobby WHERE id = ?`,
    [id],
    (err, res) => {
    if (err) {
      result(err, null);
    } else if (res.length) {
      result(null, camelcaseKeys(res[0]));
    } else {
      result({ error: 'not_found' }, null);
    }
  });
};

module.exports = Lobby;
