// Flip3AnimationManager.js - Handles animated Flip3 card sequences with duplicate detection

import eventBus from '../../events/EventBus.js';
import { GameEvents } from '../../events/GameEvents.js';
import deckManager from '../../game/deck/DeckManager.js';

export class Flip3AnimationManager {
    constructor() {
        this.isAnimating = false;
        this.currentAnimation = null;
        this.animationQueue = []; // For handling nested Flip3 cards
        this.setupEventListeners();
    }

    /**
     * Setup event listeners for Flip3 animations
     */
    setupEventListeners() {
        eventBus.on(GameEvents.ACTION_FLIP3, (data) => this.startFlip3Animation(data));
    }

    /**
     * Start Flip3 animation sequence
     */
    async startFlip3Animation(data) {
        const { targetPlayerId, sourcePlayerId } = data;
        
        // Get player objects
        const targetPlayer = window.gameState?.players?.find(p => p.id === targetPlayerId);
        const sourcePlayer = window.gameState?.players?.find(p => p.id === sourcePlayerId);
        
        if (!targetPlayer || !sourcePlayer) {
            console.error('❌ Flip3AnimationManager: Invalid players for Flip3');
            return;
        }

        console.log(`🎬 Flip3AnimationManager: Starting Flip3 animation - ${sourcePlayer.name} → ${targetPlayer.name}`);

        // If already animating, queue this animation
        if (this.isAnimating) {
            console.log('🔄 Flip3AnimationManager: Animation in progress, queueing Flip3');
            this.animationQueue.push({ targetPlayer, sourcePlayer });
            return;
        }

        this.isAnimating = true;
        this.currentAnimation = {
            targetPlayer,
            sourcePlayer,
            drawnCards: [],
            deferredActionCards: []
        };

        // Show the popup
        this.showFlip3Popup(targetPlayer.name);

        // Emit animation started event
        eventBus.emit(GameEvents.FLIP3_ANIMATION_STARTED, {
            targetPlayerId: targetPlayer.id,
            sourcePlayerId: sourcePlayer.id
        });

        // Start the card-by-card animation
        await this.animateFlip3Sequence(targetPlayer);
    }

    /**
     * Show the Flip3 popup interface
     */
    showFlip3Popup(targetPlayerName) {
        const backdrop = document.getElementById('flip3-backdrop');
        const popup = document.getElementById('flip3-progress-indicator');
        const targetNameEl = document.getElementById('flip3-target-name');

        if (backdrop && popup && targetNameEl) {
            // Set target name
            targetNameEl.textContent = targetPlayerName;

            // Reset all card slots to back state
            for (let i = 1; i <= 3; i++) {
                const slot = document.getElementById(`flip3-card-${i}`);
                if (slot) {
                    slot.innerHTML = '<div class="card back"></div>';
                }
            }

            // Reset dots
            document.querySelectorAll('.flip3-dot').forEach(dot => {
                dot.classList.remove('active', 'completed');
            });

            // Reset counter
            const currentEl = document.getElementById('flip3-current');
            if (currentEl) currentEl.textContent = '1';

            // Clear status
            const statusEl = document.getElementById('flip3-status');
            if (statusEl) statusEl.textContent = '';

            // Show popup
            backdrop.style.display = 'block';
            popup.style.display = 'block';

            console.log('🎪 Flip3AnimationManager: Popup displayed');
        } else {
            console.error('❌ Flip3AnimationManager: Popup elements not found');
        }
    }

    /**
     * Hide the Flip3 popup
     */
    hideFlip3Popup() {
        const backdrop = document.getElementById('flip3-backdrop');
        const popup = document.getElementById('flip3-progress-indicator');

        if (backdrop && popup) {
            backdrop.style.display = 'none';
            popup.style.display = 'none';
            console.log('🎪 Flip3AnimationManager: Popup hidden');
        }
    }

