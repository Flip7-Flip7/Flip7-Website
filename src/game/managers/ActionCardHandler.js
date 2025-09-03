/**
 * ActionCardHandler - Handles all action card logic and execution
 */
class ActionCardHandler {
    constructor(eventBus, cardManager) {
        this.eventBus = eventBus;
        this.cardManager = cardManager;
        
        // Temporary storage for action cards awaiting target selection
        this.pendingActionCard = null;
        this.pendingFlip3ActionCards = null;
        this.processingNestedFlip3 = false;
        
        // Promise resolver for Flip 3 animation completion
        this.flip3AnimationResolver = null;
        
        this.setupEventListeners();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Action card targeting
        this.eventBus.on(GameEvents.ACTION_CARD_TARGET_SELECTED, this.handleActionTargetSelected.bind(this));
        
        // Initial deal events
        this.eventBus.on(GameEvents.INITIAL_DEAL_ACTION_REQUIRED, this.handleInitialDealAction.bind(this));
        
        // Animation completion
        this.eventBus.on(GameEvents.FLIP3_ANIMATION_COMPLETE, this.handleFlip3AnimationComplete.bind(this));
    }

    /**
     * Handle action card drawn - different logic for human vs AI
     * @param {Card} card - Action card drawn
     * @param {Player} sourcePlayer - Player who drew the card
     * @param {Object} options - Additional options
     * @returns {Promise}
     */
    async handleActionCard(card, sourcePlayer, options = {}) {
        const { skipTurnEnd = false, aiManager, players } = options;
        
        console.log(`ActionCardHandler: Handling action card ${card.value} for ${sourcePlayer.name}, skipTurnEnd: ${skipTurnEnd}`);
        
        if (sourcePlayer.isHuman) {
            const availableTargets = this.getAvailableTargets(sourcePlayer, card, players);
            
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
            const target = aiManager.determineActionTarget(sourcePlayer, card, players);
            if (target) {
                await this.executeActionCard(card, sourcePlayer, target);
            }
            
            // Only end turn if not in Flip3 context
            if (!skipTurnEnd) {
                this.eventBus.emit(GameEvents.ACTION_CARD_EXECUTION_COMPLETE, {
                    sourcePlayer: sourcePlayer,
                    endTurn: true
                });
            }
        }
    }

    /**
     * Get available targets for an action card
     * @param {Player} sourcePlayer - Player using the card
     * @param {Card} card - Action card
     * @param {Array<Player>} players - All players
     * @returns {Array<Player>} Available targets
     */
    getAvailableTargets(sourcePlayer, card, players) {
        // Debug: Log all player statuses for freeze targeting issues
        console.log(`ActionCardHandler: Getting targets for ${card.value} - All player statuses:`);
        players.forEach(p => {
            console.log(`  ${p.name}: ${p.status} (canPlay: ${p.canPlay()})`);
        });
        
        // For Freeze and Flip3, can target any active player (including self)
        // Use canPlay() instead of just checking status === 'active' for consistency
        const activeTargets = players.filter(p => p.canPlay());
        
        console.log(`ActionCardHandler: Found ${activeTargets.length} active targets for ${sourcePlayer.name}:`, 
            activeTargets.map(t => `${t.name}(${t.status})`));
            
        return activeTargets;
    }

    /**
     * Handle action card target selection from UI
     * @param {Object} data - Target selection data
     */
    async handleActionTargetSelected(data) {
        const { card, sourcePlayer, targetPlayer, isInitialDeal, isSecondChanceRedistribution } = data;
        
        // Clear pending action card for regular gameplay
        if (!isInitialDeal && this.pendingActionCard) {
            this.pendingActionCard = null;
        }
        
        if (isSecondChanceRedistribution) {
            // Handle Second Chance redistribution
            this.handleSecondChanceRedistribution(sourcePlayer, targetPlayer, card);
        } else {
            // Regular action card execution (Freeze/Flip3)
            await this.executeActionCard(card, sourcePlayer, targetPlayer);
        }
        
        // Only end turn if not during initial deal
        if (!isInitialDeal) {
            this.eventBus.emit(GameEvents.ACTION_CARD_EXECUTION_COMPLETE, {
                sourcePlayer: sourcePlayer,
                endTurn: true
            });
        }
        // For initial deal, the CardManager's waitForActionResolution will handle continuation
    }

