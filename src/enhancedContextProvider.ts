import { AppleDocsSearcher } from './appleDocsSearcher';
import { IntelligentApiMapper } from './intelligentApiMapper';
import { DeepDocsScraper, DeepDocResult } from './deepDocsScraper';

export interface EnhancedRAGContext {
    originalPrompt: string;
    detectedIntent: string;
    expandedApis: string[];
    deepDocumentation: DeepDocResult[];
    enhancedPrompt: string;
    cacheKey: string;
}

export class EnhancedContextProvider {
    private apiMapper = new IntelligentApiMapper();
    private deepScraper = new DeepDocsScraper();
    private contextCache = new Map<string, EnhancedRAGContext>();
    
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
        
        const result: EnhancedRAGContext = {
            originalPrompt,
            detectedIntent,
            expandedApis,
            deepDocumentation,
            enhancedPrompt,
            cacheKey
        };
        
        // Cache the result
        this.contextCache.set(cacheKey, result);
        
        console.log(`✅ RAG enhancement complete! Found ${deepDocumentation.length} relevant APIs`);
        
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
        
        // Add comprehensive API documentation
        contextSections.push(`📚 **Relevant Apple API Documentation** (${documentation.length} APIs):`);
        
        for (const doc of documentation.slice(0, 10)) { // Limit for prompt size
            const deprecationWarning = doc.isDeprecated ? 
                `⚠️ **DEPRECATED** - ${doc.deprecationInfo}` : 
                '✅ **Current API**';
            
            contextSections.push(`
### ${doc.title} (${doc.framework})
**Type**: ${doc.type} | **Availability**: ${doc.availability}
${deprecationWarning}

**Description**: ${doc.description}

${doc.codeExamples.length > 0 ? `**Code Example**:\n\`\`\`swift\n${doc.codeExamples[0].substring(0, 300)}\n\`\`\`` : ''}

${doc.properties.length > 0 ? `**Key Properties**: ${doc.properties.slice(0, 3).map(p => `${p.name}: ${p.type}`).join(', ')}` : ''}

${doc.methods.length > 0 ? `**Key Methods**: ${doc.methods.slice(0, 3).map(m => m.name).join(', ')}` : ''}

[📖 Documentation](${doc.url})
`);
        }
        
        // Add intelligent guidance based on intent
        const guidance = this.getIntentSpecificGuidance(intent);
        contextSections.push(`💡 **Guidance**: ${guidance}`);
        
        const enhancedPrompt = `${originalPrompt}

---
## 🤖 ENHANCED CONTEXT FOR COPILOT
${contextSections.join('\n\n')}

---
**Instructions**: Use this comprehensive Apple API documentation to provide accurate, up-to-date code solutions. Prefer non-deprecated APIs, include proper imports, and provide working code examples with the user's specific requirements.

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
