const db = require('../loaders/db');

const Lobby = function(lobby) {
  this.hostId = lobby.hostId;
  this.code = lobby.code;
  this.status = lobby.status;
};

Lobby.create = (newLobby, result) => {
  db.query(
    'INSERT INTO lobby (host_id, code, status) VALUES (?, ?, ?)',
    Object.values(newLobby),
    (err, res) => {
      if (err) {
        result(err, null);
      } else {
        result(null, { id: res.insertId, ...newLobby });
      }
    }
  );
};

module.exports = Lobby;
