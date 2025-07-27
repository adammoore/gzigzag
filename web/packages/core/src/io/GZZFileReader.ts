// packages/core/src/io/GZZFileReader.ts
// WORKING VERSION - Compatible with your existing ZZSpace implementation

export interface GZZConnection {
  dimension: string;
  direction: 'positive' | 'negative';
  targetCellId: string;
}

export interface GZZCellData {
  originalId: string;
  modernId: string;
  content: string;
  connections: GZZConnection[];
}

export interface GZZImportResult {
  space: any;
  cellMapping: Map<string, string>;
  errors: string[];
  warnings: string[];
  stats: {
    cellsLoaded: number;
    connectionsCreated: number;
    dimensionsFound: string[];
  };
}

export class GZZFileReader {
  private cellMapping = new Map<string, string>();
  private errors: string[] = [];
  private warnings: string[] = [];

  async loadZDirectory(files: FileList | File[]): Promise<GZZImportResult> {
    this.reset();
    
    try {
      const cellsData = await this.parseZDirectoryFiles(files);
      const space = await this.createModernSpace(cellsData);
      
      return {
        space,
        cellMapping: this.cellMapping,
        errors: this.errors,
        warnings: this.warnings,
        stats: this.generateStats(cellsData)
      };
    } catch (error) {
      this.errors.push(`Failed to load Z directory: ${error.message}`);
      throw error;
    }
  }

  private async parseZDirectoryFiles(files: FileList | File[]): Promise<Map<string, GZZCellData>> {
    const cellsData = new Map<string, GZZCellData>();
    const fileArray = Array.from(files);
    
    const cellDirectories = this.groupFilesByCellDirectory(fileArray);
    
    for (const [cellId, cellFiles] of cellDirectories) {
      try {
        const cellData = await this.parseCellDirectory(cellId, cellFiles);
        cellsData.set(cellId, cellData);
      } catch (error) {
        this.errors.push(`Failed to parse cell ${cellId}: ${error.message}`);
      }
    }
    
    return cellsData;
  }

  private groupFilesByCellDirectory(files: File[]): Map<string, File[]> {
    const cellDirs = new Map<string, File[]>();
    
    for (const file of files) {
      const cellId = this.extractCellIdFromPath(file.webkitRelativePath || file.name);
      if (cellId) {
        if (!cellDirs.has(cellId)) {
          cellDirs.set(cellId, []);
        }
        cellDirs.get(cellId)!.push(file);
      }
    }
    
    return cellDirs;
  }

