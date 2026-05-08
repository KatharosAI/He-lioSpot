// HelioSpot - Main Application

const App = {
  // State
  state: {
    view: 'home', // home | compass | analyze | planner | results | settings
    location: null,
    heading: null,
    tilt: null,
    surface: { azimuth: null, tilt: null, label: '' },
    obstacles: [],
    panels: [],
    pvgisData: null,
    pvResult: null,
    user: null,
    projects: [],
    activeProject: null,
    isMobile: window.innerWidth < 768,
    compassPermission: false,
    panel: {
      name: '',
      peakPower: 400,
      efficiency: 21,
      width: 1.7,
      height: 1.0,
      cellType: 'monocristallin',
      tempCoeff: -0.35,
      price: 250,
      quantity: 1
    },
    install: {
      type: 'roof_inclined', // roof_inclined | roof_flat | garden | shed
      surfaceArea: 20,
      existingTilt: 30,
      installCost: 500,
      usage: [],
      selfConsumption: 0.7
    },
    energy: {
      kwhPrice: 0.2276, // France 2024
      feedInTariff: 0.13,
      annualConsumption: 4500
    }
  },

  // LocalStorage key
  STORAGE_KEY: 'heliospot_data_v1',

  init() {
    this.loadFromStorage();
    this.detectDevice();
    this.render();
    this.registerSW();
    window.addEventListener('resize', () => {
      this.state.isMobile = window.innerWidth < 768;
      this.render();
    });
  },

  detectDevice() {
    this.state.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      || window.innerWidth < 768;
  },

  // Save state to localStorage (for future backend sync)
  saveToStorage() {
    try {
      const data = {
        projects: this.state.projects,
        panel: this.state.panel,
        install: this.state.install,
        energy: this.state.energy,
        location: this.state.location,
        surface: this.state.surface,
        obstacles: this.state.obstacles,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (e) { console.warn('Storage error:', e); }
  },

  loadFromStorage() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.projects) this.state.projects = data.projects;
        if (data.panel) this.state.panel = { ...this.state.panel, ...data.panel };
        if (data.install) this.state.install = { ...this.state.install, ...data.install };
        if (data.energy) this.state.energy = { ...this.state.energy, ...data.energy };
        if (data.location) this.state.location = data.location;
        if (data.surface) this.state.surface = data.surface;
        if (data.obstacles) this.state.obstacles = data.obstacles;
      }
    } catch (e) { console.warn('Load storage error:', e); }
  },

  navigate(view) {
    this.state.view = view;
    this.render();
    window.scrollTo(0, 0);
  },

  registerSW() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(e => console.warn('SW:', e));
    }
  },

  // Render the whole app
  render() {
    const app = document.getElementById('app');
    if (!app) return;
    const v = this.state.view;

    let html = '';
    if (v === 'home') html = Views.home();
    else if (v === 'compass') html = Views.compass();
    else if (v === 'analyze') html = Views.analyze();
    else if (v === 'planner') html = Views.planner();
    else if (v === 'results') html = Views.results();
    else if (v === 'panel') html = Views.panelConfig();
    else if (v === 'obstacles') html = Views.obstacles();
    else if (v === 'settings') html = Views.settings();

    app.innerHTML = html + Views.nav();
    this.bindEvents(v);
  },

  bindEvents(view) {
    // Nav
    document.querySelectorAll('[data-nav]').forEach(el => {
      el.addEventListener('click', () => this.navigate(el.dataset.nav));
    });

    if (view === 'home') this.bindHome();
    else if (view === 'compass') this.bindCompass();
    else if (view === 'analyze') this.bindAnalyze();
    else if (view === 'planner') this.bindPlanner();
    else if (view === 'results') this.bindResults();
    else if (view === 'panel') this.bindPanelConfig();
    else if (view === 'obstacles') this.bindObstacles();
  },

  bindHome() {
    document.getElementById('btn-start-mobile')?.addEventListener('click', async () => {
      await this.getLocation();
      this.navigate('compass');
    });
    document.getElementById('btn-start-desktop')?.addEventListener('click', () => {
      this.navigate('planner');
    });
    document.getElementById('btn-my-projects')?.addEventListener('click', () => {
      this.navigate('settings');
    });
  },

  async getLocation() {
    try {
      UI.showToast('Localisation en cours…', 'info');
      const pos = await GeoLocation.getOnce();
      this.state.location = pos;
      this.saveToStorage();
      UI.showToast(`Position obtenue (±${Math.round(pos.accuracy)}m)`, 'success');
    } catch (e) {
      UI.showToast('Impossible d\'obtenir la position GPS', 'error');
    }
  },

  bindCompass() {
    document.getElementById('btn-compass-start')?.addEventListener('click', async () => {
      const ok = await Compass.requestPermission();
      if (!ok) { UI.showToast('Permission capteur refusée — vérifiez les réglages', 'error'); return; }
      document.getElementById('compass-start-screen').style.display = 'none';
      document.getElementById('compass-live').classList.remove('hidden');
      Compass.start(data => this.updateCompassUI(data));
      this._updateTiltOptimalLine();
      if (!this.state.location) this.getLocation();
    });

    document.getElementById('btn-capture-azimuth')?.addEventListener('click', () => {
      if (Compass.heading === null) { UI.showToast('Boussole non active', 'error'); return; }
      const az  = Math.round(Compass.heading);
      const lbl = Compass.label(az);
      this.state.surface.azimuth = az;
      this.state.surface.label   = lbl;
      this._azCaptured = true;
      this.saveToStorage();
      document.getElementById('azimuth-captured').classList.remove('hidden');
      document.getElementById('az-captured-display').textContent = `${az}° — ${lbl}`;
      document.getElementById('btn-capture-azimuth').style.display = 'none';
      UI.showToast(`✓ ${lbl} (${az}°)`, 'success');
      this._checkCompassSummary();
    });

    document.getElementById('btn-recapture-az')?.addEventListener('click', () => {
      this._azCaptured = false;
      document.getElementById('azimuth-captured').classList.add('hidden');
      document.getElementById('btn-capture-azimuth').style.display = '';
      document.getElementById('compass-summary').classList.add('hidden');
    });

    document.getElementById('btn-capture-tilt')?.addEventListener('click', () => {
      if (Compass.surfaceTilt === null) { UI.showToast('Posez le téléphone sur la surface', 'error'); return; }
      const tilt = Compass.surfaceTilt;
      this.state.surface.tilt = tilt;
      this._tiltCaptured = true;
      this.saveToStorage();
      document.getElementById('tilt-captured').classList.remove('hidden');
      document.getElementById('tilt-captured-display').textContent = `${tilt}° — ${Compass.tiltLabel(tilt)}`;
      document.getElementById('btn-capture-tilt').style.display = 'none';
      UI.showToast(`✓ ${tilt}° — ${Compass.tiltLabel(tilt)}`, 'success');
      this._checkCompassSummary();
    });

    document.getElementById('btn-recapture-tilt')?.addEventListener('click', () => {
      this._tiltCaptured = false;
      document.getElementById('tilt-captured').classList.add('hidden');
      document.getElementById('btn-capture-tilt').style.display = '';
      document.getElementById('compass-summary').classList.add('hidden');
    });

    document.getElementById('btn-next-analyze')?.addEventListener('click', () => {
      Compass.stop();
      this.navigate('analyze');
    });
  },

  _updateTiltOptimalLine() {
    const loc = this.state.location;
    const opt = loc ? Solar.optimalTilt(loc.latitude) : 35;
    const el  = document.getElementById('tilt-optimal');
    if (!el) return;
    const CX = 140, CY = 130, R = 85;
    const rad = opt * Math.PI / 180;
    el.setAttribute('x2', (CX + R * Math.sin(rad)).toFixed(1));
    el.setAttribute('y2', (CY - R * Math.cos(rad)).toFixed(1));
  },

  _checkCompassSummary() {
    if (!this._azCaptured || !this._tiltCaptured) return;
    const az   = this.state.surface.azimuth;
    const tilt = this.state.surface.tilt;
    const lbl  = this.state.surface.label;
    const loc  = this.state.location;
    const azScore = loc ? Solar.scoreOrientation(az, loc.latitude) : 50;
    const tq      = loc ? Compass.tiltQuality(tilt, loc.latitude) : null;
    const tScore  = tq ? (tq.label.includes('Optimal') ? 100 : tq.label.includes('Excellent') ? 90 : tq.label.includes('Bon') ? 75 : 50) : 50;
    const global  = Math.round((azScore + tScore) / 2);
    const el = id => document.getElementById(id);
    el('sum-azimuth').textContent = `${az}° — ${lbl}`;
    el('sum-tilt').textContent    = `${tilt}° — ${Compass.tiltLabel(tilt)}`;
    el('sum-score').textContent   = `${global}/100`;
    el('compass-summary').classList.remove('hidden');
  },

  updateCompassUI(data) {
    const { heading, surfaceTilt } = data;
    const loc = this.state.location;
    const $   = id => document.getElementById(id);

    // ── Cadran boussole : rotation via attribut SVG transform (fiable sur tous mobiles) ──
    const dial = $('compass-dial');
    if (dial) dial.setAttribute('transform', `rotate(${(360 - heading) % 360} 110 110)`);

    if ($('heading-value'))   $('heading-value').textContent   = `${Math.round(heading)}°`;
    if ($('direction-label')) $('direction-label').textContent = Compass.label(heading);

    const score = loc ? Solar.scoreOrientation(heading, loc.latitude) : null;
    if (score !== null) {
      const col = score >= 80 ? '#7ecfab' : score >= 60 ? '#a8d84a' : score >= 40 ? '#f5a623' : '#e74c3c';
      if ($('orientation-score')) { $('orientation-score').textContent = `${score}/100`; $('orientation-score').style.color = col; }
      if ($('quality-fill'))      { $('quality-fill').style.width = `${score}%`; $('quality-fill').style.background = col; }
      if ($('quality-label')) {
        $('quality-label').textContent = score >= 80 ? '✓ Excellente exposition !' : score >= 60 ? 'Bonne exposition' : score >= 40 ? 'Exposition correcte' : 'Exposition déconseillée';
        $('quality-label').style.color = col;
      }
      // Arc de qualité SVG
      const arc = $('score-arc');
      if (arc) {
        const R = 100, cx = 110, cy = 110, spread = score * 0.6;
        const a1 = (180 - spread) * Math.PI / 180, a2 = (180 + spread) * Math.PI / 180;
        const x1 = (cx + R * Math.sin(a1)).toFixed(1), y1 = (cy - R * Math.cos(a1)).toFixed(1);
        const x2 = (cx + R * Math.sin(a2)).toFixed(1), y2 = (cy - R * Math.cos(a2)).toFixed(1);
        arc.setAttribute('d', `M ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2}`);
        arc.setAttribute('stroke', col);
        arc.setAttribute('opacity', '0.65');
      }
    }

    // ── Inclinomètre ──
    if (surfaceTilt !== null) {
      const CX = 140, CY = 130, R = 85;
      const rad = surfaceTilt * Math.PI / 180;
      const nx = (CX + R * Math.sin(rad)).toFixed(1);
      const ny = (CY - R * Math.cos(rad)).toFixed(1);
      if ($('tilt-needle'))    { $('tilt-needle').setAttribute('x2', nx); $('tilt-needle').setAttribute('y2', ny); }
      if ($('tilt-big-value')) $('tilt-big-value').textContent = `${surfaceTilt}°`;
      if ($('tilt-emoji'))     $('tilt-emoji').textContent = surfaceTilt <= 5 ? '➖' : surfaceTilt <= 25 ? '📐' : surfaceTilt <= 45 ? '🏠' : surfaceTilt <= 70 ? '⛰️' : '🧱';
      if ($('tilt-label'))     $('tilt-label').textContent = `${surfaceTilt}° — ${Compass.tiltLabel(surfaceTilt)}`;
      const tq = loc ? Compass.tiltQuality(surfaceTilt, loc.latitude) : null;
      if (tq && $('tilt-quality-row')) {
        $('tilt-quality-row').style.display = '';
        $('tilt-quality-label').textContent = `Qualité : ${tq.label}`;
        $('tilt-quality-label').style.color = tq.color;
      }
    }
  },

  switchCompassTab(tab) {
    document.getElementById('panel-orientation').classList.toggle('hidden', tab !== 'orientation');
    document.getElementById('panel-tilt').classList.toggle('hidden', tab !== 'tilt');
    document.getElementById('tab-orientation').classList.toggle('active', tab === 'orientation');
    document.getElementById('tab-tilt').classList.toggle('active', tab === 'tilt');
    if (tab === 'tilt') this._updateTiltOptimalLine();
  },

  async bindAnalyze() {
    if (!this.state.location) await this.getLocation();
    const loc = this.state.location;
    if (!loc) return;

    const tilt = this.state.surface.tilt || Solar.optimalTilt(loc.latitude);
    const azimuth = this.state.surface.azimuth || Solar.optimalAzimuth(loc.latitude);

    // Draw sun path chart
    this.drawSunPath();

    // Load PVGIS data
    UI.showLoading('Chargement données ensoleillement…');
    try {
      const panel = this.state.panel;
      const kwp = (panel.peakPower * panel.quantity) / 1000;
      this.state.pvResult = await PVGIS.getPVProduction(loc.latitude, loc.longitude, kwp, tilt, azimuth);
      this.state.pvgisData = await PVGIS.getMonthly(loc.latitude, loc.longitude, tilt, azimuth);
      UI.hideLoading();
      this.drawIrradiationChart();
      this.drawProductionChart();
      this.updateAnalyzeSummary();
    } catch (e) {
      UI.hideLoading();
      UI.showToast('Données PVGIS estimées (mode hors ligne)', 'warning');
      this.state.pvgisData = PVGIS.getMonthlyFallback(loc.latitude, loc.longitude, tilt, azimuth);
    }

    document.getElementById('btn-go-panel')?.addEventListener('click', () => this.navigate('panel'));
    document.getElementById('btn-go-obstacles')?.addEventListener('click', () => this.navigate('obstacles'));
    document.getElementById('btn-go-results')?.addEventListener('click', () => this.navigate('results'));
  },

  drawSunPath() {
    const canvas = document.getElementById('sun-path-canvas');
    if (!canvas || !this.state.location) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H * 0.85;
    const R = Math.min(W, H) * 0.42;

    ctx.clearRect(0, 0, W, H);

    // Background
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.2);
    bg.addColorStop(0, '#0d1b2a');
    bg.addColorStop(1, '#0a0f1e');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Horizon arc
    ctx.beginPath();
    ctx.arc(cx, cy, R, Math.PI, 0);
    ctx.strokeStyle = 'rgba(245,166,35,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Elevation arcs (30°, 60°, 90°)
    [30, 60, 90].forEach(el => {
      const r = R * (1 - el / 90);
      ctx.beginPath();
      ctx.arc(cx, cy, r, Math.PI, 0);
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '10px monospace';
      ctx.fillText(`${el}°`, cx + r + 2, cy - 2);
    });

    // Cardinal directions
    const cardinals = [['N', cx, cy + 20], ['S', cx, cy - R - 10], ['E', cx + R + 10, cy], ['O', cx - R - 10, cy]];
    cardinals.forEach(([label, x, y]) => {
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(label, x, y);
    });

    // Draw paths for summer solstice, equinox, winter solstice
    const loc = this.state.location;
    const dates = [
      { date: new Date(2024, 5, 21), color: '#f5a623', label: 'Été' },
      { date: new Date(2024, 2, 20), color: '#7ecfab', label: 'Équinoxe' },
      { date: new Date(2024, 11, 21), color: '#4a9fd4', label: 'Hiver' }
    ];

    dates.forEach(({ date, color }) => {
      const path = Solar.sunPath(date, loc.latitude, loc.longitude, 0.25);
      ctx.beginPath();
      let first = true;
      path.forEach(pt => {
        if (pt.elevation < 0) return;
        const az = Solar.rad(pt.azimuth);
        const r = R * (1 - pt.elevation / 90);
        // Convert azimuth/elevation to canvas coords (N=top, S=bottom)
        const azFromNorth = pt.azimuth;
        const azCanvas = Solar.rad(azFromNorth - 180); // flip so S is up
        const x = cx + r * Math.sin(azCanvas);
        const y = cy - r * Math.cos(azCanvas);
        if (first) { ctx.moveTo(x, y); first = false; }
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Current sun position
    const now = new Date();
    if (loc) {
      const pos = Solar.sunPosition(now, loc.latitude, loc.longitude);
      if (pos.elevation > 0) {
        const azCanvas = Solar.rad(pos.azimuth - 180);
        const r = R * (1 - pos.elevation / 90);
        const x = cx + r * Math.sin(azCanvas);
        const y = cy - r * Math.cos(azCanvas);
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#fff700';
        ctx.fill();
        ctx.strokeStyle = '#f5a623';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Panel surface indicator
    if (this.state.surface.azimuth !== null) {
      const az = Solar.rad(this.state.surface.azimuth - 180);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + R * 0.6 * Math.sin(az), cy - R * 0.6 * Math.cos(az));
      ctx.strokeStyle = '#e74c3c';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#e74c3c';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('Panneau', cx + R * 0.65 * Math.sin(az), cy - R * 0.65 * Math.cos(az));
    }

    // Legend
    ctx.textAlign = 'left';
    [['Été', '#f5a623'], ['Équinoxe', '#7ecfab'], ['Hiver', '#4a9fd4']].forEach(([label, color], i) => {
      ctx.fillStyle = color;
      ctx.fillRect(10, 10 + i * 18, 20, 3);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '10px sans-serif';
      ctx.fillText(label, 34, 14 + i * 18);
    });
  },

  drawIrradiationChart() {
    const canvas = document.getElementById('irrad-chart');
    if (!canvas || !this.state.pvgisData) return;
    const data = this.state.pvgisData.monthly;
    Charts.bar(canvas, {
      labels: data.map(d => d.month),
      values: data.map(d => d.irradiation),
      color: '#f5a623',
      unit: 'kWh/m²',
      title: 'Irradiation mensuelle'
    });
  },

  drawProductionChart() {
    const canvas = document.getElementById('prod-chart');
    if (!canvas || !this.state.pvResult) return;
    const data = this.state.pvResult.monthly;
    Charts.bar(canvas, {
      labels: data.map(d => d.month),
      values: data.map(d => d.production),
      color: '#7ecfab',
      unit: 'kWh',
      title: 'Production mensuelle estimée'
    });
  },

  updateAnalyzeSummary() {
    const loc = this.state.location;
    const surface = this.state.surface;
    const optTilt = Solar.optimalTilt(loc?.latitude || 47);
    const optAz = Solar.optimalAzimuth(loc?.latitude || 47);
    const score = surface.azimuth !== null ? Solar.scoreOrientation(surface.azimuth, loc?.latitude || 47) : null;

    const el = id => document.getElementById(id);
    if (el('summary-lat')) el('summary-lat').textContent = loc ? `${loc.latitude.toFixed(4)}° N` : 'Non définie';
    if (el('summary-az')) el('summary-az').textContent = surface.azimuth !== null ? `${surface.azimuth}° (${surface.label})` : 'Non capturé';
    if (el('summary-tilt')) el('summary-tilt').textContent = `${surface.tilt || optTilt}°`;
    if (el('summary-opt-tilt')) el('summary-opt-tilt').textContent = `${optTilt}°`;
    if (el('summary-score') && score !== null) {
      el('summary-score').textContent = `${score}/100`;
      el('summary-score').className = `stat-value ${score >= 80 ? 'text-green' : score >= 60 ? 'text-yellow' : 'text-red'}`;
    }
    if (el('summary-annual') && this.state.pvResult) {
      el('summary-annual').textContent = `${this.state.pvResult.annualProduction} kWh/an`;
    }
  },

  bindPlanner() {
    // Desktop planner - install type selection
    document.querySelectorAll('.install-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.install-type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.state.install.type = btn.dataset.type;
      });
    });

    document.querySelectorAll('.usage-checkbox').forEach(cb => {
      cb.addEventListener('change', () => {
        const usage = [];
        document.querySelectorAll('.usage-checkbox:checked').forEach(c => usage.push(c.value));
        this.state.install.usage = usage;
      });
    });

    document.getElementById('btn-planner-analyze')?.addEventListener('click', async () => {
      this.collectPlannerInputs();
      if (!this.state.location) await this.getLocation();
      this.saveToStorage();
      this.navigate('analyze');
    });

    document.getElementById('btn-planner-panel')?.addEventListener('click', () => {
      this.collectPlannerInputs();
      this.navigate('panel');
    });

    // Sliders
    ['surface-area', 'panel-tilt', 'panel-azimuth', 'self-consumption'].forEach(id => {
      const input = document.getElementById(id);
      const display = document.getElementById(id + '-display');
      if (input && display) {
        input.addEventListener('input', () => { display.textContent = input.value; });
      }
    });
  },

  collectPlannerInputs() {
    const get = id => document.getElementById(id);
    if (get('surface-area')) this.state.install.surfaceArea = +get('surface-area').value;
    if (get('panel-tilt')) this.state.surface.tilt = +get('panel-tilt').value;
    if (get('panel-azimuth')) this.state.surface.azimuth = +get('panel-azimuth').value;
    if (get('install-cost')) this.state.install.installCost = +get('install-cost').value;
    if (get('self-consumption')) this.state.install.selfConsumption = +get('self-consumption').value / 100;
    if (get('panel-azimuth')) this.state.surface.label = Solar.compassLabel(+get('panel-azimuth').value);
  },

  bindPanelConfig() {
    const fields = ['panel-name','panel-power','panel-efficiency','panel-width','panel-height','panel-cell','panel-temp-coeff','panel-price','panel-qty'];
    fields.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('change', () => this.updatePanelState());
    });

    document.getElementById('btn-panel-save')?.addEventListener('click', () => {
      this.updatePanelState();
      this.saveToStorage();
      UI.showToast('Panneau enregistré !', 'success');
      this.navigate('analyze');
    });
  },

  updatePanelState() {
    const get = id => document.getElementById(id)?.value;
    this.state.panel = {
      name: get('panel-name') || this.state.panel.name,
      peakPower: +get('panel-power') || this.state.panel.peakPower,
      efficiency: +get('panel-efficiency') || this.state.panel.efficiency,
      width: +get('panel-width') || this.state.panel.width,
      height: +get('panel-height') || this.state.panel.height,
      cellType: get('panel-cell') || this.state.panel.cellType,
      tempCoeff: +get('panel-temp-coeff') || this.state.panel.tempCoeff,
      price: +get('panel-price') || this.state.panel.price,
      quantity: +get('panel-qty') || this.state.panel.quantity
    };
  },

  bindObstacles() {
    document.getElementById('btn-add-obstacle')?.addEventListener('click', () => {
      const name = document.getElementById('obs-name')?.value || 'Obstacle';
      const azStart = +document.getElementById('obs-az-start')?.value || 0;
      const azEnd = +document.getElementById('obs-az-end')?.value || 45;
      const height = +document.getElementById('obs-height')?.value || 5;
      const dist = +document.getElementById('obs-dist')?.value || 10;
      const elevAngle = Math.atan(height / dist) * 180 / Math.PI;
      this.state.obstacles.push({ name, azStart, azEnd, height, dist, elevAngle });
      this.saveToStorage();
      this.render();
    });
  },

  bindResults() {
    const loc = this.state.location;
    if (!loc || !this.state.pvResult) {
      document.getElementById('results-placeholder')?.classList.remove('hidden');
      return;
    }

    const panel = this.state.panel;
    const install = this.state.install;
    const energy = this.state.energy;
    const production = this.state.pvResult.annualProduction;
    const totalPanelCost = panel.price * panel.quantity;

    const roi = Solar.roi(production, totalPanelCost, install.installCost, energy.kwhPrice, energy.feedInTariff, install.selfConsumption);
    const seasonalTilts = Solar.seasonalTilts(loc.latitude);

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('res-production', `${production} kWh/an`);
    set('res-savings', `${roi.annualSavings} €/an`);
    set('res-roi', `${roi.roiYears} ans`);
    set('res-co2', `${roi.co2Saved} kg CO₂/an`);
    set('res-lifetime', `${roi.lifetime25 > 0 ? '+' : ''}${roi.lifetime25} €`);
    set('res-tilt-annual', `${seasonalTilts.annual}°`);
    set('res-tilt-summer', `${Math.max(0, seasonalTilts.summer)}°`);
    set('res-tilt-winter', `${seasonalTilts.winter}°`);

    // Usage recommendations
    this.renderUsageRecommendations();

    document.getElementById('btn-export-pdf')?.addEventListener('click', () => {
      UI.showToast('Export PDF — disponible dans la version finale', 'info');
    });

    document.getElementById('btn-save-project')?.addEventListener('click', () => {
      this.saveProject();
    });
  },

  renderUsageRecommendations() {
    const usage = this.state.install.usage;
    const production = this.state.pvResult?.annualProduction || 0;
    const container = document.getElementById('usage-recommendations');
    if (!container) return;

    const recs = {
      'autoconsommation': { icon: '🏠', title: 'Autoconsommation', desc: 'Onduleur micro-réseau + compteur bidirectionnel. Connexion directe au tableau électrique.' },
      'injection': { icon: '⚡', title: 'Injection réseau', desc: 'Micro-onduleur certifié + convention de raccordement Enedis. Tarif S21 ~0,13€/kWh.' },
      'batterie': { icon: '🔋', title: 'Stockage batterie', desc: `Capacité recommandée : ${Math.round(production / 365 * 0.6 * 1000)}Wh. Régulateur MPPT + batterie lithium.` },
      'eclairage': { icon: '💡', title: 'Éclairage extérieur', desc: 'Contrôleur 12V/24V + batterie AGM. Installation simple, autonomie complète.' },
      'pompe': { icon: '💧', title: 'Pompe solaire', desc: 'Pompe DC directe ou AC via onduleur. Dimensionner selon débit et pression.' },
      'chargement': { icon: '🔌', title: 'Charge véhicule', desc: 'Boîtier de charge solaire recommandé. Nécessite production ≥ 3kWc pour charge significative.' }
    };

    if (usage.length === 0) {
      container.innerHTML = '<p class="text-muted">Sélectionnez vos usages dans le planificateur.</p>';
      return;
    }

    container.innerHTML = usage.map(u => {
      const r = recs[u] || { icon: '⚙️', title: u, desc: 'Configuration sur mesure recommandée.' };
      return `<div class="rec-card"><span class="rec-icon">${r.icon}</span><div><strong>${r.title}</strong><p>${r.desc}</p></div></div>`;
    }).join('');
  },

  saveProject() {
    const project = {
      id: Date.now(),
      name: `Projet ${new Date().toLocaleDateString('fr-FR')}`,
      location: this.state.location,
      surface: this.state.surface,
      panel: this.state.panel,
      install: this.state.install,
      pvResult: this.state.pvResult,
      obstacles: this.state.obstacles,
      createdAt: new Date().toISOString()
    };
    this.state.projects.push(project);
    this.saveToStorage();
    UI.showToast('Projet sauvegardé !', 'success');
  }
};

