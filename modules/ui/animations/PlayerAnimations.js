// PlayerAnimations.js - Player state animations (bust, stay, freeze)

import eventBus from '../../events/EventBus.js';
import { GameEvents } from '../../events/GameEvents.js';

export class PlayerAnimations {
    constructor() {
        this.animationDurations = {
            bust: 2500,
            stay: 2500,
            freeze: 1500,
            secondChance: 3000
        };
        
        this.setupEventListeners();
    }

    /**
     * Setup event listeners for player animations
     */
    setupEventListeners() {
        eventBus.on(GameEvents.PLAYER_FROZEN, (data) => this.handlePlayerFrozen(data));
        eventBus.on(GameEvents.ROUND_STARTED, () => this.clearAllFreezeEffects());
    }

    /**
     * Handle player frozen event and trigger animation
     */
    handlePlayerFrozen(data) {
        const player = window.gameState?.players?.find(p => p.id === data.playerId);
        if (player) {
            console.log(`❄️ PlayerAnimations: Animating freeze for ${player.name}`);
            this.addFreezeVisualEffects(player);
        }
    }

    /**
     * Animate player bust
     */
    animateBust(player) {
        const playerArea = document.getElementById(player.id);
        const mobilePlayerArea = document.getElementById(`mobile-${player.id}`);
        
        // Apply to both desktop and mobile
        const containers = [playerArea, mobilePlayerArea].filter(c => c !== null);
        
        containers.forEach(container => {
            // Add bust animation class
            container.classList.add('bust-animation');
            
            // Find all cards and add shaking animation
            const cards = container.querySelectorAll('.card');
            cards.forEach((card, index) => {
                setTimeout(() => {
                    card.classList.add('bust-shake');
                }, index * 50);
            });
        });

        // Emit event
        eventBus.emit(GameEvents.ANIMATION_STARTED, {
            type: 'bust',
            playerId: player.id,
            duration: this.animationDurations.bust
        });

        // Remove animation classes after duration
        setTimeout(() => {
            containers.forEach(container => {
                container.classList.remove('bust-animation');
                container.classList.add('busted');
                const cards = container.querySelectorAll('.card');
                cards.forEach(card => card.classList.remove('bust-shake'));
            });
            
            eventBus.emit(GameEvents.ANIMATION_COMPLETED, {
                type: 'bust',
                playerId: player.id
            });
        }, this.animationDurations.bust);
    }

    /**
     * Animate player stay
     */
    animateStay(player) {
        const playerArea = document.getElementById(player.id);
        const mobilePlayerArea = document.getElementById(`mobile-${player.id}`);
        
        const containers = [playerArea, mobilePlayerArea].filter(c => c !== null);
        
        containers.forEach(container => {
            // Add stay animation class
            container.classList.add('stay-animation');
            
            // Create stayed indicator
            const stayedIndicator = this.createStayedIndicator(player);
            
            // Position indicator
            stayedIndicator.style.cssText = `
                position: absolute;
                top: -20px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 1000;
            `;
            
            container.style.position = 'relative';
            container.appendChild(stayedIndicator);
            
            // Animate cards with glow effect
            const cards = container.querySelectorAll('.card');
            cards.forEach(card => card.classList.add('stay-glow'));
            
            // Points animation
            const pointsAnimation = this.createPointsAnimation(player.roundScore);
            container.appendChild(pointsAnimation);
            
            // Remove animation after delay but keep indicator
            setTimeout(() => {
                container.classList.remove('stay-animation');
                pointsAnimation.remove();
                cards.forEach(card => card.classList.remove('stay-glow'));
                container.classList.add('stayed');
            }, this.animationDurations.stay);
        });

        eventBus.emit(GameEvents.ANIMATION_STARTED, {
            type: 'stay',
            playerId: player.id,
            duration: this.animationDurations.stay
        });
    }

    /**
     * Create stayed indicator element
     */
    createStayedIndicator(player) {
        const indicator = document.createElement('div');
        indicator.className = 'stayed-indicator';
        indicator.innerHTML = `
            <span class="stayed-icon">✓</span>
            <span class="stayed-text">STAYED</span>
            <span class="stayed-points">${player.roundScore} Points Banked!</span>
        `;
        return indicator;
    }

