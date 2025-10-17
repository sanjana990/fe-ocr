export interface DetectedCard {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  corners: Array<{x: number, y: number}>;
}

export class CardDetectionService {
  constructor() {
    // Options removed as they're not used in the current implementation
  }

  /**
   * Detect business card using improved edge detection for angled cards
   */
  detectCard(canvas: HTMLCanvasElement): DetectedCard | null {
    try {
      console.log('🔍 Starting improved card detection...');
      console.log(`📏 Canvas size: ${canvas.width}x${canvas.height}`);
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('❌ Failed to get canvas context');
        return null;
      }

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const width = canvas.width;
      const height = canvas.height;

      // Convert to grayscale with better contrast
      console.log('🎨 Converting to grayscale with contrast enhancement...');
      const grayData = new Uint8Array(width * height);
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        // Use luminance formula for better contrast
        const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        grayData[i / 4] = gray;
      }

      // Apply contrast enhancement
      const enhanced = this.enhanceContrast(grayData);

      // Improved edge detection with multiple scales
      console.log('🔍 Running multi-scale edge detection...');
      const edges = this.multiScaleEdgeDetection(enhanced, width, height);

      // Find contours and approximate them
      console.log('🔍 Finding and analyzing contours...');
      const contours = this.findContours(edges, width, height);
      
      // Find the best rectangular contour
      let bestContour = null;
      let bestScore = 0;
      
      for (const contour of contours) {
        const area = this.calculateContourArea(contour);
        const perimeter = this.calculateContourPerimeter(contour);
        const aspectRatio = this.calculateAspectRatio(contour);
        
        // Score based on area, rectangularity, and aspect ratio
        const rectangularity = (4 * Math.PI * area) / (perimeter * perimeter);
        const aspectScore = 1 - Math.abs(aspectRatio - 1.6) / 1.6;
        const score = area * rectangularity * aspectScore;
        
        console.log(`📊 Contour: area=${area}, rectangularity=${rectangularity.toFixed(3)}, aspect=${aspectRatio.toFixed(2)}, score=${score.toFixed(0)}`);
        
        if (score > bestScore && area > 5000 && rectangularity > 0.4 && aspectRatio > 0.5 && aspectRatio < 3.0) {
          bestScore = score;
          bestContour = contour;
        }
      }
      
      if (bestContour) {
        const bounds = this.getContourBounds(bestContour);
        console.log(`✅ Best contour found: ${bounds.width}x${bounds.height} at (${bounds.x},${bounds.y})`);
        return {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
          confidence: Math.min(bestScore / 50000, 1),
          corners: bounds.corners
        };
      }

