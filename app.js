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
    
    // Game logic (to be created)
    // 'game/core/GameState.js',
    // 'game/core/GameRules.js',
    // 'game/cards/CardManager.js',
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
    
    // Make core classes available globally for now
    window.Flip7.EventBus = window.EventBus || EventBus;
    window.Flip7.GameEvents = window.GameEvents;
    window.Flip7.GameConstants = window.GameConstants;
    window.Flip7.Card = window.Card;
    window.Flip7.Deck = window.Deck;
    window.Flip7.Player = window.Player;
    
    // Create global event bus instance
    window.Flip7.eventBus = window.gameEventBus || new EventBus();
    
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