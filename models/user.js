const db = require('../loaders/db');

const User = function(user) {
  this.lobbyId = user.lobbyId;
  this.targetPlayerId = user.targetPlayerId;
  this.socketId = user.socketId;
  this.alias = user.alias;
  this.status = user.status;
  this.role = user.role;
  this.healLeft = user.healLeft;
};

User.create = (newUser, result) => {
  db.query(
    'INSERT INTO user (lobby_id, target_player_id, socket_id, alias, status, role, heal_left) VALUES (?, ?, ?, ?, ?, ?, ?)',
    Object.values(newUser),
    (err, res) => {
      if (err) {
        result(err, null);
      } else {
        result(null, { id: res.insertId, ...newUser });
      }
    }
  );
};

module.exports = User;
