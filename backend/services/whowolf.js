const Lobby = require('../models/lobby');
const Game = require('../models/game');
const User = require('../models/user');

const nextPhase = (lobbyId, io) => {
  return new Promise(async (resolve, reject) => {
    let lobby;
    let users;
    let game;
    try {
      lobby = await Lobby.getById(lobbyId);
      users = await User.getAllByLobbyId(lobby.id);
      game = await Game.getByLobbyId(lobby.id);
    } catch(e) {
      console.log(e);
      return;
    }

    if (game.phase === 0) {
      await calcEndOfDay(lobby.id);

      try {
        game = await Game.getByLobbyId(lobby.id);
      } catch(e) {
        console.log(e);
        return;
      }

      game.phase++;
    } else if (game.phase === 1) {
      let countSum = {};

      for (user of users) {
        if (user.status === 'PLAYER_ALIVE' && user.role !== 'WERWOLF') {
          continue;
        }

        if (user.targetPlayerId in countSum) {
          countSum[user.targetPlayerId]++;
        } else {
          countSum[user.targetPlayerId] = 1;
        }
      }

      let targetPlayerId;
      let maxTarget = 0;

      for (userId in countSum) {
        if (countSum[userId] > maxTarget) {
          maxTarget = countSum[userId];
          targetPlayerId = userId;
        }
      }

      console.log(`Phase 1 target: ${targetPlayerId}`);

      if (targetPlayerId !== 'null') {
        game.werwolfTarget = targetPlayerId;
        game.phase++;

        let witchAlive = false;

        for (user of users) {
          if (user.status === 'PLAYER_ALIVE' && user.role === 'WITCH') {
            witchAlive = true;
          }
        }

        if (!witchAlive) {
          game.phase++;

          let seerAlive = false;

          for (user of users) {
            if (user.status === 'PLAYER_ALIVE' && user.role === 'SEER') {
              seerAlive = true;
            }
          }

          if (!seerAlive) {
            game.round++;
            game.phase = 0;
          }
        }
      } else {
        game.phase++;
        game.phase++;

        let seerAlive = false;

        for (user of users) {
          if (user.status === 'PLAYER_ALIVE' && user.role === 'SEER') {
            seerAlive = true;
          }
        }

        if (!seerAlive) {
          game.round++;
          game.phase = 0;
        }
      }
    } else if (game.phase === 2) {
      for (user of users) {
        if (!(user.status === 'PLAYER_ALIVE' && user.role === 'WITCH' && user.actionLeft > 0 && user.targetPlayerId !== null)) {
          continue;
        }

        console.log(`Phase 2 target: ${user.targetPlayerId}`);

        game.witchTarget = user.targetPlayerId;
        user.actionLeft--;

        try {
          await User.updateById(user.id, user);
          await Game.updateById(game.id, game)
        } catch(e) {
          console.log(e);
          return;
        }
        break;
      }

      try {
        await calcEndOfNight(lobbyId);
        game = await Game.getById(game.id);
      } catch(e) {
        console.log(e);
        return;
      }


      let seerAlive = false;

      for (user of users) {
        if (user.status === 'PLAYER_ALIVE' && user.role === 'SEER') {
          seerAlive = true;
        }
      }

      if (!seerAlive) {
        game.round++;
        game.phase = 0;
      } else {
        game.phase++;
      }
    } else if (game.phase === 3) {
      for (user of users) {
        if (!(user.status === 'PLAYER_ALIVE' && user.role === 'SEER' && user.targetPlayerId !== null)) {
          continue;
        }

        targetPlayerId = user.targetPlayerId;

        targetPlayer = await User.getById(user.targetPlayerId);

        io.sockets.connected[user.id].emit('chat', { alias: 'SYSTEM', chatMessage: `${targetPlayer.alias} is a ${targetPlayer.role}` });
        break;
      }

      game.round++;
      game.phase = 0;
    }

    if (game.teamWon !== null) {
      resolve();
      return;
    }

    game.timeLeft = 30;
    try {
      await Game.updateById(game.id, game);
      users = await User.getAllByLobbyId(lobby.id);
    } catch(e) {
      console.log(e);
      return;
    }

    for (user of users) {
      user.targetPlayerId = null;
      try {
        await User.updateById(user.id, user);
      } catch(e) {
        console.log(e);
        return;
      }
    }

    resolve();
  });
}

const calcEndOfDay = (lobbyId) => {
  return new Promise(async (resolve, reject) => {
    let users;
    try {
      users = await User.getAllByLobbyId(lobbyId);
    } catch(e) {
      console.log(e);
      return;
    }

    countSum = {};
    for (user of users) {
      if (user.targetPlayerId in countSum) {
        countSum[user.targetPlayerId]++;
      } else {
        countSum[user.targetPlayerId] = 1;
      }
    }

    let targetPlayerId;
    let maxTarget = 0;
    for (user of users) {
      if (countSum[user.id] > maxTarget) {
        maxTarget = countSum[user.id];
        targetPlayerId = user.id;
      }
    }

    console.log(`Phase 0 target: ${targetPlayerId}`);

    if (targetPlayerId) {
      try {
        let user = await User.getById(targetPlayerId);
        user.status = 'PLAYER_DEAD';
        await User.updateById(user.id, user);
      } catch(e) {
        console.log(targetPlayerId);
        console.log(e);
        return;
      }
    }

    await calcGameResult(lobbyId);

    resolve();
  });
}

