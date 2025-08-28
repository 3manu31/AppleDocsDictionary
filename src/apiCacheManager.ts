import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface CachedApiData {
    apiName: string;
    framework: string;
    documentation: string;
    properties: string[];
    methods: string[];
    examples: string[];
    relatedApis: string[];
    deprecationInfo?: {
        isDeprecated: boolean;
        reason?: string;
        alternative?: string;
        deprecatedSince?: string;
    };
    cachedAt: number;
    lastAccessed: number;
    accessCount: number;
}

export interface CacheMetadata {
    totalApis: number;
    lastCleanup: number;
    cacheVersion: string;
    frameworks: string[];
}

export class ApiCacheManager {
    private cacheDir: string;
    private metadataFile: string;
    private readonly CACHE_VERSION = '1.0.0';
    private readonly MAX_CACHE_AGE_DAYS = 7; // Cache expires after 7 days
    private readonly MAX_CACHE_SIZE = 1000; // Maximum number of cached APIs

    constructor(context: vscode.ExtensionContext) {
        this.cacheDir = path.join(context.globalStorageUri.fsPath, 'api-cache');
        this.metadataFile = path.join(this.cacheDir, 'metadata.json');
        this.ensureCacheDirectory();
    }

    private ensureCacheDirectory(): void {
        if (!fs.existsSync(this.cacheDir)) {
            fs.mkdirSync(this.cacheDir, { recursive: true });
        }
    }

    private getCacheFilePath(apiName: string, framework: string): string {
        const sanitizedName = this.sanitizeFileName(`${framework}-${apiName}`);
        return path.join(this.cacheDir, `${sanitizedName}.json`);
    }

    private sanitizeFileName(name: string): string {
        return name.replace(/[^a-zA-Z0-9.-]/g, '_').toLowerCase();
    }

    private getMetadata(): CacheMetadata {
        try {
            if (fs.existsSync(this.metadataFile)) {
                const metadata = JSON.parse(fs.readFileSync(this.metadataFile, 'utf8'));
                return metadata;
            }
        } catch (error) {
            console.error('Error reading cache metadata:', error);
        }

        // Return default metadata
        return {
            totalApis: 0,
            lastCleanup: Date.now(),
            cacheVersion: this.CACHE_VERSION,
            frameworks: []
        };
    }

    private saveMetadata(metadata: CacheMetadata): void {
        try {
            fs.writeFileSync(this.metadataFile, JSON.stringify(metadata, null, 2));
        } catch (error) {
            console.error('Error saving cache metadata:', error);
        }
    }

    async cacheApi(apiData: Omit<CachedApiData, 'cachedAt' | 'lastAccessed' | 'accessCount'>): Promise<void> {
        try {
            const cachedData: CachedApiData = {
                ...apiData,
                cachedAt: Date.now(),
                lastAccessed: Date.now(),
                accessCount: 1
            };

            const filePath = this.getCacheFilePath(apiData.apiName, apiData.framework);
            fs.writeFileSync(filePath, JSON.stringify(cachedData, null, 2));

            // Update metadata
            const metadata = this.getMetadata();
            metadata.totalApis++;
            if (!metadata.frameworks.includes(apiData.framework)) {
                metadata.frameworks.push(apiData.framework);
            }
            this.saveMetadata(metadata);

            console.log(`✅ Cached API: ${apiData.framework}.${apiData.apiName}`);
        } catch (error) {
            console.error('Error caching API:', error);
        }
    }

    async getCachedApi(apiName: string, framework: string): Promise<CachedApiData | null> {
        try {
            const filePath = this.getCacheFilePath(apiName, framework);
            
            if (!fs.existsSync(filePath)) {
                return null;
            }

            const cachedData: CachedApiData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            
            // Check if cache is still valid
            const cacheAge = Date.now() - cachedData.cachedAt;
            const maxAge = this.MAX_CACHE_AGE_DAYS * 24 * 60 * 60 * 1000;
            
            if (cacheAge > maxAge) {
                // Cache is expired, remove it
                fs.unlinkSync(filePath);
                return null;
            }

            // Update access statistics
            cachedData.lastAccessed = Date.now();
            cachedData.accessCount++;
            fs.writeFileSync(filePath, JSON.stringify(cachedData, null, 2));

            console.log(`📚 Retrieved from cache: ${framework}.${apiName} (accessed ${cachedData.accessCount} times)`);
            return cachedData;
        } catch (error) {
            console.error('Error retrieving cached API:', error);
            return null;
        }
    }

