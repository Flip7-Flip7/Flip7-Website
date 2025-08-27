// MobileStyles.js - Essential mobile styling for modular system

export class MobileStyles {
    constructor() {
        this.initialize();
    }

    initialize() {
        if (typeof window !== 'undefined' && document.head) {
            this.injectMobileStyles();
            console.log('📱 MobileStyles: Mobile CSS injected');
        }
    }

    injectMobileStyles() {
        const styleElement = document.createElement('style');
        styleElement.id = 'modular-mobile-styles';
        styleElement.textContent = this.getMobileCSS();
        document.head.appendChild(styleElement);
    }

    getMobileCSS() {
        return `
/* Modular Mobile Styles - Essential UI for game logic testing */

/* Mobile Player Containers */
@media (max-width: 1024px) {
    #mobile-player,
    #mobile-opponent1,
    #mobile-opponent2,
    #mobile-opponent3 {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        border: 2px solid rgba(255, 255, 255, 0.2);
        margin: 8px 0;
        padding: 12px;
        min-height: 80px;
        position: relative;
        transition: all 0.3s ease;
    }

    /* Current Turn Highlight */
    #mobile-player.current-turn,
    #mobile-opponent1.current-turn,
    #mobile-opponent2.current-turn,
    #mobile-opponent3.current-turn {
        border-color: #ffeb3b;
        box-shadow: 0 0 15px rgba(255, 235, 59, 0.6);
        background: rgba(255, 235, 59, 0.15);
    }

    /* Player Info Display */
    .mobile-player-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        font-weight: bold;
    }

    .mobile-player-name {
        font-size: 16px;
        color: white;
    }

    .mobile-player-scores {
        display: flex;
        gap: 12px;
        font-size: 14px;
    }

    .mobile-round-score {
        background: rgba(76, 175, 80, 0.8);
        padding: 4px 8px;
        border-radius: 6px;
        color: white;
        font-weight: bold;
    }

    .mobile-total-score {
        background: rgba(33, 150, 243, 0.8);
        padding: 4px 8px;
        border-radius: 6px;
        color: white;
        font-weight: bold;
    }

    /* Player Status */
    .mobile-player-status {
        font-size: 12px;
        text-transform: uppercase;
        font-weight: bold;
        margin-bottom: 8px;
        padding: 2px 6px;
        border-radius: 4px;
        display: inline-block;
    }

    .mobile-player-status.waiting {
        background: rgba(158, 158, 158, 0.8);
        color: white;
    }

    .mobile-player-status.active {
        background: rgba(76, 175, 80, 0.8);
        color: white;
    }

    .mobile-player-status.stayed {
        background: rgba(255, 152, 0, 0.8);
        color: white;
    }

    .mobile-player-status.busted {
        background: rgba(244, 67, 54, 0.9);
        color: white;
    }

    .mobile-player-status.frozen {
        background: rgba(96, 125, 139, 0.9);
        color: white;
    }

    .mobile-player-status.flip7 {
        background: rgba(156, 39, 176, 0.9);
        color: white;
    }

    /* Card Grid */
    .mobile-cards-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        min-height: 35px;
    }

    .mobile-card {
        width: 32px;
        height: 45px;
        border-radius: 4px;
        border: 1px solid rgba(255, 255, 255, 0.3);
        background: #2c6b7a;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: bold;
        color: white;
        background-size: cover;
        background-position: center;
        position: relative;
    }

    .mobile-card.number {
        background: linear-gradient(135deg, #4CAF50, #388E3C);
    }

    .mobile-card.modifier {
        background: linear-gradient(135deg, #2196F3, #1976D2);
    }

    .mobile-card.action {
        background: linear-gradient(135deg, #FF9800, #F57C00);
    }

    .mobile-card.custom-image {
        background-size: cover !important;
        color: transparent;
    }

    /* New Card Animation */
    .mobile-card.new-card {
        animation: cardPulse 1s ease-out;
    }

    @keyframes cardPulse {
        0% {
            transform: scale(0.8);
            box-shadow: 0 0 0 rgba(255, 235, 59, 0.7);
        }
        50% {
            transform: scale(1.1);
            box-shadow: 0 0 10px rgba(255, 235, 59, 0.7);
        }
        100% {
            transform: scale(1);
            box-shadow: 0 0 0 rgba(255, 235, 59, 0);
        }
    }

    /* Status Indicators */
    .mobile-stayed-indicator,
    .mobile-frozen-indicator {
        position: absolute;
        top: -8px;
        right: 8px;
        background: rgba(255, 152, 0, 0.95);
        color: white;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: bold;
        z-index: 10;
    }

    .mobile-frozen-indicator {
        background: rgba(96, 125, 139, 0.95);
    }

    /* Cards Remaining Counter */
    .mobile-cards-remaining {
        position: fixed;
        top: 10px;
        right: 10px;
        background: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 8px 12px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: bold;
        z-index: 1000;
    }

    /* Simple Draw Animation Area */
    .mobile-animation-overlay {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 9999;
        pointer-events: none;
    }

    .mobile-animated-card {
        width: 60px;
        height: 84px;
        border-radius: 8px;
        background: #2c6b7a;
        border: 2px solid rgba(255, 255, 255, 0.5);
        opacity: 0;
        transform: scale(0.5);
        transition: all 0.6s ease;
    }

    .mobile-animated-card.show {
        opacity: 1;
        transform: scale(1);
    }

    .mobile-animated-card.slide {
        opacity: 0;
        transform: scale(0.3) translateY(-100px);
    }
}

/* Player State Visual Feedback */
@media (max-width: 1024px) {
    #mobile-player.busted,
    #mobile-opponent1.busted,
    #mobile-opponent2.busted,
    #mobile-opponent3.busted {
        background: rgba(244, 67, 54, 0.2);
        border-color: rgba(244, 67, 54, 0.6);
    }

    #mobile-player.stayed,
    #mobile-opponent1.stayed,
    #mobile-opponent2.stayed,
    #mobile-opponent3.stayed {
        background: rgba(255, 152, 0, 0.2);
        border-color: rgba(255, 152, 0, 0.6);
    }

    #mobile-player.frozen,
    #mobile-opponent1.frozen,
    #mobile-opponent2.frozen,
    #mobile-opponent3.frozen {
        background: rgba(96, 125, 139, 0.2);
        border-color: rgba(96, 125, 139, 0.6);
    }

    #mobile-player.flip7,
    #mobile-opponent1.flip7,
    #mobile-opponent2.flip7,
    #mobile-opponent3.flip7 {
        background: rgba(156, 39, 176, 0.2);
        border-color: rgba(156, 39, 176, 0.8);
        animation: flip7Glow 2s ease-in-out infinite alternate;
    }

    @keyframes flip7Glow {
        from {
            box-shadow: 0 0 15px rgba(156, 39, 176, 0.6);
        }
        to {
            box-shadow: 0 0 25px rgba(156, 39, 176, 0.9);
        }
    }
}
        `;
    }

    /**
     * Add animation to newly drawn card
     */
    animateNewCard(cardElement) {
        if (cardElement && window.innerWidth <= 1024) {
            cardElement.classList.add('new-card');
            setTimeout(() => {
                cardElement.classList.remove('new-card');
            }, 1000);
        }
    }

    /**
     * Show simple draw animation
     */
    showDrawAnimation(callback) {
        if (window.innerWidth > 1024) return callback?.();

        // Create animation overlay if it doesn't exist
        let overlay = document.querySelector('.mobile-animation-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'mobile-animation-overlay';
            document.body.appendChild(overlay);
        }

        // Create animated card
        const animatedCard = document.createElement('div');
        animatedCard.className = 'mobile-animated-card';
        overlay.appendChild(animatedCard);

        // Show animation
        setTimeout(() => animatedCard.classList.add('show'), 50);
        
        // Hide and cleanup
        setTimeout(() => {
            animatedCard.classList.add('slide');
            setTimeout(() => {
                animatedCard.remove();
                callback?.();
            }, 300);
        }, 600);
    }
}

// Create and export singleton instance
const mobileStyles = new MobileStyles();
export default mobileStyles;