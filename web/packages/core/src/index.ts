// ZigZag Core - Complete Implementation for Phase 4C

// Cell class
export class ZZCell {
  id: string;
  content: string;
  connections: Map<string, Set<string>>;
  private _space: ZZSpace | null = null;
  
  constructor(id: string, content: string = '') {
    this.id = id;
    this.content = content;
    this.connections = new Map();
  }

  // Compatibility getter for 'text' property
  get text(): string {
    return this.content;
  }

  set text(value: string) {
    this.content = value;
  }

  // Set the parent space reference
  setSpace(space: ZZSpace): void {
    this._space = space;
  }
  
  connect(dimension: string, targetId: string) {
    if (!this.connections.has(dimension)) {
      this.connections.set(dimension, new Set());
    }
    this.connections.get(dimension)!.add(targetId);
  }
  
  disconnect(dimension: string, targetId: string) {
    this.connections.get(dimension)?.delete(targetId);
  }
  
  getConnections(dimension: string): string[] {
    return Array.from(this.connections.get(dimension) || []);
  }
  
  getAllConnections(): Map<string, Set<string>> {
    return this.connections;
  }

  // Navigation method expected by client
  step(dimension: string, direction: number): ZZCell | null {
    if (!this._space) return null;
    
    const connections = this.getConnections(dimension);
    if (connections.length === 0) return null;
    
    // For positive direction, get the first connection
    // For negative direction, find cells that connect to this one
    if (direction > 0) {
      const targetId = connections[0];
      return this._space.getCell(targetId) || null;
    } else {
      // Find cells that connect to this cell in this dimension
      const allCells = this._space.getAllCells();
      for (const cell of allCells) {
        const cellConnections = cell.getConnections(dimension);
        if (cellConnections.includes(this.id)) {
          return cell;
        }
      }
      return null;
    }
  }

  // Create new cell and connect in dimension
  newCell(dimension: string, direction: number, content: string = ''): ZZCell | null {
    if (!this._space) return null;
    
    const newCell = this._space.createCell(content);
    
    if (direction > 0) {
      this._space.connectCells(this.id, newCell.id, dimension);
    } else {
      this._space.connectCells(newCell.id, this.id, dimension);
    }
    
    return newCell;
  }

  // Get head cell in dimension (furthest negative)
  getHead(dimension: string): ZZCell {
    let current: ZZCell = this;
    let prev = current.step(dimension, -1);
    
    while (prev) {
      current = prev;
      prev = current.step(dimension, -1);
    }
    
    return current;
  }
}

// Space class
export class ZZSpace {
  private cells: Map<string, ZZCell>;
  private _homeCell: ZZCell | null;
  private dimensions: Set<string>;
  
  constructor() {
    this.cells = new Map();
    this._homeCell = null;
    this.dimensions = new Set(['d.1', 'd.2', 'd.3']);
  }
  
