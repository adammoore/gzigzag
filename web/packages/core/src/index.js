"use strict";
// ZigZag Core TypeScript Implementation - Proof of Concept
// Copyright (c) Ted Nelson and Adam Vials Moore
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SYSTEM_DIMENSIONS = exports.STANDARD_DIMENSIONS = exports.ZZSpace = exports.ZZCell = exports.ZigZagError = void 0;
exports.createKrebsCycleDemo = createKrebsCycleDemo;
exports.animateKrebsCycle = animateKrebsCycle;
exports.createBlankSpace = createBlankSpace;
exports.createCell = createCell;
__exportStar(require("./io"), exports);
class ZigZagError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ZigZagError';
    }
}
exports.ZigZagError = ZigZagError;
class ZZCell {
    _id;
    _text;
    _connections;
    _space;
    constructor(space, text = '', id) {
        this._id = id || this.generateId();
        this._text = text;
        this._connections = new Map();
        this._space = space;
        space.addCell(this);
    }
    get id() {
        return this._id;
    }
    get text() {
        return this._text;
    }
    set text(value) {
        this._text = value;
    }
    step(dimension, direction = 1) {
        const conn = this._connections.get(dimension);
        if (!conn)
            return null;
        const targetId = direction > 0 ? conn.positive : conn.negative;
        if (!targetId)
            return null;
        return this._space.getCell(targetId);
    }
    connect(dimension, toCell) {
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
    newCell(dimension, direction = 1, text = '') {
        const newCell = new ZZCell(this._space, text);
        if (direction > 0) {
            this.connect(dimension, newCell);
        }
        else {
            newCell.connect(dimension, this);
        }
        return newCell;
    }
    excise(dimension) {
        const positive = this.step(dimension, 1);
        const negative = this.step(dimension, -1);
        this.disconnect(dimension, 1);
        this.disconnect(dimension, -1);
        if (positive && negative) {
            negative.connect(dimension, positive);
        }
    }
    getHead(dimension) {
        let cell = this;
        const visited = new Set();
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
    readRank(dimension, direction = 1) {
        const result = [this];
        let cell = this;
        const visited = new Set([this.id]);
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
    setConnection(dimension, direction, targetId) {
        const conn = this._connections.get(dimension) || {};
        if (direction > 0) {
            conn.positive = targetId;
        }
        else {
            conn.negative = targetId;
        }
        this._connections.set(dimension, conn);
    }
    disconnect(dimension, direction) {
        const conn = this._connections.get(dimension);
        if (!conn)
            return;
        if (direction > 0) {
            delete conn.positive;
        }
        else {
            delete conn.negative;
        }
        if (!conn.positive && !conn.negative) {
            this._connections.delete(dimension);
        }
        else {
            this._connections.set(dimension, conn);
        }
    }
    generateId() {
        return Math.random().toString(36).substr(2, 9);
    }
    getDimensions() {
        return Array.from(this._connections.keys());
    }
    toString() {
        return `'${this.id}' (${this.text})`;
    }
}
exports.ZZCell = ZZCell;
class ZZSpace {
    _id;
    _cells;
    _dimensions;
    _homeCell;
    constructor(id) {
        this._id = id || this.generateSpaceId();
        this._cells = new Map();
        this._dimensions = new Set();
        this._homeCell = null;
    }
    get id() {
        return this._id;
    }
    addCell(cell) {
        this._cells.set(cell.id, cell);
        if (!this._homeCell) {
            this._homeCell = cell;
        }
    }
    getCell(id) {
        return this._cells.get(id) || null;
    }
    getHomeCell() {
        if (!this._homeCell) {
            this._homeCell = new ZZCell(this, 'Home');
        }
        return this._homeCell;
    }
    registerDimension(dimension) {
        this._dimensions.add(dimension);
    }
    getDimensions() {
        return Array.from(this._dimensions);
    }
    getCells() {
        return Array.from(this._cells.values());
    }
    generateSpaceId() {
        return `space_${Math.random().toString(36).substr(2, 9)}`;
    }
    setHomeCell(cell) {
        this.homeCell = cell;
    }
}
exports.ZZSpace = ZZSpace;
// BIOCHEMISTRY DEMO (Your YouTube demo recreation!)
function createKrebsCycleDemo() {
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
function animateKrebsCycle(space) {
    const home = space.getHomeCell();
    const acetylCoA = home.step('d.biochem', 1);
    if (!acetylCoA) {
        throw new ZigZagError('Krebs cycle not found in space');
    }
    const cyclePath = acetylCoA.readRank('d.krebs', 1);
    return cyclePath.map(cell => cell.id);
}
// DEMO AND TESTS
function runDemo() {
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
exports.STANDARD_DIMENSIONS = [
    'd.1', // Primary horizontal dimension
    'd.2', // Primary vertical dimension  
    'd.3', // Primary depth dimension
    'd.clone', // Clone relationships
    'd.cursor', // Cursor positions
    'd.mark', // Marked cells
];
/**
 * System dimensions used internally
 */
exports.SYSTEM_DIMENSIONS = [
    'd.system', // System cells
    'd.dims', // Dimension list
    'd.cursor-cargo', // Cursor cargo connections
    'd.cellcreation', // Cell creation tracking
];
/**
 * Creates a blank ZigZag space with standard dimensions
 * This matches the original GzigZag startup configuration
 */
function createBlankSpace() {
    const space = new ZZSpace('blank_space');
    // Get the automatically created home cell
    const homeCell = space.getHomeCell();
    homeCell.text = 'HOME';
    // Register standard dimensions first
    [...exports.STANDARD_DIMENSIONS, ...exports.SYSTEM_DIMENSIONS].forEach(dimName => {
        space.registerDimension(dimName);
    });
    // Create dimension list structure (following original GzigZag pattern)
    const dimListLabel = new ZZCell(space, 'DimLists');
    const dimList = new ZZCell(space, ''); // Empty cell as list head
    // Connect dimension structure
    homeCell.connect('d.2', dimListLabel);
    dimListLabel.connect('d.1', dimList);
    // Add standard dimensions to the dimension list
    let prevDimCell = null;
    [...exports.STANDARD_DIMENSIONS, ...exports.SYSTEM_DIMENSIONS].forEach(dimName => {
        const dimCell = new ZZCell(space, dimName);
        space.registerDimension(dimName);
        if (prevDimCell) {
            prevDimCell.connect('d.2', dimCell);
        }
        else {
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
function createCell(space, text = '') {
    return new ZZCell(space, text);
}
// Run the demo if not in a module environment
if (typeof module !== 'undefined') {
    runDemo();
}
//# sourceMappingURL=index.js.map