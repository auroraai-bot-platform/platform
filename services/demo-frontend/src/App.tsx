import React from 'react';
import Widget from 'rasa-webchat';

import logo from './logo.svg';
import './App.css';

const onSocketEvent={
  'bot_uttered': () => console.log('the bot said something'),
  'connect': () => console.log('connection established'),
  'disconnect': () => console.log('disconnect'),
};

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <Widget
          initPayload={"/get_started"}
          socketUrl={"https://api.demo.aaibot.link:5005"}
          socketPath={"/socket.io/"}
          onSocketEvent={onSocketEvent}
          customData={{"language": "fi"}} // arbitrary custom data. Stay minimal as this will be added to the socket
          title={"Title"}
        />
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;