  createCell(content: string = ''): ZZCell {
    const id = `cell-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const cell = new ZZCell(id, content);
    cell.setSpace(this);
    this.cells.set(id, cell);
    if (!this._homeCell) {
      this._homeCell = cell;
    }
    return cell;
  }
  
  getCell(id: string): ZZCell | undefined {
    return this.cells.get(id);
  }
  
  deleteCell(id: string): boolean {
    const cell = this.cells.get(id);
    if (!cell) return false;
    
    // Remove all connections to this cell
    this.cells.forEach(otherCell => {
      otherCell.getAllConnections().forEach(connections => {
        connections.delete(id);
      });
    });
    
    return this.cells.delete(id);
  }
  
  get homeCell(): ZZCell | null {
    return this._homeCell;
  }

  // Compatibility method for client
  getHomeCell(): ZZCell | null {
    return this._homeCell;
  }
  
  setHomeCell(cell: ZZCell): void {
    if (this.cells.has(cell.id)) {
      this._homeCell = cell;
    }
  }

  // Compatibility method for client
  getCells(): ZZCell[] {
    return this.getAllCells();
  }
  
  getAllCells(): ZZCell[] {
    return Array.from(this.cells.values());
  }
  
  getDimensions(): string[] {
    return Array.from(this.dimensions);
  }
  
  addDimension(name: string): void {
    this.dimensions.add(name);
  }
  
  connectCells(fromId: string, toId: string, dimension: string): boolean {
    const fromCell = this.cells.get(fromId);
    const toCell = this.cells.get(toId);
    
    if (!fromCell || !toCell) return false;
    
    fromCell.connect(dimension, toId);
    return true;
  }
  
  disconnectCells(fromId: string, toId: string, dimension: string): boolean {
    const fromCell = this.cells.get(fromId);
    if (!fromCell) return false;
    
    fromCell.disconnect(dimension, toId);
    return true;
  }
}

// Main factory function expected by client
export function createBlankSpace(): ZZSpace {
  const space = new ZZSpace();
  
  // Create initial cells for demo
  const cell1 = space.createCell('Welcome to ZigZag!');
  const cell2 = space.createCell('This is a hyperdimensional space');
  const cell3 = space.createCell('Navigate with arrow keys');
  
  // Connect them in different dimensions
  space.connectCells(cell1.id, cell2.id, 'd.1');
  space.connectCells(cell2.id, cell3.id, 'd.1');
  space.connectCells(cell1.id, cell3.id, 'd.2');
  
  return space;
}

// Krebs Cycle demo function expected by client
export function createKrebsCycleDemo(): ZZSpace {
  const space = new ZZSpace();
  
  // Create cells for the Krebs cycle
  const citrate = space.createCell('Citrate');
  const isocitrate = space.createCell('Isocitrate');
  const alphaKetoglutarate = space.createCell('α-Ketoglutarate');
  const succinylCoA = space.createCell('Succinyl-CoA');
  const succinate = space.createCell('Succinate');
  const fumarate = space.createCell('Fumarate');
  const malate = space.createCell('Malate');
  const oxaloacetate = space.createCell('Oxaloacetate');
  const acetylCoA = space.createCell('Acetyl-CoA');
  
  // Create the cycle connections in d.1
  space.connectCells(citrate.id, isocitrate.id, 'd.1');
  space.connectCells(isocitrate.id, alphaKetoglutarate.id, 'd.1');
  space.connectCells(alphaKetoglutarate.id, succinylCoA.id, 'd.1');
  space.connectCells(succinylCoA.id, succinate.id, 'd.1');
  space.connectCells(succinate.id, fumarate.id, 'd.1');
  space.connectCells(fumarate.id, malate.id, 'd.1');
  space.connectCells(malate.id, oxaloacetate.id, 'd.1');
  space.connectCells(oxaloacetate.id, citrate.id, 'd.1');
  
  // Connect acetyl-CoA input in d.2
  space.connectCells(acetylCoA.id, citrate.id, 'd.2');
  
  // Create enzyme connections in d.3
  const enzymes = [
    space.createCell('Citrate synthase'),
    space.createCell('Aconitase'),
    space.createCell('Isocitrate dehydrogenase'),
    space.createCell('α-Ketoglutarate dehydrogenase'),
    space.createCell('Succinate thiokinase'),
    space.createCell('Succinate dehydrogenase'),
    space.createCell('Fumarase'),
    space.createCell('Malate dehydrogenase')
  ];
  
  const substrates = [citrate, isocitrate, alphaKetoglutarate, succinylCoA, 
                     succinate, fumarate, malate, oxaloacetate];
  
  enzymes.forEach((enzyme, i) => {
    space.connectCells(substrates[i].id, enzyme.id, 'd.3');
  });
  
  return space;
}

// GZZ Import/Export types
export interface GZZCellData {
  id: string;
  content: string;
  connections: Record<string, string[]>;
}

export interface GZZConnection {
  from: string;
  to: string;
  dimension: string;
  direction?: 'positive' | 'negative';
}

export interface GZZImportResult {
  cells: GZZCellData[];
  connections: GZZConnection[];
  errors: string[];
  warnings: string[];
}

// GZZ File Reader class
export class GZZFileReader {
  errors: string[] = [];
  warnings: string[] = [];
  
  async loadZDirectory(files: File[] | FileList): Promise<GZZImportResult> {
    const cells: GZZCellData[] = [];
    const connections: GZZConnection[] = [];
    
    try {
      // Process files (simplified)
      const fileArray = Array.from(files);
      
      for (const file of fileArray) {
        if (file.name.endsWith('.txt')) {
          const content = await this.readFile(file);
          cells.push({
            id: file.name.replace('.txt', ''),
            content,
            connections: {}
          });
        }
      }
    } catch (error: any) {
      this.errors.push(`Failed to load files: ${error?.message || error}`);
    }
    
    return {
      cells,
      connections,
      errors: this.errors,
      warnings: this.warnings
    };
  }
  
  private readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }
}

// Main loader function
export async function loadGZZFiles(files: File[] | FileList): Promise<GZZImportResult> {
  const reader = new GZZFileReader();
  return reader.loadZDirectory(files);
}

// Additional utility functions
export function createCellsFromImport(space: ZZSpace, importResult: GZZImportResult): void {
  const cellMap = new Map<string, ZZCell>();
  
  // Create cells
  for (const cellData of importResult.cells) {
    const cell = space.createCell(cellData.content);
    cellMap.set(cellData.id, cell);
  }
  
  // Create connections
  for (const conn of importResult.connections) {
    const fromCell = cellMap.get(conn.from);
    const toCell = cellMap.get(conn.to);
    
    if (fromCell && toCell) {
      space.connectCells(fromCell.id, toCell.id, conn.dimension);
    }
  }
}

// Re-export types that might be used
export type Cell = ZZCell;
export type Space = ZZSpace;

// Default export for convenience
export default {
  ZZCell,
  ZZSpace,
  createBlankSpace,
  createKrebsCycleDemo,
  GZZFileReader,
  loadGZZFiles,
  createCellsFromImport
};
