export class IntelligentApiMapper {
    private apiDomains = new Map<string, string[]>([
        ['apple pencil', ['PencilKit', 'PKCanvasView', 'PKDrawing', 'PKStroke', 'PKInk', 'PKTool', 'PKInkingTool', 'PKLassoTool', 'PKEraserTool', 'UIScribbleInteraction', 'UIPencilInteraction', 'UITouch']],
        ['drawing', ['PencilKit', 'Core Graphics', 'PKCanvasView', 'PKDrawing', 'PKStroke', 'CGContext', 'UIBezierPath']],
        ['navigation', ['SwiftUI.NavigationStack', 'SwiftUI.NavigationView', 'UIKit.UINavigationController', 'UINavigationBar', 'UINavigationItem']],
        ['table view', ['UITableView', 'UITableViewController', 'UITableViewCell', 'UITableViewDataSource', 'UITableViewDelegate', 'UIListContentConfiguration']],
        ['collection view', ['UICollectionView', 'UICollectionViewController', 'UICollectionViewCell', 'UICollectionViewLayout', 'UICollectionViewFlowLayout']],
        ['animation', ['SwiftUI.Animation', 'UIKit.UIView', 'Core Animation', 'CAAnimation', 'CALayer', 'UIViewPropertyAnimator']],
        ['camera', ['AVFoundation', 'AVCaptureSession', 'AVCaptureDevice', 'AVCaptureVideoPreviewLayer', 'PHPhotoLibrary']],
        ['location', ['Core Location', 'CLLocationManager', 'CLLocation', 'MKMapView', 'MapKit']],
        ['networking', ['URLSession', 'URLRequest', 'URLSessionTask', 'Network', 'Combine']],
        ['data persistence', ['Core Data', 'NSManagedObject', 'NSPersistentContainer', 'UserDefaults', 'FileManager']],
        ['notifications', ['UserNotifications', 'UNUserNotificationCenter', 'UNNotificationRequest', 'UNMutableNotificationContent']],
        ['audio', ['AVFoundation', 'AVAudioEngine', 'AVAudioPlayer', 'AVAudioRecorder', 'AVAudioSession']],
        ['augmented reality', ['ARKit', 'ARSCNView', 'ARCamera', 'ARSession', 'ARWorldTrackingConfiguration', 'RealityKit']],
        ['machine learning', ['Core ML', 'MLModel', 'Vision', 'VNImageRequestHandler', 'CreateML']],
        ['accessibility', ['UIAccessibility', 'VoiceOver', 'UIAccessibilityElement', 'UIAccessibilityContainer']],
        ['keyboard', ['UITextInput', 'UITextInputAssistantItem', 'UIKeyboardType', 'UIReturnKeyType']],
        ['biometrics', ['LocalAuthentication', 'LAContext', 'LAPolicy', 'TouchID', 'FaceID']],
        ['payment', ['PassKit', 'PKPaymentRequest', 'PKPaymentAuthorizationViewController', 'Apple Pay']],
        ['watch', ['WatchKit', 'WKInterfaceController', 'WKInterfaceObject', 'HealthKit']],
        ['health', ['HealthKit', 'HKHealthStore', 'HKQuantityType', 'HKSample', 'HKWorkout']],
        ['game', ['GameKit', 'GKLocalPlayer', 'GKAchievement', 'GKLeaderboard', 'SpriteKit', 'SceneKit']],
        ['charts', ['Charts', 'SwiftUI.Chart', 'BarMark', 'LineMark', 'PointMark']],
        ['widgets', ['WidgetKit', 'Widget', 'TimelineProvider', 'TimelineEntry']],
        ['shortcuts', ['Intents', 'INIntent', 'INIntentResponse', 'SiriKit']],
        ['share', ['UIActivityViewController', 'UIActivity', 'NSItemProvider', 'Share Sheet']],
    ]);

    expandApiSearch(prompt: string): string[] {
        const apis = new Set<string>();
        const lowerPrompt = prompt.toLowerCase();
        
        // Direct keyword matching
        for (const [domain, domainApis] of this.apiDomains) {
            if (lowerPrompt.includes(domain)) {
                domainApis.forEach(api => apis.add(api));
            }
        }
        
        // Context-based expansion
        if (lowerPrompt.includes('ipad') || lowerPrompt.includes('tablet')) {
            // iPad-specific APIs
            ['UISplitViewController', 'UIPopoverController', 'UIDragInteraction', 'UIDropInteraction'].forEach(api => apis.add(api));
        }
        
        if (lowerPrompt.includes('support') || lowerPrompt.includes('add')) {
            // When adding new functionality, include foundational APIs
            ['Foundation', 'UIKit', 'SwiftUI'].forEach(api => apis.add(api));
        }
        
        // If no matches found, return general iOS development APIs
        if (apis.size === 0) {
            return ['UIKit', 'SwiftUI', 'Foundation'];
        }
        
        return Array.from(apis);
    }

    getRelatedApis(primaryApi: string): string[] {
        const related = new Map<string, string[]>([
            ['PencilKit', ['PKCanvasView', 'PKDrawing', 'PKStroke', 'PKInk', 'PKTool', 'UIPencilInteraction']],
            ['UITableView', ['UITableViewCell', 'UITableViewDataSource', 'UITableViewDelegate', 'NSIndexPath']],
            ['SwiftUI', ['View', 'State', 'Binding', 'ObservableObject', 'EnvironmentObject']],
            ['AVFoundation', ['AVCaptureSession', 'AVPlayer', 'AVPlayerViewController', 'AVAudioSession']],
            ['Core Data', ['NSManagedObject', 'NSPersistentContainer', 'NSFetchRequest', 'NSManagedObjectContext']],
        ]);
        
        return related.get(primaryApi) || [];
    }
}
