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
        
        // Game state
        this.players = [];
        this.currentPlayerIndex = 0;
        this.dealerIndex = 0;
        this.roundNumber = 1;
        this.gameActive = false;
        this.winningScore = config.winningScore || GameConstants.WINNING_SCORE;
        
        // Initialize players
        this.initializePlayers(config.playerName);
        
        // Setup event listeners
        this.setupEventListeners();
        
        console.log('GameEngine initialized');
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
     * Setup event listeners for game flow
     */
    setupEventListeners() {
        // Player actions
        this.eventBus.on(GameEvents.PLAYER_HIT, this.handlePlayerHit.bind(this));
        this.eventBus.on(GameEvents.PLAYER_STAY, this.handlePlayerStay.bind(this));
        
        // TODO: Special card actions
        // this.eventBus.on('action:freeze:target', this.handleFreezeTarget.bind(this));
        // this.eventBus.on('action:flip3:target', this.handleFlip3Target.bind(this));
        
        // Animation completion
        this.eventBus.on(GameEvents.ANIMATION_COMPLETE, this.handleAnimationComplete.bind(this));
    }

    /**
     * Start a new game
     */
    startNewGame() {
        console.log('Starting new game');
        
        // Reset game state
        this.roundNumber = 1;
        this.gameActive = true;
        this.players.forEach(player => player.totalScore = 0);
        
        // Fresh deck only at the start of a NEW GAME (not each round)
        if (this.deck && typeof this.deck.reset === 'function') {
            this.deck.reset();
        }
        
        // Emit game start event
        this.eventBus.emit(GameEvents.GAME_START, {
            players: this.players.map(p => p.getState()),
            winningScore: this.winningScore
        });
        
        // Start first round
        this.startNewRound();
    }

    /**
     * Start a new round
     */
    async startNewRound() {
        console.log(`Starting round ${this.roundNumber}`);
        
        // Reset players for new round
        this.players.forEach(player => {
            player.resetForNewRound();
            player.status = 'active';
        });
        
        // Set dealer
        this.dealerIndex = (this.roundNumber - 1) % this.players.length;
        
        // Emit round start event
        this.eventBus.emit(GameEvents.ROUND_START, {
            roundNumber: this.roundNumber,
            dealerIndex: this.dealerIndex
        });
        
        // Deal initial cards
        await this.cardManager.dealInitialCards(this.players, true);

        this.players.forEach(player => {
            // Update the player's round score display immediately
            this.eventBus.emit(GameEvents.PLAYER_SCORE_UPDATE, {
                playerId: player.id,
                roundScore: player.calculateScore(),
                totalScore: player.totalScore
            });
        });
        
        // Start first turn
        this.currentPlayerIndex = (this.dealerIndex + 1) % this.players.length;
        this.startNextTurn();
    }

    /**
     * Start the next turn
     */
    startNextTurn() {
        // Check if round should end
        if (this.shouldEndRound()) {
            this.endRound();
            return;
        }
        
        // Find next active player
        let attempts = 0;
        while (!this.players[this.currentPlayerIndex].canPlay() && attempts < this.players.length) {
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
            attempts++;
        }
        
        // Check if any players can still play
        const activePlayers = this.players.filter(p => p.canPlay());
        if (activePlayers.length === 0) {
            this.endRound();
            return;
        }
        
        const currentPlayer = this.players[this.currentPlayerIndex];
        
        // Emit turn start event
        this.eventBus.emit(GameEvents.TURN_START, {
            player: currentPlayer,
            playerIndex: this.currentPlayerIndex
        });
        
        // Handle AI turn
        if (!currentPlayer.isHuman) {
            setTimeout(() => this.executeAITurn(currentPlayer), GameConstants.AI_DECISION_DELAY);
        }
    }

    /**
     * Handle player hit action
     * @param {Object} data - Event data
     */
    handlePlayerHit(data) {
        const player = this.players[this.currentPlayerIndex];
        if (!player.isHuman || !player.canPlay()) return;
        
        this.executePlayerHit(player);
    }

    /**
     * Handle player stay action
     * @param {Object} data - Event data
     */
    handlePlayerStay(data) {
        const player = this.players[this.currentPlayerIndex];
        if (!player.isHuman || !player.canPlay()) return;
        
        this.executePlayerStay(player);
    }

    /**
     * Execute hit action for a player
     * @param {Player} player - The player hitting
     */
    executePlayerHit(player) {
        console.log(`Player ${player.id} hit`);
        const result = this.cardManager.drawCardForPlayer(player);
        
        // Emit card drawn event
        this.eventBus.emit(GameEvents.CARD_DRAWN, {
            player: player,
            card: result.card,
            result: result
        });
        
        if (!result.success && result.reason === 'bust') {
            // Player busts
            player.status = 'busted';
            this.eventBus.emit(GameEvents.PLAYER_BUST, {
                player: player,
                card: result.card
            });
            this.endTurn();
        } else if (result.requiresAction) {
            // Handle special action cards immediately (minimal flow)
            this.executeActionCardFlow(result.card, player).then(() => {
                // After handling action, end turn to keep flow moving
                this.endTurn();
            });
        } else if (result.isFlip7) {
            // Player got Flip 7
            this.endTurn();
        } else {
            // Normal card - continue turn
            this.eventBus.emit(GameEvents.PLAYER_SCORE_UPDATE, {
                playerId: player.id,
                roundScore: player.calculateScore(),
                totalScore: player.totalScore
            });
            this.endTurn();
        }
    }

    /**
     * Minimal special action handling to keep game flow
     * @param {Card} card
     * @param {Player} sourcePlayer
     */
    async executeActionCardFlow(card, sourcePlayer) {
        // Determine a target (simple AI-style targeting for now)
        const target = this.determineActionTarget(sourcePlayer, card);
        if (!target) return;
        
        if (card.value === 'freeze') {
            // Apply freeze via CardManager
            this.cardManager.handleActionCard(card, sourcePlayer, target);
            // Discard the action card
            this.cardManager.discardCards([card]);
            // Frozen players effectively stop playing; emit score/state update
            this.eventBus.emit(GameEvents.PLAYER_SCORE_UPDATE, {
                playerId: target.id,
                roundScore: target.calculateScore(),
                totalScore: target.totalScore
            });
            return;
        }
        
        if (card.value === 'flip3') {
            const outcome = await this.cardManager.handleActionCard(card, sourcePlayer, target);
            // Add drawn cards to target and emit events for display
            const cards = outcome.cards || [];
            let busted = false;
            for (let i = 0; i < cards.length; i++) {
                const c = cards[i];
                const addResult = target.addCard(c);
                this.eventBus.emit(GameEvents.CARD_DEALT, {
                    card: c,
                    playerId: target.id,
                    isInitialDeal: false
                });
                if (outcome.bustOnCard && (i + 1) === outcome.bustOnCard) {
                    target.status = 'busted';
                    target.roundScore = 0;
                    this.eventBus.emit(GameEvents.PLAYER_BUST, { player: target, card: c });
                    busted = true;
                    break;
                }
                if (addResult.isFlip7) {
                    // End round will be handled by round flow; for now just update
                    this.eventBus.emit(GameEvents.PLAYER_SCORE_UPDATE, {
                        playerId: target.id,
                        roundScore: target.calculateScore(),
                        totalScore: target.totalScore
                    });
                }
            }
            
            // Discard the action card used
            this.cardManager.discardCards([card]);
            
            if (!busted) {
                // Update score after flip3 sequence
                this.eventBus.emit(GameEvents.PLAYER_SCORE_UPDATE, {
                    playerId: target.id,
                    roundScore: target.calculateScore(),
                    totalScore: target.totalScore
                });
            }
            return;
        }
    }

    /**
     * Simple action targeting used to keep the game moving
     */
    determineActionTarget(sourcePlayer, card) {
        // Prefer active opponents; fallback to self where appropriate
        const activeOpponents = this.players.filter(p => p.id !== sourcePlayer.id && p.status === 'active');
        if (card.value === 'freeze') {
            // Target highest total score among active opponents, else self
            if (activeOpponents.length > 0) {
                const sorted = [...activeOpponents].sort((a,b) => b.totalScore - a.totalScore);
                return sorted[0];
            }
            return sourcePlayer;
        }
        if (card.value === 'flip3') {
            // If source has few cards, use self; else random active opponent
            if (sourcePlayer.numberCards.length < 3) return sourcePlayer;
            if (activeOpponents.length > 0) {
                return activeOpponents[Math.floor(Math.random() * activeOpponents.length)];
            }
            return sourcePlayer;
        }
        return sourcePlayer;
    }

    /**
     * Execute stay action for a player
     * @param {Player} player - The player staying
     */
    executePlayerStay(player) {
        console.log(`Player ${player.id} stayed`);
        player.status = 'stayed';
        player.calculateScore();
        
        this.eventBus.emit(GameEvents.PLAYER_STAY, {
            player: player,
            score: player.roundScore
        });
        
        this.endTurn();
    }

    /**
     * Execute AI turn
     * @param {Player} aiPlayer - The AI player
     */
    executeAITurn(aiPlayer) {
        // Simple AI logic - can be enhanced with AI modules
        const shouldHit = this.calculateAIShouldHit(aiPlayer);
        
        this.eventBus.emit(GameEvents.AI_DECISION_MADE, {
            player: aiPlayer,
            decision: shouldHit ? 'hit' : 'stay'
        });
        
        if (shouldHit) {
            this.executePlayerHit(aiPlayer);
        } else {
            this.executePlayerStay(aiPlayer);
        }
    }

    /**
     * Simple AI decision logic
     * @param {Player} player - The AI player
     * @returns {boolean} Whether to hit
     */
    calculateAIShouldHit(player) {
        const uniqueCount = player.uniqueNumbers.size;
        const currentScore = player.calculateScore();
        
        // Priority: Get Flip 7 if close
        if (uniqueCount >= 5 && uniqueCount < 7) return true;
        
        // Conservative if high score
        if (currentScore >= 40) return false;
        
        // Aggressive if low score
        if (currentScore < 20) return true;
        
        // Random for medium scores
        return Math.random() < 0.5;
    }

    /**
     * End the current turn
     */
    endTurn() {
        this.eventBus.emit(GameEvents.TURN_END, {
            player: this.players[this.currentPlayerIndex]
        });
        
        // Move to next player
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        
        // Start next turn after a delay
        setTimeout(() => this.startNextTurn(), 500);
    }

    /**
     * Check if round should end
     * @returns {boolean}
     */
    shouldEndRound() {
        // Check if someone got Flip 7
        const flip7Player = this.players.find(p => p.status === 'flip7');
        if (flip7Player) return true;
        
        // Check if all players are done
        const activePlayers = this.players.filter(p => p.canPlay());
        return activePlayers.length === 0;
    }

    /**
     * End the current round
     */
    endRound() {
        console.log('Ending round');
        
        // Calculate scores
        this.players.forEach(player => {
            if (player.status !== 'busted') {
                player.calculateScore();
                player.totalScore += player.roundScore;
            }
        });
        
        // Move all players' cards to discard pile so deck persists across rounds
        try {
            const allCards = [];
            this.players.forEach(player => {
                if (player.numberCards && player.numberCards.length) {
                    allCards.push(...player.numberCards);
                }
                if (player.modifierCards && player.modifierCards.length) {
                    allCards.push(...player.modifierCards);
                }
                if (player.actionCards && player.actionCards.length) {
                    allCards.push(...player.actionCards);
                }
            });
            if (allCards.length > 0) {
                this.cardManager.discardCards(allCards);
            }
        } catch (e) {
            console.warn('Failed to discard round cards:', e);
        }
        
        // Emit round end event
        this.eventBus.emit(GameEvents.ROUND_END, {
            roundNumber: this.roundNumber,
            scores: this.players.map(p => ({
                player: p.getState(),
                roundScore: p.roundScore,
                totalScore: p.totalScore
            }))
        });
        
        // Check for winner
        const winner = this.players.find(p => p.totalScore >= this.winningScore);
        if (winner) {
            this.endGame(winner);
        } else {
            // Start next round after delay
            this.roundNumber++;
            setTimeout(() => this.startNewRound(), 2000);
        }
    }

    /**
     * End the game
     * @param {Player} winner - The winning player
     */
    endGame(winner) {
        this.gameActive = false;
        
        this.eventBus.emit(GameEvents.GAME_END, {
            winner: winner.getState(),
            finalScores: this.players.map(p => ({
                player: p.getState(),
                totalScore: p.totalScore
            }))
        });
    }

    /**
     * Handle animation completion
     * @param {Object} data - Animation data
     */
    handleAnimationComplete(data) {
        // Continue game flow after animations
        if (data.type === 'cardDeal' && data.isLastCard) {
            // All initial cards dealt, can start game
        }
    }

    /**
     * Get current game state
     * @returns {Object}
     */
    getGameState() {
        return {
            gameActive: this.gameActive,
            roundNumber: this.roundNumber,
            currentPlayerIndex: this.currentPlayerIndex,
            dealerIndex: this.dealerIndex,
            players: this.players.map(p => p.getState()),
            deckRemaining: this.deck.getCardsRemaining()
        };
    }
}

// Make available globally
window.GameEngine = GameEngine;