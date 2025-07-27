// ZigZag Core TypeScript Implementation - Proof of Concept
// Copyright (c) Ted Nelson and Adam Vials Moore

export type CellId = string;
export type DimensionName = string;
export type Direction = 1 | -1;

export class ZigZagError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ZigZagError';
  }
}

export class ZZCell {
  private _id: CellId;
  private _text: string;
  private _connections: Map<DimensionName, { positive?: CellId; negative?: CellId }>;
  private _space: ZZSpace;

  constructor(space: ZZSpace, text: string = '', id?: CellId) {
    this._id = id || this.generateId();
    this._text = text;
    this._connections = new Map();
    this._space = space;
    space.addCell(this);
  }

  get id(): CellId {
    return this._id;
  }

  get text(): string {
    return this._text;
  }

  set text(value: string) {
    this._text = value;
  }

  step(dimension: DimensionName, direction: Direction = 1): ZZCell | null {
    const conn = this._connections.get(dimension);
    if (!conn) return null;

    const targetId = direction > 0 ? conn.positive : conn.negative;
    if (!targetId) return null;

    return this._space.getCell(targetId);
  }

  connect(dimension: DimensionName, toCell: ZZCell): void {
    const existingConn = this._connections.get(dimension);
    if (existingConn?.positive) {
      throw new ZigZagError(`Cell ${this.id} already connected positively on ${dimension}`);
    }

    const targetConn = toCell._connections.get(dimension);
    if (targetConn?.negative) {
      throw new ZigZagError(`Cell ${toCell.id} already connected negatively on ${dimension}`);
    }

    this.setConnection(dimension, 1, toCell.id);
    toCell.setConnection(dimension, -1, this.id);
    this._space.registerDimension(dimension);
  }

  newCell(dimension: DimensionName, direction: Direction = 1, text: string = ''): ZZCell {
    const newCell = new ZZCell(this._space, text);
    
    if (direction > 0) {
      this.connect(dimension, newCell);
    } else {
      newCell.connect(dimension, this);
    }
    
    return newCell;
  }

  excise(dimension: DimensionName): void {
    const positive = this.step(dimension, 1);
    const negative = this.step(dimension, -1);
    
    this.disconnect(dimension, 1);
    this.disconnect(dimension, -1);
    
    if (positive && negative) {
      negative.connect(dimension, positive);
    }
  }

  getHead(dimension: DimensionName): ZZCell {
    let cell: ZZCell = this;
    const visited = new Set<string>();
    
    while (true) {
      if (visited.has(cell.id)) {
        return cell;
      }
      visited.add(cell.id);
      
      const nextCell = cell.step(dimension, -1);
      if (!nextCell) {
        return cell;
      }
      cell = nextCell;
    }
  }

  readRank(dimension: DimensionName, direction: Direction = 1): ZZCell[] {
    const result: ZZCell[] = [this];
    let cell: ZZCell = this;
    const visited = new Set<string>([this.id]);
    
    while (true) {
      const nextCell = cell.step(dimension, direction);
      if (!nextCell || visited.has(nextCell.id)) {
        break;
      }
      result.push(nextCell);
      visited.add(nextCell.id);
      cell = nextCell;
    }
    
    return result;
  }

  private setConnection(dimension: DimensionName, direction: Direction, targetId: CellId): void {
    const conn = this._connections.get(dimension) || {};
    
    if (direction > 0) {
      conn.positive = targetId;
    } else {
      conn.negative = targetId;
    }
    
    this._connections.set(dimension, conn);
  }

  private disconnect(dimension: DimensionName, direction: Direction): void {
    const conn = this._connections.get(dimension);
    if (!conn) return;

    if (direction > 0) {
      delete conn.positive;
    } else {
      delete conn.negative;
    }

    if (!conn.positive && !conn.negative) {
      this._connections.delete(dimension);
    } else {
      this._connections.set(dimension, conn);
    }
  }

  private generateId(): CellId {
    return Math.random().toString(36).substr(2, 9);
  }

  getDimensions(): DimensionName[] {
    return Array.from(this._connections.keys());
  }

  toString(): string {
    return `'${this.id}' (${this.text})`;
  }
}

export class ZZSpace {
  private _id: string;
  private _cells: Map<CellId, ZZCell>;
  private _dimensions: Set<DimensionName>;
  private _homeCell: ZZCell | null;

  constructor(id?: string) {
    this._id = id || this.generateSpaceId();
    this._cells = new Map();
    this._dimensions = new Set();
    this._homeCell = null;
  }

  get id(): string {
    return this._id;
  }

  addCell(cell: ZZCell): void {
    this._cells.set(cell.id, cell);
    
    if (!this._homeCell) {
      this._homeCell = cell;
    }
  }

