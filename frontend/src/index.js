import React from 'react';

import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import rootReducer from './reducers';

import './custom-bootstrap-theme.scss';
import './index.scss';
import App from './App';

const store = createStore(rootReducer, window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__());

render (
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById('root')
);
