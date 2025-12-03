import React from 'react';

interface TimelineSegment {
  type: 'card' | 'collapsed-group';
  categories: Array<{
    id: string;
    label: string;
    emoji: string;
  }>;
}

interface DayTimelineProps {
  segments: TimelineSegment[];
  renderCard: (category: TimelineSegment['categories'][0]) => React.ReactNode;
  renderCollapsedGroup: (categories: TimelineSegment['categories'], segmentIndex: number) => React.ReactNode;
}

const DayTimeline: React.FC<DayTimelineProps> = ({
  segments,
  renderCard,
  renderCollapsedGroup
}) => {
  const totalSegments = segments.length;

  return (
    <div className="relative">
      {segments.map((segment, index) => {
        const isFirst = index === 0;
        const isLast = index === totalSegments - 1;
        const isCollapsed = segment.type === 'collapsed-group';

        return (
          <div key={segment.type === 'card' ? segment.categories[0].id : `collapsed-${index}`} className="relative flex">
            {/* Colonna timeline (pallino + linee) */}
            <div className="relative flex flex-col items-center mr-2" style={{ width: '12px' }}>
              {/* Linea sopra il pallino (non per il primo) */}
              {!isFirst && (
                <div className="w-0.5 bg-gray-200 flex-1" />
              )}
              
              {/* Pallino */}
              <div
                className={`flex-shrink-0 rounded-full ${
                  isCollapsed
                    ? 'w-2 h-2 border-2 border-gray-300 bg-white'
                    : 'w-2.5 h-2.5 bg-gray-400'
                }`}
              />
              
              {/* Linea sotto il pallino (non per l'ultimo) */}
              {!isLast && (
                <div className="w-0.5 bg-gray-200 flex-1" />
              )}
            </div>

            {/* Contenuto (card o chips) */}
            <div className="flex-1 pb-3">
              {segment.type === 'card' ? (
                renderCard(segment.categories[0])
              ) : (
                renderCollapsedGroup(segment.categories, index)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DayTimeline;