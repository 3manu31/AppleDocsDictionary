# Apple Docs RAG Extension

A VS Code extension that provides RAG (Retrieval-Augmented Generation) capabilities for Apple API documentation, designed to enhance GitHub Copilot's responses with accurate, up-to-date Apple API information.

## Features

### 🔍 Smart Documentation Search
- Search Apple developer documentation in real-time
- Framework-aware search (SwiftUI, UIKit, Foundation, Combine, etc.)
- Automatic framework detection from your code

### 🤖 Chat Integration
- Use `@apple-docs` in VS Code Chat to search Apple documentation
- Get contextual API information with deprecation warnings
- Receive suggestions for best practices and alternatives

### ⚡ Quick Actions
- **Search Apple Docs**: Search for any API, class, or method
- **Enhance with Docs**: Get relevant documentation for selected code
- **Framework Indexing**: Index specific frameworks for faster searches

### 🎯 Smart Context Detection
- Automatically detects which Apple frameworks you're using
- Provides version compatibility information
- Flags deprecated APIs and suggests alternatives
- Includes proper import statements and availability checks

## Usage

### Chat Participant
```
@apple-docs How do I create a SwiftUI navigation view?
@apple-docs UITableView best practices
@apple-docs Combine publishers and subscribers
```

### Commands
- `Cmd+Shift+P` → "Search Apple Documentation"
- `Cmd+Shift+P` → "Enhance with Docs" (with text selected)
- `Cmd+Shift+P` → "Index Framework Documentation"

### Configuration
```json
{
  "appleDocsRag.enableAutoSearch": true,
  "appleDocsRag.preferredFrameworks": [
    "SwiftUI",
    "UIKit", 
    "Foundation",
    "Combine"
  ],
  "appleDocsRag.cacheDocumentation": true
}
```

## Supported Frameworks

- **SwiftUI** - Modern declarative UI framework
- **UIKit** - Traditional iOS UI framework
- **Foundation** - Core functionality and data types
- **Combine** - Reactive programming framework
- **CoreData** - Data persistence framework
- **AVFoundation** - Audio and video processing
- **MapKit** - Maps and location services
- **And many more...**

## How It Works

1. **Code Analysis**: Automatically detects Apple frameworks in your code
2. **Smart Search**: Searches relevant Apple documentation based on context
3. **RAG Enhancement**: Provides enhanced context to GitHub Copilot
4. **Real-time Results**: Fast, cached searches with up-to-date information

## Installation

1. Install from VS Code Marketplace (coming soon)
2. Or build from source:
   ```bash
   git clone <repository>
   cd apple-docs-rag
   npm install
   npm run compile
   ```

## Requirements

- VS Code 1.103.0 or higher
- Internet connection for documentation searches
- Optional: GitHub Copilot for enhanced AI assistance

## Extension Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `appleDocsRag.enableAutoSearch` | Automatically search for relevant docs | `true` |
| `appleDocsRag.preferredFrameworks` | Frameworks to prioritize in searches | `["SwiftUI", "UIKit", "Foundation", "Combine"]` |
| `appleDocsRag.cacheDocumentation` | Cache documentation for faster access | `true` |

## Known Issues

- Large documentation searches may take a few seconds
- Some Apple documentation pages may require manual verification
- Deprecated API detection is based on documentation text analysis

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests.

## License

This extension is licensed under the MIT License.

## Release Notes

### 0.0.1
- Initial release
- Basic Apple documentation search
- Chat participant integration
- Framework detection
- Deprecation warnings

---

**Enjoy enhanced Apple API development with RAG-powered documentation!**
