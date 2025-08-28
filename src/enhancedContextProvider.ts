import { AppleDocsSearcher } from './appleDocsSearcher';
import { IntelligentApiMapper } from './intelligentApiMapper';
import { DeepDocsScraper, DeepDocResult } from './deepDocsScraper';
import { ApiCacheManager } from './apiCacheManager';

export interface EnhancedRAGContext {
    originalPrompt: string;
    detectedIntent: string;
    expandedApis: string[];
    deepDocumentation: DeepDocResult[];
    enhancedPrompt: string;
    cacheKey: string;
    cacheStats: {
        fromCache: number;
        fromWeb: number;
        totalApis: number;
    };
}

export class EnhancedContextProvider {
    private apiMapper = new IntelligentApiMapper();
    private deepScraper: DeepDocsScraper;
    private contextCache = new Map<string, EnhancedRAGContext>();
    private cacheManager: ApiCacheManager;
    
    constructor(cacheManager: ApiCacheManager) {
        this.cacheManager = cacheManager;
        this.deepScraper = new DeepDocsScraper(cacheManager);
    }
    
    async enhancePromptWithIntelligentRAG(
        originalPrompt: string, 
        codeContext?: string,
        triggerPhrase?: string
    ): Promise<EnhancedRAGContext> {
        
        const cacheKey = this.generateCacheKey(originalPrompt, codeContext);
        
        // Check cache first
        if (this.contextCache.has(cacheKey)) {
            console.log('🎯 Using cached RAG context');
            return this.contextCache.get(cacheKey)!;
        }
        
        console.log('🧠 Starting intelligent RAG enhancement...');
        
        // Step 1: Detect user intent and expand API search
        const detectedIntent = this.detectUserIntent(originalPrompt);
        const expandedApis = this.apiMapper.expandApiSearch(originalPrompt);
        
        console.log(`🎯 Detected intent: ${detectedIntent}`);
        console.log(`📚 Expanded APIs: ${expandedApis.join(', ')}`);
        
        // Step 2: Deep scrape all relevant APIs
        const deepDocumentation: DeepDocResult[] = [];
        
        for (const api of expandedApis.slice(0, 8)) { // Limit to prevent too many requests
            console.log(`🔍 Deep scraping: ${api}`);
            try {
                const apiDocs = await this.deepScraper.scrapeApiInDepth(api);
                deepDocumentation.push(...apiDocs);
                
                // Add small delay to be respectful to Apple's servers
                await this.delay(200);
            } catch (error) {
                console.error(`Error scraping ${api}:`, error);
            }
        }
        
        // Step 3: Generate enhanced prompt with comprehensive context
        const enhancedPrompt = this.generateEnhancedPrompt(
            originalPrompt, 
            detectedIntent, 
            deepDocumentation, 
            codeContext
        );
        
        // Calculate cache statistics
        const fromCache = deepDocumentation.filter(doc => doc.fromCache).length;
        const fromWeb = deepDocumentation.length - fromCache;
        
        const result: EnhancedRAGContext = {
            originalPrompt,
            detectedIntent,
            expandedApis,
            deepDocumentation,
            enhancedPrompt,
            cacheKey,
            cacheStats: {
                fromCache,
                fromWeb,
                totalApis: deepDocumentation.length
            }
        };
        
        // Cache the result
        this.contextCache.set(cacheKey, result);
        
        console.log(`✅ RAG enhancement complete! Found ${deepDocumentation.length} relevant APIs (${fromCache} from cache, ${fromWeb} from web)`);
        
        return result;
    }
    
    private detectUserIntent(prompt: string): string {
        const lowerPrompt = prompt.toLowerCase();
        
        if (lowerPrompt.includes('add') || lowerPrompt.includes('implement')) {
            return 'FEATURE_IMPLEMENTATION';
        } else if (lowerPrompt.includes('fix') || lowerPrompt.includes('bug') || lowerPrompt.includes('error')) {
            return 'BUG_FIXING';
        } else if (lowerPrompt.includes('optimize') || lowerPrompt.includes('improve') || lowerPrompt.includes('performance')) {
            return 'OPTIMIZATION';
        } else if (lowerPrompt.includes('migrate') || lowerPrompt.includes('update') || lowerPrompt.includes('deprecated')) {
            return 'API_MIGRATION';
        } else if (lowerPrompt.includes('how') || lowerPrompt.includes('example') || lowerPrompt.includes('tutorial')) {
            return 'LEARNING';
        } else {
            return 'GENERAL_DEVELOPMENT';
        }
    }
    
