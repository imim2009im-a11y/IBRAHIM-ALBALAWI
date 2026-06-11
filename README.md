# Command Pattern Simulator

Interactive React + TypeScript simulator for understanding the **Command Pattern** through a visual playground.

The app demonstrates command history, undo/redo, macro commands, safe rollback behavior, a simulated file system, a simulated user database, and live state tracking.

## Features

- Visual Command Pattern workflow
- Command history with undo/redo
- Macro command builder
- Simulated file system and database operations
- Rollback behavior for failed operations
- Code snippets and architecture explanation
- Local session persistence using browser `localStorage`

## Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Lucide React
- Motion

## Run Locally

```bash
npm install
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Build

```bash
npm run build
```

## Preview Production Build

```bash
npm run preview
```

## GitHub Pages

To deploy with GitHub Pages, add a deployment workflow and set the Vite base path to:

```text
/IBRAHIM-ALBALAWI/
```

If the repository remains private, GitHub Pages availability depends on your GitHub account and repository settings.

## Security Notes

- Real `.env` files are ignored by Git.
- `.env.example` contains placeholders only.
- Do not commit real API keys or production secrets.

## Project Owner

Built as an independent project for **Ibrahim Albalawi**.
