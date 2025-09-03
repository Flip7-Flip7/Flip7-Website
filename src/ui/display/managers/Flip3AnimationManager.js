/**
 * Flip3AnimationManager - Handles Flip 3 popup animation and card sequence
 * Manages the centered popup, card slots, and sequential card animations
 */
class Flip3AnimationManager {
    constructor(eventBus, animationManager) {
        this.eventBus = eventBus;
        this.animationManager = animationManager;
        this.currentCardIndex = 0;
        this.isActive = false;
        this.targetPlayer = null;
        this.dealtCards = [];
        this.isCancelled = false;
        
        // Queue for handling nested Flip3 animations
        this.animationQueue = [];
        this.processingQueue = false;
        
        this.setupEventListeners();
    }

    /**
     * Setup event listeners for Flip 3 events
     */
    setupEventListeners() {
        // Listen for Flip 3 card usage
        this.eventBus.on(GameEvents.FLIP3_CARD_USED, this.startFlip3Animation.bind(this));
        
        // Listen for player bust during Flip 3
        this.eventBus.on(GameEvents.PLAYER_BUST, this.handlePlayerBust.bind(this));
        
        // Listen for Flip 3 specific card dealt events
        this.eventBus.on(GameEvents.FLIP3_CARD_DEALT, this.handleCardDealt.bind(this));
    }

    /**
     * Start the Flip 3 animation sequence
     */
    startFlip3Animation(data) {
        const { sourcePlayer, targetPlayer } = data;
        
        if (this.isActive) {
            console.warn('Flip3AnimationManager: Animation already in progress, queueing this one');
            // Queue this animation for later
            this.animationQueue.push(data);
            return;
        }
        
        console.log(`Flip3AnimationManager: Starting Flip 3 animation - ${sourcePlayer.name} → ${targetPlayer.name}`);
        
        this.isActive = true;
        this.targetPlayer = targetPlayer;
        this.currentCardIndex = 0;
        this.dealtCards = [];
        this.isCancelled = false;
        
        // Create and show the popup
        this.createFlip3Popup();
        this.showPopup();
        
        // Debug all slot positions to verify left-to-right order
        console.log('🎯 SLOT LAYOUT DEBUG: Checking all slot positions...');
        for (let i = 1; i <= 3; i++) {
            const slotEl = document.getElementById(`flip3-slot-${i}`);
            if (slotEl) {
                const rect = slotEl.getBoundingClientRect();
                console.log(`🎯 Slot ${i}: X=${rect.left} (should be ${i === 1 ? 'leftmost' : i === 2 ? 'middle' : 'rightmost'})`);
            }
        }
        
        // Update target name
        const targetNameEl = document.getElementById('flip3-target-name');
        if (targetNameEl) {
            targetNameEl.textContent = targetPlayer.name;
        }
        
        // Cards will be dealt through FLIP3_CARD_DEALT events
    }

    /**
     * Create the Flip 3 popup structure
     */
    createFlip3Popup() {
        // Check if popup already exists
        let popup = document.getElementById('flip3-popup');
        if (popup) return;
        
        // Create popup container
        popup = document.createElement('div');
        popup.id = 'flip3-popup';
        popup.className = 'flip3-popup-container';
        popup.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 500px;
            max-width: 90vw;
            background: rgba(20, 20, 30, 0.95);
            border: 3px solid #60a5fa;
            border-radius: 20px;
            padding: 30px;
            z-index: 2000;
            display: none;
            box-shadow: 0 0 50px rgba(96, 165, 250, 0.5);
        `;
        
        popup.innerHTML = `
            <div class="flip3-popup-header" style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #60a5fa; font-size: 2em; margin: 0;">🔄 FLIP 3 🔄</h2>
                <p style="color: white; margin: 10px 0;">Target: <span id="flip3-target-name" style="color: #fbbf24; font-weight: bold;"></span></p>
            </div>
            
            <div class="flip3-slots" style="display: flex; justify-content: space-around; margin: 30px 0; height: 160px;">
                <div class="flip3-slot" id="flip3-slot-1" style="width: 120px; height: 160px; border: 2px dashed #60a5fa; border-radius: 12px; display: flex; align-items: center; justify-content: center; position: relative;">
                    <span style="color: #60a5fa; font-size: 3em; opacity: 0.3;">1</span>
                </div>
                <div class="flip3-slot" id="flip3-slot-2" style="width: 120px; height: 160px; border: 2px dashed #60a5fa; border-radius: 12px; display: flex; align-items: center; justify-content: center; position: relative;">
                    <span style="color: #60a5fa; font-size: 3em; opacity: 0.3;">2</span>
                </div>
                <div class="flip3-slot" id="flip3-slot-3" style="width: 120px; height: 160px; border: 2px dashed #60a5fa; border-radius: 12px; display: flex; align-items: center; justify-content: center; position: relative;">
                    <span style="color: #60a5fa; font-size: 3em; opacity: 0.3;">3</span>
                </div>
            </div>
            
            <div class="flip3-progress" style="text-align: center;">
                <div class="flip3-dots" style="display: flex; justify-content: center; gap: 15px; margin-bottom: 10px;">
                    <span class="flip3-dot" data-index="1" style="width: 15px; height: 15px; border-radius: 50%; background: #60a5fa; opacity: 0.3; transition: all 0.3s;"></span>
                    <span class="flip3-dot" data-index="2" style="width: 15px; height: 15px; border-radius: 50%; background: #60a5fa; opacity: 0.3; transition: all 0.3s;"></span>
                    <span class="flip3-dot" data-index="3" style="width: 15px; height: 15px; border-radius: 50%; background: #60a5fa; opacity: 0.3; transition: all 0.3s;"></span>
                </div>
                <p id="flip3-status" style="color: white; margin: 0;">Drawing card 1 of 3...</p>
            </div>
        `;
        
        // Create backdrop
        const backdrop = document.createElement('div');
        backdrop.id = 'flip3-backdrop';
        backdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            z-index: 1999;
            display: none;
        `;
        
        document.body.appendChild(backdrop);
        document.body.appendChild(popup);
    }