  private extractCellIdFromPath(path: string): string | null {
    const match = path.match(/b_([A-Fa-f0-9]+)_\//);
    return match ? match[1] : null;
  }

  private async parseCellDirectory(originalId: string, files: File[]): Promise<GZZCellData> {
    const modernId = this.generateModernId(originalId);
    this.cellMapping.set(originalId, modernId);
    
    let content = '';
    const connections: GZZConnection[] = [];
    
    for (const file of files) {
      const fileName = file.name;
      
      if (fileName === 'c') {
        content = await this.readTextFile(file);
      } else if (fileName.startsWith('d.')) {
        const connection = await this.parseConnectionFile(file);
        if (connection) {
          connections.push(connection);
        }
      }
    }
    
    return {
      originalId,
      modernId,
      content: content.trim(),
      connections
    };
  }

  private async parseConnectionFile(file: File): Promise<GZZConnection | null> {
    try {
      const fileName = file.name;
      const targetId = (await this.readTextFile(file)).trim();
      
      if (!targetId) return null;
      
      const match = fileName.match(/^(d\..+?)([+-])$/);
      if (!match) {
        this.warnings.push(`Invalid connection file name: ${fileName}`);
        return null;
      }
      
      const [, dimension, directionChar] = match;
      const direction = directionChar === '+' ? 'positive' : 'negative';
      
      return {
        dimension,
        direction,
        targetCellId: targetId
      };
    } catch (error) {
      this.warnings.push(`Failed to parse connection file ${file.name}: ${error.message}`);
      return null;
    }
  }

  private generateModernId(hexId: string): string {
    const padded = hexId.padEnd(32, '0');
    return [
      padded.substring(0, 8),
      padded.substring(8, 12),
      padded.substring(12, 16),
      padded.substring(16, 20),
      padded.substring(20, 32)
    ].join('-');
  }

  /**
   * WORKING VERSION: Create modern space using your existing pattern
   */
  private async createModernSpace(cellsData: Map<string, GZZCellData>): Promise<any> {
    // Create a simple object that mimics your ZZSpace interface
    // This should work with your existing navigation code
    
    const cells = new Map<string, any>();
    const modernCells = new Map<string, any>();
    let homeCell: any = null;
    const dimensions = new Set<string>();
    
    // Step 1: Create all cells first (simple objects that work like ZZCell)
    for (const cellData of cellsData.values()) {
      const cell = {
        id: cellData.modernId,
        text: cellData.content,
        connections: new Map<string, { positive?: any; negative?: any }>(),
        
        // Your existing step method pattern
        step(dimension: string, direction: 1 | -1): any {
          const conn = this.connections.get(dimension);
          if (!conn) return null;
          return direction === 1 ? conn.positive || null : conn.negative || null;
        },
        
        // Your existing connect method pattern  
        connect(dimension: string, toCell: any): void {
          // Create bidirectional connection
          if (!this.connections.has(dimension)) {
            this.connections.set(dimension, {});
          }
          if (!toCell.connections.has(dimension)) {
            toCell.connections.set(dimension, {});
          }
          
          this.connections.get(dimension)!.positive = toCell;
          toCell.connections.get(dimension)!.negative = this;
        },
        
        // Additional methods your navigation might use
        getHead(dimension: string): any {
          let current = this;
          let previous = null;
          while (current && current !== previous) {
            previous = current;
            current = current.step(dimension, -1);
          }
          return previous;
        },
        
        readRank(dimension: string, direction: 1 | -1): any[] {
          const rank = [];
          let current = this;
          while (current) {
            rank.push(current);
            current = current.step(dimension, direction);
            if (rank.includes(current)) break; // Avoid infinite loops
          }
          return rank;
        }
      };
      
      cells.set(cellData.modernId, cell);
      modernCells.set(cellData.originalId, cell);
      modernCells.set(cellData.modernId, cell);
    }
    
    // Step 2: Create all connections
    for (const cellData of cellsData.values()) {
      const sourceCell = cells.get(cellData.modernId);
      if (!sourceCell) continue;
      
      // Only process positive connections to avoid duplicates
      const positiveConnections = cellData.connections.filter(c => c.direction === 'positive');
      
      for (const connection of positiveConnections) {
        const targetCell = modernCells.get(connection.targetCellId);
        if (targetCell) {
          try {
            sourceCell.connect(connection.dimension, targetCell);
            dimensions.add(connection.dimension);
          } catch (error) {
            this.warnings.push(
              `Failed to connect ${cellData.originalId} to ${connection.targetCellId} on ${connection.dimension}`
            );
          }
        }
      }
    }
    
    // Step 3: Find home cell
    const homeCellData = Array.from(cellsData.values()).find(
      cell => cell.content.toLowerCase().includes('home')
    ) || Array.from(cellsData.values())[0];
    
    if (homeCellData) {
      homeCell = cells.get(homeCellData.modernId);
    }
    
    // Step 4: Create space object that works like your existing ZZSpace
    const space = {
      getHomeCell(): any {
        return homeCell || Array.from(cells.values())[0];
      },
      
      getCell(id: string): any {
        return cells.get(id) || null;
      },
      
      getDimensions(): string[] {
        return Array.from(dimensions).sort();
      },
      
      getCells(): any[] {
        return Array.from(cells.values());
      },
      
      // Store the raw data for debugging
      _cells: cells,
      _dimensions: dimensions,
      _homeCell: homeCell
    };
    
    return space;
  }

  private async readTextFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
      reader.readAsText(file);
    });
  }

  private generateStats(cellsData: Map<string, GZZCellData>) {
    const dimensions = new Set<string>();
    let connectionsCount = 0;
    
    for (const cellData of cellsData.values()) {
      for (const connection of cellData.connections) {
        dimensions.add(connection.dimension);
        connectionsCount++;
      }
    }
    
    return {
      cellsLoaded: cellsData.size,
      connectionsCreated: Math.floor(connectionsCount / 2), // Bidirectional
      dimensionsFound: Array.from(dimensions).sort()
    };
  }

  private reset(): void {
    this.cellMapping.clear();
    this.errors = [];
    this.warnings = [];
  }
}

export async function loadGZZFiles(files: FileList | File[]): Promise<GZZImportResult> {
  const reader = new GZZFileReader();
  return reader.loadZDirectory(files);
}
