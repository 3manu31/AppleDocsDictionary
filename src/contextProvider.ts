import * as vscode from 'vscode';
import { AppleDocsSearcher, DocResult } from './appleDocsSearcher';

export interface EnhancedContext {
    originalPrompt: string;
    relevantDocs: DocResult[];
    detectedFrameworks: string[];
    enhancedPrompt: string;
    suggestions: string[];
}

export class AppleDocsContextProvider {
    private docsSearcher: AppleDocsSearcher;
    private config: vscode.WorkspaceConfiguration;

    constructor() {
        this.docsSearcher = new AppleDocsSearcher();
        this.config = vscode.workspace.getConfiguration('appleDocsRag');
    }

    async enhancePromptWithDocs(originalPrompt: string, codeContext?: string): Promise<EnhancedContext> {
        // Detect frameworks from code context
        const detectedFrameworks = codeContext ? 
            this.docsSearcher.detectFrameworksInCode(codeContext) : [];

        // Get preferred frameworks from config
        const preferredFrameworks: string[] = this.config.get('preferredFrameworks', []);
        const frameworksToSearch = [...new Set([...detectedFrameworks, ...preferredFrameworks])];

        // Extract API-related keywords from the prompt
        const apiKeywords = this.extractApiKeywords(originalPrompt);
        
        // Search for relevant documentation
        const relevantDocs = await this.searchRelevantDocs(apiKeywords, frameworksToSearch);

        // Generate suggestions based on found docs
        const suggestions = this.generateSuggestions(relevantDocs, originalPrompt);

        // Create enhanced prompt
        const enhancedPrompt = this.buildEnhancedPrompt(originalPrompt, relevantDocs, detectedFrameworks);

        return {
            originalPrompt,
            relevantDocs,
            detectedFrameworks,
            enhancedPrompt,
            suggestions
        };
    }

    async searchDocsForChatResponse(query: string, frameworks?: string[]): Promise<string> {
        const searchFrameworks = frameworks && frameworks.length > 0 ? frameworks : 
            this.config.get('preferredFrameworks', ['SwiftUI', 'UIKit', 'Foundation']);

        let allResults: DocResult[] = [];

        // Search each framework
        for (const framework of searchFrameworks) {
            const results = await this.docsSearcher.searchDocumentation(query, framework, 3);
            allResults = allResults.concat(results);
        }

        // Remove duplicates and limit results
        const uniqueResults = this.removeDuplicateResults(allResults).slice(0, 8);

        if (uniqueResults.length === 0) {
            return `No Apple documentation found for "${query}". You may want to check the official Apple Developer documentation manually.`;
        }

        return this.formatDocsForChat(uniqueResults, query);
    }

    private async searchRelevantDocs(keywords: string[], frameworks: string[]): Promise<DocResult[]> {
        const allResults: DocResult[] = [];
        const maxResults = 5;

        for (const keyword of keywords.slice(0, 3)) { // Limit keywords to avoid too many requests
            for (const framework of frameworks.slice(0, 3)) { // Limit frameworks
                try {
                    const results = await this.docsSearcher.searchDocumentation(keyword, framework, 2);
                    allResults.push(...results);
                } catch (error) {
                    console.error(`Error searching docs for ${keyword} in ${framework}:`, error);
                }
            }
        }

        return this.removeDuplicateResults(allResults).slice(0, maxResults);
    }

    private extractApiKeywords(prompt: string): string[] {
        const keywords: string[] = [];
        
        // Common iOS/macOS API patterns
        const apiPatterns = [
            /\b([A-Z][a-z]+[A-Z][a-zA-Z]*)\b/g, // CamelCase (likely class/struct names)
            /\b([a-z]+(?:[A-Z][a-z]+)+)\b/g,     // camelCase (likely method names)
            /\b(UI[A-Z][a-zA-Z]*)\b/g,          // UIKit classes
            /\b(NS[A-Z][a-zA-Z]*)\b/g,          // Foundation classes
            /\b(CL[A-Z][a-zA-Z]*)\b/g,          // Core Location classes
            /\b(CA[A-Z][a-zA-Z]*)\b/g,          // Core Animation classes
            /\b(AV[A-Z][a-zA-Z]*)\b/g,          // AVFoundation classes
        ];

        for (const pattern of apiPatterns) {
            const matches = prompt.match(pattern);
            if (matches) {
                keywords.push(...matches);
            }
        }

        // Add general terms that might be relevant
        const generalTerms = prompt.match(/\b(view|controller|navigation|table|collection|animation|gesture|notification|data|network|image|video|audio|location|camera|sensor)\b/gi);
        if (generalTerms) {
            keywords.push(...generalTerms);
        }

        // Remove duplicates and common words
        return [...new Set(keywords)]
            .filter(keyword => keyword.length > 2)
            .filter(keyword => !['the', 'and', 'for', 'with', 'this', 'that'].includes(keyword.toLowerCase()));
    }

