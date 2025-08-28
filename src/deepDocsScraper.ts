import axios from 'axios';
import * as cheerio from 'cheerio';
import { ApiCacheManager, CachedApiData } from './apiCacheManager';

export interface DeepDocResult {
    title: string;
    framework: string;
    type: string; // 'class', 'protocol', 'struct', 'enum', 'function'
    description: string;
    url: string;
    availability: string;
    isDeprecated: boolean;
    deprecationInfo?: string;
    codeExamples: string[];
    relatedApis: string[];
    properties: PropertyInfo[];
    methods: MethodInfo[];
    fromCache?: boolean;
}

interface PropertyInfo {
    name: string;
    type: string;
    description: string;
    isDeprecated: boolean;
}

interface MethodInfo {
    name: string;
    signature: string;
    description: string;
    parameters: ParameterInfo[];
    returnType: string;
    isDeprecated: boolean;
}

interface ParameterInfo {
    name: string;
    type: string;
    description: string;
}

export class DeepDocsScraper {
    private baseUrl = 'https://developer.apple.com';
    private cache = new Map<string, DeepDocResult>();
    private cacheManager: ApiCacheManager;
    
    constructor(cacheManager: ApiCacheManager) {
        this.cacheManager = cacheManager;
    }
    
    async scrapeApiInDepth(apiName: string, framework?: string): Promise<DeepDocResult[]> {
        console.log(`🔍 Deep scraping: ${apiName} ${framework ? `(${framework})` : ''}`);
        
        const results: DeepDocResult[] = [];
        
        // Step 1: Check cache first
        if (framework) {
            const cachedResult = await this.getCachedResult(apiName, framework);
            if (cachedResult) {
                console.log(`📚 Found ${apiName} in cache`);
                results.push(cachedResult);
                
                // Still look for related APIs from cache
                const relatedCached = await this.searchRelatedInCache(cachedResult.relatedApis, framework);
                results.push(...relatedCached);
                
                // If we have good cached results, return them
                if (results.length > 0) {
                    return results;
                }
            }
        }
        
        // Step 2: If not in cache, scrape from web
        const mainDoc = await this.findMainApiPage(apiName, framework);
        if (mainDoc) {
            results.push(mainDoc);
            
            // Cache the main result
            await this.cacheResult(mainDoc);
            
            // Step 3: Scrape related APIs mentioned on the main page
            const relatedApis = await this.scrapeRelatedApis(mainDoc.url);
            
            // Step 4: Deep scrape each related API (limit to prevent infinite recursion)
            for (const relatedApi of relatedApis.slice(0, 10)) {
                // Check cache first for related APIs
                let relatedDoc: DeepDocResult | null = null;
                
                if (framework) {
                    relatedDoc = await this.getCachedResult(relatedApi, framework);
                }
                
                if (!relatedDoc) {
                    relatedDoc = await this.scrapeApiPage(relatedApi);
                    if (relatedDoc) {
                        await this.cacheResult(relatedDoc);
                    }
                }
                
                if (relatedDoc) {
                    results.push(relatedDoc);
                }
            }
        }
        
        return results;
    }
    
    private async findMainApiPage(apiName: string, framework?: string): Promise<DeepDocResult | null> {
        try {
            const searchUrl = `${this.baseUrl}/search/?q=${encodeURIComponent(apiName)}${framework ? `&framework=${framework.toLowerCase()}` : ''}`;
            const response = await axios.get(searchUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                },
                timeout: 10000
            });
            const $ = cheerio.load(response.data);
            
            // Find the most relevant result (usually first)
            const firstResult = $('.search-result').first();
            if (firstResult.length === 0) {
                return null;
            }
            
            const href = firstResult.find('a').attr('href');
            if (!href) {
                return null;
            }
            
