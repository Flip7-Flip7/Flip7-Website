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
import mobileStyles from './ui/styles/MobileStyles.js';

// Example of how the modules work together
class ModularGameExample {
    constructor() {
        this.players = [];
        this.currentPlayerIndex = 0;
        this.setupEventHandlers();
        this.initializePlayers();
    }

    /**
     * Setup event handlers to show module communication
     */
    setupEventHandlers() {
        // Game events
        eventBus.on(GameEvents.CARD_DRAWN, (data) => {
            console.log('Card drawn:', data);
            cardAnimations.displayCard(data.card, data.playerId);
        });

        eventBus.on(GameEvents.PLAYER_BUSTED, (data) => {
            console.log('Player busted:', data);
            const player = this.players.find(p => p.id === data.playerId);
            if (player) {
                playerAnimations.animateBust(player);
            }
        });

        eventBus.on(GameEvents.PLAYER_STAYED, (data) => {
            console.log('Player stayed:', data);
            const player = this.players.find(p => p.id === data.playerId);
            if (player) {
                playerAnimations.animateStay(player);
            }
        });

        eventBus.on(GameEvents.SCORE_UPDATED, (data) => {
            console.log('Score updated:', data);
            displayManager.updatePlayerScore(data);
        });

        // Animation complete handlers
        eventBus.on(GameEvents.ANIMATION_COMPLETED, (data) => {
            console.log('Animation completed:', data);
            // Continue game flow after animation
        });
    }

    /**
     * Initialize players
     */
    initializePlayers() {
        this.players = [
            new Player('player', 'You', true),
            new Player('opponent1', 'AI Bot 1', false),
            new Player('opponent2', 'AI Bot 2', false),
            new Player('opponent3', 'AI Bot 3', false)
        ];

        // Make game state accessible for DisplayManager
        window.gameState = {
            players: this.players,
            currentPlayerIndex: this.currentPlayerIndex,
            roundNumber: 1
        };
    }

    /**
     * Example: Player draws a card
     */
    examplePlayerDrawCard() {
        const player = this.players[0];
        const card = { type: 'number', value: 7, display: '7' };

        // Add card to player
        player.addCard(card);

        // Calculate new score
        const score = scoringEngine.calculateRoundScore(player);
        player.roundScore = score;

        // Emit events
        eventBus.emit(GameEvents.CARD_DRAWN, {
            card: card,
            playerId: player.id
        });

        eventBus.emit(GameEvents.SCORE_UPDATED, {
            playerId: player.id,
            roundScore: score,
            totalScore: player.totalScore
        });

        eventBus.emit(GameEvents.DISPLAY_UPDATE_REQUIRED);
    }

    /**
     * Example: Player busts
     */
    examplePlayerBust() {
        const player = this.players[0];
        player.bust();

        eventBus.emit(GameEvents.PLAYER_BUSTED, {
            playerId: player.id
        });

        eventBus.emit(GameEvents.DISPLAY_UPDATE_REQUIRED);
    }

    /**
     * Example: Player stays
     */
    examplePlayerStay() {
        const player = this.players[0];
        player.stay();

        eventBus.emit(GameEvents.PLAYER_STAYED, {
            playerId: player.id,
            roundScore: player.roundScore
        });

        eventBus.emit(GameEvents.DISPLAY_UPDATE_REQUIRED);
    }
}

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
        console.log('📱 MobileStyles: Loading mobile CSS for game UI');
        
        // All modules are already loaded and listening for events
        // GameEngine, AIPlayer, DeckManager, DisplayManager, CardAnimations, PlayerAnimations, UIController, MobileStyles
        
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
export default ModularGameExample;