/**
 * 音频系统类型定义
 */

// 音频管理器配置
export interface AudioConfig {
  useWebAudio: boolean;
  bgmVolume: number;
  sfxVolume: number;
  maxAudioInstances: number;
  audioContext?: AudioContext;
}

// BGM信息接口
export interface BgmInfo {
  id: number;
  name: string;
  src: string;
  duration?: number;
  artist?: string;
}

// 音效映射类型
export type SfxMap = Record<string, string>;

// 音效名称枚举
export enum SfxName {
  CLICK = 'click',
  SWAP = 'swap',
  MATCH = 'match',
  ERROR = 'error',
  FALL = 'fall',
  NOMOVE = 'nomove',
  CHAIN = 'chain',
  SPECIAL = 'special'
}

// 音频状态接口
export interface AudioState {
  bgmPlaying: boolean;
  sfxEnabled: boolean;
  currentBgmId: number;
  bgmVolume: number;
  sfxVolume: number;
  initialized: boolean;
}

// 音频管理器内部状态接口
export interface AudioManagerState {
  initialized: boolean;
  useWebAudio: boolean;
  isMobile: boolean;
  mobileAudioUnlocked: boolean;
  audioContext: AudioContext | null;
  bgmGainNode: GainNode | null;
  sfxGainNode: GainNode | null;
  bgmSource: AudioBufferSourceNode | null;
  bgmAudio: HTMLAudioElement | null;
  sfxAudioPool: Map<string, HTMLAudioElement[]>;
  audioBuffers: Map<string, AudioBuffer>;
  userInteracted: boolean;
  initializationPromise: Promise<void> | null;
}

// 音频管理器返回值接口
export interface AudioManagerReturn {
  audioManager: any; // 具体的音频管理器实例
  bgmPlaying: Ref<boolean>;
  sfxEnabled: Ref<boolean>;
  playNamedSfx: (name: string) => Promise<void>;
  playBgm: (src: string) => Promise<void>;
  toggleBgm: () => void;
  toggleSfx: () => void;
  activateAudioOnMobile: () => Promise<void>;
  testAllSfx: () => Promise<void>;
}

// 音频加载状态
export interface AudioLoadStatus {
  loaded: boolean;
  error?: string;
  duration?: number;
}

// CDN配置
export interface CdnConfig {
  name: string;
  baseUrl: string;
  priority: number;
  timeout: number;
}

// 导入Vue的Ref类型
import type { Ref } from 'vue';

