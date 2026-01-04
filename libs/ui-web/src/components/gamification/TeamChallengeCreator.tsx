'use client';

import * as React from 'react';

import { cn } from '../../utils/cn';

import type { TeamChallengeCreatorProps, NewChallenge, Team } from './types';

/**
 * TeamChallengeCreator Component
 *
 * Form for teachers to create team challenges/competitions.
 */
export function TeamChallengeCreator({
  availableTeams,
  onSubmit,
  onCancel,
  className,
}: TeamChallengeCreatorProps) {
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [type, setType] = React.useState<'individual' | 'team'>('team');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const [selectedTeams, setSelectedTeams] = React.useState<string[]>([]);
  const [skills, setSkills] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const challenge: NewChallenge = {
      title,
      description,
      type,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      targetTeamIds: selectedTeams,
      targetSkills: skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };

    onSubmit(challenge);
  };

  const toggleTeam = (teamId: string) => {
    setSelectedTeams((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
    );
  };

  const selectAllTeams = () => {
    setSelectedTeams(availableTeams.map((t) => t.id));
  };

  const deselectAllTeams = () => {
    setSelectedTeams([]);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'rounded-xl border bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800',
        className
      )}
    >
      <h2 className="mb-6 text-xl font-bold text-gray-900 dark:text-white">
        Create Team Challenge
      </h2>

      {/* Title */}
      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Challenge Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
          }}
          placeholder="e.g., Math Marathon Week"
          required
          className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />
      </div>

      {/* Description */}
      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
          }}
          placeholder="Describe the challenge and how teams can earn points..."
          rows={3}
          required
          className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />
      </div>

      {/* Type */}
      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Competition Type
        </label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="type"
              value="team"
              checked={type === 'team'}
              onChange={() => {
                setType('team');
              }}
              className="text-primary-500 focus:ring-primary-500"
            />
            <span className="text-gray-700 dark:text-gray-300">👥 Team</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="type"
              value="individual"
              checked={type === 'individual'}
              onChange={() => {
                setType('individual');
              }}
              className="text-primary-500 focus:ring-primary-500"
            />
            <span className="text-gray-700 dark:text-gray-300">👤 Individual</span>
          </label>
        </div>
      </div>

      {/* Dates */}
      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Start Date
          </label>
          <input
            type="datetime-local"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
            }}
            required
            className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            End Date
          </label>
          <input
            type="datetime-local"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
            }}
            required
            className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      {/* Team selection */}
      {type === 'team' && availableTeams.length > 0 && (
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Select Teams ({selectedTeams.length} selected)
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAllTeams}
                className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={deselectAllTeams}
                className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="grid max-h-48 gap-2 overflow-y-auto rounded-lg border border-gray-200 p-2 dark:border-gray-600">
            {availableTeams.map((team) => (
              <label
                key={team.id}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-lg p-2 transition-colors',
                  selectedTeams.includes(team.id)
                    ? 'bg-primary-50 dark:bg-primary-900/20'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                )}
              >
                <input
                  type="checkbox"
                  checked={selectedTeams.includes(team.id)}
                  onChange={() => {
                    toggleTeam(team.id);
                  }}
                  className="text-primary-500 focus:ring-primary-500"
                />
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full"
                  style={{ backgroundColor: team.color + '30' }}
                >
                  {team.iconEmoji}
                </span>
                <span className="text-gray-700 dark:text-gray-300">{team.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Skills */}
      <div className="mb-6">
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Target Skills (comma-separated, optional)
        </label>
        <input
          type="text"
          value={skills}
          onChange={(e) => {
            setSkills(e.target.value);
          }}
          placeholder="e.g., Multiplication, Fractions, Problem Solving"
          className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="submit"
          className="flex-1 rounded-lg bg-primary-500 px-4 py-2 font-medium text-white transition-colors hover:bg-primary-600"
        >
          Create Challenge
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-200 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
