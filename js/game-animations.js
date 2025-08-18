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
        
        // Get target element based on device type with debug logging
        console.log(`🎯 Card animation targeting playerId: ${playerId}, isMobile: ${isMobile}`);
        let targetElement;
        if (isMobile) {
            targetElement = gameInstance.getPlayerAreaElement(playerId);
            console.log(`📱 Mobile target element:`, targetElement?.id || 'NOT FOUND');
        } else {
            targetElement = gameInstance.getTargetCardContainer(playerId, card.type);
            console.log(`🖥️ Desktop target element:`, targetElement?.id || 'NOT FOUND');
        }
        
        if (!targetElement) {
            console.warn(`❌ No target element found for playerId: ${playerId}`);
            // Fallback: just add card directly if no target found
            gameInstance.addCardToPlayerHand(card, playerId);
            if (animationArea && animationArea.parentNode) {
                animationArea.innerHTML = '';
            }
            return;
        }
        
        // Clean up animation classes and wait for layout to stabilize
        animatedCard.classList.remove('flip-reveal', 'mobile-reveal', 'slide-to-hand');
        
        // Wait for coordinate calculation stability after class removal
        requestAnimationFrame(() => {
            this.performSeamlessSlide(animatedCard, animationArea, targetElement, card, playerId, gameInstance, isMobile);
        });
    }

    performSeamlessSlide(animatedCard, animationArea, targetElement, card, playerId, gameInstance, isMobile) {
        // Get current card position (center of animation area)
        const animatedCardRect = animatedCard.getBoundingClientRect();
        const currentCenterX = animatedCardRect.left + (animatedCardRect.width / 2);
        const currentCenterY = animatedCardRect.top + (animatedCardRect.height / 2);
        
        // Get target position (center of target element)
        const targetRect = targetElement.getBoundingClientRect();
        const targetCenterX = targetRect.left + (targetRect.width / 2);
        const targetCenterY = targetRect.top + (targetRect.height / 2);
        
        // Calculate transform distance (center to center)
        const deltaX = targetCenterX - currentCenterX;
        const deltaY = targetCenterY - currentCenterY;
        
        // GPU-optimized animation setup
        animatedCard.style.willChange = 'transform';
        animatedCard.style.zIndex = isMobile ? '15000' : '10000';
        animatedCard.style.transformOrigin = 'center center';
        animatedCard.style.pointerEvents = 'none';
        
        // DON'T add .sliding class to avoid position changes during animation
        // Set initial transform with translate3d for GPU acceleration
        const initialTransform = 'translate3d(0, 0, 0) scale(1.0)';
        animatedCard.style.transform = initialTransform;
        
        // Simplified shadow that doesn't change during animation (performance)
        animatedCard.style.boxShadow = isMobile 
            ? '0 4px 15px rgba(0, 0, 0, 0.2)' 
            : '0 2px 10px rgba(0, 0, 0, 0.15)';
        
        // Start smooth animation with optimized timing
        if (isMobile) {
            // Mobile: 60fps optimized easing with GPU acceleration - faster for gameplay
            animatedCard.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            animatedCard.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0) scale(0.8) rotate(1deg)`;
        } else {
            // Desktop animation - faster for gameplay
            animatedCard.style.transition = 'transform 0.25s cubic-bezier(0.4, 0.0, 0.2, 1)';
            animatedCard.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0) scale(0.85)`;
        }
        
        // Complete animation and clean up
        const animationDuration = isMobile ? 300 : 250;
        setTimeout(() => {
            // Clean up animation optimizations
            animatedCard.style.willChange = 'auto';
            
            // Add card to player hand
            gameInstance.addCardToPlayerHand(card, playerId);
            
            // Clear animation area
            if (animationArea && animationArea.parentNode) {
                animationArea.innerHTML = '';
            }
        }, animationDuration);
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
        
        // Show backdrop with reduced opacity for better drop zone visibility
        const backdrop = document.getElementById('animation-backdrop');
        if (backdrop) {
            backdrop.classList.add('show');
            backdrop.style.zIndex = '9998';
            backdrop.style.background = 'rgba(0, 0, 0, 0.15)'; // Much lighter for better visibility
        }
        
        // NO INSTRUCTION POPUP - immediate drag mode
        // Immediately highlight valid drop targets
        this.highlightDropTargets(gameInstance);
        
        // Enable enhanced drag functionality
        this.enableEnhancedCardDrag(animatedCard, card, playerId, animationArea, gameInstance);
        
        // Set game pause state
        gameInstance.setDragPauseState(true);
    }

    // Enhanced Drop Target Highlighting
    highlightDropTargets(gameInstance) {
        const isMobile = window.innerWidth <= 1024;
        
        // Get all player containers and highlight active players
        gameInstance.players.forEach(player => {
            const container = isMobile 
                ? document.getElementById(`mobile-${player.id}`) 
                : document.getElementById(player.id);
            
            if (container) {
                // Clear any existing highlighting
                container.classList.remove('valid-drop-target', 'drag-hover');
                
                // Only highlight active players (not busted/frozen)
                if (player.status === 'active' || player.status === 'stayed') {
                    container.classList.add('valid-drop-target');
                    container.setAttribute('data-player-id', player.id);
                    
                    // Add enhanced glow animation
                    container.style.animation = 'dropTargetGlow 2s ease-in-out infinite alternate';
                    container.style.border = '4px solid rgba(34, 197, 94, 0.9)';
                    container.style.boxShadow = '0 0 25px rgba(34, 197, 94, 0.8), inset 0 0 15px rgba(34, 197, 94, 0.3)';
                    container.style.background = 'rgba(34, 197, 94, 0.15)';
                    
                    // Add larger touch target for mobile
                    if (isMobile) {
                        container.style.minHeight = '100px';
                        container.style.padding = '10px';
                        container.style.margin = '5px';
                    }
                }
            }
        });
    }

    clearDropTargetHighlights(gameInstance) {
        const isMobile = window.innerWidth <= 1024;
        
        gameInstance.players.forEach(player => {
            const container = isMobile 
                ? document.getElementById(`mobile-${player.id}`) 
                : document.getElementById(player.id);
            
            if (container) {
                container.classList.remove('valid-drop-target', 'drag-hover');
                container.removeAttribute('data-player-id');
                container.style.animation = '';
                container.style.border = '';
                container.style.boxShadow = '';
                container.style.background = '';
                container.style.minHeight = '';
                container.style.padding = '';
                container.style.margin = '';
            }
        });
    }

    // Freeze Visual Effects
    addFreezeVisualEffects(targetPlayer, gameInstance) {
        // Enhanced freeze effects (builds on existing system)
        const isMobile = window.innerWidth <= 1024;
        
        // Get containers for both desktop and mobile
        const desktopContainer = document.getElementById(targetPlayer.id);
        const mobileContainer = document.getElementById(`mobile-${targetPlayer.id}`);
        
        // Always add effects to both containers to ensure visibility
        const containers = [desktopContainer, mobileContainer].filter(c => c !== null);
        
        if (containers.length === 0) {
            console.warn(`❌ No containers found for player ${targetPlayer.name}`);
            return;
        }
        
        containers.forEach(container => {
            // Safety check: Remove any existing freeze effects first to prevent duplication
            this.removeFreezeVisualEffectsFromContainer(container);
            
            // Add enhanced frozen class for additional effects
            container.classList.add('enhanced-frozen');
            container.style.position = 'relative';
            
            // Create dramatic freeze overlay
            const freezeOverlay = document.createElement('div');
            freezeOverlay.className = 'freeze-overlay';
            
            // Add ice crystals background
            const iceCrystals = document.createElement('div');
            iceCrystals.className = 'ice-crystals';
            freezeOverlay.appendChild(iceCrystals);
            
            // Add FROZEN text
            const frozenText = document.createElement('div');
            frozenText.className = 'freeze-overlay-text';
            frozenText.innerHTML = '❄️ FROZEN ❄️';
            freezeOverlay.appendChild(frozenText);
            
            // Add ice shards border
            const iceShards = document.createElement('div');
            iceShards.className = 'freeze-ice-shards';
            container.appendChild(iceShards);
            
            // Add floating ice particles
            const particlesContainer = document.createElement('div');
            particlesContainer.className = 'freeze-particles';
            
            // Create multiple floating ice particles
            const particles = ['❄', '❅', '❆', '✦', '✧', '◆'];
            for (let i = 0; i < 8; i++) {
                const particle = document.createElement('span');
                particle.className = 'ice-particle';
                particle.textContent = particles[Math.floor(Math.random() * particles.length)];
                particle.style.left = Math.random() * 100 + '%';
                particle.style.animationDelay = Math.random() * 3 + 's';
                particle.style.animationDuration = (2 + Math.random() * 3) + 's';
                particlesContainer.appendChild(particle);
            }
            
            container.appendChild(particlesContainer);
            
            // Add overlay to container
            container.appendChild(freezeOverlay);
            
            console.log(`✅ Added dramatic freeze overlay to container:`, container.id || container.className);
        });
        
        // Create ice particles effect on primary container
        const primaryContainer = isMobile && mobileContainer ? mobileContainer : desktopContainer;
        if (primaryContainer) {
            this.createIceParticles(primaryContainer);
        }
    }

    removeFreezeVisualEffectsFromContainer(container) {
        if (!container) return;
        
        // Remove frozen and stayed classes
        container.classList.remove('enhanced-frozen', 'frozen-effect', 'frozen', 'busted', 'stayed', 'stay-animation');
        
        // Remove freeze overlay (new dramatic effect)
        const freezeOverlay = container.querySelector('.freeze-overlay');
        if (freezeOverlay) {
            freezeOverlay.remove();
        }
        
        // Remove ice shards border
        const iceShards = container.querySelector('.freeze-ice-shards');
        if (iceShards) {
            iceShards.remove();
        }
        
        // Remove particles
        const particles = container.querySelector('.freeze-particles');
        if (particles) {
            particles.remove();
        }
        
        // Remove ice particles
        const iceParticles = container.querySelector('.ice-particles');
        if (iceParticles) {
            iceParticles.remove();
        }
    }

    clearAllFreezeEffects(player) {
        // Clear freeze effects from both desktop and mobile containers
        const desktopContainer = document.getElementById(player.id);
        const mobileContainer = document.getElementById(`mobile-${player.id}`);
        
        if (desktopContainer) {
            this.removeFreezeVisualEffectsFromContainer(desktopContainer);
        }
        
        if (mobileContainer) {
            this.removeFreezeVisualEffectsFromContainer(mobileContainer);
        }
    }

    createIceParticles(container) {
        // Create falling ice particle effect
        const particles = document.createElement('div');
        particles.className = 'ice-particles';
        particles.innerHTML = '❄❅❆✦✧◆❄❅❆';
        container.appendChild(particles);
        
        // Remove particles after animation
        setTimeout(() => {
            particles.remove();
        }, 700);
    }

    // Card Display and Creation
    displayCard(card, playerId, gameInstance) {
        // Try animation first, with fallback to direct addition
        try {
            this.animateCardFlip(card, playerId, gameInstance);
        } catch (error) {
            console.error('Animation failed, adding card directly:', error);
            gameInstance.addCardToPlayerHand(card, playerId);
        }
    }

    createCardElement(card) {
        const cardElement = document.createElement('div');
        cardElement.classList.add('card');
        
        if (card.type === 'number') {
            cardElement.classList.add('number-card');
            cardElement.textContent = card.value;
            cardElement.style.backgroundColor = this.getCardColor(card.value);
        } else if (card.type === 'action') {
            cardElement.classList.add('action-card');
            cardElement.textContent = card.display;
            if (card.value === 'freeze') {
                cardElement.style.background = 'linear-gradient(135deg, #1e3a8a, #3b82f6)';
            } else if (card.value === 'flip3') {
                cardElement.style.background = 'linear-gradient(135deg, #7c2d12, #dc2626)';
            } else if (card.value === 'second_chance') {
                cardElement.style.background = 'linear-gradient(135deg, #15803d, #22c55e)';
            }
        } else if (card.type === 'modifier') {
            cardElement.classList.add('modifier-card');
            cardElement.textContent = card.display;
            cardElement.style.background = 'linear-gradient(135deg, #7c2d12, #f59e0b)';
        }
        
        return cardElement;
    }

    getCardColor(value) {
        const colors = [
            '#1f2937', '#374151', '#4b5563', '#6b7280', '#9ca3af',
            '#d1d5db', '#e5e7eb', '#f3f4f6', '#f9fafb', '#ffffff',
            '#fef3c7', '#fde68a', '#f59e0b'
        ];
        return colors[value] || '#6b7280';
    }

    // AI and Transfer Animations
    animateAICardDrag(card, fromPlayer, toPlayer, callback, gameInstance) {
        const fromElement = document.getElementById(fromPlayer.id);
        const toElement = document.getElementById(toPlayer.id);
        
        if (!fromElement || !toElement) {
            if (callback) callback();
            return;
        }
        
        // Create animated card element
        const animatedCard = this.createCardElement(card);
        animatedCard.style.position = 'fixed';
        animatedCard.style.zIndex = '10000';
        animatedCard.style.width = '60px';
        animatedCard.style.height = '84px';
        animatedCard.style.fontSize = '0.8em';
        animatedCard.style.pointerEvents = 'none';
        
        // Get start and end positions
        const fromRect = fromElement.getBoundingClientRect();
        const toRect = toElement.getBoundingClientRect();
        
        // Set start position
        animatedCard.style.left = (fromRect.left + fromRect.width / 2 - 30) + 'px';
        animatedCard.style.top = (fromRect.top + fromRect.height / 2 - 42) + 'px';
        
        document.body.appendChild(animatedCard);
        
        // Calculate end position
        const endX = toRect.left + toRect.width / 2 - 30;
        const endY = toRect.top + toRect.height / 2 - 42;
        
        // Animate movement
        animatedCard.style.transition = 'all 0.8s ease-in-out';
        setTimeout(() => {
            animatedCard.style.left = endX + 'px';
            animatedCard.style.top = endY + 'px';
            animatedCard.style.transform = 'scale(0.5)';
        }, 100);
        
        // Cleanup and callback
        setTimeout(() => {
            document.body.removeChild(animatedCard);
            if (callback) callback();
        }, 800);
    }

    // Player State Animations
    animateBust(player) {
        const playerElement = document.getElementById(player.id);
        if (playerElement) {
            playerElement.classList.add('bust-animation');
            setTimeout(() => {
                playerElement.classList.remove('bust-animation');
            }, 1000);
        }
    }

    animateStay(player) {
        const playerElement = document.getElementById(player.id);
        if (playerElement) {
            playerElement.classList.add('stay-animation');
            setTimeout(() => {
                playerElement.classList.remove('stay-animation');
            }, 1500);
        }
    }

    // Flip 3 Progress and UI Animations
    showFlip3SequenceIndicator(cardOwner, targetPlayer, currentCard, gameInstance) {
        console.log(`🔄 Showing Flip3 indicator: ${cardOwner.name} → ${targetPlayer.name}`);
        
        const indicator = document.getElementById('flip3-progress-indicator');
        const targetName = document.getElementById('flip3-target-name');
        const currentCounter = document.getElementById('flip3-current');
        const statusDiv = document.getElementById('flip3-status');
        
        if (!indicator || !targetName || !currentCounter) {
            console.warn('Flip3 indicator elements not found');
            return;
        }
        
        // Set target player name
        targetName.textContent = targetPlayer.name;
        
        // Reset all dots
        const dots = indicator.querySelectorAll('.flip3-dot');
        dots.forEach(dot => {
            dot.classList.remove('filled', 'active');
        });
        
        // Reset card slots to show card backs
        for (let i = 1; i <= 3; i++) {
            const slot = document.getElementById(`flip3-card-${i}`);
            if (slot) {
                slot.innerHTML = '<div class="card back"></div>';
            }
        }
        
        // Clear status
        if (statusDiv) {
            statusDiv.textContent = '';
            statusDiv.className = 'flip3-status';
        }
        
        // Set starting state (card 1)
        currentCounter.textContent = '1';
        if (dots[0]) dots[0].classList.add('active');
        
        // Show the backdrop and indicator
        const backdrop = document.getElementById('flip3-backdrop');
        if (backdrop) backdrop.style.display = 'block';
        indicator.style.display = 'block';
    }

    updateFlip3Progress(currentCard) {
        console.log(`🔄 Updating Flip3 progress: card ${currentCard}`);
        
        const indicator = document.getElementById('flip3-progress-indicator');
        const currentCounter = document.getElementById('flip3-current');
        
        if (!indicator || !currentCounter) {
            console.warn('Flip3 indicator elements not found for update');
            return;
        }
        
        const dots = indicator.querySelectorAll('.flip3-dot');
        
        // Update counter
        currentCounter.textContent = currentCard.toString();
        
        // Update dots
        dots.forEach((dot, index) => {
            dot.classList.remove('active');
            if (index < currentCard) {
                dot.classList.add('filled');
            }
        });
        
        // Set active dot (next card to be drawn)
        if (currentCard < 3 && dots[currentCard]) {
            dots[currentCard].classList.add('active');
        }
        
        // Special handling for completion
        if (currentCard >= 3) {
            // All cards drawn - brief "COMPLETE!" message
            setTimeout(() => {
                const title = indicator.querySelector('.flip3-title');
                if (title) {
                    const originalText = title.textContent;
                    title.textContent = 'FLIP 3 COMPLETE!';
                    title.style.color = '#4ade80'; // Green
                    
                    setTimeout(() => {
                        title.textContent = originalText;
                        title.style.color = '#ffd700'; // Back to gold
                    }, 1000);
                }
            }, 500);
        }
    }

    hideFlip3SequenceIndicator() {
        console.log('🔄 Hiding Flip3 indicator');
        
        const indicator = document.getElementById('flip3-progress-indicator');
        if (!indicator) {
            console.warn('Flip3 indicator not found for hiding');
            return;
        }
        
        // Fade out animation
        indicator.style.animation = 'flip3Appear 0.3s ease-in reverse';
        
        setTimeout(() => {
            // Hide backdrop and indicator
            const backdrop = document.getElementById('flip3-backdrop');
            if (backdrop) backdrop.style.display = 'none';
            indicator.style.display = 'none';
            indicator.style.animation = ''; // Reset animation
        }, 300);
    }

    previewFlip3Card(card, slotNumber, gameInstance) {
        console.log(`🎴 Previewing Flip3 card ${slotNumber}: ${card.display}`);
        
        const slot = document.getElementById(`flip3-card-${slotNumber}`);
        if (!slot) return;
        
        const cardDiv = slot.querySelector('.card');
        if (!cardDiv) return;
        
        // Add flipping animation class
        cardDiv.classList.add('flipping');
        
        // After flip animation, show the card face using proper card creation
        setTimeout(() => {
            // Create a properly formatted card element
            const properCard = this.createCardElement(card);
            
            // Copy the proper card styling to the existing div
            cardDiv.className = properCard.className;
            cardDiv.innerHTML = properCard.innerHTML;
            
            // Copy background image if it exists (for custom images)
            if (properCard.style.backgroundImage) {
                cardDiv.style.backgroundImage = properCard.style.backgroundImage;
                cardDiv.style.backgroundSize = 'cover';
                cardDiv.style.backgroundPosition = 'center';
            }
            
            console.log(`✅ Card ${slotNumber} preview updated with proper styling:`, cardDiv.className);
        }, 300);
    }

    animateFlip3Success() {
        console.log('✅ Animating Flip3 success - adding cards to hand');
        
        // Get all card slots
        const slots = [];
        for (let i = 1; i <= 3; i++) {
            const slot = document.getElementById(`flip3-card-${i}`);
            if (slot) {
                const cardDiv = slot.querySelector('.card');
                if (cardDiv) {
                    slots.push(cardDiv);
                }
            }
        }
        
        // Animate cards flying to player's hand
        slots.forEach((cardDiv, index) => {
            setTimeout(() => {
                cardDiv.style.animation = 'flip3CardFlyToHand 0.5s ease-out forwards';
            }, index * 100);
        });
        
        // Update status
        const statusDiv = document.getElementById('flip3-status');
        if (statusDiv) {
            statusDiv.textContent = 'All cards added successfully!';
            statusDiv.className = 'flip3-status success';
        }
    }

    // Celebration Animations
    animateFlip7Celebration(player, gameInstance) {
        // Starting Flip 7 celebration
        
        // Show celebration overlay
        const celebrationEl = document.getElementById('flip7-celebration');
        celebrationEl.style.display = 'block';
        
        // Stage 1: Card wave animation (2s)
        this.animateCardWave(player, gameInstance);
        
        setTimeout(() => {
            // Stage 2: Logo drops and spins (2s)
            this.showFlip7Logo();
            
            setTimeout(() => {
                // Stage 3: Fast spinning top effect (2s)
                this.spinLogoFast();
                
                setTimeout(() => {
                    // Stage 4: Wobble and finale with glitter (2.5s)
                    this.wobbleAndExplodeLogo();
                    
                    setTimeout(() => {
                        // Stage 5: Clean up and end round (6.5s total)
                        this.cleanupFlip7Celebration();
                        if (gameInstance && gameInstance.endRound) {
                            gameInstance.endRound();
                        }
                    }, 2500);
                }, 2000);
            }, 2000);
        }, 2000);
    }

    animateCardWave(player, gameInstance) {
        const cardContainer = gameInstance.getTargetCardContainer(player.id, 'number');
        const numberCards = cardContainer ? cardContainer.querySelectorAll('.card[data-card-type="number"]') : [];
        
        // Clone and animate each card
        numberCards.forEach((card, index) => {
            // Create animated clone
            const cardClone = card.cloneNode(true);
            cardClone.classList.add('card-wave-up');
            
            // Position at original card location
            const rect = card.getBoundingClientRect();
            cardClone.style.left = rect.left + 'px';
            cardClone.style.top = rect.top + 'px';
            cardClone.style.width = rect.width + 'px';
            cardClone.style.height = rect.height + 'px';
            
            // Add to document
            document.body.appendChild(cardClone);
            
            // Stagger animation start (200ms delay between cards)
            setTimeout(() => {
                cardClone.style.animationDelay = '0s';
            }, index * 200);
            
            // Remove clone after animation
            setTimeout(() => {
                if (cardClone.parentNode) {
                    cardClone.parentNode.removeChild(cardClone);
                }
            }, 2500 + (index * 200));
        });
        
        // Hide original cards during animation
        setTimeout(() => {
            if (cardContainer) {
                cardContainer.style.opacity = '0.3';
            }
        }, 200);
    }

    showFlip7Logo() {
        const logo = document.getElementById('flip7-celebration-logo');
        if (logo) {
            logo.classList.add('drop-spin');
        }
    }

    spinLogoFast() {
        const logo = document.getElementById('flip7-celebration-logo');
        if (logo) {
            logo.classList.add('fast-spin');
        }
    }

    wobbleAndExplodeLogo() {
        const logo = document.getElementById('flip7-celebration-logo');
        if (logo) {
            logo.classList.add('wobble-explode');
        }
    }

    cleanupFlip7Celebration() {
        const celebrationEl = document.getElementById('flip7-celebration');
        if (celebrationEl) {
            celebrationEl.style.display = 'none';
        }
    }

    // Transfer Animations
    animateSecondChanceTransfer(fromPlayer, toPlayer, onComplete) {
        // Create animated card element
        const animatedCard = document.createElement('div');
        animatedCard.className = 'card back transfer-card';
        animatedCard.style.position = 'absolute';
        animatedCard.style.zIndex = '1000';
        animatedCard.style.pointerEvents = 'none';
        
        // Get positions
        const fromElement = document.getElementById(fromPlayer.isHuman ? 'player' : fromPlayer.id);
        const toElement = document.getElementById(toPlayer.isHuman ? 'player' : toPlayer.id);
        const fromRect = fromElement.getBoundingClientRect();
        const toRect = toElement.getBoundingClientRect();
        
        // Start position (center of from player)
        animatedCard.style.left = (fromRect.left + fromRect.width / 2 - 30) + 'px';
        animatedCard.style.top = (fromRect.top + fromRect.height / 2 - 42) + 'px';
        
        document.body.appendChild(animatedCard);
        
        // Animate to target position
        setTimeout(() => {
            animatedCard.style.transition = 'all 0.8s ease-in-out';
            animatedCard.style.left = (toRect.left + toRect.width / 2 - 30) + 'px';
            animatedCard.style.top = (toRect.top + toRect.height / 2 - 42) + 'px';
            animatedCard.style.transform = 'scale(0.8)';
            
            setTimeout(() => {
                document.body.removeChild(animatedCard);
                if (onComplete) onComplete();
            }, 800);
        }, 100);
    }

    animateFreezeTransfer(cardOwner, targetPlayer, onComplete) {
        // Find the freeze card in the card owner's hand
        const ownerContainer = document.getElementById(cardOwner.id);
        const ownerCardContainer = cardOwner.isHuman 
            ? document.getElementById('player-cards')
            : ownerContainer.querySelector('.player-cards');
        
        const freezeCard = Array.from(ownerCardContainer.children).find(card => 
            card.dataset.cardValue === 'freeze'
        );
        
        if (!freezeCard) {
            // Fallback if freeze card not found
            if (onComplete) onComplete();
            return;
        }
        
        // Get target player container position
        const targetContainer = document.getElementById(targetPlayer.id);
        const freezeRect = freezeCard.getBoundingClientRect();
        const targetRect = targetContainer.getBoundingClientRect();
        
        // Calculate transfer distance
        const transferX = targetRect.left - freezeRect.left + (targetRect.width / 2);
        const transferY = targetRect.top - freezeRect.top + (targetRect.height / 2);
        
        // Set CSS variables for animation
        freezeCard.style.setProperty('--transfer-x', `${transferX}px`);
        freezeCard.style.setProperty('--transfer-y', `${transferY}px`);
        
        // Start animation
        freezeCard.classList.add('freeze-transfer');
        
        // Remove freeze card and complete after animation
        setTimeout(() => {
            if (freezeCard.parentNode) {
                freezeCard.parentNode.removeChild(freezeCard);
            }
            
            if (onComplete) onComplete();
        }, 1200);
    }

    // Enhanced Drag and Drop Functionality  
    enableEnhancedCardDrag(animatedCard, card, playerId, animationArea, gameInstance) {
        // Enhanced drag state management
        let isDragging = false;
        let isFloating = false;
        let currentDropTarget = null;
        let animationFrameId = null;
        
        // Calculate card center offset for perfect finger tracking
        const cardRect = animatedCard.getBoundingClientRect();
        const cardCenterOffsetX = cardRect.width / 2;
        const cardCenterOffsetY = cardRect.height / 2;
        
        // Desktop drag events (simplified)
        animatedCard.draggable = true;
        animatedCard.style.cursor = 'grab';
        
        animatedCard.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', JSON.stringify({ card, playerId }));
            animatedCard.style.opacity = '0.8';
        });
        
        animatedCard.addEventListener('dragend', (e) => {
            animatedCard.style.opacity = '1';
        });
        
        // Enhanced mobile touch events with perfect finger tracking
        animatedCard.addEventListener('touchstart', (e) => {
            isDragging = true;
            isFloating = false;
            const touch = e.touches[0];
            
            // IMMEDIATE: Remove any instruction popups
            const instructions = document.getElementById('drag-instructions');
            if (instructions) {
                instructions.remove();
            }
            
            // Position card center under fingertip immediately
            const newLeft = touch.clientX - cardCenterOffsetX;
            const newTop = touch.clientY - cardCenterOffsetY;
            
            // Setup enhanced dragging state
            animatedCard.classList.add('dragging');
            animatedCard.style.cursor = 'grabbing';
            animatedCard.style.position = 'fixed';
            animatedCard.style.left = newLeft + 'px';
            animatedCard.style.top = newTop + 'px';
            animatedCard.style.zIndex = '20000'; // Above everything
            animatedCard.style.pointerEvents = 'none';
            animatedCard.style.transform = 'scale(1.1)'; // Slight lift effect
            animatedCard.style.transition = 'none'; // Remove any existing transitions
            
            // Haptic feedback on grab
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
            
            currentDropTarget = null;
            
            e.preventDefault();
            e.stopPropagation();
        });
        
        animatedCard.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            
            const touch = e.touches[0];
            
            // Use requestAnimationFrame for ultra-smooth movement
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
            
            animationFrameId = requestAnimationFrame(() => {
                // Perfect finger tracking - card center follows fingertip exactly
                const newLeft = touch.clientX - cardCenterOffsetX;
                const newTop = touch.clientY - cardCenterOffsetY;
                
                animatedCard.style.left = newLeft + 'px';
                animatedCard.style.top = newTop + 'px';
                animatedCard.style.transform = 'scale(1.1) rotate(-3deg)'; // Enhanced visual feedback
                
                // Enhanced drop target detection
                const elementUnder = document.elementFromPoint(touch.clientX, touch.clientY);
                let newDropTarget = elementUnder?.closest('.valid-drop-target');
                
                // Mobile forgiveness - expand hit detection
                if (!newDropTarget && window.innerWidth <= 1024) {
                    const tolerance = 80; // Large tolerance for mobile
                    const dropTargets = document.querySelectorAll('.valid-drop-target');
                    
                    let closestTarget = null;
                    let closestDistance = tolerance;
                    
                    dropTargets.forEach(target => {
                        const rect = target.getBoundingClientRect();
                        const centerX = rect.left + rect.width / 2;
                        const centerY = rect.top + rect.height / 2;
                        
                        const distance = Math.sqrt(
                            Math.pow(touch.clientX - centerX, 2) + 
                            Math.pow(touch.clientY - centerY, 2)
                        );
                        
                        if (distance < closestDistance) {
                            closestDistance = distance;
                            closestTarget = target;
                        }
                    });
                    
                    newDropTarget = closestTarget;
                }
                
                // Update drop target highlighting with enhanced feedback
                if (newDropTarget !== currentDropTarget) {
                    // Remove highlight from previous target
                    if (currentDropTarget) {
                        currentDropTarget.classList.remove('drag-hover');
                        currentDropTarget.style.transform = '';
                    }
                    
                    // Add highlight to new target
                    if (newDropTarget) {
                        newDropTarget.classList.add('drag-hover');
                        newDropTarget.style.transform = 'scale(1.05)'; // Slightly expand target
                        
                        // Haptic feedback when entering valid zone
                        if (navigator.vibrate) {
                            navigator.vibrate(30);
                        }
                    }
                    
                    currentDropTarget = newDropTarget;
                }
            });
            
            e.preventDefault();
            e.stopPropagation();
        });
        
        animatedCard.addEventListener('touchend', (e) => {
            if (!isDragging) return;
            
            // Cancel any pending animation frame
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
            
            const touch = e.changedTouches[0];
            
            // Check if dropped on valid target
            const elementUnder = document.elementFromPoint(touch.clientX, touch.clientY);
            let dropTarget = elementUnder?.closest('.valid-drop-target');
            
            // Mobile forgiveness for final drop detection
            if (!dropTarget && window.innerWidth <= 1024) {
                const tolerance = 100; // Even larger tolerance on final release
                const dropTargets = document.querySelectorAll('.valid-drop-target');
                
                let closestTarget = null;
                let closestDistance = tolerance;
                
                dropTargets.forEach(target => {
                    const rect = target.getBoundingClientRect();
                    const centerX = rect.left + rect.width / 2;
                    const centerY = rect.top + rect.height / 2;
                    
                    const distance = Math.sqrt(
                        Math.pow(touch.clientX - centerX, 2) + 
                        Math.pow(touch.clientY - centerY, 2)
                    );
                    
                    if (distance < closestDistance) {
                        closestDistance = distance;
                        closestTarget = target;
                    }
                });
                
                dropTarget = closestTarget;
            }
            
            if (dropTarget) {
                // Successful drop - execute action
                const targetPlayerId = dropTarget.getAttribute('data-player-id');
                if (targetPlayerId) {
                    // Strong haptic feedback for successful drop
                    if (navigator.vibrate) {
                        navigator.vibrate([100, 50, 100]);
                    }
                    
                    // Clear highlights and execute action
                    this.clearDropTargetHighlights(gameInstance);
                    gameInstance.setDragPauseState(false);
                    gameInstance.handleSpecialCardDrop(card, targetPlayerId, playerId);
                    return;
                }
            }
            
            // No valid drop - enter floating state
            isDragging = false;
            isFloating = true;
            
            // Add floating animation
            animatedCard.style.animation = 'cardFloating 2s ease-in-out infinite alternate';
            animatedCard.style.transform = 'scale(1.0)'; // Return to normal size
            animatedCard.style.cursor = 'grab'; // Show it's still interactive
            animatedCard.style.pointerEvents = 'auto'; // Re-enable touch
            
            // Card stays floating until valid drop - game remains paused
            console.log('Card floating - waiting for valid drop');
            
            e.preventDefault();
            e.stopPropagation();
        });
    }

    animateCardSnapBack(animatedCard, animationArea) {
        if (!animationArea) return;
        
        const areaRect = animationArea.getBoundingClientRect();
        animatedCard.style.transition = 'all 0.3s ease-out';
        animatedCard.style.left = areaRect.left + 'px';
        animatedCard.style.top = areaRect.top + 'px';
        animatedCard.style.transform = 'scale(1) rotate(0deg)';
        
        setTimeout(() => {
            animatedCard.style.cursor = 'grab';
            animatedCard.classList.remove('dragging');
        }, 300);
    }

    // Point Transfer Animation for Round End Scoring
    animatePointTransfer(player, roundPoints, onComplete) {
        // Skip animation for players with 0 points (busted players)
        if (roundPoints <= 0) {
            if (onComplete) onComplete();
            return;
        }

        const isMobile = window.innerWidth <= 1024;
        const container = isMobile 
            ? document.getElementById(`mobile-${player.id}`) 
            : document.getElementById(player.id);

        if (!container) {
            console.warn(`Container not found for player ${player.id}`);
            if (onComplete) onComplete();
            return;
        }

        // Get round score and total score elements
        const roundScoreElement = container.querySelector('.player-header .round-value');
        const totalScoreElement = container.querySelector('.player-header .score-value');

        if (!roundScoreElement || !totalScoreElement) {
            console.warn(`Score elements not found for player ${player.id}`);
            if (onComplete) onComplete();
            return;
        }

        // Get positions for animation
        const roundRect = roundScoreElement.getBoundingClientRect();
        const totalRect = totalScoreElement.getBoundingClientRect();

        // Create flying "+X" points element
        const flyingPoints = document.createElement('div');
        flyingPoints.className = 'flying-points';
        flyingPoints.textContent = `+${roundPoints}`;
        flyingPoints.style.cssText = `
            position: fixed;
            left: ${roundRect.left + (roundRect.width / 2)}px;
            top: ${roundRect.top - 10}px;
            font-size: ${isMobile ? '1.4em' : '1.2em'};
            font-weight: bold;
            color: #4ade80;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
            z-index: 20000;
            pointer-events: none;
            transform: translateX(-50%);
            opacity: 0;
        `;

        document.body.appendChild(flyingPoints);

        // Store original total score for counting animation
        const originalTotalScore = parseInt(totalScoreElement.textContent) || 0;
        const newTotalScore = originalTotalScore + roundPoints;

        // Animation sequence
        this.performPointTransferSequence(
            flyingPoints, 
            roundRect, 
            totalRect, 
            totalScoreElement, 
            originalTotalScore, 
            newTotalScore,
            roundScoreElement,
            isMobile, 
            onComplete
        );
    }

    performPointTransferSequence(flyingPoints, roundRect, totalRect, totalScoreElement, originalTotal, newTotal, roundScoreElement, isMobile, onComplete) {
        // Step 1: Show "+X" appearing above round score (500ms)
        requestAnimationFrame(() => {
            flyingPoints.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
            flyingPoints.style.opacity = '1';
            flyingPoints.style.transform = 'translateX(-50%) translateY(-20px) scale(1.2)';
        });

        setTimeout(() => {
            // Step 2: Fly from round score to total score (800ms)
            const deltaX = (totalRect.left + totalRect.width / 2) - (roundRect.left + roundRect.width / 2);
            const deltaY = (totalRect.top - 10) - (roundRect.top - 10);
            
            flyingPoints.style.transition = 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            flyingPoints.style.transform = `translateX(-50%) translate(${deltaX}px, ${deltaY}px) scale(0.9)`;
            
            // Add slight rotation for natural movement
            if (isMobile) {
                flyingPoints.style.transform += ' rotate(-3deg)';
            }

            // Step 3: Start counting animation on total score (concurrent with fly)
            setTimeout(() => {
                this.animateNumberCounting(totalScoreElement, originalTotal, newTotal, 600);
                
                // Add haptic feedback on mobile
                if (isMobile && navigator.vibrate) {
                    navigator.vibrate(50);
                }
            }, 200); // Start counting slightly after fly begins

        }, 500); // Wait for appear animation

        setTimeout(() => {
            // Step 4: Fade out "+X" and round score (300ms)
            flyingPoints.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
            flyingPoints.style.opacity = '0';
            flyingPoints.style.transform += ' scale(1.5)'; // Expand as it fades

            // Fade round score to 0 
            if (roundScoreElement) {
                roundScoreElement.style.transition = 'all 0.3s ease-out';
                roundScoreElement.style.opacity = '0.5';
                roundScoreElement.textContent = '0';
                
                setTimeout(() => {
                    roundScoreElement.style.opacity = '1';
                }, 300);
            }

        }, 1300); // After fly animation (500 + 800)

        setTimeout(() => {
            // Step 5: Cleanup and complete (1900ms total)
            if (flyingPoints.parentNode) {
                flyingPoints.parentNode.removeChild(flyingPoints);
            }
            
            if (onComplete) onComplete();
        }, 1900);
    }

    animateNumberCounting(element, startValue, endValue, duration) {
        const startTime = performance.now();
        
        const updateNumber = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Use easeOutCubic for smooth counting feel
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            const currentValue = Math.round(startValue + (endValue - startValue) * easeProgress);
            
            element.textContent = currentValue;
            
            // Add subtle scale effect during counting
            const scale = 1 + (Math.sin(progress * Math.PI) * 0.1); // Pulse effect
            element.style.transform = `scale(${scale})`;
            
            if (progress < 1) {
                requestAnimationFrame(updateNumber);
            } else {
                // Ensure final value and reset scale
                element.textContent = endValue;
                element.style.transform = 'scale(1)';
            }
        };
        
        requestAnimationFrame(updateNumber);
    }

    // Animate All Players Point Transfer (called from endRound)
    animateAllPlayersPointTransfer(players, onAllComplete) {
        let completedCount = 0;
        const totalPlayers = players.length;
        
        const checkComplete = () => {
            completedCount++;
            if (completedCount >= totalPlayers && onAllComplete) {
                onAllComplete();
            }
        };

        // Animate each player with staggered timing (200ms apart)
        players.forEach((player, index) => {
            setTimeout(() => {
                this.animatePointTransfer(player, player.roundScore, checkComplete);
            }, index * 200); // 200ms stagger between players
        });
    }
}

// Export singleton instance
export const gameAnimations = new GameAnimations();

// Expose animation functions globally for integration with main game
window.gameAnimations = gameAnimations;
window.Flip7AnimatePointTransfer = (players, onAllComplete) => {
    gameAnimations.animateAllPlayersPointTransfer(players, onAllComplete);
};