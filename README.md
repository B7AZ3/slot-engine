# Slot Engine


Example:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Slot Engine Demo</title>
  <style>
    body { margin: 0; overflow: hidden; background: #0a0a1a; }
    #game-container { width: 100vw; height: 100vh; }
  </style>
</head>
<body>
  <div id="game-container"></div>
  <script type="importmap">
    {
      "imports": {
        "slot-engine": "../dist/index.mjs"
      }
    }
  </script>
  <script type="module" src="./main.ts"></script>
</body>
</html>
```

```js
//main.ts
import {
  GameController,
  GameConfig,
  DefaultPlatformBridge,
} from 'slot-engine';

// Define your symbol map
const symbolMap: Record<number, string> = {
  0: 'symbol_small_0',
  1: 'symbol_small_1',
  2: 'symbol_small_2',
  3: 'symbol_small_3',
  4: 'symbol_small_4',
  5: 'symbol_small_5',
  6: 'symbol_small_6',
  7: 'symbol_small_7',
  8: 'symbol_small_8',
  9: 'symbol_small_9',
  10: 'symbol_small_10',
  11: 'symbol_small_11',
  12: 'symbol_small_12',
  13: 'symbol_small_13',
  14: 'symbol_small_14',
  15: 'symbol_small_15',
};

// Define paytable data (example)
const paytableData: Record<number, Record<string, number>> = {
  0: { x1: 2, x2: 5, x3: 20 },
  1: { x1: 1, x2: 3, x3: 10 },
  2: { x1: 0, x2: 2, x3: 5 },
  3: { x1: 0, x2: 1, x3: 3 },
  4: { x1: 0, x2: 0, x3: 2 },
  5: { x1: 0, x2: 0, x3: 1 },
};

// Config
const config = new GameConfig({
  apiBaseUrl: 'https://your-api.com',
  wsBaseUrl: 'wss://your-ws.com/game',
  gameId: 'demo',
  mode: 'fun',
  locale: 'en',
  currencySymbol: '$',
});

// Platform bridge (you can implement your own)
const platformBridge = new DefaultPlatformBridge();

// Asset manifest (optional, or load from server)
const assetManifest = {
  fonts: [],
  sounds: [],
  textures: Object.values(symbolMap),
};

// Start the game
const container = document.getElementById('game-container')!;
const game = new GameController({
  config,
  container,
  platformBridge,
  assetManifest,
  symbolMap,
  paytableData,
});

// Expose game for debugging
(window as any).game = game;
```