import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CURRENCIES, DEFAULT_CURRENCY } from '../constants/currencies';

const CurrencyContext = createContext(null);

export function CurrencyProvider({ children }) {
  const [currencyCode, setCurrencyCode] = useState(() => {
    return localStorage.getItem('currency') || DEFAULT_CURRENCY;
  });

  useEffect(() => {
    localStorage.setItem('currency', currencyCode);
  }, [currencyCode]);

  const currency = CURRENCIES.find(c => c.code === currencyCode) || CURRENCIES[0];

  const formatMoney = useCallback((value) => {
    const num = Number(value);
    if (isNaN(num)) return `${currency.symbol}0.00`;
    try {
      return new Intl.NumberFormat(currency.locale, {
        style: 'currency',
        currency: currency.code,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num);
    } catch {
      return `${currency.symbol}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  }, [currency]);

  const formatMoneyCompact = useCallback((value) => {
    const num = Number(value);
    if (isNaN(num)) return `${currency.symbol}0`;
    try {
      return new Intl.NumberFormat(currency.locale, {
        style: 'currency',
        currency: currency.code,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(num);
    } catch {
      return `${currency.symbol}${Math.round(num).toLocaleString('en-US')}`;
    }
  }, [currency]);

  const formatMoneyShort = useCallback((value) => {
    const num = Number(value);
    if (isNaN(num)) return `${currency.symbol}0`;
    const abs = Math.abs(num);
    let formatted;
    if (abs >= 1_000_000) formatted = `${(num / 1_000_000).toFixed(1)}M`;
    else if (abs >= 1_000) formatted = `${(num / 1_000).toFixed(1)}K`;
    else formatted = Math.round(num).toString();
    return num < 0 ? `-${currency.symbol}${formatted.replace(/^-/, '')}` : `${currency.symbol}${formatted}`;
  }, [currency]);

  return (
    <CurrencyContext.Provider value={{ currency, currencyCode, setCurrencyCode, formatMoney, formatMoneyCompact, formatMoneyShort }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export const useCurrency = () => useContext(CurrencyContext);