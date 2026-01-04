'use client';

import * as React from 'react';

import { cn } from '../../utils/cn';

import type { CompetitionBracketProps } from './types';

/**
 * CompetitionBracket Component
 *
 * Displays a tournament-style bracket for team competitions.
 */
export function CompetitionBracket({
  competition,
  currentRound = 1,
  onTeamClick,
  className,
}: CompetitionBracketProps) {
  // Sort teams by score for display
  const sortedTeams = React.useMemo(() => {
    return [...competition.teams].sort((a, b) => b.totalScore - a.totalScore);
  }, [competition.teams]);

  // For simple display, show top 8 teams in bracket format
  const bracketTeams = sortedTeams.slice(0, 8);

  // Create matchups (pairs of teams)
  const matchups = React.useMemo(() => {
    const pairs = [];
    for (let i = 0; i < bracketTeams.length; i += 2) {
      pairs.push({
        team1: bracketTeams[i],
        team2: bracketTeams[i + 1] || null,
      });
    }
    return pairs;
  }, [bracketTeams]);

  if (competition.teams.length < 2) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-12',
          'border-gray-200 dark:border-gray-700',
          className
        )}
      >
        <span className="mb-2 text-4xl">🏆</span>
        <h3 className="mb-1 text-lg font-medium text-gray-900 dark:text-white">Not enough teams</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          At least 2 teams are needed to display a bracket.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('overflow-x-auto', className)}>
      <div className="min-w-[600px] p-4">
        {/* Competition header */}
        <div className="mb-6 text-center">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">{competition.title}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Round {currentRound} • {competition.teams.length} teams
          </p>
        </div>

        {/* Bracket display */}
        <div className="flex items-center justify-center gap-8">
          {/* Round 1 - Quarterfinals */}
          <div className="flex flex-col gap-4">
            <div className="text-center text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Quarterfinals
            </div>
            {matchups.map((matchup, index) => (
              <div
                key={index}
                className="relative flex flex-col gap-1 rounded-lg border bg-white p-2 shadow-sm dark:border-gray-700 dark:bg-gray-800"
              >
                {/* Team 1 */}
                {matchup.team1 && (
                  <button
                    onClick={() => onTeamClick?.(matchup.team1!.id)}
                    className="flex items-center gap-2 rounded-md px-3 py-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded-full text-sm"
                      style={{ backgroundColor: matchup.team1.color + '30' }}
                    >
                      {matchup.team1.iconEmoji}
                    </span>
                    <span className="flex-1 truncate text-left text-sm font-medium text-gray-900 dark:text-white">
                      {matchup.team1.name}
                    </span>
                    <span className="text-sm font-bold text-gray-600 dark:text-gray-300">
                      {matchup.team1.totalScore}
                    </span>
                  </button>
                )}

                {/* VS divider */}
                <div className="text-center text-xs text-gray-400">vs</div>

                {/* Team 2 */}
                {matchup.team2 ? (
                  <button
                    onClick={() => onTeamClick?.(matchup.team2!.id)}
                    className="flex items-center gap-2 rounded-md px-3 py-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded-full text-sm"
                      style={{ backgroundColor: matchup.team2.color + '30' }}
                    >
                      {matchup.team2.iconEmoji}
                    </span>
                    <span className="flex-1 truncate text-left text-sm font-medium text-gray-900 dark:text-white">
                      {matchup.team2.name}
                    </span>
                    <span className="text-sm font-bold text-gray-600 dark:text-gray-300">
                      {matchup.team2.totalScore}
                    </span>
                  </button>
                ) : (
                  <div className="px-3 py-2 text-center text-sm text-gray-400">BYE</div>
                )}

                {/* Connector line */}
                {index < matchups.length - 1 && (
                  <div className="absolute -right-4 top-1/2 h-0.5 w-4 bg-gray-200 dark:bg-gray-700" />
                )}
              </div>
            ))}
          </div>

          {/* Winner placeholder */}
          {matchups.length >= 2 && (
            <>
              <div className="flex flex-col gap-4">
                <div className="text-center text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Semifinals
                </div>
                {matchups.slice(0, 2).map((_, index) => (
                  <div
                    key={index}
                    className="flex h-24 w-40 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700"
                  >
                    <span className="text-sm text-gray-400">TBD</span>
                  </div>
                ))}
              </div>

              {/* Finals */}
              <div className="flex flex-col gap-4">
                <div className="text-center text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Finals
                </div>
                <div className="flex h-24 w-40 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
                  <span className="text-2xl">🏆</span>
                  <span className="text-sm text-gray-400">Champion</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
