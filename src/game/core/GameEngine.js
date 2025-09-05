/**
 * GameEngine - Main game controller that coordinates all modules
 * This is the central hub that manages game flow and module interactions
 */
class GameEngine {
    constructor(config = {}) {
        // Core components
        this.eventBus = window.gameEventBus || new EventBus();
        this.deck = new Deck();
        this.cardManager = new CardManager(this.deck, this.eventBus);
        
        // Initialize players first
        this.players = [];
        this.initializePlayers(config.playerName);
        
        // Initialize manager modules
        this.aiManager = new AIManager(this.eventBus);
        this.turnManager = new TurnManager(this.eventBus);
        this.gameStateManager = new GameStateManager(this.eventBus, config.winningScore);
        this.actionCardHandler = new ActionCardHandler(this.eventBus, this.cardManager);
        
        // Track if we're in initial deal phase
        this.isInitialDealPhase = false;
        
        // Update CardManager with players reference
        this.cardManager.setPlayers(this.players);
        
        // Setup event listeners
        this.setupEventListeners();
        
        console.log('GameEngine initialized with modular architecture');
    }

    /**
     * Initialize players
     * @param {string} playerName - Human player's name
     */
    initializePlayers(playerName = 'Player') {
        // Human player
        this.players.push(new Player({
            id: 'player',
            name: playerName,
            isHuman: true,
            elementId: 'player'
        }));
        
        // AI players
        for (let i = 0; i < 3; i++) {
            this.players.push(new Player({
                id: `opponent${i + 1}`,
                name: GameConstants.AI_NAMES[i],
                isHuman: false,
                elementId: `opponent${i + 1}`
            }));
        }
    }

    /**
     * Setup event listeners for game flow coordination
     */
    setupEventListeners() {
        // Initial deal events
        this.eventBus.on(GameEvents.INITIAL_DEAL_COMPLETE, this.handleInitialDealComplete.bind(this));
        
        // Cross-module coordination events
        this.eventBus.on(GameEvents.REQUEST_INITIAL_DEAL, this.handleRequestInitialDeal.bind(this));
        this.eventBus.on(GameEvents.REQUEST_NEXT_TURN, this.handleRequestNextTurn.bind(this));
        this.eventBus.on(GameEvents.EXECUTE_HIT, this.handleExecuteHit.bind(this));
        this.eventBus.on(GameEvents.ACTION_CARD_DRAWN, this.handleActionCardDrawn.bind(this));
    }

    /**
     * Check if a game is currently in progress
     * @returns {boolean}
     */
    isGameInProgress() {
        return this.gameStateManager?.gameActive || false;
    }

    /**
     * Start a new game
     */
    async startNewGame() {
        // Prevent starting a new game if one is already in progress
        if (this.isGameInProgress()) {
            console.warn('GameEngine: Game already in progress, ignoring startNewGame request');
            return;
        }
        // Reset all managers
        this.turnManager.reset();
        this.gameStateManager.reset();
        
        await this.gameStateManager.startNewGame(this.players, this.deck);
    }

    /**
     * Handle request to deal initial cards
     */
    async handleRequestInitialDeal(data) {
        const { players, dealerIndex } = data;
        
        if (window.DEBUG_MODE) {
            console.log(`🔍 DEBUG GameEngine.handleRequestInitialDeal:`, {
                dealerIndex: dealerIndex,
                playersLength: players.length,
                dealerName: players[dealerIndex]?.name,
                calculatedStartingIndex: (dealerIndex + 1) % players.length,
                startingPlayerName: players[(dealerIndex + 1) % players.length]?.name
            });
        }
        
        // Deal initial cards
        this.isInitialDealPhase = true;
        await this.cardManager.dealInitialCards(players, dealerIndex);
        this.isInitialDealPhase = false;

        players.forEach(player => {
            // Update the player's round score display immediately
            this.eventBus.emit(GameEvents.PLAYER_SCORE_UPDATE, {
                playerId: player.id,
                roundScore: player.calculateScore(),
                totalScore: player.totalScore
            });
        });
        
        // Note: Don't set turn index here - startNextTurn() will find the correct starting player
        // after initial deal completes. This prevents race condition where we override the correct index.
        if (window.DEBUG_MODE) {
            console.log(`🔍 DEBUG GameEngine: Initial deal complete, startNextTurn will find starting player after dealer ${dealerIndex}`);
        }
    }

    /**
     * Handle request to start next turn
     */
    handleRequestNextTurn() {
        const context = {
            isInitialDealPhase: this.isInitialDealPhase,
            gameState: this.getGameState(),
            aiManager: this.aiManager,
            isFirstTurn: this.isFirstTurnOfRound || false
        };
        
        // Clear the first turn flag after using it
        if (this.isFirstTurnOfRound) {
            this.isFirstTurnOfRound = false;
        }
        
        this.turnManager.startNextTurn(
            this.players, 
            this.gameStateManager.dealerIndex,
            context
        );
    }

    /**
     * Handle execute hit request from TurnManager
     */
    handleExecuteHit(data) {
        const { player, onComplete } = data;
        const result = this.cardManager.drawCardForPlayer(player);
        onComplete(result);
    }

    /**
     * Handle action card drawn event
     */
    async handleActionCardDrawn(data) {
        const { card, sourcePlayer } = data;
        
        const options = {
            skipTurnEnd: false,
            aiManager: this.aiManager,
            players: this.players
        };
        
        await this.actionCardHandler.handleActionCard(card, sourcePlayer, options);
    }

    /**
     * Handle initial deal completion
     */
    handleInitialDealComplete(data) {
        console.log('GameEngine: Initial deal completed, starting first turn');
        
        // Mark that this is the first turn of the round for proper dealer rotation
        this.isFirstTurnOfRound = true;
        
        // Request first turn from TurnManager
        this.eventBus.emit(GameEvents.REQUEST_NEXT_TURN);
    }

    /**
     * Get current game state
     * @returns {Object}
     */
    getGameState() {
        const gameState = this.gameStateManager.getState();
        const turnState = {
            currentPlayerIndex: this.turnManager.getCurrentPlayerIndex()
        };
        
        return {
            ...gameState,
            ...turnState,
            players: this.players.map(p => p.getState()),
            deckRemaining: this.deck.getCardsRemaining(),
            isInitialDealPhase: this.isInitialDealPhase
        };
    }
}

// Make available globally
window.GameEngine = GameEngine;