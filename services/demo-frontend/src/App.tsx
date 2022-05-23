import Widget from 'auroraai-webchat';
import { useEffect, useState } from 'react';

import './App.scss';

const onSocketEvent = {
  'bot_uttered': () => console.log('the bot said something'),
  'connect': () => console.log('connection established'),
  'disconnect': () => console.log('disconnect'),
};

interface RasaConfig {
  url: string;
  language?: string;
  additionalConfig?: {
    intents: {
      [key: string]: string;
    }
  }
}

function App() {
  const [rasaConfig, setRasaConfig] = useState<RasaConfig>({ url: '' });
  const rasaConfigUrl = 'config/rasa-config.json';
  const urlPath = window.location.pathname.substring(1).toLocaleLowerCase();

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      setRasaConfig({ url: 'http://localhost:5005', language: 'fi' });
      return;
    }

    fetch(rasaConfigUrl).then((response) => response.json()).then((data) => {
      setRasaConfig(data);
    });
  }, []);

  return (
    rasaConfig.url !== '' ?
      <div className="App">
        <header className="App-header">
          <Widget
            socketUrl={rasaConfig?.url}
            socketPath={"/socket.io/"}
            onSocketEvent={onSocketEvent}
            customData={{ "language": rasaConfig?.language || 'fi' }} // arbitrary custom data. Stay minimal as this will be added to the socket
          />
        </header>
      </div>
      : null
  );
}

export default App;
