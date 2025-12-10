'use client';

import { Badge, Button, Card } from '@aivo/ui-web';
import { useState, useEffect } from 'react';

import {
  listSkills,
  setVersionSkills,
  updateVersion,
  searchStandards,
  type Standard,
} from '../../lib/authoring-api';
import { cn } from '../../lib/cn';
import { useToast } from '../../lib/toast';
import type { LearningObjectVersion, Skill, StandardsJson } from '../../lib/types';

interface StandardsSkillsTabProps {
  loId: string;
  version: LearningObjectVersion;
  canEdit: boolean;
  onUpdate: () => void;
}

export function StandardsSkillsTab({ loId, version, canEdit, onUpdate }: StandardsSkillsTabProps) {
  const { addToast } = useToast();

  // Skills state
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<{ skillId: string; isPrimary: boolean }[]>(
    version.skills?.map((s) => ({ skillId: s.skillId, isPrimary: s.isPrimary })) ?? []
  );
  const [skillSearch, setSkillSearch] = useState('');
  const [savingSkills, setSavingSkills] = useState(false);

  // Standards state
  const [standards, setStandards] = useState<StandardsJson>(version.standardsJson ?? { codes: [] });
  const [standardSearch, setStandardSearch] = useState('');
  const [standardResults, setStandardResults] = useState<Standard[]>([]);
  const [savingStandards, setSavingStandards] = useState(false);

  // Fetch available skills
  useEffect(() => {
    const fetchSkills = async () => {
      const skills = await listSkills();
      setAvailableSkills(skills);
    };
    void fetchSkills();
  }, []);

  // Search standards
  useEffect(() => {
    if (standardSearch.length < 2) {
      setStandardResults([]);
      return;
    }
    const search = async () => {
      const results = await searchStandards(standardSearch);
      setStandardResults(results);
    };
    const timeout = setTimeout(() => {
      void search();
    }, 300);
    return () => {
      clearTimeout(timeout);
    };
  }, [standardSearch]);

  const filteredSkills = availableSkills.filter(
    (skill) =>
      skill.name.toLowerCase().includes(skillSearch.toLowerCase()) ||
      skill.description?.toLowerCase().includes(skillSearch.toLowerCase())
  );

  const isSkillSelected = (skillId: string) => selectedSkills.some((s) => s.skillId === skillId);

  const toggleSkill = (skillId: string) => {
    if (isSkillSelected(skillId)) {
      setSelectedSkills((prev) => prev.filter((s) => s.skillId !== skillId));
    } else {
      setSelectedSkills((prev) => [...prev, { skillId, isPrimary: false }]);
    }
  };

  const setPrimarySkill = (skillId: string) => {
    setSelectedSkills((prev) => prev.map((s) => ({ ...s, isPrimary: s.skillId === skillId })));
  };

  const handleSaveSkills = async () => {
    setSavingSkills(true);
    try {
      await setVersionSkills(loId, version.versionNumber, { skills: selectedSkills });
      addToast('success', 'Skills updated');
      onUpdate();
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to save skills');
    } finally {
      setSavingSkills(false);
    }
  };

  const addStandard = (standard: Standard) => {
    if (standards.codes.includes(standard.code)) return;
    setStandards((prev) => ({
      ...prev,
      codes: [...prev.codes, standard.code],
      alignments: [
        ...(prev.alignments || []),
        { code: standard.code, framework: standard.framework, description: standard.description },
      ],
    }));
    setStandardSearch('');
    setStandardResults([]);
  };

  const removeStandard = (code: string) => {
    setStandards((prev) => ({
      ...prev,
      codes: prev.codes.filter((c) => c !== code),
      alignments: prev.alignments?.filter((a) => a.code !== code),
    }));
  };

  const handleSaveStandards = async () => {
    setSavingStandards(true);
    try {
      await updateVersion(loId, version.versionNumber, { standardsJson: standards });
      addToast('success', 'Standards updated');
      onUpdate();
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to save standards');
    } finally {
      setSavingStandards(false);
    }
  };

  const getSkillName = (skillId: string) =>
    availableSkills.find((s) => s.id === skillId)?.name || skillId;

  return (
    <div className="space-y-6">
      {/* Skills Section */}
      <Card title="Skills">
        <div className="space-y-4">
          {/* Selected Skills */}
          {selectedSkills.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-muted">Selected Skills</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedSkills.map((skill) => (
                  <div
                    key={skill.skillId}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm',
                      skill.isPrimary ? 'bg-primary text-on-accent' : 'bg-primary/10 text-primary'
                    )}
                  >
                    {skill.isPrimary && (
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    )}
                    <span>{getSkillName(skill.skillId)}</span>
                    {canEdit && (
                      <>
                        {!skill.isPrimary && (
                          <button
                            onClick={() => {
                              setPrimarySkill(skill.skillId);
                            }}
                            className="ml-1 rounded p-0.5 hover:bg-primary/20"
                            title="Make primary"
                          >
                            <svg
                              className="h-3 w-3"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                              />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            toggleSkill(skill.skillId);
                          }}
                          className="ml-1 rounded p-0.5 hover:bg-primary/20"
                        >
                          <svg
                            className="h-3 w-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skill Search */}
          {canEdit && (
            <div>
              <label htmlFor="skillSearch" className="block text-sm font-medium text-text">
                Add Skills
              </label>
              <input
                id="skillSearch"
                type="text"
                value={skillSearch}
                onChange={(e) => {
                  setSkillSearch(e.target.value);
                }}
                className="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Search skills..."
              />
              {skillSearch && (
                <div className="mt-2 max-h-48 overflow-auto rounded-lg border border-border">
                  {filteredSkills.length === 0 ? (
                    <p className="p-3 text-sm text-muted">No skills found</p>
                  ) : (
                    filteredSkills.map((skill) => (
                      <button
                        key={skill.id}
                        onClick={() => {
                          toggleSkill(skill.id);
                        }}
                        className={cn(
                          'block w-full px-3 py-2 text-left text-sm hover:bg-surface-muted',
                          isSkillSelected(skill.id) && 'bg-primary/5'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-text">{skill.name}</span>
                          {isSkillSelected(skill.id) && (
                            <svg
                              className="h-4 w-4 text-primary"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </div>
                        {skill.description && (
                          <p className="text-xs text-muted">{skill.description}</p>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {canEdit && (
            <Button onClick={handleSaveSkills} disabled={savingSkills}>
              {savingSkills ? 'Saving...' : 'Save Skills'}
            </Button>
          )}
        </div>
      </Card>

      {/* Standards Section */}
      <Card title="Standards Alignment">
        <div className="space-y-4">
          {/* Selected Standards */}
          {standards.codes.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-muted">Aligned Standards</label>
              <div className="mt-2 space-y-2">
                {standards.alignments?.map((alignment) => (
                  <div
                    key={alignment.code}
                    className="flex items-start justify-between rounded-lg border border-border p-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge tone="info">{alignment.framework}</Badge>
                        <span className="font-mono text-sm font-medium text-text">
                          {alignment.code}
                        </span>
                      </div>
                      {alignment.description && (
                        <p className="mt-1 text-sm text-muted">{alignment.description}</p>
                      )}
                    </div>
                    {canEdit && (
                      <button
                        onClick={() => {
                          removeStandard(alignment.code);
                        }}
                        className="text-muted hover:text-error"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Standard Search */}
          {canEdit && (
            <div className="relative">
              <label htmlFor="standardSearch" className="block text-sm font-medium text-text">
                Add Standards
              </label>
              <input
                id="standardSearch"
                type="text"
                value={standardSearch}
                onChange={(e) => {
                  setStandardSearch(e.target.value);
                }}
                className="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Search by code or description (e.g., CCSS.ELA, main idea)..."
              />
              {standardResults.length > 0 && (
                <div className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-border bg-surface shadow-lg">
                  {standardResults.map((standard) => (
                    <button
                      key={standard.code}
                      onClick={() => {
                        addStandard(standard);
                      }}
                      disabled={standards.codes.includes(standard.code)}
                      className={cn(
                        'block w-full px-3 py-2 text-left text-sm hover:bg-surface-muted',
                        standards.codes.includes(standard.code) && 'cursor-not-allowed opacity-50'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Badge tone="info" className="text-xs">
                          {standard.framework}
                        </Badge>
                        <span className="font-mono text-xs font-medium text-text">
                          {standard.code}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted">{standard.description}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {canEdit && standards.codes.length > 0 && (
            <Button onClick={handleSaveStandards} disabled={savingStandards}>
              {savingStandards ? 'Saving...' : 'Save Standards'}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
