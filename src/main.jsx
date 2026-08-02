import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { TradeColorProvider } from './context/TradeColorContext';
import { TimezoneProvider } from './context/TimezoneContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <CurrencyProvider>
        <TradeColorProvider>
        <TimezoneProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
        </TimezoneProvider>
        </TradeColorProvider>
        </CurrencyProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
