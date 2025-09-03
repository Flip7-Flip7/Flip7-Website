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
     * Perform the enhanced card merge animation with collision and particle effects
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
        
        // Calculate merge point (center of player area for better visual impact)
        const containerRect = container.getBoundingClientRect();
        const mergeX = containerRect.left + containerRect.width / 2;
        const mergeY = containerRect.top + containerRect.height / 2;
        
        // Create enhanced shield effect backdrop
        this.createEnhancedShieldBackdrop(container);
        
        // Phase 1: Highlight and prepare cards (400ms)
        this.highlightCardsForCollision([secondChanceEl, duplicateEl]);
        
        // Phase 2: Card collision sequence (800ms)
        setTimeout(() => {
            this.animateCardCollision(secondChanceEl, duplicateEl, mergeX, mergeY);
        }, 400);
        
        // Phase 3: Collision impact and particle burst (600ms)
        setTimeout(() => {
            this.createCollisionImpact(mergeX, mergeY);
            this.createParticleDisintegration(mergeX, mergeY, [secondChanceEl, duplicateEl]);
        }, 1200);
        
        // Phase 4: Shield pulse and notification (500ms)
        setTimeout(() => {
            this.createShieldPulse(container);
            this.showEnhancedSavedNotification(container);
        }, 1800);
        
        // Phase 5: Complete animation (2800ms total)
        setTimeout(() => {
            this.completeAnimation();
        }, 2800);
    }

    /**
     * Create enhanced shield backdrop effect
     */
    createEnhancedShieldBackdrop(container) {
        const backdrop = document.createElement('div');
        backdrop.className = 'second-chance-enhanced-backdrop';
        backdrop.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: radial-gradient(circle, rgba(255, 215, 0, 0.15) 0%, rgba(96, 165, 250, 0.1) 50%, transparent 100%);
            pointer-events: none;
            z-index: 50;
            border-radius: 12px;
            animation: shield-emerge 0.4s ease-out;
        `;
        
        // Add enhanced shield keyframes
        const style = document.createElement('style');
        style.textContent = `
            @keyframes shield-emerge {
                0% { 
                    opacity: 0; 
                    transform: scale(0.9);
                    background: radial-gradient(circle, transparent 0%, transparent 100%);
                }
                100% { 
                    opacity: 1; 
                    transform: scale(1);
                    background: radial-gradient(circle, rgba(255, 215, 0, 0.15) 0%, rgba(96, 165, 250, 0.1) 50%, transparent 100%);
                }
            }
        `;
        document.head.appendChild(style);
        
        container.appendChild(backdrop);
        
        // Remove after animation completes
        setTimeout(() => {
            backdrop.remove();
            style.remove();
        }, 3000);
    }

    /**
     * Highlight cards with enhanced golden glow for collision
     */
    highlightCardsForCollision(cardElements) {
        cardElements.forEach((cardEl, index) => {
            // Add collision-ready styling
            cardEl.style.transition = 'all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
            cardEl.style.boxShadow = `
                0 0 25px rgba(255, 215, 0, 1), 
                0 0 50px rgba(255, 215, 0, 0.6),
                0 0 75px rgba(96, 165, 250, 0.3)
            `;
            cardEl.style.transform = `scale(1.1) rotateZ(${index === 0 ? -3 : 3}deg)`;
            cardEl.style.zIndex = '200';
            cardEl.style.filter = 'brightness(1.2) contrast(1.1)';
            
            // Add subtle vibration effect
            cardEl.style.animation = `card-vibrate 0.1s ease-in-out infinite alternate`;
        });
        
        // Add vibration keyframes
        this.addTemporaryCSS(`
            @keyframes card-vibrate {
                0% { transform: scale(1.1) rotateZ(${cardElements[0] === cardElements[0] ? -3 : 3}deg) translateX(0px); }
                100% { transform: scale(1.1) rotateZ(${cardElements[0] === cardElements[0] ? -3 : 3}deg) translateX(1px); }
            }
        `, 1000);
    }

    /**
     * Animate cards colliding toward each other with spin and acceleration
     */
    animateCardCollision(secondChanceEl, duplicateEl, mergeX, mergeY) {
        const cards = [
            { el: secondChanceEl, name: 'second-chance', direction: 1 },
            { el: duplicateEl, name: 'duplicate', direction: -1 }
        ];
        
        cards.forEach(({ el, name, direction }) => {
            // Clear any existing animations
            el.style.animation = 'none';
            
            const rect = el.getBoundingClientRect();
            const deltaX = mergeX - (rect.left + rect.width / 2);
            const deltaY = mergeY - (rect.top + rect.height / 2);
            
            // Enhanced collision animation with spin and scale
            el.style.transition = 'all 0.8s cubic-bezier(0.68, -0.6, 0.32, 1.6)';
            el.style.transform = `
                translate(${deltaX}px, ${deltaY}px) 
                scale(0.7) 
                rotateZ(${direction * 720}deg)
                rotateY(180deg)
            `;
            el.style.filter = 'brightness(1.5) contrast(1.3)';
            
            // Add motion blur effect during collision
            el.style.filter += ' blur(1px)';
        });
    }

    /**
     * Create collision impact effect at merge point
     */
    createCollisionImpact(x, y) {
        const impactEffect = document.createElement('div');
        impactEffect.className = 'second-chance-collision-impact';
        impactEffect.style.cssText = `
            position: fixed;
            left: ${x - 40}px;
            top: ${y - 40}px;
            width: 80px;
            height: 80px;
            z-index: 3000;
            pointer-events: none;
        `;
        
        // Create impact flash
        const flash = document.createElement('div');
        flash.style.cssText = `
            position: absolute;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle, rgba(255, 255, 255, 0.9) 0%, rgba(255, 215, 0, 0.8) 30%, transparent 70%);
            border-radius: 50%;
            animation: impact-flash 0.3s ease-out;
        `;
        
        // Create shockwave rings
        for (let i = 0; i < 3; i++) {
            const ring = document.createElement('div');
            ring.style.cssText = `
                position: absolute;
                width: 100%;
                height: 100%;
                border: 2px solid rgba(255, 215, 0, ${0.8 - i * 0.2});
                border-radius: 50%;
                animation: shockwave-ring 0.6s ease-out forwards;
                animation-delay: ${i * 0.1}s;
                transform: scale(0);
            `;
            impactEffect.appendChild(ring);
        }
        
        impactEffect.appendChild(flash);
        
        // Add impact keyframes
        this.addTemporaryCSS(`
            @keyframes impact-flash {
                0% { transform: scale(0); opacity: 1; }
                50% { transform: scale(1.2); opacity: 0.9; }
                100% { transform: scale(2); opacity: 0; }
            }
            @keyframes shockwave-ring {
                0% { transform: scale(0); opacity: 0.8; }
                100% { transform: scale(4); opacity: 0; }
            }
        `, 1000);
        
        document.body.appendChild(impactEffect);
        
        // Clean up effect
        setTimeout(() => {
            impactEffect.remove();
        }, 1000);
    }

    /**
     * Create particle disintegration effect
     */
    createParticleDisintegration(x, y, cardElements) {
        // Hide original cards immediately for particle effect
        cardElements.forEach(cardEl => {
            cardEl.style.opacity = '0';
            cardEl.style.transform = cardEl.style.transform + ' scale(0)';
        });
        
        // Create particle container
        const particleContainer = document.createElement('div');
        particleContainer.style.cssText = `
            position: fixed;
            left: ${x - 50}px;
            top: ${y - 50}px;
            width: 100px;
            height: 100px;
            z-index: 2500;
            pointer-events: none;
        `;
        
        // Create 12 particles in different directions
        for (let i = 0; i < 12; i++) {
            const particle = document.createElement('div');
            const angle = (i / 12) * Math.PI * 2;
            const distance = 150 + Math.random() * 100;
            const size = 8 + Math.random() * 6;
            
            particle.style.cssText = `
                position: absolute;
                left: 50%;
                top: 50%;
                width: ${size}px;
                height: ${size}px;
                background: ${i % 3 === 0 ? 'rgba(255, 215, 0, 0.9)' : i % 3 === 1 ? 'rgba(255, 255, 255, 0.8)' : 'rgba(96, 165, 250, 0.7)'};
                border-radius: 50%;
                transform: translate(-50%, -50%);
                animation: particle-dispersal 0.8s ease-out forwards;
                animation-delay: ${Math.random() * 0.2}s;
            `;
            
            // Set custom CSS variables for particle direction
            particle.style.setProperty('--end-x', `${Math.cos(angle) * distance}px`);
            particle.style.setProperty('--end-y', `${Math.sin(angle) * distance}px`);
            particle.style.setProperty('--rotation', `${Math.random() * 720}deg`);
            
            particleContainer.appendChild(particle);
        }
        
        // Add particle dispersal keyframes
        this.addTemporaryCSS(`
            @keyframes particle-dispersal {
                0% { 
                    transform: translate(-50%, -50%) scale(1) rotate(0deg);
                    opacity: 1;
                }
                70% {
                    opacity: 0.8;
                }
                100% { 
                    transform: translate(calc(-50% + var(--end-x)), calc(-50% + var(--end-y))) scale(0) rotate(var(--rotation));
                    opacity: 0;
                }
            }
        `, 1200);
        
        document.body.appendChild(particleContainer);
        
        // Remove cards and particles after animation
        setTimeout(() => {
            cardElements.forEach(cardEl => cardEl.remove());
            particleContainer.remove();
        }, 1000);
    }

    /**
     * Create shield pulse effect over player area
     */
    createShieldPulse(container) {
        const shieldPulse = document.createElement('div');
        shieldPulse.className = 'second-chance-shield-pulse';
        shieldPulse.style.cssText = `
            position: absolute;
            top: -10px;
            left: -10px;
            right: -10px;
            bottom: -10px;
            background: radial-gradient(circle, transparent 40%, rgba(255, 215, 0, 0.3) 50%, rgba(255, 215, 0, 0.1) 70%, transparent 100%);
            border: 3px solid rgba(255, 215, 0, 0.6);
            border-radius: 15px;
            z-index: 100;
            animation: shield-pulse 0.5s ease-out;
        `;
        
        this.addTemporaryCSS(`
            @keyframes shield-pulse {
                0% { 
                    transform: scale(0.8); 
                    opacity: 0;
                    border-color: rgba(255, 215, 0, 0);
                }
                50% { 
                    transform: scale(1.05); 
                    opacity: 1;
                    border-color: rgba(255, 215, 0, 0.8);
                }
                100% { 
                    transform: scale(1); 
                    opacity: 0.3;
                    border-color: rgba(255, 215, 0, 0.2);
                }
            }
        `, 800);
        
        container.appendChild(shieldPulse);
        
        // Fade out shield pulse
        setTimeout(() => {
            shieldPulse.style.transition = 'all 0.3s ease-out';
            shieldPulse.style.opacity = '0';
            setTimeout(() => shieldPulse.remove(), 300);
        }, 500);
    }

    /**
     * Show enhanced saved notification
     */
    showEnhancedSavedNotification(container) {
        const notification = document.createElement('div');
        notification.className = 'second-chance-enhanced-notification';
        notification.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(145deg, rgba(255, 215, 0, 0.95) 0%, rgba(255, 193, 7, 0.9) 100%);
            color: #1a1a1a;
            padding: 12px 20px;
            border-radius: 8px;
            font-weight: bold;
            font-size: 1.1em;
            text-align: center;
            z-index: 300;
            border: 2px solid rgba(255, 255, 255, 0.3);
            box-shadow: 0 4px 20px rgba(255, 215, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2);
            animation: enhanced-notification-entry 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        `;
        notification.innerHTML = '🛡️ SAVED!<br><small style="color: #4a4a4a;">Duplicate Blocked</small>';
        
        // Add enhanced notification keyframes
        this.addTemporaryCSS(`
            @keyframes enhanced-notification-entry {
                0% { 
                    transform: translate(-50%, -50%) scale(0.3) rotateZ(-10deg); 
                    opacity: 0;
                }
                60% { 
                    transform: translate(-50%, -50%) scale(1.15) rotateZ(2deg); 
                    opacity: 1;
                }
                100% { 
                    transform: translate(-50%, -50%) scale(1) rotateZ(0deg); 
                    opacity: 1;
                }
            }
        `, 2000);
        
        container.appendChild(notification);
        
        // Remove notification after display
        setTimeout(() => {
            notification.style.transition = 'all 0.4s ease-in-out';
            notification.style.opacity = '0';
            notification.style.transform = 'translate(-50%, -50%) scale(0.8) rotateZ(5deg)';
            
            setTimeout(() => {
                notification.remove();
            }, 400);
        }, 1200);
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
            this.showEnhancedSavedNotification(container);
            this.completeAnimation();
        }, 1000);
    }

    /**
     * Add temporary CSS with automatic cleanup
     */
    addTemporaryCSS(cssText, duration) {
        const style = document.createElement('style');
        style.textContent = cssText;
        document.head.appendChild(style);
        
        setTimeout(() => {
            style.remove();
        }, duration);
        
        return style;
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
        console.log('SecondChanceAnimationManager: Enhanced animation complete');
        
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