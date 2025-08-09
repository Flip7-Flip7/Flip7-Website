# Flip 7 Modular System Guide

## Overview
The Flip 7 game is now organized into a professional modular architecture. This guide explains how to use it effectively with Claude (me) to develop specific features without breaking others.

## Architecture Structure

```
game/
├── core/           # Core game logic
├── cards/          # Card-related functionality  
├── ai/             # AI player logic
└── config/         # Game configuration

ui/
├── display/        # Display/rendering logic
├── animations/     # Animation systems
├── mobile/         # Mobile-specific features
└── components/     # Reusable UI components

events/             # Event system for module communication
utils/              # Utility functions
```

## How Modules Communicate

All modules communicate through the **EventBus** system:

```javascript
// Emit an event
gameEventBus.emit(GameEvents.PLAYER_HIT, { player: player, card: card });

// Listen for an event
gameEventBus.on(GameEvents.PLAYER_HIT, (data) => {
    console.log(`${data.player.name} drew ${data.card.display}`);
});
```

## Step-by-Step Guide to Working with Claude

### 1. **Identify What You Want to Change**

Before asking me to make changes, identify:
- What feature/bug you want to work on
- Which module(s) it likely affects
- Whether it's game logic, UI, or both

**Example Request:**
"I want to add a new special card called 'Shield' that protects from one bust like Second Chance"

### 2. **Ask Me to Analyze the Relevant Modules**

I can help you understand which modules are involved:

**You:** "Which modules would be affected by adding a new Shield card?"

**Me:** I would identify:
- `Card.js` - Add shield card type
- `Deck.js` - Add shield cards to deck
- `CardManager.js` - Handle shield card logic
- `Player.js` - Track shield status
- `DisplayManager.js` - Show shield status
- `GameEvents.js` - Add shield-related events

### 3. **Work on One Module at a Time**

Focus on implementing changes module by module:

**You:** "Let's start by adding the Shield card to the Card class and Deck"

**Me:** I'll modify only those specific files without touching other modules.

### 4. **Test Incrementally**

After each module change:
- The game should still work (legacy game.js provides fallback)
- Test the specific feature
- Check browser console for errors

### 5. **Use Events for New Features**

When adding new features, use events to keep modules decoupled:

**You:** "Now let's make the shield card show a special animation when activated"

**Me:** I'll emit a new event like `SHIELD_ACTIVATED` that the animation module can listen for.

## Common Development Patterns

### Adding a New Card Type

1. **Define the card** in `GameConstants.js`:
```javascript
CARDS: {
    ACTIONS: {
        SHIELD: { value: 'shield', count: 4 }
    }
}
```

2. **Add to Deck** in `Deck.js`:
```javascript
{ value: 'shield', count: 4 }
```

3. **Handle card logic** in `CardManager.js`:
```javascript
if (card.value === 'shield') {
    player.hasShield = true;
}
```

4. **Emit events** for UI updates:
```javascript
this.eventBus.emit('shield:activated', { player });
```

### Adding a New UI Feature

1. **Create event** in `GameEvents.js`:
```javascript
FEATURE_ACTIVATED: 'feature:activated'
```

2. **Listen in DisplayManager**:
```javascript
this.eventBus.on(GameEvents.FEATURE_ACTIVATED, this.showFeature.bind(this));
```

3. **Implement display logic**:
```javascript
showFeature(data) {
    // Update UI elements
}
```

### Modifying AI Behavior

1. **Create new AI strategy** in `ai/AIStrategy.js`
2. **Use events** to communicate decisions
3. **Keep AI logic separate** from game rules

## Best Practices

### 1. **Always Use Events**
Don't directly call methods between modules. Use events:
```javascript
// Good
this.eventBus.emit(GameEvents.SCORE_UPDATE, { score: 100 });

// Bad
displayManager.updateScore(100);
```

### 2. **Keep Modules Focused**
Each module should have a single responsibility:
- `Card.js` - Only card representation
- `Deck.js` - Only deck management
- `Player.js` - Only player state

### 3. **Test Events in Console**
You can test events directly in browser console:
```javascript
gameEventBus.emit(GameEvents.PLAYER_BUST, { player: { name: 'Test' } });
```

### 4. **Use GameConstants**
Don't hardcode values:
```javascript
// Good
if (score >= GameConstants.WINNING_SCORE)

// Bad
if (score >= 200)
```

## Working with Legacy Code

The current `game.js` still contains the full game implementation. To migrate a feature:

1. **Identify the feature** in game.js
2. **Create new module** or update existing
3. **Move logic** piece by piece
4. **Replace with event emission** in game.js
5. **Test thoroughly**

## Example Migration

**You:** "I want to move the freeze card logic to the new modular system"

**Me:** I would:
1. Find freeze logic in game.js
2. Move it to CardActions.js (new module)
3. Update CardManager to use CardActions
4. Emit FREEZE_CARD_USED event
5. Update DisplayManager to show freeze animation
6. Test the feature still works

## Debugging Tips

### Check Module Loading
```javascript
console.log(window.Flip7); // Should show all loaded modules
```

### Monitor Events
```javascript
gameEventBus.debug = true; // Enable event logging
```

### Test Individual Modules
```javascript
const testPlayer = new Player({ name: 'Test' });
console.log(testPlayer.getState());
```

## Common Issues and Solutions

### "X is not defined"
- Module didn't load properly
- Check browser console for load errors
- Verify module exports itself globally

### Events not firing
- Check event name matches exactly
- Verify listener is set up before emission
- Use debug mode to trace events

### UI not updating
- Ensure DisplayManager is listening for the event
- Check if mobile sync is needed
- Verify element IDs match

## Next Steps

1. **Complete remaining modules** - Ask me to create specific modules you need
2. **Migrate features gradually** - Move one feature at a time from game.js
3. **Add new features** - Use the modular system for all new development
4. **Enhance existing modules** - Add more functionality as needed

## Remember

- **You don't need to understand everything** - Just tell me what you want to change
- **Modules are independent** - Changes to one won't break others
- **Events are the glue** - They connect modules without coupling
- **Test incrementally** - Small changes are easier to debug
- **Ask for clarification** - I can explain any part in more detail

This modular system makes your code professional, maintainable, and scalable. You can now focus on specific features without worrying about breaking others!