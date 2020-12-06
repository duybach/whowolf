const socket = (state = null, action) => {
  switch (action.type) {
    case 'SET_SOCKET':
      return action.socket;
    default:
      return state;
  }
};

export default socket;
