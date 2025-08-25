/**
 * Vue组件Props和Emits类型定义
 */

import type { GameState, GameTile, Particle, TileCoordinates } from './game';

// GameBoard组件Props
export interface GameBoardProps {
  flatBoard: GameTile[];
  boardStyle: Record<string, string>;
  selectedTile?: TileCoordinates;
  matchedTiles: Set<string>;
  shakingTile?: TileCoordinates;
  particles: Particle[];
  showChainEffect: boolean;
  chainCount: number;
  cdnUrl?: string;
}

// GameBoard组件Emits
export interface GameBoardEmits {
  (e: 'tile-click', tile: GameTile): void;
  (e: 'outside-click'): void;
}

// GameModals组件Props
export interface GameModalsProps {
  gameState: GameState;
  score: number;
  movesUsed: number;
  formattedTime: string;
}

// GameModals组件Emits
export interface GameModalsEmits {
  (e: 'start-game'): void;
  (e: 'restart-game'): void;
  (e: 'resume-game'): void;
  (e: 'back-to-menu'): void;
}

// SettingsPanel组件Props
export interface SettingsPanelProps {
  modelValue: boolean;
  bgmVolume: number;
  sfxVolume: number;
}

// SettingsPanel组件Emits
export interface SettingsPanelEmits {
  (e: 'update:modelValue', value: boolean): void;
  (e: 'update:bgmVolume', value: number): void;
  (e: 'update:sfxVolume', value: number): void;
  (e: 'reset'): void;
  (e: 'close'): void;
  (e: 'test-sfx'): void;
}

// ErrorToast组件Props
export interface ErrorToastProps {
  visible: boolean;
  message: string;
  details?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  canRetry?: boolean;
  canReport?: boolean;
  showDetails?: boolean;
  autoClose?: boolean;
  duration?: number;
}

// ErrorToast组件Emits
export interface ErrorToastEmits {
  (e: 'dismiss'): void;
  (e: 'retry'): void;
  (e: 'report'): void;
  (e: 'close'): void;
}

// ErrorBoundary组件Props
export interface ErrorBoundaryProps {
  fallbackComponent?: any;
  onError?: (error: Error, instance: any, info: string) => void;
  hasError?: boolean;
  userMessage?: string;
  errorCode?: string;
  errorTime?: string;
  errorComponent?: string;
  errorStack?: string;
}

// LoadingOverlay组件Props
export interface LoadingOverlayProps {
  visible: boolean;
  progress: number;
  message?: string;
  canSkip?: boolean;
  canForceEnter?: boolean;
}

// LoadingOverlay组件Emits
export interface LoadingOverlayEmits {
  (e: 'skip'): void;
  (e: 'force-enter'): void;
}

// 通用Modal组件Props
export interface ModalProps {
  visible: boolean;
  title?: string;
  closable?: boolean;
  maskClosable?: boolean;
  width?: string | number;
  zIndex?: number;
}

// 通用Modal组件Emits
export interface ModalEmits {
  (e: 'update:visible', value: boolean): void;
  (e: 'close'): void;
  (e: 'open'): void;
}
