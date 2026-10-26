import React from 'react';
import { createRoot } from 'react-dom/client';
import AuthFlow from './AuthFlow.jsx';
import './styles.css';
import './auth.css';
import './figma.css';

createRoot(document.getElementById('root')).render(<React.StrictMode><AuthFlow /></React.StrictMode>);
