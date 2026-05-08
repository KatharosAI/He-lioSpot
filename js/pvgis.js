// HelioSpot - PVGIS API Integration (European Commission, free, no key required)
// API docs: https://joint-research-centre.ec.europa.eu/pvgis-photovoltaic-geographical-information-system

const PVGIS = {
  BASE_URL: 'https://re.jrc.ec.europa.eu/api/v5_2/',

  // Get monthly irradiation + optimal angles for a location
  async getIrradiation(latitude, longitude, tilt = null, azimuth = 180) {
    const optTilt = tilt ?? Solar.optimalTilt(latitude);
    const params = new URLSearchParams({
      lat: latitude.toFixed(4),
      lon: longitude.toFixed(4),
      outputformat: 'json',
      angle: optTilt,
      aspect: azimuth - 180, // PVGIS uses -180 to 180, 0 = South
      raddatabase: 'PVGIS-SARAH2',
      startyear: 2005,
      endyear: 2020,
    });

    try {
      const res = await fetch(`${this.BASE_URL}seriescalc?${params}`);
      if (!res.ok) throw new Error(`PVGIS error ${res.status}`);
      const data = await res.json();
      return this.parseHourly(data);
    } catch (e) {
      // Fallback: use monthly radiation endpoint
      return this.getMonthlyFallback(latitude, longitude, optTilt, azimuth);
    }
  },

  // Monthly radiation data (more reliable, lighter)
  async getMonthly(latitude, longitude, tilt, azimuth = 180) {
    const params = new URLSearchParams({
      lat: latitude.toFixed(4),
      lon: longitude.toFixed(4),
      outputformat: 'json',
      angle: tilt,
      aspect: azimuth - 180,
    });

    try {
      const res = await fetch(`${this.BASE_URL}MRcalc?${params}`);
      if (!res.ok) throw new Error(`PVGIS monthly error ${res.status}`);
      const data = await res.json();
      return this.parseMonthly(data);
    } catch (e) {
      return this.getMonthlyFallback(latitude, longitude, tilt, azimuth);
    }
  },

  // PV system production estimate
  async getPVProduction(latitude, longitude, peakPowerKwp, tilt, azimuth = 180, losses = 14) {
    const params = new URLSearchParams({
      lat: latitude.toFixed(4),
      lon: longitude.toFixed(4),
      outputformat: 'json',
      peakpower: peakPowerKwp,
      loss: losses,
      angle: tilt,
      aspect: azimuth - 180,
      mountingplace: 'building',
    });

    try {
      const res = await fetch(`${this.BASE_URL}PVcalc?${params}`);
      if (!res.ok) throw new Error(`PVGIS PV error ${res.status}`);
      const data = await res.json();
      return this.parsePVResult(data);
    } catch (e) {
      // Offline fallback estimation
      return this.estimateFallback(latitude, peakPowerKwp, tilt, azimuth);
    }
  },

  parseMonthly(data) {
    const months = data?.outputs?.monthly?.fixed || [];
    const monthNames = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    return {
      monthly: months.map((m, i) => ({
        month: monthNames[i],
        irradiation: m.H_i_m || 0, // kWh/m²/month
        dailyAvg: (m.H_i_m || 0) / 30
      })),
      annual: months.reduce((s, m) => s + (m.H_i_m || 0), 0),
      dailyAvg: months.reduce((s, m) => s + (m.H_i_m || 0), 0) / 365
    };
  },

  parsePVResult(data) {
    const totals = data?.outputs?.totals?.fixed || {};
    const monthly = data?.outputs?.monthly?.fixed || [];
    const monthNames = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    return {
      annualProduction: totals.E_y || 0,      // kWh/year
      specificProduction: totals.H_i_y || 0,  // kWh/kWp/year
      performanceRatio: totals.PR || 0,
      monthly: monthly.map((m, i) => ({
        month: monthNames[i],
        production: m.E_m || 0,               // kWh/month
        irradiation: m.H_i_m || 0
      }))
    };
  },

  parseHourly(data) {
    // Extract daily averages from hourly data
    const hourly = data?.outputs?.hourly || [];
    const dailySum = hourly.reduce((sum, h) => sum + (h.G_i || 0), 0);
    return {
      dailyAvg: dailySum / 365 / 1000, // Convert Wh to kWh
      annual: dailySum / 1000
    };
  },

  // Offline fallback using latitude-based irradiation estimates
  getMonthlyFallback(latitude, longitude, tilt, azimuth) {
    const absLat = Math.abs(latitude);
    // Approximate annual irradiation by latitude band (kWh/m²/year)
    let baseIrrad;
    if (absLat < 25) baseIrrad = 2000;
    else if (absLat < 35) baseIrrad = 1700;
    else if (absLat < 45) baseIrrad = 1400;
    else if (absLat < 55) baseIrrad = 1100;
    else baseIrrad = 900;

    const tiltFactor = Solar.tiltFactor(tilt, azimuth, Solar.optimalTilt(latitude), latitude);
    const adjusted = baseIrrad * tiltFactor;

    // Seasonal distribution (NH)
    const seasonalFactors = [0.55, 0.65, 0.85, 1.0, 1.15, 1.2, 1.2, 1.15, 1.0, 0.85, 0.65, 0.55];
    const monthNames = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    const avgFactor = seasonalFactors.reduce((a, b) => a + b, 0) / 12;

    return {
      monthly: seasonalFactors.map((f, i) => ({
        month: monthNames[i],
        irradiation: Math.round((adjusted / 12) * (f / avgFactor)),
        dailyAvg: Math.round(adjusted / 365 * f / avgFactor * 10) / 10
      })),
      annual: Math.round(adjusted),
      dailyAvg: Math.round(adjusted / 365 * 10) / 10,
      isEstimate: true
    };
  },

  estimateFallback(latitude, peakPowerKwp, tilt, azimuth) {
    const irr = this.getMonthlyFallback(latitude, 0, tilt, azimuth);
    const pr = 0.80;
    const annualProduction = peakPowerKwp * irr.annual * pr;
    const monthNames = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    return {
      annualProduction: Math.round(annualProduction),
      specificProduction: Math.round(irr.annual * pr),
      performanceRatio: pr,
      monthly: irr.monthly.map((m, i) => ({
        month: monthNames[i],
        production: Math.round(peakPowerKwp * m.irradiation * pr),
        irradiation: m.irradiation
      })),
      isEstimate: true
    };
  }
};

window.PVGIS = PVGIS;
