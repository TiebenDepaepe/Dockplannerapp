import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DOCKS } from './dockData';
import { createDockGeometry } from './dockGeometry';
import { drawDock, drawScene } from './dockRenderer';
import { drawBoat, drawDistanceGuides } from './boatRenderer';
import { calculateCanvasDimensions } from './canvasLayout';
import { BOAT_DOCK_GAP } from './constants';
import { BoatData } from '../types/dock';

export async function generatePDF(allBoats: BoatData[], showLabels: boolean, showTextLabels: boolean) {
  // Initialize PDF: A4 landscape
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // 70% for image, 30% for table
  // Margins
  const margin = 10;
  const imageAreaHeight = (pageHeight - 2 * margin) * 0.7;
  // const tableAreaHeight = (pageHeight - 2 * margin) * 0.3;

  const dockIds = Object.keys(DOCKS);

  for (let i = 0; i < dockIds.length; i++) {
    const dockId = dockIds[i];
    const dockConfig = DOCKS[dockId];
    
    // 1. Setup Off-screen Canvas
    // Use high resolution for crisp print
    const canvas = document.createElement('canvas');
    const width = 2000;
    const height = 1000;
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    // 2. Filter boats for this dock
    const dockBoats = allBoats.filter(b => b.dockId === dockId);

    // 3. Render Dock Scene
    // We need to replicate the rendering logic from DockCanvas.tsx
    
    const dockGeometry = createDockGeometry(dockConfig);
    
    const { dockStartX, dockStartY, dockScale, dockThickness } =
      calculateCanvasDimensions(dockGeometry, dockConfig, width, height);

    // Draw background scene
    drawScene({
      ctx,
      geometry: dockGeometry,
      startX: dockStartX,
      startY: dockStartY,
      scale: dockScale,
      thickness: dockThickness,
      canvasWidth: width,
      canvasHeight: height,
    });

    // Draw dock
    drawDock({
      ctx,
      geometry: dockGeometry,
      startX: dockStartX,
      startY: dockStartY,
      scale: dockScale,
      thickness: dockThickness,
      showLabels: showLabels,
      boats: dockBoats,
    });

    // Draw boats
    dockBoats.forEach((boat) => {
       // Check if restricted (logic copied from DockCanvas)
      let isRestricted = false;
      if (dockConfig.restrictedZones && boat.mooringType !== 'finger') {
        const boatStart = boat.position;
        const boatEnd = boat.position + boat.length;
        
        isRestricted = dockConfig.restrictedZones.some(zone => {
          const zoneEnd = zone.start + zone.length;
          return boatStart < zoneEnd && boatEnd > zone.start;
        });
      }

      drawBoat({
        ctx,
        boat,
        geometry: dockGeometry,
        startX: dockStartX,
        startY: dockStartY,
        scale: dockScale,
        dockThickness,
        dockGap: BOAT_DOCK_GAP,
        isHovered: false,
        isDragged: false,
        isSelected: false,
        isRestricted,
        showTextLabel: showTextLabels,
      });
    });

    // Draw distance guides
    if (showLabels) {
      drawDistanceGuides(ctx, dockBoats, dockGeometry, dockStartX, dockStartY, dockScale, dockThickness, BOAT_DOCK_GAP);
    }

    // 4. Convert to Image
    const imgData = canvas.toDataURL('image/jpeg', 0.8);

    // 5. Add to PDF
    if (i > 0) {
      doc.addPage();
    }

    // Title
    doc.setFontSize(16);
    doc.text(dockConfig.name, margin, margin);

    // Image
    // Maintain aspect ratio of 2:1 (2000x1000) within the available width/height
    const imgWidth = pageWidth - 2 * margin;
    const imgHeight = (imgWidth / width) * height;
    
    // If image height exceeds allocated area, scale down
    let finalImgWidth = imgWidth;
    let finalImgHeight = imgHeight;
    
    if (finalImgHeight > imageAreaHeight) {
      finalImgHeight = imageAreaHeight;
      finalImgWidth = (finalImgHeight / height) * width;
    }

    // Center image horizontally if scaled down
    const imgX = margin + (imgWidth - finalImgWidth) / 2;
    const imgY = margin + 10; // Below title

    doc.addImage(imgData, 'JPEG', imgX, imgY, finalImgWidth, finalImgHeight);

    // 6. Add Table
    // Prepare table data
    // Sort by position
    const sortedBoats = [...dockBoats].sort((a, b) => a.position - b.position);
    
    const tableData = sortedBoats.map(b => {
      // Column 'Aanmering' (was 'mooring') should now be the dock name
      const aanmering = dockConfig.name;

      // Column 'Positie'
      let positionStr = `${b.position.toFixed(1)}m`;
      if (b.mooringType === 'finger') {
        const side = b.mooringSide === 'left' ? 'links' : 'rechts';
        const fingerNum = b.fingerDockIndex !== undefined ? b.fingerDockIndex + 1 : '-';
        positionStr = `${fingerNum} (${side})`;
      }

      return [
        b.number || '-',
        b.name,
        `${b.length}m`,
        `${b.width}m`,
        positionStr,
        aanmering
      ];
    });

    const tableStartY = imgY + finalImgHeight + 5;

    autoTable(doc, {
      startY: tableStartY,
      head: [['#', 'Naam', 'Lengte', 'Breedte', 'Positie', 'Aanmering']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 10 },
      margin: { left: margin, right: margin }
    });
  }

  // Save PDF
  doc.save('dokplan.pdf');
}
