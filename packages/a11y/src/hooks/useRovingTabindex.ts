import { useRef, useCallback, useState } from 'react';
import { RovingTabindexOptions } from '../types';

interface RovingTabindexReturn<T extends HTMLElement> {
  containerRef: React.RefObject<T | null>;
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
  getItemProps: (index: number) => {
    tabIndex: number;
    onKeyDown: (e: React.KeyboardEvent) => void;
    onFocus: () => void;
    ref: (el: HTMLElement | null) => void;
  };
  focusItem: (index: number) => void;
}

/**
 * Hook for roving tabindex pattern
 */
export function useRovingTabindex<T extends HTMLElement>(
  itemCount: number,
  options: RovingTabindexOptions = {}
): RovingTabindexReturn<T> {
  const { orientation = 'both', wrap = true, initialIndex = 0 } = options;

  const containerRef = useRef<T>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  const focusItem = useCallback((index: number) => {
    const item = itemRefs.current[index];
    if (item) {
      item.focus();
      setCurrentIndex(index);
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      let newIndex = index;
      let handled = false;

      switch (e.key) {
        case 'ArrowRight':
          if (orientation === 'horizontal' || orientation === 'both') {
            newIndex = wrap
              ? (index + 1) % itemCount
              : Math.min(index + 1, itemCount - 1);
            handled = true;
          }
          break;
        case 'ArrowLeft':
          if (orientation === 'horizontal' || orientation === 'both') {
            newIndex = wrap
              ? (index - 1 + itemCount) % itemCount
              : Math.max(index - 1, 0);
            handled = true;
          }
          break;
        case 'ArrowDown':
          if (orientation === 'vertical' || orientation === 'both') {
            newIndex = wrap
              ? (index + 1) % itemCount
              : Math.min(index + 1, itemCount - 1);
            handled = true;
          }
          break;
        case 'ArrowUp':
          if (orientation === 'vertical' || orientation === 'both') {
            newIndex = wrap
              ? (index - 1 + itemCount) % itemCount
              : Math.max(index - 1, 0);
            handled = true;
          }
          break;
        case 'Home':
          newIndex = 0;
          handled = true;
          break;
        case 'End':
          newIndex = itemCount - 1;
          handled = true;
          break;
      }

      if (handled) {
        e.preventDefault();
        focusItem(newIndex);
      }
    },
    [orientation, wrap, itemCount, focusItem]
  );

  const getItemProps = useCallback(
    (index: number) => ({
      tabIndex: index === currentIndex ? 0 : -1,
      onKeyDown: (e: React.KeyboardEvent) => handleKeyDown(e, index),
      onFocus: () => setCurrentIndex(index),
      ref: (el: HTMLElement | null) => {
        itemRefs.current[index] = el;
      },
    }),
    [currentIndex, handleKeyDown]
  );

  return {
    containerRef,
    currentIndex,
    setCurrentIndex,
    getItemProps,
    focusItem,
  };
}

/**
 * Hook for grid navigation with roving tabindex
 */
export function useGridNavigation<T extends HTMLElement>(
  rows: number,
  cols: number,
  options: { wrap?: boolean; initialRow?: number; initialCol?: number } = {}
) {
  const { wrap = true, initialRow = 0, initialCol = 0 } = options;

  const containerRef = useRef<T>(null);
  const [currentRow, setCurrentRow] = useState(initialRow);
  const [currentCol, setCurrentCol] = useState(initialCol);
  const cellRefs = useRef<Map<string, HTMLElement>>(new Map());

  const getCellKey = (row: number, col: number) => `${row}-${col}`;

  const focusCell = useCallback(
    (row: number, col: number) => {
      const cell = cellRefs.current.get(getCellKey(row, col));
      if (cell) {
        cell.focus();
        setCurrentRow(row);
        setCurrentCol(col);
      }
    },
    []
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      let newRow = currentRow;
      let newCol = currentCol;
      let handled = false;

      switch (e.key) {
        case 'ArrowRight':
          newCol = wrap
            ? (currentCol + 1) % cols
            : Math.min(currentCol + 1, cols - 1);
          handled = true;
          break;
        case 'ArrowLeft':
          newCol = wrap
            ? (currentCol - 1 + cols) % cols
            : Math.max(currentCol - 1, 0);
          handled = true;
          break;
        case 'ArrowDown':
          newRow = wrap
            ? (currentRow + 1) % rows
            : Math.min(currentRow + 1, rows - 1);
          handled = true;
          break;
        case 'ArrowUp':
          newRow = wrap
            ? (currentRow - 1 + rows) % rows
            : Math.max(currentRow - 1, 0);
          handled = true;
          break;
        case 'Home':
          if (e.ctrlKey) {
            newRow = 0;
            newCol = 0;
          } else {
            newCol = 0;
          }
          handled = true;
          break;
        case 'End':
          if (e.ctrlKey) {
            newRow = rows - 1;
            newCol = cols - 1;
          } else {
            newCol = cols - 1;
          }
          handled = true;
          break;
        case 'PageUp':
          newRow = 0;
          handled = true;
          break;
        case 'PageDown':
          newRow = rows - 1;
          handled = true;
          break;
      }

      if (handled) {
        e.preventDefault();
        focusCell(newRow, newCol);
      }
    },
    [currentRow, currentCol, rows, cols, wrap, focusCell]
  );

  const getCellProps = useCallback(
    (row: number, col: number) => ({
      tabIndex: row === currentRow && col === currentCol ? 0 : -1,
      onKeyDown: handleKeyDown,
      onFocus: () => {
        setCurrentRow(row);
        setCurrentCol(col);
      },
      ref: (el: HTMLElement | null) => {
        const key = getCellKey(row, col);
        if (el) {
          cellRefs.current.set(key, el);
        } else {
          cellRefs.current.delete(key);
        }
      },
    }),
    [currentRow, currentCol, handleKeyDown]
  );

  return {
    containerRef,
    currentRow,
    currentCol,
    getCellProps,
    focusCell,
  };
}
