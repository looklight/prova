import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Video, X } from 'lucide-react';
import { CATEGORIES, TRANSPORT_OPTIONS } from './constants';

// ============= ICONE CUSTOM =============
const LinkIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const ImageIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

const FileTextIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

// ============= COSTANTI =============

const BOOKING_COLORS = {
  na: 'bg-gray-400',
  no: 'bg-orange-400',
  yes: 'bg-green-400'
};

// ============= COMPONENTI UI =============
const MediaButton = ({ icon: Icon, label, color, onClick, isLabel = false }) => {
  const colorClasses = {
    blue: 'bg-blue-50 hover:bg-blue-100 text-blue-700',
    green: 'bg-green-50 hover:bg-green-100 text-green-700',
    purple: 'bg-purple-50 hover:bg-purple-100 text-purple-700',
    amber: 'bg-amber-50 hover:bg-amber-100 text-amber-700'
  };

  const baseClass = `flex items-center justify-center gap-1.5 rounded-full text-xs font-medium transition-colors w-10 h-10 md:w-auto md:h-auto md:px-3 md:py-2.5 ${colorClasses[color]}`;

  if (isLabel) {
    return (
      <label className={`${baseClass} cursor-pointer`}>
        <Icon size={16} />
        <span className="hidden md:inline">{label}</span>
        {onClick}
      </label>
    );
  }

  return (
    <button onClick={onClick} className={baseClass}>
      <Icon size={16} />
      <span className="hidden md:inline">{label}</span>
    </button>
  );
};

const BookingToggle = ({ value, onChange }) => {
  const states = [
    { key: 'na', color: 'bg-gray-400', position: 0 },
    { key: 'no', color: 'bg-orange-400', position: 1 },
    { key: 'yes', color: 'bg-green-400', position: 2 }
  ];

  const currentIndex = states.findIndex(s => s.key === value);
  const sliderLeft = currentIndex * 36;

  return (
    <div className="relative inline-flex bg-gray-200 rounded-full p-1 gap-0" style={{ width: '114px', height: '40px' }}>
      <div 
        className={`absolute rounded-full transition-all duration-300 ease-in-out ${states[currentIndex].color}`}
        style={{ 
          width: '34px', 
          height: '32px', 
          left: `${4 + sliderLeft}px`,
          top: '4px'
        }}
      />
      
      {states.map((state) => (
        <button
          key={state.key}
          type="button"
          onClick={() => onChange(state.key)}
          className="relative z-10 flex items-center justify-center"
          style={{ width: '36px', height: '32px', flexShrink: 0 }}
        >
          <div 
            className={`rounded-full transition-colors duration-200 ${
              value === state.key ? 'bg-white' : state.color
            }`}
            style={{ width: '16px', height: '16px' }}
          />
        </button>
      ))}
    </div>
  );
};

const TransportSelector = ({ value, isOpen, onToggle, onChange }) => (
  <div className="relative">
    <button
      onClick={onToggle}
      className="p-1 bg-gray-100 rounded-full hover:bg-gray-200 transition-all w-8 h-8 flex items-center justify-center"
    >
      <span style={{ fontSize: '16px' }}>
        {TRANSPORT_OPTIONS.find(t => t.value === value)?.emoji || '⚫'}
      </span>
    </button>
    
    {isOpen && (
      <div className="absolute top-0 right-0 bg-white shadow-lg rounded-full p-1 flex gap-1 border-2 border-blue-400 z-20">
        {TRANSPORT_OPTIONS.map((transport) => (
          <button
            key={transport.value}
            onClick={() => onChange(transport.value)}
            className={`w-8 h-8 rounded-full flex items-center justify-center hover:bg-blue-50 transition-colors ${
              value === transport.value ? 'bg-blue-100' : ''
            }`}
            title={transport.label}
          >
            <span style={{ fontSize: '16px' }}>{transport.emoji}</span>
          </button>
        ))}
      </div>
    )}
  </div>
);

const CostInput = ({ value, onChange }) => (
  <div className="relative" style={{ width: '90px' }}>
    <input
      type="number"
      inputMode="decimal"
      value={value}
      onChange={onChange}
      placeholder="0"
      className="w-full px-3 py-2.5 pr-7 border rounded-full bg-gray-50 text-sm text-center"
      onWheel={(e) => e.target.blur()}
    />
    <style>{`
      input[type=number]::-webkit-inner-spin-button,
      input[type=number]::-webkit-outer-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }
      input[type=number] {
        -moz-appearance: textfield;
      }
    `}</style>
    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm pointer-events-none">
      €
    </span>
  </div>
);

