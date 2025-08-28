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
        
        // Action card targeting state
        this.targetingMode = false;
        this.targetingCard = null;
        this.targetingSourcePlayer = null;
        this.targetingIsInitialDeal = false;
        this.targetingAvailableTargets = [];
        this.targetingClickHandlers = new Map();
        
        this.setupEventListeners();
    }

    /**
     * Setup event listeners for game events
     */
    setupEventListeners() {
        // Game state events
        this.eventBus.on(GameEvents.GAME_START, this.onGameStart.bind(this));
        this.eventBus.on(GameEvents.GAME_END, this.onGameEnd.bind(this));
        this.eventBus.on(GameEvents.ROUND_START, this.onRoundStart.bind(this));
        this.eventBus.on(GameEvents.ROUND_END, this.onRoundEnd.bind(this));
        this.eventBus.on(GameEvents.TURN_START, this.onTurnStart.bind(this));
        
        // Player events
        this.eventBus.on(GameEvents.PLAYER_SCORE_UPDATE, this.updatePlayerScore.bind(this));
        this.eventBus.on(GameEvents.PLAYER_BUST, this.onPlayerBust.bind(this));
        this.eventBus.on(GameEvents.PLAYER_FLIP7, this.onPlayerFlip7.bind(this));
        this.eventBus.on(GameEvents.PLAYER_STAY, this.onPlayerStay.bind(this));
        this.eventBus.on(GameEvents.FREEZE_CARD_USED, this.onFreezeUsed.bind(this));
        this.eventBus.on(GameEvents.PLAYER_FROZEN, this.onPlayerFrozen.bind(this));
        this.eventBus.on(GameEvents.SECOND_CHANCE_ACTIVATED, this.onSecondChanceActivated.bind(this));
        this.eventBus.on(GameEvents.ACTION_CARD_TARGET_NEEDED, this.onActionCardTargetNeeded.bind(this));
        
        // Card events
        this.eventBus.on(GameEvents.CARD_DEALT, this.onCardDealt.bind(this));
        this.eventBus.on(GameEvents.CARD_DRAWN, this.onCardDrawn.bind(this));
        
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
        // Hide any endgame overlay
        const celebration = document.getElementById('winning-celebration');
        if (celebration) celebration.style.display = 'none';
    }

    /**
     * Handle round start event
     */
    onRoundStart(data) {
        console.log('Display: Round started', data);
        this.updateGameStatus(`Round ${data.roundNumber}`);
        this.resetBoardForNewRound();
        // Add dealer label like legacy
        if (typeof data?.dealerIndex === 'number') {
            this.setDealerIndicator(data.dealerIndex);
        }
    }

    /**
     * Handle round end: ensure totals are updated and round scores displayed correctly
     */
    onRoundEnd(data) {
        try {
            const scores = data?.scores || [];
            scores.forEach(entry => {
                const playerId = entry?.player?.id;
                if (!playerId) return;
                // Update total and round scores in header
                const totalEls = document.querySelectorAll(`#${playerId} .player-header .score-value`);
                totalEls.forEach(el => el.textContent = entry.totalScore);
                const roundEls = document.querySelectorAll(`#${playerId} .player-header .round-value`);
                roundEls.forEach(el => el.textContent = entry.roundScore);
            });

            // Update scoreboard panels with new totals
            this.updateScoreboardFromScores(scores);
        } catch (e) {
            console.warn('onRoundEnd UI update failed:', e);
        }
    }

    /**
     * Handle turn start event
     */
    onTurnStart(data) {
        const { player, playerIndex } = data;
        this.highlightCurrentPlayer(playerIndex);
        this.updateTurnIndicator(player);
        this.updateActionButtons(player);
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
    }

    /**
     * Handle Second Chance activation - remove cards from UI display
     */
    onSecondChanceActivated(data) {
        const { player, secondChanceCard, card, discardedCards } = data;
        console.log(`Display: Second Chance activated for ${player.name}`);
        
        // Remove both cards from the UI display
        if (discardedCards && discardedCards.length > 0) {
            discardedCards.forEach(discardedCard => {
                this.removeCardFromDisplay(player.id, discardedCard);
            });
        }
        
        // Force refresh the player's card display to ensure accurate representation
        this.refreshPlayerCards(player.id, player);
    }

    /**
     * Handle player stay event - show an overlay similar to legacy game.js
     */
    onPlayerStay(data) {
        const { player, score } = data;
        const container = document.getElementById(player.id);
        if (!container) return;

        // Add persistent stayed class (styling defined in CSS)
        container.classList.add('stayed');

        // Remove any previous indicator
        const existing = container.querySelector('.stayed-indicator');
        if (existing) existing.remove();

        // Create stayed indicator
        const stayedIndicator = document.createElement('div');
        stayedIndicator.className = 'stayed-indicator';
        stayedIndicator.innerHTML = `
            <span class="stayed-icon">✓</span>
            <span class="stayed-text">STAYED</span>
            <span class="stayed-points">${score} Points Banked!</span>
        `;
        // Position indicator at the top of the player area
        stayedIndicator.style.cssText = `
            position: absolute;
            top: -20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 1000;
        `;
        container.style.position = container.style.position || 'relative';
        container.appendChild(stayedIndicator);

        // Optional subtle glow on cards
        const cards = container.querySelectorAll('.card');
        cards.forEach((card, index) => {
            setTimeout(() => {
                card.classList.add('stay-glow');
                setTimeout(() => card.classList.remove('stay-glow'), 1200);
            }, index * 50);
        });
    }

    /**
     * Update scoreboard elements using provided score objects
     */
    updateScoreboardFromScores(scores) {
        try {
            // Normalize array of { player:{id,name}, totalScore }
            const normalized = scores.map(s => ({
                id: s?.player?.id,
                name: s?.player?.name,
                total: s?.totalScore ?? 0
            })).filter(x => x.id);
            const sorted = normalized.sort((a,b) => b.total - a.total);
            const boards = document.querySelectorAll('#scoreboard-content');
            boards.forEach(board => {
                board.innerHTML = '';
                sorted.forEach(entry => {
                    const div = document.createElement('div');
                    div.className = 'score-entry';
                    div.innerHTML = `<span>${entry.name}</span><span>${entry.total} pts</span>`;
                    board.appendChild(div);
                });
            });
        } catch (e) {
            console.warn('Failed to update scoreboard:', e);
        }
    }

    /**
     * Handle game end and show winner overlay
     */
    onGameEnd(data) {
        const winner = data?.winner;
        const winnerName = winner?.name || 'Winner';
        const isHumanWin = winner?.isHuman;
        
        // Show celebration overlay
        const celebration = document.getElementById('winning-celebration');
        if (celebration) {
            celebration.style.display = 'flex';
        }
        
        // Update celebration text based on who won
        const celebrationText = document.getElementById('celebration-text');
        const celebrationSubtext = document.getElementById('celebration-subtext');
        
        if (isHumanWin) {
            if (celebrationText) celebrationText.textContent = '🎉 Congratulations You Won! 🎉';
            if (celebrationSubtext) celebrationSubtext.textContent = 'Amazing job! Click anywhere to continue.';
        } else {
            if (celebrationText) celebrationText.textContent = `🎯 ${winnerName} Wins!`;
            if (celebrationSubtext) celebrationSubtext.textContent = 'Better luck next time! Click anywhere to continue.';
        }
        
        // Add dismissal handlers
        this.setupCelebrationDismissal();
        
        // Update mobile banner
        const mobileTurnIndicator = document.getElementById('mobile-turn-indicator');
        const mobileGameInfo = document.getElementById('mobile-game-info');
        if (mobileTurnIndicator) mobileTurnIndicator.textContent = `🎉 ${winnerName} Wins!`;
        if (mobileGameInfo) mobileGameInfo.textContent = 'Click "Start Game" to play again';
        
        // Disable action buttons
        ['hit-btn','stay-btn','mobile-hit-btn','mobile-stay-btn'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.disabled = true;
        });
        
        // Simple confetti for human wins
        if (isHumanWin) {
            this.createConfetti();
        }
    }

    createConfetti() {
        const container = document.getElementById('confetti-container');
        if (!container) return;
        container.innerHTML = '';
        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.animationDelay = (Math.random() * 3) + 's';
            confetti.style.animationDuration = (2 + Math.random() * 2) + 's';
            container.appendChild(confetti);
        }
    }

    /**
     * Setup dismissal handlers for celebration overlay
     */
    setupCelebrationDismissal() {
        const celebration = document.getElementById('winning-celebration');
        const closeBtn = document.getElementById('close-celebration');
        
        const dismissCelebration = () => {
            if (celebration) {
                celebration.style.display = 'none';
            }
        };
        
        // Close button handler
        if (closeBtn) {
            closeBtn.onclick = dismissCelebration;
        }
        
        // Click anywhere on overlay to dismiss
        if (celebration) {
            celebration.onclick = (e) => {
                // Only dismiss if clicking the overlay itself, not the banner
                if (e.target === celebration) {
                    dismissCelebration();
                }
            };
        }
    }

    /**
     * Handle freeze card used - show frozen overlay on target
     */
    onFreezeUsed(data) {
        const { targetPlayer } = data;
        if (!targetPlayer) return;
        this.addFrozenOverlay(targetPlayer.id);
    }

    /**
     * Handle generic player frozen event (if emitted)
     */
    onPlayerFrozen(data) {
        const { player } = data;
        if (!player) return;
        this.addFrozenOverlay(player.id);
    }

    /**
     * Add a visual frozen overlay to a player's container
     */
    addFrozenOverlay(playerId) {
        const container = document.getElementById(playerId);
        if (!container) return;

        // Clean any previous frozen visuals first
        ['freeze-overlay','freeze-ice-shards','freeze-particles','ice-particles'].forEach(cls => {
            container.querySelectorAll(`.${cls}`).forEach(el => el.remove());
        });

        container.classList.add('frozen');
        container.style.position = container.style.position || 'relative';

        // Simple overlay (no animations)
        const overlay = document.createElement('div');
        overlay.className = 'freeze-overlay';
        overlay.style.cssText = `
            position: absolute;
            inset: 0;
            background: rgba(96, 165, 250, 0.25);
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: none;
            backdrop-filter: saturate(0.8);
        `;
        const label = document.createElement('div');
        label.className = 'freeze-overlay-text';
        label.textContent = '❄ FROZEN ❄';
        label.style.cssText = `
            color: #e5f2ff;
            font-weight: 800;
            text-shadow: 0 1px 2px rgba(0,0,0,0.35);
        `;
        overlay.appendChild(label);
        container.appendChild(overlay);

        // Update status text
        const statusEl = container.querySelector('.player-status');
        if (statusEl) statusEl.textContent = 'Frozen ❄️';

        // If this is the human player, disable action buttons
        if (playerId === 'player') {
            ['hit-btn','stay-btn','mobile-hit-btn','mobile-stay-btn'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.disabled = true;
            });
        }
    }

    /**
     * Handle card dealt event
     */
    onCardDealt(data) {
        const { card, playerId } = data;
        this.renderCardToPlayer(card, playerId);
    }

    /**
     * Handle card drawn event
     */
    onCardDrawn(data) {
        const { card, player } = data;
        const playerId = player?.id;
        if (playerId) {
            this.renderCardToPlayer(card, playerId);
        }
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

    /** Enable/disable Hit/Stay for human vs AI turns */
    updateActionButtons(currentPlayer) {
        const humanTurn = !!currentPlayer?.isHuman && currentPlayer?.status === 'active';
        const setDisabled = (id, disabled) => {
            const el = document.getElementById(id);
            if (el) el.disabled = disabled;
        };
        setDisabled('hit-btn', !humanTurn);
        setDisabled('stay-btn', !humanTurn || (currentPlayer?.numberCards?.length || 0) === 0);
        setDisabled('mobile-hit-btn', !humanTurn);
        setDisabled('mobile-stay-btn', !humanTurn || (currentPlayer?.numberCards?.length || 0) === 0);
    }

    /**
     * Clear all board visuals at the start of a new round
     */
    resetBoardForNewRound() {
        const playerIds = ['player', 'opponent1', 'opponent2', 'opponent3'];
        playerIds.forEach(id => {
            const container = document.getElementById(id);
            if (!container) return;

            // Remove state classes
            container.classList.remove(
                GameConstants.UI_CLASSES?.BUSTED || 'busted',
                GameConstants.UI_CLASSES?.FROZEN || 'frozen',
                GameConstants.UI_CLASSES?.CURRENT_TURN || 'current-turn',
                GameConstants.UI_CLASSES?.INACTIVE || 'inactive',
                GameConstants.UI_CLASSES?.DEALER || 'dealer',
                'stayed'
            );

            // Remove overlays/indicators if any
            ['freeze-overlay','freeze-ice-shards','freeze-particles','ice-particles','stayed-indicator'].forEach(cls => {
                container.querySelectorAll(`.${cls}`).forEach(el => el.remove());
            });

            // Clear card containers
            const cardsEl = id === 'player' ? document.getElementById('player-cards') : document.getElementById(`${id}-cards`);
            if (cardsEl) cardsEl.innerHTML = '';

            // Reset status text to Active
            const statusEl = container.querySelector('.player-status');
            if (statusEl) statusEl.textContent = 'Active';

            // Reset round score display to 0, keep total score as is
            const headerRound = container.querySelector('.player-header .round-value');
            if (headerRound) headerRound.textContent = '0';
        });

        // Disable actions until first TURN_START
        ['hit-btn','stay-btn','mobile-hit-btn','mobile-stay-btn'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.disabled = true;
        });
    }

    /**
     * Set the dealer indicator class on the correct player container
     */
    setDealerIndicator(dealerIndex) {
        const ids = ['player', 'opponent1', 'opponent2', 'opponent3'];
        // Clear existing dealer marks
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.remove(GameConstants.UI_CLASSES?.DEALER || 'dealer');
        });
        const dealerId = ids[dealerIndex] || null;
        if (dealerId) {
            const el = document.getElementById(dealerId);
            if (el) el.classList.add(GameConstants.UI_CLASSES?.DEALER || 'dealer');
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
            case 'refreshPlayerCards':
                this.refreshPlayerCards(params.playerId, params.player);
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

    /**
     * Render a card into a player's container (with image support)
     */
    renderCardToPlayer(card, playerId) {
        const container = this.getPlayerCardContainer(playerId);
        if (!container || !card) return;
        const cardEl = card.toElement();
        container.appendChild(cardEl);
        this.updateDeckCount(window.Flip7?.engine?.deck?.getCardsRemaining?.() ?? '');
    }

    /**
     * Get the player card container element
     */
    getPlayerCardContainer(playerId) {
        if (playerId === 'player') {
            return document.getElementById('player-cards');
        }
        const el = document.getElementById(`${playerId}-cards`);
        return el || null;
    }

    /**
     * Remove a specific card from the player's display
     */
    removeCardFromDisplay(playerId, cardToRemove) {
        const container = this.getPlayerCardContainer(playerId);
        if (!container) return;

        // Find and remove the card element that matches the card
        const cardElements = container.children;
        for (let i = cardElements.length - 1; i >= 0; i--) {
            const cardEl = cardElements[i];
            // Remove the most recently added card that matches the type/value
            if (this.cardElementMatches(cardEl, cardToRemove)) {
                cardEl.remove();
                break;
            }
        }
    }

    /**
     * Check if a card element matches a card object
     */
    cardElementMatches(cardElement, card) {
        // Basic matching - could be improved with better card identification
        if (!cardElement || !card) return false;
        
        // Check if it has the same card type class
        return cardElement.classList.contains(card.type);
    }

    /**
     * Refresh player's entire card display based on their current hand
     */
    refreshPlayerCards(playerId, player) {
        const container = this.getPlayerCardContainer(playerId);
        if (!container || !player) return;

        // Clear all existing cards
        container.innerHTML = '';

        // Re-add all cards from player's current hand
        const allCards = player.getAllCards ? player.getAllCards() : [];
        allCards.forEach(card => {
            const cardEl = card.toElement();
            container.appendChild(cardEl);
        });
    }
    
    /**
     * Handle action card target needed - enable click targeting on player boxes
     */
    onActionCardTargetNeeded(data) {
        const { card, sourcePlayer, availableTargets, isInitialDeal } = data;
        
        // Enter targeting mode
        this.targetingMode = true;
        this.targetingCard = card;
        this.targetingSourcePlayer = sourcePlayer;
        this.targetingIsInitialDeal = isInitialDeal || false;
        this.targetingAvailableTargets = availableTargets || [];
        
        // Clear any existing click handlers
        this.clearTargetingHandlers();
        
        // Add visual feedback and click handlers to targetable players
        this.targetingAvailableTargets.forEach(targetPlayer => {
            const playerContainer = document.getElementById(targetPlayer.id);
            if (!playerContainer) return;
            
            // Add targetable class for visual feedback
            playerContainer.classList.add('targetable');
            
            // Create click handler
            const clickHandler = (event) => {
                event.preventDefault();
                event.stopPropagation();
                
                // Emit target selected event
                this.eventBus.emit(GameEvents.ACTION_CARD_TARGET_SELECTED, {
                    card: this.targetingCard,
                    sourcePlayer: this.targetingSourcePlayer,
                    targetPlayer: targetPlayer,
                    isInitialDeal: this.targetingIsInitialDeal
                });
                
                // Exit targeting mode
                this.exitTargetingMode();
            };
            
            // Store handler reference for cleanup
            this.targetingClickHandlers.set(targetPlayer.id, clickHandler);
            
            // Add click handler to player container
            playerContainer.addEventListener('click', clickHandler);
            playerContainer.style.cursor = 'pointer';
        });
        
        // Update game status to show targeting instructions
        const cardName = card.value === 'freeze' ? 'Freeze' : 'Flip 3';
        const message = sourcePlayer.isHuman ? 
            `Choose a player to ${card.value === 'freeze' ? 'freeze' : 'use Flip 3 on'}` :
            `${sourcePlayer.name} is choosing a target for ${cardName}`;
            
        this.updateGameStatus(message);
        
        // For mobile, ensure the mobile status banner is updated too
        const mobileTurnIndicator = document.getElementById('mobile-turn-indicator');
        if (mobileTurnIndicator && sourcePlayer.isHuman) {
            mobileTurnIndicator.textContent = `Tap a player to use ${cardName}`;
        }
    }
    
    /**
     * Exit targeting mode and clean up
     */
    exitTargetingMode() {
        this.targetingMode = false;
        this.clearTargetingHandlers();
        
        // Reset targeting state
        this.targetingCard = null;
        this.targetingSourcePlayer = null;
        this.targetingIsInitialDeal = false;
        this.targetingAvailableTargets = [];
    }
    
    /**
     * Clear all targeting click handlers and visual feedback
     */
    clearTargetingHandlers() {
        // Remove all click handlers
        this.targetingClickHandlers.forEach((handler, playerId) => {
            const playerContainer = document.getElementById(playerId);
            if (playerContainer) {
                playerContainer.removeEventListener('click', handler);
                playerContainer.classList.remove('targetable');
                playerContainer.style.cursor = '';
            }
        });
        
        // Clear handler map
        this.targetingClickHandlers.clear();
    }
}

// Create singleton instance
window.DisplayManager = DisplayManager;