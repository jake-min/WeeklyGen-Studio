
import React, { useState, useEffect, useCallback } from 'react';
import Layout from './components/Layout';
import ImageGenerator from './components/ImageGenerator';
import VideoGenerator from './components/VideoGenerator';
import SpeechGenerator from './components/SpeechGenerator';
import { ViewType, GeneratedImage } from './types';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>(ViewType.IMAGE);
  const [isApiKeySelected, setIsApiKeySelected] = useState<boolean>(false);
  const [isCheckingKey, setIsCheckingKey] = useState(true);
  
  const [imageHistory, setImageHistory] = useState<GeneratedImage[]>([]);

  const checkApiKey = useCallback(async () => {
    try {
      // 1. AI Studio 환경 전용 함수 체크
      if (window.aistudio?.hasSelectedApiKey) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setIsApiKeySelected(hasKey);
      } else {
        // 2. 환경 변수 직접 체크 (Placeholder 필터링 포함)
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
    try {
      if (window.aistudio?.openSelectKey) {
        await window.aistudio.openSelectKey();
        // 가이드에 따라 다이얼로그 호출 후에는 성공한 것으로 간주하여 진입 허용
        setIsApiKeySelected(true);
      }
    } catch (err) {
      console.error("API 키 선택 대화상자 열기 실패:", err);
    }
  };

  const handleApiError = (error: any) => {
    // 특정 오류(프로젝트 없음, 가짜 키 에러 등) 발생 시 다시 선택 화면으로 유도
    if (error?.message?.includes("Requested entity was not found") || 
        error?.message?.includes("API 키가 설정되지 않았습니다") ||
        error?.message?.includes("유효한 API 키가 선택되지 않았습니다")) {
      setIsApiKeySelected(false);
      handleOpenApiKeyDialog();
    }
  };

  if (isCheckingKey) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isApiKeySelected) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-3xl p-10 shadow-2xl">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/20 mb-8 mx-auto animate-pulse">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-4 tracking-tight font-serif">WeeklyGen Studio</h1>
          <p className="text-gray-400 mb-8 leading-relaxed">
            최첨단 생성형 AI 모델을 사용하기 위해 유료 GCP 프로젝트의 API 키 선택이 필요합니다.
          </p>
          
          <button
            onClick={handleOpenApiKeyDialog}
            className="w-full px-8 py-4 bg-white text-gray-950 font-bold rounded-2xl hover:bg-gray-100 transition-all shadow-xl shadow-white/5 flex items-center justify-center gap-3 mb-6 active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            API 키 선택하기
          </button>

          <div className="pt-6 border-t border-gray-800">
            <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-widest">도움말</p>
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300 text-sm font-semibold flex items-center justify-center gap-1 group"
            >
              결제 및 API 키 가이드 확인
              <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
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
  );
};

export default App;
