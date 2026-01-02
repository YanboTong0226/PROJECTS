import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "YOUR_GEMINI_API_KEY_HERE",
  authDomain: "full-stack-react-600c0.firebaseapp.com",
  projectId: "full-stack-react-600c0",
  storageBucket: "full-stack-react-600c0.firebasestorage.app",
  messagingSenderId: "218697587787",
  appId: "1:218697587787:web:792f71800a4f15406201ce",
  measurementId: "G-BMZHT21C47"
};

const app = initializeApp(firebaseConfig);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
