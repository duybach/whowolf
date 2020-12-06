import React, { useState} from 'react';
import { useHistory } from 'react-router-dom';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';

import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';

import { setLobbyId } from '../actions';

const JoinLobby = ({ socket, dispatch }) => {
  const history = useHistory();
  const [isLoading, setLoading] = useState(false);
  const [lobbyIdInput, setLobbyIdInput] = useState('');
  const [aliasInput, setAliasInput] = useState('');

  const joinLobby = e => {
    setLoading(true);

    socket.emit('joinLobby', lobbyIdInput, aliasInput, function (data) {
      if ('error' in data) {
        console.log(data.error);
        setLoading(false);
      } else {
        dispatch(setLobbyId(data.lobbyId));
        history.push(`/lobby/${data.lobbyId}`);
      }
    });

    e.preventDefault();
  }

  return (
    <Container>
      <Row>
        <Col>
          <h1>Join A Lobby</h1>
        </Col>
      </Row>

      <Row>
        <Col>
          <Form onSubmit={joinLobby}>
            <Form.Group as={Row} controlId="formLobbyId">
              <Form.Label column sm={2}>
                Lobby ID
              </Form.Label>
              <Col sm={10}>
                <Form.Control value={lobbyIdInput} onChange={e => setLobbyIdInput(e.target.value)} type="text" placeholder="Lobby ID" required />
              </Col>
            </Form.Group>

            <Form.Group as={Row} controlId="formAlias">
              <Form.Label column sm={2}>
                Player Name
              </Form.Label>
              <Col sm={10}>
                <Form.Control type="text" value={aliasInput} onChange={e => setAliasInput(e.target.value)} placeholder="Player Name" required />
              </Col>
            </Form.Group>

            <Form.Group as={Row}>
              <Col>
                <Button variant="primary" type="submit" disabled={isLoading} block>
                  {isLoading ? 'Loading...' : 'Join Lobby'}
                </Button>
              </Col>

              <Col>
                <Link to="/">
                  <Button variant="danger" block>
                    Go back
                  </Button>
                </Link>
              </Col>
            </Form.Group>
          </Form>
        </Col>
      </Row>
    </Container>
  )
}

const mapStateToProps = state => ({
  socket: state.socket
});

export default connect(mapStateToProps)(JoinLobby);
