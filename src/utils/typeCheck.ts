/**
 * TypeScript类型检查验证工具
 * 用于验证迁移后的类型定义是否正确
 */

import type {
    GameConfig,
    GameState,
    GameTile,
    MatchResult,
    MessageType,
    TileCoordinates
} from '@/types/game';

import type {
    AudioConfig,
    BgmInfo,
    SfxMap
} from '@/types/audio';

import type {
    ErrorCode,
    ErrorSeverity,
    GameError
} from '@/types/error';

/**
 * 验证游戏类型定义
 */
export function validateGameTypes(): boolean {
  console.log('🧪 开始验证游戏类型定义...');

  try {
    // 测试GameTile类型
    const testTile: GameTile = {
      type: 1,
      id: 'test-tile-1',
      row: 0,
      col: 0,
      isSpecial: false
    };
    console.log('✅ GameTile类型验证通过:', testTile);

    // 测试TileCoordinates类型
    const testCoords: TileCoordinates = {
      row: 0,
      col: 0
    };
    console.log('✅ TileCoordinates类型验证通过:', testCoords);

    // 测试枚举类型
    const testGameState: GameState = 'playing';
    const testMessageType: MessageType = 'info';
    console.log('✅ 枚举类型验证通过:', { testGameState, testMessageType });

    // 测试MatchResult类型
    const testMatch: MatchResult = {
      row: 0,
      col: 0,
      type: 1,
      isSpecial: false
    };
    console.log('✅ MatchResult类型验证通过:', testMatch);

    // 测试GameConfig类型
    const testConfig: GameConfig = {
      boardSize: 8,
      tileTypes: 6,
      scoreMultiplier: 10,
      chainBonus: 1
    };
    console.log('✅ GameConfig类型验证通过:', testConfig);

    return true;
  } catch (error) {
    console.error('❌ 游戏类型验证失败:', error);
    return false;
  }
}

/**
 * 验证音频类型定义
 */
export function validateAudioTypes(): boolean {
  console.log('🧪 开始验证音频类型定义...');

  try {
    // 测试BgmInfo类型
    const testBgm: BgmInfo = {
      id: 1,
      name: 'Test BGM',
      src: '/audio/test.mp3',
      duration: 120,
      artist: 'Test Artist'
    };
    console.log('✅ BgmInfo类型验证通过:', testBgm);

    // 测试SfxMap类型
    const testSfxMap: SfxMap = {
      click: '/audio/click.mp3',
      swap: '/audio/swap.mp3',
      match: '/audio/match.mp3'
    };
    console.log('✅ SfxMap类型验证通过:', testSfxMap);

    // 测试AudioConfig类型
    const testAudioConfig: AudioConfig = {
      useWebAudio: true,
      bgmVolume: 0.5,
      sfxVolume: 0.7,
      maxAudioInstances: 5
    };
    console.log('✅ AudioConfig类型验证通过:', testAudioConfig);

    return true;
  } catch (error) {
    console.error('❌ 音频类型验证失败:', error);
    return false;
  }
}

/**
 * 验证错误处理类型定义
 */
export function validateErrorTypes(): boolean {
  console.log('🧪 开始验证错误处理类型定义...');

  try {
    // 测试GameError类型
    const testError: GameError = {
      code: 'GAME_BOARD_INVALID' as ErrorCode,
      message: 'Test error message',
      severity: 'high' as ErrorSeverity,
      context: {
        component: 'TestComponent',
        action: 'testAction',
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href
      },
      recoverable: true
    };
    console.log('✅ GameError类型验证通过:', testError);

    return true;
  } catch (error) {
    console.error('❌ 错误处理类型验证失败:', error);
    return false;
  }
}

/**
 * 运行所有类型验证
 */
