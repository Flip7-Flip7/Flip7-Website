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
        
        // Temporary storage for action cards awaiting target selection
        this.pendingActionCard = null;
        
        // Track if we're in initial deal phase
        this.isInitialDealPhase = false;
        
        // Initialize players
        this.initializePlayers(config.playerName);
        
        // Update CardManager with players reference
        this.cardManager.setPlayers(this.players);
        
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
        
        // Action card targeting
        this.eventBus.on(GameEvents.ACTION_CARD_TARGET_SELECTED, this.handleActionTargetSelected.bind(this));
        
        // Initial deal events
        this.eventBus.on(GameEvents.INITIAL_DEAL_ACTION_REQUIRED, this.handleInitialDealAction.bind(this));
        
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
        this.dealerIndex = 3; // Start with AI Bot 3 as dealer so human gets first card in round 1
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
        
        // Rotate dealer for each new round (except first round where dealer starts at index 3)
        if (this.roundNumber > 1) {
            this.dealerIndex = (this.dealerIndex + 1) % this.players.length;
        }
        
        // Emit round start event
        this.eventBus.emit(GameEvents.ROUND_START, {
            roundNumber: this.roundNumber,
            dealerIndex: this.dealerIndex
        });
        
        // Deal initial cards
        this.isInitialDealPhase = true;
        await this.cardManager.dealInitialCards(this.players, true);
        this.isInitialDealPhase = false;

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
        
        // Check if any players can still play
        const activePlayers = this.players.filter(p => p.canPlay());
        if (activePlayers.length === 0) {
            this.endRound();
            return;
        }
        
        // Find next active player
        let attempts = 0;
        while (!this.players[this.currentPlayerIndex].canPlay() && attempts < this.players.length) {
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
            attempts++;
        }
        
        // Safety check - if we couldn't find an active player after checking all positions
        if (!this.players[this.currentPlayerIndex].canPlay()) {
            console.error('GameEngine: Could not find active player, ending round');
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
        
        // Only emit CARD_DRAWN for cards that are actually added to hand
        // Action cards requiring immediate use and Second Chance scenarios should not trigger this event
        if (!result.requiresAction && !result.secondChanceUsed) {
            this.eventBus.emit(GameEvents.CARD_DRAWN, {
                player: player,
                card: result.card,
                result: result
            });
        }
        
        if (!result.success && result.reason === 'bust') {
            // Player busts
            player.status = 'busted';
            this.eventBus.emit(GameEvents.PLAYER_BUST, {
                player: player,
                card: result.card
            });
            this.endTurn();
        } else if (result.requiresAction) {
            // Handle special action cards - different flow for human vs AI
            this.handleActionCard(result.card, player);
        } else if (result.secondChanceUsed) {
            // Second Chance was used - cards already removed from hand and discarded
            // Update score and continue turn
            this.eventBus.emit(GameEvents.PLAYER_SCORE_UPDATE, {
                playerId: player.id,
                roundScore: player.calculateScore(),
                totalScore: player.totalScore
            });
            this.endTurn();
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
     * Handle action card drawn - different logic for human vs AI
     * @param {Card} card - Action card drawn
     * @param {Player} sourcePlayer - Player who drew the card
     * @param {boolean} skipTurnEnd - If true, don't end turn after AI execution (for Flip3 context)
     */
    handleActionCard(card, sourcePlayer, skipTurnEnd = false) {
        console.log(`GameEngine: Handling action card ${card.value} for ${sourcePlayer.name}, skipTurnEnd: ${skipTurnEnd}`);
        
        if (sourcePlayer.isHuman) {
            // Store action card temporarily for human players
            this.pendingActionCard = {
                card: card,
                sourcePlayer: sourcePlayer
            };
            
            // Human player - show targeting UI
            this.eventBus.emit(GameEvents.ACTION_CARD_TARGET_NEEDED, {
                card: card,
                sourcePlayer: sourcePlayer,
                availableTargets: this.getAvailableTargets(sourcePlayer, card)
            });
            // Turn will continue when target is selected
        } else {
            // AI player - auto-target and execute immediately
            const target = this.determineActionTarget(sourcePlayer, card);
            if (target) {
                this.executeActionCard(card, sourcePlayer, target);
            }
            
            // Only end turn if not in Flip3 context
            if (!skipTurnEnd) {
                this.endTurn();
            }
        }
    }
    
    /**
     * Handle action card target selection from UI
     * @param {Object} data - Target selection data
     */
    handleActionTargetSelected(data) {
        const { card, sourcePlayer, targetPlayer, isInitialDeal } = data;
        
        // Clear pending action card for regular gameplay
        if (!isInitialDeal && this.pendingActionCard) {
            this.pendingActionCard = null;
        }
        
        this.executeActionCard(card, sourcePlayer, targetPlayer);
        
        // Only end turn if not during initial deal
        if (!isInitialDeal) {
            this.endTurn();
        }
        // For initial deal, the CardManager's waitForActionResolution will handle continuation
    }
    
    /**
     * Handle action card drawn during initial deal
     * @param {Object} data - Action card data
     */
    handleInitialDealAction(data) {
        const { card, sourcePlayer, availableTargets, isInitialDeal } = data;
        console.log(`GameEngine: Handling initial deal action - ${sourcePlayer.name} drew ${card.value}`);
        
        if (sourcePlayer.isHuman) {
            console.log('GameEngine: Human player needs to select target via UI');
            // Human player needs to select target via UI
            // The UI will emit ACTION_CARD_TARGET_SELECTED with isInitialDeal: true
            this.eventBus.emit(GameEvents.ACTION_CARD_TARGET_NEEDED, {
                card: card,
                sourcePlayer: sourcePlayer,
                availableTargets: availableTargets,
                isInitialDeal: isInitialDeal
            });
        } else {
            console.log('GameEngine: AI player auto-selecting target');
            // AI player auto-selects target
            const target = this.determineActionTarget(sourcePlayer, card);
            if (target) {
                console.log(`GameEngine: AI ${sourcePlayer.name} targeting ${target.name} with ${card.value}`);
                // Use setTimeout to ensure CardManager listeners are set up first
                setTimeout(async () => {
                    await this.executeActionCard(card, sourcePlayer, target);
                }, 10);
            } else {
                console.log('GameEngine: No valid target found for AI player');
            }
            // The CardManager's waitForActionResolution will handle continuation
        }
    }
    
    /**
     * Execute action card on target
     * @param {Card} card - Action card
     * @param {Player} sourcePlayer - Player using card
     * @param {Player} targetPlayer - Target player
     */
    async executeActionCard(card, sourcePlayer, targetPlayer) {
        console.log(`GameEngine: Executing action card ${card.value} from ${sourcePlayer.name} to ${targetPlayer.name}`);
        
        if (card.value === 'freeze') {
            console.log('GameEngine: Processing freeze card');
            // Apply freeze via CardManager
            await this.cardManager.handleActionCard(card, sourcePlayer, targetPlayer);
            console.log('GameEngine: Freeze action completed, removing card from hand');
            
            // Remove from source player's hand and discard
            const removed = sourcePlayer.removeCard(card);
            console.log(`GameEngine: Card removal ${removed ? 'successful' : 'failed'}`);
            this.cardManager.discardCards([card]);
            console.log('GameEngine: Freeze card discarded');
            
            // Update score/state for target
            this.eventBus.emit(GameEvents.PLAYER_SCORE_UPDATE, {
                playerId: targetPlayer.id,
                roundScore: targetPlayer.calculateScore(),
                totalScore: targetPlayer.totalScore
            });
            console.log(`GameEngine: Updated ${targetPlayer.name} status to ${targetPlayer.status}`);
        }
        
        if (card.value === 'flip3') {
            const outcome = await this.cardManager.handleActionCard(card, sourcePlayer, targetPlayer);
            const dealtCards = outcome.dealtCards || [];
            const actionCards = outcome.actionCards || [];
            let busted = false;
            
            // Add all dealt cards to target player
            for (const c of dealtCards) {
                const addResult = targetPlayer.addCard(c);
                this.eventBus.emit(GameEvents.CARD_DEALT, {
                    card: c,
                    playerId: targetPlayer.id,
                    isInitialDeal: false
                });
                
                if (addResult.isFlip7) {
                    this.eventBus.emit(GameEvents.PLAYER_SCORE_UPDATE, {
                        playerId: targetPlayer.id,
                        roundScore: targetPlayer.calculateScore(),
                        totalScore: targetPlayer.totalScore
                    });
                }
            }
            
            // Check if target player busted (this happens in CardManager now)
            if (outcome.bustOnCard) {
                targetPlayer.status = 'busted';
                targetPlayer.roundScore = 0;
                this.eventBus.emit(GameEvents.PLAYER_BUST, { 
                    player: targetPlayer, 
                    card: dealtCards[dealtCards.length - 1] // Last dealt card before bust
                });
                busted = true;
            }
            
            // If no bust, give target player autonomy over action cards they drew
            if (!busted && actionCards.length > 0) {
                // Target player now has control over action cards they drew
                await this.processFlip3ActionCards(actionCards, targetPlayer);
            }
            
            // Remove from source player's hand and discard the original Flip3 card
            sourcePlayer.removeCard(card);
            this.cardManager.discardCards([card]);
            
            if (!busted) {
                // Update score after flip3 sequence
                this.eventBus.emit(GameEvents.PLAYER_SCORE_UPDATE, {
                    playerId: targetPlayer.id,
                    roundScore: targetPlayer.calculateScore(),
                    totalScore: targetPlayer.totalScore
                });
            }
        }
    }
    
    /**
     * Process action cards drawn during Flip3 - target player gains autonomy
     * @param {Array<Card>} actionCards - Action cards drawn during Flip3
     * @param {Player} targetPlayer - Player who gets autonomy over these action cards
     */
    async processFlip3ActionCards(actionCards, targetPlayer) {
        console.log(`GameEngine: Processing ${actionCards.length} action cards from Flip3 for ${targetPlayer.name}`);
        
        for (const actionCard of actionCards) {
            console.log(`GameEngine: Processing Flip3 action card: ${actionCard.value}`);
            
            if (actionCard.value === 'second chance') {
                console.log('GameEngine: Handling Second Chance from Flip3');
                // Handle Second Chance through CardManager (no targeting needed)
                const result = this.cardManager.handleSecondChanceCard(targetPlayer, actionCard);
                if (result.addedToHand) {
                    console.log('GameEngine: Second Chance added to player hand');
                } else if (result.givenTo) {
                    console.log(`GameEngine: Second Chance given to ${result.givenTo}`);
                }
                continue;
            }
            
            // For Freeze/Flip3 cards, use unified processing (card already added to hand above)
            if (actionCard.value === 'freeze' || actionCard.value === 'flip3') {
                console.log(`GameEngine: Processing ${actionCard.value} card (already in ${targetPlayer.name}'s hand) using unified flow`);
                
                // Process using the unified handleActionCard flow (same as regular gameplay)
                // Note: Card is already in player's hand from the dealtCards loop above
                // Use skipTurnEnd=true to prevent premature turn ending during Flip3 processing
                await this.handleActionCard(actionCard, targetPlayer, true);
            }
        }
        
        console.log('GameEngine: Finished processing Flip3 action cards');
    }
    
    /**
     * Get available targets for an action card
     * @param {Player} sourcePlayer - Player using the card
     * @param {Card} card - Action card
     * @returns {Array<Player>} Available targets
     */
    getAvailableTargets(sourcePlayer, card) {
        // For Freeze and Flip3, can target any active player (including self)
        return this.players.filter(p => p.status === 'active');
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
        // Prevent endTurn during initial deal phase
        if (this.isInitialDealPhase) {
            console.warn('GameEngine: endTurn called during initial deal phase - ignoring');
            return;
        }
        
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
        
        // Check for game end - highest score >= winning score wins
        const qualifyingPlayers = this.players.filter(p => p.totalScore >= this.winningScore);
        
        if (qualifyingPlayers.length > 0) {
            // Find highest score among qualifying players
            const highestScore = Math.max(...qualifyingPlayers.map(p => p.totalScore));
            const winners = qualifyingPlayers.filter(p => p.totalScore === highestScore);
            
            if (winners.length === 1) {
                // Clear winner
                this.endGame(winners[0]);
            } else {
                // Tie - continue to next round
                this.roundNumber++;
                setTimeout(() => this.startNewRound(), 2000);
            }
        } else {
            // No one reached winning score - continue
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