      // Fallback: Try to find the largest area with good contrast
      console.log('🔄 No good contours found, trying contrast-based detection...');
      return this.detectByContrast(enhanced, width, height);

    } catch (error) {
      console.error('❌ Detection failed:', error);
      return null;
    }
  }

  private enhanceContrast(data: Uint8Array): Uint8Array {
    const enhanced = new Uint8Array(data.length);
    
    // Find min and max values
    let min = 255, max = 0;
    for (let i = 0; i < data.length; i++) {
      min = Math.min(min, data[i]);
      max = Math.max(max, data[i]);
    }
    
    // Apply contrast stretching
    const range = max - min;
    if (range > 0) {
      for (let i = 0; i < data.length; i++) {
        enhanced[i] = Math.round(((data[i] - min) / range) * 255);
      }
    } else {
      enhanced.set(data);
    }
    
    return enhanced;
  }

  private multiScaleEdgeDetection(data: Uint8Array, width: number, height: number): Uint8Array {
    const edges = new Uint8Array(width * height);
    let maxEdge = 0;
    
    // Simplified edge detection - more reliable
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        
        // Simple Sobel operator
        const gx = -data[(y - 1) * width + (x - 1)] + data[(y - 1) * width + (x + 1)]
                  - 2 * data[y * width + (x - 1)] + 2 * data[y * width + (x + 1)]
                  - data[(y + 1) * width + (x - 1)] + data[(y + 1) * width + (x + 1)];
        const gy = -data[(y - 1) * width + (x - 1)] - 2 * data[(y - 1) * width + x] - data[(y - 1) * width + (x + 1)]
                  + data[(y + 1) * width + (x - 1)] + 2 * data[(y + 1) * width + x] + data[(y + 1) * width + (x + 1)];
        const edgeStrength = Math.sqrt(gx * gx + gy * gy);
        
        edges[idx] = edgeStrength;
        maxEdge = Math.max(maxEdge, edgeStrength);
      }
    }
    
    console.log(`✅ Edge detection complete: max=${maxEdge.toFixed(2)}`);
    return edges;
  }

  private findContours(edges: Uint8Array, width: number, height: number): any[] {
    const contours: any[] = [];
    const visited = new Uint8Array(width * height);
    const threshold = 20; // Lower threshold for better detection
    
    for (let y = 0; y < height; y += 2) { // Sample every 2nd pixel for performance
      for (let x = 0; x < width; x += 2) {
        if (edges[y * width + x] > threshold && visited[y * width + x] === 0) {
          const contour = this.traceContour(edges, visited, width, height, x, y, threshold);
          if (contour.length > 50) { // Lower requirement for contours
            contours.push(contour);
          }
        }
      }
    }
    
    console.log(`📊 Found ${contours.length} contours`);
    return contours;
  }

  private traceContour(edges: Uint8Array, visited: Uint8Array, width: number, height: number, startX: number, startY: number, threshold: number): any[] {
    const contour: any[] = [];
    const stack = [{x: startX, y: startY}];
    
    while (stack.length > 0) {
      const {x, y} = stack.pop()!;
      if (visited[y * width + x] === 1) continue;
      
      visited[y * width + x] = 1;
      contour.push({x, y});
      
      // Check 8-connected neighbors
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height && 
              edges[ny * width + nx] > threshold && visited[ny * width + nx] === 0) {
            stack.push({x: nx, y: ny});
          }
        }
      }
    }
    
    return contour;
  }

  private calculateContourArea(contour: any[]): number {
    let area = 0;
    for (let i = 0; i < contour.length; i++) {
      const j = (i + 1) % contour.length;
      area += contour[i].x * contour[j].y - contour[j].x * contour[i].y;
    }
    return Math.abs(area) / 2;
  }

  private calculateContourPerimeter(contour: any[]): number {
    let perimeter = 0;
    for (let i = 0; i < contour.length; i++) {
      const j = (i + 1) % contour.length;
      const dx = contour[j].x - contour[i].x;
      const dy = contour[j].y - contour[i].y;
      perimeter += Math.sqrt(dx * dx + dy * dy);
    }
    return perimeter;
  }

  private calculateAspectRatio(contour: any[]): number {
    const bounds = this.getContourBounds(contour);
    return bounds.width / bounds.height;
  }

  private getContourBounds(contour: any[]): any {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    for (const point of contour) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      corners: [
        { x: minX, y: minY },
        { x: maxX, y: minY },
        { x: maxX, y: maxY },
        { x: minX, y: maxY }
      ]
    };
  }

  private detectByContrast(data: Uint8Array, width: number, height: number): DetectedCard | null {
    console.log('🔍 Trying contrast-based detection...');
    
    let bestArea = 0;
    let bestRect = null;
    
    // Scan for areas with high contrast
    for (let y = 0; y < height - 100; y += 15) {
      for (let x = 0; x < width - 100; x += 15) {
        for (let w = 100; w < Math.min(width - x, 700); w += 25) {
          for (let h = 60; h < Math.min(height - y, 500); h += 20) {
            const area = w * h;
            if (area <= bestArea) continue;
            
            // Calculate contrast in this region
            const contrast = this.calculateRegionContrast(data, width, x, y, w, h);
            
            if (contrast > 40 && area > bestArea && w > 100 && h > 60) {
              bestArea = area;
              bestRect = {
                x, y, width: w, height: h,
                confidence: Math.min(contrast / 100, 1),
                corners: [
                  { x, y },
                  { x: x + w, y },
                  { x: x + w, y: y + h },
                  { x, y: y + h }
                ]
              };
              console.log(`🎯 Contrast candidate: ${w}x${h} at (${x},${y}), contrast=${contrast.toFixed(1)}`);
            }
          }
        }
      }
    }
    
    if (bestRect) {
      console.log(`✅ Contrast detection found: ${bestRect.width}x${bestRect.height} at (${bestRect.x},${bestRect.y})`);
    }
    
    return bestRect;
  }

  private calculateRegionContrast(data: Uint8Array, width: number, x: number, y: number, w: number, h: number): number {
    let sum = 0;
    let count = 0;
    
    // Sample pixels in the region
    for (let py = y; py < y + h; py += 3) {
      for (let px = x; px < x + w; px += 3) {
        if (px < width && py < data.length / width) {
          sum += data[py * width + px];
          count++;
        }
      }
    }
    
    const mean = sum / count;
    let variance = 0;
    
    for (let py = y; py < y + h; py += 3) {
      for (let px = x; px < x + w; px += 3) {
        if (px < width && py < data.length / width) {
          const diff = data[py * width + px] - mean;
          variance += diff * diff;
        }
      }
    }
    
    return Math.sqrt(variance / count);
  }


  /**
   * Draw detection overlay on canvas
   */
  drawDetectionOverlay(canvas: HTMLCanvasElement, card: DetectedCard): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear previous overlay
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw bounding rectangle
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 5]);
    ctx.strokeRect(card.x, card.y, card.width, card.height);

    // Draw corner markers
    ctx.setLineDash([]);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#00ff00';
    
    const cornerSize = 20;
    
    // Draw corners
    card.corners.forEach((corner, index) => {
      ctx.beginPath();
      ctx.moveTo(corner.x, corner.y);
      
      const nextCorner = card.corners[(index + 1) % card.corners.length];
      const angle = Math.atan2(nextCorner.y - corner.y, nextCorner.x - corner.x);
      
      ctx.lineTo(
        corner.x + cornerSize * Math.cos(angle),
        corner.y + cornerSize * Math.sin(angle)
      );
      ctx.stroke();
    });

    // Draw confidence text
    ctx.fillStyle = '#00ff00';
    ctx.font = '16px Arial';
    ctx.fillText(
      `Card Detected (${Math.round(card.confidence * 100)}%)`, 
      card.x, 
      card.y - 10
    );
  }
}

// Export singleton instance
export const cardDetectionService = new CardDetectionService();
