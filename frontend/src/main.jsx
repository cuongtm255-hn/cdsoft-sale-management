import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import enUS from 'antd/locale/en_US';
import { useTranslation } from 'react-i18next';
import './i18n';
import App from './App';
import './index.css';

function LocalizedApp() {
  const { i18n } = useTranslation();
  const locale = i18n.language === 'en' ? enUS : viVN;
  return (
    <ConfigProvider locale={locale} theme={{ token: { colorPrimary: '#1677ff' } }}>
      <App />
    </ConfigProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LocalizedApp />
  </React.StrictMode>,
);
