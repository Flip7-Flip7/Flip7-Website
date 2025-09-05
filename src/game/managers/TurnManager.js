/**
 * TurnManager - Handles turn flow and player actions
 */
class TurnManager {
    constructor(eventBus) {
        this.eventBus = eventBus;
        
        // Turn management state
        this.currentPlayerIndex = 0;
        this.currentTurnTimeout = null;
        this.aiTurnInProgress = false;
        this.turnEnding = false;
        
        // Action blocking state
        this.actionInProgress = false;
        this.actionDisplayPhase = false;
        
        this.setupEventListeners();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Player actions
        this.eventBus.on(GameEvents.PLAYER_HIT, this.handlePlayerHit.bind(this));
        this.eventBus.on(GameEvents.PLAYER_STAY, this.handlePlayerStay.bind(this));
        
        // Player state changes
        this.eventBus.on(GameEvents.PLAYER_FROZEN, this.handlePlayerFrozen.bind(this));
        
        // Action card completion
        this.eventBus.on(GameEvents.ACTION_CARD_EXECUTION_COMPLETE, this.handleActionCardComplete.bind(this));
        this.eventBus.on(GameEvents.FLIP3_PROCESSING_COMPLETE, this.handleFlip3ProcessingComplete.bind(this));
        this.eventBus.on(GameEvents.SECOND_CHANCE_ANIMATION_COMPLETE, this.handleSecondChanceAnimationComplete.bind(this));
    }

    /**
     * Set the current player index
     */
    setCurrentPlayerIndex(index) {
        this.currentPlayerIndex = index;
    }

    /**
     * Get current player index
     */
    getCurrentPlayerIndex() {
        return this.currentPlayerIndex;
    }

    /**
     * Start the next turn
     * @param {Array<Player>} players - All players
     * @param {number} dealerIndex - Current dealer index
     * @param {Object} context - Additional context (gameState, aiManager, etc)
     */
    startNextTurn(players, dealerIndex, context) {
        const { isInitialDealPhase, gameState, aiManager, isFirstTurn } = context;
        
        // Block if any action is in progress
        if (this.actionInProgress || this.actionDisplayPhase) {
            console.log('TurnManager: Blocking startNextTurn - action in progress');
            return;
        }
        
        // Block if Flip3 animation is active
        const displayManager = window.Flip7?.display;
        if (displayManager?.isFlip3Active()) {
            console.log('TurnManager: Blocking startNextTurn - Flip3 animation active');
            return;
        }
        
        // Block if Second Chance animation is active
        if (displayManager?.isSecondChanceActive?.()) {
            console.log('TurnManager: Blocking startNextTurn - Second Chance animation active');
            return;
        }
        
        // Safety check: Verify no players have >7 unique numbers
        players.forEach(p => {
            if (p.uniqueNumbers.size > 7) {
                console.error(`TurnManager: SAFETY CHECK FAILED! ${p.name} has ${p.uniqueNumbers.size} unique numbers but status is '${p.status}'`);
                console.error(`  Numbers: [${Array.from(p.uniqueNumbers).join(', ')}]`);
                // Force Flip 7 status if somehow missed
                if (p.status !== 'flip7') {
                    console.error(`TurnManager: Force-setting ${p.name} status to 'flip7'`);
                    p.status = 'flip7';
                }
            }
        });
        
        // Check if round should end
        if (this.shouldEndRound(players)) {
            this.eventBus.emit(GameEvents.ROUND_SHOULD_END);
            return;
        }
        
        // Check if any players can still play
        const activePlayers = players.filter(p => p.canPlay());
        if (activePlayers.length === 0) {
            this.eventBus.emit(GameEvents.ROUND_SHOULD_END);
            return;
        }
        
        // For the first turn of the round, set starting position based on dealer
        if (isFirstTurn) {
            this.currentPlayerIndex = (dealerIndex + 1) % players.length;
            console.log(`TurnManager: First turn of round - setting starting index to ${this.currentPlayerIndex} (dealer ${dealerIndex} + 1)`);
        }
        
        // Debug: Log all player statuses before finding next player
        console.log('TurnManager: Current player statuses:');
        players.forEach((p, i) => {
            console.log(`  ${i}: ${p.name} - status: ${p.status}, canPlay: ${p.canPlay()}`);
        });
        console.log(`TurnManager: Starting search from index ${this.currentPlayerIndex}`);
        
        // Find next active player
        let attempts = 0;
        const startingIndex = this.currentPlayerIndex;
        while (!players[this.currentPlayerIndex].canPlay() && attempts < players.length) {
            console.log(`TurnManager: Player ${players[this.currentPlayerIndex].name} (index ${this.currentPlayerIndex}) cannot play, moving to next`);
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % players.length;
            attempts++;
        }
        
        // Safety check - if we couldn't find an active player after checking all positions
        if (!players[this.currentPlayerIndex].canPlay()) {
            console.error('TurnManager: Could not find active player, ending round');
            this.eventBus.emit(GameEvents.ROUND_SHOULD_END);
            return;
        }
        
        const currentPlayer = players[this.currentPlayerIndex];
        
        console.log(`TurnManager: Found active player ${currentPlayer.name} (index ${this.currentPlayerIndex}) after ${attempts} attempts`);
        
        // Log current turn player
        console.log(`TurnManager: Starting turn for ${currentPlayer.name} (${currentPlayer.isHuman ? 'Human' : 'AI'})`);
        
        // Emit turn start event
        this.eventBus.emit(GameEvents.TURN_START, {
            player: currentPlayer,
            playerIndex: this.currentPlayerIndex
        });
        
        // Handle AI turn
        if (!currentPlayer.isHuman) {
            this.currentTurnTimeout = setTimeout(async () => {
                await this.executeAITurn(currentPlayer, aiManager);
            }, GameConstants.AI_DECISION_DELAY);
        }
    }

