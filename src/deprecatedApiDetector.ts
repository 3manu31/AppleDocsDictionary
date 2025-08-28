export interface DeprecatedApiDetection {
    apiName: string;
    framework: string;
    line: number;
    reason: string;
    modernAlternative: string;
    migrationInstructions: string;
}

export class DeprecatedApiDetector {
    private deprecatedApis = new Map<string, {
        framework: string;
        reason: string;
        alternative: string;
        migration: string;
    }>([
        // Navigation
        ['NavigationView', {
            framework: 'SwiftUI',
            reason: 'Deprecated in iOS 16.0',
            alternative: 'NavigationStack',
            migration: 'Replace NavigationView with NavigationStack for iOS 16+ or use NavigationView with .navigationViewStyle(.stack) for backward compatibility'
        }],
        
        // UIKit
        ['UIWebView', {
            framework: 'UIKit',
            reason: 'Deprecated in iOS 12.0',
            alternative: 'WKWebView',
            migration: 'Replace UIWebView with WKWebView from WebKit framework'
        }],
        
        ['shouldAutorotateToInterfaceOrientation', {
            framework: 'UIKit',
            reason: 'Deprecated in iOS 9.0',
            alternative: 'supportedInterfaceOrientations',
            migration: 'Use supportedInterfaceOrientations property instead'
        }],
        
        // Core Location
        ['CLLocationManager.requestWhenInUseAuthorization()', {
            framework: 'CoreLocation',
            reason: 'Requires usage description in iOS 14+',
            alternative: 'CLLocationManager with proper privacy usage descriptions',
            migration: 'Add NSLocationWhenInUseUsageDescription to Info.plist and handle authorization properly'
        }],
        
        // Networking
        ['NSURLConnection', {
            framework: 'Foundation',
            reason: 'Deprecated in iOS 9.0',
            alternative: 'URLSession',
            migration: 'Replace NSURLConnection with URLSession for better performance and features'
        }],
        
        // Data Storage
        ['NSUserDefaults.synchronize()', {
            framework: 'Foundation',
            reason: 'Deprecated - synchronization is automatic',
            alternative: 'Automatic synchronization',
            migration: 'Remove calls to synchronize() as UserDefaults automatically synchronizes'
        }],
        
        // UI Components
        ['UIAlertView', {
            framework: 'UIKit',
            reason: 'Deprecated in iOS 9.0',
            alternative: 'UIAlertController',
            migration: 'Replace UIAlertView with UIAlertController with style .alert'
        }],
        
        ['UIActionSheet', {
            framework: 'UIKit',
            reason: 'Deprecated in iOS 9.0',
            alternative: 'UIAlertController',
            migration: 'Replace UIActionSheet with UIAlertController with style .actionSheet'
        }],
        
        // Audio
        ['AVAudioSessionCategoryPlayback', {
            framework: 'AVFoundation',
            reason: 'Use AVAudioSession.Category.playback',
            alternative: 'AVAudioSession.Category.playback',
            migration: 'Use the new enum-based category system'
        }],
    ]);

    detectDeprecatedApis(code: string): DeprecatedApiDetection[] {
        const detections: DeprecatedApiDetection[] = [];
        const lines = code.split('\n');
        
        lines.forEach((line, index) => {
            for (const [apiName, details] of this.deprecatedApis) {
                if (line.includes(apiName)) {
                    detections.push({
                        apiName,
                        framework: details.framework,
                        line: index + 1,
                        reason: details.reason,
                        modernAlternative: details.alternative,
                        migrationInstructions: details.migration
                    });
                }
            }
        });
        
        return detections;
    }

    generateDeprecationReport(detections: DeprecatedApiDetection[]): string {
        if (detections.length === 0) {
            return `✅ **No deprecated APIs detected!** Your code is using current APIs.`;
        }
        
        let report = `🚨 **DEPRECATED API REPORT** - Found ${detections.length} issue(s):\n\n`;
        
        detections.forEach((detection, index) => {
            report += `### ${index + 1}. ${detection.apiName} (Line ${detection.line})\n`;
            report += `**Framework**: ${detection.framework}\n`;
            report += `**Issue**: ${detection.reason}\n`;
            report += `**Modern Alternative**: ${detection.modernAlternative}\n`;
            report += `**Migration**: ${detection.migrationInstructions}\n\n`;
            report += `---\n\n`;
        });
        
        report += `🔧 **Next Steps**:\n`;
        report += `1. Replace all deprecated APIs with their modern alternatives\n`;
        report += `2. Test thoroughly after migration\n`;
        report += `3. Update your project's minimum iOS version if needed\n`;
        report += `4. Review Apple's migration guides for complex changes\n`;
        
        return report;
    }

    getModernAlternatives(apiName: string): string[] {
        const alternatives: { [key: string]: string[] } = {
            'NavigationView': ['NavigationStack', 'NavigationSplitView'],
            'UIWebView': ['WKWebView'],
            'NSURLConnection': ['URLSession'],
            'UIAlertView': ['UIAlertController'],
            'UIActionSheet': ['UIAlertController'],
            'NSUserDefaults.synchronize()': ['UserDefaults (automatic sync)'],
        };
        
        return alternatives[apiName] || [];
    }
}
