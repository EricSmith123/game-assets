/**
 * 动态匹配检测器
 * 支持可配置游戏板的匹配检测，适应不同尺寸和规则
 */

import { Logger } from './logger';
import { environmentGuard } from './environmentGuard';
import type { GameTile } from '@/types/game';
import type { BoardConfig } from './configurableGameBoard';

// 匹配结果接口
export interface MatchResult {
  tiles: GameTile[];
  type: 'horizontal' | 'vertical' | 'diagonal' | 'L-shape' | 'T-shape' | 'cross';
  length: number;
  startPosition: { row: number; col: number };
  endPosition: { row: number; col: number };
  score: number;
}

// 匹配检测配置
export interface MatchDetectionConfig {
  minMatchLength: number;
  maxMatchLength?: number;
  allowDiagonalMatches: boolean;
  allowSpecialShapes: boolean;
  enableScoring: boolean;
}

export class DynamicMatchDetector {
  private logger: Logger;
  private config: MatchDetectionConfig;

  constructor(config?: Partial<MatchDetectionConfig>) {
    this.logger = Logger.getInstance();
    this.config = {
      minMatchLength: config?.minMatchLength || 3,
      maxMatchLength: config?.maxMatchLength || 8,
      allowDiagonalMatches: config?.allowDiagonalMatches || false,
      allowSpecialShapes: config?.allowSpecialShapes || true,
      enableScoring: config?.enableScoring || true
    };

    environmentGuard.runInDevelopment(() => {
      this.logger.debug('动态匹配检测器已创建', this.config, 'DynamicMatchDetector');
    });
  }

  /**
   * 检测所有匹配
   */
  detectAllMatches(board: GameTile[][], boardConfig: BoardConfig): MatchResult[] {
    const matches: MatchResult[] = [];
    const { width, height } = boardConfig;

    // 检测基础匹配（水平和垂直）
    matches.push(...this.detectBasicMatches(board, width, height));

    // 检测对角线匹配（如果启用）
    if (this.config.allowDiagonalMatches) {
      matches.push(...this.detectDiagonalMatches(board, width, height));
    }

    // 检测特殊形状匹配（如果启用）
    if (this.config.allowSpecialShapes) {
      matches.push(...this.detectSpecialShapeMatches(board, width, height));
    }

    // 去重和合并重叠的匹配
    const uniqueMatches = this.deduplicateMatches(matches);

    // 计算分数（如果启用）
    if (this.config.enableScoring) {
      uniqueMatches.forEach(match => {
        match.score = this.calculateMatchScore(match);
      });
    }

    environmentGuard.runInDevelopment(() => {
      if (uniqueMatches.length > 0) {
        this.logger.debug(`检测到 ${uniqueMatches.length} 个匹配`, 
          uniqueMatches.map(m => ({ type: m.type, length: m.length, score: m.score })), 
          'DynamicMatchDetector');
      }
    });

    return uniqueMatches;
  }

  /**
   * 检测基础匹配（水平和垂直）
   */
  private detectBasicMatches(board: GameTile[][], width: number, height: number): MatchResult[] {
    const matches: MatchResult[] = [];

    // 检测水平匹配
    for (let row = 0; row < height; row++) {
      for (let col = 0; col <= width - this.config.minMatchLength; col++) {
        const match = this.detectHorizontalMatch(board, row, col, width);
        if (match) {
          matches.push(match);
        }
      }
    }

    // 检测垂直匹配
    for (let col = 0; col < width; col++) {
      for (let row = 0; row <= height - this.config.minMatchLength; row++) {
        const match = this.detectVerticalMatch(board, row, col, height);
        if (match) {
          matches.push(match);
        }
      }
    }

    return matches;
  }

