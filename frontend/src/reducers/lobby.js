const lobby = (state = {}, action) => {
  switch (action.type) {
    case 'SET_LOBBY_ID':
      return {
        ...state,
        id: action.lobbyId,
        players: {}
      };
    case 'SET_LOBBY':
      return {
        ...state,
        ...action.lobby
      };
    case 'REDUCE_LOBBY_GAME_TIME_LEFT':
      return {
        ...state,
        game: {
          ...state.game,
          timeLeft: (state.game.timeLeft) ? state.game.timeLeft - action.amount : state.game.timeLeft
        }
      };
    default:
      return state;
  }
};

export default lobby;