    /**
     * Show the popup with animation
     */
    showPopup() {
        const popup = document.getElementById('flip3-popup');
        const backdrop = document.getElementById('flip3-backdrop');
        
        if (popup && backdrop) {
            // Ensure proper initial state
            popup.style.opacity = '0';
            popup.style.transform = 'translate(-50%, -50%) scale(0.9)';
            popup.style.transition = 'all 0.3s ease-out';
            
            backdrop.style.display = 'block';
            popup.style.display = 'block';
            
            // Force reflow before animation
            popup.offsetHeight;
            
            // Animate in
            requestAnimationFrame(() => {
                popup.style.transform = 'translate(-50%, -50%) scale(1)';
                popup.style.opacity = '1';
            });
        }
    }

    /**
     * Hide the popup with animation
     */
    hidePopup() {
        const popup = document.getElementById('flip3-popup');
        const backdrop = document.getElementById('flip3-backdrop');
        
        if (popup) {
            popup.style.transition = 'all 0.3s ease-in';
            popup.style.transform = 'translate(-50%, -50%) scale(0.9)';
            popup.style.opacity = '0';
            
            setTimeout(() => {
                if (popup) popup.style.display = 'none';
                if (backdrop) backdrop.style.display = 'none';
                
                // Clear slots
                for (let i = 1; i <= 3; i++) {
                    const slot = document.getElementById(`flip3-slot-${i}`);
                    if (slot) {
                        slot.innerHTML = `<span style="color: #60a5fa; font-size: 3em; opacity: 0.3;">${i}</span>`;
                        slot.style.borderColor = '#60a5fa'; // Reset border color
                        slot.style.boxShadow = ''; // Reset shadow
                    }
                }
                
                // Reset progress dots
                for (let i = 1; i <= 3; i++) {
                    const dot = document.querySelector(`.flip3-dot[data-index="${i}"]`);
                    if (dot) {
                        dot.style.opacity = '0.3';
                        dot.style.background = '#60a5fa';
                        dot.style.transform = 'scale(1)';
                    }
                }
                
                // Reset status
                const statusEl = document.getElementById('flip3-status');
                if (statusEl) {
                    statusEl.textContent = 'Drawing card 1 of 3...';
                    statusEl.style.color = 'white';
                }
                
                // Reset state only if no animations are queued
                if (this.animationQueue.length === 0) {
                    this.targetPlayer = null;
                    this.currentCardIndex = 0;
                    this.dealtCards = [];
                    this.isCancelled = false;
                }
            }, 300);
        }
    }

    /**
     * Handle card dealt event during Flip 3
     */
    handleCardDealt(data) {
        if (!this.isActive || this.isCancelled) return;
        
        const { card, playerId, cardIndex } = data;
        
        // Check if we have a valid target player
        if (!this.targetPlayer || !this.targetPlayer.id) {
            console.warn('Flip3AnimationManager: No valid target player for card dealt event');
            return;
        }
        
        // Check if this card is for our target player
        if (playerId !== this.targetPlayer.id) return;
        
        // Use the cardIndex from the event
        const slotNumber = cardIndex || (this.currentCardIndex + 1);
        
        console.log(`Flip3AnimationManager: Card targeting debug - cardIndex: ${cardIndex}, currentCardIndex: ${this.currentCardIndex}, calculated slotNumber: ${slotNumber}`);
        
        // Check if this is part of the Flip 3 sequence
        if (slotNumber > 3) return;
        
        console.log(`Flip3AnimationManager: Card ${slotNumber} dealt - ${card.type}:${card.value}`);
        
        this.dealtCards.push(card);
        this.currentCardIndex = slotNumber - 1; // Update index based on slot number
        
        // Update progress immediately
        this.updateProgress(slotNumber);
        
        // Animate card to slot
        this.animateCardToSlot(card, slotNumber);
        
        // Check completion after a delay
        setTimeout(() => {
            this.currentCardIndex = slotNumber; // Move to next position
            
            if (this.currentCardIndex >= 3 && !this.isCancelled) {
                // All cards dealt successfully
                this.handleSequenceComplete();
            }
        }, 1000);
    }