  /**
   * 检测水平匹配
   */
  private detectHorizontalMatch(board: GameTile[][], row: number, startCol: number, width: number): MatchResult | null {
    const startTile = board[row][startCol];
    if (!startTile || startTile.matched) return null;

    const matchTiles: GameTile[] = [startTile];
    let col = startCol + 1;

    // 向右扩展匹配
    while (col < width && board[row][col] && 
           board[row][col].type === startTile.type && 
           !board[row][col].matched) {
      matchTiles.push(board[row][col]);
      col++;
    }

    // 检查是否达到最小匹配长度
    if (matchTiles.length >= this.config.minMatchLength) {
      return {
        tiles: matchTiles,
        type: 'horizontal',
        length: matchTiles.length,
        startPosition: { row, col: startCol },
        endPosition: { row, col: col - 1 },
        score: 0 // 将在后续计算
      };
    }

    return null;
  }

  /**
   * 检测垂直匹配
   */
  private detectVerticalMatch(board: GameTile[][], startRow: number, col: number, height: number): MatchResult | null {
    const startTile = board[startRow][col];
    if (!startTile || startTile.matched) return null;

    const matchTiles: GameTile[] = [startTile];
    let row = startRow + 1;

    // 向下扩展匹配
    while (row < height && board[row][col] && 
           board[row][col].type === startTile.type && 
           !board[row][col].matched) {
      matchTiles.push(board[row][col]);
      row++;
    }

    // 检查是否达到最小匹配长度
    if (matchTiles.length >= this.config.minMatchLength) {
      return {
        tiles: matchTiles,
        type: 'vertical',
        length: matchTiles.length,
        startPosition: { row: startRow, col },
        endPosition: { row: row - 1, col },
        score: 0 // 将在后续计算
      };
    }

    return null;
  }

  /**
   * 检测对角线匹配
   */
  private detectDiagonalMatches(board: GameTile[][], width: number, height: number): MatchResult[] {
    const matches: MatchResult[] = [];

    // 检测主对角线匹配（左上到右下）
    for (let row = 0; row <= height - this.config.minMatchLength; row++) {
      for (let col = 0; col <= width - this.config.minMatchLength; col++) {
        const match = this.detectMainDiagonalMatch(board, row, col, width, height);
        if (match) {
          matches.push(match);
        }
      }
    }

    // 检测副对角线匹配（右上到左下）
    for (let row = 0; row <= height - this.config.minMatchLength; row++) {
      for (let col = this.config.minMatchLength - 1; col < width; col++) {
        const match = this.detectAntiDiagonalMatch(board, row, col, width, height);
        if (match) {
          matches.push(match);
        }
      }
    }

    return matches;
  }

  /**
   * 检测主对角线匹配
   */
  private detectMainDiagonalMatch(board: GameTile[][], startRow: number, startCol: number, width: number, height: number): MatchResult | null {
    const startTile = board[startRow][startCol];
    if (!startTile || startTile.matched) return null;

    const matchTiles: GameTile[] = [startTile];
    let row = startRow + 1;
    let col = startCol + 1;

    // 向右下扩展匹配
    while (row < height && col < width && board[row][col] && 
           board[row][col].type === startTile.type && 
           !board[row][col].matched) {
      matchTiles.push(board[row][col]);
      row++;
      col++;
    }

    // 检查是否达到最小匹配长度
    if (matchTiles.length >= this.config.minMatchLength) {
      return {
        tiles: matchTiles,
        type: 'diagonal',
        length: matchTiles.length,
        startPosition: { row: startRow, col: startCol },
        endPosition: { row: row - 1, col: col - 1 },
        score: 0 // 将在后续计算
      };
    }

    return null;
  }

  /**
   * 检测副对角线匹配
   */
  private detectAntiDiagonalMatch(board: GameTile[][], startRow: number, startCol: number, width: number, height: number): MatchResult | null {
    const startTile = board[startRow][startCol];
    if (!startTile || startTile.matched) return null;

    const matchTiles: GameTile[] = [startTile];
    let row = startRow + 1;
    let col = startCol - 1;

    // 向左下扩展匹配
    while (row < height && col >= 0 && board[row][col] && 
           board[row][col].type === startTile.type && 
           !board[row][col].matched) {
      matchTiles.push(board[row][col]);
      row++;
      col--;
    }

    // 检查是否达到最小匹配长度
    if (matchTiles.length >= this.config.minMatchLength) {
      return {
        tiles: matchTiles,
        type: 'diagonal',
        length: matchTiles.length,
        startPosition: { row: startRow, col: startCol },
        endPosition: { row: row - 1, col: col + 1 },
        score: 0 // 将在后续计算
      };
    }

    return null;
  }

