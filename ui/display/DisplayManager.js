/**
 * DisplayManager - Central controller for all display updates
 * Subscribes to game events and updates the UI accordingly
 */
class DisplayManager {
    constructor() {
        this.eventBus = window.Flip7.eventBus || window.gameEventBus;
        this.initialized = false;
        this.isMobile = window.innerWidth <= GameConstants.BREAKPOINTS.MOBILE;
        
        // Subscribe to window resize
        window.addEventListener('resize', () => {
            this.isMobile = window.innerWidth <= GameConstants.BREAKPOINTS.MOBILE;
        });
        
        this.setupEventListeners();
    }

    /**
     * Setup event listeners for game events
     */
    setupEventListeners() {
        // Game state events
        this.eventBus.on(GameEvents.GAME_START, this.onGameStart.bind(this));
        this.eventBus.on(GameEvents.ROUND_START, this.onRoundStart.bind(this));
        this.eventBus.on(GameEvents.TURN_START, this.onTurnStart.bind(this));
        
        // Player events
        this.eventBus.on(GameEvents.PLAYER_SCORE_UPDATE, this.updatePlayerScore.bind(this));
        this.eventBus.on(GameEvents.PLAYER_BUST, this.onPlayerBust.bind(this));
        this.eventBus.on(GameEvents.PLAYER_FLIP7, this.onPlayerFlip7.bind(this));
        
        // Card events
        this.eventBus.on(GameEvents.CARD_DEALT, this.onCardDealt.bind(this));
        
        // UI update requests
        this.eventBus.on(GameEvents.UI_UPDATE_NEEDED, this.handleUpdateRequest.bind(this));
    }

    /**
     * Initialize the display manager
     */
    initialize() {
        if (this.initialized) return;
        
        console.log('DisplayManager initialized');
        this.initialized = true;
        
        // Initial UI setup
        this.setupInitialUI();
    }

    /**
     * Setup initial UI state
     */
    setupInitialUI() {
        // Hide loading screens, show game UI, etc.
        const gameContainer = document.querySelector('.game-container');
        if (gameContainer) {
            gameContainer.style.opacity = '1';
        }
    }

    /**
     * Handle game start event
     */
    onGameStart(data) {
        console.log('Display: Game started', data);
        this.updateGameStatus('Game Started');
    }

    /**
     * Handle round start event
     */
    onRoundStart(data) {
        console.log('Display: Round started', data);
        this.updateGameStatus(`Round ${data.roundNumber}`);
    }

    /**
     * Handle turn start event
     */
    onTurnStart(data) {
        const { player, playerIndex } = data;
        this.highlightCurrentPlayer(playerIndex);
        this.updateTurnIndicator(player);
    }

    /**
     * Update player score display
     */
    updatePlayerScore(data) {
        const { playerId, roundScore, totalScore } = data;
        
        // Update desktop display
        const desktopScoreElements = document.querySelectorAll(`#${playerId} .score-value`);
        desktopScoreElements.forEach(el => {
            el.textContent = totalScore;
        });
        
        const desktopRoundElements = document.querySelectorAll(`#${playerId} .round-value`);
        desktopRoundElements.forEach(el => {
            el.textContent = roundScore;
        });
        
        // Update mobile display if needed
        if (this.isMobile) {
            this.eventBus.emit(GameEvents.MOBILE_SYNC_NEEDED, { playerId });
        }
    }

    /**
     * Handle player bust event
     */
    onPlayerBust(data) {
        const { player } = data;
        const container = document.getElementById(player.id);
        if (container) {
            container.classList.add(GameConstants.UI_CLASSES.BUSTED);
        }
    }

    /**
     * Handle player Flip 7 event
     */
    onPlayerFlip7(data) {
        const { player } = data;
        console.log(`Display: ${player.name} got Flip 7!`);
        // Trigger celebration animation
        this.eventBus.emit('celebration:flip7', { player });
    }

    /**
     * Handle card dealt event
     */
    onCardDealt(data) {
        const { card, playerId } = data;
        // Card display will be handled by CardDisplay module
        this.eventBus.emit('card:display', { card, playerId });
    }

    /**
     * Highlight the current player
     */
    highlightCurrentPlayer(playerIndex) {
        // Remove all highlights
        document.querySelectorAll('.player-area').forEach((el, index) => {
            el.classList.remove(GameConstants.UI_CLASSES.CURRENT_TURN);
        });
        
        // Add highlight to current player
        const players = document.querySelectorAll('.player-area');
        if (players[playerIndex]) {
            players[playerIndex].classList.add(GameConstants.UI_CLASSES.CURRENT_TURN);
        }
    }

    /**
     * Update turn indicator
     */
    updateTurnIndicator(player) {
        const message = player.isHuman ? "Your turn!" : `${player.name}'s turn...`;
        this.updateGameStatus(message);
    }

    /**
     * Update game status message
     */
    updateGameStatus(message) {
        // Update desktop status
        const statusElements = document.querySelectorAll('.game-status');
        statusElements.forEach(el => {
            el.textContent = message;
        });
        
        // Update mobile status
        const mobileStatus = document.getElementById('mobile-game-info');
        if (mobileStatus) {
            mobileStatus.textContent = message;
        }
    }

    /**
     * Handle generic UI update requests
     */
    handleUpdateRequest(data) {
        const { type, ...params } = data;
        
        switch (type) {
            case 'deckReshuffled':
                this.updateDeckCount(params.cardsRemaining);
                break;
            case 'gameLog':
                this.addToGameLog(params.message);
                break;
            default:
                console.log('Unknown UI update type:', type);
        }
    }

    /**
     * Update deck card count
     */
    updateDeckCount(count) {
        const elements = [
            document.getElementById('cards-remaining'),
            document.getElementById('mobile-cards-remaining')
        ];
        
        elements.forEach(el => {
            if (el) el.textContent = count;
        });
    }

    /**
     * Add message to game log
     */
    addToGameLog(message) {
        const logContent = document.getElementById('log-content');
        if (logContent) {
            const entry = document.createElement('div');
            entry.className = 'log-entry';
            entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
            logContent.appendChild(entry);
            logContent.scrollTop = logContent.scrollHeight;
        }
    }
}

// Create singleton instance
window.Flip7 = window.Flip7 || {};
window.Flip7.DisplayManager = DisplayManager;