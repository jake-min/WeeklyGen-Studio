
export enum ViewType {
  IMAGE = 'image',
  VIDEO = 'video',
  SPEECH = 'speech'
}

export type AspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
export type ImageSize = '1K' | '2K' | '4K';

export interface GeneratedImage {
  url: string;
  prompt: string;
  aspectRatio: AspectRatio;
  size: ImageSize;
  timestamp: number;
}

export interface GeneratedVideo {
  url: string;
  prompt: string;
  timestamp: number;
}

export interface GeneratedSpeech {
  audioUrl: string;
  text: string;
  voice: string;
  timestamp: number;
}