    /**
     * Animate card flip directly to specific slot (sequential)
     */
    animateCardToSlot(card, slotNumber) {
        const slot = document.getElementById(`flip3-slot-${slotNumber}`);
        if (!slot) return;
        
        // Clear slot placeholder
        slot.innerHTML = '';
        
        console.log(`Flip3AnimationManager: Animating card ${slotNumber} (${card.type}:${card.value}) to slot #${slotNumber}`);
        
        // Get slot position and center screen for flip animation  
        const slotRect = slot.getBoundingClientRect();
        console.log(`Flip3AnimationManager: Slot ${slotNumber} position:`, slotRect);
        console.log(`🎯 SLOT DEBUG: Card ${slotNumber} targeting slot at X=${slotRect.left} (expected: 1=leftmost, 2=middle, 3=rightmost)`);
        const screenCenterX = window.innerWidth / 2;
        const screenCenterY = window.innerHeight / 2;
        
        // Create animated card element at screen center
        const animatedCard = document.createElement('div');
        animatedCard.className = 'flip3-animated-card';
        animatedCard.style.cssText = `
            position: fixed;
            left: ${screenCenterX - 60}px;
            top: ${screenCenterY - 80}px;
            width: 120px;
            height: 160px;
            z-index: 2500;
            transform-style: preserve-3d;
            transform: rotateY(0deg);
            transform-origin: center;
            pointer-events: none;
        `;
        
        // Create card back (starts visible)
        const cardBack = document.createElement('div');
        cardBack.style.cssText = `
            position: absolute;
            width: 100%;
            height: 100%;
            backface-visibility: hidden;
            transform: rotateY(0deg);
            background-image: url('images/Flip7CardBack.png');
            background-size: cover;
            border-radius: 12px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        `;
        
        // Create card front (starts hidden)
        const cardFront = card.toElement();
        const frontStyles = `
            position: absolute;
            width: 100%;
            height: 100%;
            backface-visibility: hidden;
            transform: rotateY(180deg);
            border-radius: 12px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        `;
        
        // Preserve existing styling and add flip-specific styles
        cardFront.style.cssText = (cardFront.style.cssText || '') + frontStyles;
        
        animatedCard.appendChild(cardBack);
        animatedCard.appendChild(cardFront);
        document.body.appendChild(animatedCard);
        
        // Phase 1: Flip animation (500ms)
        setTimeout(() => {
            animatedCard.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
            animatedCard.style.transform = 'rotateY(180deg)';
        }, 100);
        
        // Phase 2: Slide to slot (600ms)
        setTimeout(() => {
            animatedCard.style.transition = 'all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            const targetX = slotRect.left + slotRect.width/2 - 60; // Center of slot minus half card width
            const targetY = slotRect.top + slotRect.height/2 - 80; // Center of slot minus half card height
            console.log(`🎯 ANIMATION DEBUG: Card ${slotNumber} moving to slot center at (${targetX + 60}, ${targetY + 80})`);
            
            // Move to absolute position and scale down
            animatedCard.style.left = `${targetX}px`;
            animatedCard.style.top = `${targetY}px`;
            animatedCard.style.transform = 'rotateY(180deg) scale(0.9)';
        }, 500);
        
        // Phase 3: Settle into slot (1200ms total)
        setTimeout(() => {
            // Create final card element in slot
            const finalCard = card.toElement();
            const slotStyles = `
                width: 100%;
                height: 100%;
                border-radius: 12px;
                transform: scale(0.95);
                transition: transform 0.2s ease-out;
            `;
            
            // Preserve existing card styling and add slot-specific styles
            finalCard.style.cssText = (finalCard.style.cssText || '') + slotStyles;
            
            slot.appendChild(finalCard);
            
            // Quick scale-up effect
            setTimeout(() => {
                finalCard.style.transform = 'scale(1)';
            }, 50);
            
            // Clean up animated card
            animatedCard.remove();
            
            console.log(`Flip3AnimationManager: Card ${slotNumber} animation complete`);
        }, 1200);
    }

