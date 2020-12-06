import { combineReducers } from 'redux';

import socket from './socket';
import lobby from './lobby';


export default combineReducers({
  socket,
  lobby
})
