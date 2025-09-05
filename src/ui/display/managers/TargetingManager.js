/**
 * TargetingManager - Handles action card targeting and player interactions
 * Manages click handlers, visual feedback, and targeting state
 */
class TargetingManager {
    constructor(eventBus) {
        this.eventBus = eventBus;
        
        // Targeting state
        this.targetingMode = false;
        this.targetingCard = null;
        this.targetingSourcePlayer = null;
        this.targetingIsInitialDeal = false;
        this.targetingIsSecondChanceRedistribution = false;
        this.targetingAvailableTargets = [];
        this.targetingClickHandlers = new Map();
        
        this.setupEventListeners();
    }

    /**
     * Setup event listeners for targeting events
     */
    setupEventListeners() {
        this.eventBus.on(GameEvents.ACTION_CARD_TARGET_NEEDED, this.handleTargetNeeded.bind(this));
    }

    /**
     * Handle action card target needed event
     */
    handleTargetNeeded(data) {
        const { card, sourcePlayer, availableTargets, isInitialDeal, isSecondChanceRedistribution } = data;
        
        // Disable action buttons during targeting
        this.disableActionButtons(sourcePlayer.isHuman);
        
        // Enter targeting mode
        this.enterTargetingMode({
            card,
            sourcePlayer,
            availableTargets,
            isInitialDeal,
            isSecondChanceRedistribution
        });
        
        // Update UI for targeting
        this.updateTargetingUI(card, sourcePlayer, isSecondChanceRedistribution);
    }

    /**
     * Enter targeting mode
     */
    enterTargetingMode(options) {
        this.targetingMode = true;
        this.targetingCard = options.card;
        this.targetingSourcePlayer = options.sourcePlayer;
        this.targetingIsInitialDeal = options.isInitialDeal || false;
        this.targetingIsSecondChanceRedistribution = options.isSecondChanceRedistribution || false;
        this.targetingAvailableTargets = options.availableTargets || [];
        
        // Clear any existing handlers
        this.clearTargetingHandlers();
        
        // Setup targeting for available targets
        this.setupTargetingHandlers();
    }

    /**
     * Setup click handlers for targetable players
     */
    setupTargetingHandlers() {
        this.targetingAvailableTargets.forEach(targetPlayer => {
            const playerContainer = document.getElementById(targetPlayer.id);
            if (!playerContainer) return;
            
            // Add visual feedback
            playerContainer.classList.add('targetable');
            this.addTargetingVisuals(playerContainer, targetPlayer);
            
            // Create click handler
            const clickHandler = this.createTargetClickHandler(targetPlayer);
            
            // Store handler for cleanup
            this.targetingClickHandlers.set(targetPlayer.id, clickHandler);
            
            // Add click handler
            playerContainer.addEventListener('click', clickHandler);
            playerContainer.style.cursor = 'pointer';
        });
    }

    /**
     * Create click handler for target selection
     */
    createTargetClickHandler(targetPlayer) {
        return (event) => {
            // Ignore clicks on buttons
            if (event.target.tagName === 'BUTTON' || event.target.closest('button')) {
                return;
            }
            
            event.preventDefault();
            event.stopPropagation();
            
            // Handle target selection
            this.handleTargetSelection(targetPlayer);
        };
    }

    /**
     * Handle target selection
     */
    handleTargetSelection(targetPlayer) {
        // Emit target selected event
        this.eventBus.emit(GameEvents.ACTION_CARD_TARGET_SELECTED, {
            card: this.targetingCard,
            sourcePlayer: this.targetingSourcePlayer,
            targetPlayer: targetPlayer,
            isInitialDeal: this.targetingIsInitialDeal,
            isSecondChanceRedistribution: this.targetingIsSecondChanceRedistribution
        });
        
        // Exit targeting mode
        this.exitTargetingMode();
        
        // Re-enable buttons if human player
        if (this.targetingSourcePlayer && this.targetingSourcePlayer.isHuman) {
            this.enableActionButtons();
        }
    }

    /**
     * Exit targeting mode and cleanup
     */
    exitTargetingMode() {
        this.targetingMode = false;
        this.clearTargetingHandlers();
        
        // Reset state
        this.targetingCard = null;
        this.targetingSourcePlayer = null;
        this.targetingIsInitialDeal = false;
        this.targetingIsSecondChanceRedistribution = false;
        this.targetingAvailableTargets = [];
    }

