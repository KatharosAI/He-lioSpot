// HelioSpot - Solar Calculation Engine
// Sun position algorithms based on NOAA Solar Calculator & Duffie-Beckman

const Solar = {

  // Degrees <-> Radians
  deg: r => r * 180 / Math.PI,
  rad: d => d * Math.PI / 180,

  // Day of year
  dayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    return Math.floor((date - start) / 86400000);
  },

  // Solar declination (degrees)
  declination(dayOfYear) {
    return 23.45 * Math.sin(this.rad((360 / 365) * (dayOfYear - 81)));
  },

  // Equation of time (minutes)
  equationOfTime(dayOfYear) {
    const B = this.rad((360 / 365) * (dayOfYear - 81));
    return 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
  },

  // Solar time (hours)
  solarTime(date, longitude) {
    const localTime = date.getHours() + date.getMinutes() / 60;
    const timezone = -date.getTimezoneOffset() / 60;
    const eot = this.equationOfTime(this.dayOfYear(date));
    return localTime + (4 * (longitude - timezone * 15) + eot) / 60;
  },

  // Hour angle (degrees)
  hourAngle(solarTime) {
    return 15 * (solarTime - 12);
  },

  // Solar elevation angle (degrees)
  elevation(latitude, declination, hourAngle) {
    const lat = this.rad(latitude);
    const dec = this.rad(declination);
    const ha = this.rad(hourAngle);
    return this.deg(Math.asin(
      Math.sin(lat) * Math.sin(dec) +
      Math.cos(lat) * Math.cos(dec) * Math.cos(ha)
    ));
  },

  // Solar azimuth (degrees from North, clockwise)
  azimuth(latitude, declination, hourAngle, elevation) {
    const lat = this.rad(latitude);
    const dec = this.rad(declination);
    const ha = this.rad(hourAngle);
    const elev = this.rad(elevation);
    let az = this.deg(Math.acos(
      (Math.sin(dec) - Math.sin(elev) * Math.sin(lat)) /
      (Math.cos(elev) * Math.cos(lat))
    ));
    if (hourAngle > 0) az = 360 - az;
    return az;
  },

  // Full sun position at a given date/time and location
  sunPosition(date, latitude, longitude) {
    const doy = this.dayOfYear(date);
    const dec = this.declination(doy);
    const st = this.solarTime(date, longitude);
    const ha = this.hourAngle(st);
    const elev = this.elevation(latitude, dec, ha);
    const az = this.azimuth(latitude, dec, ha, elev);
    return { elevation: elev, azimuth: az, declination: dec, solarTime: st, hourAngle: ha };
  },

  // Sunrise / Sunset times (decimal hours, local)
  sunriseSunset(date, latitude, longitude) {
    const doy = this.dayOfYear(date);
    const dec = this.rad(this.declination(doy));
    const lat = this.rad(latitude);
    const eot = this.equationOfTime(doy);
    const timezone = -date.getTimezoneOffset() / 60;
    const correction = (4 * (longitude - timezone * 15) + eot) / 60;
    const halfDay = this.deg(Math.acos(-Math.tan(lat) * Math.tan(dec))) / 15;
    return {
      sunrise: 12 - halfDay - correction,
      sunset: 12 + halfDay - correction,
      solarNoon: 12 - correction
    };
  },

  // Generate sun path data (array of {hour, elevation, azimuth})
  sunPath(date, latitude, longitude, step = 0.5) {
    const path = [];
    const baseDate = new Date(date);
    baseDate.setHours(0, 0, 0, 0);
    for (let h = 4; h <= 21; h += step) {
      const d = new Date(baseDate.getTime() + h * 3600000);
      const pos = this.sunPosition(d, latitude, longitude);
      if (pos.elevation > -5) {
        path.push({ hour: h, ...pos });
      }
    }
    return path;
  },

  // Optimal tilt angle for annual average (Duffie & Beckman approximation)
  optimalTilt(latitude) {
    const absLat = Math.abs(latitude);
    // Best annual average tilt ≈ latitude * 0.76 + 3.1° for NH
    return Math.round(absLat * 0.76 + 3.1);
  },

  // Optimal azimuth (South = 180° in NH, North = 0° in SH)
  optimalAzimuth(latitude) {
    return latitude >= 0 ? 180 : 0; // South for NH, North for SH
  },

  // Seasonal tilt recommendations
  seasonalTilts(latitude) {
    const absLat = Math.abs(latitude);
    return {
      annual: this.optimalTilt(latitude),
      summer: Math.round(absLat * 0.93 - 21),
      winter: Math.round(absLat * 0.875 + 19.2),
      spring: Math.round(absLat),
      autumn: Math.round(absLat)
    };
  },

  // Estimate annual energy production (kWh/year)
  // irradiation: annual average kWh/m²/day from PVGIS
  estimateProduction(panelWp, efficiency, tiltFactor, irradiation, area) {
    // Performance ratio (typical 0.75-0.85)
    const PR = 0.80;
    const annualKwh = (panelWp / 1000) * irradiation * 365 * PR * tiltFactor;
    return Math.round(annualKwh);
  },

  // Tilt factor relative to optimal (simplified cosine model)
  tiltFactor(panelTilt, panelAzimuth, optimalTilt, latitude) {
    const tiltDiff = Math.abs(panelTilt - optimalTilt);
    const azimuthDiff = Math.abs(panelAzimuth - (latitude >= 0 ? 180 : 0));
    const azNorm = azimuthDiff > 180 ? 360 - azimuthDiff : azimuthDiff;
    const tiltPenalty = Math.cos(this.rad(tiltDiff)) * 0.7 + 0.3;
    const azPenalty = Math.cos(this.rad(azNorm)) * 0.4 + 0.6;
    return Math.min(1, tiltPenalty * azPenalty);
  },

  // Score an orientation (0-100)
  scoreOrientation(panelAzimuth, latitude) {
    const optAz = this.optimalAzimuth(latitude);
    const diff = Math.abs(panelAzimuth - optAz);
    const norm = diff > 180 ? 360 - diff : diff;
    return Math.round(100 * Math.cos(this.rad(norm * 0.8)));
  },

  // Compass direction label from azimuth
  compassLabel(azimuth) {
    const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSO','SO','OSO','O','ONO','NO','NNO'];
    return dirs[Math.round(azimuth / 22.5) % 16];
  },

  // ROI calculation
  roi(productionKwh, panelCost, installCost, kwhPrice, feedInTariff, selfConsumptionRate) {
    const selfKwh = productionKwh * selfConsumptionRate;
    const feedKwh = productionKwh * (1 - selfConsumptionRate);
    const annualSavings = selfKwh * kwhPrice + feedKwh * feedInTariff;
    const totalCost = panelCost + installCost;
    const roiYears = totalCost / annualSavings;
    const co2Saved = productionKwh * 0.233; // kg CO2/kWh average France
    return {
      annualSavings: Math.round(annualSavings),
      totalCost,
      roiYears: Math.round(roiYears * 10) / 10,
      co2Saved: Math.round(co2Saved),
      lifetime25: Math.round(annualSavings * 25 - totalCost)
    };
  }
};

window.Solar = Solar;