  /**
   * 检测特殊形状匹配（L型、T型、十字型）
   */
  private detectSpecialShapeMatches(board: GameTile[][], width: number, height: number): MatchResult[] {
    const matches: MatchResult[] = [];

    for (let row = 1; row < height - 1; row++) {
      for (let col = 1; col < width - 1; col++) {
        const centerTile = board[row][col];
        if (!centerTile || centerTile.matched) continue;

        // 检测T型匹配
        const tMatch = this.detectTShapeMatch(board, row, col, width, height);
        if (tMatch) {
          matches.push(tMatch);
        }

        // 检测十字型匹配
        const crossMatch = this.detectCrossMatch(board, row, col, width, height);
        if (crossMatch) {
          matches.push(crossMatch);
        }

        // 检测L型匹配
        const lMatches = this.detectLShapeMatches(board, row, col, width, height);
        matches.push(...lMatches);
      }
    }

    return matches;
  }

  /**
   * 检测T型匹配
   */
  private detectTShapeMatch(board: GameTile[][], centerRow: number, centerCol: number, width: number, height: number): MatchResult | null {
    const centerTile = board[centerRow][centerCol];
    if (!centerTile || centerTile.matched) return null;

    // 检查四个方向的T型
    const directions = [
      { horizontal: [-1, 0, 1], vertical: [1] }, // 上T
      { horizontal: [-1, 0, 1], vertical: [-1] }, // 下T
      { horizontal: [1], vertical: [-1, 0, 1] }, // 左T
      { horizontal: [-1], vertical: [-1, 0, 1] } // 右T
    ];

    for (const direction of directions) {
      const matchTiles: GameTile[] = [centerTile];
      let isValidMatch = true;

      // 检查水平方向
      for (const offset of direction.horizontal) {
        const col = centerCol + offset;
        if (col >= 0 && col < width && board[centerRow][col] && 
            board[centerRow][col].type === centerTile.type && 
            !board[centerRow][col].matched) {
          if (offset !== 0) matchTiles.push(board[centerRow][col]);
        } else if (offset !== 0) {
          isValidMatch = false;
          break;
        }
      }

      // 检查垂直方向
      if (isValidMatch) {
        for (const offset of direction.vertical) {
          const row = centerRow + offset;
          if (row >= 0 && row < height && board[row][centerCol] && 
              board[row][centerCol].type === centerTile.type && 
              !board[row][centerCol].matched) {
            if (offset !== 0) matchTiles.push(board[row][centerCol]);
          } else if (offset !== 0) {
            isValidMatch = false;
            break;
          }
        }
      }

      if (isValidMatch && matchTiles.length >= this.config.minMatchLength) {
        return {
          tiles: matchTiles,
          type: 'T-shape',
          length: matchTiles.length,
          startPosition: { row: centerRow, col: centerCol },
          endPosition: { row: centerRow, col: centerCol },
          score: 0 // 将在后续计算
        };
      }
    }

    return null;
  }