    async searchCachedApis(searchTerm: string, framework?: string): Promise<CachedApiData[]> {
        const results: CachedApiData[] = [];
        
        try {
            const files = fs.readdirSync(this.cacheDir);
            const searchLower = searchTerm.toLowerCase();

            for (const file of files) {
                if (!file.endsWith('.json') || file === 'metadata.json') {
                    continue;
                }

                const filePath = path.join(this.cacheDir, file);
                const cachedData: CachedApiData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

                // Filter by framework if specified
                if (framework && cachedData.framework !== framework) {
                    continue;
                }

                // Search in API name, documentation, and methods
                const searchableText = [
                    cachedData.apiName,
                    cachedData.documentation,
                    ...cachedData.methods,
                    ...cachedData.properties
                ].join(' ').toLowerCase();

                if (searchableText.includes(searchLower)) {
                    results.push(cachedData);
                }
            }

            // Sort by access count and relevance
            results.sort((a, b) => {
                const aRelevance = a.apiName.toLowerCase().includes(searchLower) ? 2 : 1;
                const bRelevance = b.apiName.toLowerCase().includes(searchLower) ? 2 : 1;
                
                if (aRelevance !== bRelevance) {
                    return bRelevance - aRelevance;
                }
                
                return b.accessCount - a.accessCount;
            });

            console.log(`🔍 Found ${results.length} cached APIs matching "${searchTerm}"`);
            return results.slice(0, 10); // Return top 10 results
        } catch (error) {
            console.error('Error searching cached APIs:', error);
            return [];
        }
    }

    async getCacheStats(): Promise<{
        totalApis: number;
        frameworks: string[];
        diskUsage: string;
        oldestCache: string;
        newestCache: string;
        mostAccessedApi?: string;
    }> {
        const metadata = this.getMetadata();
        
        try {
            const files = fs.readdirSync(this.cacheDir);
            let totalSize = 0;
            let oldestTime = Date.now();
            let newestTime = 0;
            let mostAccessed = { api: '', count: 0 };

            for (const file of files) {
                if (!file.endsWith('.json') || file === 'metadata.json') {
                    continue;
                }

                const filePath = path.join(this.cacheDir, file);
                const stats = fs.statSync(filePath);
                totalSize += stats.size;

                const cachedData: CachedApiData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                
                if (cachedData.cachedAt < oldestTime) {
                    oldestTime = cachedData.cachedAt;
                }
                
                if (cachedData.cachedAt > newestTime) {
                    newestTime = cachedData.cachedAt;
                }

                if (cachedData.accessCount > mostAccessed.count) {
                    mostAccessed = {
                        api: `${cachedData.framework}.${cachedData.apiName}`,
                        count: cachedData.accessCount
                    };
                }
            }

            return {
                totalApis: metadata.totalApis,
                frameworks: metadata.frameworks,
                diskUsage: `${(totalSize / 1024 / 1024).toFixed(2)} MB`,
                oldestCache: new Date(oldestTime).toLocaleDateString(),
                newestCache: new Date(newestTime).toLocaleDateString(),
                mostAccessedApi: mostAccessed.api || undefined
            };
        } catch (error) {
            console.error('Error getting cache stats:', error);
            return {
                totalApis: 0,
                frameworks: [],
                diskUsage: '0 MB',
                oldestCache: 'N/A',
                newestCache: 'N/A'
            };
        }
    }

    async cleanupCache(): Promise<number> {
        let removedCount = 0;
        
        try {
            const files = fs.readdirSync(this.cacheDir);
            const maxAge = this.MAX_CACHE_AGE_DAYS * 24 * 60 * 60 * 1000;
            const now = Date.now();

            // Remove expired files
            for (const file of files) {
                if (!file.endsWith('.json') || file === 'metadata.json') {
                    continue;
                }

                const filePath = path.join(this.cacheDir, file);
                const cachedData: CachedApiData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                
                if (now - cachedData.cachedAt > maxAge) {
                    fs.unlinkSync(filePath);
                    removedCount++;
                }
            }

            // If still too many files, remove least accessed ones
            const remainingFiles = fs.readdirSync(this.cacheDir)
                .filter(file => file.endsWith('.json') && file !== 'metadata.json');

            if (remainingFiles.length > this.MAX_CACHE_SIZE) {
                const filesWithStats = remainingFiles.map(file => {
                    const filePath = path.join(this.cacheDir, file);
                    const cachedData: CachedApiData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                    return { file, ...cachedData };
                });

                // Sort by access count (ascending) and last accessed time
                filesWithStats.sort((a, b) => {
                    if (a.accessCount !== b.accessCount) {
                        return a.accessCount - b.accessCount;
                    }
                    return a.lastAccessed - b.lastAccessed;
                });

                const filesToRemove = filesWithStats.slice(0, remainingFiles.length - this.MAX_CACHE_SIZE);
                for (const fileData of filesToRemove) {
                    fs.unlinkSync(path.join(this.cacheDir, fileData.file));
                    removedCount++;
                }
            }

            // Update metadata
            const metadata = this.getMetadata();
            metadata.totalApis -= removedCount;
            metadata.lastCleanup = now;
            this.saveMetadata(metadata);

            console.log(`🧹 Cleaned up ${removedCount} cached APIs`);
            return removedCount;
        } catch (error) {
            console.error('Error cleaning up cache:', error);
            return 0;
        }
    }

    async clearCache(): Promise<void> {
        try {
            const files = fs.readdirSync(this.cacheDir);
            
            for (const file of files) {
                if (file.endsWith('.json')) {
                    fs.unlinkSync(path.join(this.cacheDir, file));
                }
            }

            // Reset metadata
            this.saveMetadata({
                totalApis: 0,
                lastCleanup: Date.now(),
                cacheVersion: this.CACHE_VERSION,
                frameworks: []
            });

            console.log('🗑️ Cache cleared successfully');
        } catch (error) {
            console.error('Error clearing cache:', error);
        }
    }
}
