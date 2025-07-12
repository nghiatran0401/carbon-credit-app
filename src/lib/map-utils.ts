export const CARBON_CREDIT_PER_M2 = 0.0002; // 1 m² = 0.0002 tCO₂
export const USD_PER_CREDIT = 3.0; // 1 tCO₂ = $3

// Forest zone data for Cần Giờ mangrove forests
export interface ForestZone {
  name: string;
  coordinates: number[][];
  color: string;
  credits: number;
  area: number;
  description?: string;
  status?: string;
}

export const FOREST_ZONES: Record<string, ForestZone> = (() => {
  // Helper to scale polygon coordinates outward from center
  function scalePolygon(coords: number[][], scale: number): number[][] {
    // Calculate center
    const n = coords.length;
    let latSum = 0,
      lngSum = 0;
    coords.forEach(([lat, lng]) => {
      latSum += lat;
      lngSum += lng;
    });
    const center = [latSum / n, lngSum / n];
    // Scale each point
    return coords.map(([lat, lng]) => {
      const dLat = lat - center[0];
      const dLng = lng - center[1];
      return [center[0] + dLat * scale, center[1] + dLng * scale];
    });
  }
  // Original zones
  const zones = {
    zoneA: {
      name: "Cần Giờ Mangrove Forest",
      coordinates: scalePolygon(
        [
          [10.4167, 106.95],
          [10.42, 106.96],
          [10.41, 106.97],
          [10.41, 106.94],
          [10.4167, 106.95],
        ],
        1.5
      ),
      color: "#22c55e",
      credits: 4250,
      area: 850,
      description: "Primary mangrove conservation area with high biodiversity.",
      status: "Active",
    },
    zoneB: {
      name: "Xuân Thủy National Park",
      coordinates: scalePolygon(
        [
          [20.2167, 106.5833],
          [20.22, 106.59],
          [20.21, 106.59],
          [20.21, 106.58],
          [20.2167, 106.5833],
        ],
        1.5
      ),
      color: "#3b82f6",
      credits: 3750,
      area: 750,
      description: "Vietnam's first Ramsar site, important for migratory birds.",
      status: "Active",
    },
    zoneC: {
      name: "Cúc Phương National Park",
      coordinates: scalePolygon(
        [
          [20.3167, 105.6067],
          [20.32, 105.61],
          [20.31, 105.61],
          [20.31, 105.6],
          [20.3167, 105.6067],
        ],
        1.5
      ),
      color: "#8b5cf6",
      credits: 1110,
      area: 222,
      description: "Vietnam's oldest national park, rich in flora and fauna.",
      status: "Monitoring",
    },
    zoneD: {
      name: "Bạch Mã National Park",
      coordinates: scalePolygon(
        [
          [16.2, 107.86],
          [16.21, 107.87],
          [16.19, 107.87],
          [16.19, 107.86],
          [16.2, 107.86],
        ],
        1.5
      ),
      color: "#f59e42",
      credits: 1850,
      area: 370,
      description: "Mountainous park with cloud forests and waterfalls.",
      status: "Active",
    },
    zoneE: {
      name: "Yok Đôn National Park",
      coordinates: scalePolygon(
        [
          [12.8, 107.6833],
          [12.81, 107.69],
          [12.79, 107.69],
          [12.79, 107.68],
          [12.8, 107.6833],
        ],
        1.5
      ),
      color: "#e11d48",
      credits: 5775,
      area: 1155,
      description: "Largest national park in Vietnam, home to elephants and rare birds.",
      status: "Active",
    },
    zoneF: {
      name: "Tràm Chim National Park",
      coordinates: scalePolygon(
        [
          [10.7, 105.5],
          [10.71, 105.51],
          [10.69, 105.51],
          [10.69, 105.5],
          [10.7, 105.5],
        ],
        1.5
      ),
      color: "#fbbf24",
      credits: 3790,
      area: 758,
      description: "Wetland reserve, famous for Sarus cranes and aquatic biodiversity.",
      status: "Monitoring",
    },
    zoneG: {
      name: "Ba Vì National Park",
      coordinates: scalePolygon(
        [
          [21.07, 105.37],
          [21.08, 105.38],
          [21.06, 105.38],
          [21.06, 105.37],
          [21.07, 105.37],
        ],
        1.5
      ),
      color: "#10b981",
      credits: 540,
      area: 108,
      description: "Mountainous park near Hanoi, known for diverse plant species.",
      status: "Active",
    },
    zoneH: {
      name: "Phú Quốc National Park",
      coordinates: scalePolygon(
        [
          [10.3, 103.9833],
          [10.31, 103.99],
          [10.29, 103.99],
          [10.29, 103.98],
          [10.3, 103.9833],
        ],
        1.5
      ),
      color: "#6366f1",
      credits: 1570,
      area: 314,
      description: "Island park with tropical forests and rich marine life.",
      status: "Active",
    },
    zoneI: {
      name: "Tam Đảo National Park",
      coordinates: scalePolygon(
        [
          [21.5, 105.5833],
          [21.51, 105.59],
          [21.49, 105.59],
          [21.49, 105.58],
          [21.5, 105.5833],
        ],
        1.5
      ),
      color: "#f472b6",
      credits: 1800,
      area: 360,
      description: "Mountainous park with cool climate and rare animal species.",
      status: "Active",
    },
    zoneJ: {
      name: "Đà Lạt Pine Forests",
      coordinates: scalePolygon(
        [
          [11.9404, 108.4583],
          [11.95, 108.47],
          [11.93, 108.47],
          [11.93, 108.46],
          [11.9404, 108.4583],
        ],
        1.5
      ),
      color: "#0ea5e9",
      credits: 2700,
      area: 540,
      description: "Highland pine forests, famous for scenic beauty and cool climate.",
      status: "Active",
    },
  };
  return zones;
})();

// Calculate polygon area (simplified version)
export const calculatePolygonArea = (coordinates: number[][]): number => {
  let area = 0;
  const n = coordinates.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += coordinates[i][0] * coordinates[j][1];
    area -= coordinates[j][0] * coordinates[i][1];
  }

  return (Math.abs(area) * 111320 * 111320) / 2; // Rough conversion to m²
};

// Calculate carbon credits from area
export const calculateCarbonCredits = (areaM2: number): number => {
  return areaM2 * CARBON_CREDIT_PER_M2;
};

// Calculate USD value from carbon credits
export const calculateUSDValue = (credits: number): number => {
  return credits * USD_PER_CREDIT;
};