  /**
   * 检测十字型匹配
   */
  private detectCrossMatch(board: GameTile[][], centerRow: number, centerCol: number, width: number, height: number): MatchResult | null {
    const centerTile = board[centerRow][centerCol];
    if (!centerTile || centerTile.matched) return null;

    const matchTiles: GameTile[] = [centerTile];
    const directions = [
      { row: -1, col: 0 }, // 上
      { row: 1, col: 0 },  // 下
      { row: 0, col: -1 }, // 左
      { row: 0, col: 1 }   // 右
    ];

    for (const dir of directions) {
      const row = centerRow + dir.row;
      const col = centerCol + dir.col;

      if (row >= 0 && row < height && col >= 0 && col < width && 
          board[row][col] && board[row][col].type === centerTile.type && 
          !board[row][col].matched) {
        matchTiles.push(board[row][col]);
      } else {
        return null; // 十字型需要所有四个方向都有匹配
      }
    }

    if (matchTiles.length >= this.config.minMatchLength) {
      return {
        tiles: matchTiles,
        type: 'cross',
        length: matchTiles.length,
        startPosition: { row: centerRow, col: centerCol },
        endPosition: { row: centerRow, col: centerCol },
        score: 0 // 将在后续计算
      };
    }

    return null;
  }

  /**
   * 检测L型匹配
   */
  private detectLShapeMatches(board: GameTile[][], centerRow: number, centerCol: number, width: number, height: number): MatchResult[] {
    const matches: MatchResult[] = [];
    const centerTile = board[centerRow][centerCol];
    if (!centerTile || centerTile.matched) return matches;

    // 四种L型方向
    const lShapes = [
      [{ row: 0, col: 0 }, { row: -1, col: 0 }, { row: 0, col: 1 }], // ┐
      [{ row: 0, col: 0 }, { row: -1, col: 0 }, { row: 0, col: -1 }], // ┌
      [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 0, col: 1 }], // ┘
      [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 0, col: -1 }]  // └
    ];

    for (const shape of lShapes) {
      const matchTiles: GameTile[] = [];
      let isValidMatch = true;

      for (const offset of shape) {
        const row = centerRow + offset.row;
        const col = centerCol + offset.col;

        if (row >= 0 && row < height && col >= 0 && col < width && 
            board[row][col] && board[row][col].type === centerTile.type && 
            !board[row][col].matched) {
          matchTiles.push(board[row][col]);
        } else {
          isValidMatch = false;
          break;
        }
      }

      if (isValidMatch && matchTiles.length >= this.config.minMatchLength) {
        matches.push({
          tiles: matchTiles,
          type: 'L-shape',
          length: matchTiles.length,
          startPosition: { row: centerRow, col: centerCol },
          endPosition: { row: centerRow, col: centerCol },
          score: 0 // 将在后续计算
        });
      }
    }

    return matches;
  }

  /**
   * 去重和合并重叠的匹配
   */
  private deduplicateMatches(matches: MatchResult[]): MatchResult[] {
    const uniqueMatches: MatchResult[] = [];
    const processedTiles = new Set<string>();

    // 按分数和长度排序，优先保留更好的匹配
    matches.sort((a, b) => {
      if (a.length !== b.length) return b.length - a.length;
      return b.score - a.score;
    });

    for (const match of matches) {
      const tileKeys = match.tiles.map(tile => `${tile.x}-${tile.y}`);
      const hasOverlap = tileKeys.some(key => processedTiles.has(key));

      if (!hasOverlap) {
        uniqueMatches.push(match);
        tileKeys.forEach(key => processedTiles.add(key));
      }
    }

    return uniqueMatches;
  }

  /**
   * 计算匹配分数
   */
  private calculateMatchScore(match: MatchResult): number {
    let baseScore = match.length * 10;

    // 特殊形状加分
    switch (match.type) {
      case 'L-shape':
        baseScore *= 1.5;
        break;
      case 'T-shape':
        baseScore *= 2;
        break;
      case 'cross':
        baseScore *= 3;
        break;
      case 'diagonal':
        baseScore *= 1.2;
        break;
    }

    // 长度加分
    if (match.length >= 5) {
      baseScore *= 1.5;
    }
    if (match.length >= 6) {
      baseScore *= 2;
    }

    return Math.floor(baseScore);
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<MatchDetectionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.debug('匹配检测配置已更新', this.config, 'DynamicMatchDetector');
  }

  /**
   * 获取当前配置
   */
  getConfig(): MatchDetectionConfig {
    return { ...this.config };
  }
}
