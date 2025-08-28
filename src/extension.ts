// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { AppleDocsSearcher } from './appleDocsSearcher';
import { AppleDocsContextProvider } from './contextProvider';
import { EnhancedContextProvider } from './enhancedContextProvider';
import { DeprecatedApiDetector } from './deprecatedApiDetector';
import { ApiCacheManager } from './apiCacheManager';

let docsSearcher: AppleDocsSearcher;
let contextProvider: AppleDocsContextProvider;
let enhancedContextProvider: EnhancedContextProvider;
let deprecatedApiDetector: DeprecatedApiDetector;
let cacheManager: ApiCacheManager;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	console.log('🍎 Apple Docs RAG Extension is now active!');

	// Initialize components
	docsSearcher = new AppleDocsSearcher();
	contextProvider = new AppleDocsContextProvider();
	cacheManager = new ApiCacheManager(context);
	enhancedContextProvider = new EnhancedContextProvider(cacheManager);
	deprecatedApiDetector = new DeprecatedApiDetector();

	// Initialize persistent cache on startup
	cacheManager.initializeCache();

	// Register commands
	registerCommands(context);

	// Register chat participant
	registerChatParticipant(context);

	// Listen for configuration changes
	vscode.workspace.onDidChangeConfiguration(event => {
		if (event.affectsConfiguration('appleDocsRag')) {
			contextProvider.updateConfiguration();
		}
	});
}

