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
        this.roundEnding = false;
        
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
        
        // Player state changes
        this.eventBus.on(GameEvents.PLAYER_FROZEN, this.handlePlayerFrozen.bind(this));
        
        // Animation completion
        this.eventBus.on(GameEvents.ANIMATION_COMPLETE, this.handleAnimationComplete.bind(this));
    }

    /**
     * Start a new game
     */
    startNewGame() {
        console.log('\n╔════════════════════════════════════╗');
        console.log('║      🎮 NEW GAME STARTING! 🎮      ║');
        console.log('╚════════════════════════════════════╝');
        
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
        // Reset round ending flag for new round
        this.roundEnding = false;
        
        console.log('\n=====================================');
        console.log(`🎲 ROUND ${this.roundNumber} STARTING 🎲`);
        console.log('=====================================');
        
        // Reset players for new round
        this.players.forEach(player => {
            // Reset player state (this sets status to 'waiting')
            player.resetForNewRound();
            
            // Set all players to active for the new round
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
        // Safety check: Verify no players have >7 unique numbers
        this.players.forEach(p => {
            if (p.uniqueNumbers.size > 7) {
                console.error(`GameEngine: SAFETY CHECK FAILED! ${p.name} has ${p.uniqueNumbers.size} unique numbers but status is '${p.status}'`);
                console.error(`  Numbers: [${Array.from(p.uniqueNumbers).join(', ')}]`);
                // Force Flip 7 status if somehow missed
                if (p.status !== 'flip7') {
                    console.error(`GameEngine: Force-setting ${p.name} status to 'flip7'`);
                    p.status = 'flip7';
                }
            }
        });
        
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
            // AI auto-redistributed Second Chance - end turn
            console.log(`GameEngine: AI ${player.name} auto-redistributed Second Chance to ${result.givenTo}`);
            this.endTurn();
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
            console.log(`GameEngine: ${player.name} achieved Flip 7! Ending turn and round.`);
            this.eventBus.emit(GameEvents.PLAYER_FLIP7, {
                player: player
            });
            this.endTurn();
        } else {
            // Normal card - continue turn
            this.eventBus.emit(GameEvents.PLAYER_SCORE_UPDATE, {
                playerId: player.id,
                roundScore: player.calculateScore(),
                totalScore: player.totalScore
            });
            
            // Check if human player has action cards to resolve before ending turn
            if (player.isHuman && this.hasUnusedActionCards(player)) {
                console.log(`GameEngine: ${player.name} has action cards to resolve - not ending turn yet`);
                this.showActionCardPrompt(player);
                return; // Don't end turn yet
            }
            
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
            const availableTargets = this.getAvailableTargets(sourcePlayer, card);
            
            // Store action card temporarily for human players
            this.pendingActionCard = {
                card: card,
                sourcePlayer: sourcePlayer
            };
            
            // Human player - show targeting UI
            this.eventBus.emit(GameEvents.ACTION_CARD_TARGET_NEEDED, {
                card: card,
                sourcePlayer: sourcePlayer,
                availableTargets: availableTargets
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
        const { card, sourcePlayer, targetPlayer, isInitialDeal, isSecondChanceRedistribution } = data;
        
        // Clear pending action card for regular gameplay
        if (!isInitialDeal && this.pendingActionCard) {
            this.pendingActionCard = null;
        }
        
        if (isSecondChanceRedistribution) {
            // Handle Second Chance redistribution - manually redistribute the card
            console.log(`GameEngine: Redistributing Second Chance from ${sourcePlayer.name} to ${targetPlayer.name}`);
            
            // Remove card from source player's hand
            sourcePlayer.removeCard(card);
            
            // Update source player's hasSecondChance flag
            const remainingSecondChanceCards = sourcePlayer.actionCards.filter(c => c.value === 'second chance');
            if (remainingSecondChanceCards.length === 0) {
                sourcePlayer.hasSecondChance = false;
            }
            
            // Add card to target player's hand
            targetPlayer.addCard(card);
            targetPlayer.hasSecondChance = true;
            
            // Emit event for UI updates
            this.eventBus.emit(GameEvents.SECOND_CHANCE_GIVEN, {
                giver: sourcePlayer,
                recipient: targetPlayer,
                card: card
            });
            
            // Refresh UI for both players
            this.eventBus.emit(GameEvents.UI_UPDATE_NEEDED, {
                type: 'refreshPlayerCards',
                playerId: sourcePlayer.id,
                player: sourcePlayer
            });
            this.eventBus.emit(GameEvents.UI_UPDATE_NEEDED, {
                type: 'refreshPlayerCards',
                playerId: targetPlayer.id,
                player: targetPlayer
            });
        } else {
            // Regular action card execution (Freeze/Flip3)
            this.executeActionCard(card, sourcePlayer, targetPlayer);
        }
        
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
        console.log(`GameEngine: Handling initial deal action - ${sourcePlayer?.name} drew ${card?.value}`);
        
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
                // Small delay only for initial deal to ensure event listeners are ready
                setTimeout(async () => {
                    await this.executeActionCard(card, sourcePlayer, target);
                    console.log(`GameEngine: AI ${sourcePlayer.name} completed ${card.value} action during initial deal`);
                }, 5);
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
            
            // Force UI refresh for source player to remove the used action card
            this.eventBus.emit(GameEvents.UI_UPDATE_NEEDED, {
                type: 'refreshPlayerCards',
                playerId: sourcePlayer.id,
                player: sourcePlayer
            });
            
            // Update score/state for target
            this.eventBus.emit(GameEvents.PLAYER_SCORE_UPDATE, {
                playerId: targetPlayer.id,
                roundScore: targetPlayer.calculateScore(),
                totalScore: targetPlayer.totalScore
            });
            console.log(`GameEngine: Updated ${targetPlayer.name} status to ${targetPlayer.status}`);
            
            // Check if human player still has action cards to resolve after freeze
            if (sourcePlayer.isHuman && this.hasUnusedActionCards(sourcePlayer)) {
                console.log(`GameEngine: ${sourcePlayer.name} still has action cards to resolve after using freeze`);
                this.showActionCardPrompt(sourcePlayer);
                return; // Don't end turn yet
            }
        }
        
        if (card.value === 'second chance') {
            console.log('GameEngine: Processing second chance redistribution');
            
            // Remove from source player's hand
            const removed = sourcePlayer.removeCard(card);
            console.log(`GameEngine: Removed Second Chance from ${sourcePlayer.name}: ${removed ? 'success' : 'failed'}`);
            
            // Update source player's hasSecondChance flag
            const remainingSecondChanceCards = sourcePlayer.actionCards.filter(c => c.value === 'second chance');
            if (remainingSecondChanceCards.length === 0) {
                sourcePlayer.hasSecondChance = false;
                console.log(`GameEngine: ${sourcePlayer.name} no longer has Second Chance`);
            }
            
            // Add card to target player's hand
            targetPlayer.addCard(card);
            targetPlayer.hasSecondChance = true;
            console.log(`GameEngine: Added Second Chance to ${targetPlayer.name}`);
            
            // Emit event for game logic
            this.eventBus.emit(GameEvents.SECOND_CHANCE_GIVEN, {
                giver: sourcePlayer,
                recipient: targetPlayer,
                card: card
            });
            
            // Force UI refresh for both players to show transfer
            this.eventBus.emit(GameEvents.UI_UPDATE_NEEDED, {
                type: 'refreshPlayerCards',
                playerId: sourcePlayer.id,
                player: sourcePlayer
            });
            this.eventBus.emit(GameEvents.UI_UPDATE_NEEDED, {
                type: 'refreshPlayerCards',
                playerId: targetPlayer.id,
                player: targetPlayer
            });
            
            // Check if human player still has action cards to resolve after second chance
            if (sourcePlayer.isHuman && this.hasUnusedActionCards(sourcePlayer)) {
                console.log(`GameEngine: ${sourcePlayer.name} still has action cards to resolve after using second chance`);
                this.showActionCardPrompt(sourcePlayer);
                return; // Don't end turn yet
            }
        }
        
        if (card.value === 'flip3') {
            const outcome = await this.cardManager.handleActionCard(card, sourcePlayer, targetPlayer);
            const dealtCards = outcome.dealtCards || [];
            const actionCards = outcome.actionCards || [];
            let busted = false;
            
            // Add all dealt cards to target player, but stop early on bust
            for (let i = 0; i < dealtCards.length; i++) {
                const c = dealtCards[i];
                
                // Check for bust BEFORE adding card to hand
                if (c.type === 'number' && targetPlayer.uniqueNumbers.has(c.value) && !targetPlayer.hasSecondChance) {
                    console.log(`GameEngine: ${targetPlayer.name} would bust on duplicate ${c.value} during Flip3 - stopping early`);
                    targetPlayer.status = 'busted';
                    targetPlayer.roundScore = 0;
                    this.eventBus.emit(GameEvents.PLAYER_BUST, {
                        player: targetPlayer,
                        card: c
                    });
                    busted = true;
                    break; // Stop Flip3 immediately, don't deal remaining cards
                }
                
                // Special handling for Second Chance cards during Flip3
                if (c.type === 'action' && c.value === 'second chance') {
                    console.log(`GameEngine: ${targetPlayer.name} drew Second Chance during Flip3`);
                    
                    // Check if player already has Second Chance
                    if (targetPlayer.hasSecondChance) {
                        console.log(`GameEngine: ${targetPlayer.name} already has Second Chance - routing through redistribution logic`);
                        // Route through proper Second Chance handling instead of adding directly
                        const redistributionResult = this.cardManager.handleSecondChanceCard(targetPlayer, c);
                        
                        if (redistributionResult.givenTo) {
                            console.log(`GameEngine: Second Chance redistributed to ${redistributionResult.givenTo}`);
                        } else if (redistributionResult.discarded) {
                            console.log(`GameEngine: Second Chance discarded (no eligible recipients)`);
                        } else if (redistributionResult.requiresTargeting) {
                            console.log(`GameEngine: Second Chance requires human targeting`);
                            this.eventBus.emit(GameEvents.ACTION_CARD_TARGET_NEEDED, {
                                card: c,
                                sourcePlayer: targetPlayer,
                                availableTargets: redistributionResult.availableTargets,
                                isSecondChanceRedistribution: true
                            });
                        }
                        continue; // Skip normal addCard processing
                    } else {
                        // Player doesn't have Second Chance yet - add normally
                        console.log(`GameEngine: Adding first Second Chance to ${targetPlayer.name} during Flip3`);
                    }
                }
                
                const addResult = targetPlayer.addCard(c);
                this.eventBus.emit(GameEvents.CARD_DEALT, {
                    card: c,
                    playerId: targetPlayer.id,
                    isInitialDeal: false
                });
                
                // Handle Second Chance activation for duplicates during Flip3
                if (addResult.isDuplicate && targetPlayer.hasSecondChance) {
                    console.log(`GameEngine: ${targetPlayer.name} drew duplicate ${c.value} during Flip3 - activating Second Chance`);
                    
                    // Find and remove the Second Chance card from hand
                    const secondChanceCard = targetPlayer.actionCards.find(sc => sc.value === 'second chance');
                    if (secondChanceCard) {
                        targetPlayer.removeCard(secondChanceCard);
                        // Remove the duplicate card that was just added
                        targetPlayer.removeCard(c);
                        // Update hasSecondChance flag
                        targetPlayer.hasSecondChance = false;
                        
                        // Discard both cards
                        this.cardManager.discardCards([secondChanceCard, c]);
                        
                        // Emit Second Chance activation event
                        this.eventBus.emit(GameEvents.SECOND_CHANCE_ACTIVATED, {
                            player: targetPlayer,
                            card: c,
                            secondChanceCard: secondChanceCard,
                            discardedCards: [secondChanceCard, c]
                        });
                        
                        console.log(`GameEngine: Second Chance activated for ${targetPlayer.name} - removed duplicate ${c.value} and Second Chance card`);
                    }
                    continue; // Skip to next card
                }
                
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
            
            // Remove from source player's hand and discard the original Flip3 card BEFORE processing new cards
            sourcePlayer.removeCard(card);
            this.cardManager.discardCards([card]);
            
            // Force immediate UI refresh to remove the used Flip3 card
            this.eventBus.emit(GameEvents.UI_UPDATE_NEEDED, {
                type: 'refreshPlayerCards',
                playerId: sourcePlayer.id,
                player: sourcePlayer
            });
            
            // If no bust, give target player autonomy over action cards they drew
            if (!busted && actionCards.length > 0) {
                // Target player now has control over action cards they drew
                await this.processFlip3ActionCards(actionCards, targetPlayer);
            }
            
            if (!busted) {
                // Update score after flip3 sequence
                this.eventBus.emit(GameEvents.PLAYER_SCORE_UPDATE, {
                    playerId: targetPlayer.id,
                    roundScore: targetPlayer.calculateScore(),
                    totalScore: targetPlayer.totalScore
                });
            }
            
            // Check if human player still has action cards to resolve after flip3
            if (sourcePlayer.isHuman && this.hasUnusedActionCards(sourcePlayer)) {
                console.log(`GameEngine: ${sourcePlayer.name} still has action cards to resolve after using flip3`);
                this.showActionCardPrompt(sourcePlayer);
                return; // Don't end turn yet
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
        
        // Save current game state to detect any unintended status changes
        const preFlip3PlayerStates = this.players.map(p => ({ id: p.id, status: p.status }));
        
        for (const actionCard of actionCards) {
            console.log(`GameEngine: Processing Flip3 action card: ${actionCard.value}`);
            
            if (actionCard.value === 'second chance') {
                console.log('GameEngine: Handling Second Chance from Flip3');
                // Handle Second Chance through CardManager
                const result = this.cardManager.handleSecondChanceCard(targetPlayer, actionCard);
                if (result.addedToHand) {
                    console.log('GameEngine: Second Chance added to player hand');
                } else if (result.givenTo) {
                    console.log(`GameEngine: Second Chance given to ${result.givenTo}`);
                } else if (result.discarded) {
                    console.log('GameEngine: Second Chance discarded (no eligible recipients)');
                } else if (result.requiresTargeting) {
                    console.log(`GameEngine: Second Chance requires targeting by ${targetPlayer.name}`);
                    // Human player needs to select target for Second Chance redistribution
                    this.eventBus.emit(GameEvents.ACTION_CARD_TARGET_NEEDED, {
                        card: actionCard,
                        sourcePlayer: targetPlayer,
                        availableTargets: result.availableTargets,
                        isSecondChanceRedistribution: true
                    });
                    // Turn continues after target selection
                }
                continue;
            }
            
            // For Freeze/Flip3 cards drawn during Flip3, do NOT auto-process for human players
            if (actionCard.value === 'freeze' || actionCard.value === 'flip3') {
                if (targetPlayer.isHuman) {
                    console.log(`🎯 FLIP3 ACTION: Human ${targetPlayer.name} drew ${actionCard.value} from Flip3`);
                    console.log(`🎯 FLIP3 ACTION: Adding ${actionCard.value} to human hand for later manual use`);
                    
                    // Add action card to human's hand but DON'T auto-execute
                    // Human will use it manually on their next turn like a normal action card
                    targetPlayer.addCard(actionCard);
                    
                    // Emit card dealt event so it shows in UI
                    this.eventBus.emit(GameEvents.CARD_DEALT, {
                        card: actionCard,
                        playerId: targetPlayer.id,
                        isInitialDeal: false
                    });
                    
                    console.log(`🎯 FLIP3 ACTION: ${actionCard.value} added to ${targetPlayer.name}'s hand for manual use later`);
                    // Human will use it on their turn with full targeting control
                } else {
                    console.log(`GameEngine: AI player ${targetPlayer.name} auto-processing ${actionCard.value} from Flip3`);
                    // AI auto-processes immediately during their turn - must complete before turn ends
                    await this.handleActionCard(actionCard, targetPlayer, true);
                    console.log(`GameEngine: AI ${targetPlayer.name} completed ${actionCard.value} action from Flip3`);
                }
            }
        }
        
        // Verify no unintended status changes occurred
        const postFlip3PlayerStates = this.players.map(p => ({ id: p.id, status: p.status }));
        for (let i = 0; i < preFlip3PlayerStates.length; i++) {
            const pre = preFlip3PlayerStates[i];
            const post = postFlip3PlayerStates[i];
            if (pre.status !== post.status && pre.id !== targetPlayer.id) {
                console.warn(`GameEngine: Unexpected status change during Flip3 - ${pre.id}: ${pre.status} -> ${post.status}`);
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
        // Debug: Log all player statuses for freeze targeting issues
        console.log(`GameEngine: Getting targets for ${card.value} - All player statuses:`);
        this.players.forEach(p => {
            console.log(`  ${p.name}: ${p.status} (canPlay: ${p.canPlay()})`);
        });
        
        // For Freeze and Flip3, can target any active player (including self)
        // Use canPlay() instead of just checking status === 'active' for consistency
        const activeTargets = this.players.filter(p => p.canPlay());
        
        console.log(`GameEngine: Found ${activeTargets.length} active targets for ${sourcePlayer.name}:`, 
            activeTargets.map(t => `${t.name}(${t.status})`));
            
        return activeTargets;
    }

    /**
     * Strategic action targeting with priority-based selection
     */
    determineActionTarget(sourcePlayer, card) {
        const activeOpponents = this.players.filter(p => p.id !== sourcePlayer.id && p.status === 'active');
        
        if (card.value === 'freeze') {
            if (activeOpponents.length === 0) return sourcePlayer;
            
            // Priority 1: Target point leader (highest total score)
            const pointLeader = activeOpponents.reduce((leader, player) => 
                player.totalScore > leader.totalScore ? player : leader
            );
            if (pointLeader.totalScore > sourcePlayer.totalScore) {
                return pointLeader;
            }
            
            // Priority 2: Target players with x2 multiplier
            const x2Players = activeOpponents.filter(p => 
                p.modifierCards.some(card => card.value === 'x2')
            );
            if (x2Players.length > 0) {
                return x2Players.reduce((best, player) => 
                    player.calculateScore() > best.calculateScore() ? player : best
                );
            }
            
            // Priority 3: Target players with Second Chance
            const secondChancePlayers = activeOpponents.filter(p => p.hasSecondChance);
            if (secondChancePlayers.length > 0) {
                return secondChancePlayers.reduce((best, player) => 
                    player.calculateScore() > best.calculateScore() ? player : best
                );
            }
            
            // Priority 4: Target highest round score
            const bestRoundPlayer = activeOpponents.reduce((best, player) => 
                player.calculateScore() > best.calculateScore() ? player : best
            );
            return bestRoundPlayer;
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
        
        this.eventBus.emit(GameEvents.PLAYER_STAY_COMPLETED, {
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
        
        // Priority 1: If AI has Second Chance, be aggressive and keep hitting
        if (player.hasSecondChance) {
            console.log(`AI ${player.name}: Has Second Chance protection - hitting aggressively`);
            return true;
        }
        
        // Priority 2: Get Flip 7 if close
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
        
        const currentPlayer = this.players[this.currentPlayerIndex];
        
        // Check if player has multiple Second Chance cards that need redistribution
        const secondChanceCards = currentPlayer.actionCards.filter(c => c.value === 'second chance');
        if (secondChanceCards.length > 1) {
            console.log(`GameEngine: ${currentPlayer.name} has ${secondChanceCards.length} Second Chance cards - must redistribute extras before turn ends`);
            
            // Process each extra Second Chance card
            const extrasToRedistribute = secondChanceCards.slice(1); // Keep first one, redistribute the rest
            
            if (currentPlayer.isHuman) {
                // For human players, show targeting UI for the first extra card
                // The rest will be handled sequentially after each redistribution
                const cardToRedistribute = extrasToRedistribute[0];
                const eligibleRecipients = this.cardManager.getEligibleSecondChanceRecipients(currentPlayer);
                
                if (eligibleRecipients.length > 0) {
                    console.log(`GameEngine: Human player must choose recipient for extra Second Chance`);
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
                    console.log(`GameEngine: No eligible recipients for extra Second Chance - discarding`);
                    currentPlayer.removeCard(cardToRedistribute);
                    this.cardManager.discardCards([cardToRedistribute]);
                }
            } else {
                // AI player - auto-redistribute all extras
                for (const extraCard of extrasToRedistribute) {
                    const result = this.cardManager.handleSecondChanceCard(currentPlayer, extraCard);
                    if (result.givenTo) {
                        console.log(`GameEngine: AI ${currentPlayer.name} auto-redistributed extra Second Chance`);
                    } else if (result.discarded) {
                        console.log(`GameEngine: AI ${currentPlayer.name} discarded extra Second Chance (no recipients)`);
                    }
                }
            }
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
        // Prevent multiple calls to endRound for the same round
        if (this.roundEnding) {
            console.log(`GameEngine: Round ${this.roundNumber} already ending - ignoring duplicate endRound call`);
            return;
        }
        this.roundEnding = true;
        
        console.log('\n-------------------------------------');
        console.log(`📊 ROUND ${this.roundNumber} ENDING 📊`);
        console.log('-------------------------------------');
        
        // Calculate scores
        console.log(`GameEngine: Calculating scores for round ${this.roundNumber}`);
        this.players.forEach(player => {
            const previousTotal = player.totalScore;
            if (player.status !== 'busted') {
                player.calculateScore();
                player.totalScore += player.roundScore;
                console.log(`GameEngine: ${player.name} scored ${player.roundScore} this round (${previousTotal} -> ${player.totalScore})`);
            } else {
                console.log(`GameEngine: ${player.name} busted, no points added (total remains ${player.totalScore})`);
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
        console.log(`GameEngine: Checking for game end (winning score: ${this.winningScore})`);
        console.log('GameEngine: Current total scores:', this.players.map(p => `${p.name}: ${p.totalScore}`).join(', '));
        
        const qualifyingPlayers = this.players.filter(p => p.totalScore >= this.winningScore);
        console.log(`GameEngine: ${qualifyingPlayers.length} players qualify for win:`, qualifyingPlayers.map(p => `${p.name} (${p.totalScore})`).join(', '));
        
        if (qualifyingPlayers.length > 0) {
            // Find highest score among qualifying players
            const highestScore = Math.max(...qualifyingPlayers.map(p => p.totalScore));
            const winners = qualifyingPlayers.filter(p => p.totalScore === highestScore);
            console.log(`GameEngine: Highest qualifying score: ${highestScore}, ${winners.length} winner(s): ${winners.map(w => w.name).join(', ')}`);
            
            if (winners.length === 1) {
                // Clear winner
                console.log(`GameEngine: Game ending with winner: ${winners[0].name} (${winners[0].totalScore} points)`);
                this.endGame(winners[0]);
            } else {
                // Tie - continue to next round
                console.log(`GameEngine: Tie detected with ${winners.length} players at ${highestScore} points - continuing to next round`);
                this.roundNumber++;
                setTimeout(() => this.startNewRound(), 2000);
            }
        } else {
            // No one reached winning score - continue
            console.log('GameEngine: No qualifying players - continuing to next round');
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
        
        console.log('\n╔════════════════════════════════════╗');
        console.log(`║    🏆 GAME OVER - ${winner.name.toUpperCase()} WINS! 🏆`);
        console.log('╚════════════════════════════════════╝');
        console.log('Final Scores:');
        this.players.forEach(p => {
            console.log(`  ${p.name}: ${p.totalScore} points${p.id === winner.id ? ' 👑' : ''}`);
        });
        console.log('=====================================\n');
        
        this.eventBus.emit(GameEvents.GAME_END, {
            winner: winner.getState(),
            finalScores: this.players.map(p => ({
                player: p.getState(),
                totalScore: p.totalScore
            }))
        });
    }

    /**
     * Handle player frozen event - advance turn if current player was frozen
     * @param {Object} data - Player frozen data
     */
    handlePlayerFrozen(data) {
        const { player } = data;
        const currentPlayer = this.players[this.currentPlayerIndex];
        
        // If the frozen player is the current turn player, end their turn
        if (player.id === currentPlayer.id && !this.isInitialDealPhase) {
            // End turn for frozen current player
            this.endTurn();
        }
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
     * Check if player has unused action cards that require manual use
     * @param {Player} player - The player to check
     * @returns {boolean}
     */
    hasUnusedActionCards(player) {
        const actionCards = player.actionCards.filter(card => 
            card.value === 'freeze' || card.value === 'flip3'
        );
        return actionCards.length > 0;
    }

    /**
     * Show action card resolution prompt for human player
     * @param {Player} player - The human player
     */
    showActionCardPrompt(player) {
        const actionCards = player.actionCards.filter(card => 
            card.value === 'freeze' || card.value === 'flip3'
        );
        
        if (actionCards.length > 0) {
            // Update UI to show action card resolution phase
            this.eventBus.emit(GameEvents.UI_UPDATE_NEEDED, {
                type: 'showActionCardPrompt',
                playerId: player.id,
                player: player,
                actionCards: actionCards
            });
            
            // Update game status
            const message = `You must use your ${actionCards.length} action card${actionCards.length > 1 ? 's' : ''} before continuing`;
            this.eventBus.emit(GameEvents.UI_UPDATE_NEEDED, {
                type: 'updateGameStatus',
                message: message
            });
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