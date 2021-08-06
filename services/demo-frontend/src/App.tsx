import React from 'react';
import Widget from 'rasa-webchat';

import logo from './logo.svg';
import './App.scss';

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
          socketUrl={"http://localhost:5005"}
          socketPath={"/socket.io/"}
          onSocketEvent={onSocketEvent}
          customData={{"language": "fi"}} // arbitrary custom data. Stay minimal as this will be added to the socket
          title="<strong>hh11</strong>"
          subtitle={null}
          inputTextFieldHint="inputTextFieldHint"
        />
        <img src={logo} className="App-logo" alt="logo" />
      </header>
    </div>
  );
}

export default App;
