// HelioSpot - Compass & Device Orientation Module

const Compass = {
  heading: null,
  tilt: null,
  callbacks: [],
  watching: false,
  calibrated: false,
  calibrationOffset: 0,

  async requestPermission() {
    // iOS 13+ requires explicit permission
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const perm = await DeviceOrientationEvent.requestPermission();
        return perm === 'granted';
      } catch (e) {
        return false;
      }
    }
    return true; // Android & desktop grant automatically
  },

  start(callback) {
    if (this.watching) return;
    this.callbacks.push(callback);
    this.watching = true;

    const handler = (e) => {
      let heading = null;
      let tilt = null;
      let roll = null;

      // WebkitCompassHeading (iOS) is more reliable
      if (e.webkitCompassHeading !== undefined) {
        heading = e.webkitCompassHeading + this.calibrationOffset;
      } else if (e.alpha !== null) {
        heading = (360 - e.alpha + this.calibrationOffset) % 360;
      }

      if (e.beta !== null) tilt = e.beta;   // front/back tilt (-180 to 180)
      if (e.gamma !== null) roll = e.gamma; // left/right tilt (-90 to 90)

      if (heading !== null) {
        this.heading = (heading + 360) % 360;
        this.tilt = tilt;
        this.roll = roll;
        this.callbacks.forEach(cb => cb({
          heading: this.heading,
          tilt: this.tilt,
          roll: this.roll,
          accuracy: e.webkitCompassAccuracy || null
        }));
      }
    };

    window.addEventListener('deviceorientationabsolute', handler, true);
    window.addEventListener('deviceorientation', handler, true);
    this._handler = handler;
  },

  stop() {
    if (this._handler) {
      window.removeEventListener('deviceorientationabsolute', this._handler, true);
      window.removeEventListener('deviceorientation', this._handler, true);
    }
    this.watching = false;
    this.callbacks = [];
  },

  // Set North reference manually (calibration)
  calibrateNorth() {
    if (this.heading !== null) {
      this.calibrationOffset = -this.heading;
      this.calibrated = true;
      return true;
    }
    return false;
  },

  resetCalibration() {
    this.calibrationOffset = 0;
    this.calibrated = false;
  },

  // Get surface azimuth from phone pointed at surface
  getSurfaceAzimuth() {
    return this.heading;
  },

  // Get surface tilt from phone tilt (when phone is flat on surface)
  getSurfaceTilt() {
    if (this.tilt === null) return null;
    // Beta = 90 means phone is upright, 0 means flat
    return Math.round(Math.abs(this.tilt));
  },

  // Direction quality score based on compass accuracy
  getSignalQuality(accuracy) {
    if (accuracy === null) return 'unknown';
    if (accuracy <= 10) return 'excellent';
    if (accuracy <= 25) return 'good';
    if (accuracy <= 45) return 'fair';
    return 'poor';
  },

  // Convert heading to compass direction
  toDirection(heading) {
    return Solar.compassLabel(heading);
  }
};

// Geolocation wrapper
const GeoLocation = {
  position: null,
  watching: false,
  watchId: null,

  async getOnce() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Géolocalisation non supportée'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        pos => {
          this.position = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            altitude: pos.coords.altitude
          };
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
        this.position = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          altitude: pos.coords.altitude
        };
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
