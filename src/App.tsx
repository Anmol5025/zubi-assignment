import { UIProvider } from './contexts/UIContext';
import { UIController } from './components/UIController';
import { conversationConfig } from './config/appConfig';
import './App.css';

function App() {
  const imageUrl = '/images/friendly-elephant.svg';

  return (
    <UIProvider>
      <UIController 
        imageUrl={imageUrl}
        conversationConfig={conversationConfig}
      />
    </UIProvider>
  );
}

export default App;
