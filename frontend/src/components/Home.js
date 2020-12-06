import React from 'react';
import { Link } from 'react-router-dom';

import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';

class Home extends React.Component {
  render() {
    return (
      <Container>
        <Row>
          <Col>
            <h1 className="text-center">WhoWolf</h1>
          </Col>
        </Row>

        <Row>
          <Col xs={12} md={6} className="text-center">
            <Link to="/lobby/join">
              <Button variant="primary" block>
                Join Game
              </Button>
            </Link>
          </Col>

          <Col xs={12} md={6} className="text-center mt-3 mt-md-0">
            <Link to="/lobby/create">
              <Button variant="primary" block>
                Create Game
              </Button>
            </Link>
          </Col>
        </Row>
      </Container>
    );
  }
}

export default Home;
