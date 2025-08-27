// ActionCardHandler.js - Handles action card targeting and execution

import eventBus from '../../events/EventBus.js';
import { GameEvents } from '../../events/GameEvents.js';

export class ActionCardHandler {
    constructor() {
        this.isTargeting = false;
        this.pendingActionCard = null;
        this.sourcePlayer = null;
        this.targetableElements = [];
        
        this.setupEventListeners();
    }

    /**
     * Setup event listeners for action card events
     */
    setupEventListeners() {
        eventBus.on(GameEvents.ACTION_CARD_DRAWN, (data) => this.handleActionCard(data));
    }

    /**
     * Main handler for action cards drawn
     */
    handleActionCard(data) {
        console.log('🎯 ActionCardHandler: Action card drawn:', data.card.display, 'by', data.playerId);
        
        const sourcePlayer = window.gameState?.players?.find(p => p.id === data.playerId);
        if (!sourcePlayer) {
            console.error('ActionCardHandler: Source player not found');
            return;
        }

        this.sourcePlayer = sourcePlayer;
        this.pendingActionCard = data.card;

        // Handle based on card type
        if (data.card.value === 'second_chance') {
            this.handleSecondChance();
        } else if (data.card.value === 'freeze' || data.card.value === 'flip3') {
            this.handleImmediateActionCard();
        }
    }

    /**
     * Handle Second Chance card logic
     */
    handleSecondChance() {
        console.log('🛡️ ActionCardHandler: Handling Second Chance');
        
        // Check if player already has Second Chance
        if (this.sourcePlayer.hasSecondChance) {
            console.log('🎯 ActionCardHandler: Player already has Second Chance, must target another player');
            this.startTargeting();
        } else {
            console.log('✅ ActionCardHandler: Auto-applying Second Chance to player');
            this.executeActionCard(this.sourcePlayer);
        }
    }

    /**
     * Handle Freeze/Flip3 cards that must be played immediately
     */
    handleImmediateActionCard() {
        console.log('⚡ ActionCardHandler: Handling immediate action card:', this.pendingActionCard.display);
        
        // For human players, start targeting UI
        if (this.sourcePlayer.isHuman) {
            console.log('👤 ActionCardHandler: Human player - starting targeting UI');
            this.startTargeting();
        } else {
            // AI players handle targeting automatically (handled by AIPlayer module)
            console.log('🤖 ActionCardHandler: AI player - letting AIPlayer handle targeting');
            // AIPlayer will emit targeting events, so we don't need to do anything here
        }
    }

    /**
     * Start the targeting UI for human players
     */
    startTargeting() {
        console.log('🎯 ActionCardHandler: Starting targeting UI');
        
        this.isTargeting = true;
        
        // Get all active players for targeting
        const activePlayers = window.gameState?.players?.filter(p => p.status === 'active') || [];
        
        // For Second Chance, exclude source player if they already have one
        let targetablePlayers = activePlayers;
        if (this.pendingActionCard.value === 'second_chance' && this.sourcePlayer.hasSecondChance) {
            targetablePlayers = activePlayers.filter(p => p.id !== this.sourcePlayer.id);
        }

        if (targetablePlayers.length === 0) {
            console.warn('⚠️ ActionCardHandler: No targetable players found');
            this.cancelTargeting();
            return;
        }

        // Add visual highlighting to targetable players
        this.highlightTargetablePlayers(targetablePlayers);

        // Emit event to let GameEngine know we're awaiting target
        eventBus.emit(GameEvents.ACTION_CARD_AWAITING_TARGET, {
            card: this.pendingActionCard,
            sourcePlayerId: this.sourcePlayer.id,
            targetablePlayerIds: targetablePlayers.map(p => p.id)
        });
    }

    /**
     * Add visual highlighting to targetable players
     */
    highlightTargetablePlayers(targetablePlayers) {
        console.log('✨ ActionCardHandler: Highlighting targetable players:', targetablePlayers.map(p => p.name));
        
        this.targetableElements = [];
        
        targetablePlayers.forEach(player => {
            // Get all containers for this player (desktop + mobile)
            const containers = this.getPlayerContainers(player.id);
            
            containers.forEach(container => {
                if (container) {
                    // Add targeting highlight class
                    container.classList.add('targetable', 'action-card-targeting');
                    
                    // Add click handler
                    const clickHandler = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.onPlayerTargeted(player);
                    };
                    
                    container.addEventListener('click', clickHandler);
                    this.targetableElements.push({
                        element: container,
                        handler: clickHandler,
                        playerId: player.id
                    });
                }
            });
        });

        // Add escape key handler to cancel targeting
        this.escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.cancelTargeting();
            }
        };
        document.addEventListener('keydown', this.escapeHandler);
    }

    /**
     * Get all DOM containers for a player (desktop + mobile)
     */
    getPlayerContainers(playerId) {
        const containers = [];
        
        // Desktop container
        const desktopContainer = document.getElementById(playerId);
        if (desktopContainer) containers.push(desktopContainer);
        
        // Mobile container  
        const mobileId = playerId === 'player' ? 'mobile-player' : `mobile-${playerId}`;
        const mobileContainer = document.getElementById(mobileId);
        if (mobileContainer) containers.push(mobileContainer);
        
        return containers;
    }

    /**
     * Handle player being targeted/tapped
     */
    onPlayerTargeted(targetPlayer) {
        console.log('🎯 ActionCardHandler: Player targeted:', targetPlayer.name);
        
        // Remove highlighting
        this.clearTargeting();
        
        // Execute the action card
        this.executeActionCard(targetPlayer);
    }

    /**
     * Execute the action card on the target player
     */
    executeActionCard(targetPlayer) {
        console.log('⚡ ActionCardHandler: Executing', this.pendingActionCard.display, 'on', targetPlayer.name);
        
        // Emit event for GameEngine to handle the execution
        eventBus.emit(GameEvents.PLAYER_TAPPED_FOR_TARGET, {
            card: this.pendingActionCard,
            sourcePlayerId: this.sourcePlayer.id,
            targetPlayerId: targetPlayer.id
        });
        
        this.resetState();
    }

    /**
     * Cancel targeting (e.g., on Escape key)
     */
    cancelTargeting() {
        console.log('❌ ActionCardHandler: Targeting cancelled');
        
        this.clearTargeting();
        
        // Emit cancellation event
        eventBus.emit(GameEvents.ACTION_CARD_TARGETING_CANCELLED, {
            card: this.pendingActionCard,
            sourcePlayerId: this.sourcePlayer.id
        });
        
        this.resetState();
    }

    /**
     * Clear all targeting UI elements
     */
    clearTargeting() {
        // Remove highlighting and event listeners
        this.targetableElements.forEach(({ element, handler }) => {
            element.classList.remove('targetable', 'action-card-targeting');
            element.removeEventListener('click', handler);
        });
        
        this.targetableElements = [];
        
        // Remove escape key handler
        if (this.escapeHandler) {
            document.removeEventListener('keydown', this.escapeHandler);
            this.escapeHandler = null;
        }
    }

    /**
     * Reset internal state
     */
    resetState() {
        this.isTargeting = false;
        this.pendingActionCard = null;
        this.sourcePlayer = null;
    }

    /**
     * Check if currently in targeting mode
     */
    isCurrentlyTargeting() {
        return this.isTargeting;
    }
}

// Create singleton instance
const actionCardHandler = new ActionCardHandler();
export default actionCardHandler;