    /**
     * Animate the 3-card sequence
     */
    async animateFlip3Sequence(targetPlayer) {
        for (let cardIndex = 1; cardIndex <= 3; cardIndex++) {
            console.log(`🎴 Flip3AnimationManager: Drawing card ${cardIndex}/3`);

            // Update UI progress
            this.updateProgress(cardIndex);

            // Draw the card
            const card = deckManager.drawCard();
            if (!card) {
                console.error('❌ Flip3AnimationManager: No cards left to draw');
                await this.handleFlip3Failure(targetPlayer, 'No cards remaining');
                return;
            }

            // Check for duplicate BEFORE adding to hand
            const isDuplicate = this.checkForDuplicate(card, targetPlayer, this.currentAnimation.drawnCards);

            // Animate card reveal
            await this.animateCardReveal(cardIndex, card, isDuplicate);

            if (isDuplicate) {
                // Player busts - end animation immediately
                console.log(`💥 Flip3AnimationManager: Duplicate ${card.display} found - player busts!`);
                await this.handleFlip3Bust(targetPlayer, card);
                return;
            } else {
                // Card is unique - add to drawn cards
                this.currentAnimation.drawnCards.push(card);
                
                // If it's an action card, defer it
                if (card.type === 'action') {
                    console.log(`⏸️ Flip3AnimationManager: Deferring action card ${card.display}`);
                    this.currentAnimation.deferredActionCards.push(card);
                } else {
                    // Add non-action cards immediately to player's hand
                    targetPlayer.addCard(card);
                }

                console.log(`✅ Flip3AnimationManager: Card ${cardIndex} (${card.display}) is unique`);
            }

            // Wait between cards for dramatic effect
            if (cardIndex < 3) {
                await this.wait(800);
            }
        }

        // All 3 cards drawn successfully
        await this.handleFlip3Success(targetPlayer);
    }

    /**
     * Update progress indicators
     */
    updateProgress(cardIndex) {
        // Update current card number
        const currentEl = document.getElementById('flip3-current');
        if (currentEl) currentEl.textContent = cardIndex.toString();

        // Update dots
        document.querySelectorAll('.flip3-dot').forEach((dot, index) => {
            dot.classList.remove('active');
            if (index + 1 === cardIndex) {
                dot.classList.add('active');
            } else if (index + 1 < cardIndex) {
                dot.classList.add('completed');
            }
        });
    }

    /**
     * Animate individual card reveal
     */
    async animateCardReveal(cardIndex, card, isDuplicate) {
        const slot = document.getElementById(`flip3-card-${cardIndex}`);
        if (!slot) return;

        // Start with card back
        slot.innerHTML = '<div class="card back flip-animation"></div>';

        // Wait for flip animation setup
        await this.wait(200);

        // Create the front card
        const cardElement = this.createCardElement(card);
        cardElement.classList.add('flip-animation');
        
        // Add duplicate styling if needed
        if (isDuplicate) {
            cardElement.classList.add('duplicate-card');
        }

        // Replace the back card with front card (flip effect)
        slot.innerHTML = '';
        slot.appendChild(cardElement);

        // Emit card revealed event
        eventBus.emit(GameEvents.FLIP3_CARD_REVEALED, {
            cardIndex,
            card,
            isDuplicate,
            targetPlayerId: this.currentAnimation.targetPlayer.id
        });

        // Wait for flip animation to complete
        await this.wait(600);
    }

    /**
     * Check if card is a duplicate
     */
    checkForDuplicate(card, player, drawnCards) {
        if (card.type !== 'number') return false;

        // Check against player's existing hand
        if (player.hasDuplicate(card.value)) {
            return true;
        }

        // Check against cards already drawn in this Flip3
        return drawnCards.some(drawnCard => 
            drawnCard.type === 'number' && drawnCard.value === card.value
        );
    }

