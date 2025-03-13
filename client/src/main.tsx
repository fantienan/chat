import '@ant-design/v5-patch-for-react-19';
import 'regenerator-runtime/runtime';
import { createRoot } from 'react-dom/client';
import App from './app.tsx';

createRoot(document.getElementById('root')!).render(<App />);
