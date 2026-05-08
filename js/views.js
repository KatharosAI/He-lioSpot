// HelioSpot - Views (HTML Templates)

const Views = {

  nav() {
    const v = App.state.view;
    return `
    <nav class="bottom-nav">
      <button class="nav-btn ${v==='home'?'active':''}" data-nav="home">
        <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        <span>Accueil</span>
      </button>
      <button class="nav-btn ${v==='compass'?'active':''}" data-nav="compass">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
        <span>Boussole</span>
      </button>
      <button class="nav-btn ${v==='analyze'?'active':''}" data-nav="analyze">
        <svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1010 10A10 10 0 0012 2zm0 18a8 8 0 118-8 8 8 0 01-8 8z"/><path d="M12 6v6l4 2"/></svg>
        <span>Analyse</span>
      </button>
      <button class="nav-btn ${v==='planner'?'active':''}" data-nav="planner">
        <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
        <span>Planifier</span>
      </button>
      <button class="nav-btn ${v==='results'?'active':''}" data-nav="results">
        <svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        <span>Résultats</span>
      </button>
    </nav>`;
  },

  home() {
    const hasLocation = !!App.state.location;
    const hasSurface = App.state.surface.azimuth !== null;
    const hasPanel = !!App.state.panel.name;
    const isMobile = App.state.isMobile;

    return `
    <div class="view view-home">
      <div class="hero">
        <div class="hero-glow"></div>
        <div class="sun-animation">
          <div class="sun-core"></div>
          <div class="sun-ring r1"></div>
          <div class="sun-ring r2"></div>
          <div class="sun-ring r3"></div>
        </div>
        <div class="hero-text">
          <div class="logo-mark">⬡</div>
          <h1 class="logo-title">Helio<span>Spot</span></h1>
          <p class="logo-tagline">Optimisez vos panneaux solaires</p>
        </div>
      </div>

      <div class="home-cards">
        ${isMobile ? `
        <div class="home-card primary" id="btn-start-mobile">
          <div class="card-icon">🧭</div>
          <div class="card-content">
            <h3>Analyse terrain</h3>
            <p>Utilisez la boussole et le GPS pour trouver l'emplacement optimal sur place</p>
          </div>
          <div class="card-arrow">→</div>
        </div>` : ''}

        <div class="home-card" id="btn-start-desktop">
          <div class="card-icon">📐</div>
          <div class="card-content">
            <h3>Planificateur</h3>
            <p>Configurez votre installation depuis votre ordinateur</p>
          </div>
          <div class="card-arrow">→</div>
        </div>

        <div class="home-card" id="btn-my-projects">
          <div class="card-icon">📁</div>
          <div class="card-content">
            <h3>Mes projets</h3>
            <p>${App.state.projects.length} projet(s) sauvegardé(s)</p>
          </div>
          <div class="card-arrow">→</div>
        </div>
      </div>

      <div class="progress-strip">
        <div class="progress-step ${hasLocation ? 'done' : ''}">
          <span class="step-icon">${hasLocation ? '✓' : '1'}</span>
          <span>Position GPS</span>
        </div>
        <div class="progress-divider"></div>
        <div class="progress-step ${hasSurface ? 'done' : ''}">
          <span class="step-icon">${hasSurface ? '✓' : '2'}</span>
          <span>Orientation</span>
        </div>
        <div class="progress-divider"></div>
        <div class="progress-step ${hasPanel ? 'done' : ''}">
          <span class="step-icon">${hasPanel ? '✓' : '3'}</span>
          <span>Panneau</span>
        </div>
        <div class="progress-divider"></div>
        <div class="progress-step ${App.state.pvResult ? 'done' : ''}">
          <span class="step-icon">${App.state.pvResult ? '✓' : '4'}</span>
          <span>Résultats</span>
        </div>
      </div>

      ${hasLocation ? `
      <div class="location-strip">
        <span class="loc-icon">📍</span>
        <span>${App.state.location.latitude.toFixed(4)}° N, ${App.state.location.longitude.toFixed(4)}° E</span>
        <span class="loc-acc">±${Math.round(App.state.location.accuracy)}m</span>
      </div>` : ''}
    </div>`;
  },

  compass() {
    const optTilt = App.state.location ? Solar.optimalTilt(App.state.location.latitude) : 35;

    // Générer les graduations SVG directement dans le template (pas de JS post-rendu)
    let ticks = '';
    for (let i = 0; i < 360; i += 5) {
      const rad = i * Math.PI / 180;
      const isCard  = (i % 90 === 0);
      const isMaj30 = (i % 30 === 0);
      const isMaj10 = (i % 10 === 0);
      const r1 = 96;
      const r2 = isCard ? 78 : isMaj30 ? 84 : isMaj10 ? 88 : 92;
      const x1 = (110 + r1 * Math.sin(rad)).toFixed(2);
      const y1 = (110 - r1 * Math.cos(rad)).toFixed(2);
      const x2 = (110 + r2 * Math.sin(rad)).toFixed(2);
      const y2 = (110 - r2 * Math.cos(rad)).toFixed(2);
      const col = isCard ? '#f5a623' : isMaj30 ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)';
      const w   = isCard ? 2.5 : isMaj30 ? 1.5 : 0.8;
      ticks += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="${w}"/>`;
    }

    // Graduations inclinomètre
    let tiltTicks = '';
    const CX = 140, CY = 130, R = 95;
    for (let a = 0; a <= 90; a += 10) {
      const rad = a * Math.PI / 180;
      const isMaj = (a % 30 === 0);
      const r2 = R - (isMaj ? 14 : 8);
      // Côté droit
      const x1r = (CX + R  * Math.sin(rad)).toFixed(1), y1r = (CY - R  * Math.cos(rad)).toFixed(1);
      const x2r = (CX + r2 * Math.sin(rad)).toFixed(1), y2r = (CY - r2 * Math.cos(rad)).toFixed(1);
      // Côté gauche symétrique
      const x1l = (CX - R  * Math.sin(rad)).toFixed(1);
      const x2l = (CX - r2 * Math.sin(rad)).toFixed(1);
      const col = isMaj ? 'rgba(245,166,35,0.5)' : 'rgba(255,255,255,0.18)';
      const sw  = isMaj ? 1.5 : 0.8;
      tiltTicks += `<line x1="${x1r}" y1="${y1r}" x2="${x2r}" y2="${y2r}" stroke="${col}" stroke-width="${sw}"/>`;
      if (a > 0) tiltTicks += `<line x1="${x1l}" y1="${y1r}" x2="${x2l}" y2="${y2r}" stroke="${col}" stroke-width="${sw}"/>`;
      if (isMaj && a > 0 && a < 90) {
        const xt = (CX + (R+12) * Math.sin(rad)).toFixed(1);
        const xl = (CX - (R+12) * Math.sin(rad)).toFixed(1);
        const yt = (CY - (R+12) * Math.cos(rad) + 4).toFixed(1);
        tiltTicks += `<text x="${xt}" y="${yt}" text-anchor="middle" font-size="9" font-family="monospace" fill="rgba(255,255,255,0.4)">${a}°</text>`;
        tiltTicks += `<text x="${xl}" y="${yt}" text-anchor="middle" font-size="9" font-family="monospace" fill="rgba(255,255,255,0.4)">${a}°</text>`;
      }
    }
    // Label 0° en bas et 90° en haut
    tiltTicks += `<text x="${CX}" y="${CY+14}" text-anchor="middle" font-size="9" font-family="monospace" fill="rgba(255,255,255,0.4)">0°</text>`;
    tiltTicks += `<text x="${CX}" y="${CY-R-8}" text-anchor="middle" font-size="9" font-family="monospace" fill="rgba(255,255,255,0.4)">90°</text>`;

    return `
    <div class="view view-compass">
      <div class="view-header">
        <h2>🧭 Boussole solaire</h2>
        <p class="subtitle">Orientation et inclinaison de votre surface</p>
      </div>

      <!-- ÉCRAN DE DÉMARRAGE -->
      <div id="compass-start-screen">
        <div class="compass-instructions">
          <div class="instruction-step">
            <span class="step-num">1</span>
            <span><strong>Orientation</strong> — tenez le téléphone à la verticale, pointez-le face à votre surface</span>
          </div>
          <div class="instruction-step">
            <span class="step-num">2</span>
            <span><strong>Inclinaison</strong> — posez le téléphone à plat <em>sur</em> la surface (toit, sol incliné)</span>
          </div>
          <div class="instruction-step">
            <span class="step-num">3</span>
            <span>Capturez chaque mesure puis lancez l'analyse</span>
          </div>
        </div>
        <button class="btn btn-primary btn-lg" id="btn-compass-start">
          <svg viewBox="0 0 24 24" width="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
          Activer la boussole
        </button>
      </div>

      <!-- ZONE LIVE -->
      <div id="compass-live" class="compass-live hidden">

        <!-- ONGLETS -->
        <div class="compass-tabs">
          <button class="ctab active" id="tab-orientation" onclick="App.switchCompassTab('orientation')">🧭 Orientation</button>
          <button class="ctab"        id="tab-tilt"        onclick="App.switchCompassTab('tilt')">📐 Inclinaison</button>
        </div>

        <!-- ══ PANNEAU ORIENTATION ══ -->
        <div id="panel-orientation" class="compass-panel">
          <p class="panel-hint">📱 Téléphone <strong>vertical</strong> — pointez vers votre surface</p>

          <div class="compass-svg-wrap">
            <svg id="compass-svg" viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg" style="width:220px;height:220px">

              <!-- Fond fixe -->
              <circle cx="110" cy="110" r="108" fill="#0d1b2a" stroke="#f5a623" stroke-width="1.5"/>
              <circle cx="110" cy="110" r="75"  fill="none"   stroke="rgba(245,166,35,0.08)" stroke-width="1"/>
              <circle cx="110" cy="110" r="50"  fill="none"   stroke="rgba(245,166,35,0.05)" stroke-width="1"/>

              <!-- ★ CADRAN TOURNANT — rotation via attribut transform (compatible SVG mobile) -->
              <g id="compass-dial" transform="rotate(0 110 110)">
                ${ticks}
                <!-- Cardinaux -->
                <text x="110" y="24"  text-anchor="middle" font-size="17" font-weight="bold" font-family="monospace" fill="#e74c3c">N</text>
                <text x="110" y="204" text-anchor="middle" font-size="15" font-family="monospace" fill="rgba(255,255,255,0.55)">S</text>
                <text x="200" y="115" text-anchor="middle" font-size="15" font-family="monospace" fill="rgba(255,255,255,0.55)">E</text>
                <text x="20"  y="115" text-anchor="middle" font-size="15" font-family="monospace" fill="rgba(255,255,255,0.55)">O</text>
                <!-- Inter-cardinaux -->
                <text x="170" y="48"  text-anchor="middle" font-size="10" font-family="monospace" fill="rgba(255,255,255,0.3)">NE</text>
                <text x="170" y="177" text-anchor="middle" font-size="10" font-family="monospace" fill="rgba(255,255,255,0.3)">SE</text>
                <text x="50"  y="177" text-anchor="middle" font-size="10" font-family="monospace" fill="rgba(255,255,255,0.3)">SO</text>
                <text x="50"  y="48"  text-anchor="middle" font-size="10" font-family="monospace" fill="rgba(255,255,255,0.3)">NO</text>
              </g>

              <!-- ★ REPÈRE DE VISÉE FIXE (ne tourne pas) — flèche ambre en haut -->
              <polygon points="110,8 103,26 117,26" fill="#f5a623"/>
              <line x1="110" y1="26" x2="110" y2="68" stroke="#f5a623" stroke-width="2" stroke-dasharray="5,3" opacity="0.8"/>

              <!-- Centre -->
              <circle cx="110" cy="110" r="9" fill="#162035" stroke="#f5a623" stroke-width="2"/>
              <circle cx="110" cy="110" r="3" fill="#f5a623"/>

              <!-- Arc de qualité (mis à jour par JS) -->
              <path id="score-arc" d="M 110 205" fill="none" stroke="#7ecfab" stroke-width="5" stroke-linecap="round" opacity="0"/>
            </svg>
          </div>

          <!-- Données chiffrées -->
          <div class="compass-data-strip">
            <div class="cds-item">
              <span class="cds-label">CAP</span>
              <span class="cds-value" id="heading-value">—</span>
            </div>
            <div class="cds-item cds-hi">
              <span class="cds-label">DIRECTION</span>
              <span class="cds-value cds-dir" id="direction-label">—</span>
            </div>
            <div class="cds-item">
              <span class="cds-label">SCORE</span>
              <span class="cds-value" id="orientation-score">—</span>
            </div>
          </div>

          <div class="quality-bar-wrap">
            <div class="quality-bar"><div class="quality-fill" id="quality-fill" style="width:0%"></div></div>
            <span class="quality-label" id="quality-label">En attente…</span>
          </div>

          <button class="btn btn-primary btn-full" id="btn-capture-azimuth">📌 Capturer l'orientation</button>
          <div id="azimuth-captured" class="captured-ok hidden">
            ✓ Capturée : <strong id="az-captured-display">—</strong>
            <button class="btn btn-ghost btn-sm" id="btn-recapture-az">↺ Recommencer</button>
          </div>
        </div>

        <!-- ══ PANNEAU INCLINAISON ══ -->
        <div id="panel-tilt" class="compass-panel hidden">
          <p class="panel-hint">📱 Posez le téléphone <strong>à plat sur la surface</strong> à mesurer</p>

          <div class="tilt-meter-wrap">
            <svg id="tilt-svg" viewBox="0 0 280 165" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:300px">
              <rect width="280" height="165" fill="#0d1b2a" rx="10"/>
              <!-- Demi-cercle rapporteur -->
              <path d="M ${CX-R} ${CY} A ${R} ${R} 0 0 1 ${CX+R} ${CY}" fill="none" stroke="rgba(245,166,35,0.15)" stroke-width="1"/>
              ${tiltTicks}
              <!-- Sol horizontal -->
              <line x1="25" y1="${CY}" x2="255" y2="${CY}" stroke="rgba(255,255,255,0.12)" stroke-width="1" stroke-dasharray="4,4"/>
              <text x="${CX}" y="${CY+14}" text-anchor="middle" font-size="8" font-family="monospace" fill="rgba(255,255,255,0.25)">HORIZONTAL</text>
              <!-- Aiguille optimale (verte, fixe) -->
              <line id="tilt-optimal" x1="${CX}" y1="${CY}" x2="${CX}" y2="${CY-R}" stroke="#7ecfab" stroke-width="1.5" stroke-dasharray="5,3" opacity="0.7"/>
              <!-- Aiguille surface (ambre, bouge) -->
              <line id="tilt-needle" x1="${CX}" y1="${CY}" x2="${CX}" y2="${CY-R+10}" stroke="#f5a623" stroke-width="3.5" stroke-linecap="round"/>
              <circle cx="${CX}" cy="${CY}" r="5" fill="#f5a623"/>
              <!-- Valeur centrale -->
              <text id="tilt-big-value" x="${CX}" y="${Math.round(CY*0.52)}" text-anchor="middle" font-size="28" font-weight="bold" font-family="monospace" fill="#f5a623">—°</text>
            </svg>
            <div class="tilt-legend">
              <span><span style="color:#f5a623">—</span> Votre surface</span>
              <span><span style="color:#7ecfab">╌</span> Optimale (${optTilt}°)</span>
            </div>
          </div>

          <div class="tilt-info-grid">
            <div class="tig-item">
              <span class="tig-icon" id="tilt-emoji">📐</span>
              <span class="tig-label" id="tilt-label">En attente…</span>
            </div>
            <div class="tig-item">
              <span class="tig-icon">🎯</span>
              <span class="tig-label">Optimale pour votre latitude : <strong>${optTilt}°</strong></span>
            </div>
            <div class="tig-item" id="tilt-quality-row" style="display:none">
              <span class="tig-icon">📊</span>
              <span class="tig-label" id="tilt-quality-label">—</span>
            </div>
          </div>

          <div class="tilt-reference">
            <div class="tref-title">Références rapides</div>
            <div class="tref-grid">
              <span class="tref-item">➖ 0° — plat</span>
              <span class="tref-item">📐 20° — faible</span>
              <span class="tref-item">🏠 30-35° — standard</span>
              <span class="tref-item">⛰️ 45° — forte</span>
              <span class="tref-item">🧱 90° — vertical</span>
            </div>
          </div>

          <button class="btn btn-primary btn-full" id="btn-capture-tilt">📌 Capturer l'inclinaison</button>
          <div id="tilt-captured" class="captured-ok hidden">
            ✓ Capturée : <strong id="tilt-captured-display">—</strong>
            <button class="btn btn-ghost btn-sm" id="btn-recapture-tilt">↺ Recommencer</button>
          </div>
        </div>

        <!-- RÉCAP FINAL -->
        <div id="compass-summary" class="compass-summary hidden">
          <div class="summary-title">✅ Mesures enregistrées</div>
          <div class="summary-row"><span>🧭 Orientation :</span><strong id="sum-azimuth">—</strong></div>
          <div class="summary-row"><span>📐 Inclinaison :</span><strong id="sum-tilt">—</strong></div>
          <div class="summary-row"><span>🎯 Score global :</span><strong id="sum-score">—</strong></div>
          <button class="btn btn-success btn-full" id="btn-next-analyze">Analyser l'emplacement →</button>
        </div>

        <div style="margin-top:12px">
          <button class="btn btn-ghost btn-sm" data-nav="obstacles">🌳 Définir les obstacles / ombres</button>
        </div>

      </div><!-- /compass-live -->
    </div>`;
  },

  analyze() {
    const loc = App.state.location;
    const surface = App.state.surface;
    const optTilt = loc ? Solar.optimalTilt(loc.latitude) : 30;
    const ss = loc ? Solar.sunriseSunset(new Date(), loc.latitude, loc.longitude) : null;

    const fmt = h => {
      const hh = Math.floor(h);
      const mm = Math.round((h - hh) * 60);
      return `${hh}h${mm.toString().padStart(2,'0')}`;
    };

    return `
    <div class="view view-analyze">
      <div class="view-header">
        <h2>☀️ Analyse solaire</h2>
        ${loc ? `<p class="subtitle">${loc.latitude.toFixed(3)}°N — Inclinaison optimale : <strong>${optTilt}°</strong></p>` : '<p class="subtitle">Position GPS requise</p>'}
      </div>

      ${ss ? `
      <div class="sun-times-strip">
        <div class="sun-time"><span>🌅</span><span>${fmt(ss.sunrise)}</span><small>Lever</small></div>
        <div class="sun-time"><span>☀️</span><span>${fmt(ss.solarNoon)}</span><small>Midi solaire</small></div>
        <div class="sun-time"><span>🌇</span><span>${fmt(ss.sunset)}</span><small>Coucher</small></div>
      </div>` : ''}

      <div class="chart-section">
        <h3 class="chart-title">Trajectoire solaire</h3>
        <div class="canvas-wrap">
          <canvas id="sun-path-canvas" width="340" height="280"></canvas>
        </div>
        <div class="chart-legend">
          <span style="color:#f5a623">━</span> Été
          <span style="color:#7ecfab">━</span> Équinoxe
          <span style="color:#4a9fd4">━</span> Hiver
          ${surface.azimuth !== null ? '<span style="color:#e74c3c">━</span> Votre panneau' : ''}
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Orientation</div>
          <div class="stat-value" id="summary-az">${surface.azimuth !== null ? `${surface.azimuth}° ${surface.label}` : 'Non capturée'}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Inclinaison</div>
          <div class="stat-value" id="summary-tilt">${surface.tilt || optTilt}°</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Tilt optimal</div>
          <div class="stat-value text-green" id="summary-opt-tilt">${optTilt}°</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Score expo</div>
          <div class="stat-value" id="summary-score">—</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Latitude</div>
          <div class="stat-value" id="summary-lat">${loc ? `${loc.latitude.toFixed(4)}°` : '—'}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Production est.</div>
          <div class="stat-value text-yellow" id="summary-annual">—</div>
        </div>
      </div>

      <div class="chart-section">
        <h3 class="chart-title">Irradiation mensuelle</h3>
        <div class="canvas-wrap">
          <canvas id="irrad-chart" width="340" height="180"></canvas>
        </div>
      </div>

      <div class="chart-section">
        <h3 class="chart-title">Production estimée</h3>
        <div class="canvas-wrap">
          <canvas id="prod-chart" width="340" height="180"></canvas>
        </div>
      </div>

      <div class="analyze-actions">
        <button class="btn btn-ghost" id="btn-go-panel">⚙️ Configurer panneau</button>
        <button class="btn btn-ghost" id="btn-go-obstacles">🌳 Obstacles</button>
        <button class="btn btn-primary" id="btn-go-results">Voir les résultats →</button>
      </div>
    </div>`;
  },

  planner() {
    const install = App.state.install;
    const surface = App.state.surface;
    const loc = App.state.location;

    const installTypes = [
      { id: 'roof_inclined', icon: '🏠', label: 'Toit incliné' },
      { id: 'roof_flat', icon: '🏢', label: 'Toit plat' },
      { id: 'garden', icon: '🌿', label: 'Jardin' },
      { id: 'shed', icon: '🏚️', label: 'Chalet/Abri' }
    ];

    const usages = [
      { id: 'autoconsommation', icon: '🏠', label: 'Autoconsommation' },
      { id: 'injection', icon: '⚡', label: 'Injection réseau' },
      { id: 'batterie', icon: '🔋', label: 'Stockage batterie' },
      { id: 'eclairage', icon: '💡', label: 'Éclairage extérieur' },
      { id: 'pompe', icon: '💧', label: 'Pompe solaire' },
      { id: 'chargement', icon: '🔌', label: 'Charge véhicule' }
    ];

    return `
    <div class="view view-planner">
      <div class="view-header">
        <h2>📐 Planificateur</h2>
        <p class="subtitle">Configurez votre installation</p>
      </div>

      <section class="planner-section">
        <h3>Type d'installation</h3>
        <div class="install-type-grid">
          ${installTypes.map(t => `
          <button class="install-type-btn ${install.type === t.id ? 'active' : ''}" data-type="${t.id}">
            <span>${t.icon}</span>
            <span>${t.label}</span>
          </button>`).join('')}
        </div>
      </section>

      <section class="planner-section">
        <h3>Localisation</h3>
        ${loc ? `
        <div class="location-display">
          <span>📍 ${loc.latitude.toFixed(4)}°N, ${loc.longitude.toFixed(4)}°E</span>
          <button class="btn btn-ghost btn-sm" id="btn-relocate" onclick="App.getLocation().then(()=>App.render())">Actualiser</button>
        </div>` : `
        <button class="btn btn-secondary" onclick="App.getLocation().then(()=>App.render())">
          📍 Obtenir ma position GPS
        </button>`}
      </section>

      <section class="planner-section">
        <h3>Orientation et inclinaison</h3>
        <div class="slider-group">
          <label>Azimut panneau (° depuis le Nord)
            <span class="slider-value"><span id="panel-azimuth-display">${surface.azimuth || 180}</span>°</span>
          </label>
          <input type="range" id="panel-azimuth" min="0" max="359" value="${surface.azimuth || 180}" step="1">
          <div class="slider-hints"><span>N 0°</span><span>E 90°</span><span>S 180°</span><span>O 270°</span></div>
        </div>

        <div class="slider-group">
          <label>Inclinaison panneau (°)
            <span class="slider-value"><span id="panel-tilt-display">${surface.tilt || Solar.optimalTilt(loc?.latitude||47)}</span>°</span>
          </label>
          <input type="range" id="panel-tilt" min="0" max="90" value="${surface.tilt || Solar.optimalTilt(loc?.latitude||47)}" step="1">
          <div class="slider-hints"><span>Plat 0°</span><span>Optimal ~${Solar.optimalTilt(loc?.latitude||47)}°</span><span>Vertical 90°</span></div>
        </div>

        <div class="slider-group">
          <label>Surface disponible (m²)
            <span class="slider-value"><span id="surface-area-display">${install.surfaceArea}</span> m²</span>
          </label>
          <input type="range" id="surface-area" min="2" max="100" value="${install.surfaceArea}" step="1">
        </div>

        <div class="slider-group">
          <label>Autoconsommation estimée (%)
            <span class="slider-value"><span id="self-consumption-display">${Math.round(install.selfConsumption*100)}</span>%</span>
          </label>
          <input type="range" id="self-consumption" min="10" max="100" value="${Math.round(install.selfConsumption*100)}" step="5">
        </div>
      </section>

      <section class="planner-section">
        <h3>Coût d'installation (€ HT)</h3>
        <input type="number" id="install-cost" class="input-field" value="${install.installCost}" min="0" placeholder="Coût installation sans panneaux">
      </section>

      <section class="planner-section">
        <h3>Usage prévu</h3>
        <div class="usage-grid">
          ${usages.map(u => `
          <label class="usage-item">
            <input type="checkbox" class="usage-checkbox" value="${u.id}" ${install.usage.includes(u.id)?'checked':''}>
            <span>${u.icon} ${u.label}</span>
          </label>`).join('')}
        </div>
      </section>

      <div class="planner-actions">
        <button class="btn btn-secondary" id="btn-planner-panel">⚙️ Configurer les panneaux</button>
        <button class="btn btn-primary" id="btn-planner-analyze">Analyser →</button>
      </div>
    </div>`;
  },

  panelConfig() {
    const p = App.state.panel;
    return `
    <div class="view view-panel">
      <div class="view-header">
        <h2>⚙️ Panneau solaire</h2>
        <p class="subtitle">Entrez les caractéristiques de votre panneau</p>
      </div>

      <div class="panel-presets">
        <p class="preset-hint">Présets rapides :</p>
        <div class="preset-btns">
          <button class="btn btn-ghost btn-sm" onclick="App.applyPreset('standard')">Standard 400Wc</button>
          <button class="btn btn-ghost btn-sm" onclick="App.applyPreset('premium')">Premium 500Wc</button>
          <button class="btn btn-ghost btn-sm" onclick="App.applyPreset('budget')">Budget 300Wc</button>
        </div>
      </div>

      <div class="form-group">
        <label>Nom / modèle</label>
        <input type="text" id="panel-name" class="input-field" value="${p.name}" placeholder="Ex: Jinko Solar Tiger Neo 400W">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Puissance crête (Wc)</label>
          <input type="number" id="panel-power" class="input-field" value="${p.peakPower}" min="50" max="800">
        </div>
        <div class="form-group">
          <label>Rendement (%)</label>
          <input type="number" id="panel-efficiency" class="input-field" value="${p.efficiency}" min="10" max="30" step="0.1">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Largeur (m)</label>
          <input type="number" id="panel-width" class="input-field" value="${p.width}" min="0.5" max="2.5" step="0.01">
        </div>
        <div class="form-group">
          <label>Hauteur (m)</label>
          <input type="number" id="panel-height" class="input-field" value="${p.height}" min="0.5" max="2.5" step="0.01">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Type de cellule</label>
          <select id="panel-cell" class="input-field">
            <option value="monocristallin" ${p.cellType==='monocristallin'?'selected':''}>Monocristallin</option>
            <option value="polycristallin" ${p.cellType==='polycristallin'?'selected':''}>Polycristallin</option>
            <option value="amorphe" ${p.cellType==='amorphe'?'selected':''}>Amorphe</option>
            <option value="heterojunction" ${p.cellType==='heterojunction'?'selected':''}>Hétérojonction (HJT)</option>
            <option value="bifacial" ${p.cellType==='bifacial'?'selected':''}>Bifacial</option>
          </select>
        </div>
        <div class="form-group">
          <label>Coeff. temp. (%/°C)</label>
          <input type="number" id="panel-temp-coeff" class="input-field" value="${p.tempCoeff}" min="-0.6" max="0" step="0.01">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Prix unitaire (€)</label>
          <input type="number" id="panel-price" class="input-field" value="${p.price}" min="0">
        </div>
        <div class="form-group">
          <label>Quantité</label>
          <input type="number" id="panel-qty" class="input-field" value="${p.quantity}" min="1" max="50">
        </div>
      </div>

      <div class="panel-summary">
        <strong>Résumé :</strong>
        <span id="panel-summary-text">${p.quantity} × ${p.peakPower}Wc = ${(p.peakPower * p.quantity / 1000).toFixed(2)} kWc</span>
      </div>

      <button class="btn btn-primary btn-full" id="btn-panel-save">
        💾 Enregistrer et analyser
      </button>
    </div>`;
  },

  obstacles() {
    const obs = App.state.obstacles;
    return `
    <div class="view view-obstacles">
      <div class="view-header">
        <h2>🌳 Masques solaires</h2>
        <p class="subtitle">Indiquez les éléments qui peuvent bloquer le soleil</p>
      </div>

      <div class="obs-form">
        <div class="form-group">
          <label>Nom de l'obstacle</label>
          <input type="text" id="obs-name" class="input-field" placeholder="Ex: Arbre, Bâtiment voisin, Cheminée">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Azimut début (°)</label>
            <input type="number" id="obs-az-start" class="input-field" value="90" min="0" max="360">
          </div>
          <div class="form-group">
            <label>Azimut fin (°)</label>
            <input type="number" id="obs-az-end" class="input-field" value="135" min="0" max="360">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Hauteur (m)</label>
            <input type="number" id="obs-height" class="input-field" value="5" min="0.5">
          </div>
          <div class="form-group">
            <label>Distance (m)</label>
            <input type="number" id="obs-dist" class="input-field" value="10" min="1">
          </div>
        </div>
        <button class="btn btn-secondary" id="btn-add-obstacle">+ Ajouter l'obstacle</button>
      </div>

      ${obs.length > 0 ? `
      <div class="obs-list">
        <h3>Obstacles définis (${obs.length})</h3>
        ${obs.map((o, i) => `
        <div class="obs-item">
          <div class="obs-info">
            <strong>${o.name}</strong>
            <span>${o.azStart}° → ${o.azEnd}° | ${o.height}m à ${o.dist}m | angle ${Math.round(o.elevAngle)}°</span>
          </div>
          <button class="btn btn-ghost btn-sm obs-delete" data-idx="${i}" onclick="App.state.obstacles.splice(${i},1);App.saveToStorage();App.render()">✕</button>
        </div>`).join('')}
      </div>` : '<p class="text-muted text-center">Aucun obstacle défini</p>'}

      <button class="btn btn-primary btn-full" data-nav="analyze">Retour à l'analyse →</button>
    </div>`;
  },

  results() {
    const pvResult = App.state.pvResult;
    const loc = App.state.location;

    if (!pvResult || !loc) {
      return `
      <div class="view view-results">
        <div class="view-header"><h2>📊 Résultats</h2></div>
        <div class="empty-state" id="results-placeholder">
          <div class="empty-icon">☀️</div>
          <p>Complétez d'abord l'analyse pour voir les résultats.</p>
          <button class="btn btn-primary" data-nav="compass">Commencer l'analyse</button>
        </div>
      </div>`;
    }

    const seasonalTilts = Solar.seasonalTilts(loc.latitude);

    return `
    <div class="view view-results">
      <div class="view-header">
        <h2>📊 Résultats</h2>
        <p class="subtitle">Estimation pour votre installation</p>
      </div>

      <div class="results-hero">
        <div class="result-main">
          <div class="result-icon">⚡</div>
          <div class="result-production" id="res-production">—</div>
          <div class="result-label">Production annuelle estimée</div>
        </div>
      </div>

      <div class="results-grid">
        <div class="result-card green">
          <span class="rc-icon">💰</span>
          <span class="rc-value" id="res-savings">—</span>
          <span class="rc-label">Économies/an</span>
        </div>
        <div class="result-card blue">
          <span class="rc-icon">📅</span>
          <span class="rc-value" id="res-roi">—</span>
          <span class="rc-label">Retour investissement</span>
        </div>
        <div class="result-card teal">
          <span class="rc-icon">🌿</span>
          <span class="rc-value" id="res-co2">—</span>
          <span class="rc-label">CO₂ évité/an</span>
        </div>
        <div class="result-card orange">
          <span class="rc-icon">📈</span>
          <span class="rc-value" id="res-lifetime">—</span>
          <span class="rc-label">Gain sur 25 ans</span>
        </div>
      </div>

      <div class="tilt-recommendations">
        <h3>Inclinaisons recommandées</h3>
        <div class="tilt-grid">
          <div class="tilt-item">
            <span class="tilt-season">Annuelle</span>
            <span class="tilt-val" id="res-tilt-annual">—</span>
          </div>
          <div class="tilt-item">
            <span class="tilt-season">☀️ Été</span>
            <span class="tilt-val" id="res-tilt-summer">—</span>
          </div>
          <div class="tilt-item">
            <span class="tilt-season">❄️ Hiver</span>
            <span class="tilt-val" id="res-tilt-winter">—</span>
          </div>
        </div>
        <p class="tilt-hint">💡 Version Pro : motorisation solaire tracking (+25-35% de rendement)</p>
      </div>

      <div class="usage-section">
        <h3>Schémas de branchement recommandés</h3>
        <div id="usage-recommendations"></div>
      </div>

      <div class="results-actions">
        <button class="btn btn-ghost" id="btn-export-pdf">📄 Exporter PDF</button>
        <button class="btn btn-primary" id="btn-save-project">💾 Sauvegarder le projet</button>
      </div>

      ${pvResult.isEstimate ? '<p class="estimate-warning">⚠️ Données estimées (mode hors ligne). Connectez-vous pour les données PVGIS réelles.</p>' : ''}
    </div>`;
  },

  settings() {
    const projects = App.state.projects;
    return `
    <div class="view view-settings">
      <div class="view-header">
        <h2>⚙️ Paramètres & Projets</h2>
      </div>

      <section class="settings-section">
        <h3>Paramètres énergie</h3>
        <div class="form-group">
          <label>Prix kWh (€)</label>
          <input type="number" id="kwh-price" class="input-field" value="${App.state.energy.kwhPrice}" step="0.001">
        </div>
        <div class="form-group">
          <label>Tarif rachat (€/kWh)</label>
          <input type="number" id="feed-tariff" class="input-field" value="${App.state.energy.feedInTariff}" step="0.001">
        </div>
        <div class="form-group">
          <label>Consommation annuelle (kWh)</label>
          <input type="number" id="annual-conso" class="input-field" value="${App.state.energy.annualConsumption}">
        </div>
        <button class="btn btn-secondary" onclick="
          App.state.energy.kwhPrice = +document.getElementById('kwh-price').value;
          App.state.energy.feedInTariff = +document.getElementById('feed-tariff').value;
          App.state.energy.annualConsumption = +document.getElementById('annual-conso').value;
          App.saveToStorage(); UI.showToast('Paramètres enregistrés','success');
        ">Enregistrer</button>
      </section>

      <section class="settings-section">
        <h3>Mes projets (${projects.length})</h3>
        ${projects.length === 0 ? '<p class="text-muted">Aucun projet sauvegardé</p>' :
          projects.map((p, i) => `
          <div class="project-item">
            <div>
              <strong>${p.name}</strong>
              <span>${new Date(p.createdAt).toLocaleDateString('fr-FR')}</span>
              ${p.pvResult ? `<span class="project-prod">${p.pvResult.annualProduction} kWh/an</span>` : ''}
            </div>
            <button class="btn btn-ghost btn-sm" onclick="
              App.state.location=App.state.projects[${i}].location;
              App.state.surface=App.state.projects[${i}].surface;
              App.state.panel=App.state.projects[${i}].panel;
              App.state.pvResult=App.state.projects[${i}].pvResult;
              App.navigate('results');
            ">Ouvrir</button>
          </div>`).join('')
        }
      </section>

      <section class="settings-section">
        <h3>À propos</h3>
        <p>HelioSpot v1.0 — Prototype</p>
        <p>Données solaires : PVGIS (Commission Européenne)</p>
        <p>Cartographie : OpenStreetMap / Leaflet.js</p>
        <p class="text-muted">Version finale : compte cloud, export PDF, motorisation tracking, import facture énergie</p>
      </section>
    </div>`;
  }
};

// Panel presets
App.applyPreset = function(type) {
  const presets = {
    standard: { name: 'Standard 400Wc', peakPower: 400, efficiency: 20.5, width: 1.722, height: 1.134, cellType: 'monocristallin', tempCoeff: -0.35, price: 220, quantity: 1 },
    premium: { name: 'Premium HJT 500Wc', peakPower: 500, efficiency: 22.8, width: 1.762, height: 1.134, cellType: 'heterojunction', tempCoeff: -0.26, price: 380, quantity: 1 },
    budget: { name: 'Budget Poly 300Wc', peakPower: 300, efficiency: 17.5, width: 1.640, height: 1.0, cellType: 'polycristallin', tempCoeff: -0.40, price: 150, quantity: 1 }
  };
  App.state.panel = { ...App.state.panel, ...presets[type] };
  App.navigate('panel');
};

window.Views = Views;
