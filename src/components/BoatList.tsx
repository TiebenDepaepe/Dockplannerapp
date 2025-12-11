import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { BoatData } from '../types/dock';

interface BoatListProps {
  boats: BoatData[];
  selectedBoatId: string | null;
  onSelectBoat: (id: string) => void;
}

export function BoatList({ boats, selectedBoatId, onSelectBoat, isCollapsed, onToggle }: BoatListProps & { isCollapsed: boolean; onToggle: () => void }) {
  return (
    <div
      className={`relative z-10 bg-white shadow-lg transition-all duration-300 flex h-full border-r border-gray-200 ${
        isCollapsed ? 'w-8' : 'w-72'
      }`}
    >
      <div className={`flex-1 overflow-hidden transition-opacity duration-300 ${isCollapsed ? 'opacity-0' : 'opacity-100'}`}>
        <div className="w-64 p-4 h-full flex flex-col">
          <h3 className="mb-3 text-gray-700 font-semibold shrink-0">Boten aan de kade</h3>
          <div className="space-y-2 flex-1 overflow-y-auto">
            {boats.length === 0 ? (
              <p className="text-gray-400 text-sm">Geen boten aangemeerd</p>
            ) : (
              boats.map((boat) => (
                <button
                  key={boat.id}
                  onClick={() => onSelectBoat(boat.id)}
                  className={`w-full text-left p-2 rounded transition-colors ${
                    selectedBoatId === boat.id
                      ? 'bg-yellow-100 border-2 border-yellow-400'
                      : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center bg-gray-200 text-gray-800 text-xs shrink-0"
                      >
                        {boat.number}
                      </div>
                      <span className="text-gray-800 truncate text-sm">{boat.name}</span>
                    </div>
                    <span className="text-xs text-gray-500 shrink-0">
                      {Number.isFinite(boat.position) ? `${boat.position.toFixed(1)}m` : '0.0m'}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
      <button
        onClick={onToggle}
        className="w-8 bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition-colors border-l border-gray-100 h-full shrink-0"
        title={isCollapsed ? "Zijbalk uitklappen" : "Zijbalk inklappen"}
      >
        {isCollapsed ? (
          <ChevronRight className="w-5 h-5 text-gray-600" />
        ) : (
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        )}
      </button>
    </div>
  );
}