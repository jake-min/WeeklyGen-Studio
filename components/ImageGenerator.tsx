
import React, { useState, useRef } from 'react';
import { AspectRatio, ImageSize, GeneratedImage } from '../types';
import { generateImage, ImageInput } from '../services/geminiService';

interface ImageGeneratorProps {
  history: GeneratedImage[];
  setHistory: React.Dispatch<React.SetStateAction<GeneratedImage[]>>;
  onApiError?: (error: any) => void;
}

const ImageGenerator: React.FC<ImageGeneratorProps> = ({ history, setHistory, onApiError }) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [imageSize, setImageSize] = useState<ImageSize>('1K');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [masterImages, setMasterImages] = useState<ImageInput[]>([]);
  const [backgroundImage, setBackgroundImage] = useState<ImageInput | null>(null);
  const [baseImage, setBaseImage] = useState<ImageInput | null>(null);

  const masterInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const baseInputRef = useRef<HTMLInputElement>(null);

  const ratios: AspectRatio[] = ['1:1', '3:4', '4:3', '9:16', '16:9'];
  const sizes: ImageSize[] = ['1K', '2K', '4K'];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'master' | 'background' | 'base') => {
    const files = e.target.files;
    if (!files) return;

    const newImages: ImageInput[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      const promise = new Promise<ImageInput>((resolve) => {
        reader.onload = (e) => {
          resolve({
            data: e.target?.result as string,
            mimeType: file.type
          });
        };
      });
      reader.readAsDataURL(file);
      newImages.push(await promise);
    }

    if (type === 'master') {
      setMasterImages(prev => [...prev, ...newImages]);
    } else if (type === 'background') {
      setBackgroundImage(newImages[0] || null);
    } else if (type === 'base') {
      setBaseImage(newImages[0] || null);
    }
    
    e.target.value = '';
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && !baseImage && masterImages.length === 0 && !backgroundImage) return;
    setIsGenerating(true);
    setError(null);

    try {
      const imageUrl = await generateImage(
        prompt || (baseImage ? "Keep the base image but refine it." : "Create a high quality image."), 
        aspectRatio, 
        imageSize,
        masterImages, 
        backgroundImage || undefined,
        baseImage || undefined
      );
      const newImage: GeneratedImage = {
        url: imageUrl,
        prompt: prompt || (baseImage ? "수정된 이미지" : "생성된 이미지"),
        aspectRatio: aspectRatio,
        size: imageSize,
        timestamp: Date.now()
      };
      setHistory(prev => [newImage, ...prev]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || '처리 중 오류가 발생했습니다.');
      if (onApiError) onApiError(err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2 font-serif">이미지 스튜디오</h2>
          <p className="text-gray-400">새로운 이미지를 만들거나, 기존 이미지를 AI로 정교하게 수정하세요.</p>
        </div>
        <div className="hidden sm:block">
           <span className={`px-3 py-1 rounded-full text-xs font-bold border ${baseImage ? 'border-amber-500 text-amber-500 bg-amber-500/10' : 'border-indigo-500 text-indigo-500 bg-indigo-500/10'}`}>
             {baseImage ? '모드: 이미지 수정' : '모드: 신규 생성'}
           </span>
        </div>
      </header>

      <section className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 shadow-xl space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center">
                <span className="text-amber-500 text-xs font-bold">1</span>
              </div>
              <label className="text-sm font-semibold text-gray-200">수정할 이미지 (Base)</label>
            </div>
            <div className="relative group aspect-square rounded-xl overflow-hidden border-2 border-dashed border-gray-700 hover:border-amber-500/50 transition-all bg-gray-800/20">
              {baseImage ? (
                <>
                  <img src={baseImage.data} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button onClick={() => baseInputRef.current?.click()} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white backdrop-blur-sm">변경</button>
                    <button onClick={() => setBaseImage(null)} className="p-2 bg-red-500/20 hover:bg-red-500/40 rounded-lg text-red-400 backdrop-blur-sm">삭제</button>
                  </div>
                </>
              ) : (
                <button 
                  onClick={() => baseInputRef.current?.click()}
                  className="w-full h-full flex flex-col items-center justify-center text-gray-500 hover:text-amber-400 transition-colors p-4 text-center"
                >
                  <svg className="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  <span className="text-xs font-bold leading-relaxed">수정할 원본 이미지를<br/>업로드하세요</span>
                </button>
              )}
              <input type="file" accept="image/*" className="hidden" ref={baseInputRef} onChange={(e) => handleFileChange(e, 'base')} />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center">
                <span className="text-indigo-500 text-xs font-bold">2</span>
              </div>
              <label className="text-sm font-semibold text-gray-200">마스터 이미지 (Subjects)</label>
            </div>
            <div className="grid grid-cols-3 gap-2 h-full max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
              {masterImages.map((img, idx) => (
                <div key={idx} className="relative aspect-square group">
                  <img src={img.data} className="w-full h-full object-cover rounded-lg border border-gray-800" />
                  <button 
                    onClick={() => setMasterImages(prev => prev.filter((_, i) => i !== idx))}
                    className="absolute -top-1 -right-1 bg-red-600 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
              <button onClick={() => masterInputRef.current?.click()} className="aspect-square rounded-lg border-2 border-dashed border-gray-700 hover:border-indigo-500 flex flex-col items-center justify-center text-gray-500 hover:text-indigo-400 transition-all bg-gray-800/30">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              </button>
              <input type="file" multiple accept="image/*" className="hidden" ref={masterInputRef} onChange={(e) => handleFileChange(e, 'master')} />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center">
                <span className="text-purple-500 text-xs font-bold">3</span>
              </div>
              <label className="text-sm font-semibold text-gray-200">배경 스타일 (Background)</label>
            </div>
            <div className="relative group aspect-square rounded-xl overflow-hidden border-2 border-dashed border-gray-700 hover:border-purple-500/50 transition-all bg-gray-800/20 max-h-[160px]">
              {backgroundImage ? (
                <>
                  <img src={backgroundImage.data} className="w-full h-full object-cover" />
                  <button onClick={() => setBackgroundImage(null)} className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </>
              ) : (
                <button onClick={() => backgroundInputRef.current?.click()} className="w-full h-full flex flex-col items-center justify-center text-gray-500 hover:text-purple-400 transition-colors p-4 text-center">
                  <svg className="w-6 h-6 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <span className="text-xs font-bold">배경 참고용</span>
                </button>
              )}
              <input type="file" accept="image/*" className="hidden" ref={backgroundInputRef} onChange={(e) => handleFileChange(e, 'background')} />
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-gray-800">
          <label className="block text-sm font-medium text-gray-400">명령어 입력</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={baseImage ? "수정할 내용을 상세히 입력하세요..." : "이미지 생성 조건을 입력하세요..."}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl p-4 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none h-24 transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-8">
          <div className="flex gap-10">
            <div className="flex flex-col gap-3">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">결과물 비율</label>
              <div className="flex flex-wrap gap-2">
                {ratios.map((r) => (
                  <button
                    key={r}
                    onClick={() => setAspectRatio(r)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${aspectRatio === r ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-800 text-gray-500'}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">해상도</label>
              <div className="flex flex-wrap gap-2">
                {sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setImageSize(s)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${imageSize === s ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-800 text-gray-500'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <button
            onClick={handleGenerate}
            disabled={isGenerating || (!prompt.trim() && !baseImage && masterImages.length === 0)}
            className={`px-10 py-4 rounded-2xl font-black flex items-center gap-3 transition-all ${isGenerating ? 'bg-gray-800 text-gray-500' : baseImage ? 'bg-amber-500 text-black' : 'bg-indigo-600 text-white'}`}
          >
            {isGenerating ? '생성 중...' : baseImage ? '이미지 수정하기' : '이미지 생성하기'}
          </button>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">히스토리</h3>
          <button onClick={() => setHistory([])} className="text-xs text-gray-500 uppercase font-bold">전체 삭제</button>
        </div>
        
        {history.length === 0 ? (
          <div className="py-20 bg-gray-900/30 border border-dashed border-gray-800 rounded-2xl text-center text-gray-500">
            <p className="font-medium">준비된 이미지가 없습니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {history.map((img) => (
              <div key={img.timestamp} className="group relative bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 transition-all shadow-lg">
                <div className={`aspect-[${img.aspectRatio.replace(':', '/')}] overflow-hidden bg-gray-950 flex items-center justify-center`}>
                  <img src={img.url} alt={img.prompt} className="max-w-full max-h-full object-contain" />
                </div>
                <div className="p-5 border-t border-gray-800 bg-gray-900/80">
                  <p className="text-sm text-gray-300 line-clamp-2 italic">"{img.prompt}"</p>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] text-gray-500 font-bold">{img.aspectRatio}</span>
                       <span className="text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded font-bold">{img.size}</span>
                    </div>
                    <div className="flex gap-2">
                       <button 
                        onClick={() => {
                          setBaseImage({ data: img.url, mimeType: 'image/png' });
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="p-2 bg-gray-800 hover:bg-amber-500/20 text-gray-400 hover:text-amber-500 rounded-lg"
                        title="이 이미지 수정"
                       >
                         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                       </button>
                      <a href={img.url} download={`weeklygen-${img.timestamp}.png`} className="p-2 bg-gray-800 text-gray-300 rounded-lg">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default ImageGenerator;
