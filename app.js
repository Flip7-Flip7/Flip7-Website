/**
 * app.js - Main application entry point
 * Initializes the modular Flip 7 game
 */

// Global namespace for the game
window.Flip7 = window.Flip7 || {};

// Module initialization order is important
const moduleLoadOrder = [
    // Core event system
    'events/EventBus.js',
    'events/GameEvents.js',
    
    // Configuration
    'game/config/GameConstants.js',
    
    // Core game classes
    'game/cards/Card.js',
    'game/cards/Deck.js',
    'game/core/Player.js',
    
    // Game logic
    'game/cards/CardManager.js',
    'game/core/GameEngine.js',
    // 'game/core/GameState.js',
    // 'game/core/GameRules.js',
    // 'game/cards/CardActions.js',
    
    // AI (to be created)
    // 'game/ai/AIPlayer.js',
    // 'game/ai/AIStrategy.js',
    
    // UI modules
    'ui/display/DisplayManager.js',
    // 'ui/display/CardDisplay.js',
    // 'ui/animations/AnimationManager.js',
    // 'ui/animations/CardAnimations.js',
    // 'ui/mobile/MobileSync.js',
    
    // Main game engine (to be created)
    // 'game/core/GameEngine.js'
];

/**
 * Load a script dynamically
 * @param {string} src - Script source path
 * @returns {Promise}
 */
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src + '?v=' + Date.now(); // Cache busting for development
        script.onload = resolve;
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(script);
    });
}

/**
 * Load all modules in sequence
 */
async function loadModules() {
    console.log('Loading Flip 7 modules...');
    
    for (const module of moduleLoadOrder) {
        try {
            await loadScript(module);
            console.log(`✓ Loaded ${module}`);
        } catch (error) {
            console.error(`✗ Failed to load ${module}:`, error);
            throw error;
        }
    }
    
    console.log('All modules loaded successfully!');
}

/**
 * Initialize the game after modules are loaded
 */
function initializeGame() {
    console.log('Initializing Flip 7 game...');
    
    // Make core classes available in Flip7 namespace
    window.Flip7 = {
        // Event system
        EventBus: window.EventBus,
        GameEvents: window.GameEvents,
        eventBus: window.gameEventBus,
        
        // Configuration
        GameConstants: window.GameConstants,
        
        // Core classes
        Card: window.Card,
        Deck: window.Deck,
        Player: window.Player,
        CardManager: window.CardManager,
        GameEngine: window.GameEngine,
        DisplayManager: window.DisplayManager,
        
        // Utility function to test the modular system
        testModules: function() {
            console.log('=== Flip 7 Modules Test ===');
            console.log('EventBus:', !!this.EventBus);
            console.log('GameEvents:', !!this.GameEvents);
            console.log('Card:', !!this.Card);
            console.log('Deck:', !!this.Deck);
            console.log('Player:', !!this.Player);
            console.log('CardManager:', !!this.CardManager);
            console.log('GameEngine:', !!this.GameEngine);
            console.log('DisplayManager:', !!this.DisplayManager);
            console.log('=========================');
            
            // Test creating instances
            try {
                const testCard = new this.Card('number', 7);
                console.log('✓ Card creation works:', testCard);
                
                const testPlayer = new this.Player({ name: 'Test' });
                console.log('✓ Player creation works:', testPlayer.name);
                
                console.log('✓ All modules loaded successfully!');
            } catch (error) {
                console.error('✗ Module test failed:', error);
            }
        }
    };
    
    // For now, still load the legacy game.js
    // In the future, this will be replaced by GameEngine
    const legacyScript = document.createElement('script');
    legacyScript.src = 'game.js?v=9.0&t=20250808-modular';
    legacyScript.onload = () => {
        console.log('Legacy game.js loaded for compatibility');
        
        // Future: Initialize new GameEngine instead
        // window.Flip7.game = new GameEngine();
    };
    document.head.appendChild(legacyScript);
}

/**
 * Start the application
 */
async function startApp() {
    try {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            await new Promise(resolve => {
                document.addEventListener('DOMContentLoaded', resolve);
            });
        }
        
        // Load all modules
        await loadModules();
        
        // Initialize the game
        initializeGame();
        
    } catch (error) {
        console.error('Failed to start Flip 7:', error);
        
        // Fallback to legacy game.js
        console.log('Falling back to legacy game.js...');
        const fallbackScript = document.createElement('script');
        fallbackScript.src = 'game.js?v=9.0&t=20250808-center-animation';
        document.head.appendChild(fallbackScript);
    }
}

// Start the application
startApp();