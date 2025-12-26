import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook per gestire input con debounce
 *
 * Mantiene uno stato locale per l'input immediato (UX fluida)
 * e debounce la chiamata alla funzione di salvataggio.
 *
 * @param externalValue - Valore controllato dall'esterno (es. da props)
 * @param onSave - Callback chiamata dopo il debounce
 * @param delay - Delay in ms (default: 800ms)
 *
 * @example
 * const { localValue, handleChange, flush } = useDebouncedInput(
 *   activity.title,
 *   (value) => onUpdate({ title: value }),
 *   800
 * );
 *
 * <input value={localValue} onChange={handleChange} />
 */

const DEFAULT_DELAY = 800;

interface UseDebouncedInputOptions {
  delay?: number;
}

interface UseDebouncedInputReturn {
  /** Valore locale da usare nell'input */
  localValue: string;
  /** Handler per onChange dell'input */
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  /** Imposta valore direttamente (senza evento) */
  setValue: (value: string) => void;
  /** Forza il salvataggio immediato (utile su blur) */
  flush: () => void;
  /** True se c'è un salvataggio pendente */
  isPending: boolean;
}

export const useDebouncedInput = (
  externalValue: string,
  onSave: (value: string) => void,
  options: UseDebouncedInputOptions = {}
): UseDebouncedInputReturn => {
  const { delay = DEFAULT_DELAY } = options;

  // Stato locale per input immediato
  const [localValue, setLocalValue] = useState(externalValue);

  // Refs per gestire il debounce
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const pendingValueRef = useRef<string | null>(null);
  const lastSavedRef = useRef<string>(externalValue);
  const onSaveRef = useRef(onSave);

  // Mantieni la callback aggiornata
  onSaveRef.current = onSave;

  // Sync con valore esterno quando cambia (es. cambio giorno/attività)
  useEffect(() => {
    // Se il valore esterno è cambiato E non è il risultato del nostro salvataggio
    if (externalValue !== lastSavedRef.current) {
      setLocalValue(externalValue);
      lastSavedRef.current = externalValue;
      pendingValueRef.current = null;

      // Cancella debounce pendenti
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    }
  }, [externalValue]);

  // Cleanup e salvataggio su unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      // Salva se c'è un valore pendente diverso dall'ultimo salvato
      if (pendingValueRef.current !== null &&
          pendingValueRef.current !== lastSavedRef.current) {
        onSaveRef.current(pendingValueRef.current);
      }
    };
  }, []);

  // Handler per cambio input
  const handleChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = e.target.value;
    setLocalValue(value);
    pendingValueRef.current = value;

    // Clear previous timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Set new debounced save
    debounceRef.current = setTimeout(() => {
      if (pendingValueRef.current !== null) {
        onSaveRef.current(pendingValueRef.current);
        lastSavedRef.current = pendingValueRef.current;
        pendingValueRef.current = null;
      }
      debounceRef.current = null;
    }, delay);
  }, [delay]);

  // Imposta valore direttamente (senza evento)
  const setValue = useCallback((value: string) => {
    setLocalValue(value);
    pendingValueRef.current = value;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      if (pendingValueRef.current !== null) {
        onSaveRef.current(pendingValueRef.current);
        lastSavedRef.current = pendingValueRef.current;
        pendingValueRef.current = null;
      }
      debounceRef.current = null;
    }, delay);
  }, [delay]);

  // Flush: salva immediatamente
  const flush = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    if (pendingValueRef.current !== null &&
        pendingValueRef.current !== lastSavedRef.current) {
      onSaveRef.current(pendingValueRef.current);
      lastSavedRef.current = pendingValueRef.current;
      pendingValueRef.current = null;
    }
  }, []);

  return {
    localValue,
    handleChange,
    setValue,
    flush,
    isPending: pendingValueRef.current !== null
  };
};

export default useDebouncedInput;
