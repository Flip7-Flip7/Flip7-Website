// main.js - Initialize the modular Flip 7 game

// Import all required modules
import eventBus from './events/EventBus.js';
import { GameEvents } from './events/GameEvents.js';
import displayManager from './ui/display/DisplayManager.js';
import cardAnimations from './ui/animations/CardAnimations.js';
import playerAnimations from './ui/animations/PlayerAnimations.js';
import scoringEngine from './game/rules/ScoringEngine.js';
import { Player } from './game/core/Player.js';
import gameEngine from './game/core/GameEngine.js';
import aiPlayer from './game/ai/AIPlayer.js';
import deckManager from './game/deck/DeckManager.js';
import uiController from './ui/UIController.js';


// Main game initialization class
class Flip7ModularGame {
    constructor() {
        console.log('🎮 Flip7ModularGame: Initializing...');
        this.initializeGame();
    }
    
    /**
     * Initialize the complete game system
     */
    initializeGame() {
        console.log('🎮 Flip7ModularGame: Game system initialized');
        
        // All modules are already loaded and listening for events
        // GameEngine, AIPlayer, DeckManager, DisplayManager, CardAnimations, PlayerAnimations, UIController
        
        // Start the game automatically after a short delay
        setTimeout(() => {
            console.log('🎮 Starting new game automatically...');
            eventBus.emit(GameEvents.NEW_GAME_REQUESTED);
        }, 500);
    }
    
    /**
     * Manual game restart
     */
    restartGame() {
        console.log('🔄 Restarting game...');
        eventBus.emit(GameEvents.NEW_GAME_REQUESTED);
    }
    
    /**
     * Get current game state for debugging
     */
    getGameState() {
        return window.gameState;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Flip 7 Modular Game - Full System Initialization');
    
    // Create the main game instance
    const flip7Game = new Flip7ModularGame();
    
    // Expose for testing in console
    window.flip7Game = flip7Game;
    window.gameEngine = gameEngine;
    window.uiController = uiController;
    
    console.log('✅ All modules loaded and game ready!');
    console.log('🎮 Game will start automatically in 0.5 seconds');
    console.log('📱 Use Hit/Stay buttons to play, or flip7Game.restartGame() to restart');
});

// Export for use in other modules
export default Flip7ModularGame;