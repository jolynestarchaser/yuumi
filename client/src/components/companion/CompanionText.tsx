import { useState } from 'react';
import { useTranslation } from '../../hooks/useTranslation.js';
import { useCompanionLanguage } from './companionLanguage.js';

export default function CompanionText({ text }: { text: string }) {
  const { language, t } = useCompanionLanguage();
  const { translate, translating, translationError } = useTranslation();
  const [result, setResult] = useState<{ source: string; language: string; text: string } | null>(null);
  const [showTranslated, setShowTranslated] = useState(true);
  const matching = result?.source === text && result?.language === language;
  const localized = t(text);
  const canTranslate = localized === text && (language === 'th' ? /[a-zA-Z]/.test(text) : /[\u0E00-\u0E7F]/.test(text));
  return <div className='companion-translatable'>
    <p>{matching && showTranslated ? result.text : localized}</p>
    {canTranslate && <button type='button' disabled={translating} onClick={async () => {
      if (matching) { setShowTranslated(!showTranslated); return; }
      const output = await translate(text, language);
      if (output) { setResult({ source: text, language, text: output }); setShowTranslated(true); }
    }}>{translating ? t('Translating…') : matching && showTranslated ? t('Original') : language === 'th' ? t('Translate to Thai') : t("Translate to English")}</button>}
    {translationError && <small role='alert'>{t(translationError)}</small>}
  </div>;
}
