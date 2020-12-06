import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';

import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSlidersH } from '@fortawesome/free-solid-svg-icons';

const LobbySetting = ({ socket, lobby }) => {
  const [game, setGame] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [amountWerwolfPlayers, setAmountWerwolfPlayers] = useState(1);
  const [showSetting, setShowSetting] = useState(false);

  const handleShowSetting = () => setShowSetting(true);
  const handleCloseSetting = () => setShowSetting(false);

  const updateSettings = () => {
    socket.emit('lobby', 'LOBBY_SETTING', {
      game: game,
      timeLeft: timeLeft,
      amountWerwolfPlayers: amountWerwolfPlayers
    });

    console.log('Done');

    setShowSetting(false);
  };

  useEffect(() => {
    setTimeLeft(lobby.timeLeft);
    setAmountWerwolfPlayers(lobby.amountWerwolfPlayers);
  }, [lobby]);

  return (
    <>
      <Button variant="info" onClick={handleShowSetting}>
        <FontAwesomeIcon icon={faSlidersH} />
      </Button>

      <Modal
        show={showSetting}
        onHide={handleCloseSetting}
        aria-labelledby="contained-modal-title-vcenter"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Settings</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group controlId="formTimeLeft">
              <Form.Label>Time left</Form.Label>
              <Form.Control type="number" defaultValue={timeLeft} min="30" onChange={e => setTimeLeft(e.target.value)} />
            </Form.Group>
            <Form.Group controlId="formAmountWerwolfPlayers">
              <Form.Label>Amount Werwolf Players</Form.Label>
              <Form.Control type="number" defaultValue={amountWerwolfPlayers} min="1" onChange={e => setAmountWerwolfPlayers(e.target.value)} />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseSetting}>
            Close
          </Button>
          <Button variant="primary" onClick={updateSettings}>
            Save Settings
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

const mapStateToProps = (state) => ({
  socket: state.socket,
  lobby: state.lobby
})

export default connect(mapStateToProps)(LobbySetting);
