/**
 * GameEvents - Defines all game-related events for the EventBus
 */
const GameEvents = {
    // Game State Events
    GAME_START: 'game:start',
    GAME_END: 'game:end',
    ROUND_START: 'round:start',
    ROUND_END: 'round:end',
    
    // Turn Events
    TURN_START: 'turn:start',
    TURN_END: 'turn:end',
    
    // Player Events
    PLAYER_HIT: 'player:hit',
    PLAYER_STAY: 'player:stay',
    PLAYER_STAY_COMPLETED: 'player:stayCompleted',
    PLAYER_BUST: 'player:bust',
    PLAYER_FLIP7: 'player:flip7',
    PLAYER_FROZEN: 'player:frozen',
    PLAYER_SCORE_UPDATE: 'player:scoreUpdate',
    
    // Card Events
    CARD_DRAWN: 'card:drawn',
    CARD_DEALT: 'card:dealt',
    CARD_ANIMATION_END: 'card:animationEnd',
    
    // Initial Deal Flow Events
    INITIAL_DEAL_START: 'initialDeal:start',
    INITIAL_DEAL_PAUSED: 'initialDeal:paused',
    INITIAL_DEAL_ACTION_REQUIRED: 'initialDeal:actionRequired',
    INITIAL_DEAL_RESUMED: 'initialDeal:resumed',
    INITIAL_DEAL_COMPLETE: 'initialDeal:complete',
    
    // Special Card Events
    FREEZE_CARD_USED: 'freezeCard:used',
    FLIP3_CARD_USED: 'flip3Card:used',
    FLIP3_CARD_DEALT: 'flip3:cardDealt',
    FLIP3_ANIMATION_COMPLETE: 'flip3:animationComplete',
    SECOND_CHANCE_ACTIVATED: 'secondChance:activated',
    SECOND_CHANCE_ANIMATION_COMPLETE: 'secondChance:animationComplete',
    SECOND_CHANCE_ACQUIRED: 'secondChance:acquired',
    SECOND_CHANCE_GIVEN: 'secondChance:given',
    ACTION_CARD_TARGET_NEEDED: 'actionCard:targetNeeded',
    ACTION_CARD_TARGET_SELECTED: 'actionCard:targetSelected',
    
    
    // AI Events
    AI_DECISION_MADE: 'ai:decisionMade',
    
    // UI Events
    UI_UPDATE_NEEDED: 'ui:updateNeeded',
    MOBILE_SYNC_NEEDED: 'mobile:syncNeeded',
    
    
    // Cross-module coordination events
    REQUEST_INITIAL_DEAL: 'coordination:requestInitialDeal',
    REQUEST_NEXT_TURN: 'coordination:requestNextTurn',
    EXECUTE_HIT: 'coordination:executeHit',
    ACTION_CARD_DRAWN: 'coordination:actionCardDrawn',
    ACTION_CARD_EXECUTION_COMPLETE: 'coordination:actionCardExecutionComplete',
    FLIP3_PROCESSING_COMPLETE: 'coordination:flip3ProcessingComplete',
    ROUND_SHOULD_END: 'coordination:roundShouldEnd'
};

// Freeze to prevent modifications
Object.freeze(GameEvents);

// Make available globally
window.GameEvents = GameEvents;
