import { useEffect } from 'react';
import { useHanafudaGame } from './hooks/useHanafudaGame';
import { GameBoard } from './components/GameBoard';
import './App.css';

function App() {
  const {
    gameState,
    phase,
    lastYakuInfo,
    initGame,
    playCard,
    cpuTurn,
    handleKoiKoi,
    handleShobu
  } = useHanafudaGame();

  // Auto-start CPU turn
  useEffect(() => {
    if (phase === 'cpu-turn') {
      cpuTurn();
    }
  }, [phase, cpuTurn]);

  if (!gameState) {
    return (
      <div className="min-h-screen bg-green-900 flex flex-col items-center justify-center text-white">
        <h1 className="text-6xl font-bold mb-8 text-yellow-400 drop-shadow-lg">花札 こいこい</h1>
        <button
          onClick={initGame}
          className="px-8 py-4 bg-red-600 text-white rounded-full text-2xl font-bold hover:bg-red-500 transition-transform hover:scale-105 shadow-xl"
        >
          Start Game
        </button>
      </div>
    );
  }

  return (
    <GameBoard
      gameState={gameState}
      phase={phase}
      onPlayCard={playCard}
      onKoiKoi={handleKoiKoi}
      onShobu={handleShobu}
      onRestart={initGame}
      lastYakuInfo={lastYakuInfo}
    />
  );
}

export default App;