    private buildEnhancedPrompt(originalPrompt: string, docs: DocResult[], frameworks: string[]): string {
        if (docs.length === 0) {
            return originalPrompt;
        }

        let enhancement = `\n\n--- APPLE API CONTEXT ---\n`;
        enhancement += `Detected Frameworks: ${frameworks.join(', ')}\n\n`;
        enhancement += `Relevant Apple Documentation:\n`;

        for (const doc of docs) {
            enhancement += `\n## ${doc.title} (${doc.framework})\n`;
            enhancement += `${doc.description}\n`;
            enhancement += `URL: ${doc.url}\n`;
            enhancement += `Type: ${doc.apiType} | Available: ${doc.availability}\n`;
            
            if (doc.isDeprecated) {
                enhancement += `⚠️  DEPRECATED - Avoid using this API\n`;
            }
        }

        enhancement += `\n--- END CONTEXT ---\n\n`;
        enhancement += `Please use this Apple API documentation context to provide accurate, up-to-date suggestions. `;
        enhancement += `Prefer non-deprecated APIs and include proper import statements and availability checks when relevant.\n\n`;
        enhancement += `Original request: ${originalPrompt}`;

        return enhancement;
    }

    private generateSuggestions(docs: DocResult[], prompt: string): string[] {
        const suggestions: string[] = [];

        // Check for deprecated APIs
        const deprecatedAPIs = docs.filter(doc => doc.isDeprecated);
        if (deprecatedAPIs.length > 0) {
            suggestions.push(`⚠️ Found deprecated APIs: ${deprecatedAPIs.map(d => d.title).join(', ')}. Consider using newer alternatives.`);
        }

        // Suggest framework imports
        const frameworks = [...new Set(docs.map(doc => doc.framework))];
        if (frameworks.length > 0) {
            suggestions.push(`💡 You may need to import: ${frameworks.map(f => `import ${f}`).join(', ')}`);
        }

        // Suggest version considerations
        const availabilities = docs.map(doc => doc.availability).filter(Boolean);
        if (availabilities.length > 0) {
            suggestions.push(`📱 Consider availability requirements: ${[...new Set(availabilities)].join(', ')}`);
        }

        return suggestions;
    }

    private formatDocsForChat(docs: DocResult[], query: string): string {
        let response = `Found ${docs.length} relevant Apple API documentation entries for "${query}":\n\n`;

        for (const doc of docs) {
            response += `**${doc.title}** (${doc.framework})\n`;
            response += `${doc.description}\n`;
            response += `Type: ${doc.apiType} | Available: ${doc.availability}\n`;
            
            if (doc.isDeprecated) {
                response += `⚠️ **DEPRECATED** - Avoid using this API\n`;
            }
            
            response += `[Documentation](${doc.url})\n\n`;
        }

        response += `---\n`;
        response += `💡 **Tips:**\n`;
        response += `- Always check availability requirements for your target iOS/macOS version\n`;
        response += `- Avoid deprecated APIs when possible\n`;
        response += `- Include proper import statements for the frameworks you're using\n`;

        return response;
    }

    private removeDuplicateResults(results: DocResult[]): DocResult[] {
        const seen = new Set<string>();
        return results.filter(result => {
            const key = `${result.title}-${result.framework}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    updateConfiguration(): void {
        this.config = vscode.workspace.getConfiguration('appleDocsRag');
    }

    clearCache(): void {
        this.docsSearcher.clearCache();
    }
}
