export const setSocket = socket => ({
  type: 'SET_SOCKET',
  socket
});

export const setLobbyId = lobbyId => ({
  type: 'SET_LOBBY_ID',
  lobbyId
});

export const setLobby = lobby => ({
  type: 'SET_LOBBY',
  lobby
});

export const reduceLobbyGameTimeLeft = amount => ({
  type: 'REDUCE_LOBBY_GAME_TIME_LEFT',
  amount
});

export const pickPlayers = players => ({
  type: 'PICK_PLAYERS',
  players
});
