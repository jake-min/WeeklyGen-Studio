
import React, { useState, useRef } from 'react';
import { GeneratedSpeech } from '../types';
import { generateSpeech } from '../services/geminiService';

const VOICES = [
  { id: 'Zephyr', name: 'Zephyr', description: '따뜻하고 신뢰감 있는 남성', tag: '신뢰감' },
  { id: 'Puck', name: 'Puck', description: '에너지 넘치고 활발한 목소리', tag: '에너지' },
  { id: 'Charon', name: 'Charon', description: '차분하고 지적인 느낌의 남성', tag: '차분함' },
  { id: 'Kore', name: 'Kore', description: '밝고 쾌활한 여성 목소리', tag: '밝음' },
  { id: 'Fenrir', name: 'Fenrir', description: '강력하고 권위 있는 남성', tag: '권위적' },
  { id: 'Aoede', name: 'Aoede', description: '우아하고 섬세한 여성', tag: '우아함' },
  { id: 'Erebus', name: 'Erebus', description: '진지하고 무게감 있는 목소리', tag: '무게감' },
];

interface SpeechGeneratorProps {
  onApiError?: (error: any) => void;
}

const SpeechGenerator: React.FC<SpeechGeneratorProps> = ({ onApiError }) => {
  const [script, setScript] = useState('');
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSampling, setIsSampling] = useState<string | null>(null);
  const [history, setHistory] = useState<GeneratedSpeech[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSampleListen = async (voice: typeof VOICES[0]) => {
    if (isSampling || isGenerating) return;
    setIsSampling(voice.id);
    try {
      const url = await generateSpeech("반가워요! 제 목소리는 어떤가요?", voice.id);
      const audio = new Audio(url);
      audio.play();
      audio.onended = () => setIsSampling(null);
    } catch (err: any) {
      console.error(err);
      setIsSampling(null);
      if (onApiError) onApiError(err);
    }
  };

  const handleGenerate = async () => {
    if (!script.trim()) return;
    setIsGenerating(true);
    setError(null);

    try {
      const url = await generateSpeech(script, selectedVoice.id);
      const newSpeech: GeneratedSpeech = {
        audioUrl: url,
        text: script,
        voice: selectedVoice.name,
        timestamp: Date.now()
      };
      setHistory(prev => [newSpeech, ...prev]);
      setScript('');
    } catch (err: any) {
      setError(err.message || '음성 생성 중 오류가 발생했습니다.');
      if (onApiError) onApiError(err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header>
        <h2 className="text-3xl font-bold text-white mb-2 font-serif">음성 스튜디오</h2>
        <p className="text-gray-400">텍스트를 자연스러운 AI 목소리로 변환하세요. 다양한 목소리 샘플을 들어보고 선택할 수 있습니다.</p>
      </header>

      {/* Voice Selection Grid */}
      <section className="space-y-4">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">목소리 선택</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {VOICES.map((voice) => (
            <div 
              key={voice.id}
              onClick={() => setSelectedVoice(voice)}
              className={`relative p-5 rounded-2xl border-2 transition-all cursor-pointer group ${
                selectedVoice.id === voice.id 
                ? 'border-cyan-500 bg-cyan-500/5 shadow-lg shadow-cyan-500/10' 
                : 'border-gray-800 bg-gray-900/40 hover:border-gray-700'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedVoice.id === voice.id ? 'bg-cyan-500 text-white' : 'bg-gray-800 text-gray-400 group-hover:bg-gray-700'}`}>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleSampleListen(voice); }}
                  disabled={isSampling !== null}
                  className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition-all ${isSampling === voice.id ? 'bg-cyan-500 text-white animate-pulse' : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'}`}
                >
                  {isSampling === voice.id ? '재생 중...' : '샘플 듣기'}
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /></svg>
                </button>
              </div>
              <h4 className="text-white font-bold text-sm mb-1">{voice.name}</h4>
              <p className="text-gray-500 text-xs leading-relaxed mb-2">{voice.description}</p>
              <span className="text-[10px] font-black uppercase text-cyan-500/60">{voice.tag}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Generation Panel */}
      <section className="bg-gray-900/50 border border-gray-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {isGenerating && (
          <div className="absolute inset-0 bg-gray-950/80 z-20 flex flex-col items-center justify-center backdrop-blur-sm">
             <div className="flex gap-1 items-end h-8 mb-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-1 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.1}s`, height: `${20 + Math.random() * 60}%` }}></div>
                ))}
             </div>
             <p className="text-cyan-400 font-bold animate-pulse">고품질 음성 합성 중...</p>
          </div>
        )}

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-gray-400">대본 입력</label>
            <span className="text-xs text-gray-600 font-mono">{script.length} / 500</span>
          </div>
          
          <textarea
            value={script}
            onChange={(e) => setScript(e.target.value.slice(0, 500))}
            placeholder={`${selectedVoice.name}의 목소리로 읽을 텍스트를 입력하세요...`}
            className="w-full bg-gray-800/50 border border-gray-700 rounded-2xl p-6 text-white text-lg placeholder-gray-600 focus:ring-2 focus:ring-cyan-500 outline-none resize-none h-48 transition-all shadow-inner"
          />

          <div className="flex justify-end items-center gap-6">
             <div className="flex items-center gap-3 text-cyan-500/50">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                <span className="text-xs font-bold uppercase tracking-widest">Select: {selectedVoice.name}</span>
             </div>
             <button
              onClick={handleGenerate}
              disabled={isGenerating || !script.trim()}
              className={`px-12 py-4 rounded-2xl font-black text-white flex items-center gap-3 transition-all ${isGenerating ? 'bg-gray-800' : 'bg-gradient-to-r from-cyan-600 to-indigo-600 hover:shadow-xl hover:shadow-cyan-600/20 active:scale-95'}`}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
              음성 생성하기
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-6 p-4 bg-red-900/20 border border-red-500/30 text-red-400 rounded-xl text-sm flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {error}
          </div>
        )}
      </section>

      {/* Speech History */}
      <section>
        <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-2 font-serif">생성 기록</h3>
        {history.length === 0 ? (
          <div className="py-20 bg-gray-900/20 border border-dashed border-gray-800 rounded-3xl text-center text-gray-600">
            <p className="font-medium">생성된 음성이 아직 없습니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {history.map((speech) => (
              <div key={speech.timestamp} className="bg-gray-900 rounded-2xl p-6 border border-gray-800 hover:border-cyan-500/30 transition-all flex flex-col md:flex-row items-center gap-6">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded bg-cyan-600/20 text-cyan-400 text-[10px] font-black uppercase">{speech.voice}</span>
                    <span className="text-[10px] text-gray-600">{new Date(speech.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-gray-300 italic line-clamp-2">"{speech.text}"</p>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                   <audio src={speech.audioUrl} controls className="h-10 rounded-lg flex-1" />
                   <a 
                    href={speech.audioUrl} 
                    download={`weeklygen-speech-${speech.timestamp}.wav`}
                    className="p-3 bg-gray-800 hover:bg-gray-700 rounded-xl text-gray-400 hover:text-white transition-all shadow-sm"
                   >
                     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                   </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default SpeechGenerator;
