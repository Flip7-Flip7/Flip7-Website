# Flip 7 Card Game - Project Documentation

## Project Overview
Flip 7 is a web-based card game where players collect number cards (0-12) without duplicates. The goal is to get exactly 7 unique number cards for a bonus, or accumulate points strategically. The game features AI opponents and is primarily designed for mobile devices.

## Key Files
- **index.html** - Main HTML file with game structure and mobile-optimized inline CSS
- **game.js** - Core game logic, AI behavior, and autostart functionality  
- **styles.css** - Additional styling with responsive design and mobile media queries
- **server.py** - Local development server with cache-busting headers
- **images/** - Card images and game assets

## Development Workflow
# Lint and style
# Check for issues and fix automatically
python -m ruff check src/ tests/ --fix
python -m ruff format src/ tests/

# Typecheck (only done for src/)
python -m mypy src/

# Run all tests
python -m pytest tests/

# Run specific test file
python -m pytest tests/test_client.py

### Local Testing
```bash
# Start local server (cache-busting)
python3 server.py
# Access at: http://localhost:8080

# Alternative simple server
python3 -m http.server 8081
```

### Mobile Testing
- Primary testing done on mobile devices (Safari/Chrome)
- Use Chrome incognito mode to avoid caching issues
- Desktop testing with browser dev tools mobile simulation

### Deployment  
- Repository: https://github.com/Flip7-Flip7/Flip7-Website.git
- Deployment: GitHub Pages (CDN propagation: 10-15 minutes)
- Cache busting: Update version parameters in index.html when files change

## Current Issues & Status

### ❌ Autostart Not Working
**Problem**: Game should autostart when page loads but currently doesn't  
**Debug Status**: Added console.log statements to track execution  
**Check**: Browser console for debug messages:
- "Setting up DOMContentLoaded listener..."  
- "DOM loaded! Creating Flip7Game instance..."
- "Flip7Game constructor called"
- "Auto-start timeout fired! Starting game..."

**Recent Fixes Attempted**:
- ✅ Added null checks to prevent addEventListener errors
- ✅ Removed problematic inline CSS that hid mobile elements
- ✅ Updated cache-busting version parameters
- 🔄 Currently debugging with console output

### ✅ Recent Successful Changes  
- Removed white/grey overlay boxes from player containers
- Fixed mobile layout by removing conflicting inline CSS  
- Added glass-morphism styling for Hit/Stay buttons
- Cleaned up debug console.log statements (later re-added for debugging)

## Cache Management
**Problem**: Mobile browsers aggressively cache files even with version parameters
**Solution**: Update these lines in index.html when making changes:
```html
<link rel="stylesheet" href="styles.css?v=11.0&t=20250808">
<script src="game.js?v=4.0&t=20250808">
```
Increment version numbers and update timestamp.

## Mobile-First Design
- Game primarily designed for mobile devices
- Uses `.mobile-game-board` elements from styles.css  
- Media query: `@media (max-width: 768px)`
- Responsive layout with touch-friendly buttons

## Game Architecture
- **Flip7Game class**: Main game controller
- **Players array**: Human player (index 0) + 3 AI opponents  
- **Autostart flow**: DOMContentLoaded → new Flip7Game() → 500ms delay → startNewGame()
- **Event listeners**: Safely added with null checks to prevent errors

## Testing Checklist
- [ ] Game autostarts on page load
- [ ] Mobile layout displays correctly  
- [ ] Hit/Stay buttons are functional and styled
- [ ] Player containers are properly sized
- [ ] No JavaScript console errors
- [ ] Works in Chrome incognito mode
- [ ] Responsive on actual mobile devices

## Notes
- Always test in mobile Chrome incognito to avoid cache issues
- Wait 10-15 minutes after git push for GitHub Pages deployment
- Check browser console for JavaScript errors when debugging
- Mobile Safari can be more aggressive with caching than Chrome