    private generateEnhancedPrompt(
        originalPrompt: string, 
        intent: string, 
        documentation: DeepDocResult[], 
        codeContext?: string
    ): string {
        const contextSections: string[] = [];
        
        // Add user intent context
        contextSections.push(`🎯 **User Intent**: ${intent}`);
        
        // Add existing code context if available
        if (codeContext) {
            const truncatedContext = codeContext.length > 1000 ? 
                codeContext.substring(0, 1000) + '...' : 
                codeContext;
            contextSections.push(`📝 **Current Code Context**:\n\`\`\`swift\n${truncatedContext}\n\`\`\``);
        }
        
        // Separate deprecated and current APIs
        const deprecatedApis = documentation.filter(doc => doc.isDeprecated);
        const currentApis = documentation.filter(doc => !doc.isDeprecated);
        
        // Add STRICT deprecation warnings
        if (deprecatedApis.length > 0) {
            contextSections.push(`🚫 **STRICTLY FORBIDDEN DEPRECATED APIs** - DO NOT USE THESE:
${deprecatedApis.map(doc => `
- **${doc.title}** (${doc.framework}) - ${doc.deprecationInfo}
  ❌ BANNED: Do not include this API in any code suggestions
  🔄 Use modern alternatives instead`).join('\n')}

⚠️ **CRITICAL INSTRUCTION**: If the user's request would require any of the above deprecated APIs, you MUST suggest modern alternatives and explain why the deprecated API should be avoided.`);
        }
        
        // Add current/preferred APIs
        contextSections.push(`✅ **PREFERRED CURRENT APIs** - Use these instead (${currentApis.length} APIs):`);
        
        for (const doc of currentApis.slice(0, 8)) { // Focus on current APIs
            contextSections.push(`
### ${doc.title} (${doc.framework}) ✅
**Type**: ${doc.type} | **Availability**: ${doc.availability}
**Status**: Current and recommended

**Description**: ${doc.description}

${doc.codeExamples.length > 0 ? `**Code Example**:\n\`\`\`swift\n${doc.codeExamples[0].substring(0, 300)}\n\`\`\`` : ''}

${doc.properties.length > 0 ? `**Key Properties**: ${doc.properties.slice(0, 3).map(p => `${p.name}: ${p.type}`).join(', ')}` : ''}

${doc.methods.length > 0 ? `**Key Methods**: ${doc.methods.slice(0, 3).map(m => m.name).join(', ')}` : ''}

[📖 Documentation](${doc.url})
`);
        }
        
        // Add enhanced guidance with deprecation focus
        const guidance = this.getIntentSpecificGuidance(intent);
        const deprecationGuidance = this.getDeprecationGuidance(deprecatedApis, currentApis);
        contextSections.push(`💡 **Guidance**: ${guidance}\n\n${deprecationGuidance}`);
        
        const enhancedPrompt = `${originalPrompt}

---
## 🤖 ENHANCED CONTEXT FOR COPILOT WITH DEPRECATION CONTROL
${contextSections.join('\n\n')}

---
## 🚫 STRICT REQUIREMENTS:
1. **NEVER suggest deprecated APIs** - Always use current alternatives
2. **If deprecated APIs are mentioned in user's code**, suggest modern replacements
3. **Include proper imports** for all suggested APIs
4. **Add availability checks** when targeting older iOS versions
5. **Prioritize current APIs** from the "PREFERRED CURRENT APIs" section above

**Original Request**: ${originalPrompt}`;
        
        return enhancedPrompt;
    }
    
    private getIntentSpecificGuidance(intent: string): string {
        const guidance: { [key: string]: string } = {
            'FEATURE_IMPLEMENTATION': 'Focus on providing complete implementation with proper setup, delegate methods, and best practices.',
            'BUG_FIXING': 'Look for common issues, deprecated methods, and suggest modern alternatives.',
            'OPTIMIZATION': 'Recommend performance best practices and efficient API usage patterns.',
            'API_MIGRATION': 'Highlight deprecated APIs and provide migration paths to current alternatives.',
            'LEARNING': 'Provide educational explanations with step-by-step examples.',
            'GENERAL_DEVELOPMENT': 'Offer comprehensive solutions with multiple approaches when applicable.'
        };
        
        return guidance[intent] || 'Provide clear, practical solutions with proper error handling.';
    }
    
    private getDeprecationGuidance(deprecatedApis: DeepDocResult[], currentApis: DeepDocResult[]): string {
        if (deprecatedApis.length === 0) {
            return `🎉 **Excellent!** All suggested APIs are current and up-to-date. Use these confidently in your implementation.`;
        }
        
        const migrationMap = this.createDeprecationMigrationMap();
        let guidance = `🚨 **DEPRECATION ALERT**: Found ${deprecatedApis.length} deprecated API(s). Here are the modern alternatives:\n\n`;
        
        for (const deprecated of deprecatedApis) {
            const alternatives = migrationMap.get(deprecated.title) || 
                currentApis.filter(api => api.framework === deprecated.framework).slice(0, 2);
            
            guidance += `❌ **${deprecated.title}** → `;
            if (alternatives.length > 0) {
                guidance += `✅ **${alternatives.map(alt => alt.title).join('** or **')}**\n`;
            } else {
                guidance += `✅ Check Apple's documentation for current replacement\n`;
            }
        }
        
        guidance += `\n🔄 **Migration Strategy**: Always replace deprecated APIs with their modern counterparts to ensure future compatibility and access to latest features.`;
        
        return guidance;
    }
    
    private createDeprecationMigrationMap(): Map<string, DeepDocResult[]> {
        // Common deprecated API → modern API mappings
        // This could be expanded with more comprehensive mappings
        return new Map([
            // Navigation
            ['NavigationView', []], // Will suggest NavigationStack from current APIs
            ['UINavigationController', []], // Will suggest SwiftUI alternatives
            
            // UI Components
            ['UITableViewController', []], // Will suggest modern table implementations
            ['UICollectionViewController', []], // Will suggest modern collection implementations
            
            // Networking
            ['NSURLConnection', []], // Will suggest URLSession
            
            // This map can be expanded as we discover more deprecated APIs
        ]);
    }
    
    private generateCacheKey(prompt: string, codeContext?: string): string {
        const content = prompt + (codeContext || '');
        return Buffer.from(content).toString('base64').substring(0, 32);
    }
    
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    clearCache(): void {
        this.contextCache.clear();
    }
}
