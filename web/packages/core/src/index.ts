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

// Run the demo if not in a module environment
if (typeof module !== 'undefined') {
  runDemo();
}