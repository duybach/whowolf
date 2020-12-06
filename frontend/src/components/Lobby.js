import React, { useCallback, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { connect } from 'react-redux';

import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import ListGroup from 'react-bootstrap/ListGroup';
import Row from 'react-bootstrap/Row';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';

import Chat from './Chat';
import LobbySetting from './LobbySetting';

import { setLobby } from '../actions';

const Lobby = ({ socket, lobby, dispatch }) => {
  const history = useHistory();
  const [playerReady, setPlayerReady] = useState(false);
  const [hostAlias, setHostAlias] = useState('');

  const setPlayerStatus = (status) => {
    setPlayerReady(status);
    socket.emit('lobby', 'PLAYER_READY', { status: status });
  };

  const kickPlayer = (playerId) => {
    socket.emit('lobby', 'KICK_PLAYER', { playerId: lobby.players[playerId].id });
  };

  const startGame = () => {
    if (Object.keys(lobby.players).length >= 1) {
      socket.emit('lobby', 'START_GAME');
    } else {
      alert('4 or more players are required to start the game.')
    }
  }

  const fetchLobby = useCallback(() => {
    socket.emit('lobbyStatus', (message) => {
      if ('error' in message) {
        console.log(message.error);
      } else {
        dispatch(setLobby(message));

        setHostAlias(
          message.players.find((player) => {
            return player.id === socket.id;
          }).alias
        );
      }

      socket.on('lobbyStatus', (message) => {
        dispatch(setLobby(message));

        setHostAlias(
          message.players.find((player) => {
            return player.id === socket.id;
          }).alias
        );
      });

      socket.on('kicked', () => {
        history.push(``);
      });
    });
  }, [socket, dispatch, history]);

  useEffect(() => {
    if (lobby.status === 'GAME') {
      history.push(`/game/${lobby.id}`);
    }

    fetchLobby();
  }, [fetchLobby, history, lobby.status, lobby.id]);

  return (
    <Container>
      <Row>
        <Col>
          <h1>Lobby {lobby.id}</h1>

          <h3>
            Host: {hostAlias}
          </h3>

          {socket.id === lobby.hostId ? <div><LobbySetting /></div> : ''}

          <ListGroup>
            {
              Object.keys(lobby.players).map((idx, index) => (
                <ListGroup.Item className="d-flex justify-content-between align-items-center" key={index} variant={lobby.players[idx].status === 'PLAYER_READY' ? 'success' : ''}>
                  {lobby.players[idx].alias}
                  {socket.id === lobby.hostId ? <Button variant="danger" onClick={() => kickPlayer(idx)}><FontAwesomeIcon icon={faTimes} /></Button> : ''}
                </ListGroup.Item>
              ))
            }
          </ListGroup>
        </Col>
      </Row>

      <Row className="mt-3">
        <Col>
          <Button variant={playerReady ? 'danger' : 'primary'} onClick={() => setPlayerStatus(!(playerReady))} block>{playerReady ? 'Not ready' : 'Ready'}</Button>
        </Col>
        <Col>
          {socket.id === lobby.hostId ? <Button variant={lobby.status === 'LOBBY_READY' ? 'primary' : 'danger'} onClick={() => startGame()} block>Start</Button> : ''}
        </Col>
      </Row>

      <Row>
        <Chat />
      </Row>
    </Container>
  );
};

const mapStateToProps = (state) => ({
  socket: state.socket,
  lobby: state.lobby
})

export default connect(mapStateToProps)(Lobby);