// ============= COMPONENTI MEDIA =============
const LinkCard = ({ link, onRemove }) => (
  <div className="relative flex flex-col bg-gray-50 rounded-lg p-3 w-full aspect-square overflow-hidden">
    <div className="flex items-start gap-2 flex-1 overflow-hidden">
      <LinkIcon size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0 overflow-hidden">
        <a 
          href={link.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:underline block"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 5,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            wordBreak: 'break-word'
          }}
        >
          {link.title || link.url}
        </a>
      </div>
    </div>
    <button onClick={onRemove} className="absolute top-1 right-1 p-1 hover:bg-gray-200 rounded">
      <X size={12} />
    </button>
  </div>
);

const ImageCard = ({ image, onRemove }) => (
  <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-gray-100">
    <img src={image.url} alt={image.name} className="w-full h-full object-cover" />
    <button 
      onClick={onRemove}
      className="absolute top-1 right-1 p-1 bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full text-white"
    >
      <X size={12} />
    </button>
  </div>
);

const NoteCard = ({ note, onRemove, onClick }) => (
  <div 
    onClick={onClick}
    className="flex flex-col bg-amber-50 rounded-lg p-3 w-full border border-amber-200 cursor-pointer hover:bg-amber-100 transition-colors relative aspect-square"
  >
    <div className="flex-1 overflow-hidden">
      <p className="text-[10px] leading-tight text-gray-700 line-clamp-6">{note.text}</p>
    </div>
    <button 
      onClick={(e) => {
        e.stopPropagation();
        onRemove();
      }} 
      className="absolute top-1 right-1 p-1 hover:bg-amber-200 rounded"
    >
      <X size={12} />
    </button>
  </div>
);

const VideoEmbed = ({ video, onRemove }) => {
  const platforms = {
    instagram: {
      bg: 'bg-gradient-to-br from-purple-400 via-pink-500 to-orange-400',
      icon: '📷',
      name: 'Instagram'
    },
    tiktok: {
      bg: 'bg-black',
      icon: '🎵',
      name: 'TikTok'
    },
    youtube: {
      bg: 'bg-red-600',
      icon: '▶️',
      name: 'YouTube'
    }
  };

  const platform = platforms[video.platform];
  
  return (
    <div className={`relative w-full aspect-square rounded-lg overflow-hidden ${platform.bg}`}>
      <div className="w-full h-full flex items-center justify-center">
        <a 
          href={video.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-white text-center p-4"
        >
          <div className="text-2xl mb-1">{platform.icon}</div>
          <div className="text-xs font-semibold">{platform.name}</div>
          <div className="text-xs opacity-75 mt-1">Tap per aprire</div>
        </a>
      </div>
      <button 
        onClick={onRemove}
        className="absolute top-1 right-1 p-1 bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full text-white"
      >
        <X size={12} />
      </button>
    </div>
  );
};

// ============= UTILITY FUNCTIONS =============
const extractVideoId = (url) => {
  const patterns = [
    { regex: /instagram\.com\/(p|reel|tv)\/([A-Za-z0-9_-]+)/, platform: 'instagram', idIndex: 2 },
    { regex: /tiktok\.com\/.*\/video\/(\d+)/, platform: 'tiktok', idIndex: 1 },
    { regex: /(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]+)/, platform: 'youtube', idIndex: 1 }
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern.regex);
    if (match) return { platform: pattern.platform, id: match[pattern.idIndex] };
  }
  
  return null;
};

