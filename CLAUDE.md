# Flip 7 Card Game - Project Documentation

## Project Overview
Flip 7 is a web-based card game where players collect number cards (0-12) without duplicates. The goal is to get exactly 7 unique number cards for a bonus, or accumulate points strategically. The game features AI opponents and is primarily designed for mobile devices.

## Project Structure
```
src/
├── game/
│   ├── core/
│   │   ├── GameEngine.js - Main game controller (rounds, turns, game flow)
│   │   └── Player.js - Player state and card management
│   ├── cards/
│   │   ├── Card.js - Card representation with image support
│   │   ├── CardManager.js - Card operations and special actions
│   │   └── Deck.js - Deck management
│   └── config/
│       └── GameConstants.js - Game configuration and constants
├── events/
│   ├── EventBus.js - Event system for module communication
│   └── GameEvents.js - Event definitions
└── ui/
    └── display/
        └── DisplayManager.js - UI updates and visual feedback
```

## Key Files
- **index.html** - Main HTML file with game structure and mobile-optimized inline CSS
- **styles.css** - Additional styling with responsive design and mobile media queries
- **server.py** - Local development server with cache-busting headers
- **images/** - Card images and game assets
- **rules.md** - Complete game rules documentation

## Development Workflow

### Local Testing
```bash
# Start local server (cache-busting)
python3 server.py
# Access at: http://localhost:8080/new
```

### Mobile Testing
- Primary testing done on mobile devices (Safari/Chrome)
- Use Chrome incognito mode to avoid caching issues
- Desktop testing with browser dev tools mobile simulation

### Deployment  
- Repository: https://github.com/Flip7-Flip7/Flip7-Website.git
- Deployment: GitHub Pages (CDN propagation: 10-15 minutes)
- Cache busting: Update version parameters in index.html when files change
- **IMPORTANT**: Always commit and push changes immediately after fixing issues
- Commit with descriptive messages and push to origin/main for automatic deployment

## Architecture Overview

### Event-Driven Design
The game uses an event-driven architecture with EventBus for decoupled communication between modules:
- **GameEngine** emits game state events (round start, turn changes, etc.)
- **CardManager** handles card operations and emits card-related events
- **DisplayManager** subscribes to events and updates the UI accordingly

### Game Flow
1. **Initialization**: GameEngine creates Deck, CardManager, and Players
2. **Round Start**: Deal initial cards (pauses for action cards), rotate dealer
3. **Turn Loop**: Players hit/stay, AI makes decisions, special cards trigger events
4. **Round End**: Calculate scores, check for winner.
5. **Game End**: Display winner, allow restart

### Special Card Mechanics
- **Second Chance**: Auto-protects from one duplicate, max 1 per player
- **Freeze**: Target player frozen (keeps points but can't play)
- **Flip Three**: Force target to draw 3 cards (stops on bust)
- Action cards during initial deal pause dealing for immediate use

## Mobile-First Design
- Game primarily designed for mobile devices
- Uses `.mobile-game-board` elements from styles.css  
- Media query: `@media (max-width: 768px)`
- Responsive layout with touch-friendly buttons