    /**
     * Handle Second Chance redistribution
     */
    handleSecondChanceRedistribution(sourcePlayer, targetPlayer, card) {
        console.log(`ActionCardHandler: Redistributing Second Chance from ${sourcePlayer.name} to ${targetPlayer.name}`);
        
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
    }

    /**
     * Handle action card drawn during initial deal
     * @param {Object} data - Action card data
     */
    handleInitialDealAction(data) {
        const { card, sourcePlayer, availableTargets, isInitialDeal } = data;
        console.log(`ActionCardHandler: Handling initial deal action - ${sourcePlayer?.name} drew ${card?.value}`);
        
        if (sourcePlayer.isHuman) {
            console.log('ActionCardHandler: Human player needs to select target via UI');
            // Human player needs to select target via UI
            this.eventBus.emit(GameEvents.ACTION_CARD_TARGET_NEEDED, {
                card: card,
                sourcePlayer: sourcePlayer,
                availableTargets: availableTargets,
                isInitialDeal: isInitialDeal
            });
        } else {
            console.log('ActionCardHandler: AI player auto-selecting target');
            // AI player auto-selects target - get context from GameEngine
            const gameEngine = window.Flip7?.gameEngine;
            const aiManager = gameEngine?.aiManager;
            const players = gameEngine?.players || [];
            
            if (!aiManager) {
                console.error('ActionCardHandler: AIManager not available');
                return;
            }
            
            const target = aiManager.determineActionTarget(sourcePlayer, card, players);
            if (target) {
                console.log(`ActionCardHandler: AI ${sourcePlayer.name} targeting ${target.name} with ${card.value}`);
                // Execute action immediately during initial deal
                this.executeActionCard(card, sourcePlayer, target).then(() => {
                    console.log(`ActionCardHandler: AI ${sourcePlayer.name} completed ${card.value} action during initial deal`);
                });
            } else {
                console.log('ActionCardHandler: No valid target found for AI player');
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
        console.log(`ActionCardHandler: Executing action card ${card.value} from ${sourcePlayer.name} to ${targetPlayer.name}`);
        
        // Animate card transfer from source to target (if not self-targeting)
        if (sourcePlayer.id !== targetPlayer.id) {
            const displayManager = window.Flip7?.display;
            if (displayManager?.animationManager) {
                console.log(`ActionCardHandler: Animating card transfer ${sourcePlayer.id} → ${targetPlayer.id}`);
                await displayManager.animationManager.animateActionCardTransfer(card, sourcePlayer.id, targetPlayer.id);
            }
        }
        
        if (card.value === 'freeze') {
            await this.executeFreezeCard(card, sourcePlayer, targetPlayer);
        } else if (card.value === 'second chance') {
            await this.executeSecondChanceCard(card, sourcePlayer, targetPlayer);
        } else if (card.value === 'flip3') {
            await this.executeFlip3Card(card, sourcePlayer, targetPlayer);
        }
    }

    /**
     * Execute Freeze card
     */
    async executeFreezeCard(card, sourcePlayer, targetPlayer) {
        console.log('ActionCardHandler: Processing freeze card');
        
        // Apply freeze via CardManager
        await this.cardManager.handleActionCard(card, sourcePlayer, targetPlayer);
        console.log('ActionCardHandler: Freeze action completed, removing card from hand');
        
        // Remove from source player's hand and discard
        const removed = sourcePlayer.removeCard(card);
        console.log(`ActionCardHandler: Card removal ${removed ? 'successful' : 'failed'}`);
        this.cardManager.discardCards([card]);
        console.log('ActionCardHandler: Freeze card discarded');
        
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
        console.log(`ActionCardHandler: Updated ${targetPlayer.name} status to ${targetPlayer.status}`);
        
        // Check if human player still has action cards to resolve after freeze
        if (sourcePlayer.isHuman && this.hasUnusedActionCards(sourcePlayer)) {
            console.log(`ActionCardHandler: ${sourcePlayer.name} still has action cards to resolve after using freeze`);
            this.showActionCardPrompt(sourcePlayer);
            return; // Don't end turn yet
        }
    }

    /**
     * Execute Second Chance card redistribution
     */
    async executeSecondChanceCard(card, sourcePlayer, targetPlayer) {
        console.log('ActionCardHandler: Processing second chance redistribution');
        
        // Remove from source player's hand
        const removed = sourcePlayer.removeCard(card);
        console.log(`ActionCardHandler: Removed Second Chance from ${sourcePlayer.name}: ${removed ? 'success' : 'failed'}`);
        
        // Update source player's hasSecondChance flag
        const remainingSecondChanceCards = sourcePlayer.actionCards.filter(c => c.value === 'second chance');
        if (remainingSecondChanceCards.length === 0) {
            sourcePlayer.hasSecondChance = false;
            console.log(`ActionCardHandler: ${sourcePlayer.name} no longer has Second Chance`);
        }
        
        // Add card to target player's hand
        targetPlayer.addCard(card);
        targetPlayer.hasSecondChance = true;
        console.log(`ActionCardHandler: Added Second Chance to ${targetPlayer.name}`);
        
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
            console.log(`ActionCardHandler: ${sourcePlayer.name} still has action cards to resolve after using second chance`);
            this.showActionCardPrompt(sourcePlayer);
            return; // Don't end turn yet
        }
    }

    /**
     * Execute Flip3 card
     */
    async executeFlip3Card(card, sourcePlayer, targetPlayer) {
        // Start Flip 3 animation and wait for completion
        const animationPromise = new Promise((resolve) => {
            this.flip3AnimationResolver = resolve;
        });
        
        const outcome = await this.cardManager.handleActionCard(card, sourcePlayer, targetPlayer);
        const dealtCards = outcome.dealtCards || [];
        const actionCards = outcome.actionCards || [];
        let busted = false;
        
        // Add all dealt cards to target player, but stop early on bust
        for (let i = 0; i < dealtCards.length; i++) {
            const c = dealtCards[i];
            
            // Add delay between cards for animation
            if (i > 0) {
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
            
            // Check for bust BEFORE adding card to hand
            if (c.type === 'number' && targetPlayer.uniqueNumbers.has(c.value) && !targetPlayer.hasSecondChance) {
                console.log(`ActionCardHandler: ${targetPlayer.name} would bust on duplicate ${c.value} during Flip3`);
                targetPlayer.status = 'busted';
                targetPlayer.roundScore = 0;
                
                // Delay PLAYER_BUST emission until after card animation
                setTimeout(() => {
                    this.eventBus.emit(GameEvents.PLAYER_BUST, {
                        player: targetPlayer,
                        card: c
                    });
                }, 1200);
                
                busted = true;
                break; // Stop Flip3 immediately
            }
            
            // Special handling for Second Chance cards during Flip3
            if (c.type === 'action' && c.value === 'second chance') {
                console.log(`ActionCardHandler: ${targetPlayer.name} drew Second Chance during Flip3`);
                
                if (targetPlayer.hasSecondChance) {
                    console.log(`ActionCardHandler: ${targetPlayer.name} already has Second Chance - routing through redistribution`);
                    const redistributionResult = this.cardManager.handleSecondChanceCard(targetPlayer, c);
                    
                    if (redistributionResult.givenTo) {
                        console.log(`ActionCardHandler: Second Chance redistributed to ${redistributionResult.givenTo}`);
                    } else if (redistributionResult.discarded) {
                        console.log(`ActionCardHandler: Second Chance discarded (no eligible recipients)`);
                    } else if (redistributionResult.requiresTargeting) {
                        console.log(`ActionCardHandler: Second Chance requires human targeting`);
                        this.eventBus.emit(GameEvents.ACTION_CARD_TARGET_NEEDED, {
                            card: c,
                            sourcePlayer: targetPlayer,
                            availableTargets: redistributionResult.availableTargets,
                            isSecondChanceRedistribution: true
                        });
                    }
                    continue; // Skip normal addCard processing
                } else {
                    console.log(`ActionCardHandler: Adding first Second Chance to ${targetPlayer.name} during Flip3`);
                }
            }
            
            const addResult = targetPlayer.addCard(c);
            this.eventBus.emit(GameEvents.FLIP3_CARD_DEALT, {
                card: c,
                playerId: targetPlayer.id,
                cardIndex: i + 1, // 1-based index for slot number
                isInitialDeal: false
            });
            
            // Handle Second Chance activation for duplicates during Flip3
            if (addResult.isDuplicate && targetPlayer.hasSecondChance) {
                console.log(`ActionCardHandler: ${targetPlayer.name} drew duplicate ${c.value} during Flip3 - activating Second Chance`);
                
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
                    
                    console.log(`ActionCardHandler: Second Chance activated for ${targetPlayer.name}`);
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
        
        // Remove from source player's hand and discard the original Flip3 card
        sourcePlayer.removeCard(card);
        this.cardManager.discardCards([card]);
        
        // Force immediate UI refresh to remove the used Flip3 card
        this.eventBus.emit(GameEvents.UI_UPDATE_NEEDED, {
            type: 'refreshPlayerCards',
            playerId: sourcePlayer.id,
            player: sourcePlayer
        });
        
        // Store action cards for processing after animation completes
        if (!busted && actionCards.length > 0) {
            this.pendingFlip3ActionCards = { actionCards, targetPlayer };
            console.log(`ActionCardHandler: Stored ${actionCards.length} action cards for processing after Flip3 animation`);
        }
        
        if (!busted) {
            // Update score after flip3 sequence
            this.eventBus.emit(GameEvents.PLAYER_SCORE_UPDATE, {
                playerId: targetPlayer.id,
                roundScore: targetPlayer.calculateScore(),
                totalScore: targetPlayer.totalScore
            });
        }
        
        // Wait for Flip 3 animation to complete before continuing
        await animationPromise;
        
        // Check if human player still has action cards to resolve after flip3
        if (sourcePlayer.isHuman && this.hasUnusedActionCards(sourcePlayer)) {
            console.log(`ActionCardHandler: ${sourcePlayer.name} still has action cards to resolve after using flip3`);
            this.showActionCardPrompt(sourcePlayer);
            return; // Don't end turn yet
        }
    }

    /**
     * Process action cards drawn during Flip3
     * @param {Array<Card>} actionCards - Action cards drawn during Flip3
     * @param {Player} targetPlayer - Player who gets autonomy over these action cards
     * @param {Object} context - Game context including aiManager
     */
    async processFlip3ActionCards(actionCards, targetPlayer, context) {
        console.log(`ActionCardHandler: Processing ${actionCards.length} action cards from Flip3 for ${targetPlayer.name}`);
        
        const { players, aiManager } = context;
        
        // Save current game state to detect any unintended status changes
        const preFlip3PlayerStates = players.map(p => ({ id: p.id, status: p.status }));
        
        for (const actionCard of actionCards) {
            console.log(`ActionCardHandler: Processing Flip3 action card: ${actionCard.value}`);
            
            if (actionCard.value === 'second chance') {
                console.log('ActionCardHandler: Handling Second Chance from Flip3');
                // Handle Second Chance through CardManager
                const result = this.cardManager.handleSecondChanceCard(targetPlayer, actionCard);
                if (result.addedToHand) {
                    console.log('ActionCardHandler: Second Chance added to player hand');
                } else if (result.givenTo) {
                    console.log(`ActionCardHandler: Second Chance given to ${result.givenTo}`);
                } else if (result.discarded) {
                    console.log('ActionCardHandler: Second Chance discarded (no eligible recipients)');
                } else if (result.requiresTargeting) {
                    console.log(`ActionCardHandler: Second Chance requires targeting by ${targetPlayer.name}`);
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
                    targetPlayer.addCard(actionCard);
                    
                    // Emit card dealt event so it shows in UI
                    this.eventBus.emit(GameEvents.CARD_DEALT, {
                        card: actionCard,
                        playerId: targetPlayer.id,
                        isInitialDeal: false
                    });
                    
                    console.log(`🎯 FLIP3 ACTION: ${actionCard.value} added to ${targetPlayer.name}'s hand for manual use later`);
                } else {
                    console.log(`ActionCardHandler: AI player ${targetPlayer.name} auto-processing ${actionCard.value} from Flip3`);
                    
                    // Mark that we're processing a nested Flip3 if this is another Flip3
                    if (actionCard.value === 'flip3') {
                        this.processingNestedFlip3 = true;
                    }
                    
                    // AI auto-processes immediately during their turn
                    await this.handleActionCard(actionCard, targetPlayer, { skipTurnEnd: true, aiManager, players });
                    console.log(`ActionCardHandler: AI ${targetPlayer.name} completed ${actionCard.value} action from Flip3`);
                    
                    this.processingNestedFlip3 = false;
                }
            }
        }
        
        // Verify no unintended status changes occurred
        const postFlip3PlayerStates = players.map(p => ({ id: p.id, status: p.status }));
        for (let i = 0; i < preFlip3PlayerStates.length; i++) {
            const pre = preFlip3PlayerStates[i];
            const post = postFlip3PlayerStates[i];
            if (pre.status !== post.status && pre.id !== targetPlayer.id) {
                console.warn(`ActionCardHandler: Unexpected status change during Flip3 - ${pre.id}: ${pre.status} -> ${post.status}`);
            }
        }
        
        console.log('ActionCardHandler: Finished processing Flip3 action cards');
    }

    /**
     * Handle Flip 3 animation completion
     * @param {Object} data - Animation completion data
     */
    async handleFlip3AnimationComplete(data) {
        console.log('ActionCardHandler: Flip 3 animation completed', data);
        
        // Check if we're in a nested Flip3 situation
        const isNestedFlip3 = this.processingNestedFlip3;
        
        // Process any pending action cards from Flip3 AFTER animation completes
        if (this.pendingFlip3ActionCards && data.completed) {
            const { actionCards, targetPlayer } = this.pendingFlip3ActionCards;
            console.log(`ActionCardHandler: Processing ${actionCards.length} action cards after Flip3 animation completed`);
            
            // Clear pending cards before processing to avoid re-processing
            this.pendingFlip3ActionCards = null;
            
            // Get context from GameEngine
            const gameEngine = window.Flip7?.gameEngine;
            const context = {
                players: gameEngine?.players || [],
                aiManager: gameEngine?.aiManager
            };
            
            // Process the action cards
            await this.processFlip3ActionCards(actionCards, targetPlayer, context);
        }
        
        // Resolve the flip3 animation promise to continue game flow
        if (this.flip3AnimationResolver) {
            this.flip3AnimationResolver();
            this.flip3AnimationResolver = null;
        }
        
        // Emit completion event for GameEngine to handle turn flow
        if (!isNestedFlip3) {
            this.eventBus.emit(GameEvents.FLIP3_PROCESSING_COMPLETE, {
                completed: true
            });
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
}

// Make available globally
window.ActionCardHandler = ActionCardHandler;