# Tale Weaver

Tale Weaver is an AI-powered ecosystem simulator and narrative playground built with Next.js. The app generates dynamic world narration using the current game state and displays it alongside heads‑up information like score and level.

![screenshot](./screenshot.png)

## Features

- **World Narration** – AI describes the evolving game world.
- **Adaptive Narration** – game state is fed back into the model for personalized stories.
- **Narrative Display** – snippets appear in a dedicated narrator panel.
- **Game Status HUD** – essential info like score and level stays visible.
- **Benchmark Tools** – run stress tests via the `benchmarks` folder.

## Setup

```bash
npm install
npm run dev
```

The development server runs on port 9002.

## Project Structure

Next.js now looks for its App Router under `src/app/`. The previous `app/`
directory has been moved to `legacy-app/` and is no longer used by the
framework.

## Usage

Create a production build:

```bash
npm run build
```

Start the built server:

```bash
npm run start
```

Run tests:

```bash
npm test
```

Format all files:

```bash
npm run format
```

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
