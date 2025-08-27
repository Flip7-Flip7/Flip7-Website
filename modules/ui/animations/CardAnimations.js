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
    }

    /**
     * Display a card being drawn with animation
     */
    displayCard(card, playerId) {
        const isMobile = window.innerWidth <= 1024;
        const animationArea = this.getAnimationArea(isMobile);
        
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
        const isMobile = window.innerWidth <= 1024;
        
        // Add interactive class for drag functionality
        animatedCard.classList.add('interactive-card');
        
        if (isMobile) {
            this.setupMobileDrag(animatedCard, card, playerId);
        } else {
            // Desktop uses modal system
            eventBus.emit(GameEvents.MODAL_OPENED, {
                type: 'special-action',
                card: card,
                playerId: playerId
            });
        }
    }

    /**
     * Setup mobile drag for special action cards
     */
    setupMobileDrag(cardElement, card, playerId) {
        let isDragging = false;
        let startX = 0;
        let startY = 0;
        
        cardElement.addEventListener('touchstart', (e) => {
            isDragging = true;
            const touch = e.touches[0];
            const rect = cardElement.getBoundingClientRect();
            
            startX = rect.width / 2;
            startY = rect.height / 2;
            
            cardElement.classList.add('dragging');
            cardElement.style.position = 'fixed';
            cardElement.style.left = (touch.clientX - startX) + 'px';
            cardElement.style.top = (touch.clientY - startY) + 'px';
            
            eventBus.emit(GameEvents.DRAG_STARTED, { card, playerId });
            
            e.preventDefault();
        });
        
        cardElement.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            
            const touch = e.touches[0];
            cardElement.style.left = (touch.clientX - startX) + 'px';
            cardElement.style.top = (touch.clientY - startY) + 'px';
            
            e.preventDefault();
        });
        
        cardElement.addEventListener('touchend', (e) => {
            if (!isDragging) return;
            isDragging = false;
            
            const touch = e.changedTouches[0];
            const elementUnder = document.elementFromPoint(touch.clientX, touch.clientY);
            
            // Find drop target
            const dropTarget = this.findDropTarget(elementUnder);
            
            if (dropTarget) {
                eventBus.emit(GameEvents.DROP_COMPLETED, {
                    card,
                    sourcePlayerId: playerId,
                    targetPlayerId: dropTarget.playerId
                });
            }
            
            cardElement.remove();
            eventBus.emit(GameEvents.DRAG_ENDED, { card, playerId });
        });
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
                   document.querySelector('.card-animation-area');
        } else {
            return document.getElementById('card-animation-area');
        }
    }

    /**
     * Get target container for card
     */
    getTargetCardContainer(playerId) {
        if (playerId === 'player') {
            return document.getElementById('player-cards');
        } else {
            const playerElement = document.getElementById(playerId);
            return playerElement?.querySelector('.player-cards');
        }
    }

    /**
     * Find valid drop target from element
     */
    findDropTarget(element) {
        if (!element) return null;
        
        // Check if element is a player container
        const playerElement = element.closest('.player-area, .mobile-player-box');
        if (playerElement) {
            return {
                playerId: playerElement.id.replace('mobile-', '')
            };
        }
        
        return null;
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
}

// Create singleton instance
const cardAnimations = new CardAnimations();
export default cardAnimations;