// ============= COMPONENTE PRINCIPALE =============
const DayDetailView = ({ trip, dayIndex, onUpdateTrip, onBack, onChangeDayIndex, isDesktop = false }) => {
  const currentDay = trip.days[dayIndex];
  
  const [transportSelectorOpen, setTransportSelectorOpen] = useState({});
  const [mediaDialogOpen, setMediaDialogOpen] = useState(null);
  const [linkInput, setLinkInput] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [videoInput, setVideoInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [editingNote, setEditingNote] = useState(null);
  const [otherExpenses, setOtherExpenses] = useState([{ id: 1, title: '', cost: '' }]);

  const [categoryData, setCategoryData] = useState(() => {
    const data = {};
    CATEGORIES.forEach(cat => {
      const existing = trip.data[`${currentDay.id}-${cat.id}`];
      data[cat.id] = existing || {
        title: '',
        cost: '',
        notes: '',
        bookingStatus: 'na',
        transportMode: 'none',
        links: [],
        images: [],
        videos: [],
        mediaNotes: []
      };
    });
    return data;
  });

  useEffect(() => {
    const data = {};
    CATEGORIES.forEach(cat => {
      const existing = trip.data[`${currentDay.id}-${cat.id}`];
      data[cat.id] = existing || {
        title: '',
        cost: '',
        notes: '',
        bookingStatus: 'na',
        transportMode: 'none',
        links: [],
        images: [],
        videos: [],
        mediaNotes: []
      };
    });
    setCategoryData(data);
    setOtherExpenses([{ id: Date.now(), title: '', cost: '' }]);
  }, [currentDay.id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const newData = { ...trip.data };
      Object.keys(categoryData).forEach(catId => {
        newData[`${currentDay.id}-${catId}`] = categoryData[catId];
      });
      onUpdateTrip({ data: newData });
    }, 300);
    
    return () => clearTimeout(timer);
  }, [categoryData, currentDay.id, onUpdateTrip, trip.data]);

  const updateCategory = (catId, field, value) => {
    setCategoryData(prev => ({
      ...prev,
      [catId]: { ...prev[catId], [field]: value }
    }));
  };

  const getSuggestion = (categoryId) => {
    if (dayIndex === 0) return null;
    
    const prevDay = trip.days[dayIndex - 1];
    const prevData = trip.data[`${prevDay.id}-${categoryId}`];
    
    if (categoryId === 'base') {
      return prevData?.title || null;
    }
    
    if (categoryId === 'pernottamento') {
      const currentBase = categoryData.base.title;
      const prevBase = trip.data[`${prevDay.id}-base`]?.title;
      
      if (currentBase && prevBase && currentBase === prevBase) {
        return prevData?.title || null;
      }
    }
    
    return null;
  };

  const addLink = (categoryId) => {
    if (!linkInput.trim()) return;
  
    // Aggiungi https:// se manca il protocollo
    let url = linkInput.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  
  updateCategory(categoryId, 'links', [
    ...categoryData[categoryId].links,
    { url: url, title: linkTitle || linkInput, id: Date.now() }
  ]);
  setLinkInput('');
  setLinkTitle('');
  setMediaDialogOpen(null);
};

  const addImage = (categoryId, file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      updateCategory(categoryId, 'images', [
        ...categoryData[categoryId].images,
        { url: e.target.result, name: file.name, id: Date.now() }
      ]);
    };
    reader.readAsDataURL(file);
  };

  const addVideo = (categoryId) => {
    if (!videoInput.trim()) return;
    
    const videoData = extractVideoId(videoInput);
    if (videoData) {
      updateCategory(categoryId, 'videos', [
        ...categoryData[categoryId].videos,
        { ...videoData, url: videoInput, id: Date.now() }
      ]);
      setVideoInput('');
      setMediaDialogOpen(null);
    } else {
      alert('URL non valido. Supportati: Instagram, TikTok, YouTube');
    }
  };

  const addNote = (categoryId) => {
    if (!noteInput.trim()) return;
    
    if (editingNote) {
      updateCategory(categoryId, 'mediaNotes', 
        categoryData[categoryId].mediaNotes.map(note =>
          note.id === editingNote.id ? { ...note, text: noteInput } : note
        )
      );
      setEditingNote(null);
    } else {
      updateCategory(categoryId, 'mediaNotes', [
        ...categoryData[categoryId].mediaNotes,
        { text: noteInput, id: Date.now() }
      ]);
    }
    
    setNoteInput('');
    setMediaDialogOpen(null);
  };

  const removeMedia = (categoryId, mediaType, itemId) => {
    updateCategory(
      categoryId,
      mediaType,
      categoryData[categoryId][mediaType].filter(item => item.id !== itemId)
    );
  };

  const addOtherExpense = () => {
    const newExpense = { 
      id: Date.now(), 
      title: '', 
      cost: '' 
    };
    setOtherExpenses(prev => [...prev, newExpense]);
  };

  const removeOtherExpense = (id) => {
  setOtherExpenses(prev => {
    const filtered = prev.filter(exp => exp.id !== id);
    // Assicurati che ci sia sempre almeno una riga vuota
    if (filtered.length === 0) {
      return [{ id: Date.now(), title: '', cost: '' }];
    }
    return filtered;
  });
};

  const updateOtherExpense = (id, field, value) => {
  setOtherExpenses(prev => {
    const updated = prev.map(exp => 
      exp.id === id ? { ...exp, [field]: value } : exp
    );
    
    // Se l'ultima spesa è stata compilata, aggiungi automaticamente una nuova riga vuota
    const lastExpense = updated[updated.length - 1];
    if (lastExpense.title.trim() !== '' || lastExpense.cost.trim() !== '') {
      return [...updated, { id: Date.now(), title: '', cost: '' }];
    }
    
    return updated;
  });
};

  const calculateDayCosts = () => {
    let total = 0;
    CATEGORIES.forEach(cat => {
      if (cat.id !== 'base' && cat.id !== 'note') {
        total += parseFloat(categoryData[cat.id].cost) || 0;
      }
    });
    otherExpenses.forEach(expense => {
      total += parseFloat(expense.cost) || 0;
    });
    return total;
  };

  const calculateTotalTripCosts = () => {
    let total = 0;
    trip.days.forEach(day => {
      CATEGORIES.forEach(cat => {
        if (cat.id !== 'base' && cat.id !== 'note') {
          const cellData = trip.data[`${day.id}-${cat.id}`];
          total += parseFloat(cellData?.cost) || 0;
        }
      });
    });
    return total;
  };

  const dayCost = calculateDayCosts();
  const tripCost = calculateTotalTripCosts();

  return (
    <div className={`bg-gray-50 ${isDesktop ? 'h-full overflow-y-auto' : 'min-h-screen'}`} style={{ 
      maxWidth: isDesktop ? '100%' : '430px',
      margin: '0 auto'
    }}>
      <div className="bg-white px-4 py-4 shadow-sm sticky top-0 z-20">
        <div className="flex items-center justify-between mb-2">
          <button 
            onClick={() => dayIndex > 0 && onChangeDayIndex(dayIndex - 1)} 
            disabled={dayIndex === 0}
            className={`p-2 rounded-full ${dayIndex > 0 ? 'hover:bg-gray-100' : 'opacity-30'}`}
          >
            <ChevronLeft size={24} />
          </button>
          
          <div className="text-center flex-1">
            <h1 className="text-xl font-bold">{trip.name}</h1>
            <div className="text-lg font-semibold">Giorno {currentDay.number}</div>
            <div className="text-xs text-gray-500">
              {currentDay.date.toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: '2-digit' })}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
             onClick={() => dayIndex < trip.days.length - 1 && onChangeDayIndex(dayIndex + 1)}
              disabled={dayIndex === trip.days.length - 1}
              className={`p-2 rounded-full ${dayIndex < trip.days.length - 1 ? 'hover:bg-gray-100' : 'opacity-30'}`}
            >
              <ChevronRight size={24} />
            </button>
            {!isDesktop && onBack && (
              <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full">
                <Calendar size={24} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {CATEGORIES.map((category) => {
          const suggestion = getSuggestion(category.id);
          const showSuggestion = suggestion && !categoryData[category.id].title;
          
          return (
            <div key={category.id} className="bg-white rounded-lg shadow p-4" id={`category-${category.id}`}>
              <div className="flex items-start justify-between mb-3">
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <span>{category.emoji}</span>
                  <span>{category.label}</span>
                </h2>
                
                {(category.id === 'spostamenti1' || category.id === 'spostamenti2') && (
                  <TransportSelector
                    value={categoryData[category.id].transportMode}
                    isOpen={transportSelectorOpen[category.id]}
                    onToggle={() => setTransportSelectorOpen(prev => ({ 
                      ...prev, 
                      [category.id]: !prev[category.id] 
                    }))}
                    onChange={(val) => {
                      updateCategory(category.id, 'transportMode', val);
                      setTransportSelectorOpen(prev => ({ ...prev, [category.id]: false }));
                    }}
                  />
                )}
              </div>
              
              {showSuggestion && (
                <div 
                  onClick={() => updateCategory(category.id, 'title', suggestion)}
                  className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-xs text-blue-600 font-medium mb-1">Suggerimento</div>
                      <div className="text-sm font-semibold text-blue-900">{suggestion}</div>
                    </div>
                    <div className="ml-3 px-3 py-1 bg-blue-500 text-white text-xs rounded-full font-medium">
                      Usa
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex gap-2 mb-3">
                {category.id !== 'note' && (
                  <div className="flex-1 min-w-0 relative">
                    {category.id !== 'base' && category.id !== 'note' && (
                      <div 
                        className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-3 h-3 rounded-full transition-colors ${
                          BOOKING_COLORS[categoryData[category.id].bookingStatus]
                        }`}
                      />
                    )}
                    <input
                      type="text"
                      value={categoryData[category.id].title}
                      onChange={(e) => updateCategory(category.id, 'title', e.target.value)}
                      placeholder={`Nome ${category.label.toLowerCase()}`}
                      className={`w-full px-4 py-2.5 border rounded-full text-sm ${
                        category.id !== 'base' && category.id !== 'note' ? 'pl-8' : ''
                      }`}
                    />
                  </div>
                )}
                
                {category.id !== 'note' && category.id !== 'base' && (
                  <div className="flex-shrink-0">
                    <CostInput
                      value={categoryData[category.id].cost}
                      onChange={(e) => updateCategory(category.id, 'cost', e.target.value)}
                    />
                  </div>
                )}
              </div>

              {category.id !== 'base' && category.id !== 'note' && (
                <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                  <div className="flex-shrink-0">
                    <BookingToggle
                      value={categoryData[category.id].bookingStatus}
                      onChange={(val) => updateCategory(category.id, 'bookingStatus', val)}
                    />
                  </div>
                  
                  <div className="flex gap-2 flex-shrink-0">
                    <MediaButton 
                      icon={LinkIcon} 
                      label="Link" 
                      color="blue" 
                      onClick={() => setMediaDialogOpen({ type: 'link', categoryId: category.id })}
                    />
                    
                    <MediaButton
                      icon={ImageIcon}
                      label="Foto"
                      color="green"
                      isLabel={true}
                      onClick={
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => e.target.files[0] && addImage(category.id, e.target.files[0])}
                        />
                      }
                    />
                    
                    <MediaButton 
                      icon={Video} 
                      label="Video" 
                      color="purple" 
                      onClick={() => setMediaDialogOpen({ type: 'video', categoryId: category.id })}
                    />
                    
                    <MediaButton 
                      icon={FileTextIcon} 
                      label="Nota" 
                      color="amber" 
                      onClick={() => setMediaDialogOpen({ type: 'note', categoryId: category.id })}
                    />
                  </div>
                </div>
              )}

              {category.id === 'note' && (
                <textarea
                  value={categoryData[category.id].notes}
                  onChange={(e) => updateCategory(category.id, 'notes', e.target.value)}
                  placeholder="Aggiungi commento personale"
                  className="w-full px-4 py-2.5 border rounded-lg h-24 resize-none text-sm"
                />
              )}

              {category.id !== 'note' && category.id !== 'base' && (
                <>
                  {(categoryData[category.id].links.length > 0 || 
                    categoryData[category.id].images.length > 0 || 
                    categoryData[category.id].videos.length > 0 ||
                    categoryData[category.id].mediaNotes.length > 0) && (
                    <div className="grid grid-cols-3 gap-2">
                      {categoryData[category.id].links.map(link => (
                        <LinkCard 
                          key={link.id} 
                          link={link} 
                          onRemove={() => removeMedia(category.id, 'links', link.id)} 
                        />
                      ))}
                      {categoryData[category.id].images.map(image => (
                        <ImageCard 
                          key={image.id} 
                          image={image} 
                          onRemove={() => removeMedia(category.id, 'images', image.id)} 
                        />
                      ))}
                      {categoryData[category.id].videos.map(video => (
                        <VideoEmbed 
                          key={video.id} 
                          video={video} 
                          onRemove={() => removeMedia(category.id, 'videos', video.id)} 
                        />
                      ))}
                      {categoryData[category.id].mediaNotes.map(note => (
                        <NoteCard 
                          key={note.id} 
                          note={note} 
                          onRemove={() => removeMedia(category.id, 'mediaNotes', note.id)}
                          onClick={() => {
                            setEditingNote(note);
                            setNoteInput(note.text);
                            setMediaDialogOpen({ type: 'note', categoryId: category.id });
                          }}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold">💸 Altre Spese</h2>
          </div>
          
          <div className="space-y-2">
            {otherExpenses.map((expense) => (
              <div key={expense.id} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={expense.title}
                  onChange={(e) => updateOtherExpense(expense.id, 'title', e.target.value)}
                  placeholder="Descrizione spesa"
                  className="flex-1 min-w-0 px-4 py-2.5 border rounded-full text-sm"
                />
                
                <div className="relative flex-shrink-0" style={{ width: '90px' }}>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={expense.cost}
                    onChange={(e) => updateOtherExpense(expense.id, 'cost', e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2.5 pr-7 border rounded-full bg-gray-50 text-sm text-center"
                    onWheel={(e) => e.target.blur()}
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm pointer-events-none">
                    €
                  </span>
                </div>
                
                {(otherExpenses.length > 1 || expense.title.trim() !== '' || expense.cost.trim() !== '') && (
                  <button
                    type="button"
                    onClick={() => removeOtherExpense(expense.id)}
                    className="w-8 h-8 bg-red-50 hover:bg-red-100 text-red-600 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow p-4 border border-blue-100">
          <h2 className="text-base font-semibold mb-3 text-gray-800">💰 Riepilogo Costi</h2>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center py-2 border-b border-blue-200">
              <span className="text-sm text-gray-600">Giorno {currentDay.number}</span>
              <span className="text-base font-semibold text-gray-800">{dayCost.toFixed(2)} €</span>
            </div>
            
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium text-blue-700">Totale Viaggio</span>
              <span className="text-lg font-bold text-blue-700">{tripCost.toFixed(2)} €</span>
            </div>
          </div>
        </div>
      </div>

      {mediaDialogOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-50" 
          onClick={() => {
            setMediaDialogOpen(null);
            setEditingNote(null);
            setNoteInput('');
          }}
        >
          <div 
            className={`bg-white rounded-t-3xl w-full p-6 ${isDesktop ? 'max-w-md' : 'max-w-[430px]'} mx-auto`} 
            onClick={(e) => e.stopPropagation()}
          >
            {mediaDialogOpen.type === 'link' && (
              <>
                <h3 className="text-lg font-bold mb-4">Aggiungi Link</h3>
                <input
                  type="url"
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-3 border rounded-lg mb-3"
                  autoFocus
                />
                <input
                  type="text"
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                  placeholder="Titolo (opzionale)"
                  className="w-full px-4 py-3 border rounded-lg mb-4"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setMediaDialogOpen(null)}
                    className="flex-1 px-4 py-3 bg-gray-100 rounded-lg font-medium"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={() => addLink(mediaDialogOpen.categoryId)}
                    className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg font-medium"
                  >
                    Aggiungi
                  </button>
                </div>
              </>
            )}
            
            {mediaDialogOpen.type === 'video' && (
              <>
                <h3 className="text-lg font-bold mb-2">Aggiungi Video</h3>
                <p className="text-xs text-gray-500 mb-4">Incolla il link da Instagram, TikTok o YouTube</p>
                <input
                  type="url"
                  value={videoInput}
                  onChange={(e) => setVideoInput(e.target.value)}
                  placeholder="https://instagram.com/p/..."
                  className="w-full px-4 py-3 border rounded-lg mb-4"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setMediaDialogOpen(null)}
                    className="flex-1 px-4 py-3 bg-gray-100 rounded-lg font-medium"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={() => addVideo(mediaDialogOpen.categoryId)}
                    className="flex-1 px-4 py-3 bg-purple-500 text-white rounded-lg font-medium"
                  >
                    Aggiungi
                  </button>
                </div>
              </>
            )}
            
            {mediaDialogOpen.type === 'note' && (
              <>
                <h3 className="text-lg font-bold mb-4">{editingNote ? 'Modifica Nota' : 'Aggiungi Nota'}</h3>
                <textarea
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Scrivi una nota..."
                  className="w-full px-4 py-3 border rounded-lg mb-4 h-64 resize-none"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setMediaDialogOpen(null);
                      setEditingNote(null);
                      setNoteInput('');
                    }}
                    className="flex-1 px-4 py-3 bg-gray-100 rounded-lg font-medium"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={() => addNote(mediaDialogOpen.categoryId)}
                    className="flex-1 px-4 py-3 bg-amber-500 text-white rounded-lg font-medium"
                  >
                    {editingNote ? 'Salva' : 'Aggiungi'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DayDetailView;