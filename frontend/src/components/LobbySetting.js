import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';

import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSlidersH } from '@fortawesome/free-solid-svg-icons';

const LobbySetting = ({ socket, lobby }) => {
  const [timeLeft, setTimeLeft] = useState(30);
  const [amountWerwolfPlayers, setAmountWerwolfPlayers] = useState(1);
  const [witch, setWitch] = useState(true);
  const [seer, setSeer] = useState(false);
  const [showSetting, setShowSetting] = useState(false);

  const handleShowSetting = () => setShowSetting(true);
  const handleCloseSetting = () => setShowSetting(false);

  const updateSettings = () => {
    socket.emit('lobby', 'LOBBY_SETTING', {
      timeLeft: timeLeft,
      amountWerwolfPlayers: amountWerwolfPlayers,
      witch: witch,
      seer: seer
    });

    setShowSetting(false);
  };

  useEffect(() => {
    setTimeLeft(lobby.timeLeft);
    setAmountWerwolfPlayers(lobby.amountWerwolfPlayers);
    setWitch(lobby.witch ? true : false);
    setSeer(lobby.seer ? true : false);
    console.log(lobby.witch);
    console.log(witch);
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
            <Form.Group>
              <Form.Label>Game</Form.Label>
              <Form.Control as="select" defaultValue="0">
                <option value="0">Werwolf</option>
                <option value="1" disabled>Secret Hitler</option>
                <option value="2" disabled>Spyfall</option>
              </Form.Control>
            </Form.Group>
            <Form.Group controlId="formTimeLeft">
              <Form.Label>Time left</Form.Label>
              <Form.Control type="number" defaultValue={timeLeft} min="30" max="90" onChange={e => setTimeLeft(e.target.value)} />
            </Form.Group>
            <Form.Group controlId="formAmountWerwolfPlayers">
              <Form.Label>Amount Werwolf Players</Form.Label>
              <Form.Control type="number" defaultValue={amountWerwolfPlayers} min="1" max={Math.max(1, Math.floor(lobby.players.length / 2))} onChange={e => setAmountWerwolfPlayers(e.target.value)} />
            </Form.Group>

            <Form.Check type="checkbox" checked={witch} label="Witch" onClick={e => setWitch(!witch)} />

            <Form.Check type="checkbox" checked={seer} label="Seer" onClick={e => setSeer(!seer)} />
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
