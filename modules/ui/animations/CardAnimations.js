// CardAnimations.js - All card-related animations

import eventBus from '../../events/EventBus.js';
import { GameEvents } from '../../events/GameEvents.js';

export class CardAnimations {
    constructor() {
        this.animationDuration = {
            flip: 600,
            slide: 800,
            deal: 1800,
            transfer: 1000
        };
        this.activeTargets = null;
        this.setupEventListeners();
    }
    
    /**
     * Setup event listeners for targeting system
     */
    setupEventListeners() {
        eventBus.on(GameEvents.ACTION_CARD_AWAITING_TARGET, (data) => {
            this.enableTargetingMode(data.card, data.sourcePlayerId, data.cardElement);
        });
    }

    /**
     * Display a card being drawn with animation
     */
    displayCard(card, playerId) {
        // Store current card for reference
        this.currentCard = card;
        
        const isMobile = window.innerWidth <= 1024;
        
        if (isMobile) {
            this.handleMobileCardDraw(card, playerId);
        } else {
            this.handleDesktopCardDraw(card, playerId);
        }
    }
    
    /**
     * Handle mobile card drawing with simple animation
     */
    handleMobileCardDraw(card, playerId) {
        // Emit animation started event
        eventBus.emit(GameEvents.ANIMATION_STARTED, {
            type: 'card-draw',
            target: playerId,
            card: card
        });
        
        // Show simple draw animation
        this.showMobileDrawAnimation(() => {
            // Mark the new card in mobile display after animation
            setTimeout(() => {
                this.highlightNewMobileCard(playerId);
                
                eventBus.emit(GameEvents.ANIMATION_COMPLETED, {
                    type: 'mobile-card-draw',
                    target: playerId
                });
            }, 200);
        });
        
        // Handle special action cards
        const isSpecialAction = card.type === 'action' && 
                               (card.value === 'flip3' || card.value === 'freeze');
        
        if (isSpecialAction) {
            setTimeout(() => {
                this.handleMobileSpecialAction(card, playerId);
            }, 800);
        }
    }
    
    /**
     * Handle desktop card drawing (original logic)
     */
    handleDesktopCardDraw(card, playerId) {
        const animationArea = this.getAnimationArea(false);
        
        if (!animationArea) return;

        // Clear any existing animation
        animationArea.innerHTML = '';
        
        // Create animated card
        const animatedCard = this.createAnimatedCard(card);
        animationArea.appendChild(animatedCard);
        
        // Emit animation started event
        eventBus.emit(GameEvents.ANIMATION_STARTED, {
            type: 'card-draw',
            target: playerId,
            card: card
        });
        
        // Determine if this is a special action card
        const isSpecialAction = card.type === 'action' && 
                               (card.value === 'flip3' || card.value === 'freeze');
        
        if (isSpecialAction) {
            this.handleSpecialActionCard(animatedCard, card, playerId);
        } else {
            this.animateNormalCard(animatedCard, playerId);
        }
    }

    /**
     * Create the animated card element
     */
    createAnimatedCard(card) {
        const animatedCard = document.createElement('div');
        animatedCard.className = 'card back animated-card';
        
        // Start with back of card
        animatedCard.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 120px;
            height: 168px;
            z-index: 10000;
        `;
        
        return animatedCard;
    }

    /**
     * Animate normal card (flip and slide)
     */
    animateNormalCard(animatedCard, playerId) {
        // Simple flip animation
        setTimeout(() => {
            animatedCard.classList.add('simple-flip');
        }, 100);
        
        // After flip, transform to actual card
        setTimeout(() => {
            this.transformToActualCard(animatedCard, this.currentCard);
        }, this.animationDuration.flip);
        
        // Slide to player
        setTimeout(() => {
            this.slideCardToPlayer(animatedCard, playerId);
        }, this.animationDuration.flip + 200);
    }

    /**
     * Handle special action cards (Freeze/Flip3) that need targeting
     */
    handleSpecialActionCard(animatedCard, card, playerId) {
        // Add interactive class for tap functionality
        animatedCard.classList.add('interactive-card');
        
        // Use tap system for all devices
        this.setupActionCardTap(animatedCard, card, playerId);
    }

    /**
     * Setup tap system for action cards - enter targeting mode
     */
    setupActionCardTap(cardElement, card, playerId) {
        // Add visual indicator that card is tappable
        cardElement.style.cursor = 'pointer';
        cardElement.title = `Tap to use ${card.display}`;
        
        const handleTap = (e) => {
            e.preventDefault();
            
            // Transform card to show what it is
            this.transformToActualCard(cardElement, card);
            
            // Enter targeting mode
            eventBus.emit(GameEvents.ACTION_CARD_AWAITING_TARGET, {
                card,
                sourcePlayerId: playerId,
                cardElement: cardElement
            });
            
            // Remove the tap handler
            cardElement.removeEventListener('click', handleTap);
            cardElement.removeEventListener('touchend', handleTap);
        };
        
        // Add both click and touch handlers
        cardElement.addEventListener('click', handleTap);
        cardElement.addEventListener('touchend', handleTap);
    }

    /**
     * Slide card to player position
     */
    slideCardToPlayer(animatedCard, playerId) {
        const targetElement = this.getTargetCardContainer(playerId);
        if (!targetElement) {
            animatedCard.remove();
            return;
        }
        
        const targetRect = targetElement.getBoundingClientRect();
        const cardRect = animatedCard.getBoundingClientRect();
        
        // Calculate movement
        const deltaX = targetRect.left + targetRect.width / 2 - cardRect.left - cardRect.width / 2;
        const deltaY = targetRect.top + targetRect.height / 2 - cardRect.top - cardRect.height / 2;
        
        // Apply slide animation
        animatedCard.style.transition = `transform ${this.animationDuration.slide}ms ease-out`;
        animatedCard.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(0.4)`;
        
        // Remove animated card after animation
        setTimeout(() => {
            animatedCard.remove();
            eventBus.emit(GameEvents.ANIMATION_COMPLETED, {
                type: 'card-slide',
                target: playerId
            });
        }, this.animationDuration.slide);
    }

