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
        const { skipTurnEnd = false, aiManager, players, isInitialDeal = false } = options;

        console.log(`ActionCardHandler: Handling action card ${card.value} for ${sourcePlayer.name}, skipTurnEnd: ${skipTurnEnd}`);

        // Handle Second Chance cards specially
        if (card.value === 'second chance') {
            const result = this.handleSecondChanceCard(sourcePlayer, card, players, aiManager);

            // If it was added to hand or requires targeting, handle turn end appropriately
            if (result.addedToHand && !skipTurnEnd) {
                // Second Chance was kept - end turn normally
                this.eventBus.emit(GameEvents.ACTION_CARD_EXECUTION_COMPLETE, {
                    sourcePlayer: sourcePlayer,
                    endTurn: true
                });
            }
            // If requiresTargeting, turn will continue when target is selected
            // If discarded or given away, those are handled in handleSecondChanceCard

            return result;
        }

        // For Freeze/Flip3 cards - card is already in hand from CardManager
        // (except during initial deal where cards are handled differently)

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
            // AI player - auto-target after a delay to let card animation complete
            const target = aiManager.determineActionTarget(sourcePlayer, card, players);
            if (target) {
                // Add delay to let the card draw animation complete before transfer animation
                await new Promise(resolve => setTimeout(resolve, 800));
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

        if (card.value === 'second chance') {
            // Second Chance can only go to active players without Second Chance already
            return players.filter(p =>
                p.id !== sourcePlayer.id &&
                p.status === 'active' &&
                !p.hasSecondChance
            );
        }

        // For Freeze and Flip3, can target any active player (including self)
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
     * Handle Second Chance card logic
     * @param {Player} player - Player who drew the card
     * @param {Card} card - Second Chance card (already in player's hand)
     * @param {Array<Player>} players - All players
     * @param {AIManager} aiManager - AI manager for auto-selection
     * @returns {Object} Result
     */
    handleSecondChanceCard(player, card, players, aiManager) {
        console.log(`ActionCardHandler: Handling Second Chance card for ${player.name}`);

        // Check if player already had a Second Chance BEFORE this new one
        // The new card is already in the hand, so we check if they have 2+ Second Chance cards
        const secondChanceCards = player.actionCards.filter(c => c.value === 'second chance');

        if (secondChanceCards.length === 1) {
            // This is the player's first Second Chance - keep it
            console.log(`ActionCardHandler: Player ${player.name} keeping first Second Chance`);

            this.eventBus.emit(GameEvents.SECOND_CHANCE_ACQUIRED, {
                player: player
            });

            return {
                success: true,
                card: card,
                addedToHand: true
            };
        }

        // Player has 2+ Second Chance cards - must redistribute the extra one
        console.log(`ActionCardHandler: Player ${player.name} has ${secondChanceCards.length} Second Chance cards - redistributing extra`);

        // Don't remove the card yet - let transferSecondChanceCard handle it
        const eligibleRecipients = this.getAvailableTargets(player, card, players);
        if (eligibleRecipients.length === 0) {
            console.log(`ActionCardHandler: No eligible recipients - discarding Second Chance`);

            // Remove the extra card from player's hand before discarding
            player.removeCard(card);

            // Discard the card
            this.cardManager.discardCards([card]);

            // Emit a specific event for UI to handle the removal
            this.eventBus.emit(GameEvents.SECOND_CHANCE_DISCARDED, {
                player: player,
                card: card,
                reason: 'no_eligible_recipients'
            });

            // Just end the turn after a delay - UI update is handled by SECOND_CHANCE_DISCARDED event
            setTimeout(() => {
                // End turn
                this.eventBus.emit(GameEvents.ACTION_CARD_EXECUTION_COMPLETE, {
                    sourcePlayer: player,
                    endTurn: true
                });
            }, player.isHuman ? 500 : 800); // Delay to ensure animations complete

            return {
                success: true,
                card: card,
                discarded: true
            };
        }

        if (player.isHuman) {
            console.log(`ActionCardHandler: Human player must choose recipient for Second Chance`);
            // Human player needs to choose recipient
            this.eventBus.emit(GameEvents.ACTION_CARD_TARGET_NEEDED, {
                card: card,
                sourcePlayer: player,
                availableTargets: eligibleRecipients,
                isSecondChanceRedistribution: true
            });

            return {
                success: true,
                card: card,
                requiresTargeting: true
            };
        } else {
            console.log(`ActionCardHandler: AI auto-selecting recipient for Second Chance`);
            // Auto-select recipient (prefer player with lowest total score)
            const recipient = eligibleRecipients.sort((a, b) => a.totalScore - b.totalScore)[0];

            // Add delay to let the card draw animation complete before transfer animation
            setTimeout(() => {
                // Transfer using CardManager (card will be removed from source)
                this.cardManager.transferSecondChanceCard({
                    sourcePlayer: player,  // Pass source player for proper removal and UI update
                    targetPlayer: recipient,
                    card: card
                });

                // End turn after giving away
                this.eventBus.emit(GameEvents.ACTION_CARD_EXECUTION_COMPLETE, {
                    sourcePlayer: player,
                    endTurn: true
                });
            }, 800);

            return {
                success: true,
                card: card,
                givenTo: recipient.id
            };
        }
    }

    /**
     * Handle Second Chance redistribution from targeting UI
     */
    handleSecondChanceRedistribution(sourcePlayer, targetPlayer, card) {
        console.log(`ActionCardHandler: Redistributing Second Chance from ${sourcePlayer.name} to ${targetPlayer.name}`);
        // Pass source player for proper removal and UI update
        this.cardManager.transferSecondChanceCard({
            sourcePlayer: sourcePlayer,  // Pass source for proper removal
            targetPlayer,
            card
        });
    }

    /**
     * Handle action card drawn during initial deal
     * @param {Object} data - Action card data
     */
    handleInitialDealAction(data) {
        const { card, sourcePlayer, isInitialDeal } = data;
        console.log(`ActionCardHandler: Handling initial deal action - ${sourcePlayer?.name} drew ${card?.value}`);

        // Get game context
        const gameEngine = window.Flip7?.gameEngine;
        const players = gameEngine?.players || [];
        const aiManager = gameEngine?.aiManager;

        // Handle action card with initial deal flag
        this.handleActionCard(card, sourcePlayer, {
            skipTurnEnd: true,
            aiManager: aiManager,
            players: players,
            isInitialDeal: isInitialDeal
        });
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
        console.log(`ActionCardHandler: Processing freeze card - ${sourcePlayer.name} freezing ${targetPlayer.name}`);

        // Apply freeze effect directly
        targetPlayer.status = 'frozen';

        // Remove from source player's hand and discard
        sourcePlayer.removeCard(card);
        this.cardManager.discardCards([card]);

        // Emit freeze event
        this.eventBus.emit(GameEvents.FREEZE_CARD_USED, {
            sourcePlayer: sourcePlayer,
            targetPlayer: targetPlayer
        });

        // Check if we froze the current turn player
        this.eventBus.emit(GameEvents.PLAYER_FROZEN, {
            player: targetPlayer,
            needsTurnAdvance: true
        });

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
        
        const transferResult = this.cardManager.transferSecondChanceCard({
            sourcePlayer,
            targetPlayer,
            card
        });
        console.log(`ActionCardHandler: Second Chance transferred → ${transferResult.recipient?.name || targetPlayer.name}`);

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
        console.log(`ActionCardHandler: Processing Flip3 - ${sourcePlayer.name} forcing ${targetPlayer.name} to draw 3`);

        // Start Flip 3 animation and wait for completion
        const animationPromise = new Promise((resolve) => {
            this.flip3AnimationResolver = resolve;
        });

        // Emit Flip3 start event
        this.eventBus.emit(GameEvents.FLIP3_CARD_USED, {
            sourcePlayer: sourcePlayer,
            targetPlayer: targetPlayer
        });

        // Draw 3 cards
        const dealtCards = this.cardManager.drawCards(3);
        const actionCards = [];
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
            
            // Track action cards for later processing
            if (c.type === 'action') {
                actionCards.push(c);
            }

            // Special handling for Second Chance cards during Flip3
            if (c.type === 'action' && c.value === 'second chance') {
                console.log(`ActionCardHandler: ${targetPlayer.name} drew Second Chance during Flip3`);

                // Get game context
                const gameEngine = window.Flip7?.gameEngine;
                const players = gameEngine?.players || [];
                const aiManager = gameEngine?.aiManager;

                const redistributionResult = this.handleSecondChanceCard(targetPlayer, c, players, aiManager);

                if (redistributionResult.givenTo) {
                    console.log(`ActionCardHandler: Second Chance redistributed to ${redistributionResult.givenTo}`);
                } else if (redistributionResult.discarded) {
                    console.log(`ActionCardHandler: Second Chance discarded (no eligible recipients)`);
                } else if (redistributionResult.requiresTargeting) {
                    console.log(`ActionCardHandler: Second Chance requires human targeting`);
                    // Human player needs to choose target - this will pause Flip3
                    // The event is already emitted by handleSecondChanceCard
                }
                continue; // Skip normal addCard processing
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
                console.log(`ActionCardHandler: ${targetPlayer.name} achieved Flip7 during Flip3 - stopping immediately`);
                this.eventBus.emit(GameEvents.PLAYER_SCORE_UPDATE, {
                    playerId: targetPlayer.id,
                    roundScore: targetPlayer.calculateScore(),
                    totalScore: targetPlayer.totalScore
                });
                break; // Stop dealing cards immediately when Flip7 is achieved
            }
        }

        // Store action cards for processing after animation completes
        if (!busted && actionCards.length > 0) {
            this.pendingFlip3ActionCards = { 
                actionCards, 
                targetPlayer, 
                originalCard: card,      // Store original card for later removal
                sourcePlayer: sourcePlayer  // Store source player for later removal
            };
            console.log(`ActionCardHandler: Stored ${actionCards.length} action cards for processing after Flip3 animation`);
        } else {
            // No nested actions - remove card immediately
            console.log('ActionCardHandler: No nested actions, removing Flip3 card immediately');
            sourcePlayer.removeCard(card);
            this.cardManager.discardCards([card]);
            
            // Force immediate UI refresh to remove the used Flip3 card
            this.eventBus.emit(GameEvents.UI_UPDATE_NEEDED, {
                type: 'refreshPlayerCards',
                playerId: sourcePlayer.id,
                player: sourcePlayer
            });
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
        
        // Check if we're in initial deal phase
        const gameEngine = window.Flip7?.gameEngine;
        const isInitialDeal = gameEngine?.isInitialDealPhase;
        
        // Save current game state to detect any unintended status changes
        const preFlip3PlayerStates = players.map(p => ({ id: p.id, status: p.status }));
        
        for (const actionCard of actionCards) {
            console.log(`ActionCardHandler: Processing Flip3 action card: ${actionCard.value}`);
            
            if (actionCard.value === 'second chance') {
                console.log('ActionCardHandler: Handling Second Chance from Flip3');
                // Handle Second Chance through our own method
                const result = this.handleSecondChanceCard(targetPlayer, actionCard, players, aiManager);
                if (result.addedToHand) {
                    console.log('ActionCardHandler: Second Chance added to player hand');
                } else if (result.givenTo) {
                    console.log(`ActionCardHandler: Second Chance given to ${result.givenTo}`);
                } else if (result.discarded) {
                    console.log('ActionCardHandler: Second Chance discarded (no eligible recipients)');
                } else if (result.requiresTargeting) {
                    console.log(`ActionCardHandler: Second Chance requires targeting by ${targetPlayer.name}`);
                    // Event already emitted by handleSecondChanceCard
                    // Turn continues after target selection
                }
                continue;
            }
            
            // For Freeze/Flip3 cards drawn during Flip3
            if (actionCard.value === 'freeze' || actionCard.value === 'flip3') {
                if (targetPlayer.isHuman) {
                    console.log(`🎯 FLIP3 ACTION: Human ${targetPlayer.name} drew ${actionCard.value} from Flip3`);
                    
                    // Add action card to human's hand first
                    targetPlayer.addCard(actionCard);
                    
                    // Emit card dealt event so it shows in UI
                    this.eventBus.emit(GameEvents.CARD_DEALT, {
                        card: actionCard,
                        playerId: targetPlayer.id,
                        isInitialDeal: isInitialDeal
                    });
                    
                    if (isInitialDeal) {
                        console.log(`🎯 FLIP3 ACTION: Initial deal phase - pausing for human to use ${actionCard.value}`);
                        
                        // During initial deal, pause for immediate action (like top-level action cards)
                        this.eventBus.emit(GameEvents.INITIAL_DEAL_ACTION_REQUIRED, {
                            card: actionCard,
                            sourcePlayer: targetPlayer,
                            availableTargets: this.getAvailableTargets(targetPlayer, actionCard, players),
                            isInitialDeal: true
                        });
                        
                        // Set up a promise to wait for this specific action to complete
                        const actionResolutionPromise = new Promise((resolve) => {
                            const actionCompleteHandler = () => {
                                console.log(`ActionCardHandler: Flip3 action ${actionCard.value} resolved during initial deal`);
                                this.eventBus.off(GameEvents.FREEZE_CARD_USED, actionCompleteHandler);
                                this.eventBus.off(GameEvents.FLIP3_ANIMATION_COMPLETE, actionCompleteHandler);
                                resolve();
                            };
                            
                            if (actionCard.value === 'freeze') {
                                this.eventBus.on(GameEvents.FREEZE_CARD_USED, actionCompleteHandler);
                            } else if (actionCard.value === 'flip3') {
                                this.eventBus.on(GameEvents.FLIP3_ANIMATION_COMPLETE, actionCompleteHandler);
                            }
                        });
                        
                        // Wait for action to be resolved before continuing
                        await actionResolutionPromise;
                    } else {
                        console.log(`🎯 FLIP3 ACTION: Regular turn - adding ${actionCard.value} to human hand for later manual use`);
                    }
                } else {
                    console.log(`ActionCardHandler: AI player ${targetPlayer.name} auto-processing ${actionCard.value} from Flip3`);
                    
                    // Mark that we're processing a nested Flip3 if this is another Flip3
                    if (actionCard.value === 'flip3') {
                        this.processingNestedFlip3 = true;
                    }
                    
                    // AI auto-processes immediately during their turn
                    await this.handleActionCard(actionCard, targetPlayer, { skipTurnEnd: true, aiManager, players });
                    console.log(`ActionCardHandler: AI ${targetPlayer.name} completed ${actionCard.value} action from Flip3`);
                    
                    if (actionCard.value === 'flip3') {
                        // Keep the flag set until nested Flip3 completes
                        console.log('ActionCardHandler: Nested Flip3 started, keeping processingNestedFlip3 flag');
                    } else {
                        this.processingNestedFlip3 = false;
                    }
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
        let originalCardData = null; // Store for cleanup after nested processing
        if (this.pendingFlip3ActionCards && data.completed) {
            const { actionCards, targetPlayer, originalCard, sourcePlayer } = this.pendingFlip3ActionCards;
            console.log(`ActionCardHandler: Processing ${actionCards.length} action cards after Flip3 animation completed`);
            
            // Store original card data for cleanup after nested processing
            originalCardData = { originalCard, sourcePlayer };
            
            // Clear pending cards before processing to avoid re-processing
            this.pendingFlip3ActionCards = null;
            
            // Get context from GameEngine
            const gameEngine = window.Flip7?.gameEngine;
            const context = {
                players: gameEngine?.players || [],
                aiManager: gameEngine?.aiManager
            };
            
            // Process the action cards (this may start nested Flip3s)
            await this.processFlip3ActionCards(actionCards, targetPlayer, context);
            
            // If we just processed nested Flip3s, wait for them to complete
            if (this.processingNestedFlip3) {
                console.log('ActionCardHandler: Nested Flip3 in progress, not resolving primary Flip3 yet');
                return; // Don't resolve the main Flip3 promise yet
            }
        }
        
        // Check if this is completing a nested Flip3
        if (isNestedFlip3 && !this.pendingFlip3ActionCards) {
            console.log('ActionCardHandler: Nested Flip3 completed, clearing flag');
            this.processingNestedFlip3 = false;
        }
        
        // Remove original Flip3 card after all nested processing is complete
        if (originalCardData && !this.processingNestedFlip3) {
            const { originalCard, sourcePlayer } = originalCardData;
            console.log('ActionCardHandler: Removing original Flip3 card after nested processing complete');
            sourcePlayer.removeCard(originalCard);
            this.cardManager.discardCards([originalCard]);
            
            // Force UI refresh to remove the used Flip3 card
            this.eventBus.emit(GameEvents.UI_UPDATE_NEEDED, {
                type: 'refreshPlayerCards',
                playerId: sourcePlayer.id,
                player: sourcePlayer
            });
        }
        
        // Resolve the flip3 animation promise to continue game flow
        if (this.flip3AnimationResolver && !this.processingNestedFlip3) {
            console.log('ActionCardHandler: Resolving Flip3 animation promise');
            this.flip3AnimationResolver();
            this.flip3AnimationResolver = null;
        } else if (this.processingNestedFlip3) {
            console.log('ActionCardHandler: Still processing nested Flip3, keeping resolver for later');
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
        }
    }
}

// Make available globally
window.ActionCardHandler = ActionCardHandler;
