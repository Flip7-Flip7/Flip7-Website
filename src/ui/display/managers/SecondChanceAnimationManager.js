/**
 * SecondChanceAnimationManager - Handles Second Chance card merge animations
 * Manages the visual merge effect when Second Chance saves a player from a duplicate
 */
class SecondChanceAnimationManager {
    constructor(eventBus, animationManager) {
        this.eventBus = eventBus;
        this.animationManager = animationManager;
        this.isActive = false;
        this.currentPlayer = null;
        
        this.setupEventListeners();
    }

    /**
     * Setup event listeners for Second Chance events
     */
    setupEventListeners() {
        // Listen for Second Chance activation
        this.eventBus.on(GameEvents.SECOND_CHANCE_ACTIVATED, this.startSecondChanceAnimation.bind(this));
    }

    /**
     * Start the Second Chance merge animation sequence
     */
    startSecondChanceAnimation(data) {
        const { player, card, secondChanceCard, discardedCards } = data;
        
        if (this.isActive) {
            console.warn('SecondChanceAnimationManager: Animation already in progress');
            return;
        }
        
        console.log(`SecondChanceAnimationManager: Starting Second Chance animation for ${player.name}`);
        
        this.isActive = true;
        this.currentPlayer = player;
        
        // Get player container
        const container = this.animationManager.getPlayerContainer(player.id);
        if (!container) {
            console.warn(`SecondChanceAnimationManager: No container found for ${player.id}`);
            this.completeAnimation();
            return;
        }
        
        // Start the merge animation sequence
        this.performMergeAnimation(container, secondChanceCard, card);
    }

    /**
     * Perform the card merge animation
     */
    performMergeAnimation(container, secondChanceCard, duplicateCard) {
        // Find both card elements in the container
        const secondChanceEl = this.findCardElement(container, secondChanceCard);
        const duplicateEl = this.findCardElement(container, duplicateCard);
        
        if (!secondChanceEl || !duplicateEl) {
            console.warn('SecondChanceAnimationManager: Could not find card elements for merge');
            this.showBasicAnimation(container);
            return;
        }
        
        // Get positions for merge calculation
        const secondChanceRect = secondChanceEl.getBoundingClientRect();
        const duplicateRect = duplicateEl.getBoundingClientRect();
        
        // Calculate merge point (midway between cards)
        const mergeX = (secondChanceRect.left + duplicateRect.left) / 2 + (secondChanceRect.width / 2);
        const mergeY = (secondChanceRect.top + duplicateRect.top) / 2 + (secondChanceRect.height / 2);
        
        // Create shield effect backdrop
        this.createShieldBackdrop(container);
        
        // Phase 1: Highlight both cards (300ms)
        this.highlightCards([secondChanceEl, duplicateEl]);
        
        // Phase 2: Move cards toward each other (600ms)
        setTimeout(() => {
            this.moveCardsToMergePoint(secondChanceEl, duplicateEl, mergeX, mergeY);
        }, 300);
        
        // Phase 3: Merge effect and disappear (800ms)
        setTimeout(() => {
            this.createMergeEffect(mergeX, mergeY);
            this.fadeOutCards([secondChanceEl, duplicateEl]);
        }, 900);
        
        // Phase 4: Show notification and complete (1200ms total)
        setTimeout(() => {
            this.showSavedNotification(container);
            this.completeAnimation();
        }, 1700);
    }

    /**
     * Create shield backdrop effect
     */
    createShieldBackdrop(container) {
        const backdrop = document.createElement('div');
        backdrop.className = 'second-chance-backdrop';
        backdrop.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: radial-gradient(circle, rgba(255, 215, 0, 0.2) 0%, rgba(255, 215, 0, 0.05) 70%, transparent 100%);
            pointer-events: none;
            z-index: 50;
            animation: pulse 0.6s ease-in-out;
        `;
        
        // Add pulse keyframes
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse {
                0%, 100% { opacity: 0; transform: scale(0.8); }
                50% { opacity: 1; transform: scale(1); }
            }
        `;
        document.head.appendChild(style);
        
        container.appendChild(backdrop);
        
        // Remove after animation
        setTimeout(() => {
            backdrop.remove();
            style.remove();
        }, 2000);
    }