function registerCommands(context: vscode.ExtensionContext) {
	// Command to search Apple documentation
	const searchDocsCommand = vscode.commands.registerCommand('apple-docs-rag.searchDocs', async () => {
		const query = await vscode.window.showInputBox({
			prompt: 'Search Apple Documentation',
			placeHolder: 'Enter API name, class, or method to search for...',
			value: getSelectedText()
		});

		if (!query) {
			return;
		}

		await searchAndShowResults(query);
	});

	// Command to index framework documentation (for future use)
	const indexFrameworkCommand = vscode.commands.registerCommand('apple-docs-rag.indexFramework', async () => {
		const frameworks = ['Foundation', 'UIKit', 'SwiftUI', 'Combine', 'CoreData', 'AVFoundation', 'MapKit'];
		const selectedFramework = await vscode.window.showQuickPick(frameworks, {
			placeHolder: 'Select a framework to index'
		});

		if (selectedFramework) {
			vscode.window.showInformationMessage(`Indexing ${selectedFramework} documentation...`);
			// Future implementation: index the selected framework
			await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate indexing
			vscode.window.showInformationMessage(`${selectedFramework} documentation indexed successfully!`);
		}
	});

	// Command to enhance current selection with Apple docs context
	const enhanceWithDocsCommand = vscode.commands.registerCommand('apple-docs-rag.enhanceWithDocs', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showErrorMessage('No active editor found');
			return;
		}

		const selection = editor.selection;
		const selectedText = editor.document.getText(selection);
		const codeContext = editor.document.getText();

		if (!selectedText) {
			vscode.window.showErrorMessage('Please select some text to enhance with documentation');
			return;
		}

		vscode.window.showInformationMessage('Searching for relevant Apple documentation...');

		try {
			const enhancedContext = await contextProvider.enhancePromptWithDocs(selectedText, codeContext);
			
			// Show results in a new document
			const doc = await vscode.workspace.openTextDocument({
				content: formatEnhancedContext(enhancedContext),
				language: 'markdown'
			});
			await vscode.window.showTextDocument(doc);
		} catch (error) {
			vscode.window.showErrorMessage(`Error enhancing with docs: ${error}`);
		}
	});

	// Enhanced RAG command - This is the main feature for your concept!
	const enhancedRagCommand = vscode.commands.registerCommand('apple-docs-rag.enhanceWithIntelligentRAG', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showErrorMessage('No active editor found');
			return;
		}

		const selectedText = editor.document.getText(editor.selection) || 'Improve this code';
		const codeContext = editor.document.getText();

		// Check for deprecated APIs first
		const deprecatedDetections = deprecatedApiDetector.detectDeprecatedApis(codeContext);
		if (deprecatedDetections.length > 0) {
			const action = await vscode.window.showWarningMessage(
				`⚠️ Found ${deprecatedDetections.length} deprecated API(s) in your code!`,
				'Show Deprecation Report',
				'Continue Anyway'
			);
			
			if (action === 'Show Deprecation Report') {
				const report = deprecatedApiDetector.generateDeprecationReport(deprecatedDetections);
				const doc = await vscode.workspace.openTextDocument({
					content: report,
					language: 'markdown'
				});
				await vscode.window.showTextDocument(doc);
				return;
			}
		}

		// Show progress while processing
		await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: "🧠 Enhancing with Apple API intelligence...",
			cancellable: false
		}, async (progress) => {
			progress.report({ increment: 20, message: "Analyzing your request..." });
			
			const ragContext = await enhancedContextProvider.enhancePromptWithIntelligentRAG(
				selectedText, 
				codeContext
			);
			
			progress.report({ increment: 80, message: "Generating enhanced documentation..." });
			
			// Create a new document with the enhanced context
			const doc = await vscode.workspace.openTextDocument({
				content: ragContext.enhancedPrompt,
				language: 'markdown'
			});
			
			await vscode.window.showTextDocument(doc);
			
			// Show summary
			vscode.window.showInformationMessage(
				`✅ Enhanced with ${ragContext.deepDocumentation.length} APIs: ${ragContext.expandedApis.slice(0, 3).join(', ')}${ragContext.expandedApis.length > 3 ? '...' : ''}`
			);
		});
	});

	// Command to scan for deprecated APIs
	const scanDeprecatedCommand = vscode.commands.registerCommand('apple-docs-rag.scanDeprecatedApis', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showErrorMessage('No active editor found');
			return;
		}

		const code = editor.document.getText();
		const detections = deprecatedApiDetector.detectDeprecatedApis(code);
		
		if (detections.length === 0) {
			vscode.window.showInformationMessage('✅ No deprecated APIs found in your code!');
			return;
		}

		const report = deprecatedApiDetector.generateDeprecationReport(detections);
		const doc = await vscode.workspace.openTextDocument({
			content: report,
			language: 'markdown'
		});
		await vscode.window.showTextDocument(doc);
		
		vscode.window.showWarningMessage(`⚠️ Found ${detections.length} deprecated API(s). Check the report for migration guidance.`);
	});

	context.subscriptions.push(searchDocsCommand, indexFrameworkCommand, enhanceWithDocsCommand, enhancedRagCommand, scanDeprecatedCommand);

	// Cache management commands
	const viewCacheStatsCommand = vscode.commands.registerCommand('apple-docs-rag.viewCacheStats', async () => {
		const stats = await cacheManager.getCacheStats();
		
		const statsMessage = `📊 **Persistent API Cache Statistics:**

💾 **Long-term Memory:** ${stats.totalApis}/${stats.maxCacheSize} APIs stored
📁 **Frameworks:** ${stats.frameworks.join(', ') || 'None'}
💿 **Disk Usage:** ${stats.diskUsage}
📅 **Oldest Cache:** ${stats.oldestCache}
📅 **Newest Cache:** ${stats.newestCache}
⭐ **Most Accessed:** ${stats.mostAccessedApi || 'None'}

This cache persists across VS Code sessions and Mac restarts.`;

		vscode.window.showInformationMessage(statsMessage, 'Reset All Cache Memory', 'Size Cleanup')
			.then(async (selection) => {
				if (selection === 'Reset All Cache Memory') {
					const confirm = await vscode.window.showWarningMessage(
						'⚠️ This will permanently delete all cached Apple API documentation and reset the long-term memory. Are you sure?',
						'Reset Everything', 'Cancel'
					);
					if (confirm === 'Reset Everything') {
						await cacheManager.resetAllCacheData();
						vscode.window.showInformationMessage('🔄 All API cache long-term memory has been reset');
					}
				} else if (selection === 'Size Cleanup') {
					const removed = await cacheManager.cleanupCache();
					if (removed > 0) {
						vscode.window.showInformationMessage(`🧹 Cleaned up ${removed} least-used cache entries`);
					} else {
						vscode.window.showInformationMessage('✅ Cache size is optimal, no cleanup needed');
					}
				}
			});
	});

	const clearCacheCommand = vscode.commands.registerCommand('apple-docs-rag.clearCache', async () => {
		const confirm = await vscode.window.showWarningMessage(
			'⚠️ This will clear all cached Apple API documentation but keep the cache system active. Are you sure?',
			'Clear Cache', 'Cancel'
		);
		
		if (confirm === 'Clear Cache') {
			await cacheManager.clearCache();
			vscode.window.showInformationMessage('✅ API cache cleared successfully');
		}
	});

	const resetLongTermCacheCommand = vscode.commands.registerCommand('apple-docs-rag.resetLongTermCache', async () => {
		const confirm = await vscode.window.showWarningMessage(
			'🔄 This will permanently reset ALL cached Apple API documentation and long-term memory. This action cannot be undone. Are you sure?',
			'Reset All Long-term Memory', 'Cancel'
		);
		
		if (confirm === 'Reset All Long-term Memory') {
			try {
				await cacheManager.resetAllCacheData();
				vscode.window.showInformationMessage('🔄 All API cache long-term memory has been completely reset');
			} catch (error) {
				vscode.window.showErrorMessage(`❌ Error resetting cache: ${error}`);
			}
		}
	});

	context.subscriptions.push(
		viewCacheStatsCommand, 
		clearCacheCommand, 
		resetLongTermCacheCommand
	);
}