const calcEndOfNight = (lobbyId) => {
  return new Promise(async (resolve, reject) => {
    let game;
    try {
      game = await Game.getByLobbyId(lobbyId);
    } catch(e) {
      console.log(e);
      return;
    }

    console.log(game.werwolfTarget);
    console.log(game.witchTarget);

    if (game.werwolfTarget !== game.witchTarget) {
      try {
        let user = await User.getById(game.werwolfTarget);
        user.status = 'PLAYER_DEAD';
        await User.updateById(user.id, user);
        console.log(`killed player ${user.id}`)
      } catch(e) {
        console.log(e);
        reject();
        return;
      }
    }

    game.werwolfTarget = null;
    game.witchTarget = null;

    try {
      await Game.updateById(game.id, game);
      await calcGameResult(lobbyId);
    } catch (e) {
      console.log(e);
      reject();
      return;
    }

    resolve();
  });
}

const calcGameResult = (lobbyId) => {
  return new Promise(async (resolve, reject) => {
    let amountWerwolfPlayers = 0;
    let amountTownPlayers = 0;

    let users;
    try {
      users = await User.getAllByLobbyId(lobbyId);
    } catch(e) {
      console.log(e);
      return;
    }

    for (user of users) {
      if (user.status !== 'PLAYER_ALIVE') {
        continue;
      }

      if (user.role === 'WERWOLF') {
        amountWerwolfPlayers++;
      } else {
        amountTownPlayers++;
      }
    }

    if (amountWerwolfPlayers === 0) {
      await endGame(lobbyId, 'TOWN');
    } else if (amountTownPlayers <= amountWerwolfPlayers) {
      await endGame(lobbyId, 'WERWOLF');
    }

    resolve();
  });
}

const endGame = (lobbyId, teamWon) => {
  return new Promise(async (resolve, reject) => {
    try {
      lobby = await Lobby.getById(lobbyId);
      lobby.status = 'GAME_END';
      game = await Game.getByLobbyId(lobby.id);
      game.teamWon = teamWon;

      await Lobby.updateById(lobby.id, lobby);
      await Game.updateById(game.id, game);
    } catch(e) {
      console.log(e);
      return;
    }

    resolve();
  });
}

initWhoWolfLobby = (socket, lobbyId) => {
  return new Promise(async (resolve, reject) => {
    let lobby;
    let game;
    let users;
    try {
      lobby = await Lobby.getById(lobbyId);
      lobby.status = 'GAME';

      await Lobby.updateById(lobby.id, lobby);
      game = await Game.create(
        new Game({
          lobbyId: lobby.id,
          werwolfTarget: null,
          witchTarget: null,
          round: 0,
          phase: 0,
          timeLeft: lobby.timeLeft,
          amountWerwolfPlayers: lobby.amountWerwolfPlayers,
          amountWitchPlayers: lobby.witch ? 1 : 0,
          amountSeerPlayers: lobby.seer ? 1 : 0,
          teamWon: null
        })
      );
      await User.setAllAliveByLobbyId(lobby.id);
      users = await User.getAllByLobbyId(lobby.id);
    } catch(e) {
      console.log(e);
      reject();
    }

    let i = 0;
    let j = 0;
    let k = 0;
    while (i < game.amountWerwolfPlayers || j < game.amountWitchPlayers || k < game.amountSeerPlayers) {
      console.log('Adding role ...');

      let index = Math.floor(Math.random() * users.length);
      if (i < game.amountWerwolfPlayers && users[index].role === 'PEASENT') {
        users[index].role = 'WERWOLF'
        try {
          await User.updateById(users[index].id, users[index]);
        } catch(e) {
          console.log(e);
          reject();
        }
        i++;
      } else if (j < game.amountWitchPlayers && users[index].role === 'PEASENT') {
        users[index].role = 'WITCH';
        users[index].actionLeft = 1;

        try {
          await User.updateById(users[index].id, users[index]);
        } catch(e) {
          console.log(e);
          reject();
        }
        j++;
      } else if (k < game.amountSeerPlayers && users[index].role === 'PEASENT') {
        users[index].role = 'SEER';

        try {
          await User.updateById(users[index].id, users[index]);
        } catch(e) {
          console.log(e);
          reject();
        }
        k++;
      }
    }

    const lobbyIntervalId = setInterval(async () => {
      try {
        game.timeLeft -= 1
        game = await Game.updateById(game.id, game);
      } catch(e) {
        console.log(e);
        return;
      }

      if (game.timeLeft <= 0) {
        await nextPhase(lobby.id, io);

        try {
          game = await Game.getById(game.id);
        } catch(e) {
          console.log(e);
          return;
        }
        if (game.teamWon) {
          clearInterval(lobbyIntervalId);
        }

        notifyLobbyUsers(lobby.id);
      }
    }, 1000, lobby.id);

    resolve();
  });
};

module.exports = (io) => {
  const { notifyLobbyUsers } = require('./lobby')(io);

  return {
    initWhoWolfLobby: initWhoWolfLobby
  }
};
