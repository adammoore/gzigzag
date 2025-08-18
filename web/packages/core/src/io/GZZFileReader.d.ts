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
export declare class GZZFileReader {
    private cellMapping;
    private errors;
    private warnings;
    loadZDirectory(files: FileList | File[]): Promise<GZZImportResult>;
    private parseZDirectoryFiles;
    private groupFilesByCellDirectory;
    private extractCellIdFromPath;
    private parseCellDirectory;
    private parseConnectionFile;
    private generateModernId;
    /**
     * WORKING VERSION: Create modern space using your existing pattern
     */
    private createModernSpace;
    private readTextFile;
    private generateStats;
    private reset;
}
export declare function loadGZZFiles(files: FileList | File[]): Promise<GZZImportResult>;
//# sourceMappingURL=GZZFileReader.d.ts.map