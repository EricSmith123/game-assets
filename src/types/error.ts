/**
 * 错误处理和日志系统类型定义
 */

// 错误严重级别
export const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
} as const;

export type ErrorSeverity = typeof ErrorSeverity[keyof typeof ErrorSeverity];

// 错误代码枚举
export const ErrorCode = {
  // 音频相关
  AUDIO_INIT_FAILED: 'AUDIO_INIT_FAILED',
  AUDIO_SFX_FAILED: 'AUDIO_SFX_FAILED',
  AUDIO_BGM_FAILED: 'AUDIO_BGM_FAILED',
  AUDIO_CONTEXT_SUSPENDED: 'AUDIO_CONTEXT_SUSPENDED',

  // 游戏逻辑相关
  GAME_BOARD_INVALID: 'GAME_BOARD_INVALID',
  GAME_STATE_CORRUPTED: 'GAME_STATE_CORRUPTED',
  TILE_COORDINATES_INVALID: 'TILE_COORDINATES_INVALID',
  MATCH_DETECTION_FAILED: 'MATCH_DETECTION_FAILED',

  // 网络相关
  RESOURCE_LOAD_FAILED: 'RESOURCE_LOAD_FAILED',
  CDN_UNAVAILABLE: 'CDN_UNAVAILABLE',
  NETWORK_ERROR: 'NETWORK_ERROR',

  // 组件相关
  COMPONENT_ERROR: 'COMPONENT_ERROR',
  RENDER_ERROR: 'RENDER_ERROR',
  PROPS_VALIDATION_ERROR: 'PROPS_VALIDATION_ERROR',

  // 存储相关
  LOCAL_STORAGE_ERROR: 'LOCAL_STORAGE_ERROR',
  DATA_CORRUPTION: 'DATA_CORRUPTION',

  // 通用错误
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  INITIALIZATION_ERROR: 'INITIALIZATION_ERROR'
} as const;

export type ErrorCode = typeof ErrorCode[keyof typeof ErrorCode];

// 日志级别
export const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
} as const;

export type LogLevel = typeof LogLevel[keyof typeof LogLevel];

// 错误上下文接口
export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  sessionId?: string;
  timestamp: number;
  userAgent: string;
  url: string;
  viewport?: {
    width: number;
    height: number;
  };
  gameState?: string;
  additionalData?: Record<string, any>;
}

// 游戏错误接口
export interface GameError {
  code: ErrorCode;
  message: string;
  severity: ErrorSeverity;
  context: ErrorContext;
  originalError?: Error;
  stack?: string;
  recoverable: boolean;
}

// 日志条目接口
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  component?: string;
  data?: any;
  correlationId?: string;
}

// 错误处理策略接口
export interface ErrorStrategy {
  severity: ErrorSeverity;
  userMessage: string;
  recovery?: () => void | Promise<void>;
  shouldReport: boolean;
  shouldNotifyUser: boolean;
  retryable: boolean;
  maxRetries?: number;
}

// 错误报告接口
export interface ErrorReport {
  errorCode: string;
  message: string;
  stack?: string;
  context: ErrorContext;
  logs: LogEntry[];
  userAgent: string;
  timestamp: number;
  buildVersion?: string;
  environment: 'development' | 'production';
}

// 性能指标接口
export interface PerformanceMetrics {
  gameInitTime: number;
  averageFrameTime: number;
  memoryUsage: number;
  audioLatency: number;
  errorCount: number;
  crashCount: number;
  userInteractions: number;
}

// 错误处理配置接口
export interface ErrorConfig {
  enableConsoleOutput: boolean;
  enableErrorReporting: boolean;
  enableDetailedLogs: boolean;
  maxLogEntries: number;
  reportingEndpoint?: string;
  enablePerformanceMonitoring: boolean;
  enableUserFeedback: boolean;
}
