import { UIProvider } from './contexts/UIContext';
import { UIController } from './components/UIController';
import { conversationConfig } from './config/appConfig';
import './App.css';

function App() {
  // Use the first sample image by default
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