    /**
     * Handle player bust during Flip 3
     */
    handlePlayerBust(data) {
        if (!this.isActive || this.isCancelled) return;
        
        const { player, card } = data;
        
        // Check if bust is for our target player
        if (player.id !== this.targetPlayer.id) return;
        
        console.log(`Flip3AnimationManager: Player busted during Flip 3 on card ${card.value}`);
        
        this.isCancelled = true;
        this.isActive = false;
        
        // Update status
        const statusEl = document.getElementById('flip3-status');
        if (statusEl) {
            statusEl.textContent = `BUSTED on duplicate ${card.value}!`;
            statusEl.style.color = '#ef4444';
        }
        
        // Highlight the bust card
        const slotNumber = this.currentCardIndex + 1;
        const slot = document.getElementById(`flip3-slot-${slotNumber}`);
        if (slot) {
            slot.style.borderColor = '#ef4444';
            slot.style.boxShadow = '0 0 20px rgba(239, 68, 68, 0.5)';
        }
        
        // Hide popup after delay and emit completion event
        setTimeout(() => {
            // Store the current target player before clearing
            const bustedTargetPlayer = this.targetPlayer;
            
            // Set inactive BEFORE emitting completion event
            this.isActive = false;
            
            this.hidePopup();
            
            // Emit completion event so GameEngine can continue
            this.eventBus.emit(GameEvents.FLIP3_ANIMATION_COMPLETE, {
                targetPlayer: bustedTargetPlayer,
                completed: false,
                reason: 'bust'
            });
            
            // Process any queued animations
            this.processAnimationQueue();
        }, 2000);
    }

    /**
     * Update progress indicators
     */
    updateProgress(cardNumber) {
        // Update dots
        for (let i = 1; i <= 3; i++) {
            const dot = document.querySelector(`.flip3-dot[data-index="${i}"]`);
            if (dot) {
                if (i < cardNumber) {
                    dot.style.opacity = '1';
                    dot.style.background = '#10b981';
                } else if (i === cardNumber) {
                    dot.style.opacity = '1';
                    dot.style.background = '#fbbf24';
                    dot.style.transform = 'scale(1.3)';
                } else {
                    dot.style.opacity = '0.3';
                    dot.style.background = '#60a5fa';
                    dot.style.transform = 'scale(1)';
                }
            }
        }
        
        // Update status text
        const statusEl = document.getElementById('flip3-status');
        if (statusEl && cardNumber <= 3) {
            statusEl.textContent = `Drawing card ${cardNumber} of 3...`;
            statusEl.style.color = 'white';
        }
    }

    /**
     * Handle successful completion of Flip 3 sequence
     */
    handleSequenceComplete() {
        console.log('Flip3AnimationManager: Sequence completed successfully!');
        
        // Update status
        const statusEl = document.getElementById('flip3-status');
        if (statusEl) {
            statusEl.textContent = 'Flip 3 Complete!';
            statusEl.style.color = '#10b981';
        }
        
        // Update all dots to green
        for (let i = 1; i <= 3; i++) {
            const dot = document.querySelector(`.flip3-dot[data-index="${i}"]`);
            if (dot) {
                dot.style.opacity = '1';
                dot.style.background = '#10b981';
                dot.style.transform = 'scale(1)';
            }
        }
        
        // Auto-hide after delay and emit completion event
        setTimeout(() => {
            // Store the current target player before clearing
            const completedTargetPlayer = this.targetPlayer;
            
            // Set inactive and clear state
            this.isActive = false;
            
            this.hidePopup();
            
            // Emit completion event so GameEngine can continue
            this.eventBus.emit(GameEvents.FLIP3_ANIMATION_COMPLETE, {
                targetPlayer: completedTargetPlayer,
                completed: true,
                reason: 'success'
            });
            
            // Process any queued animations
            this.processAnimationQueue();
        }, 1500);
    }
    
    /**
     * Process any queued Flip3 animations
     */
    processAnimationQueue() {
        if (this.animationQueue.length > 0 && !this.isActive) {
            console.log(`Flip3AnimationManager: Processing queued animation (${this.animationQueue.length} in queue)`);
            const nextAnimation = this.animationQueue.shift();
            
            // Small delay to ensure clean transition
            setTimeout(() => {
                this.startFlip3Animation(nextAnimation);
            }, 500);
        } else if (this.animationQueue.length === 0 && !this.isActive) {
            // No more animations - now safe to reset state
            console.log(`Flip3AnimationManager: Queue empty, resetting state`);
            this.targetPlayer = null;
            this.currentCardIndex = 0;
            this.dealtCards = [];
            this.isCancelled = false;
        }
    }
}

// Make available globally
window.Flip3AnimationManager = Flip3AnimationManager;