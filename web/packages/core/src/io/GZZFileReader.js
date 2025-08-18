"use strict";
// packages/core/src/io/GZZFileReader.ts
// WORKING VERSION - Compatible with your existing ZZSpace implementation
Object.defineProperty(exports, "__esModule", { value: true });
exports.GZZFileReader = void 0;
exports.loadGZZFiles = loadGZZFiles;
class GZZFileReader {
    cellMapping = new Map();
    errors = [];
    warnings = [];
    async loadZDirectory(files) {
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
        }
        catch (error) {
            this.errors.push(`Failed to load Z directory: ${error.message}`);
            throw error;
        }
    }
    async parseZDirectoryFiles(files) {
        const cellsData = new Map();
        const fileArray = Array.from(files);
        const cellDirectories = this.groupFilesByCellDirectory(fileArray);
        for (const [cellId, cellFiles] of cellDirectories) {
            try {
                const cellData = await this.parseCellDirectory(cellId, cellFiles);
                cellsData.set(cellId, cellData);
            }
            catch (error) {
                this.errors.push(`Failed to parse cell ${cellId}: ${error.message}`);
            }
        }
        return cellsData;
    }
    groupFilesByCellDirectory(files) {
        const cellDirs = new Map();
        for (const file of files) {
            const cellId = this.extractCellIdFromPath(file.webkitRelativePath || file.name);
            if (cellId) {
                if (!cellDirs.has(cellId)) {
                    cellDirs.set(cellId, []);
                }
                cellDirs.get(cellId).push(file);
            }
        }
        return cellDirs;
    }
    extractCellIdFromPath(path) {
        const match = path.match(/b_([A-Fa-f0-9]+)_\//);
        return match ? match[1] : null;
    }
    async parseCellDirectory(originalId, files) {
        const modernId = this.generateModernId(originalId);
        this.cellMapping.set(originalId, modernId);
        let content = '';
        const connections = [];
        for (const file of files) {
            const fileName = file.name;
            if (fileName === 'c') {
                content = await this.readTextFile(file);
            }
            else if (fileName.startsWith('d.')) {
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
    async parseConnectionFile(file) {
        try {
            const fileName = file.name;
            const targetId = (await this.readTextFile(file)).trim();
            if (!targetId)
                return null;
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
        }
        catch (error) {
            this.warnings.push(`Failed to parse connection file ${file.name}: ${error.message}`);
            return null;
        }
    }
    generateModernId(hexId) {
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
    async createModernSpace(cellsData) {
        // Create a simple object that mimics your ZZSpace interface
        // This should work with your existing navigation code
        const cells = new Map();
        const modernCells = new Map();
        let homeCell = null;
        const dimensions = new Set();
        // Step 1: Create all cells first (simple objects that work like ZZCell)
        for (const cellData of cellsData.values()) {
            const cell = {
                id: cellData.modernId,
                text: cellData.content,
                connections: new Map(),
                // Your existing step method pattern
                step(dimension, direction) {
                    const conn = this.connections.get(dimension);
                    if (!conn)
                        return null;
                    return direction === 1 ? conn.positive || null : conn.negative || null;
                },
                // Your existing connect method pattern  
                connect(dimension, toCell) {
                    // Create bidirectional connection
                    if (!this.connections.has(dimension)) {
                        this.connections.set(dimension, {});
                    }
                    if (!toCell.connections.has(dimension)) {
                        toCell.connections.set(dimension, {});
                    }
                    this.connections.get(dimension).positive = toCell;
                    toCell.connections.get(dimension).negative = this;
                },
                // Additional methods your navigation might use
                getHead(dimension) {
                    let current = this;
                    let previous = null;
                    while (current && current !== previous) {
                        previous = current;
                        current = current.step(dimension, -1);
                    }
                    return previous;
                },
                readRank(dimension, direction) {
                    const rank = [];
                    let current = this;
                    while (current) {
                        rank.push(current);
                        current = current.step(dimension, direction);
                        if (rank.includes(current))
                            break; // Avoid infinite loops
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
            if (!sourceCell)
                continue;
            // Only process positive connections to avoid duplicates
            const positiveConnections = cellData.connections.filter(c => c.direction === 'positive');
            for (const connection of positiveConnections) {
                const targetCell = modernCells.get(connection.targetCellId);
                if (targetCell) {
                    try {
                        sourceCell.connect(connection.dimension, targetCell);
                        dimensions.add(connection.dimension);
                    }
                    catch (error) {
                        this.warnings.push(`Failed to connect ${cellData.originalId} to ${connection.targetCellId} on ${connection.dimension}`);
                    }
                }
            }
        }
        // Step 3: Find home cell
        const homeCellData = Array.from(cellsData.values()).find(cell => cell.content.toLowerCase().includes('home')) || Array.from(cellsData.values())[0];
        if (homeCellData) {
            homeCell = cells.get(homeCellData.modernId);
        }
        // Step 4: Create space object that works like your existing ZZSpace
        const space = {
            getHomeCell() {
                return homeCell || Array.from(cells.values())[0];
            },
            getCell(id) {
                return cells.get(id) || null;
            },
            getDimensions() {
                return Array.from(dimensions).sort();
            },
            getCells() {
                return Array.from(cells.values());
            },
            // Store the raw data for debugging
            _cells: cells,
            _dimensions: dimensions,
            _homeCell: homeCell
        };
        return space;
    }
    async readTextFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
            reader.readAsText(file);
        });
    }
    generateStats(cellsData) {
        const dimensions = new Set();
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
    reset() {
        this.cellMapping.clear();
        this.errors = [];
        this.warnings = [];
    }
}
exports.GZZFileReader = GZZFileReader;
async function loadGZZFiles(files) {
    const reader = new GZZFileReader();
    return reader.loadZDirectory(files);
}
//# sourceMappingURL=GZZFileReader.js.map