    /**
     * Handle successful Flip3 completion
     */
    async handleFlip3Success(targetPlayer) {
        console.log(`🎉 Flip3AnimationManager: Flip3 completed successfully for ${targetPlayer.name}`);

        // Show success status
        const statusEl = document.getElementById('flip3-status');
        if (statusEl) {
            statusEl.textContent = '✅ Success! All cards added to hand.';
            statusEl.style.color = '#4CAF50';
        }

        // Add any deferred action cards to player's hand
        this.currentAnimation.deferredActionCards.forEach(card => {
            targetPlayer.addCard(card);
        });

        // Update player's score
        const score = targetPlayer.calculateRoundScore();
        targetPlayer.roundScore = score;

        eventBus.emit(GameEvents.SCORE_UPDATED, {
            playerId: targetPlayer.id,
            roundScore: score,
            totalScore: targetPlayer.totalScore
        });

        // Wait to show success message
        await this.wait(1500);

        // Hide popup
        this.hideFlip3Popup();

        // Process any deferred action cards
        if (this.currentAnimation.deferredActionCards.length > 0) {
            console.log(`🎴 Flip3AnimationManager: Processing ${this.currentAnimation.deferredActionCards.length} deferred action cards`);
            
            eventBus.emit(GameEvents.FLIP3_NESTED_DEFERRED, {
                targetPlayer: this.currentAnimation.targetPlayer,
                deferredCards: this.currentAnimation.deferredActionCards
            });
        }

        // Complete the animation
        this.completeAnimation();
    }

    /**
     * Handle Flip3 bust scenario
     */
    async handleFlip3Bust(targetPlayer, duplicateCard) {
        console.log(`💥 Flip3AnimationManager: ${targetPlayer.name} busts on ${duplicateCard.display}`);

        // Show bust status
        const statusEl = document.getElementById('flip3-status');
        if (statusEl) {
            statusEl.textContent = `💥 BUST! Duplicate ${duplicateCard.display}`;
            statusEl.style.color = '#f44336';
        }

        // Bust the player
        targetPlayer.bust();

        eventBus.emit(GameEvents.PLAYER_BUSTED, {
            playerId: targetPlayer.id,
            card: duplicateCard
        });

        // Wait to show bust message
        await this.wait(2000);

        // Hide popup
        this.hideFlip3Popup();

        // Complete the animation
        this.completeAnimation();
    }

    /**
     * Handle Flip3 failure (no cards, etc.)
     */
    async handleFlip3Failure(targetPlayer, reason) {
        console.log(`❌ Flip3AnimationManager: Flip3 failed - ${reason}`);

        const statusEl = document.getElementById('flip3-status');
        if (statusEl) {
            statusEl.textContent = `❌ Failed: ${reason}`;
            statusEl.style.color = '#f44336';
        }

        await this.wait(2000);
        this.hideFlip3Popup();
        this.completeAnimation();
    }

    /**
     * Complete animation and handle queue
     */
    completeAnimation() {
        console.log('✅ Flip3AnimationManager: Animation completed');

        // Mark animation as complete
        eventBus.emit(GameEvents.FLIP3_ANIMATION_COMPLETED, {
            targetPlayerId: this.currentAnimation.targetPlayer.id,
            sourcePlayerId: this.currentAnimation.sourcePlayer.id
        });

        // Reset state
        this.isAnimating = false;
        this.currentAnimation = null;

        // Process queue
        if (this.animationQueue.length > 0) {
            console.log(`🔄 Flip3AnimationManager: Processing queued animation (${this.animationQueue.length} remaining)`);
            const nextAnimation = this.animationQueue.shift();
            setTimeout(() => {
                this.startFlip3Animation({
                    targetPlayerId: nextAnimation.targetPlayer.id,
                    sourcePlayerId: nextAnimation.sourcePlayer.id
                });
            }, 500);
        }
    }

    /**
     * Create card DOM element
     */
    createCardElement(card) {
        const cardDiv = document.createElement('div');
        cardDiv.className = `card ${card.type}`;
        
        if (this.hasCardImage(card)) {
            const imageName = this.getCardImageName(card);
            cardDiv.style.backgroundImage = `url('./images/${imageName}')`;
            cardDiv.style.backgroundSize = 'cover';
            cardDiv.classList.add('custom-image');
        } else {
            cardDiv.innerHTML = `<span>${card.display}</span>`;
        }
        
        return cardDiv;
    }

    /**
     * Check if card has image
     */
    hasCardImage(card) {
        return true; // All cards have images
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
     * Utility function for async waiting
     */
    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Check if currently animating
     */
    isCurrentlyAnimating() {
        return this.isAnimating;
    }

    /**
     * Get current animation info
     */
    getCurrentAnimation() {
        return this.currentAnimation;
    }
}

// Create singleton instance
const flip3AnimationManager = new Flip3AnimationManager();
export default flip3AnimationManager;