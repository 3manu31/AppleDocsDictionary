# Apple Docs Dictionary Extension

**Enhanced RAG (Retrieval-Augmented Generation) extension for Apple API documentation with persistent offline caching and deprecation detection.**

## 🚀 Features

### Core Capabilities
- **Intelligent API Mapping**: Automatically expands API searches across 30+ Apple frameworks
- **Real-time Documentation**: Scrapes comprehensive Apple developer documentation
- **Persistent Offline Cache**: Long-term storage that survives VS Code restarts and Mac reboots
- **Deprecation Detection**: Active monitoring and prevention of deprecated API usage
- **VS Code Chat Integration**: Use `@apple-docs` for intelligent assistance

### � Persistent Cache System (NEW in v0.0.3)
- **Long-term Memory**: Cache persists across VS Code sessions, restarts, and Mac reboots
- **No Automatic Expiration**: APIs stay cached until manually reset by user
- **Instant Retrieval**: Previously searched APIs load instantly from local storage
- **Smart Management**: Automatic size management (keeps 5000 most-used APIs)
- **User Control**: Reset cache only when you choose to do so

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
- **Apple Docs: View Cache Statistics** - Monitor persistent cache performance
- **Apple Docs: Clear API Cache** - Clear cache but keep system active
- **Apple Docs: Reset All Cache Long-term Memory** - Completely reset persistent storage

### How Persistent Cache Works
1. **First Request**: Extension fetches API documentation from Apple's website and stores permanently
2. **Permanent Storage**: Documentation saved to VS Code's global storage (survives restarts)
3. **Instant Access**: All subsequent requests load immediately from persistent cache
4. **Cross-Session**: Works offline and survives VS Code restarts, Mac reboots, updates
5. **User Control**: Only resets when you explicitly choose to reset long-term memory

## 📊 Cache Features

### True Persistence
- **Survives Restarts**: Cache works after closing/reopening VS Code
- **Survives Reboots**: Cache persists through Mac restarts and updates
- **No Expiration**: APIs remain cached indefinitely until user resets
- **Large Capacity**: Stores up to 5,000 APIs with intelligent cleanup
- **Framework Organization**: APIs organized by Apple framework for efficient access

### Performance Benefits
- **Zero Network Delay**: Cached APIs load instantly without internet
- **Offline Capability**: Full functionality without internet connection
- **Accumulated Knowledge**: Cache grows smarter over time with usage
- **Better UX**: Consistent performance regardless of network conditions

## 🔧 Installation

### Local Installation
```bash
code --install-extension AppleDocsDictionary-0.0.3.vsix
```

### Manual Installation
1. Open VS Code Extensions
2. Click "..." → "Install from VSIX..."
3. Select `AppleDocsDictionary-0.0.3.vsix`

## 🚨 Cache Management

The extension provides full control over persistent cache:

### View Cache Statistics
- Monitor cache size and performance
- See frameworks cached and disk usage
- Track most accessed APIs
- View cache health across sessions

### Reset Options
- **Clear API Cache**: Removes current cache but keeps system active
- **Reset All Cache Long-term Memory**: Completely resets persistent storage
- **Size Cleanup**: Removes least-used APIs when cache is full

### Configuration
- `persistentCache`: Enable/disable persistent storage (default: true)
- `maxCacheSize`: Maximum APIs to store (default: 5000)
- `cacheDocumentation`: Enable local caching (default: true)

## 🚨 Deprecation Detection

The extension actively prevents deprecated API usage by:
- **Real-time Scanning**: Detects deprecated APIs in your current code
- **Chat Warnings**: Shows deprecation alerts in `@apple-docs` responses
- **Modern Alternatives**: Suggests current API replacements
- **Migration Guidance**: Provides specific upgrade instructions

## ⚡ Performance Improvements

v0.0.3 delivers significant performance gains:
- **Instant API Access**: Previously searched APIs load in milliseconds
- **Offline First**: Works without internet for cached APIs
- **Persistent Intelligence**: Cache accumulates knowledge over time
- **Zero Re-fetch**: Never downloads the same API documentation twice

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

**v0.0.3**: Persistent cache that survives restarts - your API knowledge builds up over time and never disappears!
