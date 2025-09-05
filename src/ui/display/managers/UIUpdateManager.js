/**
 * UIUpdateManager - Handles UI updates, card rendering, and scoreboard management
 * Manages player displays, status updates, and card organization
 */
class UIUpdateManager {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.isMobile = window.innerWidth <= GameConstants.BREAKPOINTS.MOBILE;
        
        // Subscribe to window resize
        window.addEventListener('resize', () => {
            this.isMobile = window.innerWidth <= GameConstants.BREAKPOINTS.MOBILE;
        });
        
        this.setupEventListeners();
    }

    /**
     * Setup event listeners for UI updates
     */
    setupEventListeners() {
        // Score updates
        this.eventBus.on(GameEvents.PLAYER_SCORE_UPDATE, this.updatePlayerScore.bind(this));
        this.eventBus.on(GameEvents.ROUND_END, this.updateRoundEndScores.bind(this));
        
        // Card updates
        this.eventBus.on(GameEvents.CARD_DEALT, this.handleCardDealt.bind(this));
        this.eventBus.on(GameEvents.CARD_DRAWN, this.handleCardDrawn.bind(this));
        this.eventBus.on(GameEvents.SECOND_CHANCE_ACTIVATED, this.handleSecondChanceActivated.bind(this));
        this.eventBus.on(GameEvents.SECOND_CHANCE_GIVEN, this.handleSecondChanceGiven.bind(this));
        
        // Turn updates
        this.eventBus.on(GameEvents.TURN_START, this.updateTurnDisplay.bind(this));
        
        // Round updates
        this.eventBus.on(GameEvents.ROUND_START, this.handleRoundStart.bind(this));
        
        // Generic UI update requests
        this.eventBus.on(GameEvents.UI_UPDATE_NEEDED, this.handleUpdateRequest.bind(this));
    }

    /**
     * Update player score display
     */
    updatePlayerScore(data) {
        const { playerId, roundScore, totalScore } = data;
        
        // Update score displays
        const scoreElements = document.querySelectorAll(`#${playerId} .score-value`);
        scoreElements.forEach(el => {
            el.textContent = totalScore;
        });
        
        const roundElements = document.querySelectorAll(`#${playerId} .round-value`);
        roundElements.forEach(el => {
            el.textContent = roundScore;
        });
        
        // Animate score change
        this.animateScoreChange(playerId);
        
        // Update mobile display if needed
        if (this.isMobile) {
            this.eventBus.emit(GameEvents.MOBILE_SYNC_NEEDED, { playerId });
        }
    }

    /**
     * Update scores at round end
     */
    updateRoundEndScores(data) {
        try {
            const scores = data?.scores || [];
            
            // Update individual player scores (ScoreAnimationManager handles animations)
            scores.forEach(entry => {
                const playerId = entry?.player?.id;
                if (!playerId) return;
                
                // Update round scores immediately
                const roundEls = document.querySelectorAll(`#${playerId} .player-header .round-value`);
                roundEls.forEach(el => el.textContent = entry.roundScore);
                
                // Update total scores immediately (ScoreAnimationManager will handle visual updates)
                const totalEls = document.querySelectorAll(`#${playerId} .player-header .score-value`);
                totalEls.forEach(el => el.textContent = entry.totalScore);
            });

            // Update scoreboard
            this.updateScoreboard(scores);
        } catch (e) {
            console.warn('Failed to update round end scores:', e);
        }
    }

    /**
     * Update scoreboard display
     */
    updateScoreboard(scores) {
        // Normalize and sort scores
        const normalized = scores.map(s => ({
            id: s?.player?.id,
            name: s?.player?.name,
            total: s?.totalScore ?? 0
        })).filter(x => x.id);
        
        const sorted = normalized.sort((a, b) => b.total - a.total);
        
        // Update all scoreboard instances
        const boards = document.querySelectorAll('#scoreboard-content');
        boards.forEach(board => {
            board.innerHTML = '';
            
            sorted.forEach((entry, index) => {
                const div = document.createElement('div');
                div.className = 'score-entry';
                if (index === 0) div.classList.add('leader');
                
                div.innerHTML = `
                    <span class="rank">${index + 1}</span>
                    <span class="name">${entry.name}</span>
                    <span class="score">${entry.total} pts</span>
                `;
                
                board.appendChild(div);
            });
        });
    }

    /**
     * Handle card dealt event
     */
    handleCardDealt(data) {
        // Skip if Flip3 animation is active - let Flip3AnimationManager handle it
        const displayManager = window.Flip7?.display;
        if (displayManager?.isFlip3Active()) {
            console.log('UIUpdateManager: Skipping card dealt - Flip3 animation active');
            return;
        }
        
        const { card, playerId, isInitialDeal } = data;
        this.renderCardWithAnimation(card, playerId, isInitialDeal);
        this.updateDeckCount();
    }

    /**
     * Handle card drawn event
     */
    handleCardDrawn(data) {
        const { card, player } = data;
        if (player?.id) {
            this.renderCardWithAnimation(card, player.id, false);
            this.updateDeckCount();
        }
    }

    /**
     * Handle Second Chance activation
     */
    handleSecondChanceActivated(data) {
        const { player, discardedCards } = data;
        
        // Remove discarded cards from display
        if (discardedCards && discardedCards.length > 0) {
            discardedCards.forEach(card => {
                this.removeCardFromDisplay(player.id, card);
            });
        }
        
        // Refresh player's card display
        this.refreshPlayerCards(player.id, player);
    }

    /**
     * Handle Second Chance given
     */
    handleSecondChanceGiven(data) {
        const { giver, recipient, card } = data;
        
        console.log(`UIUpdateManager: Second Chance redistributed from ${giver.name} to ${recipient.name}`);
        
        // Get animation manager for transfer animation
        const displayManager = window.Flip7?.display;
        const animationManager = displayManager?.getManagers()?.animation;
        
        if (animationManager?.animateActionCardTransfer) {
            console.log(`UIUpdateManager: Starting Second Chance transfer animation`);
            
            animationManager.animateActionCardTransfer(card, giver.id, recipient.id)
                .then(() => {
                    console.log(`UIUpdateManager: Transfer animation complete, refreshing displays`);
                    // Refresh both players' displays after animation
                    this.refreshPlayerCards(giver.id, giver);
                    this.refreshPlayerCards(recipient.id, recipient);
                    
                    // Emit animation completion event
                    this.eventBus.emit(GameEvents.CARD_ANIMATION_END, {
                        playerId: giver.id,
                        type: 'secondChanceTransfer'
                    });
                })
                .catch(error => {
                    console.error('UIUpdateManager: Transfer animation failed:', error);
                    // Fallback to immediate refresh
                    this.refreshPlayerCards(giver.id, giver);
                    this.refreshPlayerCards(recipient.id, recipient);
                    
                    // Still emit completion event for turn flow
                    this.eventBus.emit(GameEvents.CARD_ANIMATION_END, {
                        playerId: giver.id,
                        type: 'secondChanceTransfer'
                    });
                });
        } else {
            console.log(`UIUpdateManager: No transfer animation available, refreshing displays immediately`);
            // Fallback: just refresh displays immediately
            this.refreshPlayerCards(giver.id, giver);
            this.refreshPlayerCards(recipient.id, recipient);
            
            // Emit completion event for turn flow
            this.eventBus.emit(GameEvents.CARD_ANIMATION_END, {
                playerId: giver.id,
                type: 'secondChanceTransfer'
            });
        }
    }

    /**
     * Update turn display
     */
    updateTurnDisplay(data) {
        const { player, playerIndex } = data;
        
        // Highlight current player
        this.highlightCurrentPlayer(playerIndex);
        
        // Update turn indicator
        this.updateTurnIndicator(player);
        
        // Update action buttons
        this.updateActionButtons(player);
    }

    /**
     * Handle round start
     */
    handleRoundStart(data) {
        const { roundNumber, dealerIndex } = data;
        
        // Update round number
        this.updateGameStatus(`Round ${roundNumber}`);
        
        // Set dealer indicator
        this.setDealerIndicator(dealerIndex);
        
        // Reset board visuals
        this.resetBoardForNewRound();
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
            case 'refreshPlayerCards':
                this.refreshPlayerCards(params.playerId, params.player);
                break;
            case 'showActionCardPrompt':
                this.showActionCardPrompt(params.playerId, params.player, params.actionCards);
                break;
            case 'updateGameStatus':
                this.updateGameStatus(params.message);
                break;
            default:
                console.log('Unknown UI update type:', type);
        }
    }

    /**
     * Render card with flip animation - RESTORED VERSION
     */
    renderCardWithAnimation(card, playerId, isInitialDeal = false) {
        console.log(`UIUpdateManager: Starting flip animation for ${card.type}:${card.value} → ${playerId}`);
        
        // Get animation manager reference
        const displayManager = window.Flip7?.display;
        const animationManager = displayManager?.getManagers()?.animation;
        
        if (animationManager) {
            console.log(`UIUpdateManager: Found animation manager, starting flip animation`);
            
            // Start flip animation and wait for completion
            animationManager.animateCardFlip(card, playerId, isInitialDeal)
                .then(() => {
                    console.log(`UIUpdateManager: Animation complete, adding card to player`);
                    // Add card to player's hand after animation completes
                    this.renderCardToPlayer(card, playerId);
                    
                    // Emit animation end event for turn management
                    this.eventBus.emit(GameEvents.CARD_ANIMATION_END, {
                        playerId: playerId,
                        card: card
                    });
                });
            
        } else {
            console.warn(`UIUpdateManager: Animation manager not found, falling back to immediate render`);
            // Fallback to immediate rendering
            this.renderCardToPlayer(card, playerId);
        }
    }

    /**
     * Render a card to player's container (immediate, no animation)
     */
    renderCardToPlayer(card, playerId) {
        const container = this.getPlayerCardContainer(playerId);
        if (!container || !card) return;
        
        // Create the new card element
        const newCardEl = card.toElement();
        
        // Get existing cards from container to find correct insertion point
        const existingCards = Array.from(container.children).map(el => ({
            type: el.classList.contains('number') ? 'number' : 
                  el.classList.contains('modifier') ? 'modifier' : 'action',
            value: el.dataset.value || el.textContent || (el.classList.contains('number') ? parseInt(el.textContent) || 0 : el.textContent),
            element: el
        }));
        
        // Add the new card to the list for sorting
        const newCardData = { type: card.type, value: card.value, element: newCardEl };
        existingCards.push(newCardData);
        
        // Sort all cards to determine correct order
        const sortedCards = this.sortCardsForDisplay(existingCards);
        
        // Find where the new card should be inserted
        const newCardIndex = sortedCards.findIndex(cardData => cardData.element === newCardEl);
        
        // Insert the new card at the correct position WITHOUT clearing existing cards
        if (newCardIndex === 0) {
            // Insert at beginning
            container.insertBefore(newCardEl, container.firstChild);
        } else if (newCardIndex >= sortedCards.length - 1) {
            // Insert at end
            container.appendChild(newCardEl);
        } else {
            // Insert before the card that should come after it
            const nextCard = sortedCards[newCardIndex + 1];
            if (nextCard && nextCard.element && nextCard.element.parentNode === container) {
                container.insertBefore(newCardEl, nextCard.element);
            } else {
                // Fallback: append to end
                container.appendChild(newCardEl);
            }
        }
    }

    /**
     * Refresh player's entire card display - SIMPLE VERSION
     */
    refreshPlayerCards(playerId, player) {
        const container = this.getPlayerCardContainer(playerId);
        if (!container || !player) return;

        // Clear and rebuild - simple and reliable
        container.innerHTML = '';

        // Get all player's cards and add them one by one using the working renderCardToPlayer logic
        const allCards = player.getAllCards ? player.getAllCards() : [];
        allCards.forEach(card => {
            // Use the same logic as renderCardToPlayer but without the sorting (since we're rebuilding)
            const cardEl = card.toElement();
            container.appendChild(cardEl);
        });
    }

    /**
     * Sort cards for organized display: Numbers LEFT, Modifiers MIDDLE, Actions RIGHT
     */
    sortCardsForDisplay(cards) {
        const sorted = cards.slice().sort((a, b) => {
            // Type priority: number (0), modifier (1), action (2) 
            // Lower number = appears on the LEFT
            const typeOrder = { number: 0, modifier: 1, action: 2 };
            const aType = typeOrder[a.type] || 3;
            const bType = typeOrder[b.type] || 3;
            
            // Primary sort: by card type (numbers first, then modifiers, then actions)
            if (aType !== bType) return aType - bType;
            
            // Secondary sort: within same type, sort by value
            if (a.type === 'number') {
                // Numbers: 0, 1, 2, ... 12
                return a.value - b.value;
            }
            
            if (a.type === 'modifier') {
                // Modifiers: +2, +4, +6, +8, +10, then x2 at the end
                if (a.value === 'x2') return b.value === 'x2' ? 0 : 1;
                if (b.value === 'x2') return -1;
                return a.value - b.value;
            }
            
            if (a.type === 'action') {
                // Actions: freeze, flip3, second chance (order doesn't matter much)
                const actionOrder = { 'freeze': 0, 'flip3': 1, 'second chance': 2 };
                return (actionOrder[a.value] || 3) - (actionOrder[b.value] || 3);
            }
            
            return 0;
        });
        
        // Debug output to verify sorting (only in development)
        if (window.DEBUG_MODE || window.location.hostname === 'localhost') {
            console.log('UIUpdateManager: Card sort result:', 
                sorted.map(c => `${c.type}:${c.value}`).join(', '));
        }
        
        return sorted;
    }

    /**
     * Remove card from display
     */
    removeCardFromDisplay(playerId, cardToRemove) {
        const container = this.getPlayerCardContainer(playerId);
        if (!container) return;

        // Find and remove matching card element
        const cardElements = container.children;
        for (let i = cardElements.length - 1; i >= 0; i--) {
            const cardEl = cardElements[i];
            if (this.cardElementMatches(cardEl, cardToRemove)) {
                cardEl.remove();
                break;
            }
        }
    }

    /**
     * Check if card element matches card object
     */
    cardElementMatches(cardElement, card) {
        if (!cardElement || !card) return false;
        return cardElement.classList.contains(card.type);
    }

    /**
     * Highlight current player
     */
    highlightCurrentPlayer(playerIndex) {
        // Remove all highlights
        document.querySelectorAll('.player-area').forEach(el => {
            el.classList.remove('current-turn');
        });
        
        // Add highlight to current player
        const players = document.querySelectorAll('.player-area');
        if (players[playerIndex]) {
            players[playerIndex].classList.add('current-turn');
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
        // Desktop status
        const statusElements = document.querySelectorAll('.game-status');
        statusElements.forEach(el => {
            el.textContent = message;
        });
    }

    /**
     * Update action buttons based on current player
     */
    updateActionButtons(currentPlayer) {
        const humanTurn = !!currentPlayer?.isHuman && currentPlayer?.status === 'active';
        const hasCards = (currentPlayer?.numberCards?.length || 0) > 0;
        
        // Update all button sets (original, mobile, and desktop)
        this.setButtonState('hit-btn', !humanTurn);
        this.setButtonState('stay-btn', !humanTurn || !hasCards);
        this.setButtonState('mobile-hit-btn', !humanTurn);
        this.setButtonState('mobile-stay-btn', !humanTurn || !hasCards);
        this.setButtonState('desktop-hit-btn', !humanTurn);
        this.setButtonState('desktop-stay-btn', !humanTurn || !hasCards);
    }

    /**
     * Set button disabled state
     */
    setButtonState(buttonId, disabled) {
        const button = document.getElementById(buttonId);
        if (button) button.disabled = disabled;
    }

    /**
     * Reset board for new round
     */
    resetBoardForNewRound() {
        const playerIds = ['player', 'opponent1', 'opponent2', 'opponent3'];
        
        playerIds.forEach(id => {
            const container = document.getElementById(id);
            if (!container) return;
            
            // Remove state classes
            container.classList.remove('busted', 'frozen', 'current-turn', 'stayed', 'dealer');
            
            // Clear card containers
            const cardsEl = this.getPlayerCardContainer(id);
            if (cardsEl) cardsEl.innerHTML = '';

            // Status text removed from UI

            // Reset round score
            const headerRound = container.querySelector('.player-header .round-value');
            if (headerRound) headerRound.textContent = '0';
        });

        // Disable action buttons initially
        ['hit-btn', 'stay-btn', 'mobile-hit-btn', 'mobile-stay-btn', 'desktop-hit-btn', 'desktop-stay-btn'].forEach(id => {
            this.setButtonState(id, true);
        });
    }

    /**
     * Set dealer indicator
     */
    setDealerIndicator(dealerIndex) {
        const ids = ['player', 'opponent1', 'opponent2', 'opponent3'];
        
        // Clear existing dealer marks
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.remove('dealer');
        });
        
        // Add dealer mark to correct player
        if (ids[dealerIndex]) {
            const el = document.getElementById(ids[dealerIndex]);
            if (el) el.classList.add('dealer');
        }
    }

    /**
     * Update deck count display
     */
    updateDeckCount(count) {
        if (count === undefined) {
            count = window.Flip7?.engine?.deck?.getCardsRemaining?.() ?? '';
        }
        
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

    /**
     * Show action card prompt
     */
    showActionCardPrompt(playerId) {
        // Highlight action cards
        const container = this.getPlayerCardContainer(playerId);
        if (container) {
            const cardElements = container.querySelectorAll('.action');
            cardElements.forEach(cardEl => {
                cardEl.classList.add('action-card-highlight');
                cardEl.style.border = '3px solid #FFD700';
                cardEl.style.boxShadow = '0 0 15px rgba(255, 215, 0, 0.8)';
                cardEl.style.transform = 'scale(1.05)';
            });
        }
        
        // Disable buttons during action resolution
        ['hit-btn', 'stay-btn', 'mobile-hit-btn', 'mobile-stay-btn', 'desktop-hit-btn', 'desktop-stay-btn'].forEach(id => {
            this.setButtonState(id, true);
        });
    }

    /**
     * Get player card container
     */
    getPlayerCardContainer(playerId) {
        if (playerId === 'player') {
            return document.getElementById('player-cards');
        }
        return document.getElementById(`${playerId}-cards`);
    }

    /**
     * Animate score change
     */
    animateScoreChange(playerId) {
        const scoreElements = document.querySelectorAll(`#${playerId} .score-value, #${playerId} .round-value`);
        scoreElements.forEach(el => {
            el.classList.add('score-pulse');
            setTimeout(() => el.classList.remove('score-pulse'), 600);
        });
    }
}

// Make available globally
window.UIUpdateManager = UIUpdateManager;