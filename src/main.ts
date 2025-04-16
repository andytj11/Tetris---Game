/**
 * Inside this file you will use the classes and functions from rx.js
 * to add visuals to the svg element in index.html, animate them, and make them interactive.
 *
 * Study and complete the tasks in observable exercises first to get ideas.
 *
 * Course Notes showing Asteroids in FRP: https://tgdwyer.github.io/asteroids/
 *
 * You will be marked on your functional programming style
 * as well as the functionality that you implement.
 *
 * Document your code!
 */

type Author = {
  name: string;
  id: number;
};

const author: Author = {
  name: 'ANDY TJANDRA',
  id: 32898460
};

/** -------------------------------------------------------------- IMPORTS ----------------------------------------------------------------------------------------------------- */


import "./style.css";
import { fromEvent, interval, merge, startWith, BehaviorSubject } from "rxjs";
import { map, filter, scan, switchMap } from "rxjs/operators";

/** -------------------------------------------------------------- END OF IMPORTS ----------------------------------------------------------------------------------------------- */
/* ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ */


/** -------------------------------------------------------------- CONSTANTS ---------------------------------------------------------------------------------------------------- */

/**
 * Viewport Configuration
 * 
 * This object defines the dimensions of the main canvas and the preview section
 * in a Tetris game.
 *
 * CANVAS_WIDTH: Width of the main game canvas in pixels.
 * CANVAS_HEIGHT: Height of the main game canvas in pixels.
 * PREVIEW_WIDTH: Width of the preview canvas in pixels.
 * PREVIEW_HEIGHT: Height of the preview canvas in pixels.
 */
const Viewport = {
  CANVAS_WIDTH: 200,
  CANVAS_HEIGHT: 400,
  PREVIEW_WIDTH: 160,
  PREVIEW_HEIGHT: 80,
} as const;

/**
 * Constants Configuration
 *
 * This object contains various constants used throughout the Tetris game.
 *
 * TICK_RATE_MS: The interval in milliseconds at which the game state is updated.
 * GRID_WIDTH: The number of horizontal blocks in the game grid.
 * GRID_HEIGHT: The number of vertical blocks in the game grid.
 */
const Constants = {
  TICK_RATE_MS: 200,
  GRID_WIDTH: 10,
  GRID_HEIGHT: 20,
} as const;

/**
 * Block Dimensions
 *
 * This object calculates and stores the dimensions of a single block in the Tetris grid,
 * based on the Viewport and Constants configuration.
 *
 * WIDTH: The width of a single block in pixels.
 * HEIGHT: The height of a single block in pixels.
 */
const Block = {
  WIDTH: Viewport.CANVAS_WIDTH / Constants.GRID_WIDTH,
  HEIGHT: Viewport.CANVAS_HEIGHT / Constants.GRID_HEIGHT,
};


/**
 * Represents the starting position of a Tetris block on the grid.
 */
const STARTING_POSITION: Point = {
  x: Math.floor(Constants.GRID_WIDTH / 2) - 1,
  y: 0
};

/** -------------------------------------------------------------- END OF CONSTANTS ----------------------------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */


/** ---------------------------------------------------------------- TYPE ALIASES ------------------------------------------------------------------------------------------------- */

/**
 * Represents a point in 2D space.
 */
type Point = {
  x: number;
  y: number;
};


/**
 * Represents a block as an array of Points.
 */
type Block = Point[];


/**
 * Represents the state of a cell, which can either be empty or filled.
 */
type Cell = 'EMPTY' | 'FILLED';


/**
 * Represents the entire game state as a 2D array of Cells.
 */
type GameState = Cell[][];


/**
 * Represents the immutable state of the game.
 */
type State = Readonly<{
  /**
   * Indicates whether the game has ended.
   */
  gameEnd: boolean;

  /**
   * The current block in play, represented as an array of Points.
   */
  block: Block;

  /**
   * The current direction in which the block is moving.
   */
  direction: Direction;

  /**
   * The grid representing the game field, where each cell is a number.
   */
  grid: number[][];

  /**
   * Indicates whether the current block has settled at the bottom.
   */
  blockSettled: boolean;

  /**
   * A 2D array representing the game state in terms of empty and filled cells.
   */
  gameGrid: GameState;

  /**
   * The player's current score.
   */
  score: number;

  /**
   * The highest score achieved in this game session.
   */
  highscore: number;

  /**
   * The block that will come into play next, represented as an array of Points.
   */
  nextBlock: Block;

  /**
   * The number of rows that have been cleared.
   */
  clearedRows: number;

  /**
   * The current level of the game.
   */
  currentLevel: number;

  /**
   * The type of the current block in play, represented as a string.
   */
  currentBlockType: string;

  /**
   * Indicates whether the game is paused.
   */
  gamePaused: boolean;
}>;


/**
 * Represents the direction in which a block is moving or intended to move.
 */
type Direction = "LEFT" | "RIGHT" | "DOWN" | "NONE";


/**
 * Represents a key that uniquely identifies a specific Tetromino shape
 * within the TETROMINOS object.
 */
type TetrominoKey = keyof typeof TETROMINOS;

/** ---------------------------------------------------------------- END OF TYPE ALIASES ------------------------------------------------------------------------------------------------- */
/* --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */


/** ---------------------------------------------------------------- TETRONIMO OPERATIONS ------------------------------------------------------------------------------------------------- */

/**
 * Creates a square-shaped Tetris block (also known as an "O" block).
 * Pure function.
 * The function returns a new array and new objects within that array, so no existing data is changed.
 * It doesn't modify any external state or variables.
 */
const createSquareBlock = (x: number, y: number): Block => [
  { x, y },
  { x: x + 1, y },
  { x, y: y + 1 },
  { x: x + 1, y: y + 1 }
];


/**
 * A predefined set of Tetrominos and their shapes.
 */
const TETROMINOS = {
  I: [
    { x: 4, y: 0 },
    { x: 4, y: 1 },
    { x: 4, y: 2 },
    { x: 4, y: 3 },
  ],
  O: [
    { x: 4, y: 0 },
    { x: 5, y: 0 },
    { x: 4, y: 1 },
    { x: 5, y: 1 }
  ],
  T: [
    { x: 4, y: 0 },
    { x: 3, y: 1 },
    { x: 4, y: 1 },
    { x: 5, y: 1 }
  ],
  S: [
    { x: 4, y: 0 },
    { x: 5, y: 0 },
    { x: 3, y: 1 },
    { x: 4, y: 1 }
  ],
  Z: [
    { x: 3, y: 0 },
    { x: 4, y: 0 },
    { x: 4, y: 1 },
    { x: 5, y: 1 }
  ],
  J: [
    { x: 3, y: 0 },
    { x: 3, y: 1 },
    { x: 4, y: 1 },
    { x: 5, y: 1 }
  ],
  L: [
    { x: 5, y: 0 },
    { x: 3, y: 1 },
    { x: 4, y: 1 },
    { x: 5, y: 1 }
  ]
};


/**
 * Creates a new Tetromino block.
 * Impure function.
 * The random number generator is a side effect, so the function is not pure.
 * Functional programming style.
 * It uses the .map() method, which is more functional in nature.
 * @returns A new Tetromino block.
 */
const newBlock = (): Point[] => {
  const tetrominosKeys = Object.keys(TETROMINOS) as TetrominoKey[];
  const randomKey = tetrominosKeys[Math.floor(Math.random() * tetrominosKeys.length)];
  return TETROMINOS[randomKey].map(point => ({ ...point }));
};

/** ---------------------------------------------------------------- END OF TETRONIMO OPERATIONS ------------------------------------------------------------------------------------------------- */
/* ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ */


/** ---------------------------------------------------------------- GAME INITIALISATION ------------------------------------------------------------------------------------------------- */

/**
 * Generates an empty game grid.
 * Pure function.
 * The function always returns the same output given the same input (in this case, it doesn't even require any input). 
 * It also doesn't have any side effects like altering global variables or performing I/O operations.
 * The function returns a new array each time it is called. 
 * The new array is constructed entirely within the function and does not modify or depend on external state.
 * Functional programming style.
 * Uses Array.from to generate the array, which is a more functional approach compared to using loops
 * @returns An empty game grid.
 */
const emptyGameGrid = (): GameState => 
  Array.from({ length: Constants.GRID_HEIGHT }, () => Array(Constants.GRID_WIDTH).fill('EMPTY'));


/**
 * Sets the initial state of the game.
 * Pure function.
 * The initialState object is defined as a constant using const, 
 * and it also uses the as const syntax to further enforce immutability.
 * Functional programming style.
 * Uses array methods like .fill and .map to generate new arrays, avoiding imperative loops.
 * @returns The initial state of the game.
 */
const initialState: State = {
    gameEnd: false,
    block: createSquareBlock(STARTING_POSITION.x, STARTING_POSITION.y),
    direction: "NONE",
    grid: Array(Constants.GRID_HEIGHT).fill([]).map(() => Array(Constants.GRID_WIDTH).fill(0)), 
    blockSettled: false,
    gameGrid: emptyGameGrid(),
    score: 0,
    nextBlock: newBlock(),
    highscore: 0,
    clearedRows: 0,
    currentLevel: 1,
    currentBlockType: 'I',  
    gamePaused: false,
  } as const;

/** ---------------------------------------------------------------- END OF GAME INITIALISATION ------------------------------------------------------------------------------------------------- */
/* ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */


/** ---------------------------------------------------------------- GAME MECHANICS ------------------------------------------------------------------------------------------------- */

/**
 * Determines the game's tick rate based on the number of cleared rows.
 * Pure function. 
 * Given the same value for clearedRows, it will always return the same result. 
 * It computes the return value solely based on its input and the immutable Constants.TICK_RATE_MS, which is read-only and therefore cannot be changed externally.
 * The function does not interact with any external state or have any side effects. 
 * It only performs a computation based on its inputs and returns a value.
 * Functional programming style.
 * It uses conditional statements but avoids loops.
 * @param clearedRows The number of rows that have been cleared.
 * @returns The tick rate in milliseconds.
 */
const getTickRate = (clearedRows: number): number => {
  if (clearedRows < 1) return Constants.TICK_RATE_MS * 1;
  if (clearedRows >= 1) return Constants.TICK_RATE_MS * 0.1;
  
  return Constants.TICK_RATE_MS * 0.1; // This is the fastest it can go.
};


/**
 * Checks if a given block will collide with either the bottom of the grid or another block.
 * Pure function.
 * Given the same block and grid inputs, it will always produce the same boolean output.
 * The function reads from block and grid and does not modify them, so it is immutable in that sense.
 * Functional programming style.
 * It uses the .some() method, which is more functional in nature.
 * @param block The block to check.
 * @param grid The grid to check against.
 * @returns True if the block will collide, false otherwise.
 */
const willCollide = (block: Block, grid: number[][]): boolean => {
  return block.some(point => {
    const collidesWithBottom = point.y >= Constants.GRID_HEIGHT;
    const collidesWithBlock = grid[point.y] && grid[point.y][point.x] === 1;
    return collidesWithBottom || collidesWithBlock;
  });
};


/**
 * Checks if a given block is out of the grid bounds.
 * Pure function.
 * Given the same input block, the function will always produce the same boolean output. 
 * The function only reads from the block and Constants objects but does not modify them or any other external state. 
 * There are no side effects like I/O operations.
 * Functional programming style.
 * It uses the .some() method, which is more functional in nature.
 * @param block The block to check.
 * @returns True if the block is out of bounds, false otherwise.
 */
const isOutOfBound = (block: Block): boolean => {
  return block.some(point => point.x < 0 || point.x >= Constants.GRID_WIDTH);
};


/**
 * Clears the full rows from the grid and game grid, and returns the new states along with the number of cleared rows.
 * Pure function.
 * The function takes two arguments grid and gameGrid and returns an object containing three properties: newGrid, newGameGrid, and clearedRows. 
 * Given the same grid and gameGrid, the function will always return the same output.
 * Immutable function.
 * The function generates new arrays for newGrid and newGameGrid and does not modify the original grid and gameGrid.
 * Functional programming style.
 * The function uses .filter() and Array.from() which are functional programming methods and avoid the need for loops.
 */
const clearFullRows = (
  grid: number[][], 
  gameGrid: ('EMPTY' | 'FILLED')[][]
): { newGrid: number[][], newGameGrid: ('EMPTY' | 'FILLED')[][], clearedRows: number } => {

  // Filter out the full rows
  const newGrid = grid.filter(row => row.some(cell => cell === 0));
  const newGameGrid = gameGrid.filter(row => row.some(cell => cell !== 'FILLED'));

  // Calculate the number of cleared rows
  const clearedRows = grid.length - newGrid.length;

  // Generate new empty rows
  const emptyRows = Array.from({ length: clearedRows }, () => new Array(grid[0].length).fill(0));
  const emptyGameRows = Array.from({ length: clearedRows }, () => new Array(gameGrid[0].length).fill('EMPTY'));

  // Concatenate new empty rows to the top of the filtered grid
  const finalGrid = [...emptyRows, ...newGrid];
  const finalGameGrid = [...emptyGameRows, ...newGameGrid];

  return { newGrid: finalGrid, newGameGrid: finalGameGrid, clearedRows };
};

/* ---------------------------------------------------------------- END OF GAME MECHANICS ------------------------------------------------------------------------------------------------- */
/* ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */


/** ---------------------------------------------------------------- STATE MANAGEMENT ------------------------------------------------------------------------------------------------- */

/**
 * Updates the state by proceeding with one time step.
 *
 * Immutable function.
 * The function takes the current state as an argument and returns a new state object.
 * It creates new arrays (updatedGrid, updatedGameGrid) instead of altering the existing grid and gameGrid. 
 * It also returns a new state object instead of mutating the existing one. 
 * Functional programming style.
 * It uses the .map() method, which is more functional in nature.
 * It also uses the .some() method, which is more functional in nature.
 * Partial pure function.
 * Pure - most parts of tick is pure, as dealing only with their inputs and outputs without modifying external state.
 * Impure - its dependence on newBlock, which is not a pure function.
 * 
 * @param s Current state
 * @returns Updated state
 */
const tick = (s: State): State => {

  if (s.gameEnd || s.gamePaused) return s;

  if (s.blockSettled) {
    const updatedGrid = s.grid.map(row => [...row]);
    const updatedGameGrid = s.gameGrid.map(row => [...row]);
    
    s.block.forEach(point => {
      updatedGrid[point.y][point.x] = 1;
      updatedGameGrid[point.y][point.x] = 'FILLED';
    });
    
    const newGeneratedBlock = newBlock();
    if (willCollide(newGeneratedBlock, updatedGrid)) {
      return { ...s, gameEnd: true };
    }

    if (updatedGrid[0].some(cell => cell === 1)) {
      return { ...s, gameEnd: true };
    }

    const { newGrid, newGameGrid, clearedRows } = clearFullRows(updatedGrid, updatedGameGrid);
    const newScore = s.score + (10 * clearedRows);
    const newLevel = clearedRows > 0 ? s.currentLevel + 1 : s.currentLevel;

    return {
      ...s,
      block: s.nextBlock,
      nextBlock: newBlock(),
      blockSettled: false,
      direction: "NONE",
      grid: newGrid,
      gameGrid: newGameGrid,
      score: newScore,
      currentLevel: newLevel,
    };
  }

  const xShift = s.direction === "LEFT" ? -1 : s.direction === "RIGHT" ? 1 : 0;
  const nextBlock = s.block.map(p => ({ x: p.x + xShift, y: p.y + 1 }));

  if (isOutOfBound(nextBlock)) {
    nextBlock.forEach(p => p.x -= xShift); // Reverse the x shift
  }

  if (willCollide(nextBlock, s.grid)) {
    return { ...s, blockSettled: true };
  }

  return { ...s, block: nextBlock, direction: "NONE" };
};


/** ---------------------------------------------------------------- END OF STATE MANAGEMENT ------------------------------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */


/** ---------------------------------------------------------------- BLOCK MANIPULATIONS ------------------------------------------------------------------------------------------------- */

/**
 * Gets the center point of a block.
 * Pure function.
 * Given the same input block, the function will always return the same output. 
 * It calculates the center point of a given block based on the points within that block, so the output is entirely dependent on its input.
 * It uses the .reduce() method to calculate the sum of the x and y coordinates, but this is done without altering the original block array or the points within it.
 * Functional programming style.
 * It uses the .reduce() method, which is more functional in nature.
 * @param block The block to find the center for.
 * @returns The center point.
 */
const getBlockCenter = (block: Block): Point => {
  const sum = block.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  const length = block.length;
  return { x: sum.x / length, y: sum.y / length };
};


/**
 * Rotates a block around its center point.
 * Pure function.
 * Given the same input block and type, the function will always return the same output.
 * @param block The block to rotate.
 * The function doesn't change any external state or modify its input. 
 * It returns a new array with rotated points without altering the original block array or its points. 
 * The rotatePoint function also generates new points rather than modifying existing ones.
 * Functional programming style.
 * It uses the .map() method, which is more functional in nature.
 * @param type The type of the block (needed for special cases like 'O').
 * @returns The rotated block.
 */
const rotateBlock = (block: Block, type: string): Block => {
  if (type === 'O') return block;
  
  const origin = getBlockCenter(block);

  const rotatePoint = (point: Point, origin: Point): Point => ({
    x: Math.round(origin.x + point.y - origin.y),
    y: Math.round(origin.y - point.x + origin.x),
  });

  return block.map(p => rotatePoint(p, origin));
};

/** ---------------------------------------------------------------- END OF BLOCK MANIPULATIONS ------------------------------------------------------------------------------------------------- */
/* ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ */


/** ---------------------------------------------------------------- SVG RENDERING ------------------------------------------------------------------------------------------------- */

/**
 * Creates an SVG element with the given properties.
 *
 * See https://developer.mozilla.org/en-US/docs/Web/SVG/Element for valid
 * element names and properties.
 * 
 * Functional programming style.
 * It uses Object.entries() and .forEach() to iterate over the properties and set them on the element.
 *
 * @param namespace Namespace of the SVG element
 * @param name SVGElement name
 * @param props Properties to set on the SVG element
 * @returns SVG element
 */
const createSvgElement = (
  namespace: string | null,
  name: string,
  props: Record<string, string> = {}
) => {
  const elem = document.createElementNS(namespace, name) as SVGElement;
  Object.entries(props).forEach(([k, v]) => elem.setAttribute(k, v));
  return elem;
};

/** ---------------------------------------------------------------- END OF SVG RENDERING ------------------------------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */


/** ---------------------------------------------------------------- MAIN FUNCTION ------------------------------------------------------------------------------------------------- */

/**
 * This is the function called on page load. Your main game loop
 * should be called here.
 */

export function main() {


  /******************************** DOM elements ****************************************/

  const svg = document.querySelector("#svgCanvas") as SVGGraphicsElement &
    HTMLElement;
  const preview = document.querySelector("#svgPreview") as SVGGraphicsElement &
    HTMLElement;
  const gameover = document.querySelector("#gameOver") as SVGGraphicsElement &
    HTMLElement;


  /******************************** Setting attribute ****************************************/
  
  svg.setAttribute("height", `${Viewport.CANVAS_HEIGHT}`);
  svg.setAttribute("width", `${Viewport.CANVAS_WIDTH}`);
  preview.setAttribute("height", `${Viewport.PREVIEW_HEIGHT}`);
  preview.setAttribute("width", `${Viewport.PREVIEW_WIDTH}`);


  /******************************** Text fields ***********************************************/

  const levelText = document.querySelector("#levelText") as HTMLElement;
  const scoreText = document.querySelector("#scoreText") as HTMLElement;
  const highScoreText = document.querySelector("#highScoreText") as HTMLElement;


  /************************************ Event Listeners **************************************/

  /**
   * Creates an observable for keyboard press events.
   */
  const key$ = fromEvent<KeyboardEvent>(document, "keypress");


  /******************************** Observables ******************************************/      

  /**
   * Creates an observable for directional keys (A, D, S) and their corresponding directions ('LEFT', 'RIGHT', 'DOWN').
   * The observable emits the direction when the key is down.
   * The observable starts with 'NONE' as the initial direction.
   * Functional programming style.
   * It uses the .filter() and .map() methods, which are more functional in nature.
   * @returns An observable for the direction. 
  */
  const direction$ = merge(
    key$.pipe(filter(evt => evt.code === 'KeyA'), map(() => 'LEFT')),
    key$.pipe(filter(evt => evt.code === 'KeyD'), map(() => 'RIGHT')),
    key$.pipe(filter(evt => evt.code === 'KeyS'), map(() => 'DOWN')),
  ).pipe(startWith('NONE'));


  /**
   * Creates an observable for the restart key (R), emitting when the key is down.
   * Functional programming style.
   * It uses the .filter() method, which is more functional in nature.
   * @returns An observable for the restart key.
   */
  const keyRestart$ = fromEvent<KeyboardEvent>(document, 'keydown').pipe(
    filter(event => event.code === 'KeyR')
  );


  /**
   * Creates an observable for the rotation key (T), emitting 'ROTATE'.
   * Functional programming style.
   * It uses the .filter() and .map() methods, which are more functional in nature.
   * @returns An observable for the rotation key.
   */
  const rotate$ = key$.pipe(
    filter(({ code }) => code === "KeyT"),
    map(() => 'ROTATE')
  );

  /**
   * Creates an observable for the pause key (P), emitting 'PAUSE'.
   * Functional programming style.
   * It uses the .filter() and .map() methods, which are more functional in nature.
   * @returns An observable for the pause key.
   */
  const pause$ = key$.pipe(
    filter(({ code }) => code === 'KeyP'),
    map(() => 'PAUSE')
  );
  

  /******************************** Observables Functions ******************************************/

  /**
   * BehaviorSubject that controls the game tick rate.
   */
  const tickRate$ = new BehaviorSubject<number>(Constants.TICK_RATE_MS);  // Initialize with the default tick rate


  /**
   * Main game observable, which merges several observables related to game actions and uses a scan
   * operator to maintain game state.
   * Functional programming style.
   * It uses the .pipe() method, which is more functional in nature.
   * @returns An observable for the game.
   */
  const game$ = merge(
    tickRate$.pipe(
      switchMap(rate => interval(rate)),
      map(() => 'TICK')
    ),
    rotate$,
    direction$,
    pause$,
    keyRestart$.pipe(map(() => 'RESTART'))  // Adding restart observable here
  ).pipe(
    scan((state: State, event) => {
      switch (event) {
        case 'TICK':
          const newState = tick(state);
          
          // Update tick rate based on cleared rows, if it has changed.
          const newRate = getTickRate(newState.clearedRows);
          if (newRate !== tickRate$.getValue()) {
            tickRate$.next(newRate);
          }

          return newState;
          
        case 'LEFT':
        case 'RIGHT':
        case 'DOWN':
          if (state.direction === "NONE") {
            return { ...state, direction: event };
          }
          return state;
          
        case 'RESTART':  // Adding restart case here
          tickRate$.next(Constants.TICK_RATE_MS); // Reset the tick rate
          return { ...initialState, highscore: state.highscore };

        case 'ROTATE':
          const newBlock = rotateBlock(state.block, state.currentBlockType);
          if (!isOutOfBound(newBlock) && !willCollide(newBlock, state.grid)) {
            return { ...state, block: newBlock };
          }
        case 'PAUSE':
          return { ...state, gamePaused: !state.gamePaused };  // Toggle the pause state
  
        
        default:
          return state;
      }
    }, initialState)
  );

  

  /************************************** Rendering ********************************************************/

  /**
   * Renders the current state to the canvas.
   *
   * In MVC terms, this updates the View using the Model.
   * Functional programming style.
   * It uses the .forEach() method, which is more functional in nature.
   *
   * Impure function.
   * It contains side effects like rendering to the DOM and modifying the DOM.
   * Cannnot be pure.
   * It cannot be made pure because it needs to modify the DOM.
   * 
   * @param s Current state
   * @returns void
   */
  const render = (s: State) => {
    svg.innerHTML = '';  // Clear previous blocks
  
    // Render blocks from gameGrid
    s.gameGrid.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell === 'FILLED') {
          const cube = createSvgElement(svg.namespaceURI, "rect", {
            height: `${Block.HEIGHT}`,
            width: `${Block.WIDTH}`,
            x: `${x * Block.WIDTH}`,
            y: `${y * Block.HEIGHT}`,
            style: "fill: pink",  // Use a different color for settled blocks, or keep it green
          });
          svg.appendChild(cube);
        }
      });
      scoreText.innerText = `${s.score}`;
      highScoreText.innerText = `${s.highscore}`;
      levelText.innerText = `${s.currentLevel}`;
    });
  
    // Render the current block
    s.block.forEach(p => {
      const cube = createSvgElement(svg.namespaceURI, "rect", {
        height: `${Block.HEIGHT}`,
        width: `${Block.WIDTH}`,
        x: `${p.x * Block.WIDTH}`,
        y: `${p.y * Block.HEIGHT}`,
        style: "fill: red",
      });
      svg.appendChild(cube);
    });

    preview.innerHTML = '';  // Clear previous preview

    
    /* -------------------- BLCOCK PREVIEW ----------------------------------------- */

    // Calculate the min and max x and y coordinates of the block
    const minX = Math.min(...s.nextBlock.map(p => p.x));
    const maxX = Math.max(...s.nextBlock.map(p => p.x));
    const minY = Math.min(...s.nextBlock.map(p => p.y));
    const maxY = Math.max(...s.nextBlock.map(p => p.y));

    // Calculate the dimensions of the block's bounding box
    const totalBlockWidth = (maxX - minX + 1) * Block.WIDTH;
    const totalBlockHeight = (maxY - minY + 1) * Block.HEIGHT;

    // Calculate centering offsets
    const xOffset = (Viewport.PREVIEW_WIDTH - totalBlockWidth) / 2;
    const yOffset = (Viewport.PREVIEW_HEIGHT - totalBlockHeight) / 2;
  
    s.nextBlock.forEach(p => {
      const cube = createSvgElement(preview.namespaceURI, "rect", {
        height: `${Block.HEIGHT}`,
        width: `${Block.WIDTH}`,
        x: `${(p.x - minX) * Block.WIDTH + xOffset}`, // Shift by minX and add xOffset
        y: `${(p.y - minY) * Block.HEIGHT + yOffset}`, // Shift by minY and add yOffset
        style: "fill: blue",  // Use a neutral color for preview blocks
      });
      preview.appendChild(cube);
    });
  };

  
  /************************************ Subscriptions *****************************************/

  /**
   * Main game subscription. It takes care of rendering, pausing, and ending the game.
   * Functional programming style.
   * It uses the .subscribe() method, which is more functional in nature.
   * It also uses the .unsubscribe() method to unsubscribe from the observable when the game ends.
   * It does not contain any loops.
   * Impure function.
   * It contains side effects like rendering to the DOM and modifying the DOM.
   * Cannnot be pure.
   * It cannot be made pure because it needs to modify the DOM.
   * @param s The current state.
   * @returns A subscription for the game.
   */
  const source$ = game$.subscribe((s: State) => {
    render(s);
    const pauseTextElement = document.getElementById("pauseBox")!;

    if (s.gamePaused) {
      pauseTextElement.style.display = "block"; // Show the pause text
    } else {
      pauseTextElement.style.display = "none"; // Hide the pause text
    }


    if (s.gameEnd) {
      console.log("Trying to show game over..."); // Debugging line
      const gameOverBox = document.getElementById('gameOverBox')!;
      if (gameOverBox) {
          gameOverBox.style.display = 'block';
      }
      highScoreText.innerText = `${s.score}`;
      
      source$.unsubscribe();

    } else {
      render(s);
      gameover.style.display = 'none';
      
    }
  });
 
} // end of main program (closing scope of main function)

/** ---------------------------------------------------------------- END OF MAIN FUNCTION ------------------------------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */


/** ---------------------------------------------------------------- WINDOW LOAD ------------------------------------------------------------------------------------------------- */

// The following simply runs your main function on window load.  Make sure to leave it in place.
if (typeof window !== "undefined") {
  window.onload = () => {
    main();
  };
}

/** ---------------------------------------------------------------- END OF WINDOW LOAD ------------------------------------------------------------------------------------------------- */