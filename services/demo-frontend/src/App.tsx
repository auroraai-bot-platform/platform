import Widget from 'rasa-webchat';

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
          socketUrl={"https://api.demo.aaibot.link:5005"}
          socketPath={"/socket.io/"}
          onSocketEvent={onSocketEvent}
          customData={{"language": "fi"}} // arbitrary custom data. Stay minimal as this will be added to the socket
          title="Hytebotti"
          subtitle={null}
          inputTextFieldHint="Kirjoita jotain..."
        />
      </header>
    </div>
  );
}

export default App;
