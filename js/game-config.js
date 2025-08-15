// Flip 7 Game Configuration
// Constants and settings for the game

export const GAME_CONFIG = {
    // Game Settings
    DEFAULT_WINNING_SCORE: 200,
    DEFAULT_ROUND_NUMBER: 1,
    
    // Deck Composition
    DECK_SETUP: {
        // Number cards (0-12, 8 copies each)
        NUMBER_CARDS: {
            range: [0, 12],
            copies: 8
        },
        
        // Action cards (3 copies each)
        ACTION_CARDS: [
            { type: 'action', value: 'freeze', display: 'Freeze', copies: 3 },
            { type: 'action', value: 'flip3', display: 'Flip Three', copies: 3 },
            { type: 'action', value: 'second_chance', display: 'Second Chance', copies: 3 }
        ],
        
        // Modifier cards
        MODIFIER_CARDS: [
            { type: 'modifier', value: 2, display: '+2', copies: 6 },
            { type: 'modifier', value: 4, display: '+4', copies: 5 },
            { type: 'modifier', value: 6, display: '+6', copies: 4 },
            { type: 'modifier', value: 8, display: '+8', copies: 3 },
            { type: 'modifier', value: 10, display: '+10', copies: 2 },
            { type: 'modifier', value: 'x2', display: 'x2', copies: 1 }
        ]
    },
    
    // Game Rules
    RULES: {
        FLIP7_BONUS: 15,
        BUST_SCORE: 0,
        MAX_PLAYERS: 4,
        CARDS_FOR_FLIP7: 7
    },
    
    // Timing Configuration (in milliseconds)
    TIMING: {
        CARD_FLIP_DURATION: 600,
        SLIDE_ANIMATION_MOBILE: 600,
        SLIDE_ANIMATION_DESKTOP: 600,
        AI_TURN_DELAY: 800,
        ROUND_END_DELAY: 2000,
        FLIP3_CARD_DELAY: 1500,
        AUTOSTART_PRIMARY: 500,
        AUTOSTART_SECONDARY: 1500
    },
    
    // Mobile/Desktop Configuration
    RESPONSIVE: {
        MOBILE_BREAKPOINT: 1024,
        MOBILE_CARD_SIZE: {
            width: 85,
            height: 119,
            fontSize: '1.5em'
        },
        MOBILE_ANIMATION_CARD_SIZE: {
            width: 120,
            height: 168,
            fontSize: '2em'
        },
        DESKTOP_CARD_SIZE: {
            scale: 0.8
        }
    },
    
    // Player Configuration
    PLAYERS: {
        DEFAULT_HUMAN_NAME: "Player",
        AI_NAMES: ["AI Bot 1", "AI Bot 2", "AI Bot 3"]
    }
};

// Export individual constants for backward compatibility
export const DEFAULT_WINNING_SCORE = GAME_CONFIG.DEFAULT_WINNING_SCORE;
export const FLIP7_BONUS = GAME_CONFIG.RULES.FLIP7_BONUS;
export const MOBILE_BREAKPOINT = GAME_CONFIG.RESPONSIVE.MOBILE_BREAKPOINT;