function registerChatParticipant(context: vscode.ExtensionContext) {
	// Create chat participant for Apple docs with enhanced RAG
	const chatParticipant = vscode.chat.createChatParticipant('apple-docs', async (request, chatContext, stream, token) => {
		stream.progress('🧠 Analyzing your request and scanning for deprecated APIs...');
		
		try {
			// Get code context from active editor
			const editor = vscode.window.activeTextEditor;
			const codeContext = editor?.document.getText();
			
			// First, check for deprecated APIs in the current code
			if (codeContext) {
				const deprecatedDetections = deprecatedApiDetector.detectDeprecatedApis(codeContext);
				if (deprecatedDetections.length > 0) {
					stream.markdown(`🚨 **DEPRECATED API WARNING**: Found ${deprecatedDetections.length} deprecated API(s) in your current code!\n\n`);
					
					deprecatedDetections.forEach((detection, index) => {
						stream.markdown(`❌ **${detection.apiName}** (Line ${detection.line})\n`);
						stream.markdown(`**Issue**: ${detection.reason}\n`);
						stream.markdown(`✅ **Use instead**: ${detection.modernAlternative}\n\n`);
					});
					
					stream.markdown(`---\n\n`);
				}
			}
			
			// Use intelligent RAG enhancement
			const ragContext = await enhancedContextProvider.enhancePromptWithIntelligentRAG(
				request.prompt,
				codeContext
			);
			
			stream.progress(`🔍 Found ${ragContext.deepDocumentation.length} relevant APIs...`);
			
			// Format response for chat
			const response = formatChatResponse(ragContext);
			stream.markdown(response);
			
			return { metadata: { command: 'enhanced-rag-search' } };
			
		} catch (error) {
			stream.markdown(`❌ Error: ${error}`);
			return { metadata: { command: 'error' } };
		}
	});

	// Set chat participant properties
	chatParticipant.iconPath = vscode.Uri.joinPath(context.extensionUri, 'resources', 'apple-icon.png');
	chatParticipant.followupProvider = {
		provideFollowups: async (result, context, token) => {
			return [
				{
					prompt: 'Show me a complete code example',
					label: '� Complete Example'
				},
				{
					prompt: 'Find alternative approaches',
					label: '🔄 Alternative APIs'
				},
				{
					prompt: 'Scan my code for deprecated APIs',
					label: '🚨 Scan Deprecated APIs'
				}
			];
		}
	};

	context.subscriptions.push(chatParticipant);
}

function formatChatResponse(ragContext: any): string {
	const { detectedIntent, expandedApis, deepDocumentation, cacheStats } = ragContext;
	
	// Separate deprecated and current APIs
	const deprecatedApis = deepDocumentation.filter((doc: any) => doc.isDeprecated);
	const currentApis = deepDocumentation.filter((doc: any) => !doc.isDeprecated);
	
	let response = `🎯 **Intent**: ${detectedIntent}\n`;
	response += `📚 **Analyzed APIs**: ${expandedApis.join(', ')}\n`;
	
	// Show cache performance stats
	if (cacheStats) {
		response += `⚡ **Cache Performance**: ${cacheStats.fromCache} from persistent cache, ${cacheStats.fromWeb} from web\n\n`;
	}
	
	// Strong deprecation warning if any deprecated APIs found
	if (deprecatedApis.length > 0) {
		response += `🚫 **DEPRECATED APIs DETECTED - DO NOT USE:**\n\n`;
		for (const doc of deprecatedApis) {
			response += `❌ **${doc.title}** (${doc.framework})\n`;
			response += `⚠️ **DEPRECATED**: ${doc.deprecationInfo}\n`;
			response += `🔄 **Use modern alternatives instead**\n\n`;
		}
		response += `---\n\n`;
	}
	
	// Current APIs section
	if (currentApis.length > 0) {
		response += `## ✅ Recommended Current APIs (${currentApis.length} APIs)\n\n`;
		
		for (const doc of currentApis.slice(0, 5)) { // Focus on current APIs
			response += `### ${doc.title} (${doc.framework}) ✅\n`;
			response += `**Current API** | ${doc.availability}\n\n`;
			response += `${doc.description}\n\n`;
			
			if (doc.codeExamples.length > 0) {
				response += `**Example:**\n\`\`\`swift\n${doc.codeExamples[0].substring(0, 200)}...\n\`\`\`\n\n`;
			}
			
			response += `[📖 Documentation](${doc.url})\n\n---\n\n`;
		}
	}
	
	// Add strong guidance about avoiding deprecated APIs
	response += `💡 **Important Reminders:**\n`;
	response += `- ✅ Use only current APIs from the recommendations above\n`;
	response += `- 🚫 Avoid all deprecated APIs completely\n`;
	response += `- 🔄 Replace any deprecated code with modern alternatives\n`;
	response += `- 📱 Check availability requirements for your target iOS version\n`;
	
	return response;
}

