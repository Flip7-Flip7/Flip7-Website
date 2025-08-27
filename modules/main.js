// main.js - Initialize the modular Flip 7 game

// Import all required modules
import eventBus from './events/EventBus.js';
import { GameEvents } from './events/GameEvents.js';
import displayManager from './ui/display/DisplayManager.js';
import cardAnimations from './ui/animations/CardAnimations.js';
import playerAnimations from './ui/animations/PlayerAnimations.js';
import scoringEngine from './game/rules/ScoringEngine.js';
import { Player } from './game/core/Player.js';

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

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('Modular Flip 7 Game - Example Initialization');
    
    // Create example instance
    const gameExample = new ModularGameExample();
    
    // Expose for testing in console
    window.modularGame = gameExample;
    
    console.log('Modules loaded and ready!');
    console.log('Try in console:');
    console.log('- modularGame.examplePlayerDrawCard()');
    console.log('- modularGame.examplePlayerBust()');
    console.log('- modularGame.examplePlayerStay()');
});

// Export for use in other modules
export default ModularGameExample;