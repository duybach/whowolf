const camelcaseKeys = require('camelcase-keys')

const db = require('../loaders/db');

const User = function(user) {
  this.id = user.id;
  this.lobbyId = user.lobbyId;
  this.targetPlayerId = user.targetPlayerId;
  this.alias = user.alias;
  this.status = user.status;
  this.role = user.role;
  this.healLeft = user.healLeft;
};

User.create = (newUser, result) => {
  db.query(
    'INSERT INTO user (id, lobby_id, target_player_id, alias, status, role, heal_left) VALUES (?, ?, ?, ?, ?, ?, ?)',
    Object.values(newUser),
    (err, res) => {
      if (err) {
        result(err, null);
      } else {
        result(null, { ...newUser });
      }
    }
  );
};

User.getById = (id, result) => {
  db.query(`SELECT * FROM user WHERE id = "${id}"`, (err, res) => {
    if (err) {
      result(err, null);
    } else if (res.length) {
      result(null, camelcaseKeys(res[0]));
    } else
      result({ error: 'not_found' }, null);
    }
  );
};

User.updateById = (id, user, result) => {
  db.query(
    'UPDATE user SET lobby_id = ?, target_player_id = ?, alias = ?, status = ?, role = ?, heal_left = ? WHERE id = ?',
    [user.lobbyId, user.targetPlayerId, user.alias, user.status, user.role, user.healLeft, id],
    (err, res) => {
      if (err) {
        result(err, null);
      } else if (res.affectedRows === 0) {;
        result({ error: 'not_found' }, null)
      } else {
        result(null, { ...user });
      }
    }
  )
};

User.getByLobbyId = (lobbyId, result) => {
  db.query(
    'SELECT * FROM user WHERE lobby_id = ?',
    [lobbyId],
    (err, res) => {
      if (err) {
        result(err, null);
      } else if (res.length) {
        let players = [];
        for (player of res) {
          players.push(camelcaseKeys(player));
        }

        result(null, players);
      } else {
        result({ error: 'not_found' }, null);
      }
    }
  )
};

module.exports = User;
