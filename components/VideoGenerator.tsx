
import React, { useState, useRef } from 'react';
import { GeneratedVideo, GeneratedImage } from '../types';
import { generateVideo, ImageInput } from '../services/geminiService';

interface VideoGeneratorProps {
  imageLibrary: GeneratedImage[];
  onApiError?: (error: any) => void;
}

const VideoGenerator: React.FC<VideoGeneratorProps> = ({ imageLibrary, onApiError }) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState('');
  const [history, setHistory] = useState<GeneratedVideo[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Reference images state
  const [startFrameImage, setStartFrameImage] = useState<ImageInput | null>(null);
  const [endFrameImage, setEndFrameImage] = useState<ImageInput | null>(null);
  
  const startFileInputRef = useRef<HTMLInputElement>(null);
  const endFileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'start' | 'end') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const input = {
        data: ev.target?.result as string,
        mimeType: file.type
      };
      if (type === 'start') setStartFrameImage(input);
      else setEndFrameImage(input);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const assignFromLibrary = (img: GeneratedImage, type: 'start' | 'end') => {
    const input = {
      data: img.url,
      mimeType: 'image/png'
    };
    if (type === 'start') setStartFrameImage(input);
    else setEndFrameImage(input);
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && !startFrameImage && !endFrameImage) return;
    setIsGenerating(true);
    setError(null);
    setStatus('초기화 중...');

    try {
      const videoUrl = await generateVideo(
        prompt || "A cinematic transition between the images.", 
        aspectRatio, 
        (newStatus) => setStatus(newStatus),
        startFrameImage || undefined,
        endFrameImage || undefined
      );
      const newVideo: GeneratedVideo = {
        url: videoUrl,
        prompt: prompt || "(참조 이미지 기반 시퀀스)",
        timestamp: Date.now()
      };
      setHistory(prev => [newVideo, ...prev]);
      setPrompt('');
      setStartFrameImage(null);
      setEndFrameImage(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || '영상 생성 중 오류가 발생했습니다.');
      if (onApiError) onApiError(err);
    } finally {
      setIsGenerating(false);
      setStatus('');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header>
        <h2 className="text-3xl font-bold text-white mb-2 font-serif">비디오 스튜디오</h2>
        <p className="text-gray-400">두 개의 이미지를 연결하여 부드러운 전환 효과를 만들거나, 시작과 끝을 정해 영상을 제작하세요.</p>
      </header>

      {/* Reference Library Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-gray-400 uppercase tracking-widest">참조 이미지 라이브러리</label>
        </div>
        
        <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
          {imageLibrary.length === 0 ? (
            <div className="flex-1 py-10 bg-gray-900/20 border border-dashed border-gray-800 rounded-2xl flex items-center justify-center text-xs text-gray-600 italic">
              이미지 스튜디오에서 생성한 이미지가 여기에 자동으로 나타납니다.
            </div>
          ) : (
            imageLibrary.map((img) => (
              <div key={img.timestamp} className="relative flex-shrink-0 group w-32 h-32 rounded-xl overflow-hidden border border-gray-800 shadow-lg">
                <img src={img.url} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="Library asset" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                  <button 
                    onClick={() => assignFromLibrary(img, 'start')}
                    className="w-full py-1 bg-indigo-600 hover:bg-indigo-500 text-[10px] font-bold text-white rounded transition-colors"
                  >
                    시작으로
                  </button>
                  <button 
                    onClick={() => assignFromLibrary(img, 'end')}
                    className="w-full py-1 bg-purple-600 hover:bg-purple-500 text-[10px] font-bold text-white rounded transition-colors"
                  >
                    종료로
                  </button>
                </div>
                {startFrameImage?.data === img.url && (
                  <div className="absolute top-1 left-1 bg-indigo-600 text-[8px] font-bold px-1.5 py-0.5 rounded shadow-md">시작</div>
                )}
                {endFrameImage?.data === img.url && (
                  <div className="absolute top-1 right-1 bg-purple-600 text-[8px] font-bold px-1.5 py-0.5 rounded shadow-md">종료</div>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {/* Main Generator Interface */}
      <section className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        {isGenerating && (
          <div className="absolute inset-0 bg-gray-950/80 z-20 flex flex-col items-center justify-center p-8 text-center backdrop-blur-sm">
            <div className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mb-6"></div>
            <h4 className="text-xl font-bold text-white mb-2 font-serif">시네마틱 엔진 가동 중</h4>
            <p className="text-purple-400 font-medium animate-pulse">{status}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[240px,1fr,240px] gap-8 items-center">
          
          {/* Start Frame Preview */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-gray-500 uppercase text-center block">시작 프레임 (Start)</label>
            <div className="relative group aspect-square rounded-xl overflow-hidden border-2 border-dashed border-gray-700 hover:border-indigo-500/50 transition-all bg-gray-800/20">
              {startFrameImage ? (
                <>
                  <img src={startFrameImage.data} className="w-full h-full object-cover" />
                  <button onClick={() => setStartFrameImage(null)} className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full shadow-lg">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </>
              ) : (
                <button onClick={() => startFileInputRef.current?.click()} className="w-full h-full flex flex-col items-center justify-center text-gray-500 hover:text-indigo-400 p-4 text-center">
                  <svg className="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4v16m8-8H4" /></svg>
                  <span className="text-[10px] font-bold">시작 이미지 업로드</span>
                </button>
              )}
              <input type="file" accept="image/*" className="hidden" ref={startFileInputRef} onChange={(e) => handleFileUpload(e, 'start')} />
            </div>
          </div>

          {/* Prompt & Config Area */}
          <div className="space-y-6">
            <div className="relative">
               <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping"></div>
                  <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Animation Path</div>
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-ping delay-75"></div>
               </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={startFrameImage && endFrameImage ? "두 이미지 사이의 움직임을 묘사하세요. 예: 낮에서 밤으로 서서히 변하며 창가에 빗방울이 맺히는 모습..." : "영상의 분위기와 내용을 상세히 입력하세요..."}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl p-5 text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none h-40 transition-all shadow-inner"
              />
            </div>
            
            <div className="flex flex-wrap items-center justify-between gap-4">
               <div className="flex gap-2">
                {['16:9', '9:16'].map(r => (
                  <button
                    key={r}
                    onClick={() => setAspectRatio(r as any)}
                    className={`px-4 py-2 rounded-lg text-[10px] font-bold transition-all ${aspectRatio === r ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'bg-gray-800 text-gray-500'}`}
                  >
                    {r === '16:9' ? 'Landscape' : 'Portrait'}
                  </button>
                ))}
              </div>
              <button
                onClick={handleGenerate}
                disabled={isGenerating || (!prompt.trim() && !startFrameImage && !endFrameImage)}
                className={`px-10 py-4 rounded-xl font-black flex items-center gap-3 transition-all ${isGenerating ? 'bg-gray-800 text-gray-600' : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500 shadow-2xl shadow-purple-600/20'}`}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /></svg>
                {startFrameImage && endFrameImage ? '이미지 합성/변환 영상 생성' : startFrameImage ? '이미지 기반 영상 생성' : '텍스트 기반 영상 생성'}
              </button>
            </div>
          </div>

          {/* End Frame Preview */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-gray-500 uppercase text-center block">종료 프레임 (End)</label>
            <div className="relative group aspect-square rounded-xl overflow-hidden border-2 border-dashed border-gray-700 hover:border-purple-500/50 transition-all bg-gray-800/20">
              {endFrameImage ? (
                <>
                  <img src={endFrameImage.data} className="w-full h-full object-cover" />
                  <button onClick={() => setEndFrameImage(null)} className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full shadow-lg">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </>
              ) : (
                <button onClick={() => endFileInputRef.current?.click()} className="w-full h-full flex flex-col items-center justify-center text-gray-500 hover:text-purple-400 p-4 text-center">
                  <svg className="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4v16m8-8H4" /></svg>
                  <span className="text-[10px] font-bold">종료 이미지 업로드</span>
                </button>
              )}
              <input type="file" accept="image/*" className="hidden" ref={endFileInputRef} onChange={(e) => handleFileUpload(e, 'end')} />
            </div>
          </div>
        </div>
        
        {error && (
          <div className="mt-6 p-4 bg-red-900/20 border border-red-500/30 text-red-400 rounded-xl text-sm flex items-center gap-2 animate-bounce">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {error}
          </div>
        )}
      </section>

      {/* History Section */}
      <section>
        <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-2 font-serif">시네마틱 히스토리</h3>
        {history.length === 0 ? (
          <div className="py-20 bg-gray-900/20 border border-dashed border-gray-800 rounded-3xl text-center text-gray-600">
            <p className="font-medium">준비된 시네마틱이 없습니다. 창작을 시작해보세요.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {history.map((video) => (
              <div key={video.timestamp} className="group bg-gray-900 rounded-3xl overflow-hidden border border-gray-800 hover:border-indigo-500/30 transition-all shadow-2xl">
                <div className="relative">
                  <video src={video.url} controls className="w-full aspect-video bg-black object-contain" />
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a href={video.url} download={`weeklygen-video-${video.timestamp}.mp4`} className="p-3 bg-gray-950/80 backdrop-blur-md rounded-full text-white shadow-xl">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    </a>
                  </div>
                </div>
                <div className="p-6 border-t border-gray-800 bg-gray-900/50">
                  <p className="text-sm text-gray-300 font-medium italic leading-relaxed">"{video.prompt}"</p>
                  <div className="mt-4 flex justify-between items-center text-[10px] text-gray-600 font-bold uppercase tracking-widest">
                    <span>{new Date(video.timestamp).toLocaleString()}</span>
                    <span className="text-indigo-500">WeeklyGen Cinematic</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 4px; width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #374151; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #4b5563; }
      `}</style>
    </div>
  );
};

export default VideoGenerator;