// Simple UI helpers
const UI = {
  showToast(msg, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 3000);
  },
  showLoading(msg = 'Chargement…') {
    let el = document.getElementById('loading-overlay');
    if (!el) {
      el = document.createElement('div');
      el.id = 'loading-overlay';
      document.body.appendChild(el);
    }
    el.innerHTML = `<div class="loading-spinner"></div><p>${msg}</p>`;
    el.classList.add('active');
  },
  hideLoading() {
    document.getElementById('loading-overlay')?.classList.remove('active');
  }
};

// Simple canvas charts
const Charts = {
  bar(canvas, { labels, values, color, unit, title }) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const pad = { top: 30, right: 15, bottom: 40, left: 45 };
    const chartW = W - pad.left - pad.right;
    const chartH = H - pad.top - pad.bottom;
    const max = Math.max(...values) * 1.1;
    const barW = chartW / labels.length * 0.7;
    const gap = chartW / labels.length;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0d1b2a';
    ctx.fillRect(0, 0, W, H);

    // Title
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, W / 2, 18);

    // Bars
    values.forEach((val, i) => {
      const x = pad.left + i * gap + (gap - barW) / 2;
      const barH = (val / max) * chartH;
      const y = pad.top + chartH - barH;

      const grad = ctx.createLinearGradient(0, y, 0, y + barH);
      grad.addColorStop(0, color);
      grad.addColorStop(1, color + '44');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, 3);
      ctx.fill();

      // Label
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(labels[i], x + barW / 2, H - 5);

      // Value
      ctx.fillStyle = color;
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText(Math.round(val), x + barW / 2, y - 3);
    });

    // Y axis label
    ctx.save();
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(unit, -(pad.top + chartH / 2), 12);
    ctx.restore();
  }
};

window.App = App;
window.UI = UI;
window.Charts = Charts;
