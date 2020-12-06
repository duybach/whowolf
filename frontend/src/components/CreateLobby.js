import React, { useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { connect } from 'react-redux';

import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';

import { setLobbyId } from '../actions';

const CreateLobby = ({ socket, dispatch }) => {
  const history = useHistory();

  const [isLoading, setLoading] = useState(false);
  const [aliasInput, setAliasInput] = useState('');

  const createLobby = (e) => {
    setLoading(true);

    socket.emit('createLobby', aliasInput, (message) => {
      dispatch(setLobbyId(message.lobbyId));
      history.push(`/lobby/${message.lobbyId}`);
    });

    e.preventDefault();
  }

  return (
    <Container>
      <Row>
        <Col>
          <h1>Create A Lobby</h1>
        </Col>
      </Row>

      <Row>
        <Col>
          <Form onSubmit={createLobby}>
            <Form.Group as={Row} controlId="formAlias">
              <Form.Label column sm={2}>
                Player Name
              </Form.Label>
              <Col sm={10}>
                <Form.Control type="text" placerholder="Player Name" value={aliasInput} onChange={e => setAliasInput(e.target.value)} required />
              </Col>
            </Form.Group>

            <Form.Group as={Row}>
              <Col>
                <Button variant="primary" type="submit" disabled={isLoading} block>
                  {isLoading ? 'Loading...' : 'Create Lobby'}
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
  );
}

const mapStateToProps = state => ({
  socket: state.socket
})

export default connect(mapStateToProps)(CreateLobby)
