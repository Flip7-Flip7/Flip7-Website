// UIController.js - Basic UI integration for testing game logic

import eventBus from '../events/EventBus.js';
import { GameEvents } from '../events/GameEvents.js';

export class UIController {
    constructor() {
        this.buttonsInitialized = false;
        this.setupEventListeners();
        
        // Initialize buttons when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeButtons());
        } else {
            // DOM is already ready
            this.initializeButtons();
        }
    }

    /**
     * Setup event listeners for game state changes
     */
    setupEventListeners() {
        eventBus.on(GameEvents.GAME_STARTED, () => this.onGameStarted());
        eventBus.on(GameEvents.TURN_STARTED, (data) => this.onTurnStarted(data));
        eventBus.on(GameEvents.PLAYER_BUSTED, () => this.disablePlayerButtons());
        eventBus.on(GameEvents.PLAYER_STAYED, () => this.disablePlayerButtons());
        eventBus.on(GameEvents.PLAYER_FROZEN, () => this.disablePlayerButtons());
        eventBus.on(GameEvents.ROUND_ENDED, () => this.disablePlayerButtons());
        eventBus.on(GameEvents.GAME_ENDED, () => this.onGameEnded());
        eventBus.on(GameEvents.ACTION_CARD_AWAITING_TARGET, () => this.disablePlayerButtons());
        eventBus.on(GameEvents.PLAYER_TAPPED_FOR_TARGET, () => this.updateButtonStates());
        
        // Flip3 animation events
        eventBus.on(GameEvents.FLIP3_ANIMATION_STARTED, () => this.onFlip3AnimationStarted());
        eventBus.on(GameEvents.FLIP3_ANIMATION_COMPLETED, () => this.onFlip3AnimationCompleted());
    }

    /**
     * Initialize button event handlers
     */
    initializeButtons() {
        if (this.buttonsInitialized) return;
        
        // Hit buttons
        const hitBtns = [
            document.getElementById('hit-btn'),
            document.getElementById('mobile-hit-btn')
        ].filter(btn => btn !== null);

        hitBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                console.log('👆 UIController: Hit button clicked');
                eventBus.emit(GameEvents.PLAYER_ACTION_HIT);
            });
        });

        // Stay buttons  
        const stayBtns = [
            document.getElementById('stay-btn'),
            document.getElementById('mobile-stay-btn')
        ].filter(btn => btn !== null);

        stayBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                console.log('👆 UIController: Stay button clicked');
                eventBus.emit(GameEvents.PLAYER_ACTION_STAY);
            });
        });

        // New Game buttons
        const newGameBtns = [
            document.getElementById('new-game-btn'),
            document.getElementById('mobile-new-game-btn')
        ].filter(btn => btn !== null);

        newGameBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                console.log('👆 UIController: New Game button clicked');
                eventBus.emit(GameEvents.NEW_GAME_REQUESTED);
            });
        });

        // Rules buttons (basic functionality)
        const rulesBtns = [
            document.getElementById('rules-btn'),
            document.getElementById('mobile-rules-btn')
        ].filter(btn => btn !== null);

        rulesBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                console.log('👆 UIController: Rules button clicked');
                this.toggleRules();
            });
        });

        // Close rules button
        const closeRulesBtn = document.getElementById('close-rules-btn');
        if (closeRulesBtn) {
            closeRulesBtn.addEventListener('click', () => {
                console.log('👆 UIController: Close Rules button clicked');
                this.hideRules();
            });
        }

        this.buttonsInitialized = true;
        const totalButtons = hitBtns.length + stayBtns.length + newGameBtns.length + rulesBtns.length;
    }

    /**
     * Handle game started
     */
    onGameStarted() {
        console.log('🎮 UIController: Game started');
        this.disablePlayerButtons(); // Disabled until human player's turn
    }

    /**
     * Handle turn started
     */
    onTurnStarted(data) {
        console.log('🎮 UIController: Turn started for', data.playerName, 'isHuman:', data.isHuman);
        
        if (data.isHuman) {
            console.log('👤 UIController: Human turn - enabling buttons');
            this.enablePlayerButtons();
        } else {
            console.log('🤖 UIController: AI turn - disabling buttons');
            this.disablePlayerButtons();
        }
    }

    /**
     * Handle game ended
     */
    onGameEnded() {
        console.log('🎮 UIController: Game ended');
        this.disablePlayerButtons();
    }

    /**
     * Enable player action buttons
     */
    enablePlayerButtons() {
        const hitBtns = [
            document.getElementById('hit-btn'),
            document.getElementById('mobile-hit-btn')
        ].filter(btn => btn !== null);

        const stayBtns = [
            document.getElementById('stay-btn'),
            document.getElementById('mobile-stay-btn')
        ].filter(btn => btn !== null);

        console.log(`🔄 UIController: Enabling buttons - Hit: ${hitBtns.length}, Stay: ${stayBtns.length}`);

        hitBtns.forEach(btn => {
            if (btn) {
                btn.disabled = false;
                btn.style.opacity = '1';
                console.log(`✅ UIController: Enabled hit button: ${btn.id}`);
            }
        });

        stayBtns.forEach(btn => {
            if (btn) {
                btn.disabled = false;
                btn.style.opacity = '1';
                console.log(`✅ UIController: Enabled stay button: ${btn.id}`);
            }
        });
    }

    /**
     * Disable player action buttons
     */
    disablePlayerButtons() {
        const hitBtns = [
            document.getElementById('hit-btn'),
            document.getElementById('mobile-hit-btn')
        ].filter(btn => btn !== null);

        const stayBtns = [
            document.getElementById('stay-btn'),
            document.getElementById('mobile-stay-btn')
        ].filter(btn => btn !== null);

        hitBtns.forEach(btn => {
            if (btn) {
                btn.disabled = true;
                btn.style.opacity = '0.5';
            }
        });

        stayBtns.forEach(btn => {
            if (btn) {
                btn.disabled = true;
                btn.style.opacity = '0.5';
            }
        });
    }

    /**
     * Update button states based on game state
     */
    updateButtonStates() {
        // Check if it's human player's turn
        const gameState = window.gameState;
        if (gameState && gameState.players) {
            const currentPlayer = gameState.players[gameState.currentPlayerIndex];
            if (currentPlayer && currentPlayer.isHuman && currentPlayer.status === 'active') {
                this.enablePlayerButtons();
            } else {
                this.disablePlayerButtons();
            }
        }
    }

    /**
     * Toggle rules modal
     */
    toggleRules() {
        const rulesModal = document.getElementById('rules-modal');
        if (rulesModal) {
            const isVisible = rulesModal.style.display === 'flex';
            if (isVisible) {
                this.hideRules();
            } else {
                this.showRules();
            }
        }
    }

    /**
     * Show rules modal
     */
    showRules() {
        const rulesModal = document.getElementById('rules-modal');
        if (rulesModal) {
            rulesModal.style.display = 'flex';
            console.log('📋 UIController: Rules shown');
        }
    }

    /**
     * Hide rules modal
     */
    hideRules() {
        const rulesModal = document.getElementById('rules-modal');
        if (rulesModal) {
            rulesModal.style.display = 'none';
            console.log('📋 UIController: Rules hidden');
        }
    }

    /**
     * Show simple message to user
     */
    showMessage(message) {
        // Simple console log for now - can be enhanced later
        console.log('💬 Message:', message);
        
        // Try to show in game message area if it exists
        const messageElement = document.getElementById('game-message');
        if (messageElement) {
            messageElement.textContent = message;
            messageElement.style.display = 'block';
            
            setTimeout(() => {
                messageElement.style.display = 'none';
            }, 3000);
        }
    }

    /**
     * Handle Flip3 animation started - disable player buttons
     */
    onFlip3AnimationStarted() {
        console.log('🎬 UIController: Flip3 animation started - disabling buttons');
        this.disablePlayerButtons();
    }

    /**
     * Handle Flip3 animation completed - update button states
     */
    onFlip3AnimationCompleted() {
        console.log('🎬 UIController: Flip3 animation completed - updating button states');
        this.updateButtonStates();
    }
}

// Create singleton instance
const uiController = new UIController();
export default uiController;