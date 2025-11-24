import { useEffect } from 'react';
import { useHanafudaGame } from './hooks/useHanafudaGame';
import './App.css';

function App() {
  const { gameState, phase, initGame, playCard, cpuTurn } = useHanafudaGame();

  // Auto-start CPU turn
  useEffect(() => {
    if (phase === 'cpu-turn') {
      cpuTurn();
    }
  }, [phase, cpuTurn]);

  if (!gameState) {
    return (
      <div className="container">
        <h1>Simple Hanafuda</h1>
        <button onClick={initGame}>Start Game</button>
      </div>
    );
  }

  const { field, players, currentTurn, isRoundOver, winner } = gameState;
  const player = players[0];
  const cpu = players[1];

  return (
    <div className="container">
      <div className="header">
        <h2>Turn: {currentTurn === 0 ? 'Player' : 'CPU'}</h2>
        {isRoundOver && <h2>Round Over! Winner: {winner === 0 ? 'Player' : winner === 1 ? 'CPU' : 'Draw'}</h2>}
      </div>

      {/* CPU Area */}
      <div className="area cpu-area">
        <h3>CPU (Score: {cpu.score})</h3>
        <div className="hand">
          {cpu.hand.map((card) => (
            <div key={card.id} className="card back">🎴</div>
          ))}
        </div>
        <div className="captured">
          Captured: {cpu.captured.length}
        </div>
      </div>

      {/* Field Area */}
      <div className="area field-area">
        <h3>Field</h3>
        <div className="field">
          {field.map((card) => (
            <div key={card.id} className="card">
              {card.name}
              <br />
              <small>{card.month}月</small>
            </div>
          ))}
        </div>
      </div>

      {/* Player Area */}
      <div className="area player-area">
        <h3>Player (Score: {player.score})</h3>
        <div className="hand">
          {player.hand.map((card) => (
            <div
              key={card.id}
              className="card"
              onClick={() => phase === 'player-turn' && playCard(card)}
              style={{ cursor: phase === 'player-turn' ? 'pointer' : 'default' }}
            >
              {card.name}
              <br />
              <small>{card.month}月</small>
            </div>
          ))}
        </div>
        <div className="captured">
          Captured: {player.captured.length}
        </div>
      </div>

      {isRoundOver && <button onClick={initGame}>Next Round (Restart)</button>}
    </div>
  );
}

export default App;
