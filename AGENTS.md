# Repository Guidelines

## Project Structure & Module Organization
- `index.html`: Main page, loads scripts in order.
- `app.js`: App bootstrap; exposes `window.Flip7` and wiring.
- `src/events`: Event bus and event constants.
- `src/game`: Core game logic (`core`, `cards`, `managers`, `config`).
- `src/ui`: Display managers and CSS (`display/`, `styles/`).
- `src/utils`: Debug helpers.
- `images/`: Game assets.
- `server.py`: Local HTTP server with no‑cache headers.

## Build, Test, and Development Commands
- Run locally: `python3 server.py` → http://localhost:8080
- Quick static preview: open `index.html` directly in a browser (module order must match `<script>` tags).
- Module sanity check: open DevTools console and run `Flip7.testModules()`.

## Coding Style & Naming Conventions
- JavaScript: ES6 classes, 4‑space indent, semicolons, strict equality, JSDoc comments.
- File names: Classes in `PascalCase` (e.g., `GameEngine.js`), helpers in `CamelCase` or `PascalCase` to match existing patterns; directories are lowercase.
- CSS: Kebab‑case files grouped by `core/`, `components/`, `layout/`, `mobile/`.
- Globals: Expose only via `window.Flip7` as done in `app.js`.
- Imports: Scripts are loaded via `<script>` tags in `index.html`; maintain dependency order.

## Testing Guidelines
- No formal test framework yet. Validate by:
  - Running a round locally and checking UI/turn flow.
  - Console checks: `Flip7.engine.getGameState()` and `Flip7.testModules()`.
  - Mobile sanity: resize < 768px or test on device.

## Commit & Pull Request Guidelines
- Commits: Imperative mood, concise scope first (e.g., `Fix`, `Refactor`, `Add`). Examples from history: “Refactor GameEngine into modular architecture”, “Fix animation and game flow issues”.
- PRs should include:
  - Purpose and summary of changes
  - Screenshots/GIFs (desktop and mobile) for UI updates
  - Steps to reproduce and verify
  - Linked issues and any follow‑ups

## Architecture Notes & Tips
- Event‑driven: `EventBus` + `GameEvents` coordinate modules.
- When adding a module:
  - Place code under the appropriate `src/` subfolder.
  - Add `<script>` to `index.html` in dependency order before `app.js`.
  - If UI‑related, update or add CSS in the matching `styles` group.
