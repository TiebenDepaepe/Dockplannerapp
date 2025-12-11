import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DockCanvas } from './components/DockCanvas';
import { BoatList } from './components/BoatList';
import { Plus, Trash2, Anchor, Save, Check, X, Loader2, LogOut, Printer, Eye, EyeOff, Type } from 'lucide-react';
import { useBoats } from './hooks/useBoats';
import { DOCKS } from './utils/dockData';
import { LoginDialog } from './components/LoginDialog';
import { supabase } from './utils/supabase/client';
import { Toaster } from 'sonner@2.0.3';
import { generatePDF } from './utils/pdfGenerator';
import faviconImage from 'figma:asset/ee913178ffbee9d198e1d0132d3fa574781318f6.png';

export default function App() {
  const [currentDockId, setCurrentDockId] = useState<string>('main-dock');
  const [showLabels, setShowLabels] = useState(true);
  const [showTextLabels, setShowTextLabels] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const currentDockConfig = DOCKS[currentDockId];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.getElementsByTagName('head')[0].appendChild(link);
    }
    link.href = faviconImage;
  }, []);

  const {
    boats,
    allBoats,
    selectedBoat,
    selectedBoatId,
    addBoat,
    removeBoat,
    selectBoat,
    moveBoat,
    moorBoatToZone,
    editName,
    editLength,
    editWidth,
    handleNameChange,
    handleLengthChange,
    handleWidthChange,
    handleNameBlur,
    handleLengthBlur,
    handleWidthBlur,
    saveBoats,
    saveStatus,
  } = useBoats(currentDockId, currentDockConfig.totalLength);

  const handleSaveClick = () => {
    if (!user) {
      setIsLoginOpen(true);
    } else {
      saveBoats();
    }
  };

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      // Small delay to allow UI to update to loading state
      await new Promise(resolve => setTimeout(resolve, 100));
      await generatePDF(allBoats, showLabels, showTextLabels);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-gray-100">
      {/* Control Panel - Header */}
      <div className="z-20 bg-white shadow-sm border-b border-gray-200 shrink-0">
        <div className="px-6 py-4">
          <div className="flex items-center gap-6 flex-wrap">
            {/* Dock Switcher */}
            <div className="flex items-center gap-2 border-r border-gray-200 pr-6">
              <Anchor className="size-5 text-blue-600" />
              <select 
                value={currentDockId}
                onChange={(e) => setCurrentDockId(e.target.value)}
                className="bg-transparent font-medium text-gray-800 focus:outline-none cursor-pointer"
              >
                {Object.values(DOCKS).map(dock => (
                  <option key={dock.id} value={dock.id}>{dock.name}</option>
                ))}
              </select>
            </div>

            {/* View Labels Toggle */}
            <div className="flex items-center gap-2 border-r border-gray-200 pr-6">
              <button
                onClick={() => setShowLabels(!showLabels)}
                className={`p-2 rounded-lg transition-colors ${showLabels ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' : 'text-gray-500 hover:bg-gray-100'}`}
                title={showLabels ? "Labels verbergen" : "Labels tonen"}
              >
                {showLabels ? <Eye className="size-5" /> : <EyeOff className="size-5" />}
              </button>
              
              <button
                onClick={() => setShowTextLabels(!showTextLabels)}
                className={`p-2 rounded-lg transition-colors ${showTextLabels ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' : 'text-gray-500 hover:bg-gray-100'}`}
                title={showTextLabels ? "Tekst verbergen" : "Tekst tonen"}
              >
                <Type className="size-5" />
              </button>
            </div>

            {/* Add Boat Button */}
            <button
              onClick={addBoat}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              title="Boot toevoegen"
            >
              <Plus className="size-5" />
            </button>

            {/* Remove Boat Button */}
            <button
              onClick={() => selectedBoatId && removeBoat(selectedBoatId)}
              disabled={!selectedBoatId}
              className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              title="Geselecteerde boot verwijderen"
            >
              <Trash2 className="size-5" />
            </button>



            {/* Edit Boat Form */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Naam</label>
                <input
                  type="text"
                  value={selectedBoat ? editName : ''}
                  onChange={(e) => handleNameChange(e.target.value)}
                  onBlur={handleNameBlur}
                  onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                  disabled={!selectedBoat}
                  placeholder={selectedBoat ? '' : 'Selecteer een boot'}
                  className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Lengte (m)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={selectedBoat ? editLength : ''}
                  onChange={(e) => handleLengthChange(e.target.value)}
                  onBlur={handleLengthBlur}
                  onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                  disabled={!selectedBoat}
                  placeholder={selectedBoat ? '' : '-'}
                  className="w-28 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Breedte (m)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={selectedBoat ? editWidth : ''}
                  onChange={(e) => handleWidthChange(e.target.value)}
                  onBlur={handleWidthBlur}
                  onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                  disabled={!selectedBoat}
                  placeholder={selectedBoat ? '' : '-'}
                  className="w-28 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>

              {selectedBoat && (
                <div className="flex flex-col gap-1 justify-end pb-2.5">
                   <span className="text-sm text-gray-400">
                     positie: {(Number.isFinite(selectedBoat.position) ? selectedBoat.position : 0).toFixed(1)}m
                   </span>
                </div>
              )}
            </div>

            {/* Auth Status / Sign Out */}
            {user && (
              <button
                onClick={() => supabase.auth.signOut()}
                className="p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Uitloggen"
              >
                <LogOut className="size-5" />
              </button>
            )}

            {/* Print Button */}
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className={`p-2 bg-orange-400 text-white rounded-lg hover:bg-orange-500 transition-colors ${isPrinting ? 'opacity-70 cursor-wait' : ''}`}
              title="Afdrukken"
            >
              {isPrinting ? <Loader2 className="size-5 animate-spin" /> : <Printer className="size-5" />}
            </button>

            {/* Save Button */}
            <button
              onClick={handleSaveClick}
              disabled={saveStatus === 'saving'}
              className={`flex items-center justify-center p-2 rounded-lg text-white shadow-sm transition-colors
                ${saveStatus === 'error' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
                ${saveStatus === 'saving' ? 'opacity-80 cursor-wait' : ''}
              `}
              title="Configuratie opslaan"
            >
              <AnimatePresence mode="wait" initial={false}>
                {saveStatus === 'saving' && (
                  <motion.div
                    key="saving"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Loader2 className="size-5 animate-spin" />
                  </motion.div>
                )}
                {saveStatus === 'success' && (
                  <motion.div
                    key="success"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Check className="size-5" />
                  </motion.div>
                )}
                {saveStatus === 'error' && (
                  <motion.div
                    key="error"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <X className="size-5" />
                  </motion.div>
                )}
                {saveStatus === 'idle' && (
                  <motion.div
                    key="idle"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Save className="size-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 min-h-0 relative">
        {/* Sidebar */}
        <BoatList
          boats={boats}
          onSelectBoat={selectBoat}
          selectedBoatId={selectedBoatId}
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {/* Canvas Area - Responsive to sidebar */}
        <div className="flex-1 relative min-w-0 bg-gray-100 overflow-hidden">
          <DockCanvas 
            boats={boats}
            onMoveBoat={moveBoat}
            onMoorBoat={moorBoatToZone}
            onSelectBoat={selectBoat}
            selectedBoatId={selectedBoatId}
            dockConfig={currentDockConfig}
            showLabels={showLabels}
            showTextLabels={showTextLabels}
          />
        </div>
      </div>
      <LoginDialog 
        isOpen={isLoginOpen} 
        onOpenChange={setIsLoginOpen} 
        onSuccess={() => {
          // Small delay to ensure session is propagated or just call save directly
          saveBoats();
        }} 
      />
      <Toaster />
    </div>
  );
}