    /**
     * Get animation area based on device type
     */
    getAnimationArea(isMobile) {
        if (isMobile) {
            return document.getElementById('mobile-card-animation-area') || 
                   document.getElementById('card-animation-area');
        } else {
            return document.getElementById('card-animation-area') ||
                   document.getElementById('mobile-card-animation-area');
        }
    }

    /**
     * Get target container for card
     */
    getTargetCardContainer(playerId) {
        // Try mobile containers first on mobile devices
        if (window.innerWidth <= 1024) {
            if (playerId === 'player') {
                return document.getElementById('mobile-player-cards') || 
                       document.querySelector('#mobile-player .player-cards');
            } else {
                return document.getElementById(`mobile-${playerId}-cards`) ||
                       document.querySelector(`#mobile-${playerId} .player-cards`);
            }
        } else {
            // Desktop containers
            if (playerId === 'player') {
                return document.getElementById('player-cards');
            } else {
                const playerElement = document.getElementById(playerId);
                return playerElement?.querySelector('.player-cards');
            }
        }
    }

    /**
     * Show targeting message
     */
    showTargetingMessage(card) {
        const existingMessage = document.querySelector('.targeting-message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'targeting-message';
        messageDiv.textContent = `Tap a player to use ${card.display}`;
        
        document.body.appendChild(messageDiv);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 5000);
    }
    
    /**
     * Hide targeting message
     */
    hideTargetingMessage() {
        const message = document.querySelector('.targeting-message');
        if (message) {
            message.remove();
        }
    }

    /**
     * Enable targeting mode - make players tappable
     */
    enableTargetingMode(card, sourcePlayerId, cardElement) {
        // Show targeting message
        this.showTargetingMessage(card);
        
        // Get all player containers that can be targeted
        const playerContainers = document.querySelectorAll('.player-area, .mobile-player-box');
        const validTargets = [];
        
        playerContainers.forEach(container => {
            const playerId = container.id.replace('mobile-', '');
            
            // Can't target yourself
            if (playerId === sourcePlayerId) return;
            
            // Add targeting visual state
            container.classList.add('targeting-available');
            container.style.cursor = 'pointer';
            
            const handleTargetTap = (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Emit target selection
                eventBus.emit(GameEvents.PLAYER_TAPPED_FOR_TARGET, {
                    card,
                    sourcePlayerId,
                    targetPlayerId: playerId
                });
                
                // Clean up targeting mode
                this.disableTargetingMode();
                
                // Remove the action card
                if (cardElement) {
                    cardElement.remove();
                }
            };
            
            container.addEventListener('click', handleTargetTap, { once: true });
            container.addEventListener('touchend', handleTargetTap, { once: true });
            
            validTargets.push({ container, playerId, handleTargetTap });
        });
        
        // Store valid targets for cleanup
        this.activeTargets = validTargets;
        
        // Add cancel option (tap outside)
        const handleCancelTap = (e) => {
            if (!e.target.closest('.player-area, .mobile-player-box, .interactive-card')) {
                eventBus.emit(GameEvents.ACTION_CARD_TARGETING_CANCELLED, {
                    card,
                    sourcePlayerId
                });
                
                this.disableTargetingMode();
                if (cardElement) {
                    cardElement.remove();
                }
            }
        };
        
        // Add cancel handler with delay to avoid immediate trigger
        setTimeout(() => {
            document.addEventListener('click', handleCancelTap, { once: true });
            document.addEventListener('touchend', handleCancelTap, { once: true });
        }, 100);
    }
    
