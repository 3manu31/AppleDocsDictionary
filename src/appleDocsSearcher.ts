import axios from 'axios';
import * as cheerio from 'cheerio';

export interface DocResult {
    title: string;
    description: string;
    url: string;
    framework: string;
    apiType: string;
    availability: string;
    isDeprecated: boolean;
    content?: string;
}

export interface FrameworkInfo {
    name: string;
    description: string;
    platforms: string[];
    sdkVersion: string;
}

export class AppleDocsSearcher {
    private readonly baseUrl = 'https://developer.apple.com/documentation/';
    private readonly searchUrl = 'https://developer.apple.com/search/';
    private cache = new Map<string, DocResult[]>();

    async searchDocumentation(query: string, framework?: string, limit: number = 10): Promise<DocResult[]> {
        const cacheKey = `${query}-${framework || 'all'}-${limit}`;
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey)!;
        }

        try {
            const results = await this.performSearch(query, framework, limit);
            this.cache.set(cacheKey, results);
            return results;
        } catch (error) {
            console.error('Error searching Apple documentation:', error);
            return [];
        }
    }

    private async performSearch(query: string, framework?: string, limit: number = 10): Promise<DocResult[]> {
        const searchParams = new URLSearchParams({
            q: query,
            type: 'documentation'
        });

        if (framework) {
            searchParams.append('framework', framework.toLowerCase());
        }

        const searchUrl = `${this.searchUrl}?${searchParams.toString()}`;
        
        try {
            const response = await axios.get(searchUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                },
                timeout: 10000
            });

            return this.parseSearchResults(response.data, limit);
        } catch (error) {
            // Fallback to direct documentation search
            return this.searchDirectDocumentation(query, framework, limit);
        }
    }

    private async searchDirectDocumentation(query: string, framework?: string, limit: number = 10): Promise<DocResult[]> {
        const frameworks = framework ? [framework] : ['foundation', 'uikit', 'swiftui', 'combine', 'coredata'];
        const results: DocResult[] = [];

        for (const fw of frameworks) {
            if (results.length >= limit) break;

            try {
                const frameworkResults = await this.searchFrameworkDocs(fw, query, limit - results.length);
                results.push(...frameworkResults);
            } catch (error) {
                console.error(`Error searching ${fw} documentation:`, error);
            }
        }

        return results.slice(0, limit);
    }

    private async searchFrameworkDocs(framework: string, query: string, limit: number): Promise<DocResult[]> {
        const frameworkUrl = `${this.baseUrl}${framework.toLowerCase()}`;
        
        try {
            const response = await axios.get(frameworkUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                },
                timeout: 8000
            });

            const $ = cheerio.load(response.data);
            const results: DocResult[] = [];

            // Parse framework page for relevant APIs
            $('.symbol-name, .api-name, .declaration-name').each((i, elem) => {
                if (results.length >= limit) return false;

                const title = $(elem).text().trim();
                if (title.toLowerCase().includes(query.toLowerCase())) {
                    const link = $(elem).closest('a');
                    const href = link.attr('href');
                    const description = link.find('.description, .summary').text().trim() || 
                                     link.siblings('.description, .summary').text().trim();

                    if (href && title) {
                        results.push({
                            title,
                            description,
                            url: href.startsWith('http') ? href : `https://developer.apple.com${href}`,
                            framework: this.capitalizeFramework(framework),
                            apiType: this.determineApiType(title, description),
                            availability: 'iOS 13.0+', // Default, would need more parsing
                            isDeprecated: description.toLowerCase().includes('deprecated')
                        });
                    }
                }
            });

            return results;
        } catch (error) {
            console.error(`Error searching ${framework} docs:`, error);
            return [];
        }
    }

    private parseSearchResults(html: string, limit: number): DocResult[] {
        const $ = cheerio.load(html);
        const results: DocResult[] = [];

        $('.search-result, .result-item, .documentation-result').each((i, elem) => {
            if (results.length >= limit) return false;

            const $elem = $(elem);
            const title = $elem.find('.title, .result-title, h3').first().text().trim();
            const description = $elem.find('.description, .summary, .result-description').first().text().trim();
            const url = $elem.find('a').first().attr('href');
            const framework = $elem.find('.framework, .badge').first().text().trim() || 'Unknown';

            if (title && url) {
                results.push({
                    title,
                    description,
                    url: url.startsWith('http') ? url : `https://developer.apple.com${url}`,
                    framework: this.capitalizeFramework(framework),
                    apiType: this.determineApiType(title, description),
                    availability: this.extractAvailability(description),
                    isDeprecated: description.toLowerCase().includes('deprecated')
                });
            }
        });

        return results;
    }

    async getDetailedDocumentation(url: string): Promise<string> {
        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                },
                timeout: 10000
            });

            const $ = cheerio.load(response.data);
            
            // Extract main content
            const content = $('.documentation-content, .content, .main-content').first();
            const title = $('h1').first().text().trim();
            const overview = $('.overview, .summary').first().text().trim();
            const declaration = $('.declaration, .code-block').first().text().trim();
            const parameters = $('.parameters .parameter').map((i, elem) => {
                const name = $(elem).find('.parameter-name').text().trim();
                const desc = $(elem).find('.parameter-description').text().trim();
                return `${name}: ${desc}`;
            }).get().join('\n');

            return [
                title,
                overview,
                declaration ? `\nDeclaration:\n${declaration}` : '',
                parameters ? `\nParameters:\n${parameters}` : ''
            ].filter(Boolean).join('\n\n');

        } catch (error) {
            console.error('Error fetching detailed documentation:', error);
            return 'Unable to fetch detailed documentation';
        }
    }

    detectFrameworksInCode(code: string): string[] {
        const frameworks: string[] = [];
        const frameworkPatterns = {
            'SwiftUI': /import\s+SwiftUI|@State|@Binding|@ObservedObject|View\s*{|VStack|HStack|ZStack/,
            'UIKit': /import\s+UIKit|UIViewController|UIView|UIButton|UILabel|viewDidLoad/,
            'Foundation': /import\s+Foundation|NSString|NSArray|NSDate|UserDefaults/,
            'Combine': /import\s+Combine|@Published|PassthroughSubject|CurrentValueSubject|AnyCancellable/,
            'CoreData': /import\s+CoreData|NSManagedObject|NSFetchRequest|NSPersistentContainer/,
            'AVFoundation': /import\s+AVFoundation|AVPlayer|AVAudioSession|CMTime/,
            'MapKit': /import\s+MapKit|MKMapView|CLLocationManager|MKAnnotation/,
            'NetworkExtension': /import\s+NetworkExtension|NEVPNManager|NEPacketTunnelProvider/
        };

        for (const [framework, pattern] of Object.entries(frameworkPatterns)) {
            if (pattern.test(code)) {
                frameworks.push(framework);
            }
        }

        return frameworks;
    }

    private capitalizeFramework(framework: string): string {
        const mapping: { [key: string]: string } = {
            'foundation': 'Foundation',
            'uikit': 'UIKit',
            'swiftui': 'SwiftUI',
            'combine': 'Combine',
            'coredata': 'CoreData',
            'avfoundation': 'AVFoundation',
            'mapkit': 'MapKit'
        };
        return mapping[framework.toLowerCase()] || framework;
    }

    private determineApiType(title: string, description: string): string {
        if (title.includes('Protocol') || description.includes('protocol')) return 'Protocol';
        if (title.includes('Enum') || description.includes('enumeration')) return 'Enum';
        if (title.includes('Struct') || description.includes('structure')) return 'Struct';
        if (title.includes('Class') || description.includes('class')) return 'Class';
        if (title.includes('()') || description.includes('method')) return 'Method';
        if (description.includes('property')) return 'Property';
        return 'API';
    }

    private extractAvailability(description: string): string {
        const availabilityMatch = description.match(/iOS\s+(\d+\.\d+)\+?|macOS\s+(\d+\.\d+)\+?|watchOS\s+(\d+\.\d+)\+?/);
        return availabilityMatch ? availabilityMatch[0] : 'iOS 13.0+';
    }

    clearCache(): void {
        this.cache.clear();
    }
}
