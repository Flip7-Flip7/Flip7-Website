// GameEvents.js - Event constants for the Flip 7 game

export const GameEvents = {
    // Game lifecycle events
    GAME_STARTED: 'game:started',
    GAME_ENDED: 'game:ended',
    ROUND_STARTED: 'round:started',
    ROUND_ENDED: 'round:ended',
    NEW_GAME_REQUESTED: 'game:newGameRequested',
    
    // Player turn events
    TURN_STARTED: 'turn:started',
    TURN_ENDED: 'turn:ended',
    PLAYER_ACTION_HIT: 'player:hit',
    PLAYER_ACTION_STAY: 'player:stay',
    
    // AI events
    AI_TURN_REQUESTED: 'ai:turnRequested',
    AI_ACTION_TAKEN: 'ai:actionTaken',
    
    // Card events
    CARD_DRAWN: 'card:drawn',
    CARD_DEALT: 'card:dealt',
    CARD_ADDED_TO_HAND: 'card:added',
    CARD_DISCARDED: 'card:discarded',
    ACTION_CARD_DRAWN: 'card:actionDrawn',
    
    // Special card actions
    ACTION_FREEZE: 'action:freeze',
    ACTION_FLIP3: 'action:flip3',
    ACTION_SECOND_CHANCE: 'action:secondChance',
    SPECIAL_ACTION_COMPLETED: 'action:completed',
    
    // Game state events
    PLAYER_BUSTED: 'player:busted',
    PLAYER_FROZEN: 'player:frozen',
    PLAYER_STAYED: 'player:stayed',
    FLIP7_ACHIEVED: 'player:flip7',
    SECOND_CHANCE_USED: 'player:secondChanceUsed',
    
    // Score events
    SCORE_UPDATED: 'score:updated',
    ROUND_SCORE_CALCULATED: 'score:roundCalculated',
    
    // UI events
    ANIMATION_STARTED: 'animation:started',
    ANIMATION_COMPLETED: 'animation:completed',
    MODAL_OPENED: 'modal:opened',
    MODAL_CLOSED: 'modal:closed',
    
    // Mobile events
    MOBILE_SYNC_REQUIRED: 'mobile:syncRequired',
    
    // Drag and drop events
    DRAG_STARTED: 'drag:started',
    DRAG_ENDED: 'drag:ended',
    DROP_COMPLETED: 'drop:completed',
    
    // Log events
    LOG_MESSAGE: 'log:message',
    
    // Display update events
    DISPLAY_UPDATE_REQUIRED: 'display:updateRequired',
    SCOREBOARD_UPDATE: 'display:scoreboardUpdate',
    CARDS_REMAINING_UPDATE: 'display:cardsRemainingUpdate'
};

// Helper function to create event data objects
export const createEventData = {
    playerAction: (playerId, action, data = {}) => ({
        playerId,
        action,
        timestamp: Date.now(),
        ...data
    }),
    
    cardEvent: (card, playerId, action) => ({
        card,
        playerId,
        action,
        timestamp: Date.now()
    }),
    
    scoreUpdate: (playerId, roundScore, totalScore) => ({
        playerId,
        roundScore,
        totalScore,
        timestamp: Date.now()
    }),
    
    animation: (type, target, duration = 0) => ({
        type,
        target,
        duration,
        timestamp: Date.now()
    })
};

// Export for both ES6 modules and global access
export default GameEvents;
window.GameEvents = GameEvents;
window.createEventData = createEventData;