    /**
     * Execute AI turn
     */
    async executeAITurn(aiPlayer, aiManager) {
        // Block if turn is ending or actions in progress
        if (this.turnEnding || this.actionInProgress || this.actionDisplayPhase || this.aiTurnInProgress) {
            console.log(`TurnManager: Blocking AI ${aiPlayer.id} turn - game state locked`);
            return;
        }
        
        this.aiTurnInProgress = true;
        
        await aiManager.executeAITurn(
            aiPlayer,
            (player) => this.executePlayerHit(player),
            (player) => this.executePlayerStay(player)
        );
        
        // Reset AI turn flag after action completes
        this.aiTurnInProgress = false;
    }

    /**
     * Handle player hit action from event
     */
    async handlePlayerHit(data = {}) {
        // Get current player from GameEngine
        const gameEngine = window.Flip7?.gameEngine;
        const players = gameEngine?.players || [];
        const player = players[this.currentPlayerIndex];
        
        if (!player || !player.isHuman || !player.canPlay()) {
            return;
        }
        
        await this.executePlayerHit(player);
    }

    /**
     * Handle player stay action from event
     */
    handlePlayerStay(data = {}) {
        // Get current player from GameEngine
        const gameEngine = window.Flip7?.gameEngine;
        const players = gameEngine?.players || [];
        const player = players[this.currentPlayerIndex];
        
        if (!player || !player.isHuman || !player.canPlay()) return;
        
        this.executePlayerStay(player);
    }

    /**
     * Execute hit action for a player
     * @param {Player} player - The player hitting
     */
    async executePlayerHit(player) {
        // Block if any action is in progress
        if (this.actionInProgress || this.actionDisplayPhase || this.turnEnding) {
            console.log(`TurnManager: Blocking ${player.id} hit - game state locked`);
            return;
        }
        
        // Block if Flip3 animation is active
        const displayManager = window.Flip7?.display;
        if (displayManager?.isFlip3Active()) {
            console.log(`TurnManager: Blocking ${player.id} hit - Flip3 animation active`);
            return;
        }
        
        // Block if Second Chance animation is active
        if (displayManager?.isSecondChanceActive?.()) {
            console.log(`TurnManager: Blocking ${player.id} hit - Second Chance animation active`);
            return;
        }
        
        console.log(`TurnManager: Player ${player.id} hit`);
        
        // Immediately disable hit/stay buttons for human players to prevent double-clicking
        if (player.isHuman) {
            this.disablePlayerButtons();
        }
        
        // Emit hit event for GameEngine to handle (will call CardManager)
        this.eventBus.emit(GameEvents.EXECUTE_HIT, {
            player: player,
            onComplete: (result) => this.handleHitResult(player, result)
        });
    }