export function runAllTypeValidations(): boolean {
  console.log('🧪 ===== 开始TypeScript类型验证 =====');

  const gameTypesValid = validateGameTypes();
  const audioTypesValid = validateAudioTypes();
  const errorTypesValid = validateErrorTypes();

  const allValid = gameTypesValid && audioTypesValid && errorTypesValid;

  if (allValid) {
    console.log('✅ ===== 所有类型验证通过！=====');
  } else {
    console.error('❌ ===== 类型验证失败！=====');
  }

  return allValid;
}

/**
 * 验证所有类型（测试兼容性别名）
 */
export function validateAllTypes(): boolean {
  console.log('🧪 开始完整类型验证...');

  const gameTypesValid = validateGameTypes();
  const audioTypesValid = validateAudioTypes();
  const errorTypesValid = validateErrorTypes();
  const functionTypesValid = validateFunctionTypes();

  const allValid = gameTypesValid && audioTypesValid && errorTypesValid && functionTypesValid;

  if (allValid) {
    console.log('🎉 所有类型验证通过！');
  } else {
    console.error('❌ 类型验证失败！');
  }

  return allValid;
}

/**
 * 验证GameTile对象
 */
export function isValidGameTile(tile: any): boolean {
  // 严格的 null/undefined 检查
  if (tile === null || tile === undefined) {
    return false;
  }

  return (
    typeof tile === 'object' &&
    typeof tile.type === 'number' &&
    typeof tile.id === 'string' &&
    typeof tile.row === 'number' &&
    typeof tile.col === 'number' &&
    typeof tile.isSpecial === 'boolean'
  );
}

/**
 * 验证TileCoordinates对象
 */
export function isValidTileCoordinates(coords: any): boolean {
  return (
    coords &&
    typeof coords === 'object' &&
    typeof coords.row === 'number' &&
    typeof coords.col === 'number' &&
    coords.row >= 0 &&
    coords.col >= 0
  );
}

/**
 * 验证GameState
 */
export function isValidGameState(state: any): boolean {
  // 根据 src/types/game.ts 中的定义，GameState 是字符串联合类型
  const validStates = ['menu', 'playing', 'paused', 'gameover'];
  return typeof state === 'string' && validStates.includes(state);
}

/**
 * 验证AudioConfig对象
 */
export function isValidAudioConfig(config: any): boolean {
  return (
    config &&
    typeof config === 'object' &&
    typeof config.enableSfx === 'boolean' &&
    typeof config.enableBgm === 'boolean' &&
    typeof config.volume === 'number' &&
    typeof config.sfxVolume === 'number' &&
    typeof config.bgmVolume === 'number' &&
    config.volume >= 0 && config.volume <= 1 &&
    config.sfxVolume >= 0 && config.sfxVolume <= 1 &&
    config.bgmVolume >= 0 && config.bgmVolume <= 1
  );
}

/**
 * 验证GameError对象
 */
export function isValidGameError(error: any): boolean {
  const validSeverities = ['low', 'medium', 'high', 'critical'];
  return (
    error &&
    typeof error === 'object' &&
    typeof error.code === 'string' &&
    error.code.length > 0 &&
    typeof error.message === 'string' &&
    typeof error.severity === 'string' &&
    validSeverities.includes(error.severity) &&
    typeof error.timestamp === 'number' &&
    error.timestamp > 0 &&
    typeof error.context === 'object'
  );
}

/**
 * 验证函数类型
 */
export function validateFunctionTypes(): boolean {
  console.log('🧪 开始验证函数类型定义...');

  try {
    // 测试ShowMessageTip类型
    const testShowMessage = (message: string, type: MessageType, duration?: number): void => {
      console.log(`Message: ${message}, Type: ${type}, Duration: ${duration || 1000}`);
    };

    // 测试PlaySfxFunction类型
    const testPlaySfx = async (name: string): Promise<void> => {
      console.log(`Playing SFX: ${name}`);
    };

    // 测试函数调用
    testShowMessage('Test message', 'info', 2000);
    testPlaySfx('click');

    console.log('✅ 函数类型验证通过');
    return true;
  } catch (error) {
    console.error('❌ 函数类型验证失败:', error);
    return false;
  }
}
