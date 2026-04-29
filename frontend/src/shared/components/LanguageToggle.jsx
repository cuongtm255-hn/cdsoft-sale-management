import { Segmented } from 'antd';
import { useTranslation } from 'react-i18next';

export default function LanguageToggle() {
  const { i18n } = useTranslation();
  const current = i18n.language === 'en' ? 'EN' : 'VI';

  const handleChange = (val) => {
    const lng = val.toLowerCase();
    i18n.changeLanguage(lng);
    localStorage.setItem('lang', lng);
  };

  return (
    <Segmented
      options={['VI', 'EN']}
      value={current}
      onChange={handleChange}
      size="small"
      style={{ marginRight: 12 }}
    />
  );
}
