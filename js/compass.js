// HelioSpot — Compass Module v3
// Fonctionne sur iOS (webkitCompassHeading) et Android (alpha absolu ou relatif)

const Compass = {
  heading:     null,
  surfaceTilt: null,
  beta:        null,
  gamma:       null,
  callbacks:   [],
  watching:    false,
  _handler:    null,

  async requestPermission() {
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const r = await DeviceOrientationEvent.requestPermission();
        return r === 'granted';
      } catch(e) { return false; }
    }
    return true;
  },

  start(callback) {
    if (!this.callbacks.includes(callback)) this.callbacks.push(callback);
    if (this.watching) return;
    this.watching = true;

    // Un seul handler — écoute les deux events, priorité au webkitCompassHeading
    this._handler = (e) => {
      let heading = null;

      // iOS : webkitCompassHeading = cap vrai depuis le Nord (0=N, 90=E, 180=S, 270=O)
      if (typeof e.webkitCompassHeading === 'number' && !isNaN(e.webkitCompassHeading)) {
        heading = e.webkitCompassHeading;
      }
      // Android absolute : alpha=0 quand pointé vers le Nord géographique
      else if (e.absolute === true && e.alpha !== null) {
        heading = e.alpha;
      }
      // Android fallback (relatif au démarrage) : on l'utilise quand même
      else if (e.alpha !== null) {
        heading = e.alpha;
      }

      if (heading === null) return;

      this.heading     = ((heading % 360) + 360) % 360;
      this.beta        = e.beta  ?? null;
      this.gamma       = e.gamma ?? null;
      this.surfaceTilt = this._tilt(e.beta, e.gamma);

      this.callbacks.forEach(cb => cb({
        heading:     this.heading,
        surfaceTilt: this.surfaceTilt,
        beta:        this.beta,
        gamma:       this.gamma,
        absolute:    e.absolute === true || typeof e.webkitCompassHeading === 'number',
      }));
    };

    // Écouter les deux — le navigateur n'enverra que ce qu'il supporte
    window.addEventListener('deviceorientationabsolute', this._handler, true);
    window.addEventListener('deviceorientation',         this._handler, true);
  },

  stop() {
    if (this._handler) {
      window.removeEventListener('deviceorientationabsolute', this._handler, true);
      window.removeEventListener('deviceorientation',         this._handler, true);
    }
    this.watching  = false;
    this.callbacks = [];
    this._handler  = null;
  },

  // Inclinaison de la surface quand le téléphone est posé à plat dessus
  _tilt(beta, gamma) {
    if (beta === null || beta === undefined) return null;
    if (gamma === null || gamma === undefined) return null;
    const b   = beta  * Math.PI / 180;
    const g   = gamma * Math.PI / 180;
    const raw = Math.sqrt(Math.sin(b)*Math.sin(b) + Math.sin(g)*Math.sin(g));
    return Math.round(Math.min(90, Math.asin(Math.min(1, raw)) * 180 / Math.PI));
  },

  label(h) {
    if (h === null) return '—';
    const d = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSO','SO','OSO','O','ONO','NO','NNO'];
    return d[Math.round(((h%360)+360)%360 / 22.5) % 16];
  },

  tiltLabel(t) {
    if (t === null) return '—';
    if (t <=  5) return 'Surface horizontale';
    if (t <= 15) return 'Légère pente';
    if (t <= 25) return 'Toit faible pente';
    if (t <= 35) return 'Toit standard ✓';
    if (t <= 45) return 'Toit forte pente';
    if (t <= 65) return 'Très inclinée';
    if (t <= 80) return 'Quasi verticale';
    return 'Verticale (façade)';
  },

  tiltQuality(tilt, lat) {
    const opt  = (typeof Solar !== 'undefined') ? Solar.optimalTilt(lat || 47) : 35;
    const diff = Math.abs(tilt - opt);
    if (diff <=  5) return { label:'Optimal ✓',  color:'#7ecfab' };
    if (diff <= 12) return { label:'Excellent',   color:'#7ecfab' };
    if (diff <= 22) return { label:'Bon',         color:'#f5a623' };
    if (diff <= 35) return { label:'Acceptable',  color:'#f59623' };
    return             { label:'À corriger',   color:'#e74c3c' };
  },
};

// ── GeoLocation ─────────────────────────────────────────
const GeoLocation = {
  position: null,
  watchId:  null,

  async getOnce() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) { reject(new Error('GPS non supporté')); return; }
      navigator.geolocation.getCurrentPosition(
        p => {
          this.position = { latitude: p.coords.latitude, longitude: p.coords.longitude,
                            accuracy: p.coords.accuracy, altitude: p.coords.altitude };
          resolve(this.position);
        },
        err => reject(err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      );
    });
  },

  stop() {
    if (this.watchId) navigator.geolocation.clearWatch(this.watchId);
    this.watchId = null;
  }
};

window.Compass    = Compass;
window.GeoLocation = GeoLocation;
