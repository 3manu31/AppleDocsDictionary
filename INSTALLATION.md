# Apple Docs Dictionary Extension - Installation Guide

## 🚀 Enhanced Features

Your VS Code extension now includes:

### Core RAG Capabilities
- **Intelligent API Mapping**: Automatically expands API searches across 30+ Apple frameworks
- **Deep Documentation Scraping**: Real-time retrieval of comprehensive API documentation
- **Chat Integration**: Use `@apple-docs` in VS Code Chat for intelligent assistance

### Deprecation Detection & Enforcement
- **Real-time Scanning**: Automatically detects deprecated APIs in your code
- **Modern Alternatives**: Suggests current API replacements
- **Chat Warnings**: Shows deprecation alerts directly in chat responses
- **Migration Guidance**: Provides specific upgrade instructions

## 📦 Installation

### Method 1: Local Installation (Recommended)
```bash
# Install the VSIX package directly
code --install-extension AppleDocsDictionary-0.0.1.vsix
```

### Method 2: Manual Installation
1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Click the "..." menu → "Install from VSIX..."
4. Select `AppleDocsDictionary-0.0.1.vsix`

## 🎯 Usage

### In VS Code Chat
```
@apple-docs How do I create a UIButton with modern APIs?
@apple-docs Help me update this deprecated UIAlertView code
@apple-docs Show me SwiftUI navigation best practices
```

### Commands
- `Apple Docs: Search Documentation` - Search Apple docs
- `Apple Docs: Enhance with Intelligent RAG` - Get comprehensive API context
- `Apple Docs: Scan for Deprecated APIs` - Check your code for deprecated APIs

### Automatic Features
- **Chat Integration**: The extension automatically scans your current code for deprecated APIs when you use `@apple-docs`
- **Deprecation Warnings**: Immediate alerts when deprecated APIs are detected
- **Modern Alternatives**: Automatic suggestions for current best practices

## 🔍 What the Extension Does

1. **Analyzes Your Code**: Scans for Apple API usage patterns
2. **Expands Search Terms**: Uses intelligent mapping to find related APIs
3. **Scrapes Documentation**: Retrieves real-time API information from Apple's docs
4. **Detects Deprecation**: Identifies outdated APIs and suggests modern replacements
5. **Enhances Copilot**: Provides rich context to improve AI responses

## 🚨 Deprecation Detection

The extension includes a comprehensive database of deprecated Apple APIs and will:
- Warn you about deprecated code in real-time
- Suggest modern alternatives
- Provide migration guidance
- Block deprecated suggestions in chat responses

## 🛠 Development

To modify or rebuild:
```bash
npm install
npm run compile
npx @vscode/vsce package
```

## 📝 Notes

- Extension requires internet access for documentation scraping
- Chat features require VS Code 1.90+ with GitHub Copilot
- Best performance with Swift/Objective-C files
