export type CellId = string;
export type DimensionName = string;
export type Direction = 1 | -1;
export * from './io';
export declare class ZigZagError extends Error {
    constructor(message: string);
}
export declare class ZZCell {
    private _id;
    private _text;
    private _connections;
    private _space;
    constructor(space: ZZSpace, text?: string, id?: CellId);
    get id(): CellId;
    get text(): string;
    set text(value: string);
    step(dimension: DimensionName, direction?: Direction): ZZCell | null;
    connect(dimension: DimensionName, toCell: ZZCell): void;
    newCell(dimension: DimensionName, direction?: Direction, text?: string): ZZCell;
    excise(dimension: DimensionName): void;
    getHead(dimension: DimensionName): ZZCell;
    readRank(dimension: DimensionName, direction?: Direction): ZZCell[];
    private setConnection;
    private disconnect;
    private generateId;
    getDimensions(): DimensionName[];
    toString(): string;
}
export declare class ZZSpace {
    private _id;
    private _cells;
    private _dimensions;
    private _homeCell;
    constructor(id?: string);
    get id(): string;
    addCell(cell: ZZCell): void;
    getCell(id: CellId): ZZCell | null;
    getHomeCell(): ZZCell;
    registerDimension(dimension: DimensionName): void;
    getDimensions(): DimensionName[];
    getCells(): ZZCell[];
    private generateSpaceId;
    setHomeCell(cell: ZZCell): void;
}
export declare function createKrebsCycleDemo(): ZZSpace;
export declare function animateKrebsCycle(space: ZZSpace): CellId[];
/**
 * Standard ZigZag dimensions as per original GzigZag
 */
export declare const STANDARD_DIMENSIONS: readonly ["d.1", "d.2", "d.3", "d.clone", "d.cursor", "d.mark"];
/**
 * System dimensions used internally
 */
export declare const SYSTEM_DIMENSIONS: readonly ["d.system", "d.dims", "d.cursor-cargo", "d.cellcreation"];
/**
 * Creates a blank ZigZag space with standard dimensions
 * This matches the original GzigZag startup configuration
 */
export declare function createBlankSpace(): ZZSpace;
/**
 * Creates a new cell in the space - helper for cleaner code
 */
export declare function createCell(space: ZZSpace, text?: string): ZZCell;
//# sourceMappingURL=index.d.ts.map