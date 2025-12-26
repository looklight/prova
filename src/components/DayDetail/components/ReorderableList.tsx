import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GripVertical } from 'lucide-react';
import { colors } from '../../../styles/theme';

/**
 * ReorderableList - Drag-and-drop elegante stile iOS
 *
 * - La card si solleva quando viene afferrata
 * - Le altre card si spostano fluidamente per fare spazio
 * - Nessuna selezione testo su mobile
 */

interface ReorderableListProps<T> {
  items: T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T, index: number, isDragging: boolean) => React.ReactNode;
  onReorder: (items: T[]) => void;
  enabled: boolean;
}

function ReorderableList<T>({
  items,
  keyExtractor,
  onReorder,
  renderItem,
  enabled
}: ReorderableListProps<T>) {
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    dragIndex: number;
    currentIndex: number;
    offsetY: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const itemHeights = useRef<number[]>([]);
  const startY = useRef(0);
  const scrollY = useRef(0);

  // Misura le altezze degli elementi
  useEffect(() => {
    if (containerRef.current) {
      const children = containerRef.current.children;
      itemHeights.current = Array.from(children).map(child =>
        (child as HTMLElement).offsetHeight
      );
    }
  }, [items]);

  // Calcola la posizione target basata sull'offset
  const getTargetIndex = useCallback((dragIndex: number, offsetY: number) => {
    let accumulatedOffset = 0;
    let targetIndex = dragIndex;

    if (offsetY > 0) {
      // Muovendo verso il basso
      for (let i = dragIndex + 1; i < items.length; i++) {
        const threshold = itemHeights.current[i] / 2;
        if (offsetY > accumulatedOffset + threshold) {
          targetIndex = i;
          accumulatedOffset += itemHeights.current[i];
        } else {
          break;
        }
      }
    } else if (offsetY < 0) {
      // Muovendo verso l'alto
      for (let i = dragIndex - 1; i >= 0; i--) {
        const threshold = itemHeights.current[i] / 2;
        if (Math.abs(offsetY) > accumulatedOffset + threshold) {
          targetIndex = i;
          accumulatedOffset += itemHeights.current[i];
        } else {
          break;
        }
      }
    }

    return targetIndex;
  }, [items.length]);

  // Calcola la trasformazione per ogni elemento
  const getTransform = useCallback((index: number) => {
    if (!dragState) return 'translateY(0)';

    const { dragIndex, currentIndex } = dragState;

    if (index === dragIndex) {
      return `translateY(${dragState.offsetY}px)`;
    }

    // Elementi che devono spostarsi
    const draggedHeight = itemHeights.current[dragIndex] || 0;

    if (dragIndex < currentIndex) {
      // Dragging verso il basso: elementi tra dragIndex e currentIndex si spostano su
      if (index > dragIndex && index <= currentIndex) {
        return `translateY(-${draggedHeight}px)`;
      }
    } else if (dragIndex > currentIndex) {
      // Dragging verso l'alto: elementi tra currentIndex e dragIndex si spostano giù
      if (index >= currentIndex && index < dragIndex) {
        return `translateY(${draggedHeight}px)`;
      }
    }

    return 'translateY(0)';
  }, [dragState]);

  // Handler touch/mouse
  const handleStart = useCallback((clientY: number, index: number) => {
    if (!enabled) return;

    startY.current = clientY;
    scrollY.current = window.scrollY;

    setDragState({
      isDragging: true,
      dragIndex: index,
      currentIndex: index,
      offsetY: 0
    });
  }, [enabled]);

  const handleMove = useCallback((clientY: number) => {
    if (!dragState) return;

    const offsetY = clientY - startY.current;
    const targetIndex = getTargetIndex(dragState.dragIndex, offsetY);

    setDragState(prev => prev ? {
      ...prev,
      offsetY,
      currentIndex: targetIndex
    } : null);
  }, [dragState, getTargetIndex]);

  const handleEnd = useCallback(() => {
    if (!dragState) return;

    const { dragIndex, currentIndex } = dragState;

    if (dragIndex !== currentIndex) {
      const newItems = [...items];
      const [removed] = newItems.splice(dragIndex, 1);
      newItems.splice(currentIndex, 0, removed);
      onReorder(newItems);
    }

    setDragState(null);
  }, [dragState, items, onReorder]);

  // Event handlers per touch
  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    handleStart(e.touches[0].clientY, index);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragState) {
      e.preventDefault(); // Previene scroll
      handleMove(e.touches[0].clientY);
    }
  };

  const handleTouchEnd = () => {
    handleEnd();
  };

  // Event handlers per mouse
  const handleMouseDown = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    handleStart(e.clientY, index);

    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientY);
    };

    const handleMouseUp = () => {
      handleEnd();
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: dragState ? 'none' : 'auto'
      }}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {items.map((item, index) => {
        const isDragging = dragState?.dragIndex === index;
        const transform = getTransform(index);

        return (
          <div
            key={keyExtractor(item)}
            className={`relative ${isDragging ? 'z-50' : 'z-0'}`}
            style={{
              transform,
              transition: isDragging ? 'none' : 'transform 200ms cubic-bezier(0.2, 0, 0, 1)',
              willChange: dragState ? 'transform' : 'auto',
              marginBottom: '12px'
            }}
          >
            <div className="flex items-center gap-3">
              {/* Contenuto renderizzato dall'esterno */}
              <div
                className={`flex-1 transition-shadow duration-150 rounded-2xl ${
                  isDragging ? 'shadow-xl' : ''
                }`}
                style={{
                  backgroundColor: isDragging ? colors.bgCard : undefined,
                  transform: isDragging ? 'scale(1.02)' : 'scale(1)',
                  transition: 'transform 150ms ease-out, box-shadow 150ms ease-out'
                }}
              >
                {renderItem(item, index, isDragging)}
              </div>

              {/* Handle di drag */}
              {enabled && (
                <div
                  className="flex items-center justify-center w-8"
                  style={{
                    cursor: isDragging ? 'grabbing' : 'grab',
                    touchAction: 'none'
                  }}
                  onTouchStart={(e) => handleTouchStart(e, index)}
                  onMouseDown={(e) => handleMouseDown(e, index)}
                >
                  <GripVertical
                    size={20}
                    color={isDragging ? colors.accent : colors.textMuted}
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ReorderableList;
