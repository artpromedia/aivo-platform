'use client';

import { useState, useEffect } from 'react';
import { getManipulatives, saveManipulativeState, type Manipulative } from '../../../../lib/math-api';

interface VirtualManipulativesProps {
  learnerId: string;
}

/**
 * Virtual Manipulatives Component
 * 
 * Provides interactive visual tools for math learning:
 * - Fraction bars for understanding parts and wholes
 * - Number lines for visualizing quantities
 * - Base-ten blocks for place value
 * - Algebra tiles for equations
 * - Geometric shapes for spatial reasoning
 * - Counters for basic operations
 */
export function VirtualManipulatives({ learnerId }: Readonly<VirtualManipulativesProps>) {
  const [manipulatives, setManipulatives] = useState<Manipulative[]>([]);
  const [selectedManipulative, setSelectedManipulative] = useState<Manipulative | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fraction bars state
  const [fractionBars, setFractionBars] = useState<Array<{ denominator: number; shaded: number }>>([
    { denominator: 4, shaded: 2 },
  ]);

  // Number line state
  const [numberLineRange, setNumberLineRange] = useState({ min: 0, max: 10 });
  const [numberLineMarker, setNumberLineMarker] = useState(5);

  // Base-ten blocks state
  const [baseTenBlocks, setBaseTenBlocks] = useState({ hundreds: 2, tens: 3, ones: 7 });

  // Algebra tiles state
  const [algebraTiles, setAlgebraTiles] = useState({
    xSquared: 1,
    x: 2,
    constant: 3,
  });

  // Counters state
  const [counters, setCounters] = useState({ total: 12, grouped: false, groupSize: 3 });

  useEffect(() => {
    loadManipulatives();
  }, []);

  const loadManipulatives = async () => {
    try {
      const data = await getManipulatives();
      setManipulatives(data);
      if (data.length > 0) {
        setSelectedManipulative(data[0]);
      }
    } catch (error) {
      console.error('Failed to load manipulatives:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveState = async () => {
    if (!selectedManipulative) return;

    let state: Record<string, any> = {};

    switch (selectedManipulative.type) {
      case 'fraction-bars':
        state = { fractionBars };
        break;
      case 'number-line':
        state = { range: numberLineRange, marker: numberLineMarker };
        break;
      case 'base-ten-blocks':
        state = baseTenBlocks;
        break;
      case 'algebra-tiles':
        state = algebraTiles;
        break;
      case 'counters':
        state = counters;
        break;
    }

    try {
      await saveManipulativeState({
        manipulativeId: selectedManipulative.id,
        state,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  };

  const renderManipulative = () => {
    if (!selectedManipulative) return null;

    switch (selectedManipulative.type) {
      case 'fraction-bars':
        return renderFractionBars();
      case 'number-line':
        return renderNumberLine();
      case 'base-ten-blocks':
        return renderBaseTenBlocks();
      case 'algebra-tiles':
        return renderAlgebraTiles();
      case 'geometric-shapes':
        return renderGeometricShapes();
      case 'counters':
        return renderCounters();
      default:
        return null;
    }
  };

  const renderFractionBars = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-slate-900">Fraction Bars</h3>
        <button
          onClick={() =>
            setFractionBars([...fractionBars, { denominator: 4, shaded: 0 }])
          }
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          + Add Bar
        </button>
      </div>

      <div className="space-y-4">
        {fractionBars.map((bar, index) => (
          <div key={`bar-${bar.denominator}-${bar.shaded}-${index}`} className="bg-slate-50 rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <span className="font-medium text-slate-900">
                {bar.shaded}/{bar.denominator}
              </span>
              <button
                onClick={() => {
                  const newBars = [...fractionBars];
                  newBars.splice(index, 1);
                  setFractionBars(newBars);
                }}
                className="text-red-600 hover:text-red-700 text-sm"
              >
                Remove
              </button>
            </div>

            <div className="flex gap-1 mb-3">
              {Array.from({ length: bar.denominator }).map((_, i) => (
                <button
                  key={`bar-${index}-segment-${i}`}
                  onClick={() => {
                    const newBars = [...fractionBars];
                    const newShaded = i < bar.shaded ? bar.shaded - 1 : i + 1;
                    newBars[index].shaded = newShaded;
                    setFractionBars(newBars);
                  }}
                  className={`flex-1 h-16 border-2 rounded transition-colors ${
                    i < bar.shaded
                      ? 'bg-indigo-500 border-indigo-600'
                      : 'bg-white border-slate-300 hover:bg-slate-100'
                  }`}
                />
              ))}
            </div>

            <div className="flex gap-3">
              <label className="text-sm text-slate-700">
                Denominator:
                {' '}
                <input
                  type="number"
                  min="2"
                  max="16"
                  value={bar.denominator}
                  onChange={(e) => {
                    const newBars = [...fractionBars];
                    newBars[index].denominator = Math.max(2, Number.parseInt(e.target.value, 10) || 2);
                    newBars[index].shaded = Math.min(newBars[index].shaded, newBars[index].denominator);
                    setFractionBars(newBars);
                  }}
                  className="ml-2 w-16 px-2 py-1 border border-slate-300 rounded"
                />
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderNumberLine = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-slate-900">Number Line</h3>

      <div className="bg-slate-50 rounded-lg p-6">
        <div className="mb-6 flex gap-4">
          <label className="text-sm text-slate-700">
            Min:
            {' '}
            <input
              type="number"
              value={numberLineRange.min}
              onChange={(e) =>
                setNumberLineRange({ ...numberLineRange, min: Number.parseInt(e.target.value, 10) || 0 })
              }
              className="ml-2 w-20 px-2 py-1 border border-slate-300 rounded"
            />
          </label>
          <label className="text-sm text-slate-700">
            Max:
            {' '}
            <input
              type="number"
              value={numberLineRange.max}
              onChange={(e) =>
                setNumberLineRange({ ...numberLineRange, max: Number.parseInt(e.target.value, 10) || 10 })
              }
              className="ml-2 w-20 px-2 py-1 border border-slate-300 rounded"
            />
          </label>
        </div>

        <div className="relative h-24">
          <div className="absolute top-10 left-0 right-0 h-1 bg-slate-800" />
          
          {/* Tick marks */}
          {Array.from({ length: numberLineRange.max - numberLineRange.min + 1 }).map((_, i) => {
            const value = numberLineRange.min + i;
            const position = (i / (numberLineRange.max - numberLineRange.min)) * 100;
            
            return (
              <div key={`tick-${value}`} className="absolute" style={{ left: `${position}%`, top: 0 }}>
                <div className="relative">
                  <div className="absolute -left-px w-0.5 h-6 bg-slate-800" style={{ top: '2rem' }} />
                  <div className="absolute -translate-x-1/2 text-sm text-slate-700" style={{ top: '3.5rem' }}>
                    {value}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Marker */}
          <div
            className="absolute w-6 h-6 bg-red-500 rounded-full cursor-pointer border-2 border-white shadow-lg"
            style={{
              left: `${((numberLineMarker - numberLineRange.min) / (numberLineRange.max - numberLineRange.min)) * 100}%`,
              top: '1.75rem',
              transform: 'translateX(-50%)',
            }}
          />
        </div>

        <div className="mt-8">
          <label className="text-sm text-slate-700">
            Marker Value:
            {' '}
            <input
              type="range"
              min={numberLineRange.min}
              max={numberLineRange.max}
              value={numberLineMarker}
              onChange={(e) => setNumberLineMarker(Number.parseInt(e.target.value, 10))}
              className="ml-2 w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-red-500"
            />
            <span className="ml-2 font-medium">{numberLineMarker}</span>
          </label>
        </div>
      </div>
    </div>
  );

  const renderBaseTenBlocks = () => {
    const value = baseTenBlocks.hundreds * 100 + baseTenBlocks.tens * 10 + baseTenBlocks.ones;
    
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-slate-900">Base-Ten Blocks</h3>
          <div className="text-2xl font-bold text-indigo-600">{value}</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Hundreds */}
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="text-center mb-3">
              <div className="text-lg font-semibold text-slate-900">Hundreds</div>
              <div className="text-sm text-slate-600">100 each</div>
            </div>
            <div className="flex flex-wrap gap-2 min-h-[100px] justify-center">
              {Array.from({ length: baseTenBlocks.hundreds }).map((_, i) => (
                <div
                  key={`hundreds-${baseTenBlocks.hundreds}-${i}`}
                  className="w-16 h-16 bg-blue-500 border-2 border-blue-700 rounded grid grid-cols-10 grid-rows-10 gap-px p-px"
                >
                  {Array.from({ length: 100 }).map((_, j) => (
                    <div key={`hundred-${i}-cell-${j}`} className="bg-blue-600" />
                  ))}
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2 justify-center">
              <button
                onClick={() => setBaseTenBlocks({ ...baseTenBlocks, hundreds: Math.max(0, baseTenBlocks.hundreds - 1) })}
                className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
              >
                −
              </button>
              <button
                onClick={() => setBaseTenBlocks({ ...baseTenBlocks, hundreds: baseTenBlocks.hundreds + 1 })}
                className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
              >
                +
              </button>
            </div>
          </div>

          {/* Tens */}
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="text-center mb-3">
              <div className="text-lg font-semibold text-slate-900">Tens</div>
              <div className="text-sm text-slate-600">10 each</div>
            </div>
            <div className="flex flex-wrap gap-2 min-h-[100px] justify-center">
              {Array.from({ length: baseTenBlocks.tens }).map((_, i) => (
                <div key={`tens-${baseTenBlocks.tens}-${i}`} className="w-12 h-16 bg-green-500 border-2 border-green-700 rounded grid grid-rows-10 gap-px p-px">
                  {Array.from({ length: 10 }).map((_, j) => (
                    <div key={`ten-${i}-cell-${j}`} className="bg-green-600" />
                  ))}
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2 justify-center">
              <button
                onClick={() => setBaseTenBlocks({ ...baseTenBlocks, tens: Math.max(0, baseTenBlocks.tens - 1) })}
                className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
              >
                −
              </button>
              <button
                onClick={() => setBaseTenBlocks({ ...baseTenBlocks, tens: baseTenBlocks.tens + 1 })}
                className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
              >
                +
              </button>
            </div>
          </div>

          {/* Ones */}
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="text-center mb-3">
              <div className="text-lg font-semibold text-slate-900">Ones</div>
              <div className="text-sm text-slate-600">1 each</div>
            </div>
            <div className="flex flex-wrap gap-2 min-h-[100px] justify-center">
              {Array.from({ length: baseTenBlocks.ones }).map((_, i) => (
                <div key={`ones-${baseTenBlocks.ones}-${i}`} className="w-6 h-6 bg-yellow-500 border-2 border-yellow-700 rounded" />
              ))}
            </div>
            <div className="mt-3 flex gap-2 justify-center">
              <button
                onClick={() => setBaseTenBlocks({ ...baseTenBlocks, ones: Math.max(0, baseTenBlocks.ones - 1) })}
                className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
              >
                −
              </button>
              <button
                onClick={() => setBaseTenBlocks({ ...baseTenBlocks, ones: baseTenBlocks.ones + 1 })}
                className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div className="bg-indigo-50 rounded-lg p-4 text-center">
          <div className="text-sm text-indigo-800">
            {baseTenBlocks.hundreds} × 100 + {baseTenBlocks.tens} × 10 + {baseTenBlocks.ones} × 1 = <span className="font-bold">{value}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderAlgebraTiles = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-slate-900">Algebra Tiles</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* x² tiles */}
        <div className="bg-slate-50 rounded-lg p-4">
          <div className="text-center mb-3">
            <div className="text-lg font-semibold text-slate-900">x²</div>
            <div className="text-sm text-slate-600">Large squares</div>
          </div>
          <div className="flex flex-wrap gap-2 min-h-[100px] justify-center">
            {Array.from({ length: algebraTiles.xSquared }).map((_, i) => (
              <div key={`xsquared-${algebraTiles.xSquared}-${i}`} className="w-20 h-20 bg-red-400 border-2 border-red-600 rounded flex items-center justify-center text-white font-bold">
                x²
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2 justify-center">
            <button
              onClick={() => setAlgebraTiles({ ...algebraTiles, xSquared: Math.max(0, algebraTiles.xSquared - 1) })}
              className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
            >
              −
            </button>
            <button
              onClick={() => setAlgebraTiles({ ...algebraTiles, xSquared: algebraTiles.xSquared + 1 })}
              className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
            >
              +
            </button>
          </div>
        </div>

        {/* x tiles */}
        <div className="bg-slate-50 rounded-lg p-4">
          <div className="text-center mb-3">
            <div className="text-lg font-semibold text-slate-900">x</div>
            <div className="text-sm text-slate-600">Rectangles</div>
          </div>
          <div className="flex flex-wrap gap-2 min-h-[100px] justify-center items-center">
            {Array.from({ length: algebraTiles.x }).map((_, i) => (
              <div key={`x-${algebraTiles.x}-${i}`} className="w-16 h-8 bg-blue-400 border-2 border-blue-600 rounded flex items-center justify-center text-white font-bold">
                x
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2 justify-center">
            <button
              onClick={() => setAlgebraTiles({ ...algebraTiles, x: Math.max(0, algebraTiles.x - 1) })}
              className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
            >
              −
            </button>
            <button
              onClick={() => setAlgebraTiles({ ...algebraTiles, x: algebraTiles.x + 1 })}
              className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
            >
              +
            </button>
          </div>
        </div>

        {/* Constant tiles */}
        <div className="bg-slate-50 rounded-lg p-4">
          <div className="text-center mb-3">
            <div className="text-lg font-semibold text-slate-900">1</div>
            <div className="text-sm text-slate-600">Unit squares</div>
          </div>
          <div className="flex flex-wrap gap-2 min-h-[100px] justify-center">
            {Array.from({ length: algebraTiles.constant }).map((_, i) => (
              <div key={`constant-${algebraTiles.constant}-${i}`} className="w-8 h-8 bg-green-400 border-2 border-green-600 rounded flex items-center justify-center text-white font-bold">
                1
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2 justify-center">
            <button
              onClick={() => setAlgebraTiles({ ...algebraTiles, constant: Math.max(0, algebraTiles.constant - 1) })}
              className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
            >
              −
            </button>
            <button
              onClick={() => setAlgebraTiles({ ...algebraTiles, constant: algebraTiles.constant + 1 })}
              className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div className="bg-purple-50 rounded-lg p-4 text-center">
        <div className="text-sm text-purple-800">
          Expression: {algebraTiles.xSquared > 0 && `${algebraTiles.xSquared}x²`}
          {algebraTiles.x > 0 && ` + ${algebraTiles.x}x`}
          {algebraTiles.constant > 0 && ` + ${algebraTiles.constant}`}
        </div>
      </div>
    </div>
  );

  const renderGeometricShapes = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-slate-900">Geometric Shapes</h3>
      <div className="bg-slate-50 rounded-lg p-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {/* Circle */}
          <div className="text-center">
            <div className="w-24 h-24 mx-auto bg-blue-400 rounded-full border-4 border-blue-600 mb-2" />
            <div className="text-sm font-medium text-slate-700">Circle</div>
          </div>

          {/* Square */}
          <div className="text-center">
            <div className="w-24 h-24 mx-auto bg-red-400 border-4 border-red-600 mb-2" />
            <div className="text-sm font-medium text-slate-700">Square</div>
          </div>

          {/* Triangle */}
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-2 relative">
              <div className="absolute inset-0 bg-green-400 border-4 border-green-600" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
            </div>
            <div className="text-sm font-medium text-slate-700">Triangle</div>
          </div>

          {/* Rectangle */}
          <div className="text-center">
            <div className="w-32 h-20 mx-auto bg-purple-400 border-4 border-purple-600 mb-2" />
            <div className="text-sm font-medium text-slate-700">Rectangle</div>
          </div>
        </div>
        <p className="text-center text-sm text-slate-600 mt-6">
          Drag and arrange shapes to explore geometric concepts
        </p>
      </div>
    </div>
  );

  const renderCounters = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-slate-900">Counters</h3>

      <div className="bg-slate-50 rounded-lg p-6">
        <div className="mb-4 flex gap-4 items-center">
          <label className="text-sm text-slate-700">
            Total:
            {' '}
            <input
              type="number"
              min="0"
              max="50"
              value={counters.total}
              onChange={(e) => setCounters({ ...counters, total: Number.parseInt(e.target.value, 10) || 0 })}
              className="ml-2 w-20 px-2 py-1 border border-slate-300 rounded"
            />
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={counters.grouped}
              onChange={(e) => setCounters({ ...counters, grouped: e.target.checked })}
              className="rounded text-indigo-600"
            />
            <span className="text-sm text-slate-700">Group counters</span>
          </label>
          {counters.grouped && (
            <label className="text-sm text-slate-700">
              Group size:
              {' '}
              <input
                type="number"
                min="2"
                max="10"
                value={counters.groupSize}
                onChange={(e) => setCounters({ ...counters, groupSize: Number.parseInt(e.target.value, 10) || 3 })}
                className="ml-2 w-16 px-2 py-1 border border-slate-300 rounded"
              />
            </label>
          )}
        </div>

        <div className="min-h-[200px] p-4">
          {counters.grouped ? (
            <div className="flex flex-wrap gap-4">
              {Array.from({ length: Math.ceil(counters.total / counters.groupSize) }).map((_, groupIndex) => {
                const groupStart = groupIndex * counters.groupSize;
                const groupCount = Math.min(counters.groupSize, counters.total - groupStart);
                
                return (
                  <div key={`group-${counters.total}-${counters.groupSize}-${groupIndex}`} className="bg-white border-2 border-indigo-300 rounded-lg p-2">
                    <div className="flex flex-wrap gap-1">
                      {Array.from({ length: groupCount }).map((_, i) => (
                        <div key={`group-${groupIndex}-counter-${i}`} className="w-6 h-6 bg-yellow-400 border-2 border-yellow-600 rounded-full" />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: counters.total }).map((_, i) => (
                <div key={`counter-${counters.total}-${i}`} className="w-8 h-8 bg-yellow-400 border-2 border-yellow-600 rounded-full" />
              ))}
            </div>
          )}
        </div>

        {counters.grouped && (
          <div className="mt-4 bg-indigo-50 rounded-lg p-3 text-center text-sm text-indigo-800">
            {Math.floor(counters.total / counters.groupSize)} groups of {counters.groupSize}
            {counters.total % counters.groupSize > 0 && ` with ${counters.total % counters.groupSize} remaining`}
          </div>
        )}
      </div>
    </div>
  );

  if (isLoading) {
    return <div className="text-center py-12">Loading manipulatives...</div>;
  }

  return (
    <div>
      {/* Manipulative Selector */}
      <div className="mb-6 flex flex-wrap gap-2">
        {manipulatives.map((manip) => (
          <button
            key={manip.id}
            onClick={() => setSelectedManipulative(manip)}
            className={`px-4 py-2 rounded-lg border-2 transition-all ${
              selectedManipulative?.id === manip.id
                ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                : 'border-slate-300 bg-white text-slate-700 hover:border-indigo-400'
            }`}
          >
            {manip.icon} {manip.name}
          </button>
        ))}
      </div>

      {/* Manipulative Display */}
      <div className="bg-white rounded-lg shadow p-6">
        {renderManipulative()}

        <div className="mt-6 pt-6 border-t border-slate-200 flex justify-between items-center">
          <p className="text-sm text-slate-600">
            {selectedManipulative?.description}
          </p>
          <button
            onClick={handleSaveState}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            💾 Save Progress
          </button>
        </div>
      </div>
    </div>
  );
}
