import { useState } from 'react';
import Wall from './Wall.jsx';
import Polls, { unanswered } from './Polls.jsx';

// The group's side of the app: the chat, and the votes. Opens on Votes when
// there's one you haven't answered.
export default function Banter({ state, act, whoAmI }) {
  const owed = unanswered(state.polls, whoAmI).length;
  const [view, setView] = useState(owed ? 'votes' : 'chat');
  return (
    <div className="page">
      <div className="seg-row">
        <button className={`seg ${view === 'chat' ? 'on' : ''}`} onClick={() => setView('chat')}>Chat</button>
        <button className={`seg ${view === 'votes' ? 'on' : ''}`} onClick={() => setView('votes')}>
          Votes{owed > 0 && <span className="seg-dot" aria-label={`${owed} to vote on`} />}
        </button>
      </div>
      {view === 'chat' ? <Wall state={state} act={act} whoAmI={whoAmI} /> : <Polls state={state} act={act} who={whoAmI} />}
    </div>
  );
}
