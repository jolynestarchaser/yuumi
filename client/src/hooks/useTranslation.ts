import { useCallback, useState } from 'react';
import { api } from '../lib/api.js';
import type { TranslationResult, TranslationTarget } from '../../../shared/contracts.js';

export function useTranslation() {
  const [translating, setTranslating] = useState(false);
  const [translationError, setTranslationError] = useState('');
  const translate = useCallback(async (text: string, target: TranslationTarget) => {
    if (!text.trim()) return null;
    setTranslating(true);
    setTranslationError('');
    try {
      const { data } = await api.post<{ success: true; data: TranslationResult }>('/translations', { text, target });
      return data.data.text;
    } catch (error) {
      const message = error?.response?.data?.error?.message ?? 'แปลข้อความไม่สำเร็จ กรุณาลองอีกครั้ง';
      setTranslationError(message);
      return null;
    } finally {
      setTranslating(false);
    }
  }, []);
  return { translate, translating, translationError, clearTranslationError: () => setTranslationError('') };
}
