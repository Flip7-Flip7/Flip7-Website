/**
 * AnimationManager - Handles all animations and visual effects
 * Manages card animations, freeze effects, celebrations, and other visual feedback
 */
class AnimationManager {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.activeAnimations = new Map();
        this.setupEventListeners();
    }

    /**
     * Setup event listeners for animation triggers
     */
    setupEventListeners() {
        // Player state animations
        this.eventBus.on(GameEvents.PLAYER_BUST, this.animatePlayerBust.bind(this));
        this.eventBus.on(GameEvents.PLAYER_FLIP7, this.animateFlip7.bind(this));
        this.eventBus.on(GameEvents.PLAYER_STAY_COMPLETED, this.animatePlayerStay.bind(this));
        this.eventBus.on(GameEvents.FREEZE_CARD_USED, this.animateFreezeEffect.bind(this));
        // Second Chance animations handled by SecondChanceAnimationManager
        
        // Card animations
        this.eventBus.on(GameEvents.CARD_DEALT, this.animateCardDeal.bind(this));
        this.eventBus.on(GameEvents.CARD_DRAWN, this.animateCardDraw.bind(this));
        
        // Game state animations
        this.eventBus.on(GameEvents.GAME_END, this.animateGameEnd.bind(this));
        this.eventBus.on(GameEvents.ROUND_START, this.clearRoundAnimations.bind(this));
    }

    /**
     * Animate player bust
     */
    animatePlayerBust(data) {
        const { player, card } = data;
        const container = document.getElementById(player.id);
        if (!container) return;

        // Add bust class for styling
        container.classList.add('busted');
        
        // Animate the duplicate card
        const cardElements = container.querySelectorAll('.card');
        const lastCard = cardElements[cardElements.length - 1];
        if (lastCard) {
            lastCard.classList.add('bust-card');
            this.shakeElement(lastCard, 500);
        }

        // Show bust overlay
        this.createBustOverlay(container);
        
        // Status text removed - bust state shown via overlay only
    }

    /**
     * Animate Flip 7 achievement
     */
    animateFlip7(data) {
        const { player } = data;
        const container = document.getElementById(player.id);
        if (!container) return;

        // Create golden glow effect
        container.classList.add('flip7-achieved');
        
        // Animate all 7 cards with staggered effect
        const cards = container.querySelectorAll('.card.number');
        cards.forEach((card, index) => {
            setTimeout(() => {
                card.classList.add('flip7-card');
                this.createSparkles(card);
            }, index * 100);
        });

        // Show Flip 7 banner
        this.createFlip7Banner(container);
        
        // Play celebration animation
        setTimeout(() => {
            this.createCelebrationBurst(container);
        }, 700);
    }

    /**
     * Animate player stay
     */
    animatePlayerStay(data) {
        const { player, score } = data;
        const container = document.getElementById(player.id);
        if (!container) return;

        // Add stayed class
        container.classList.add('stayed');

        // Create stayed indicator with animation
        const indicator = this.createStayedIndicator(score);
        container.appendChild(indicator);

        // Animate cards banking
        const cards = container.querySelectorAll('.card');
        cards.forEach((card, index) => {
            setTimeout(() => {
                card.classList.add('stay-glow');
                setTimeout(() => card.classList.remove('stay-glow'), 1200);
            }, index * 50);
        });
    }

    /**
     * Animate freeze effect on target
     */
    animateFreezeEffect(data) {
        const { targetPlayer } = data;
        if (!targetPlayer) return;
        
        const container = this.getPlayerContainer(targetPlayer.id);
        if (!container) {
            console.warn(`AnimationManager: No container found for ${targetPlayer.id} freeze effect`);
            return;
        }

        // Ensure container has relative positioning for absolute children
        const originalPosition = container.style.position;
        if (!originalPosition || originalPosition === 'static') {
            container.style.position = 'relative';
        }

        // Add frozen class and overlay
        container.classList.add('frozen');
        
        // Create and append overlay directly to container
        const overlay = this.createFreezeOverlay();
        container.appendChild(overlay);

        // Create ice particle effects
        this.createIceParticles(container);
        
        // Freeze animation on cards
        const cards = container.querySelectorAll('.card');
        cards.forEach((card, index) => {
            setTimeout(() => {
                card.classList.add('freezing');
                this.createFrostEffect(card);
            }, index * 30);
        });
    }

    // Note: Second Chance animations now handled by SecondChanceAnimationManager

    /**
     * Animate card being dealt
     */
    animateCardDeal(data) {
        // Skip if Flip3 animation is active - let Flip3AnimationManager handle it
        const displayManager = window.Flip7?.display;
        if (displayManager?.isFlip3Active()) {
            console.log('AnimationManager: Skipping card dealt animation - Flip3 active');
            return;
        }
        
        const { card, playerId, isInitialDeal } = data;
        const container = this.getPlayerCardContainer(playerId);
        if (!container) return;

        // Get the new card element (should be the last one added)
        const cardElements = container.querySelectorAll('.card');
        const newCard = cardElements[cardElements.length - 1];
        if (!newCard) return;

        // Animate from deck position
        this.animateCardFromDeck(newCard, isInitialDeal);
    }

    /**
     * Animate card being drawn
     */
    animateCardDraw(data) {
        const { card, playerId } = data;
        this.animateCardDeal({ 
            card, 
            playerId: playerId, 
            isInitialDeal: false 
        });
    }

    /**
     * Animate game end celebration
     */
    animateGameEnd(data) {
        const { winner } = data;
        const isHumanWin = winner?.isHuman;

        if (isHumanWin) {
            // Full celebration for human win
            this.createConfetti();
            this.createFireworks();
            this.animateWinnerHighlight('player');
        } else {
            // Subtle animation for AI win
            this.animateWinnerHighlight(winner.id);
        }
    }

    /**
     * Clear animations at round start
     */
    clearRoundAnimations() {
        // Remove all animation classes and overlays
        const playerIds = ['player', 'opponent1', 'opponent2', 'opponent3'];
        playerIds.forEach(id => {
            const container = document.getElementById(id);
            if (!container) return;

            // Remove animation classes
            container.classList.remove('busted', 'frozen', 'stayed', 'flip7-achieved');
            
            // Remove overlays from container
            const overlays = container.querySelectorAll('.bust-overlay, .stayed-indicator, .flip7-banner');
            overlays.forEach(el => el.remove());
            
            // Reset card animations
            const cards = container.querySelectorAll('.card');
            cards.forEach(card => {
                card.classList.remove('bust-card', 'flip7-card', 'stay-glow', 'freezing');
            });
        });
        
        // Freeze overlays are now inside containers and will be cleaned up with their parent containers
    }

    // Helper methods for specific animations

    createBustOverlay(container) {
        const overlay = document.createElement('div');
        overlay.className = 'bust-overlay animate-in';
        overlay.innerHTML = '<span class="bust-text">BUST!</span>';
        container.appendChild(overlay);
        return overlay;
    }

    createFlip7Banner(container) {
        const banner = document.createElement('div');
        banner.className = 'flip7-banner';
        banner.innerHTML = `
            <div class="flip7-content">
                <span class="flip7-number">7</span>
                <span class="flip7-text">FLIP 7!</span>
                <span class="flip7-bonus">+15 BONUS</span>
            </div>
        `;
        container.appendChild(banner);
        return banner;
    }

    createStayedIndicator(score) {
        const indicator = document.createElement('div');
        indicator.className = 'stayed-indicator animate-in';
        indicator.innerHTML = `
            <span class="stayed-icon">✓</span>
            <span class="stayed-text">STAYED</span>
            <span class="stayed-points">${score} Points Banked!</span>
        `;
        indicator.style.cssText = `
            position: absolute;
            top: -20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 1000;
        `;
        return indicator;
    }

    createFreezeOverlay() {
        const overlay = document.createElement('div');
        // Use CSS class for consistent styling with other overlays
        overlay.className = 'custom-freeze-overlay';
        
        // Create freeze text content
        const textElement = document.createElement('span');
        textElement.className = 'freeze-text';
        textElement.textContent = '❄ FROZEN ❄';
        overlay.appendChild(textElement);
        
        return overlay;
    }

    createIceParticles(container) {
        const particleContainer = document.createElement('div');
        particleContainer.className = 'ice-particles';
        particleContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            overflow: hidden;
            z-index: 10;
        `;
        
        // Add inline keyframes for snowfall animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes snowfall {
                0% {
                    transform: translateY(-10px) rotate(0deg);
                    opacity: 1;
                }
                100% {
                    transform: translateY(100vh) rotate(360deg);
                    opacity: 0.3;
                }
            }
        `;
        document.head.appendChild(style);
        
        // Create many more visible snowflakes
        for (let i = 0; i < 80; i++) {
            const particle = document.createElement('div');
            particle.className = 'ice-particle';
            particle.textContent = '❄';
            particle.style.cssText = `
                position: absolute;
                color: white;
                font-size: ${0.8 + Math.random() * 1.2}em;
                left: ${Math.random() * 100}%;
                top: ${-10 - Math.random() * 20}px;
                animation: snowfall ${3 + Math.random() * 4}s linear infinite;
                animation-delay: ${Math.random() * 4}s;
                text-shadow: 0 0 5px rgba(255,255,255,0.8), 0 0 10px rgba(147,197,253,0.6);
                z-index: 10;
            `;
            particleContainer.appendChild(particle);
        }
        
        container.appendChild(particleContainer);
        setTimeout(() => {
            particleContainer.remove();
            style.remove();
        }, 6000); // Extended duration for more particles
    }

    createShieldEffect() {
        const shield = document.createElement('div');
        shield.className = 'shield-effect';
        setTimeout(() => shield.remove(), 2000);
        return shield;
    }

    createSparkles(element) {
        const sparkleContainer = document.createElement('div');
        sparkleContainer.className = 'sparkle-container';
        
        for (let i = 0; i < 8; i++) {
            const sparkle = document.createElement('div');
            sparkle.className = 'sparkle';
            sparkle.style.transform = `rotate(${i * 45}deg)`;
            sparkleContainer.appendChild(sparkle);
        }
        
        element.appendChild(sparkleContainer);
        setTimeout(() => sparkleContainer.remove(), 1500);
    }

    createCelebrationBurst(container) {
        const burst = document.createElement('div');
        burst.className = 'celebration-burst';
        container.appendChild(burst);
        setTimeout(() => burst.remove(), 1000);
    }

    createConfetti() {
        const container = document.getElementById('confetti-container');
        if (!container) return;
        
        container.innerHTML = '';
        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.animationDelay = Math.random() * 3 + 's';
            confetti.style.animationDuration = (2 + Math.random() * 2) + 's';
            confetti.style.backgroundColor = this.getRandomColor();
            container.appendChild(confetti);
        }
    }

    createFireworks() {
        // Implement fireworks animation for big wins
        const positions = [
            { x: 20, y: 30 },
            { x: 50, y: 20 },
            { x: 80, y: 35 }
        ];
        
        positions.forEach((pos, index) => {
            setTimeout(() => {
                this.createFirework(pos.x, pos.y);
            }, index * 500);
        });
    }

    createFirework(x, y) {
        const firework = document.createElement('div');
        firework.className = 'firework';
        firework.style.left = x + '%';
        firework.style.top = y + '%';
        document.body.appendChild(firework);
        
        setTimeout(() => {
            firework.classList.add('explode');
            setTimeout(() => firework.remove(), 1000);
        }, 500);
    }

    createNotification(container, message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `game-notification ${type}`;
        notification.textContent = message;
        container.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }

    /**
     * Animate card flip and slide from deck to player
     * @param {Card} card - Card object to animate
     * @param {string} playerId - Target player ID
     * @param {boolean} isInitialDeal - Whether this is initial deal
     * @returns {Promise} Resolves when animation completes
     */
    animateCardFlip(card, playerId, isInitialDeal = false) {
        console.log(`AnimationManager: Starting flip animation for ${card.type}:${card.value} → ${playerId}`);
        
        return new Promise((resolve) => {
            const targetContainer = this.getPlayerCardContainer(playerId);
            
            console.log(`AnimationManager: Target container found:`, !!targetContainer);
            
            if (!targetContainer) {
                console.warn(`AnimationManager: No target container found for ${playerId}`);
                resolve();
                return;
            }
            
            // Start animation in center of screen (large)
            const screenCenterX = window.innerWidth / 2;
            const screenCenterY = window.innerHeight / 2;
            const targetRect = targetContainer.getBoundingClientRect();
            
            console.log(`AnimationManager: Center position: ${screenCenterX}, ${screenCenterY}`);
            console.log(`AnimationManager: Target position:`, targetRect);
            
            // Create large centered flip animation container
            const flipContainer = this.createCenteredFlipContainer(card);
            document.body.appendChild(flipContainer);
            
            console.log(`AnimationManager: Created centered flip container`);
            
            // Phase 1: Flip animation (400ms)
            setTimeout(() => {
                console.log(`AnimationManager: Starting flip phase`);
                flipContainer.classList.add('card-flipping');
            }, 100);
            
            // Phase 1.5: Apply permanent rotation exactly when CSS animation ends
            setTimeout(() => {
                console.log(`AnimationManager: Setting permanent rotation at animation end`);
                flipContainer.style.transform = 'rotateY(180deg)'; // Apply rotation first
                flipContainer.classList.remove('card-flipping'); // Then remove class
            }, 400); // Match exact CSS animation duration (300ms animation + 100ms start delay)
            
            // Phase 2: Scale down and slide to target (600ms)
            setTimeout(() => {
                console.log(`AnimationManager: Starting slide phase`);
                flipContainer.classList.add('card-sliding');
                
                // Calculate movement from center to target
                const deltaX = targetRect.left + (targetRect.width / 2) - screenCenterX;
                const deltaY = targetRect.top + (targetRect.height / 2) - screenCenterY;
                
                flipContainer.style.transform = `rotateY(180deg) translate(${deltaX}px, ${deltaY}px) scale(0.7)`;
            }, 450); // Start slide immediately after permanent rotation
            
            // Clean up and resolve
            setTimeout(() => {
                console.log(`AnimationManager: Animation complete, cleaning up`);
                flipContainer.remove();
                resolve();
            }, 1200);
        });
    }

    /**
     * Create large centered flip animation container
     */
    createCenteredFlipContainer(card) {
        const container = document.createElement('div');
        container.className = 'flip-animation-container'; // Neutral class to avoid CSS conflicts
        
        // Detect mobile vs desktop for responsive sizing
        const isMobile = window.innerWidth <= 768;
        const cardWidth = isMobile ? 180 : 120;
        const cardHeight = isMobile ? 240 : 160;
        
        // Position in center of screen, responsive size
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        
        container.style.cssText = `
            position: fixed;
            left: ${centerX - (cardWidth / 2)}px;
            top: ${centerY - (cardHeight / 2)}px;
            width: ${cardWidth}px;
            height: ${cardHeight}px;
            z-index: 2500;
            transform-style: preserve-3d;
            transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
            background: transparent;
            border: none;
            pointer-events: none;
        `;
        
        // Create card back with custom image
        const backFace = document.createElement('div');
        backFace.className = 'animation-card-back';
        backFace.style.cssText = `
            position: absolute;
            width: 100%;
            height: 100%;
            backface-visibility: hidden;
            transform: rotateY(0deg);
            background-image: url('images/Flip7CardBack.png');
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
            border-radius: 12px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        `;
        container.appendChild(backFace);
        
        // Create card front using actual card element
        const frontFace = card.toElement();
        frontFace.className += ' animation-card-front';
        frontFace.style.cssText += `
            position: absolute;
            width: 100%;
            height: 100%;
            backface-visibility: hidden;
            transform: rotateY(180deg);
            border-radius: 12px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        `;
        container.appendChild(frontFace);
        
        return container;
    }


    animateCardFromDeck(cardElement, isInitialDeal = false) {
        const deckPosition = document.querySelector('.deck-area')?.getBoundingClientRect();
        const cardPosition = cardElement.getBoundingClientRect();
        
        if (!deckPosition) return;
        
        // Calculate animation path
        const deltaX = deckPosition.left - cardPosition.left;
        const deltaY = deckPosition.top - cardPosition.top;
        
        // Apply initial position
        cardElement.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        cardElement.style.opacity = '0';
        
        // Animate to final position
        requestAnimationFrame(() => {
            cardElement.style.transition = `transform ${isInitialDeal ? 0.4 : 0.6}s ease-out, opacity 0.3s ease-in`;
            cardElement.style.transform = 'translate(0, 0)';
            cardElement.style.opacity = '1';
        });
    }

    animateCardRemoval(cardElement) {
        cardElement.classList.add('removing');
        cardElement.style.transform = 'scale(0) rotate(360deg)';
        cardElement.style.opacity = '0';
        setTimeout(() => cardElement.remove(), 500);
    }

    animateTextChange(element, newText) {
        element.style.transition = 'opacity 0.2s';
        element.style.opacity = '0';
        
        setTimeout(() => {
            element.textContent = newText;
            element.style.opacity = '1';
        }, 200);
    }

    animateWinnerHighlight(playerId) {
        const container = document.getElementById(playerId);
        if (!container) return;
        
        container.classList.add('winner-highlight');
        this.createVictoryGlow(container);
    }

    createVictoryGlow(container) {
        const glow = document.createElement('div');
        glow.className = 'victory-glow';
        container.appendChild(glow);
    }

    shakeElement(element, duration = 500) {
        element.classList.add('shake');
        setTimeout(() => element.classList.remove('shake'), duration);
    }

    createFrostEffect(card) {
        const frost = document.createElement('div');
        frost.className = 'frost-overlay';
        card.appendChild(frost);
    }

    findCardElement(container, card) {
        const cards = container.querySelectorAll('.card');
        return Array.from(cards).find(el => 
            el.classList.contains(card.type) && 
            el.textContent.includes(String(card.value))
        );
    }

    /**
     * Get the correct player container based on screen size (mobile vs desktop)
     * @param {string} playerId - Player ID ('player', 'opponent1', etc.)
     * @returns {HTMLElement} The visible player container
     */
    getPlayerContainer(playerId) {
        const isMobile = window.innerWidth <= 768;
        const containerPrefix = isMobile ? 'mobile-' : '';
        const containerId = `${containerPrefix}${playerId}`;
        
        const container = document.getElementById(containerId);
        if (!container) {
            const fallbackContainer = document.getElementById(playerId);
            if (fallbackContainer) {
                return fallbackContainer;
            }
        }
        
        return container;
    }

    getPlayerCardContainer(playerId) {
        if (playerId === 'player') {
            return document.getElementById('player-cards');
        }
        return document.getElementById(`${playerId}-cards`);
    }

    /**
     * Get deck area element for positioning
     */
    getDeckArea() {
        // Try multiple deck area selectors from HTML
        return document.querySelector('#draw-pile') || 
               document.querySelector('.draw-pile') ||
               document.querySelector('.draw-pile-area') || 
               document.querySelector('#mobile-draw-pile') ||
               document.querySelector('.mobile-draw-pile-area');
    }

    /**
     * Animate action card transfer from source to target player
     * @param {Card} card - The action card
     * @param {string} sourcePlayerId - Source player ID
     * @param {string} targetPlayerId - Target player ID  
     * @returns {Promise} Resolves when transfer animation completes
     */
    animateActionCardTransfer(card, sourcePlayerId, targetPlayerId) {
        return new Promise((resolve) => {
            const sourceContainer = this.getPlayerCardContainer(sourcePlayerId);
            const targetContainer = this.getPlayerContainer(targetPlayerId);
            
            if (!sourceContainer || !targetContainer) {
                console.warn('AnimationManager: Missing containers for card transfer');
                resolve();
                return;
            }
            
            // Find the action card in source container
            const actionCardEl = this.findCardElement(sourceContainer, card);
            if (!actionCardEl) {
                console.warn('AnimationManager: Action card not found in source container');
                resolve();
                return;
            }
            
            // Get positions
            const sourceRect = actionCardEl.getBoundingClientRect();
            const targetRect = targetContainer.getBoundingClientRect();
            
            // Create animated card copy
            const animatedCard = card.toElement();
            animatedCard.style.cssText = `
                position: fixed;
                left: ${sourceRect.left}px;
                top: ${sourceRect.top}px;
                width: ${sourceRect.width}px;
                height: ${sourceRect.height}px;
                z-index: 3000;
                transition: all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                pointer-events: none;
                box-shadow: 0 0 20px rgba(255, 215, 0, 0.8);
            `;
            
            // Hide original card
            actionCardEl.style.opacity = '0';
            
            document.body.appendChild(animatedCard);
            
            // Animate to target center
            setTimeout(() => {
                const targetCenterX = targetRect.left + targetRect.width / 2;
                const targetCenterY = targetRect.top + targetRect.height / 2;
                
                animatedCard.style.left = `${targetCenterX - sourceRect.width / 2}px`;
                animatedCard.style.top = `${targetCenterY - sourceRect.height / 2}px`;
                animatedCard.style.transform = 'scale(1.1)';
            }, 50);
            
            // Clean up and resolve
            setTimeout(() => {
                animatedCard.remove();
                actionCardEl.remove(); // Remove from source
                resolve();
            }, 700);
        });
    }


    getRandomColor() {
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#FDCB6E'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
}

// Make available globally
window.AnimationManager = AnimationManager;