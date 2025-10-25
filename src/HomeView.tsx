import React, { useRef, useState } from 'react';
import { MapPin, User, Plus, Upload, Download, FileText, Trash2 } from 'lucide-react';
import TripMetadataModal from './TripMetadataModal';

const HomeView = ({ trips, onCreateNew, onOpenTrip, onDeleteTrip, onExportTrip, onImportTrip, onOpenProfile, currentUser }) => {
  const fileInputRef = useRef(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [exportMenu, setExportMenu] = useState(null);
  // 🆕 Stato per il modal di creazione viaggio
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      onImportTrip(file);
      e.target.value = '';
    }
  };

  // 🆕 Handler per salvare metadata nuovo viaggio
  const handleCreateTrip = (metadata) => {
    // Chiama la funzione originale passando i metadata
    onCreateNew(metadata);
  };

  return (
    <div className="min-h-screen bg-gray-50" style={{ maxWidth: '430px', margin: '0 auto' }}>
      {/* 🆕 Modal per creazione nuovo viaggio */}
      <TripMetadataModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleCreateTrip}
        currentUser={currentUser}
        mode="create"
      />

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-xl font-bold mb-2">Elimina viaggio</h3>
            <p className="text-gray-600 mb-6">
              Vuoi eliminare "{deleteConfirm.name}"? Questa azione non può essere annullata.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-full font-medium hover:bg-gray-300"
              >
                Annulla
              </button>
              <button
                onClick={() => {
                  onDeleteTrip(deleteConfirm.id);
                  setDeleteConfirm(null);
                }}
                className="flex-1 py-2 px-4 bg-red-500 text-white rounded-full font-medium hover:bg-red-600"
              >
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Menu - esporta direttamente il file JSON */}
      {exportMenu && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-xl font-bold mb-2">Esporta viaggio</h3>
            <p className="text-gray-600 mb-6">
              Vuoi esportare "{exportMenu.name}"?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setExportMenu(null)}
                className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-full font-medium hover:bg-gray-300"
              >
                Annulla
              </button>
              <button
                onClick={() => {
                  onExportTrip(exportMenu.id);
                  setExportMenu(null);
                }}
                className="flex-1 py-2 px-4 bg-blue-500 text-white rounded-full font-medium hover:bg-blue-600 flex items-center justify-center gap-2"
              >
                <Download size={20} />
                Esporta
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white px-4 py-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">I Miei Viaggi</h1>
          <button
            onClick={onOpenProfile}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Profilo"
          >
            <User size={28} className="text-gray-700" />
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex-1 py-3 bg-blue-500 text-white rounded-2xl font-semibold text-base hover:bg-blue-600 shadow-lg flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            Nuovo
          </button>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 py-3 bg-green-500 text-white rounded-2xl font-semibold text-base hover:bg-green-600 shadow-lg flex items-center justify-center gap-2"
          >
            <Upload size={20} />
            Importa
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="space-y-3">
          {trips.map((trip) => (
            <div
              key={trip.id}
              className="bg-white rounded-xl shadow hover:shadow-md transition-shadow p-4"
            >
              <div className="flex items-center gap-4">
                <div 
                  className="flex-shrink-0 cursor-pointer"
                  onClick={() => onOpenTrip(trip.id)}
                >
                  {trip.image ? (
                    <img
                      src={trip.image}
                      alt={trip.name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                      <MapPin size={28} className="text-white" />
                    </div>
                  )}
                </div>

                <div 
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => onOpenTrip(trip.id)}
                >
                  <h3 className="text-lg font-semibold truncate">{trip.name}</h3>
                  <p className="text-sm text-gray-500">
                    {trip.days.length} {trip.days.length === 1 ? 'giorno' : 'giorni'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {trip.startDate.toLocaleDateString('it-IT')}
                  </p>
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExportMenu({ id: trip.id, name: trip.name });
                    }}
                    className="p-2 text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                    title="Esporta"
                  >
                    <Download size={20} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirm({ id: trip.id, name: trip.name });
                    }}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    title="Elimina"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {trips.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <MapPin size={48} className="mx-auto mb-3 opacity-50" />
            <p>Nessun viaggio ancora.</p>
            <p className="text-sm">Crea o importa il tuo primo viaggio!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomeView;