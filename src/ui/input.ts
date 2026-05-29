import type { GameEvent, GameStatus } from '../shared/types';

export function attachInputHandlers(
  dispatch: (event: GameEvent) => void,
  getStatus: () => GameStatus,
): void {
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    const status = getStatus();

    switch (e.code) {
      case 'Space':
        e.preventDefault();
        if (status === 'IDLE' || status === 'GAME_OVER' || status === 'WIN') {
          dispatch({ type: 'START_GAME' });
        } else if (status === 'PLAYING') {
          dispatch({ type: 'DROP_BLOCK' });
        } else if (status === 'PAUSED') {
          dispatch({ type: 'RESUME_GAME' });
        }
        break;

      case 'Enter':
        if (status === 'IDLE' || status === 'GAME_OVER' || status === 'WIN') {
          dispatch({ type: 'START_GAME' });
        } else if (status === 'NPC_DEMO') {
          dispatch({ type: 'START_GAME' });
        }
        break;

      case 'KeyP':
        if (status === 'PLAYING') {
          dispatch({ type: 'PAUSE_GAME' });
        } else if (status === 'PAUSED') {
          dispatch({ type: 'RESUME_GAME' });
        }
        break;

      case 'KeyR':
        dispatch({ type: 'RESET_GAME' });
        break;

      case 'ArrowDown':
      case 'ArrowUp':
      case 'ArrowLeft':
      case 'ArrowRight':
        // Any arrow key during NPC demo cancels it
        if (status === 'NPC_DEMO') {
          dispatch({ type: 'RESET_GAME' });
        }
        break;

      default:
        break;
    }
  });
}