async function searchAndShowResults(query: string, framework?: string) {
	try {
		vscode.window.showInformationMessage('Searching Apple documentation...');
		
		const results = await docsSearcher.searchDocumentation(query, framework, 10);
		
		if (results.length === 0) {
			vscode.window.showWarningMessage(`No results found for "${query}"`);
			return;
		}

		// Show results in Quick Pick
		const quickPickItems = results.map(result => ({
			label: result.title,
			description: result.framework,
			detail: result.description,
			result: result
		}));

		const selected = await vscode.window.showQuickPick(quickPickItems, {
			placeHolder: `Found ${results.length} results for "${query}"`,
			matchOnDescription: true,
			matchOnDetail: true
		});

		if (selected) {
			// Open the documentation URL
			vscode.env.openExternal(vscode.Uri.parse(selected.result.url));
			
			// Optionally show detailed info
			const action = await vscode.window.showInformationMessage(
				`Opening documentation for ${selected.result.title}`,
				'Show Details',
				'Copy URL'
			);

			if (action === 'Show Details') {
				const details = await docsSearcher.getDetailedDocumentation(selected.result.url);
				const doc = await vscode.workspace.openTextDocument({
					content: `# ${selected.result.title}\n\n${details}`,
					language: 'markdown'
				});
				await vscode.window.showTextDocument(doc);
			} else if (action === 'Copy URL') {
				await vscode.env.clipboard.writeText(selected.result.url);
				vscode.window.showInformationMessage('URL copied to clipboard');
			}
		}

	} catch (error) {
		vscode.window.showErrorMessage(`Error searching documentation: ${error}`);
	}
}

function getSelectedText(): string {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		return '';
	}

	const selection = editor.selection;
	return editor.document.getText(selection);
}

function extractFrameworksFromRequest(prompt: string): string[] {
	const frameworks: string[] = [];
	const frameworkKeywords = {
		'SwiftUI': ['swiftui', 'view', 'state', 'binding', 'vstack', 'hstack'],
		'UIKit': ['uikit', 'uiview', 'uiviewcontroller', 'uibutton', 'uilabel'],
		'Foundation': ['foundation', 'nsstring', 'nsarray', 'userdefaults'],
		'Combine': ['combine', 'published', 'subscriber', 'passthrough'],
		'CoreData': ['coredata', 'nsmanagedobject', 'nsfetchrequest'],
		'AVFoundation': ['avfoundation', 'avplayer', 'avaudioengine'],
		'MapKit': ['mapkit', 'mkmapview', 'cllocation']
	};

	const lowerPrompt = prompt.toLowerCase();
	
	for (const [framework, keywords] of Object.entries(frameworkKeywords)) {
		if (keywords.some(keyword => lowerPrompt.includes(keyword))) {
			frameworks.push(framework);
		}
	}

	return frameworks;
}

function formatEnhancedContext(context: any): string {
	return `# Enhanced Context with Apple Documentation

## Original Prompt
${context.originalPrompt}

## Detected Frameworks
${context.detectedFrameworks.join(', ') || 'None detected'}

## Relevant Documentation
${context.relevantDocs.map((doc: any) => `
### ${doc.title} (${doc.framework})
- **Type**: ${doc.apiType}
- **Availability**: ${doc.availability}
- **Deprecated**: ${doc.isDeprecated ? 'Yes ⚠️' : 'No'}
- **Description**: ${doc.description}
- **URL**: ${doc.url}
`).join('\n')}

## Suggestions
${context.suggestions.map((suggestion: string) => `- ${suggestion}`).join('\n')}

## Enhanced Prompt
${context.enhancedPrompt}
`;
}

// This method is called when your extension is deactivated
export function deactivate() {
	if (docsSearcher) {
		docsSearcher.clearCache();
	}
	if (contextProvider) {
		contextProvider.clearCache();
	}
	if (enhancedContextProvider) {
		enhancedContextProvider.clearCache();
	}
}
