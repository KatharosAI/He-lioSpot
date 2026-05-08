// HelioSpot - Compass & Device Orientation Module (v2 - corrigé)
//
// LOGIQUE BOUSSOLE CORRECTE :
// - Le CADRAN tourne, la LIGNE DE VISÉE est fixe en haut.
// - Quand le téléphone pointe Est (heading=90°) → cadran tourne -90° pour afficher E en haut.
// - dialRotation = -heading
//
// INCLINAISON SURFACE :
// - Poser le téléphone PLAT SUR LA SURFACE à mesurer.
// - tilt = arcsin(√(sin²β + sin²γ)) donne l'angle réel entre la surface et l'horizontal.

const Compass = {
  heading: null,
  beta: null,
  gamma: null,
  surfaceTilt: null,
  callbacks: [],
  watching: false,
  _handler: null,
  _absHandler: null,
  _usingAbsolute: false,

  async requestPermission() {
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const perm = await DeviceOrientationEvent.requestPermission();
        return perm === 'granted';
      } catch (e) { return false; }
    }
    return true;
  },

  start(callback) {
    if (this.watching) {
      if (!this.callbacks.includes(callback)) this.callbacks.push(callback);
      return;
    }
    this.callbacks.push(callback);
    this.watching = true;

    this._absHandler = (e) => {
      if (e.alpha === null) return;
      this._usingAbsolute = true;
      this._processEvent(e, false);
    };

    this._handler = (e) => {
      if (this._usingAbsolute) return;
      if (e.alpha === null) return;
      this._processEvent(e, true);
    };

    window.addEventListener('deviceorientationabsolute', this._absHandler, true);
    window.addEventListener('deviceorientation', this._handler, true);
  },

  _processEvent(e, isRelative) {
    let heading = null;

    if (e.webkitCompassHeading !== undefined && e.webkitCompassHeading !== null) {
      heading = e.webkitCompassHeading;
    } else if (e.alpha !== null) {
      heading = e.alpha;
    }
    if (heading === null) return;

    heading = ((heading % 360) + 360) % 360;
    this.heading     = heading;
    this.beta        = e.beta;
    this.gamma       = e.gamma;
    this.surfaceTilt = this._computeSurfaceTilt(e.beta, e.gamma);

    this.callbacks.forEach(cb => cb({
      heading:     this.heading,
      beta:        this.beta,
      gamma:       this.gamma,
      surfaceTilt: this.surfaceTilt,
      isRelative,
      accuracy:    e.webkitCompassAccuracy ?? null
    }));
  },

  _computeSurfaceTilt(beta, gamma) {
    if (beta === null || gamma === null) return null;
    const b = beta  * Math.PI / 180;
    const g = gamma * Math.PI / 180;
    const raw = Math.sqrt(Math.sin(b)*Math.sin(b) + Math.sin(g)*Math.sin(g));
    const tilt = Math.asin(Math.min(1, raw)) * 180 / Math.PI;
    return Math.round(Math.min(90, Math.max(0, tilt)));
  },

  getDialRotation() {
    if (this.heading === null) return 0;
    return -this.heading;
  },

  compassLabel(heading) {
    if (heading === null) return '—';
    const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSO','SO','OSO','O','ONO','NO','NNO'];
    return dirs[Math.round(((heading % 360) + 360) % 360 / 22.5) % 16];
  },

  getTiltLabel(tilt) {
    if (tilt === null) return '—';
    if (tilt <=  5) return 'Horizontale (plat)';
    if (tilt <= 15) return 'Légèrement inclinée';
    if (tilt <= 25) return 'Toit faible pente';
    if (tilt <= 35) return 'Toit standard';
    if (tilt <= 45) return 'Toit forte pente';
    if (tilt <= 60) return 'Très inclinée';
    if (tilt <= 80) return 'Quasi verticale';
    return 'Verticale (façade)';
  },

  getTiltEmoji(tilt) {
    if (tilt === null) return '❓';
    if (tilt <=  5) return '➖';
    if (tilt <= 25) return '📐';
    if (tilt <= 45) return '🏠';
    if (tilt <= 70) return '⛰️';
    return '🧱';
  },

  getTiltQuality(tilt, latitude) {
    if (tilt === null) return null;
    const opt = (typeof Solar !== 'undefined') ? Solar.optimalTilt(latitude || 47) : 35;
    const diff = Math.abs(tilt - opt);
    if (diff <=  5) return { label:'Optimal ✓',  color:'#7ecfab', score:100 };
    if (diff <= 10) return { label:'Excellent',   color:'#7ecfab', score: 90 };
    if (diff <= 20) return { label:'Bon',         color:'#a8d84a', score: 75 };
    if (diff <= 30) return { label:'Acceptable',  color:'#f5a623', score: 55 };
    return             { label:'À corriger',   color:'#e74c3c', score: 30 };
  }
};

const GeoLocation = {
  position: null,
  watching: false,
  watchId: null,

  async getOnce() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) { reject(new Error('Géolocalisation non supportée')); return; }
      navigator.geolocation.getCurrentPosition(
        pos => {
          this.position = { latitude: pos.coords.latitude, longitude: pos.coords.longitude,
                            accuracy: pos.coords.accuracy, altitude: pos.coords.altitude };
          resolve(this.position);
        },
        err => reject(err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      );
    });
  },

  watch(callback) {
    if (!navigator.geolocation) return;
    this.watchId = navigator.geolocation.watchPosition(
      pos => {
        this.position = { latitude: pos.coords.latitude, longitude: pos.coords.longitude,
                          accuracy: pos.coords.accuracy, altitude: pos.coords.altitude };
        callback(this.position);
      },
      err => console.warn('GPS error:', err),
      { enableHighAccuracy: true, maximumAge: 10000 }
    );
    this.watching = true;
  },

  stop() {
    if (this.watchId) navigator.geolocation.clearWatch(this.watchId);
    this.watching = false;
  }
};

window.Compass = Compass;
window.GeoLocation = GeoLocation;
