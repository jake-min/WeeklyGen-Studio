
import React, { useState, useEffect } from 'react';
import { testConnection } from '../services/geminiService';
import { encryptData, decryptData } from '../utils/crypto';

interface ApiKeyManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeySaved: () => void;
}

const ApiKeyManagementModal: React.FC<ApiKeyManagementModalProps> = ({ isOpen, onClose, onKeySaved }) => {
  const [inputKey, setInputKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [isUsingCustom, setIsUsingCustom] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem('weeklygen_custom_key');
      if (saved) {
        decryptData(saved).then(key => {
          setInputKey(key);
          setIsUsingCustom(true);
        });
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTest = async () => {
    if (!inputKey.trim()) return;
    setTestStatus('testing');
    setErrorMessage('');
    
    const success = await testConnection(inputKey);
    if (success) {
      setTestStatus('success');
    } else {
      setTestStatus('error');
      setErrorMessage('연결에 실패했습니다. 키를 다시 확인해주세요.');
    }
  };

  const handleSave = async () => {
    try {
      const encrypted = await encryptData(inputKey);
      localStorage.setItem('weeklygen_custom_key', encrypted);
      setTestStatus('idle');
      onKeySaved();
      onClose();
    } catch (e) {
      setErrorMessage('저장 중 오류가 발생했습니다.');
    }
  };

  const handleRemove = () => {
    localStorage.removeItem('weeklygen_custom_key');
    setInputKey('');
    setIsUsingCustom(false);
    onKeySaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-gray-900 border border-gray-800 rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">API 키 관리</h2>
            <p className="text-xs text-gray-400">사용자 정의 API 키를 안전하게 암호화하여 저장합니다.</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Google Gemini API Key</label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={inputKey}
                onChange={(e) => {
                  setInputKey(e.target.value);
                  setTestStatus('idle');
                }}
                placeholder="AI Studio에서 발급받은 키를 입력하세요"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl py-3 px-4 text-white placeholder-gray-600 focus:ring-2 focus:ring-indigo-500 outline-none transition-all pr-12"
              />
              <button 
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showKey ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.882 9.882L5.99 5.99m10.125 10.125l4.01 4.01M15 15l1.25 1.25L15 15zm3.25 3.25L19 19l-0.75-0.75z" /></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                )}
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleTest}
              disabled={testStatus === 'testing' || !inputKey}
              className={`flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                testStatus === 'success' 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {testStatus === 'testing' ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : testStatus === 'success' ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              ) : null}
              {testStatus === 'testing' ? '연결 중...' : testStatus === 'success' ? '연결 성공' : '연결 테스트'}
            </button>
            
            <button
              onClick={handleSave}
              disabled={testStatus !== 'success'}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-xl font-bold transition-all"
            >
              키 저장하기
            </button>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-900/20 border border-red-500/30 text-red-400 text-xs rounded-lg flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {errorMessage}
            </div>
          )}

          <div className="pt-6 border-t border-gray-800 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">외부 키 사용 상태</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isUsingCustom ? 'bg-green-500/20 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                {isUsingCustom ? '활성화됨' : '미사용'}
              </span>
            </div>
            
            {isUsingCustom && (
              <button onClick={handleRemove} className="text-xs text-red-500 hover:text-red-400 underline underline-offset-4 text-left font-medium">
                사용자 키 삭제 및 시스템 기본값으로 복구
              </button>
            )}
            
            <p className="text-[10px] text-gray-600 leading-relaxed">
              * 입력하신 키는 귀하의 브라우저 로컬 저장소에 암호화되어 저장되며, 서버로 전송되지 않습니다. 브라우저 쿠키나 데이터를 삭제하면 키도 함께 삭제됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyManagementModal;
