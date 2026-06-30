import React from 'react';
import ReactDOM from 'react-dom/client';
import { DirectApp } from './DirectApp';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DirectApp />
  </React.StrictMode>,
);
