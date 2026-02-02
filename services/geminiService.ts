
import { GoogleGenAI, Modality } from "@google/genai";
import { AspectRatio, ImageSize } from "../types";

export interface ImageInput {
  data: string;
  mimeType: string;
}

/**
 * API 키의 유효성을 검사하고 GoogleGenAI 클라이언트를 생성합니다.
 * 시스템 기본값(Placeholder)이거나 빈 값인 경우 에러를 발생시켜 초기화를 차단합니다.
 */
const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  
  // 가짜 키(Placeholder) 또는 빈 값 체크
  const isInvalidKey = 
    !apiKey || 
    apiKey === "" || 
    apiKey.includes("UNUSED_PLACEHOLDER") || 
    apiKey === "undefined";

  if (isInvalidKey) {
    throw new Error("유효한 API 키가 선택되지 않았습니다. 하단의 'API 키 관리' 버튼을 클릭하여 유료 프로젝트의 키를 선택해주세요.");
  }
  
  // 호출 시점에 신규 인스턴스 생성 (최신 키 반영 보장)
  return new GoogleGenAI({ apiKey });
};

// Helper: Decode base64 to Uint8Array
function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Helper: Decode raw PCM to AudioBuffer
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const generateSpeech = async (
  text: string,
  voiceName: string
): Promise<string> => {
  const ai = getAIClient();
  
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voiceName },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("음성 데이터를 생성하지 못했습니다.");

  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  const audioBytes = decodeBase64(base64Audio);
  const audioBuffer = await decodeAudioData(audioBytes, audioContext, 24000, 1);
  
  return new Promise((resolve) => {
    const offlineCtx = new OfflineAudioContext(1, audioBuffer.length, 24000);
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineCtx.destination);
    source.start();
    
    offlineCtx.startRendering().then((renderedBuffer) => {
      const wav = audioBufferToWav(renderedBuffer);
      const blob = new Blob([wav], { type: 'audio/wav' });
      resolve(URL.createObjectURL(blob));
    });
  });
};

function audioBufferToWav(buffer: AudioBuffer) {
  const length = buffer.length * 2 + 44;
  const view = new DataView(new ArrayBuffer(length));
  const channels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  
  let offset = 0;
  const writeString = (s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
    offset += s.length;
  };

  writeString('RIFF');
  view.setUint32(offset, length - 8, true); offset += 4;
  writeString('WAVE');
  writeString('fmt ');
  view.setUint32(offset, 16, true); offset += 4;
  view.setUint16(offset, 1, true); offset += 2;
  view.setUint16(offset, channels, true); offset += 2;
  view.setUint32(offset, sampleRate, true); offset += 4;
  view.setUint32(offset, sampleRate * channels * 2, true); offset += 4;
  view.setUint16(offset, channels * 2, true); offset += 2;
  view.setUint16(offset, 16, true); offset += 2;
  writeString('data');
  view.setUint32(offset, length - offset - 4, true); offset += 4;

  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < channels; channel++) {
      let sample = buffer.getChannelData(channel)[i];
      sample = Math.max(-1, Math.min(1, sample));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
  }
  return view.buffer;
}

export const generateImage = async (
  prompt: string, 
  aspectRatio: AspectRatio, 
  imageSize: ImageSize = '1K',
  masterImages: ImageInput[] = [],
  backgroundImage?: ImageInput,
  baseImage?: ImageInput
): Promise<string> => {
  const ai = getAIClient();
  const parts: any[] = [];
  if (baseImage) {
    parts.push({ inlineData: { data: baseImage.data.split(',')[1], mimeType: baseImage.mimeType } });
    parts.push({ text: "This is the original base image to be modified." });
  }
  masterImages.forEach((img, idx) => {
    parts.push({ inlineData: { data: img.data.split(',')[1], mimeType: img.mimeType } });
    parts.push({ text: `Subject reference image ${idx + 1}` });
  });
  if (backgroundImage) {
    parts.push({ inlineData: { data: backgroundImage.data.split(',')[1], mimeType: backgroundImage.mimeType } });
    parts.push({ text: "This is the reference for the background and environment." });
  }
  let instruction = baseImage ? `Task: Edit base image. Instructions: ${prompt}` : `Task: Create image. Description: ${prompt}`;
  parts.push({ text: instruction });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: { parts: parts },
    config: { 
      imageConfig: { 
        aspectRatio: aspectRatio, 
        imageSize: imageSize 
      } 
    },
  });
  
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  }
  throw new Error("이미지 생성 오류");
};

export const generateVideo = async (
  prompt: string, 
  aspectRatio: '16:9' | '9:16', 
  onStatusUpdate: (status: string) => void,
  startImage?: ImageInput,
  endImage?: ImageInput
): Promise<string> => {
  const ai = getAIClient();
  onStatusUpdate("영상을 요청 중입니다...");
  const videoConfig: any = { numberOfVideos: 1, resolution: '720p', aspectRatio: aspectRatio };
  if (endImage) videoConfig.lastFrame = { imageBytes: endImage.data.split(',')[1], mimeType: endImage.mimeType };
  
  const payload: any = { 
    model: 'veo-3.1-fast-generate-preview', 
    prompt: prompt || "Cinematic transition", 
    config: videoConfig 
  };
  
  if (startImage) payload.image = { imageBytes: startImage.data.split(',')[1], mimeType: startImage.mimeType };
  
  let operation = await ai.models.generateVideos(payload);
  while (!operation.done) {
    onStatusUpdate("영상 렌더링 중...");
    await new Promise(resolve => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }
  
  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  const apiKey = process.env.API_KEY;
  const response = await fetch(`${downloadLink}&key=${apiKey}`);
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};