    /**
     * Highlight cards with golden glow
     */
    highlightCards(cardElements) {
        cardElements.forEach(cardEl => {
            cardEl.style.transition = 'all 0.3s ease-out';
            cardEl.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.8), 0 0 40px rgba(255, 215, 0, 0.4)';
            cardEl.style.transform = 'scale(1.05)';
            cardEl.style.zIndex = '100';
        });
    }

    /**
     * Move both cards toward merge point
     */
    moveCardsToMergePoint(secondChanceEl, duplicateEl, mergeX, mergeY) {
        const cards = [secondChanceEl, duplicateEl];
        
        cards.forEach(cardEl => {
            const rect = cardEl.getBoundingClientRect();
            const deltaX = mergeX - (rect.left + rect.width / 2);
            const deltaY = mergeY - (rect.top + rect.height / 2);
            
            cardEl.style.transition = 'all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            cardEl.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(0.9)`;
        });
    }

    /**
     * Create magical merge effect at the merge point
     */
    createMergeEffect(x, y) {
        const mergeEffect = document.createElement('div');
        mergeEffect.className = 'second-chance-merge-effect';
        mergeEffect.style.cssText = `
            position: fixed;
            left: ${x - 30}px;
            top: ${y - 30}px;
            width: 60px;
            height: 60px;
            z-index: 3000;
            pointer-events: none;
        `;
        
        // Create multiple sparkle layers
        for (let i = 0; i < 3; i++) {
            const sparkleLayer = document.createElement('div');
            sparkleLayer.style.cssText = `
                position: absolute;
                width: 100%;
                height: 100%;
                background: radial-gradient(circle, rgba(255, 215, 0, 0.8) 0%, rgba(255, 255, 255, 0.4) 50%, transparent 70%);
                border-radius: 50%;
                animation: sparkle-burst 0.8s ease-out forwards;
                animation-delay: ${i * 0.1}s;
                transform: scale(0);
            `;
            mergeEffect.appendChild(sparkleLayer);
        }
        
        // Add sparkle burst keyframes
        const style = document.createElement('style');
        style.textContent = `
            @keyframes sparkle-burst {
                0% { transform: scale(0) rotate(0deg); opacity: 1; }
                50% { transform: scale(1.5) rotate(180deg); opacity: 0.8; }
                100% { transform: scale(3) rotate(360deg); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(mergeEffect);
        
        // Clean up effect
        setTimeout(() => {
            mergeEffect.remove();
            style.remove();
        }, 1200);
    }

    /**
     * Fade out cards after merge
     */
    fadeOutCards(cardElements) {
        cardElements.forEach(cardEl => {
            cardEl.style.transition = 'all 0.4s ease-in';
            cardEl.style.opacity = '0';
            cardEl.style.transform = cardEl.style.transform + ' scale(0.5)';
        });
        
        // Remove cards after fade
        setTimeout(() => {
            cardElements.forEach(cardEl => cardEl.remove());
        }, 400);
    }

    /**
     * Show saved notification
     */
    showSavedNotification(container) {
        const notification = document.createElement('div');
        notification.className = 'second-chance-notification';
        notification.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 215, 0, 0.95);
            color: #1a1a1a;
            padding: 15px 25px;
            border-radius: 12px;
            font-weight: bold;
            font-size: 1.2em;
            text-align: center;
            z-index: 200;
            box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4);
            animation: notification-pop 0.5s ease-out;
        `;
        notification.innerHTML = '🛡️ SECOND CHANCE!<br><small>Duplicate Saved</small>';
        
        // Add notification keyframes
        const style = document.createElement('style');
        style.textContent = `
            @keyframes notification-pop {
                0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
                50% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
                100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        
        container.appendChild(notification);
        
        // Remove notification after display
        setTimeout(() => {
            notification.style.transition = 'all 0.3s ease-in';
            notification.style.opacity = '0';
            notification.style.transform = 'translate(-50%, -50%) scale(0.8)';
            
            setTimeout(() => {
                notification.remove();
                style.remove();
            }, 300);
        }, 1500);
    }

    /**
     * Fallback basic animation if card elements not found
     */
    showBasicAnimation(container) {
        // Create simple shield effect
        const shield = document.createElement('div');
        shield.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 80px;
            height: 80px;
            background: radial-gradient(circle, rgba(255, 215, 0, 0.8) 0%, transparent 70%);
            border-radius: 50%;
            z-index: 100;
            animation: shield-pulse 1s ease-out;
        `;
        
        const style = document.createElement('style');
        style.textContent = `
            @keyframes shield-pulse {
                0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
                50% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
                100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
        
        container.appendChild(shield);
        
        setTimeout(() => {
            shield.remove();
            style.remove();
            this.showSavedNotification(container);
            this.completeAnimation();
        }, 1000);
    }

    /**
     * Find card element in container
     */
    findCardElement(container, card) {
        const cards = container.querySelectorAll('.card');
        return Array.from(cards).find(el => 
            el.classList.contains(card.type) && 
            el.textContent.includes(String(card.value))
        );
    }

    /**
     * Complete the animation and emit completion event
     */
    completeAnimation() {
        console.log('SecondChanceAnimationManager: Animation complete');
        
        this.isActive = false;
        
        // Emit completion event so GameEngine can continue turn
        this.eventBus.emit(GameEvents.SECOND_CHANCE_ANIMATION_COMPLETE, {
            player: this.currentPlayer,
            completed: true
        });
        
        this.currentPlayer = null;
    }
}

// Make available globally
window.SecondChanceAnimationManager = SecondChanceAnimationManager;