    /**
     * Create points animation element
     */
    createPointsAnimation(points) {
        const pointsDiv = document.createElement('div');
        pointsDiv.className = 'points-animation';
        pointsDiv.textContent = `+${points}`;
        pointsDiv.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 2em;
            font-weight: bold;
            color: #4ade80;
            animation: pointsFloat 1.5s ease-out;
            pointer-events: none;
            text-shadow: 0 0 10px rgba(74, 222, 128, 0.8);
            z-index: 1001;
        `;
        return pointsDiv;
    }

    /**
     * Add freeze visual effects
     */
    addFreezeVisualEffects(player) {
        const playerArea = document.getElementById(player.id);
        const mobilePlayerArea = document.getElementById(`mobile-${player.id}`);
        
        const containers = [playerArea, mobilePlayerArea].filter(c => c !== null);
        
        containers.forEach(container => {
            // Clear any existing effects
            this.removeFreezeEffects(container);
            
            // Add frozen class
            container.classList.add('enhanced-frozen');
            container.style.position = 'relative';
            
            // Create freeze overlay
            const freezeOverlay = this.createFreezeOverlay();
            container.appendChild(freezeOverlay);
            
            // Add frozen indicator
            const indicator = this.createFrozenIndicator();
            container.appendChild(indicator);
            
            // Create ice particles
            this.createIceParticles(container);
        });

        eventBus.emit(GameEvents.ANIMATION_STARTED, {
            type: 'freeze',
            playerId: player.id,
            duration: this.animationDurations.freeze
        });
    }

    /**
     * Create freeze overlay element
     */
    createFreezeOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'freeze-overlay';
        
        const iceCrystals = document.createElement('div');
        iceCrystals.className = 'ice-crystals';
        overlay.appendChild(iceCrystals);
        
        const frozenText = document.createElement('div');
        frozenText.className = 'freeze-overlay-text';
        frozenText.innerHTML = '❄️ FROZEN ❄️';
        overlay.appendChild(frozenText);
        
        return overlay;
    }

    /**
     * Create frozen indicator
     */
    createFrozenIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'frozen-indicator';
        indicator.textContent = '❄️ FROZEN';
        return indicator;
    }

    /**
     * Create ice particle effects
     */
    createIceParticles(container) {
        const particlesContainer = document.createElement('div');
        particlesContainer.className = 'ice-particles';
        
        // Create multiple particles
        for (let i = 0; i < 12; i++) {
            const particle = document.createElement('div');
            particle.className = 'ice-particle';
            particle.textContent = '❄';
            particle.style.cssText = `
                position: absolute;
                left: ${Math.random() * 100}%;
                top: ${Math.random() * 100}%;
                font-size: ${0.8 + Math.random() * 0.6}em;
                animation: iceFloat ${3 + Math.random() * 2}s infinite ease-in-out;
                animation-delay: ${Math.random() * 2}s;
                opacity: 0.7;
            `;
            particlesContainer.appendChild(particle);
        }
        
        container.appendChild(particlesContainer);
    }

    /**
     * Remove freeze effects from container
     */
    removeFreezeEffects(container) {
        if (!container) return;
        
        container.classList.remove('enhanced-frozen', 'frozen');
        
        // Remove all freeze-related elements
        const elementsToRemove = [
            '.freeze-overlay',
            '.frozen-indicator',
            '.ice-particles',
            '.freeze-ice-shards'
        ];
        
        elementsToRemove.forEach(selector => {
            const element = container.querySelector(selector);
            if (element) element.remove();
        });
    }

    /**
     * Clear all freeze effects from all players (called on round start)
     */
    clearAllFreezeEffects() {
        console.log('🧹 PlayerAnimations: Clearing all freeze effects for new round');
        
        // Get all possible player container IDs
        const playerIds = ['player', 'opponent1', 'opponent2', 'opponent3'];
        
        playerIds.forEach(playerId => {
            // Clear desktop container
            const desktopContainer = document.getElementById(playerId);
            if (desktopContainer) {
                this.removeFreezeEffects(desktopContainer);
            }
            
            // Clear mobile container  
            const mobileId = playerId === 'player' ? 'mobile-player' : `mobile-${playerId}`;
            const mobileContainer = document.getElementById(mobileId);
            if (mobileContainer) {
                this.removeFreezeEffects(mobileContainer);
            }
        });
    }

    /**
     * Animate Second Chance activation
     */
    animateSecondChance(player, duplicateCard) {
        const container = document.getElementById(player.id);
        const cardContainer = container?.querySelector('.player-cards');
        
        if (!cardContainer) return;
        
        // Find second chance and duplicate cards
        const secondChanceCard = Array.from(cardContainer.querySelectorAll('.card'))
            .find(el => el.textContent.includes('Second Chance'));
        const duplicateCardElement = Array.from(cardContainer.querySelectorAll('.card'))
            .filter(el => el.textContent === duplicateCard.display)
            .pop();
            
        if (!secondChanceCard || !duplicateCardElement) return;
        
        // Animate Second Chance floating to duplicate
        secondChanceCard.classList.add('second-chance-floating');
        duplicateCardElement.classList.add('duplicate-targeted');
        
        eventBus.emit(GameEvents.ANIMATION_STARTED, {
            type: 'second-chance',
            playerId: player.id,
            duration: this.animationDurations.secondChance
        });
        
        // After animation, remove both cards
        setTimeout(() => {
            secondChanceCard.remove();
            duplicateCardElement.remove();
            
            eventBus.emit(GameEvents.ANIMATION_COMPLETED, {
                type: 'second-chance',
                playerId: player.id
            });
        }, this.animationDurations.secondChance);
    }
}

// Create singleton instance
const playerAnimations = new PlayerAnimations();
export default playerAnimations;