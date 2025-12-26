import React, { useState, useEffect, useRef } from 'react';
import { colors } from '../../../styles/theme';
import { OfflineDisabled } from '../../ui';

// ============================================
// ALTROVE - NotesTab
// Tab note - textarea fullscreen semplice
// Con debounce per ottimizzare scritture Firebase
// ============================================

interface NotesTabProps {
  notes: string;
  onUpdateNotes: (value: string) => void;
}

const DEBOUNCE_DELAY = 1500; // 1.5 secondi per ottimizzare scritture Firebase

const NotesTab: React.FC<NotesTabProps> = ({ notes, onUpdateNotes }) => {
  // Stato locale per input immediato
  const [localNotes, setLocalNotes] = useState(notes);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const pendingValueRef = useRef<string | null>(null);
  const lastSavedRef = useRef<string>(notes);
  // Ref per callback stabile (evita re-esecuzione effetti)
  const onUpdateNotesRef = useRef(onUpdateNotes);
  onUpdateNotesRef.current = onUpdateNotes;

  // Sync con prop esterna SOLO quando cambia giorno (notes reference diversa)
  // Ignora se il cambiamento viene dal nostro stesso salvataggio
  useEffect(() => {
    if (notes !== lastSavedRef.current) {
      // Il valore è cambiato dall'esterno (es. cambio giorno)
      setLocalNotes(notes);
      lastSavedRef.current = notes;
      pendingValueRef.current = null;

      // Cancella eventuali debounce pendenti
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    }
  }, [notes]);

  // Cleanup e salvataggio finale su unmount (solo una volta)
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      // Salva se c'è un valore pendente
      if (pendingValueRef.current !== null && pendingValueRef.current !== lastSavedRef.current) {
        onUpdateNotesRef.current(pendingValueRef.current);
      }
    };
  }, []); // Nessuna dipendenza - esegue cleanup solo su unmount reale

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setLocalNotes(value);
    pendingValueRef.current = value;

    // Clear previous timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Set new debounced save
    debounceRef.current = setTimeout(() => {
      if (pendingValueRef.current !== null) {
        onUpdateNotesRef.current(pendingValueRef.current);
        lastSavedRef.current = pendingValueRef.current;
        pendingValueRef.current = null;
        console.log('💾 Note salvate (debounced)');
      }
      debounceRef.current = null;
    }, DEBOUNCE_DELAY);
  };

  return (
    <div className="p-4 h-full">
      <OfflineDisabled>
        <textarea
          value={localNotes}
          onChange={handleChange}
          placeholder="Scrivi le tue note per questo giorno...

Idee, promemoria, cose da non dimenticare..."
          className="w-full h-full min-h-[300px] p-4 rounded-xl text-sm resize-none border-0 focus:outline-none focus:ring-2 focus:ring-opacity-50"
          style={{
            backgroundColor: colors.bgSubtle,
            color: colors.text,
            '--tw-ring-color': colors.accent
          } as React.CSSProperties}
        />
      </OfflineDisabled>
    </div>
  );
};

export default NotesTab;