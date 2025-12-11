import { useState, useMemo, useEffect } from 'react';
import { BoatData } from '../types/dock';
import { DOCKS } from '../utils/dockData';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { supabase } from '../utils/supabase/client';
import { 
  DEFAULT_BOAT_LENGTH, 
  DEFAULT_BOAT_WIDTH, 
  POSITION_THRESHOLD,
  isValidLength,
  isValidWidth
} from '../utils/constants';

export type SaveStatus = 'idle' | 'saving' | 'success' | 'error';

export function useBoats(currentDockId: string, currentDockLength: number) {
  const [boats, setBoats] = useState<BoatData[]>([]);
  const [selectedBoatId, setSelectedBoatId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  // Local state for editing - only applies on blur or boat switch
  const [editName, setEditName] = useState('');
  const [editLength, setEditLength] = useState('');
  const [editWidth, setEditWidth] = useState('');

  // Load boats on mount
  useEffect(() => {
    const loadBoats = async () => {
      try {
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-0c980ec2/load`, {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data.boats)) {
            setBoats(data.boats);
          }
        } else {
          console.error('Failed to load boats:', await response.text());
        }
      } catch (error) {
        console.error('Error loading boats:', error);
      }
    };
    
    loadBoats();
  }, []);

  const saveBoats = async () => {
    setSaveStatus('saving');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || publicAnonKey;

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-0c980ec2/save`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ boats })
      });
      
      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      setSaveStatus('success');
      console.log('Boats saved successfully');
      
      // Reset to idle after 2 seconds
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    } catch (error) {
      console.error('Error saving boats:', error);
      setSaveStatus('error');
      
      // Reset to idle after 2 seconds even on error
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    }
  };

  const selectedBoat = useMemo(
    () => boats.find(b => b.id === selectedBoatId),
    [boats, selectedBoatId]
  );

  const updateSelectedBoat = (updates: Partial<BoatData>) => {
    if (!selectedBoatId) return;

    setBoats(boats.map(boat => 
      boat.id === selectedBoatId ? { ...boat, ...updates } : boat
    ));
  };

  const saveCurrentEdits = (currentBoats: BoatData[], currentSelectedId: string | null): BoatData[] => {
    if (!currentSelectedId) return currentBoats;

    const updates: Partial<BoatData> = {};
    if (editName.trim()) updates.name = editName.trim();
    if (isValidLength(editLength)) updates.length = Number(editLength);
    if (isValidWidth(editWidth)) updates.width = Number(editWidth);
    
    if (Object.keys(updates).length > 0) {
      return currentBoats.map(b => 
        b.id === currentSelectedId ? { ...b, ...updates } : b
      );
    }
    return currentBoats;
  };

  const addBoat = () => {
    // Count existing boats for this dock to generate a good default name
    const boatsOnCurrentDock = boats.filter(b => b.dockId === currentDockId);

    const newBoat: BoatData = {
      id: Date.now().toString(),
      dockId: currentDockId,
      name: `Boot ${boatsOnCurrentDock.length + 1}`,
      length: DEFAULT_BOAT_LENGTH,
      width: DEFAULT_BOAT_WIDTH,
      position: 0,
      number: 0, // Will be recalculated
    };

    setBoats(prevBoats => {
      // Save changes to currently selected boat if any
      const updatedBoats = saveCurrentEdits(prevBoats, selectedBoatId);
      return [...updatedBoats, newBoat];
    });

    setSelectedBoatId(newBoat.id);
    // Initialize edit states for the new boat
    setEditName(newBoat.name);
    setEditLength(newBoat.length.toString());
    setEditWidth(newBoat.width.toString());
  };

  const selectBoat = (id: string | null) => {
    if (id === selectedBoatId) return;

    // Save changes for the currently selected boat before switching
    setBoats(prevBoats => saveCurrentEdits(prevBoats, selectedBoatId));

    setSelectedBoatId(id);
    if (id) {
      const boat = boats.find(b => b.id === id); 
      
      if (boat) {
        setEditName(boat.name);
        setEditLength(boat.length.toString());
        setEditWidth(boat.width.toString());
      }
    } else {
      setEditName('');
      setEditLength('');
      setEditWidth('');
    }
  };

  const removeBoat = (id: string) => {
    setBoats(boats.filter(boat => boat.id !== id));
    if (selectedBoatId === id) {
      setSelectedBoatId(null);
    }
  };

  const moveBoat = (id: string, newPosition: number) => {
    setBoats(prevBoats => prevBoats.map(boat => {
      if (boat.id === id) {
        const clampedPosition = Math.max(
          0, 
          Math.min(currentDockLength - boat.length, newPosition)
        );
        return { 
          ...boat, 
          position: clampedPosition,
          // When moving on main dock, clear finger dock assignment
          mooringType: 'main',
          fingerDockIndex: undefined,
          mooringSide: undefined
        };
      }
      return boat;
    }));
  };

  const moorBoatToZone = (id: string, fingerIndex: number, side: 'left' | 'right') => {
    const dockConfig = DOCKS[currentDockId];

    setBoats(prevBoats => prevBoats.map(boat => {
      if (boat.id === id) {
        let newPosition = boat.position;

        // Sync position with finger dock location
        if (dockConfig?.fingerDocks?.[fingerIndex]) {
          const fd = dockConfig.fingerDocks[fingerIndex];
          
          // Calculate offset based on finger dock side and mooring side
          // Right finger dock (pointing down): Left mooring is +X, Right mooring is -X
          // Left finger dock (pointing up): Left mooring is -X, Right mooring is +X
          const fdSide = fd.side || 'right';
          const isPositiveOffset = (fdSide === 'right') === (side === 'left');
          const offset = isPositiveOffset ? fd.width / 2 : -fd.width / 2;

          newPosition = fd.position + offset - boat.length / 2;
          
          // Clamp position
          newPosition = Math.max(0, Math.min(currentDockLength - boat.length, newPosition));
        }

        return {
          ...boat,
          position: newPosition,
          mooringType: 'finger',
          fingerDockIndex: fingerIndex,
          mooringSide: side
        };
      }
      return boat;
    }));
  };

  const handleNameChange = (value: string) => setEditName(value);
  const handleLengthChange = (value: string) => setEditLength(value.replace(',', '.'));
  const handleWidthChange = (value: string) => setEditWidth(value.replace(',', '.'));

  const handleNameBlur = () => {
    if (!selectedBoat) return;
    if (editName.trim()) {
      updateSelectedBoat({ name: editName.trim() });
    } else {
      setEditName(selectedBoat.name);
    }
  };

  const handleLengthBlur = () => {
    if (!selectedBoat) return;
    if (isValidLength(editLength)) {
      const newLength = Number(editLength);

      // Check mooring constraints
      if (selectedBoat.mooringType === 'finger' && 
          selectedBoat.fingerDockIndex !== undefined) {
        
        const dockConfig = DOCKS[selectedBoat.dockId];
        const fd = dockConfig?.fingerDocks?.[selectedBoat.fingerDockIndex];
        
        if (fd && newLength > fd.length) {
          // Exceeds finger dock length - revert change
          setEditLength(selectedBoat.length.toString());
          return;
        }
      }

      updateSelectedBoat({ length: newLength });
    } else {
      setEditLength(selectedBoat.length.toString());
    }
  };

  const handleWidthBlur = () => {
    if (!selectedBoat) return;
    if (isValidWidth(editWidth)) {
      const newWidth = Number(editWidth);

      // Check mooring constraints
      if (selectedBoat.mooringType === 'finger' && 
          selectedBoat.fingerDockIndex !== undefined &&
          selectedBoat.mooringSide) {
        
        const dockConfig = DOCKS[selectedBoat.dockId];
        const fd = dockConfig?.fingerDocks?.[selectedBoat.fingerDockIndex];
        
        if (fd) {
          const maxSpace = selectedBoat.mooringSide === 'left' ? fd.leftSpace : fd.rightSpace;
          if (maxSpace !== undefined && newWidth > maxSpace) {
            // Exceeds mooring width - revert change
            setEditWidth(selectedBoat.width.toString());
            return;
          }
        }
      }

      updateSelectedBoat({ width: newWidth });
    } else {
      setEditWidth(selectedBoat.width.toString());
    }
  };

  // Calculate boat numbers dynamically based on position, SCOPED TO DOCK
  const boatsWithNumbers = useMemo(() => {
    // 1. Separate boats by dock
    const boatsByDock: Record<string, BoatData[]> = {};
    
    boats.forEach(boat => {
      const dId = boat.dockId || currentDockId; // Fallback for migration if needed
      if (!boatsByDock[dId]) boatsByDock[dId] = [];
      boatsByDock[dId].push(boat);
    });

    // 2. Sort and number boats within each dock
    let finalBoats: BoatData[] = [];

    Object.keys(boatsByDock).forEach(dockId => {
      const dockBoats = boatsByDock[dockId];
      const sorted = [...dockBoats].sort((a, b) => {
        const positionDiff = a.position - b.position;
        if (Math.abs(positionDiff) < POSITION_THRESHOLD) {
          return a.id.localeCompare(b.id);
        }
        return positionDiff;
      });

      const numbered = sorted.map((boat, index) => ({
        ...boat,
        number: index + 1
      }));
      
      finalBoats = [...finalBoats, ...numbered];
    });

    return finalBoats;
  }, [boats, currentDockId]);

  // Return only boats for the current dock
  const currentDockBoats = useMemo(() => {
    return boatsWithNumbers.filter(b => b.dockId === currentDockId);
  }, [boatsWithNumbers, currentDockId]);

  return {
    boats: currentDockBoats,
    allBoats: boatsWithNumbers,
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
  };
}