  getCell(id: CellId): ZZCell | null {
    return this._cells.get(id) || null;
  }

  getHomeCell(): ZZCell {
    if (!this._homeCell) {
      this._homeCell = new ZZCell(this, 'Home');
    }
    return this._homeCell;
  }

  registerDimension(dimension: DimensionName): void {
    this._dimensions.add(dimension);
  }

  getDimensions(): DimensionName[] {
    return Array.from(this._dimensions);
  }

  getCells(): ZZCell[] {
    return Array.from(this._cells.values());
  }

  private generateSpaceId(): string {
    return `space_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// BIOCHEMISTRY DEMO (Your YouTube demo recreation!)
export function createKrebsCycleDemo(): ZZSpace {
  const space = new ZZSpace('biochemistry_demo');
  const home = space.getHomeCell();
  home.text = 'Krebs Cycle Demo';

  console.log('🧬 Creating Krebs Cycle ZigZag Structure...');
  
  const acetylCoA = home.newCell('d.biochem', 1, 'Acetyl-CoA');
  const citrate = acetylCoA.newCell('d.krebs', 1, 'Citrate');
  const isocitrate = citrate.newCell('d.krebs', 1, 'Isocitrate');
  const alphaKetoglutarate = isocitrate.newCell('d.krebs', 1, 'α-Ketoglutarate');
  const succinylCoA = alphaKetoglutarate.newCell('d.krebs', 1, 'Succinyl-CoA');
  const succinate = succinylCoA.newCell('d.krebs', 1, 'Succinate');
  const fumarate = succinate.newCell('d.krebs', 1, 'Fumarate');
  const malate = fumarate.newCell('d.krebs', 1, 'Malate');
  const oxaloacetate = malate.newCell('d.krebs', 1, 'Oxaloacetate');

  // Complete the cycle
  oxaloacetate.connect('d.krebs', acetylCoA);

  // Add carbon count dimension - create separate classification cells
  const carbonCategories = home.newCell('d.carbons', 1, 'Carbon Categories');
  const c2Category = carbonCategories.newCell('d.carbons', 1, 'C2 Compounds');
  const c4Category = c2Category.newCell('d.carbons', 1, 'C4 Compounds'); 
  const c6Category = c4Category.newCell('d.carbons', 1, 'C6 Compounds');

  // Create specific carbon count cells for each compound
  const acetylC2 = c2Category.newCell('d.carbon-instances', 1, 'Acetyl-CoA (C2)');
  const citrateC6 = c6Category.newCell('d.carbon-instances', 1, 'Citrate (C6)');
  const isocitrateC6 = citrateC6.newCell('d.carbon-instances', 1, 'Isocitrate (C6)');
  const oxaloacetateC4 = c4Category.newCell('d.carbon-instances', 1, 'Oxaloacetate (C4)');

  // Connect compounds to their carbon classifications
  acetylCoA.connect('d.carbon-count', acetylC2);
  citrate.connect('d.carbon-count', citrateC6);
  isocitrate.connect('d.carbon-count', isocitrateC6);
  oxaloacetate.connect('d.carbon-count', oxaloacetateC4);

  return space;
}

export function animateKrebsCycle(space: ZZSpace): CellId[] {
  const home = space.getHomeCell();
  const acetylCoA = home.step('d.biochem', 1);
  
  if (!acetylCoA) {
    throw new ZigZagError('Krebs cycle not found in space');
  }

  const cyclePath = acetylCoA.readRank('d.krebs', 1);
  return cyclePath.map(cell => cell.id);
}

// DEMO AND TESTS
function runDemo(): void {
  console.log('🎯 ZigZag TypeScript Demo - Ted Nelson\'s Vision in Action!');
  console.log('='.repeat(60));

  // Test basic ZigZag operations
  console.log('\n📝 Testing Basic ZigZag Operations:');
  const space = new ZZSpace('test');
  const a = new ZZCell(space, 'A');
  const b = new ZZCell(space, 'B');
  const c = b.newCell('d.1', 1, 'C');
  
  a.connect('d.1', b);
  
  console.log(`Created cells: ${a} -> ${b} -> ${c}`);
  console.log(`Navigate A->d.1: ${a.step('d.1', 1)}`);
  console.log(`Navigate C<-d.1: ${c.step('d.1', -1)}`);
  console.log(`Full rank from A: ${a.readRank('d.1', 1).map(cell => cell.text).join(' -> ')}`);

  // Your biochemistry demo!
  console.log('\n🧬 Biochemistry Demo (recreating your YouTube video):');
  const biochemSpace = createKrebsCycleDemo();
  const cyclePath = animateKrebsCycle(biochemSpace);
  
  console.log('Krebs Cycle Animation Path:');
  cyclePath.forEach((cellId, index) => {
    const cell = biochemSpace.getCell(cellId);
    console.log(`  Step ${index + 1}: ${cell?.text} (${cellId})`);
  });

  console.log(`\n✅ Total compounds in cycle: ${cyclePath.length}`);
  console.log(`✅ Dimensions in space: ${biochemSpace.getDimensions().join(', ')}`);
  console.log(`✅ Total cells in space: ${biochemSpace.getCells().length}`);

  console.log('\n🎉 Success! ZigZag is working - "locally rational, globally paradoxical"');
}

// BLANK SPACE CREATION

/**
 * Standard ZigZag dimensions as per original GzigZag
 */
export const STANDARD_DIMENSIONS = [
  'd.1',      // Primary horizontal dimension
  'd.2',      // Primary vertical dimension  
  'd.3',      // Primary depth dimension
  'd.clone',  // Clone relationships
  'd.cursor', // Cursor positions
  'd.mark',   // Marked cells
] as const;

/**
 * System dimensions used internally
 */
export const SYSTEM_DIMENSIONS = [
  'd.system',       // System cells
  'd.dims',         // Dimension list
  'd.cursor-cargo', // Cursor cargo connections
  'd.cellcreation', // Cell creation tracking
] as const;

/**
 * Creates a blank ZigZag space with standard dimensions
 * This matches the original GzigZag startup configuration
 */
export function createBlankSpace(): ZZSpace {
  const space = new ZZSpace('blank_space');
  
  // Get the automatically created home cell
  const homeCell = space.getHomeCell();
  homeCell.text = 'HOME';

  // Register standard dimensions first
  [...STANDARD_DIMENSIONS, ...SYSTEM_DIMENSIONS].forEach(dimName => {
    space.registerDimension(dimName);
  });

  // Create dimension list structure (following original GzigZag pattern)
  const dimListLabel = new ZZCell(space, 'DimLists');
  const dimList = new ZZCell(space, ''); // Empty cell as list head
  
  // Connect dimension structure
  homeCell.connect('d.2', dimListLabel);
  dimListLabel.connect('d.1', dimList);

  // Add standard dimensions to the dimension list
  let prevDimCell: ZZCell | null = null;
  
  [...STANDARD_DIMENSIONS, ...SYSTEM_DIMENSIONS].forEach(dimName => {
    const dimCell = new ZZCell(space, dimName);
    space.registerDimension(dimName);
    
    if (prevDimCell) {
      prevDimCell.connect('d.2', dimCell);
    } else {
      dimList.connect('d.2', dimCell);
    }
    prevDimCell = dimCell;
  });

  // Create Actions list structure
  const actionsLabel = new ZZCell(space, 'Actions');
  const actionsList = new ZZCell(space, ''); // Empty cell as list head
  
  dimListLabel.connect('d.2', actionsLabel);
  actionsLabel.connect('d.1', actionsList);

  // Create Views list structure  
  const viewsLabel = new ZZCell(space, 'Views');
  const viewsList = new ZZCell(space, ''); // Empty cell as list head
  
  actionsLabel.connect('d.2', viewsLabel);
  viewsLabel.connect('d.1', viewsList);

  // Add basic views (following original GzigZag)
  const vanishingView = new ZZCell(space, 'Vanishing');
  const rowView = new ZZCell(space, 'Row'); 
  const columnView = new ZZCell(space, 'Column');
  
  viewsList.connect('d.2', vanishingView);
  vanishingView.connect('d.2', rowView);
  rowView.connect('d.2', columnView);

  // Create Bindings list structure
  const bindingsLabel = new ZZCell(space, 'Bindings');
  const bindingsList = new ZZCell(space, 'Normal mode');
  
  viewsLabel.connect('d.2', bindingsLabel);
  bindingsLabel.connect('d.1', bindingsList);

  // Create basic cursor
  const cursor1 = new ZZCell(space, 'Cursor-1');
  homeCell.connect('d.cursor', cursor1);

  // Create some basic cells connected on d.1 to ensure navigation works
  // This follows the original GzigZag pattern of having some cells to start with
  const cell1 = homeCell.newCell('d.1', 1, 'Cell 1');
  const cell2 = cell1.newCell('d.1', 1, 'Cell 2');
  const cell3 = cell2.newCell('d.1', 1, 'Cell 3');

  return space;
}

/**
 * Creates a new cell in the space - helper for cleaner code
 */
export function createCell(space: ZZSpace, text: string = ''): ZZCell {
  return new ZZCell(space, text);
}

// Run the demo if not in a module environment
if (typeof module !== 'undefined') {
  runDemo();
}