/**
 * ScoreAnimationManager - Handles score transfer animations at round end
 * Creates bouncing point animations from round score to total score with explosion effects
 */
class ScoreAnimationManager {
    constructor(eventBus, animationManager) {
        this.eventBus = eventBus;
        this.animationManager = animationManager;
        this.setupEventListeners();
    }

    /**
     * Setup event listeners for score animation events
     */
    setupEventListeners() {
        this.eventBus.on(GameEvents.ROUND_END, this.handleRoundEnd.bind(this));
    }

    /**
     * Handle round end and trigger score transfer animations
     */
    handleRoundEnd(data) {
        console.log('🎯 ScoreAnimationManager: Round end detected, checking for animations');
        
        const scores = data?.scores || [];
        
        // Trigger animations for players with round points > 0
        let hasAnimations = false;
        scores.forEach((entry, index) => {
            const playerId = entry?.player?.id;
            const roundPoints = entry?.roundScore || 0;
            const newTotal = entry?.totalScore || 0;
            
            if (!playerId) return;
            
            if (roundPoints > 0) {
                console.log(`🎯 ScoreAnimationManager: Scheduling animation for ${playerId}: +${roundPoints}`);
                setTimeout(() => {
                    this.animateScoreTransfer(playerId, roundPoints, newTotal);
                }, index * 150); // Stagger animations
            }
        });
    }

    /**
     * Animate score transfer from round points to total points with bouncing motion
     * @param {string} playerId - Player ID
     * @param {number} roundPoints - Points to transfer
     * @param {number} newTotal - New total score
     */
    animateScoreTransfer(playerId, roundPoints, newTotal) {
        console.log(`🎯 ScoreAnimationManager: STARTING BOUNCE ANIMATION for ${playerId}: +${roundPoints} → ${newTotal}`);
        
        const container = this.getPlayerContainer(playerId);
        if (!container) {
            console.error(`🎯 ScoreAnimationManager: No container found for ${playerId}`);
            return;
        }
        
        const roundValueEl = container.querySelector('.round-value');
        const totalValueEl = container.querySelector('.score-value');
        if (!roundValueEl || !totalValueEl) {
            console.error(`🎯 ScoreAnimationManager: Missing score elements for ${playerId}`, {
                roundValueEl: !!roundValueEl,
                totalValueEl: !!totalValueEl
            });
            return;
        }
        
        // Get actual number positions for clear left-to-right movement
        const roundRect = roundValueEl.getBoundingClientRect();
        const totalRect = totalValueEl.getBoundingClientRect();
        
        console.log(`🎯 ScoreAnimationManager: Round position:`, roundRect);
        console.log(`🎯 ScoreAnimationManager: Total position:`, totalRect);
        
        // Create highly visible animated score element
        const animatedScore = document.createElement('div');
        animatedScore.className = 'score-transfer-animation';
        animatedScore.textContent = `+${roundPoints}`;
        animatedScore.style.cssText = `
            position: fixed;
            left: ${roundRect.left + roundRect.width/2}px;
            top: ${roundRect.top + roundRect.height/2}px;
            z-index: 3000;
            font-size: 2.5em;
            font-weight: bold;
            color: #4ade80;
            text-shadow: 0 0 20px rgba(74, 222, 128, 1), 0 0 40px rgba(74, 222, 128, 0.8);
            pointer-events: none;
            transform: translate(-50%, -50%);
        `;
        
        // Calculate movement path
        const startX = roundRect.left + roundRect.width/2;
        const startY = roundRect.top + roundRect.height/2;
        const endX = totalRect.left + totalRect.width/2;
        const endY = totalRect.top + totalRect.height/2;
        const deltaX = endX - startX;
        const deltaY = endY - startY;
        
        console.log(`🎯 ScoreAnimationManager: Movement - Start(${startX}, ${startY}) → End(${endX}, ${endY}) = Delta(${deltaX}, ${deltaY})`);
        
        document.body.appendChild(animatedScore);
        
        // Manual JavaScript bouncing animation
        this.createBouncingAnimation(animatedScore, startX, startY, endX, endY, 1800);
        
        
        // Handle cleanup and final effects (moved to createBouncingAnimation)
    }

    /**
     * Create manual bouncing animation using requestAnimationFrame
     * @param {HTMLElement} element - Element to animate
     * @param {number} startX - Starting X position
     * @param {number} startY - Starting Y position  
     * @param {number} endX - Ending X position
     * @param {number} endY - Ending Y position
     * @param {number} duration - Animation duration in ms
     */
    createBouncingAnimation(element, startX, startY, endX, endY, duration) {
        const startTime = performance.now();
        const totalDistance = Math.abs(endX - startX);
        
        console.log(`🎯 ScoreAnimationManager: Starting manual animation over ${totalDistance}px in ${duration}ms`);
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Calculate horizontal position (linear progression)
            const currentX = startX + (endX - startX) * progress;
            
            // Calculate bouncing motion (sine wave with increasing amplitude)
            const bounceFrequency = 3; // 3 bounces over the duration
            const maxBounceHeight = 80; // Maximum bounce height
            const bounceAmplitude = maxBounceHeight * progress; // Bounces get bigger
            const bounceY = Math.sin(progress * Math.PI * bounceFrequency) * bounceAmplitude;
            const currentY = startY + (endY - startY) * progress - Math.abs(bounceY);
            
            // Calculate scale (grows during bounces)
            const scaleBase = 1 + progress * 0.5; // Base scale increases
            const bounceScale = 1 + Math.abs(Math.sin(progress * Math.PI * bounceFrequency)) * 0.5;
            const currentScale = scaleBase * bounceScale;
            
            // Apply transform
            element.style.transform = `translate(-50%, -50%) translate(${currentX - startX}px, ${currentY - startY}px) scale(${currentScale})`;
            
            // Rainbow color progression
            const colors = ['#4ade80', '#22d3ee', '#a78bfa', '#f472b6', '#fb7185', '#fbbf24'];
            const colorIndex = Math.floor(progress * (colors.length - 1));
            const nextColorIndex = Math.min(colorIndex + 1, colors.length - 1);
            const colorProgress = (progress * (colors.length - 1)) - colorIndex;
            
            // Simple color transition
            element.style.color = colors[colorIndex];
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Animation complete - trigger pulse effect
                this.createScoreExplosion(endX, endY);
                
                setTimeout(() => {
                    element.remove();
                    console.log(`🎯 ScoreAnimationManager: Cleaned up animated element`);
                }, 500);
            }
        };
        
        requestAnimationFrame(animate);
    }

    /**
     * Create clean fade pulse effect at score landing point
     * @param {number} x - X coordinate for pulse center
     * @param {number} y - Y coordinate for pulse center
     */
    createScoreExplosion(x, y) {
        // Create clean, animated pulse element
        const pulse = document.createElement('div');
        pulse.className = 'score-pulse-effect';
        pulse.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            width: 50px;
            height: 50px;
            background: radial-gradient(circle, rgba(74, 222, 128, 0.9) 0%, rgba(74, 222, 128, 0.3) 60%, transparent 100%);
            border-radius: 50%;
            transform: translate(-50%, -50%) scale(0.8);
            z-index: 3500;
            pointer-events: none;
            animation: scorePulse 0.6s ease-out forwards;
        `;
        
        document.body.appendChild(pulse);
        
        // Clean up pulse
        setTimeout(() => {
            pulse.remove();
        }, 600);
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
}

// Make available globally
window.ScoreAnimationManager = ScoreAnimationManager;