    /**
     * Disable targeting mode and clean up
     */
    disableTargetingMode() {
        // Hide targeting message
        this.hideTargetingMessage();
        
        if (this.activeTargets) {
            this.activeTargets.forEach(({ container, handleTargetTap }) => {
                container.classList.remove('targeting-available');
                container.style.cursor = '';
                container.removeEventListener('click', handleTargetTap);
                container.removeEventListener('touchend', handleTargetTap);
            });
            this.activeTargets = null;
        }
    }

    /**
     * Transform card from back to front
     */
    transformToActualCard(cardElement, card) {
        cardElement.classList.remove('back');
        cardElement.classList.add(card.type);
        
        if (this.hasCardImage(card)) {
            const imageName = this.getCardImageName(card);
            cardElement.style.backgroundImage = `url('images/cards/${imageName}')`;
            cardElement.style.backgroundSize = 'cover';
            cardElement.classList.add('custom-image');
            cardElement.textContent = '';
        } else {
            cardElement.textContent = card.display;
        }
    }

    /**
     * Check if card has custom image
     */
    hasCardImage(card) {
        const imageMap = {
            'number': true,
            'modifier': true,
            'action': true
        };
        return imageMap[card.type] || false;
    }

    /**
     * Get card image filename
     */
    getCardImageName(card) {
        if (card.type === 'number') {
            return `card-${card.value}.png`;
        } else if (card.type === 'modifier') {
            if (card.value === 'x2') return 'card-*2.png';
            return `card-+${card.value}.png`;
        } else if (card.type === 'action') {
            const actionMap = {
                'freeze': 'card-Freeze.png',
                'flip3': 'card-Flip3.png',
                'second_chance': 'card-SecondChance.png'
            };
            return actionMap[card.value];
        }
    }
    
    /**
     * Show mobile draw animation
     */
    showMobileDrawAnimation(callback) {
        // Create animation overlay if it doesn't exist
        let overlay = document.querySelector('.mobile-animation-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'mobile-animation-overlay';
            document.body.appendChild(overlay);
        }

        // Create animated card
        const animatedCard = document.createElement('div');
        animatedCard.className = 'mobile-animated-card';
        overlay.appendChild(animatedCard);

        // Show animation
        setTimeout(() => animatedCard.classList.add('show'), 50);
        
        // Hide and cleanup
        setTimeout(() => {
            animatedCard.classList.add('slide');
            setTimeout(() => {
                animatedCard.remove();
                callback?.();
            }, 300);
        }, 600);
    }
    
    /**
     * Highlight newly drawn card in mobile display
     */
    highlightNewMobileCard(playerId) {
        const mobileId = playerId === 'player' ? 'mobile-player' : `mobile-${playerId}`;
        const mobileContainer = document.getElementById(mobileId);
        
        if (!mobileContainer) return;
        
        const cards = mobileContainer.querySelectorAll('.mobile-card');
        const lastCard = cards[cards.length - 1];
        
        if (lastCard) {
            lastCard.classList.add('new-card');
            setTimeout(() => {
                lastCard.classList.remove('new-card');
            }, 1000);
        }
    }
    
    /**
     * Handle special action cards on mobile
     */
    handleMobileSpecialAction(card, playerId) {
        // Show targeting message for mobile
        this.showMobileTargetingMessage(card);
        
        // Enter targeting mode immediately
        eventBus.emit(GameEvents.ACTION_CARD_AWAITING_TARGET, {
            card,
            sourcePlayerId: playerId,
            cardElement: null // No card element on mobile
        });
    }
    
    /**
     * Show mobile-friendly targeting message
     */
    showMobileTargetingMessage(card) {
        const existingMessage = document.querySelector('.mobile-targeting-message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'mobile-targeting-message';
        messageDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: bold;
            z-index: 10000;
            text-align: center;
        `;
        
        messageDiv.textContent = `Tap a player to use ${card.display}`;
        document.body.appendChild(messageDiv);
        
        // Auto-remove after 4 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 4000);
    }
}

// Create singleton instance
const cardAnimations = new CardAnimations();
export default cardAnimations;