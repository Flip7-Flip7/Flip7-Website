// Flip 7 Game Animations Module
// All visual effects, animations, and transitions

export class GameAnimations {
    constructor() {
        this.backdropAutoHideTimeout = null;
        this.animationFrameId = null;
    }

    // Card flip and slide animations
    animateCardFlip(card, playerId, gameInstance) {
        // Use center animation areas for better visual impact
        const isMobile = window.innerWidth <= 1024;
        const animationArea = isMobile 
            ? document.getElementById('mobile-center-card-animation-area')
            : document.getElementById('center-card-animation-area');
        
        // Fallback if animation area doesn't exist - add card directly
        if (!animationArea) {
            gameInstance.addCardToPlayerHand(card, playerId);
            return;
        }
        
        // Check if target container exists before starting animation
        const targetElement = gameInstance.getTargetCardContainer(playerId, card.type);
        if (!targetElement) {
            gameInstance.addCardToPlayerHand(card, playerId);
            return;
        }
        
        // Define reveal duration for simple flip
        const revealDuration = 600; // Quick simple flip
        
        // Show backdrop for focus (mobile only)
        let backdropTimeout = null;
        if (isMobile) {
            const backdrop = document.getElementById('animation-backdrop');
            if (backdrop) {
                backdrop.classList.add('show');
                
                // Only set auto-hide timeout for non-interactive cards
                // Interactive cards (Flip3/Freeze for humans) will manage their own backdrop
                const willBecomeInteractive = card.type === 'action' && 
                    (card.value === 'freeze' || card.value === 'flip3') && 
                    playerId === 'player';
                
                if (!willBecomeInteractive) {
                    // Hide backdrop after animation completes for normal cards
                    this.backdropAutoHideTimeout = setTimeout(() => {
                        backdrop.classList.remove('show');
                        this.backdropAutoHideTimeout = null;
                    }, revealDuration + 100); // Just after flip completes
                }
            }
        }
        
        // Create simple flip animation for both mobile and desktop
        const animatedCard = document.createElement('div');
        animatedCard.classList.add('animated-card');
        
        // Create card back element
        const cardBack = document.createElement('div');
        cardBack.classList.add('card-back');
        
        // Create card front element with actual card content
        const cardFront = gameInstance.createCardElement(card);
        cardFront.classList.add('card-front');
        
        // Assemble the animated card
        animatedCard.appendChild(cardBack);
        animatedCard.appendChild(cardFront);
        
        // Clear any existing animation
        animationArea.innerHTML = '';
        animationArea.appendChild(animatedCard);
        
        // Start simple flip animation
        animatedCard.classList.add('simple-flip');
        
        // After flip completes, handle the card
        setTimeout(() => {
            // Check if this is a special action card that should show modal instead
            // IMPORTANT: Only show interactive modal for human players (playerId === 'player')
            const isHumanPlayer = playerId === 'player';
            const shouldShowModal = card.type === 'action' && (card.value === 'freeze' || card.value === 'flip3') && isHumanPlayer;
            
            if (shouldShowModal) {
                // For special action cards from human player, transition to interactive drag & drop
                this.transitionToInteractiveCard(animatedCard, animationArea, card, playerId, gameInstance);
                return;
            }
            
            // For regular cards, slide from center to player hand
            this.slideCardToPlayerHand(animatedCard, animationArea, card, playerId, gameInstance);
        }, revealDuration); // Wait for flip to complete
    }

