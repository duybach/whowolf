import React, { useCallback, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { connect } from 'react-redux';

import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import ListGroup from 'react-bootstrap/ListGroup';
import Row from 'react-bootstrap/Row';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faVoteYea, faSkull, faHeartbeat } from '@fortawesome/free-solid-svg-icons';

import Chat from './Chat';

import { setLobby, reduceLobbyGameTimeLeft } from '../actions';

const Game = ({ socket, lobby, dispatch }) => {
  const history = useHistory();
  const [user, setUser] = useState({});

  const fetchLobby = useCallback(() => {
    socket.emit('lobbyStatus', (message) => {
      if ('error' in message) {
        console.log(message.error);
      } else {
        dispatch(setLobby(message));

        setUser(
          message.players.find((player) => {
            return player.id === socket.id;
          })
        );
      }
    });

    socket.on('lobbyStatus', (message) => {
      console.log(message);
      dispatch(setLobby(message));

      setUser(
        message.players.find((player) => {
          return player.id === socket.id;
        })
      );
    });
  }, [socket, dispatch]);

  const pickPlayer = (playerId, action) => {
    socket.emit('game', action, { playerId: playerId });
  };

  const renderActionButtons = (playerId) => {
    if ((lobby.game.round === 0 && lobby.game.phase === 0 ) || user.status !== 'PLAYER_ALIVE' || lobby.players[playerId].status !== 'PLAYER_ALIVE' || (lobby.game.phase === 1 && user.role !== 'WERWOLF') || (lobby.game.phase === 2 && user.role !== 'WITCH')) {
      return (<></>);
    }

    if (lobby.game.phase === 0) {
      return (
        <>
          {socket.id !== lobby.players[playerId].id ? <Button variant="danger" onClick={() => pickPlayer(lobby.players[playerId].id, 'PLAYER_VOTE')}><FontAwesomeIcon icon={faVoteYea} /></Button> : ''}
        </>
      );
    } else if (lobby.game.phase === 1 && user.role === 'WERWOLF') {
      return (
        <>
          <Button variant="danger" onClick={() => pickPlayer(lobby.players[playerId].id, 'PLAYER_KILL')}><FontAwesomeIcon icon={faSkull} /></Button>
        </>
      );
    } else if (lobby.game.phase === 2 && user.role === 'WITCH' && user.healLeft > 0 && lobby.game.werwolfTarget === lobby.players[playerId].id) {
      return (
        <>
          <Button variant="danger" onClick={() => pickPlayer(lobby.players[playerId].id, 'PLAYER_HEAL')}><FontAwesomeIcon icon={faHeartbeat} /></Button>
        </>
      );
    } else {
      return (<></>);
    }
  };

  const renderPhase = (phase) => {
    switch(phase) {
      case 0:
        return 'Voting Phase';
      case 1:
        return 'Werwolf Phase';
      case 2:
        return 'Healing Phase';
      default:
        return '';
    }
  }

  const tickTime = useCallback(() => {
    dispatch(reduceLobbyGameTimeLeft(1));
  }, [dispatch]);

  useEffect(() => {
    if (lobby.status === 'GAME_END') {
      history.push(`/game_end/${lobby.id}`);
    }

    fetchLobby();

    const lobbyIntervalId = setInterval(tickTime, 1000);

    return () => {
      clearInterval(lobbyIntervalId);
    };
  }, [fetchLobby, history, lobby.id, lobby.status, tickTime]);

  return (
    <Container>
      <Row>
        <Col>
          <h1>Game {lobby.id}</h1>
          <h3>Time: {lobby.game.phase === 0 ? 'day time' : 'night time'} ({renderPhase(lobby.game.phase)})</h3>
          <h3>Round: {lobby.game.round}</h3>
          <h3>Time left: {lobby.game.timeLeft}s</h3>
          {user.role === 'WITCH' ? <h3>Heal left: {user.healLeft}</h3> : ''}

          <ListGroup>
            {
              Object.keys(lobby.players).map((idx, index) => (
                <ListGroup.Item className="d-flex justify-content-between align-items-center" key={index} active={user.targetPlayerId === lobby.players[idx].id ? true : false}>
                  {lobby.players[idx].alias} (
                  {lobby.players[idx].id === socket.id ? `${lobby.players[idx].role} | ` : ''}
                  {lobby.players[idx].status})
                  {renderActionButtons(idx)}
                </ListGroup.Item>
              ))
            }
          </ListGroup>
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
});

export default connect(mapStateToProps)(Game);