    /**
     * Clear all targeting handlers and visuals
     */
    clearTargetingHandlers() {
        // Remove all click handlers
        this.targetingClickHandlers.forEach((handler, playerId) => {
            const playerContainer = document.getElementById(playerId);
            if (playerContainer) {
                playerContainer.removeEventListener('click', handler);
                playerContainer.classList.remove('targetable');
                playerContainer.style.cursor = '';
                this.removeTargetingVisuals(playerContainer);
            }
        });
        
        // Clear handler map
        this.targetingClickHandlers.clear();
    }

    /**
     * Add visual feedback for targetable player
     */
    addTargetingVisuals(container, player) {
        // Add pulsing border effect
        const pulseEffect = document.createElement('div');
        pulseEffect.className = 'targeting-pulse';
        pulseEffect.dataset.targetingEffect = 'true';
        container.appendChild(pulseEffect);
        
        // Add target indicator
        const indicator = document.createElement('div');
        indicator.className = 'target-indicator';
        indicator.dataset.targetingEffect = 'true';
        indicator.innerHTML = '🎯';
        container.appendChild(indicator);
        
        // Highlight player name
        const nameEl = container.querySelector('.player-name');
        if (nameEl) {
            nameEl.classList.add('targetable-name');
        }
    }

    /**
     * Remove targeting visuals
     */
    removeTargetingVisuals(container) {
        // Remove targeting effects
        const effects = container.querySelectorAll('[data-targeting-effect="true"]');
        effects.forEach(el => el.remove());
        
        // Remove highlight from name
        const nameEl = container.querySelector('.player-name');
        if (nameEl) {
            nameEl.classList.remove('targetable-name');
        }
    }

    /**
     * Update UI with targeting instructions
     */
    updateTargetingUI(card, sourcePlayer, isSecondChanceRedistribution) {
        let message, cardName;
        
        if (isSecondChanceRedistribution) {
            message = sourcePlayer.isHuman ? 
                'Choose a player to give your Second Chance card' :
                `${sourcePlayer.name} is choosing who gets Second Chance`;
        } else {
            cardName = this.getCardDisplayName(card);
            message = sourcePlayer.isHuman ? 
                `Choose a player to ${this.getCardAction(card)}` :
                `${sourcePlayer.name} is choosing a target for ${cardName}`;
        }
        
        // Update game status
        this.updateGameStatus(message);
    }

    /**
     * Get card display name
     */
    getCardDisplayName(card) {
        switch (card.value) {
            case 'freeze': return 'Freeze';
            case 'flip3': return 'Flip 3';
            case 'second chance': return 'Second Chance';
            default: return card.value;
        }
    }

    /**
     * Get card action description
     */
    getCardAction(card) {
        switch (card.value) {
            case 'freeze': return 'freeze';
            case 'flip3': return 'use Flip 3 on';
            case 'second chance': return 'give Second Chance to';
            default: return 'target';
        }
    }

    /**
     * Update game status message
     */
    updateGameStatus(message) {
        const statusElements = document.querySelectorAll('.game-status');
        statusElements.forEach(el => {
            el.textContent = message;
        });
    }


    /**
     * Disable action buttons during targeting
     */
    disableActionButtons(isHuman) {
        if (!isHuman) return;
        
        ['desktop-hit-btn', 'desktop-stay-btn', 'mobile-hit-btn', 'mobile-stay-btn'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.disabled = true;
        });
    }

    /**
     * Enable action buttons after targeting
     */
    enableActionButtons() {
        ['desktop-hit-btn', 'desktop-stay-btn', 'mobile-hit-btn', 'mobile-stay-btn'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.disabled = false;
        });
    }

    /**
     * Check if currently in targeting mode
     */
    isTargeting() {
        return this.targetingMode;
    }

    /**
     * Get current targeting state
     */
    getTargetingState() {
        return {
            active: this.targetingMode,
            card: this.targetingCard,
            sourcePlayer: this.targetingSourcePlayer,
            availableTargets: this.targetingAvailableTargets
        };
    }
}

// Make available globally
window.TargetingManager = TargetingManager;