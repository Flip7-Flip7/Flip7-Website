/**
 * GameConstants - Central location for all game configuration and constants
 */
const GameConstants = {
    // Game Rules
    WINNING_SCORE: 200,
    FLIP7_BONUS: 15,
    FLIP7_CARD_COUNT: 7,
    
    // Player Configuration
    MAX_PLAYERS: 4,
    HUMAN_PLAYER_INDEX: 0,
    
    // AI Configuration
    AI_NAMES: ['AI Bot 1', 'AI Bot 2', 'AI Bot 3'],
    AI_DECISION_DELAY: 1200,
    AI_EXTRA_DELAY_MOBILE: 2000,
    AI_EXTRA_DELAY_DESKTOP: 1500,
    
    // Animation Timings (in milliseconds)
    ANIMATIONS: {
        CARD_FLIP_DURATION: 1000,
        CARD_FLIP_DURATION_MOBILE: 800,
        CARD_SLIDE_DURATION: 500,
        BUST_ANIMATION_DURATION: 1000,
        FREEZE_ANIMATION_DURATION: 2000,
        FLIP3_CARD_DELAY: 2000,
        FLIP7_CELEBRATION_DURATION: 3000,
        TURN_HIGHLIGHT_DELAY: 800
    },
    
    // Card Distribution
    CARDS: {
        NUMBERS: {
            MIN: 0,
            MAX: 12,
            COUNT_PER_VALUE: 4
        },
        MODIFIERS: {
            PLUS_2: { value: 2, count: 8 },
            PLUS_4: { value: 4, count: 8 },
            PLUS_6: { value: 6, count: 6 },
            PLUS_8: { value: 8, count: 4 },
            PLUS_10: { value: 10, count: 2 },
            MULTIPLIER: { value: 'x2', count: 4 },
            SECOND_CHANCE: { value: 'second chance', count: 6 }
        },
        ACTIONS: {
            FREEZE: { value: 'freeze', count: 4 },
            FLIP3: { value: 'flip3', count: 4 }
        }
    },
    
    // Player Status Values
    PLAYER_STATUS: {
        WAITING: 'waiting',
        ACTIVE: 'active',
        STAYED: 'stayed',
        BUSTED: 'busted',
        FROZEN: 'frozen',
        FLIP7: 'flip7'
    },
    
    // UI Classes
    UI_CLASSES: {
        CURRENT_TURN: 'current-turn',
        DEALER: 'dealer',
        BUSTED: 'busted',
        FROZEN: 'frozen',
        DUPLICATE_CARD: 'duplicate-card',
        SHOW_BUTTONS: 'show-buttons',
        INACTIVE: 'inactive'
    },
    
    // Mobile Breakpoints
    BREAKPOINTS: {
        MOBILE: 1024,
        TABLET: 768
    },
    
    // Z-Index Layers
    Z_INDEX: {
        CARD: 10,
        ANIMATED_CARD: 150,
        CENTER_ANIMATION: 200,
        MODAL: 1000,
        CELEBRATION: 2000
    },
    
    // Local Storage Keys
    STORAGE_KEYS: {
        PLAYER_NAME: 'flip7_player_name',
        HIGH_SCORE: 'flip7_high_score',
        SETTINGS: 'flip7_settings'
    },
    
    // Debug Settings
    DEBUG: {
        ENABLE_LOGGING: false,
        SHOW_AI_THINKING: false,
        INSTANT_ANIMATIONS: false
    }
};

// Freeze to prevent modifications
Object.freeze(GameConstants);

// Deep freeze nested objects
Object.keys(GameConstants).forEach(key => {
    if (typeof GameConstants[key] === 'object') {
        Object.freeze(GameConstants[key]);
        Object.keys(GameConstants[key]).forEach(nestedKey => {
            if (typeof GameConstants[key][nestedKey] === 'object') {
                Object.freeze(GameConstants[key][nestedKey]);
            }
        });
    }
});

// Make available globally
window.GameConstants = GameConstants;