import React from 'react';
import { connect } from 'react-redux';
import { BrowserRouter as Router,
         Switch,
         Route
 } from 'react-router-dom';
import io from 'socket.io-client';

import Home from './components/Home';
import CreateLobby from './components/CreateLobby';
import JoinLobby from './components/JoinLobby';
import Lobby from './components/Lobby';
import Game from './components/Game';
import GameEnd from './components/GameEnd';

import { setSocket } from './actions';

const socket = io('http://localhost:3000');

const App = ({ dispatch }) => {
  dispatch(setSocket(socket));

  return (
    <Router>
      <Switch>
        <Route path="/lobby/create">
          <CreateLobby />
        </Route>
        <Route path="/lobby/join">
          <JoinLobby />
        </Route>
        <Route path="/lobby/:lobby_id">
          <Lobby />
        </Route>
        <Route path="/game/:lobby_id">
          <Game />
        </Route>
        <Route path="/game_end/:lobby_id">
          <GameEnd />
        </Route>
        <Route path="/">
          <Home />
        </Route>
      </Switch>
    </Router>
  );
};

export default connect()(App);
