/**
 * 游戏核心类型定义
 */

// 游戏状态类型
export type GameState = 'menu' | 'playing' | 'paused' | 'gameover';

// 消息类型
export type MessageType = 'info' | 'error' | 'success' | 'chain';

// 方块坐标接口
export interface TileCoordinates {
  row: number;
  col: number;
}

// 游戏方块接口
export interface GameTile {
  type: number;
  id: string;
  row: number;
  col: number;
  isSpecial?: boolean;
  specialType?: SpecialTileType;
}

// 特殊方块类型枚举
export enum SpecialTileType {
  BOMB = 'bomb',
  RAINBOW = 'rainbow',
  ROCKET = 'rocket',
  STAR = 'star'
}

// 匹配结果接口
export interface MatchResult {
  row: number;
  col: number;
  type: number;
  isSpecial?: boolean;
}

// 粒子效果接口
export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

// 游戏配置接口
export interface GameConfig {
  boardSize: number;
  tileTypes: number;
  scoreMultiplier: number;
  chainBonus: number;
}

// 游戏统计接口
export interface GameStats {
  score: number;
  movesUsed: number;
  gameTime: number;
  chainCount: number;
  maxChain: number;
  tilesCleared: number;
}

// 函数类型定义
export type ShowMessageTip = (message: string, type: MessageType, duration?: number) => void;
export type PlaySfxFunction = (name: string) => Promise<void>;
export type TileClickHandler = (coords: TileCoordinates, showTip: ShowMessageTip) => Promise<void>;

// CSS样式类型
export interface BoardStyle {
  gridTemplateColumns: string;
  gridTemplateRows: string;
  width?: string;
  height?: string;
}

// 选择状态接口
export interface SelectionState {
  isSelecting: boolean;
  canSelect: boolean;
  selectedTile: TileCoordinates | null;
  highlightedTiles: Set<string>;
}