    /**
     * Handle hit result
     */
    handleHitResult(player, result) {
        // Only emit CARD_DRAWN for cards that are actually added to hand
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
            player.roundScore = 0;
            this.eventBus.emit(GameEvents.PLAYER_BUST, {
                player: player,
                card: result.card
            });
            // Don't end turn immediately - wait for animation to complete
            this.setupAnimationEndTurnListener(player);
        } else if (result.requiresAction) {
            // Handle special action cards - block game and show card for 1 second
            this.actionDisplayPhase = true;
            console.log(`TurnManager: Action card ${result.card.value} drawn by ${player.name} - starting 1-second display phase`);
            
            // Wait 1 second to show action card in player's hand
            setTimeout(() => {
                this.actionDisplayPhase = false;
                this.actionInProgress = true;
                
                // Emit event for ActionCardHandler to process
                this.eventBus.emit(GameEvents.ACTION_CARD_DRAWN, {
                    card: result.card,
                    sourcePlayer: player
                });
            }, 1000);
        } else if (result.requiresTargeting) {
            // Handle Second Chance redistribution targeting for human players
            this.eventBus.emit(GameEvents.ACTION_CARD_TARGET_NEEDED, {
                card: result.card,
                sourcePlayer: player,
                availableTargets: result.availableTargets,
                isSecondChanceRedistribution: true
            });
            // Turn will continue when target is selected
        } else if (result.givenTo) {
            // AI auto-redistributed Second Chance - wait for animation then end turn
            console.log(`TurnManager: AI ${player.name} auto-redistributed Second Chance to ${result.givenTo}`);
            this.setupAnimationEndTurnListener(player);
        } else if (result.secondChanceUsed) {
            // Second Chance was used - cards already removed from hand and discarded
            // Update score and continue turn
            this.eventBus.emit(GameEvents.PLAYER_SCORE_UPDATE, {
                playerId: player.id,
                roundScore: player.calculateScore(),
                totalScore: player.totalScore
            });
            this.setupAnimationEndTurnListener(player);
        } else if (result.isFlip7) {
            // Player got Flip 7
            console.log(`TurnManager: ${player.name} achieved Flip 7! Ending turn and round.`);
            this.eventBus.emit(GameEvents.PLAYER_FLIP7, {
                player: player
            });
            this.setupAnimationEndTurnListener(player);
        } else {
            // Normal card - update score and wait for animation
            this.eventBus.emit(GameEvents.PLAYER_SCORE_UPDATE, {
                playerId: player.id,
                roundScore: player.calculateScore(),
                totalScore: player.totalScore
            });
            
            // Check if human player has action cards to resolve before ending turn
            const actionCardHandler = window.Flip7?.actionCardHandler;
            if (player.isHuman && actionCardHandler?.hasUnusedActionCards(player)) {
                console.log(`TurnManager: ${player.name} has action cards to resolve - not ending turn yet`);
                actionCardHandler.showActionCardPrompt(player);
                return; // Don't end turn yet
            }
            
            // Wait for animation to complete before ending turn
            this.setupAnimationEndTurnListener(player);
        }
    }

    /**
     * Setup listener to end turn after animation completes
     */
    setupAnimationEndTurnListener(player) {
        console.log(`TurnManager: Setting up animation end listener for ${player.name}`);
        
        // Listen for animation completion
        const animationCompleteHandler = (data) => {
            if (data.playerId === player.id) {
                console.log(`TurnManager: Animation complete for ${player.name}, ending turn`);
                // Remove this specific listener
                this.eventBus.off(GameEvents.CARD_ANIMATION_END, animationCompleteHandler);
                // Pass the player whose turn is ending
                this.endTurn(player);
            }
        };
        
        this.eventBus.on(GameEvents.CARD_ANIMATION_END, animationCompleteHandler);
    }

    /**
     * Execute stay action for a player
     * @param {Player} player - The player staying
     */
    executePlayerStay(player) {
        // Block if Flip3 animation is active
        const displayManager = window.Flip7?.display;
        if (displayManager?.isFlip3Active()) {
            console.log(`TurnManager: Blocking ${player.id} stay - Flip3 animation active`);
            return;
        }
        
        // Block if Second Chance animation is active
        if (displayManager?.isSecondChanceActive?.()) {
            console.log(`TurnManager: Blocking ${player.id} stay - Second Chance animation active`);
            return;
        }
        
        console.log(`TurnManager: Player ${player.id} stayed`);
        
        // Immediately disable hit/stay buttons for human players to prevent double-clicking
        if (player.isHuman) {
            this.disablePlayerButtons();
        }
        
        player.status = 'stayed';
        player.calculateScore();
        
        this.eventBus.emit(GameEvents.PLAYER_STAY_COMPLETED, {
            player: player,
            score: player.roundScore
        });
        
        this.endTurn();
    }

    /**
     * End the current turn
     * @param {Player} player - Optional player whose turn is ending (used when called from animation callbacks)
     */
    endTurn(player = null) {
        const gameEngine = window.Flip7?.gameEngine;
        const isInitialDealPhase = gameEngine?.isInitialDealPhase;
        
        // Prevent endTurn during initial deal phase
        if (isInitialDealPhase) {
            console.warn('TurnManager: endTurn called during initial deal phase - ignoring');
            return;
        }
        
        // Prevent endTurn during Flip3 animation
        const displayManager = window.Flip7?.display;
        if (displayManager?.isFlip3Active()) {
            console.log('TurnManager: endTurn called during Flip3 animation - ignoring');
            return;
        }
        
        // Immediately block further actions and clear any pending AI turns
        this.turnEnding = true;
        this.aiTurnInProgress = false;
        
        // Clear any pending turn timeouts
        if (this.currentTurnTimeout) {
            clearTimeout(this.currentTurnTimeout);
            this.currentTurnTimeout = null;
        }
        
        // Get current player - use passed player if available, otherwise use index
        const players = gameEngine?.players || [];
        const currentPlayer = player || players[this.currentPlayerIndex];
        
        if (currentPlayer) {
            // Check if player has multiple Second Chance cards that need redistribution
            const secondChanceCards = currentPlayer.actionCards.filter(c => c.value === 'second chance');
            if (secondChanceCards.length > 1) {
                console.log(`TurnManager: ${currentPlayer.name} has ${secondChanceCards.length} Second Chance cards - must redistribute extras`);
                
                // Process each extra Second Chance card
                const extrasToRedistribute = secondChanceCards.slice(1); // Keep first one, redistribute the rest
                
                if (currentPlayer.isHuman) {
                    // For human players, show targeting UI for the first extra card
                    const cardToRedistribute = extrasToRedistribute[0];
                    const cardManager = gameEngine?.cardManager;
                    const eligibleRecipients = cardManager?.getEligibleSecondChanceRecipients(currentPlayer) || [];
                    
                    if (eligibleRecipients.length > 0) {
                        console.log(`TurnManager: Human player must choose recipient for extra Second Chance`);
                        this.eventBus.emit(GameEvents.ACTION_CARD_TARGET_NEEDED, {
                            card: cardToRedistribute,
                            sourcePlayer: currentPlayer,
                            availableTargets: eligibleRecipients,
                            isSecondChanceRedistribution: true
                        });
                        // Turn will end after redistribution is complete
                        return;
                    } else {
                        // No eligible recipients - discard the extra
                        console.log(`TurnManager: No eligible recipients for extra Second Chance - discarding`);
                        currentPlayer.removeCard(cardToRedistribute);
                        cardManager?.discardCards([cardToRedistribute]);
                    }
                } else {
                    // AI player - auto-redistribute all extras
                    const cardManager = gameEngine?.cardManager;
                    for (const extraCard of extrasToRedistribute) {
                        const result = cardManager?.handleSecondChanceCard(currentPlayer, extraCard);
                        if (result?.givenTo) {
                            console.log(`TurnManager: AI ${currentPlayer.name} auto-redistributed extra Second Chance`);
                        } else if (result?.discarded) {
                            console.log(`TurnManager: AI ${currentPlayer.name} discarded extra Second Chance (no recipients)`);
                        }
                    }
                }
            }
        }
        
        this.eventBus.emit(GameEvents.TURN_END, {
            player: currentPlayer
        });
        
        // Log using the actual player whose turn is ending
        if (currentPlayer) {
            const actualIndex = players.findIndex(p => p.id === currentPlayer.id);
            console.log(`TurnManager: Turn ending for ${currentPlayer.name} (index ${actualIndex})`);
        } else {
            console.log(`TurnManager: Turn ending but no current player found`);
        }
        
        // Start next turn after a brief delay
        this.currentTurnTimeout = setTimeout(() => {
            this.turnEnding = false; // Reset turn ending flag
            this.aiTurnInProgress = false; // Reset AI turn flag
            
            // Move to next player position before requesting next turn
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % players.length;
            console.log(`TurnManager: Moving to next player position: index ${this.currentPlayerIndex}`);
            
            // Emit event for GameEngine to start next turn
            this.eventBus.emit(GameEvents.REQUEST_NEXT_TURN);
        }, 100);
    }

    /**
     * Helper method to disable player control buttons
     */
    disablePlayerButtons() {
        const buttonIds = ['hit-btn', 'stay-btn', 'mobile-hit-btn', 'mobile-stay-btn'];
        buttonIds.forEach(id => {
            const button = document.getElementById(id);
            if (button) {
                button.disabled = true;
            }
        });
    }

    /**
     * Check if round should end
     * @param {Array<Player>} players - All players
     * @returns {boolean}
     */
    shouldEndRound(players) {
        // Check if someone got Flip 7
        const flip7Player = players.find(p => p.status === 'flip7');
        if (flip7Player) return true;
        
        // Check if all players are done
        const activePlayers = players.filter(p => p.canPlay());
        return activePlayers.length === 0;
    }

    /**
     * Handle player frozen event - advance turn if current player was frozen
     * @param {Object} data - Player frozen data
     */
    handlePlayerFrozen(data) {
        const { player, isInitialDeal } = data;
        const gameEngine = window.Flip7?.gameEngine;
        const players = gameEngine?.players || [];
        const currentPlayer = players[this.currentPlayerIndex];
        
        // If the frozen player is the current turn player, end their turn
        if (player.id === currentPlayer?.id && !isInitialDeal) {
            // End turn for frozen current player
            this.endTurn();
        }
    }

    /**
     * Handle action card execution complete
     */
    handleActionCardComplete(data) {
        const { endTurn } = data;
        this.actionInProgress = false;
        
        if (endTurn) {
            this.endTurn();
        }
    }

    /**
     * Handle Flip3 processing complete
     */
    handleFlip3ProcessingComplete(data) {
        const gameEngine = window.Flip7?.gameEngine;
        const players = gameEngine?.players || [];
        const currentPlayer = players[this.currentPlayerIndex];
        
        if (!this.actionInProgress && currentPlayer && !this.turnEnding) {
            console.log(`TurnManager: Flip3 sequence complete for ${currentPlayer.name}`);
            
            // Check if human player has more action cards to resolve
            if (currentPlayer.isHuman) {
                const actionCardHandler = window.Flip7?.gameEngine?.actionCardHandler;
                if (actionCardHandler?.hasUnusedActionCards(currentPlayer)) {
                    console.log(`TurnManager: ${currentPlayer.name} has remaining action cards after Flip3 - showing prompt`);
                    actionCardHandler.showActionCardPrompt(currentPlayer);
                    return; // Don't end turn yet
                }
            }
            
            console.log('TurnManager: No remaining action cards, continuing turn flow');
            // Small delay to ensure clean transition
            setTimeout(() => {
                if (!this.turnEnding && !this.actionInProgress) {
                    this.endTurn();
                }
            }, 500);
        }
    }

    /**
     * Handle Second Chance animation complete
     */
    handleSecondChanceAnimationComplete(data) {
        const { player } = data;
        console.log(`TurnManager: Second Chance animation complete for ${player?.name || 'unknown'}, ending turn`);
        
        if (player && !this.turnEnding && !this.actionInProgress) {
            // Small delay to ensure clean state transition
            setTimeout(() => {
                if (!this.turnEnding && !this.actionInProgress) {
                    this.endTurn(player);
                }
            }, 100);
        }
    }

    /**
     * Get current player
     */
    getCurrentPlayer(players) {
        return players[this.currentPlayerIndex];
    }

    /**
     * Reset turn manager state
     */
    reset() {
        this.currentPlayerIndex = 0;
        this.currentTurnTimeout = null;
        this.aiTurnInProgress = false;
        this.turnEnding = false;
        this.actionInProgress = false;
        this.actionDisplayPhase = false;
    }
}

// Make available globally
window.TurnManager = TurnManager;