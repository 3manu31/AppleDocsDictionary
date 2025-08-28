# Apple Docs Dictionary Extension

**Enhanced RAG (Retrieval-Augmented Generation) extension for Apple API documentation with intelligent caching and deprecation detection.**

## 🚀 Features

### Core Capabilities
- **Intelligent API Mapping**: Automatically expands API searches across 30+ Apple frameworks
- **Real-time Documentation**: Scrapes comprehensive Apple developer documentation
- **Smart Caching**: Offline storage for previously fetched APIs for instant access
- **Deprecation Detection**: Active monitoring and prevention of deprecated API usage
- **VS Code Chat Integration**: Use `@apple-docs` for intelligent assistance

### 📚 Offline Cache System (NEW in v0.0.2)
- **Smart Caching**: Automatically caches fetched APIs for future use
- **Instant Retrieval**: Previously searched APIs load instantly from local storage
- **Cache Statistics**: Monitor cache performance and storage usage
- **Automatic Cleanup**: Removes expired cache entries to maintain performance
- **Framework Organization**: APIs organized by Apple framework for efficient access

## 🎯 Usage

### Chat Integration
```
@apple-docs How do I create a modern UIButton?
@apple-docs Update this UIAlertView to UIAlertController
@apple-docs What's the SwiftUI equivalent of UINavigationController?
```

### Commands
- **Apple Docs: Search Documentation** - Search Apple documentation
- **Apple Docs: Enhance with Intelligent RAG** - Get comprehensive API context  
- **Apple Docs: Scan for Deprecated APIs** - Check code for deprecated APIs
- **Apple Docs: View Cache Statistics** - Monitor cache performance
- **Apple Docs: Clear API Cache** - Reset cached documentation

### How the Cache Works
1. **First Request**: Extension fetches API documentation from Apple's website
2. **Automatic Caching**: Documentation is stored locally with metadata
3. **Subsequent Requests**: APIs load instantly from cache if available
4. **Smart Fallback**: If not cached or expired, fetches from web automatically
5. **Performance Tracking**: Shows cache hits vs. web fetches in chat responses

## 📊 Cache Features

### Intelligent Storage
- **Structured Data**: APIs stored with complete documentation, methods, properties
- **Metadata Tracking**: Access counts, timestamps, and framework organization
- **Automatic Expiry**: 7-day cache lifetime to ensure fresh documentation
- **Size Management**: Automatic cleanup when cache exceeds 1000 entries

### Performance Benefits
- **Instant Access**: Cached APIs load in milliseconds instead of seconds
- **Reduced Network**: Fewer HTTP requests to Apple's servers
- **Offline Capability**: Previously searched APIs work without internet
- **Better UX**: Faster response times in VS Code Chat

## 🔧 Installation

### Local Installation
```bash
code --install-extension AppleDocsDictionary-0.0.2.vsix
```

### Manual Installation
1. Open VS Code Extensions
2. Click "..." → "Install from VSIX..."
3. Select `AppleDocsDictionary-0.0.2.vsix`

## 🚨 Deprecation Detection

The extension actively prevents deprecated API usage by:
- **Real-time Scanning**: Detects deprecated APIs in your current code
- **Chat Warnings**: Shows deprecation alerts in `@apple-docs` responses
- **Modern Alternatives**: Suggests current API replacements
- **Migration Guidance**: Provides specific upgrade instructions

## ⚡ Cache Performance

Monitor your cache performance:
- View cache statistics via command palette
- See cache hits vs. web fetches in chat responses
- Manage cache size and cleanup automatically
- Track most accessed APIs for optimization

## 🛠 Development

To modify or rebuild:
```bash
npm install
npm run compile
npx @vscode/vsce package
```

## 📝 Requirements

- VS Code 1.90+
- Internet access for initial API fetching
- GitHub Copilot for chat features

## 🔗 Supported Frameworks

UIKit, SwiftUI, Foundation, CoreData, AVFoundation, MapKit, WebKit, Metal, ARKit, CoreML, GameplayKit, PencilKit, Combine, and more.

---

**v0.0.2**: Added intelligent offline caching system for faster API access and improved performance.