    slideCardToPlayerHand(animatedCard, animationArea, card, playerId, gameInstance) {
        const isMobile = window.innerWidth <= 1024;
        
        // Set mobile-specific card size BEFORE getting position
        if (isMobile) {
            animatedCard.style.width = '120px';
            animatedCard.style.height = '168px';
            animatedCard.style.fontSize = '2em';
            // Add sliding class to override CSS positioning conflicts
            animatedCard.classList.add('sliding');
        }
        
        // Get current card position AFTER size changes and class addition
        const animatedCardRect = animatedCard.getBoundingClientRect();
        const startX = animatedCardRect.left;
        const startY = animatedCardRect.top;
        
        // Get target element based on device type
        let targetElement;
        if (isMobile) {
            targetElement = gameInstance.getPlayerAreaElement(playerId);
        } else {
            targetElement = gameInstance.getTargetCardContainer(playerId, card.type);
        }
        
        if (!targetElement) {
            // Fallback: just add card directly if no target found
            gameInstance.addCardToPlayerHand(card, playerId);
            if (animationArea && animationArea.parentNode) {
                animationArea.innerHTML = '';
            }
            return;
        }
        
        // Get target position
        const targetRect = targetElement.getBoundingClientRect();
        let endX, endY;
        
        if (isMobile) {
            // Simplify mobile targeting - animate to center of player container
            endX = targetRect.left + (targetRect.width / 2) - (120 / 2);
            endY = targetRect.top + (targetRect.height / 2) - (168 / 2);
        } else {
            // Desktop positioning (center of cards container)
            endX = targetRect.left + (targetRect.width / 2) - (animatedCardRect.width / 2);
            endY = targetRect.top + (targetRect.height / 2) - (animatedCardRect.height / 2);
        }
        
        // Calculate slide distance
        const deltaX = endX - startX;
        const deltaY = endY - startY;
        
        // Calculate scale based on device
        const scale = isMobile ? 0.5 : 0.8;
        
        // Apply slide animation with proper transform origin
        animatedCard.style.position = 'fixed';
        animatedCard.style.left = startX + 'px';
        animatedCard.style.top = startY + 'px';
        animatedCard.style.zIndex = isMobile ? '15000' : '10000'; // Higher z-index for mobile
        animatedCard.style.transformOrigin = 'center center';
        animatedCard.style.transition = `transform ${isMobile ? '0.6s' : '0.6s'} ease-in-out`; // Slower for visibility
        animatedCard.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(${scale})`;
        
        // Ensure card is visible during animation
        animatedCard.style.visibility = 'visible';
        animatedCard.style.opacity = '1';
        
        // After slide animation completes, add card to hand and clean up
        setTimeout(() => {
            gameInstance.addCardToPlayerHand(card, playerId);
            
            // Clear animation area
            if (animationArea && animationArea.parentNode) {
                animationArea.innerHTML = '';
            }
        }, isMobile ? 600 : 600);
    }

    transitionToInteractiveCard(animatedCard, animationArea, card, playerId, gameInstance) {
        // Clear any pending backdrop auto-hide timeout since we're taking control
        if (this.backdropAutoHideTimeout) {
            clearTimeout(this.backdropAutoHideTimeout);
            this.backdropAutoHideTimeout = null;
        }
        
        // Remove the reveal animation classes
        animatedCard.classList.remove('flip-reveal', 'mobile-reveal');
        
        // Add interactive classes for visual cues
        animatedCard.classList.add('interactive-card', 'drag-me');
        
        // IMPORTANT: Make only Flip3/Freeze cards small for drag/drop
        if (card.value === 'flip3' || card.value === 'freeze') {
            animatedCard.classList.add('drag-card-small');
            
            // Expand animation area for better touch interaction with small cards
            if (animationArea && window.innerWidth <= 1024) {
                animationArea.style.width = '100px';
                animationArea.style.height = '120px';
                animationArea.style.marginLeft = '-50px'; // Half of 100px
                animationArea.style.marginTop = '-60px';  // Half of 120px
            }
        }
        
        // CRITICAL: Enable pointer events on mobile animation area for touch interaction
        if (animationArea) {
            animationArea.classList.add('has-interactive-card');
        }
        
        // Show backdrop and instructions
        const backdrop = document.getElementById('animation-backdrop');
        if (backdrop) {
            backdrop.classList.add('show');
            backdrop.style.zIndex = '9998'; // Below the card but above everything else
        }
        
        // Add instructional overlay
        gameInstance.showDragInstructions(card);
        
        // Highlight valid drop targets
        gameInstance.highlightDropTargets();
        
        // Enable drag functionality
        this.enableCardDrag(animatedCard, card, playerId, animationArea, gameInstance);
    }

    // Placeholder for remaining animation methods - will be filled in next phase
    // This ensures the module loads without breaking existing functionality
}

// Export singleton instance
export const gameAnimations = new GameAnimations();