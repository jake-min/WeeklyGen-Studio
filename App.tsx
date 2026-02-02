
import React, { useState, useEffect, useCallback } from 'react';
import Layout from './components/Layout';
import ImageGenerator from './components/ImageGenerator';
import VideoGenerator from './components/VideoGenerator';
import SpeechGenerator from './components/SpeechGenerator';
import ApiKeyManagementModal from './components/ApiKeyManagementModal';
import { ViewType, GeneratedImage } from './types';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>(ViewType.IMAGE);
  const [isApiKeySelected, setIsApiKeySelected] = useState<boolean>(false);
  const [isCheckingKey, setIsCheckingKey] = useState(true);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  
  const [imageHistory, setImageHistory] = useState<GeneratedImage[]>([]);

  const checkApiKey = useCallback(async () => {
    try {
      // 1. 커스텀 저장 키 확인
      const customKey = localStorage.getItem('weeklygen_custom_key');
      if (customKey) {
        setIsApiKeySelected(true);
        setIsCheckingKey(false);
        return;
      }

      // 2. AI Studio 환경 전용 함수 체크
      if (window.aistudio?.hasSelectedApiKey) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setIsApiKeySelected(hasKey);
      } else {
        // 3. 환경 변수 직접 체크 (Placeholder 필터링 포함)
        const envKey = process.env.API_KEY;
        const isValid = !!envKey && 
                        envKey.length > 0 && 
                        !envKey.includes("UNUSED_PLACEHOLDER") && 
                        envKey !== "undefined";
        
        setIsApiKeySelected(isValid);
      }
    } catch (err) {
      console.error("API 키 확인 중 오류:", err);
      setIsApiKeySelected(false);
    } finally {
      setIsCheckingKey(false);
    }
  }, []);

  useEffect(() => {
    checkApiKey();
  }, [checkApiKey]);

  const handleOpenApiKeyDialog = async () => {
    // 이제 커스텀 모달을 먼저 엽니다.
    setIsKeyModalOpen(true);
  };

  const handleApiError = (error: any) => {
    if (error?.message?.includes("API 키") || error?.message?.includes("key")) {
      setIsApiKeySelected(false);
      setIsKeyModalOpen(true);
    }
  };

  if (isCheckingKey) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      {(!isApiKeySelected && !isKeyModalOpen) ? (
        <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-3xl p-10 shadow-2xl">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/20 mb-8 mx-auto animate-pulse">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-4 tracking-tight font-serif">WeeklyGen Studio</h1>
            <p className="text-gray-400 mb-8 leading-relaxed">
              앱을 사용하려면 API 키를 입력하거나 프로젝트를 선택해야 합니다.
            </p>
            
            <button
              onClick={() => setIsKeyModalOpen(true)}
              className="w-full px-8 py-4 bg-white text-gray-950 font-bold rounded-2xl hover:bg-gray-100 transition-all shadow-xl shadow-white/5 flex items-center justify-center gap-3 mb-6 active:scale-95"
            >
              API 키 관리 열기
            </button>

            <div className="pt-6 border-t border-gray-800">
              <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-widest">도움말</p>
              <a 
                href="https://ai.google.dev/gemini-api/docs/billing" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300 text-sm font-semibold"
              >
                결제 및 API 키 가이드 확인
              </a>
            </div>
          </div>
        </div>
      ) : (
        <Layout 
          activeView={activeView} 
          onViewChange={setActiveView}
          onManageKey={handleOpenApiKeyDialog}
        >
          {activeView === ViewType.IMAGE && (
            <ImageGenerator history={imageHistory} setHistory={setImageHistory} onApiError={handleApiError} />
          )}
          {activeView === ViewType.VIDEO && (
            <VideoGenerator imageLibrary={imageHistory} onApiError={handleApiError} />
          )}
          {activeView === ViewType.SPEECH && (
            <SpeechGenerator onApiError={handleApiError} />
          )}
        </Layout>
      )}

      <ApiKeyManagementModal 
        isOpen={isKeyModalOpen} 
        onClose={() => setIsKeyModalOpen(false)} 
        onKeySaved={checkApiKey}
      />
    </>
  );
};

export default App;
