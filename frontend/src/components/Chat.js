import React, { useCallback, useEffect, useState } from 'react';
import { connect } from 'react-redux';

import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import ListGroup from 'react-bootstrap/ListGroup';
import Row from 'react-bootstrap/Row';

const Chat = ({ socket, lobby, dispatch }) => {
  const [chat, setChat] = useState([]);
  const [chatMessageInput, setChatMessageInput] = useState('');
  const [chatTimeout, setChatTimeout] = useState(false);

  const fetchChat = useCallback(() => {
    socket.on('chat', (message) => {
      console.log(`Message received: ${message.chatMessage}`);
      setChat(chat => [...chat, { alias: message.alias, chatMessage: message.chatMessage }]);
    });
  }, [socket]);

  useEffect(() => {
    fetchChat();
  }, [fetchChat]);

  const sendChatMessage = e => {
    if (!chatTimeout) {
      socket.emit('chat', chatMessageInput);
      setChatMessageInput('');
      setChatTimeout(true);

      setTimeout(() => setChatTimeout(false), 1000);
    } else {
      console.log('blocked');
    }

    e.preventDefault();
  }

  return (
    <Container>
      <Row>
        <Col>
          <h3>Chat</h3>
        </Col>
      </Row>

      <Row>
        <Col>
          <ListGroup>
            {chat.map((item, index) => (
              <ListGroup.Item key={index}>{item.alias}: {item.chatMessage}</ListGroup.Item>
            ))}
          </ListGroup>
        </Col>
      </Row>

      <Row>
        <Col>
          <Form onSubmit={sendChatMessage}>
            <Form.Group controlId="chatMessage">
              <Form.Control type="text" value={chatMessageInput} onChange={e => setChatMessageInput(e.target.value)} required />
            </Form.Group>

            <Button variant="primary" type="submit">Enter</Button>
          </Form>
        </Col>
      </Row>
    </Container>
  );
}

const mapStateToProps = (state) => ({
  socket: state.socket,
  lobby: state.lobby
})

export default connect(mapStateToProps)(Chat);
