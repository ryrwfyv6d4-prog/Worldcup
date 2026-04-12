import { useState, useEffect, useMemo } from 'react';
import { normaliseTeamName } from '../utils/scoring.js';
import { getFlag } from '../data/worldcup2026.js';
import { formatDateAEST, formatTimeAEST } from '../utils/time.js';
import { useOdds } from '../hooks/useOdds.js';

const WORKER_URL = import.meta.env.VITE_WALL_API_URL || '';
const PRED_POINTS = 5;

function matchResult(fixture) {
  if (fixture.status !== 'FINISHED') return null;
  const { winner } = fixture.score;
  if (winner === 'HOME_TEAM') return 'home';
  if (winner === 'AWAY_TEAM') return 'away';
  if (winner === 'DRAW') return 'draw';
  return null;
}

function oddsKey(homeTeam, awayTeam) {
  return `${homeTeam}|${awayTeam}`;
}

function PredCard({ fixture, myPick, allPicks, currentUser, onPick, odds }) {
  const home = normaliseTeamName(fixture.homeTeam.name);
  const away = normaliseTeamName(fixture.awayTeam.name);
  const result = matchResult(fixture);
  const matchStarted = fixture.status !== 'SCHEDULED' || new Date(fixture.utcDate) <= new Date();
  const locked = matchStarted;

  const rawOdds = odds[oddsKey(fixture.homeTeam.name, fixture.awayTeam.name)]
    || odds[oddsKey(home, away)];

  const picks = [
    { key: 'home', label: home, sub: rawOdds?.home ? rawOdds.home.toFixed(2) : null },
    { key: 'draw', label: 'Draw', sub: rawOdds?.draw ? rawOdds.draw.toFixed(2) : null },
    { key: 'away', label: away, sub: rawOdds?.away ? rawOdds.away.toFixed(2) : null },
  ];

  const participants = Object.keys(allPicks || {});

  return (
    <div className="pred-card">
      <div className="pred-match-teams">
        <span>{getFlag(home)} {home}</span>
        <span className="pred-match-vs">vs</span>
        <span>{getFlag(away)} {away}</span>
      </div>
      <div className="pred-match-meta">
        {formatDateAEST(fixture.utcDate)} · {formatTimeAEST(fixture.utcDate)} AEST
        {fixture.stage && <span> · {fixture.stage.replace(/_/g, ' ')}</span>}
      </div>

      {rawOdds && (
        <div className="pred-odds-row">
          Odds: {home} {rawOdds.home.toFixed(2)} · Draw {rawOdds.draw?.toFixed(2) ?? '—'} · {away} {rawOdds.away.toFixed(2)}
        </div>
      )}

      <div className="pred-btns">
        {picks.map(({ key, label, sub }) => {
          const isMyPick = myPick === key;
          const isCorrect = result && result === key;
          const isWrong = result && myPick === key && result !== key;
          let cls = 'pred-btn';
          if (isMyPick && !result) cls += ' selected';
          if (isCorrect && isMyPick) cls += ' correct';
          if (isWrong) cls += ' wrong';

          return (
            <button
              key={key}
              className={cls}
              disabled={locked}
              onClick={() => !locked && onPick(fixture.id, key)}
            >
              <div>{label}</div>
              {sub && <div style={{ fontSize: '0.68rem', marginTop: 2, opacity: 0.7 }}>{sub}</div>}
            </button>
          );
        })}
      </div>

      {result && myPick && (
        <p className={`pred-result-msg ${myPick === result ? 'correct' : ''}`}>
          {myPick === result ? `✓ Correct! +${PRED_POINTS} pts` : '✗ Unlucky'}
        </p>
      )}

      {participants.length > 0 && (
        <div style={{ marginTop: 10 }}>
          {participants.map((person) => {
            const pick = allPicks[person];
            const correct = result && pick === result;
            const wrong = result && pick !== result;
            return (
              <span key={person} style={{
                display: 'inline-block',
                marginRight: 8,
                marginTop: 4,
                fontSize: '0.72rem',
                color: correct ? 'var(--green)' : wrong ? 'var(--text-muted)' : 'var(--text-muted)',
                fontWeight: 700,
              }}>
                {person}: {pick === 'home' ? home : pick === 'away' ? away : 'Draw'}
                {correct && ' ✓'}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PredictionPoints({ predictions, fixtures, participants }) {
  const scores = useMemo(() => {
    const totals = {};
    for (const p of participants) totals[p] = 0;

    for (const f of fixtures) {
      const result = matchResult(f);
      if (!result) continue;
      const matchPreds = predictions[f.id] || {};
      for (const [person, pick] of Object.entries(matchPreds)) {
        if (pick === result) {
          totals[person] = (totals[person] || 0) + PRED_POINTS;
        }
      }
    }

    return Object.entries(totals)
      .map(([name, pts]) => ({ name, pts }))
      .sort((a, b) => b.pts - a.pts);
  }, [predictions, fixtures, participants]);

  if (scores.every((s) => s.pts === 0)) return null;

  return (
    <div className="card mt">
      <h3 className="section-title">Prediction Points</h3>
      <div className="pred-pts-table">
        {scores.map(({ name, pts }) => (
          <div key={name} className="pred-pts-row">
            <span>{name}</span>
            <span className="pred-pts-val">{pts} pts</span>
          </div>
        ))}
      </div>
      <p className="hint mt">Correct prediction = +{PRED_POINTS} pts</p>
    </div>
  );
}

export default function Predictions({ fixtures, currentUser, participants, predictions, onPick }) {
  const odds = useOdds();

  const upcoming = useMemo(() => {
    const now = Date.now();
    return fixtures
      .filter((f) => f.utcDate && f.status !== 'FINISHED')
      .sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate))
      .slice(0, 20);
  }, [fixtures]);

  const recentFinished = useMemo(() => {
    return fixtures
      .filter((f) => f.status === 'FINISHED')
      .sort((a, b) => new Date(b.utcDate) - new Date(a.utcDate))
      .slice(0, 10);
  }, [fixtures]);

  const handlePick = (matchId, pick) => {
    if (!currentUser) return;
    onPick(matchId, currentUser, pick);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Picks</h2>
        <p className="subtitle">
          Predict match results to earn bonus points.
          {!currentUser && ' Set your name in Settings to make predictions.'}
        </p>
      </div>

      <PredictionPoints predictions={predictions} fixtures={fixtures} participants={participants} />

      {upcoming.length > 0 && (
        <>
          <h3 className="section-title" style={{ marginBottom: 10 }}>Upcoming</h3>
          <div className="pred-list">
            {upcoming.map((f) => (
              <PredCard
                key={f.id}
                fixture={f}
                myPick={currentUser ? (predictions[f.id] || {})[currentUser] : null}
                allPicks={predictions[f.id] || {}}
                currentUser={currentUser}
                onPick={handlePick}
                odds={odds}
              />
            ))}
          </div>
        </>
      )}

      {recentFinished.length > 0 && (
        <>
          <h3 className="section-title" style={{ margin: '18px 0 10px' }}>Results</h3>
          <div className="pred-list">
            {recentFinished.map((f) => (
              <PredCard
                key={f.id}
                fixture={f}
                myPick={currentUser ? (predictions[f.id] || {})[currentUser] : null}
                allPicks={predictions[f.id] || {}}
                currentUser={currentUser}
                onPick={handlePick}
                odds={odds}
              />
            ))}
          </div>
        </>
      )}

      {upcoming.length === 0 && recentFinished.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🎯</div>
          <p>No fixtures to predict yet.</p>
        </div>
      )}
    </div>
  );
}