            const url = href.startsWith('http') ? href : this.baseUrl + href;
            return await this.scrapeApiPage(url);
            
        } catch (error) {
            console.error(`Error finding main API page for ${apiName}:`, error);
            return null;
        }
    }
    
    private async scrapeApiPage(url: string): Promise<DeepDocResult | null> {
        if (this.cache.has(url)) {
            return this.cache.get(url)!;
        }
        
        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                },
                timeout: 10000
            });
            const $ = cheerio.load(response.data);
            
            const title = $('h1.title, h1').first().text().trim();
            const framework = $('.framework-name, .badge').first().text().trim() || this.extractFrameworkFromUrl(url);
            const type = $('.api-type, .declaration-type').first().text().trim() || 'class';
            const description = $('.description, .abstract, .summary').first().text().trim();
            const availability = $('.availability, .platform-info').first().text().trim() || 'iOS 13.0+';
            
            // Check for deprecation
            const isDeprecated = $('.deprecated, .deprecation-warning, [class*="deprecated"]').length > 0;
            const deprecationInfo = isDeprecated ? $('.deprecated, .deprecation-warning').first().text().trim() : undefined;
            
            // Extract code examples
            const codeExamples: string[] = [];
            $('pre code, .code-listing, .code-sample').each((_, elem) => {
                const code = $(elem).text().trim();
                if (code && code.length > 10) {
                    codeExamples.push(code);
                }
            });
            
            // Extract properties
            const properties: PropertyInfo[] = [];
            $('.properties-table tr, .property-list .property, .declaration-list .property').each((_, elem) => {
                const name = $(elem).find('.property-name, .name, .declaration-name').first().text().trim();
                const type = $(elem).find('.property-type, .type, .declaration-type').first().text().trim();
                const desc = $(elem).find('.property-description, .description, .summary').first().text().trim();
                const deprecated = $(elem).find('.deprecated, [class*="deprecated"]').length > 0;
                
                if (name && name.length < 100) { // Reasonable name length
                    properties.push({ name, type, description: desc, isDeprecated: deprecated });
                }
            });
            
            // Extract methods
            const methods: MethodInfo[] = [];
            $('.methods-table tr, .method-list .method, .declaration-list .method').each((_, elem) => {
                const name = $(elem).find('.method-name, .name, .declaration-name').first().text().trim();
                const signature = $(elem).find('.method-signature, .signature, .declaration').first().text().trim();
                const desc = $(elem).find('.method-description, .description, .summary').first().text().trim();
                const returnType = $(elem).find('.return-type').first().text().trim() || 'Void';
                const deprecated = $(elem).find('.deprecated, [class*="deprecated"]').length > 0;
                
                if (name && name.length < 100) { // Reasonable name length
                    methods.push({
                        name,
                        signature,
                        description: desc,
                        parameters: [], // Could be enhanced to parse parameters
                        returnType,
                        isDeprecated: deprecated
                    });
                }
            });
            
            // Extract related APIs
            const relatedApis: string[] = [];
            $('.related-links a, .see-also a, .topics a, .relationships a').each((_, elem) => {
                const href = $(elem).attr('href');
                if (href && href.includes('/documentation/')) {
                    const fullUrl = href.startsWith('http') ? href : this.baseUrl + href;
                    relatedApis.push(fullUrl);
                }
            });
            
            const result: DeepDocResult = {
                title: title || 'Unknown API',
                framework: this.capitalizeFramework(framework),
                type,
                description: description || 'No description available',
                url,
                availability,
                isDeprecated,
                deprecationInfo,
                codeExamples: codeExamples.slice(0, 3), // Limit code examples
                relatedApis: [...new Set(relatedApis)].slice(0, 10), // Remove duplicates and limit
                properties: properties.slice(0, 10), // Limit properties
                methods: methods.slice(0, 10) // Limit methods
            };
            
            this.cache.set(url, result);
            return result;
            
        } catch (error) {
            console.error(`Error scraping API page ${url}:`, error);
            return null;
        }
    }
    
    private async scrapeRelatedApis(mainUrl: string): Promise<string[]> {
        try {
            const response = await axios.get(mainUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                },
                timeout: 8000
            });
            const $ = cheerio.load(response.data);
            
            const relatedUrls: string[] = [];
            
            // Find related APIs in various sections
            $('.related-links a, .see-also a, .topics a, .relationships a').each((_, elem) => {
                const href = $(elem).attr('href');
                if (href && href.includes('/documentation/')) {
                    const fullUrl = href.startsWith('http') ? href : this.baseUrl + href;
                    relatedUrls.push(fullUrl);
                }
            });
            
            return [...new Set(relatedUrls)].slice(0, 5); // Remove duplicates and limit
            
        } catch (error) {
            console.error(`Error scraping related APIs from ${mainUrl}:`, error);
            return [];
        }
    }
    
    private extractFrameworkFromUrl(url: string): string {
        const match = url.match(/\/documentation\/([^\/]+)/);
        return match ? match[1] : 'Unknown';
    }
    
    private capitalizeFramework(framework: string): string {
        const mapping: { [key: string]: string } = {
            'foundation': 'Foundation',
            'uikit': 'UIKit',
            'swiftui': 'SwiftUI',
            'combine': 'Combine',
            'coredata': 'CoreData',
            'avfoundation': 'AVFoundation',
            'mapkit': 'MapKit',
            'pencilkit': 'PencilKit',
            'arkit': 'ARKit',
            'coreml': 'CoreML'
        };
        return mapping[framework.toLowerCase()] || framework;
    }

    // Cache management methods
    private async getCachedResult(apiName: string, framework: string): Promise<DeepDocResult | null> {
        try {
            const cachedData = await this.cacheManager.getCachedApi(apiName, framework);
            if (cachedData) {
                return this.convertCachedToDeepDoc(cachedData);
            }
            return null;
        } catch (error) {
            console.error('Error retrieving from cache:', error);
            return null;
        }
    }

    private async searchRelatedInCache(relatedApis: string[], framework: string): Promise<DeepDocResult[]> {
        const results: DeepDocResult[] = [];
        
        for (const apiName of relatedApis.slice(0, 5)) {
            const cached = await this.getCachedResult(apiName, framework);
            if (cached) {
                results.push(cached);
            }
        }
        
        return results;
    }

    private async cacheResult(result: DeepDocResult): Promise<void> {
        try {
            const cacheData: Omit<CachedApiData, 'cachedAt' | 'lastAccessed' | 'accessCount'> = {
                apiName: result.title,
                framework: result.framework,
                documentation: result.description,
                properties: result.properties.map(p => `${p.name}: ${p.type}`),
                methods: result.methods.map(m => `${m.name}(${m.parameters.map(p => p.name).join(', ')}): ${m.returnType}`),
                examples: result.codeExamples,
                relatedApis: result.relatedApis,
                deprecationInfo: result.isDeprecated ? {
                    isDeprecated: true,
                    reason: result.deprecationInfo || 'This API is deprecated',
                    alternative: 'Check Apple documentation for alternatives'
                } : undefined
            };

            await this.cacheManager.cacheApi(cacheData);
        } catch (error) {
            console.error('Error caching result:', error);
        }
    }

    private convertCachedToDeepDoc(cached: CachedApiData): DeepDocResult {
        return {
            title: cached.apiName,
            framework: cached.framework,
            type: 'class', // Default type for cached items
            description: cached.documentation,
            url: '#cached',
            availability: 'Available',
            isDeprecated: cached.deprecationInfo?.isDeprecated || false,
            deprecationInfo: cached.deprecationInfo?.reason,
            codeExamples: cached.examples,
            relatedApis: cached.relatedApis,
            properties: this.parsePropertiesFromCache(cached.properties),
            methods: this.parseMethodsFromCache(cached.methods),
            fromCache: true
        };
    }

    private parsePropertiesFromCache(properties: string[]): PropertyInfo[] {
        return properties.map(prop => {
            const [name, type] = prop.split(': ');
            return {
                name: name || prop,
                type: type || 'Unknown',
                description: '',
                isDeprecated: false
            };
        });
    }

    private parseMethodsFromCache(methods: string[]): MethodInfo[] {
        return methods.map(method => {
            const [signature, returnType] = method.split('): ');
            const [name, params] = signature.split('(');
            
            return {
                name: name || method,
                signature: signature || method,
                description: '',
                parameters: params ? params.split(', ').map(p => ({
                    name: p,
                    type: 'Unknown',
                    description: ''
                })) : [],
                returnType: returnType || 'Void',
                isDeprecated: false
            };
        });
    }
    
    clearCache(): void {
        this.cache.clear();
    }
}
