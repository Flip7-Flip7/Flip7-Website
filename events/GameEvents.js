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
    PLAYER_BUST: 'player:bust',
    PLAYER_FLIP7: 'player:flip7',
    PLAYER_FROZEN: 'player:frozen',
    PLAYER_SCORE_UPDATE: 'player:scoreUpdate',
    
    // Card Events
    CARD_DRAWN: 'card:drawn',
    CARD_DEALT: 'card:dealt',
    CARD_ANIMATION_START: 'card:animationStart',
    CARD_ANIMATION_END: 'card:animationEnd',
    
    // Special Card Events
    ACTION_CARD_USED: 'actionCard:used',
    FREEZE_CARD_USED: 'freezeCard:used',
    FLIP3_CARD_USED: 'flip3Card:used',
    SECOND_CHANCE_ACTIVATED: 'secondChance:activated',
    
    // AI Events
    AI_THINKING: 'ai:thinking',
    AI_DECISION_MADE: 'ai:decisionMade',
    
    // UI Events
    UI_UPDATE_NEEDED: 'ui:updateNeeded',
    MOBILE_SYNC_NEEDED: 'mobile:syncNeeded',
    ANIMATION_COMPLETE: 'animation:complete',
    
    // Score Events
    SCORE_CALCULATED: 'score:calculated',
    WINNING_SCORE_REACHED: 'score:winningReached'
};

// Freeze to prevent modifications
Object.freeze(GameEvents);