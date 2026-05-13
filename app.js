document.addEventListener('DOMContentLoaded', () => {
    // Initialize map centered roughly on Brooklyn
    const map = L.map('map').setView([40.63806, -73.96357], 14);

    // Add Esri Light Gray Canvas tiles
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri'
    }).addTo(map);

    const listContainer = document.getElementById('closure-list');
    const layersMap = new Map(); // id -> Leaflet layer

    // Style options for Solid Paint-on Lines
    const solidStyle = {
        color: '#d93025', // Primary red
        weight: 4,
        opacity: 1.0,
        className: 'solid-trace glowing'
    };

    // Helper function to fetch snapped route from OSRM and append custom branded polylines
    function fetchAndPlotRoute(item, latlngArray, targetLayerGroup) {
        // Convert Leaflet [lat, lng] arrays into OSRM waypoint strings: 'lng,lat;lng,lat'
        const waypoints = latlngArray.map(coord => `${coord[1]},${coord[0]}`).join(';');
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${waypoints}?overview=full&geometries=geojson`;

        fetch(osrmUrl)
            .then(response => response.json())
            .then(data => {
                if (data.routes && data.routes[0]) {
                    // Convert OSRM GeoJSON coordinates [lng, lat] back to Leaflet [lat, lng] format
                    const snappedCoords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
                    
                    // Plot solid paint-on lines following the high-fidelity street paths
                    const polyline = L.polyline(snappedCoords, solidStyle);
                    targetLayerGroup.addLayer(polyline);
                    
                    // Force active class on load to trigger paint-on animation for all segments
                    const el = polyline.getElement();
                    if (el) {
                        setTimeout(() => {
                            el.classList.add('active');
                        }, 50); // Small delay to let browser register initial state
                    }
                } else {
                    plotStraightFallback(item, latlngArray, targetLayerGroup);
                }
            })
            .catch(() => {
                plotStraightFallback(item, latlngArray, targetLayerGroup);
            });
    }

    // Fallback rendering logic if public OSRM API times out or fails
    function plotStraightFallback(item, latlngArray, targetLayerGroup) {
        const polyline = L.polyline(latlngArray, solidStyle);
        targetLayerGroup.addLayer(polyline);
        
        // Force active class on load to trigger paint-on animation for all segments
        const el = polyline.getElement();
        if (el) {
            setTimeout(() => {
                el.classList.add('active');
            }, 50);
        }
    }

    closuresData.forEach(item => {
        // Initialize an empty Feature Group to hold the dynamically generated routing paths
        const closureLayer = L.featureGroup().addTo(map);
        
        // Check if the segment data defines multiple disconnected paths (like item 2)
        if (Array.isArray(item.latlngs[0][0])) {
            item.latlngs.forEach(subPath => {
                fetchAndPlotRoute(item, subPath, closureLayer);
            });
        } else {
            fetchAndPlotRoute(item, item.latlngs, closureLayer);
        }
        
        // Build popup content
        const popupContent = `
            <div class="dark-alert-card">
                <span class="alert-time">${formatShortTime(item.startMin)}–${formatShortTime(item.endMin)}</span>
                <span class="alert-street">${item.street}</span>
                <span class="alert-meta">No Parking: ${item.noParking
                    .replace(/Friday, May 15/g, 'Fri')
                    .replace(/Saturday, May 16/g, 'Sat')
                    .replace(/Thursday, May 14/g, 'Thu')
                    .replace(/Sunday, May 17/g, 'Sun')
                    .replace(/:00\s*/g, '')
                    .replace(/ AM/g, 'am')
                    .replace(/ PM/g, 'pm')
                    .replace(/AM/g, 'am')
                    .replace(/PM/g, 'pm')}</span>
            </div>
        `;
        closureLayer.bindPopup(popupContent);

        // Store layer reference
        layersMap.set(item.id, closureLayer);

        // Create sidebar list item
        const li = document.createElement('li');
        li.dataset.id = item.id;
        li.innerHTML = `
            <h3>${item.street}</h3>
            <p>${item.segment}</p>
        `;

        // Click event for list item
        li.addEventListener('click', () => {
            document.querySelectorAll('#closure-list li').forEach(el => el.classList.remove('active'));
            li.classList.add('active');

            // Ensure routing boundaries have loaded successfully before panning camera
            const bounds = closureLayer.getBounds();
            if (bounds.isValid()) {
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
            }
            
            setTimeout(() => {
                closureLayer.openPopup();
            }, 300);
        });

        listContainer.appendChild(li);
    });

    // Initial view hardcoded to center on user selection; dynamic fitBounds removed.

    // Time Slider Logic
    const slider = document.getElementById('time-slider');
    const timeDisplay = document.getElementById('time-display');

    function formatTime(minutes) {
        let adjustedMins = minutes;
        let daySuffix = '';
        
        if (minutes < 0) {
            adjustedMins = minutes + 24 * 60; // Shift to positive range of previous day
            daySuffix = ' (Fri)';
        }
        
        const hours = Math.floor(adjustedMins / 60);
        const mins = adjustedMins % 60;
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        const displayMins = mins < 10 ? `0${mins}` : mins;
        return `${displayHours}:${displayMins} ${ampm}${daySuffix}`;
    }

    function formatShortTime(minutes) {
        let adjustedMins = minutes;
        if (minutes < 0) adjustedMins = minutes + 24 * 60;
        
        const hours = Math.floor(adjustedMins / 60);
        const mins = adjustedMins % 60;
        const ampm = hours >= 12 ? 'pm' : 'am';
        const displayHours = hours % 12 || 12;
        
        const timeStr = mins === 0 ? `${displayHours}` : `${displayHours}:${mins < 10 ? '0'+mins : mins}`;
        return `${timeStr}${ampm}`;
    }

    function updateFilter(currentMin) {
        console.log(`Filtering for time: ${formatTime(currentMin)} (${currentMin} mins)`);
        timeDisplay.textContent = formatTime(currentMin);

        closuresData.forEach(item => {
            const layer = layersMap.get(item.id);
            const li = document.querySelector(`#closure-list li[data-id="${item.id}"]`);

            const isActive = currentMin >= item.startMin && currentMin <= item.endMin;

            // Toggle active class on the SVG path elements for transitions
            layer.eachLayer(l => {
                const el = l.getElement();
                if (el) {
                    if (isActive) {
                        el.classList.add('active');
                    } else {
                        el.classList.remove('active');
                    }
                }
            });
            
            if (li) {
                if (isActive) {
                    li.style.opacity = '1';
                    li.style.pointerEvents = 'auto';
                } else {
                    li.style.opacity = '0.3';
                    li.style.pointerEvents = 'none';
                }
            }
        });
    }

    slider.addEventListener('input', (e) => {
        console.log("Slider raw value:", e.target.value);
        updateFilter(parseInt(e.target.value, 10));
    });

    // Run initial filter based on default slider value AFTER intro animation completes
    setTimeout(() => {
        updateFilter(parseInt(slider.value, 10));
    }, 6000);


    // ==========================================
    // Option 1: Route Particle Swarm Integration
    // ==========================================

    // Custom Leaflet Canvas Overlay Layer
    const RunnerCanvasOverlay = L.Layer.extend({
        onAdd: function(map) {
            this._map = map;
            this._canvas = L.DomUtil.create('canvas', 'leaflet-runner-overlay');
            this._canvas.style.position = 'absolute';
            this._canvas.style.top = 0;
            this._canvas.style.left = 0;
            this._canvas.style.pointerEvents = 'none';
            // Mount canvas into a dedicated high z-index map pane to guarantee absolute top stacking order above course ribbons and road closure paths
            map.createPane('runnerSwarmPane');
            map.getPanes().runnerSwarmPane.style.zIndex = 650;
            map.getPanes().runnerSwarmPane.style.pointerEvents = 'none';
            map.getPanes().runnerSwarmPane.appendChild(this._canvas);
            
            map.on('moveend', this._reset, this);
            map.on('resize', this._reset, this);
            
            this._reset();
        },
        onRemove: function(map) {
            map.getPanes().runnerSwarmPane.removeChild(this._canvas);
            map.off('moveend', this._reset, this);
            map.off('resize', this._reset, this);
        },
        _reset: function() {
            const size = this._map.getSize();
            this._canvas.width = size.x;
            this._canvas.height = size.y;
            
            const topLeft = this._map.containerPointToLayerPoint([0, 0]);
            L.DomUtil.setPosition(this._canvas, topLeft);
        },
        getCanvas: function() {
            return this._canvas;
        }
    });

    // Precompute cumulative distance array scaled exactly to 13.1 miles
    function computeCourseMetrics(coords) {
        function getDist(lat1, lon1, lat2, lon2) {
            const R = 3958.8;
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
                      Math.sin(dLon/2) * Math.sin(dLon/2); 
            return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
        }
        
        let cumDist = [0];
        let total = 0;
        for (let i = 1; i < coords.length; i++) {
            total += getDist(coords[i-1][0], coords[i-1][1], coords[i][0], coords[i][1]);
            cumDist.push(total);
        }
        
        const scale = 13.1 / total;
        for (let i = 0; i < cumDist.length; i++) cumDist[i] *= scale;
        
        return { cumDist, totalDist: 13.1 };
    }

    // Extracts point, forward travel, and right-pointing perpendicular normals
    function getRouteStateAtDistance(dist, coords, cumDist) {
        if (dist <= 0) return { pt: coords[0], forward: [0,0], normal: [0,0] };
        if (dist >= 13.1) return { pt: coords[coords.length - 1], forward: [0,0], normal: [0,0] };
        for (let i = 0; i < cumDist.length - 1; i++) {
            if (dist >= cumDist[i] && dist <= cumDist[i+1]) {
                const f = (dist - cumDist[i]) / (cumDist[i+1] - cumDist[i]);
                const p1 = coords[i];
                const p2 = coords[i+1];
                const pt = [p1[0] + f * (p2[0] - p1[0]), p1[1] + f * (p2[1] - p1[1])];
                let dLat = p2[0] - p1[0];
                let dLng = p2[1] - p1[1];
                const len = Math.sqrt(dLat*dLat + dLng*dLng);
                if (len > 0) { dLat /= len; dLng /= len; }
                return { pt, forward: [dLat, dLng], normal: [-dLng, dLat] };
            }
        }
        return { pt: coords[coords.length - 1], forward: [0,0], normal: [0,0] };
    }

    // Lightweight compatibility wrapper to resolve legacy marker coordinate queries seamlessly
    function getPointAtDistance(dist, coords, cumDist) {
        return getRouteStateAtDistance(dist, coords, cumDist).pt;
    }

    function parseRunnerTime(timeStr) {
        if (!timeStr) return 0;
        const p = timeStr.split(':').map(Number);
        if (p.length === 3) return p[0] * 60 + p[1] + p[2] / 60;
        if (p.length === 2) return p[0] + p[1] / 60;
        return 0;
    }

    let courseCoords = [];
    let courseCumDist = [];
    let swarmRunners = [];
    let isSwarmInitialized = false;

    // Highly detailed precompiled coordinate geometry fallback tracing the literal physical path described for the runners
    const fallbackRoute = [
        // Mile 1: Start Washington Ave heading south
        [40.6712, -73.9628], [40.6680, -73.9620], [40.6645, -73.9615],
        // Turn right onto Empire Blvd
        [40.6630, -73.9610],
        // Turn right onto Flatbush Ave heading north to Grand Army Plaza (Mile 1.5)
        [40.6680, -73.9650], [40.6728, -73.9701],
        // Mile 2: Proceed around Grand Army Plaza heading south on Flatbush Ave
        [40.6680, -73.9650], [40.6630, -73.9610],
        // Mile 3: Turn right onto Ocean Ave, then right onto Parkside Ave
        [40.6590, -73.9612], [40.6560, -73.9615], [40.6545, -73.9662], [40.6530, -73.9710],
        // Mile 4: Enter Prospect Park at Machate Circle onto East Drive
        [40.6560, -73.9670], [40.6600, -73.9650], [40.6650, -73.9655], [40.6700, -73.9680],
        // Miles 5-6: Counter-clockwise loop exiting onto Prospect Park Southwest to Machate Circle
        [40.6660, -73.9730], [40.6600, -73.9750], [40.6550, -73.9740], [40.6530, -73.9710],
        // Mile 7: Head south down Fort Hamilton Parkway onto Ocean Parkway
        // Miles 8-12: Proceed onto Ocean Parkway heading south toward Coney Island
        [40.6400, -73.9700], [40.6200, -73.9690], [40.6000, -73.9680], [40.5840, -73.9670], [40.5760, -73.9700],
        // Mile 13-Finish: Turn right onto Surf Ave, left onto W 10th Street, up ramp to Boardwalk heading right (west)
        [40.5755, -73.9740], [40.5750, -73.9780], [40.5730, -73.9775], [40.5725, -73.9800]
    ];

    const overlayLayer = new RunnerCanvasOverlay();
    map.addLayer(overlayLayer);

    async function mountRunnerSwarm() {
        try {
            // Mapping literal physical course description: Washington Ave -> Empire Blvd -> Flatbush Ave -> Grand Army Plaza loop -> Ocean Ave -> Parkside Ave -> Prospect Park Loop -> Ocean Parkway -> Surf Ave -> W 10th St -> Boardwalk
            const wpStr = "-73.9628,40.6712;-73.9615,40.6645;-73.9610,40.6630;-73.9701,40.6728;-73.9610,40.6630;-73.9615,40.6560;-73.9710,40.6530;-73.9650,40.6620;-73.9680,40.6700;-73.9750,40.6600;-73.9710,40.6530;-73.9670,40.5840;-73.9700,40.5760;-73.9780,40.5750;-73.9775,40.5730;-73.9800,40.5725";
            // Use OSRM cycling profile to natively route on car-free Prospect Park internal loop drives without triggering motor vehicle restriction detours
            const osrmUrl = `https://router.project-osrm.org/route/v1/cycling/${wpStr}?overview=full&geometries=geojson`;
            
            const routeRes = await fetch(osrmUrl);
            const routeData = await routeRes.json();
            
            if (routeData.routes && routeData.routes[0]) {
                courseCoords = routeData.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
            } else {
                courseCoords = fallbackRoute;
            }
        } catch (e) {
            courseCoords = fallbackRoute;
        }

        const metrics = computeCourseMetrics(courseCoords);
        courseCumDist = metrics.cumDist;

        // ==========================================
        // Race Course Ribbon Integration
        // ==========================================
        const courseRibbonGroup = L.featureGroup().addTo(map);

        // Create dedicated custom map pane to guarantee bottom-layer vector stacking order
        // Places course ribbon beneath default road closures (overlayPane zIndex 400) but above base tiles (200)
        map.createPane('courseRibbonPane');
        map.getPanes().courseRibbonPane.style.zIndex = 350;

        // Layer 1: Render ambient outer path base glow
        L.polyline(courseCoords, {
            color: '#002b49', weight: 9, opacity: 0.25, lineCap: 'round', lineJoin: 'round', pane: 'courseRibbonPane'
        }).addTo(courseRibbonGroup);

        // Layer 2: Render high-contrast inner course core
        L.polyline(courseCoords, {
            color: '#ffffff', weight: 4, opacity: 1.0, lineCap: 'round', lineJoin: 'round', pane: 'courseRibbonPane'
        }).addTo(courseRibbonGroup);

        // Inject custom CSS formatting for start/finish flags using null iconSize to prevent container text overflow clipping
        const startIcon = L.divIcon({
            className: '', 
            html: '<div style="background: #FDB813; color: #0B1B3D; padding: 4px 10px; border-radius: 4px; font-weight: 900; font-size: 0.75rem; border: 2px solid #0B1B3D; text-transform: uppercase; font-family: sans-serif; white-space: nowrap; display: inline-block; transform: translate(-50%, -50%);">Start</div>', 
            iconSize: null
        });
        const finishIcon = L.divIcon({
            className: '', 
            html: '<div style="background: #FDB813; color: #0B1B3D; padding: 4px 10px; border-radius: 4px; font-weight: 900; font-size: 0.75rem; border: 2px solid #0B1B3D; text-transform: uppercase; font-family: sans-serif; white-space: nowrap; display: inline-block; transform: translate(-50%, -50%);">Finish</div>', 
            iconSize: null
        });
        L.marker(getPointAtDistance(0, courseCoords, courseCumDist), { icon: startIcon }).addTo(courseRibbonGroup);
        L.marker(getPointAtDistance(13.1, courseCoords, courseCumDist), { icon: finishIcon }).addTo(courseRibbonGroup);

        // Render exact intermediate physical Mile Markers (M1 to M13) dynamically sized to content
        for (let m = 1; m <= 13; m++) {
            const pt = getPointAtDistance(m, courseCoords, courseCumDist);
            const mIcon = L.divIcon({
                className: '', 
                html: `<div style="background: #0B1B3D; color: #FDB813; padding: 3px 8px; border-radius: 4px; font-weight: 900; font-size: 0.7rem; border: 1px solid #FDB813; text-align: center; font-family: sans-serif; white-space: nowrap; display: inline-block; transform: translate(-50%, -50%);">M${m}</div>`, 
                iconSize: null
            });
            L.marker(pt, { icon: mIcon }).addTo(courseRibbonGroup);
        }

        // Box-Muller transform to map uniform variables to a Gaussian normal distribution
        function getGaussianRandom() {
            let u = 0, v = 0;
            while(u === 0) u = Math.random();
            while(v === 0) v = Math.random();
            return Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
        }

        try {
            const resRes = await fetch('brooklyn_half_2025_results.json');
            const results = await resRes.json();
            
            // Completely remove sub-sampling to simulate ALL 20,000+ runner nodes natively
            for (let i = 0; i < results.length; i++) {
                const mins = parseRunnerTime(results[i].overallTime);
                if (mins > 0) {
                    swarmRunners.push({
                        speed: 13.1 / mins,
                        // Align property names and Gaussian reference scaling directly with swarm_tuner.html blueprint syncs
                        scatterX: getGaussianRandom() * 0.25,
                        scatterY: getGaussianRandom() * 0.25
                    });
                }
            }
        } catch (e) {
            console.error("Could not load results file directly. Injecting statistical simulation...", e);
            // Generate dense 25,000 node pack for reliable offline fallback scaling
            for (let i = 0; i < 25000; i++) {
                const finishMins = Math.max(65, 130 + (Math.random() + Math.random() + Math.random() - 1.5) * 40);
                swarmRunners.push({
                    speed: 13.1 / finishMins,
                    scatterX: getGaussianRandom() * 0.25,
                    scatterY: getGaussianRandom() * 0.25
                });
            }
        }

        isSwarmInitialized = true;
        


        requestAnimationFrame(renderLoop);
    }

    function renderLoop() {
        if (isSwarmInitialized && overlayLayer.getCanvas()) {
            const canvas = overlayLayer.getCanvas();
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const currentSliderMin = parseInt(slider.value, 10);
            const raceElapsedMins = currentSliderMin - 420; // 7:00 AM base

            if (raceElapsedMins > 0) {
                ctx.fillStyle = 'rgba(253, 184, 19, 1)';
                // Shadow rendering disabled for optimized execution speed
                const topLeft = map.containerPointToLayerPoint([0, 0]);

                const scatterFactor = 0.0015000;
                const laneBias = 0.15;
                const tailLength = 16;

                // Dynamic Sizing calculation
                const currentZoom = map.getZoom();
                const activeNodeSize = Math.max(0.5, 1.0 * Math.pow(1.8, currentZoom - 13));
                const rRadius = activeNodeSize / 2;

                for (let i = 0; i < swarmRunners.length; i++) {
                    const r = swarmRunners[i];
                    const dist = r.speed * raceElapsedMins;

                    if (dist > 0 && dist <= 13.1) {
                        const state = getRouteStateAtDistance(dist, courseCoords, courseCumDist);
                        
                        // Project along right-pointing Perpendicular Normal Vector to keep lanes crisp
                        const compositeScatter = (r.scatterX + laneBias) * scatterFactor;
                        const lat = state.pt[0] + state.normal[0] * compositeScatter;
                        const lng = state.pt[1] + state.normal[1] * compositeScatter;

                        const layerPt = map.latLngToLayerPoint([lat, lng]);
                        const pixelX = layerPt.x - topLeft.x;
                        const pixelY = layerPt.y - topLeft.y;

                        if (pixelX >= -10 && pixelX <= canvas.width + 10 &&
                            pixelY >= -10 && pixelY <= canvas.height + 10) {
                            
                            // Draw Comet Tails pointing backwards along forward travel to visually unbunch bidirectional traffic
                            // Project forward coordinate to evaluate pixel velocity angles cleanly
                            const fLat = lat + state.forward[0] * 0.0002;
                            const fLng = lng + state.forward[1] * 0.0002;
                            const fPixel = map.latLngToLayerPoint([fLat, fLng]);
                            let pdx = fPixel.x - layerPt.x;
                            let pdy = fPixel.y - layerPt.y;
                            const plen = Math.sqrt(pdx*pdx + pdy*pdy);
                            if (plen > 0) { pdx /= plen; pdy /= plen; }

                            // Render pure velocity line tail
                            ctx.beginPath();
                            ctx.strokeStyle = 'rgba(253, 184, 19, 0.4)';
                            ctx.lineWidth = activeNodeSize;
                            ctx.moveTo(pixelX, pixelY);
                            ctx.lineTo(pixelX - pdx * tailLength, pixelY - pdy * tailLength);
                            ctx.stroke();

                            // Render vibrant leading core dot
                            ctx.beginPath();
                            ctx.fillStyle = '#FDB813';
                            ctx.arc(pixelX, pixelY, rRadius, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    }
                }
            }
        }
        requestAnimationFrame(renderLoop);
    }

    mountRunnerSwarm();

    // ==========================================
    // Mobile Bottom Sheet Drawer Logic
    // ==========================================
    const sidebar = document.getElementById('sidebar');
    const sidebarHeader = sidebar.querySelector('header');
    
    let startY = 0;
    let currentY = 0;
    let initialHeight = 0;
    let isDragging = false;

    function getSnapHeights() {
        const vh = window.innerHeight;
        return {
            collapsed: sidebarHeader.offsetHeight + 10, // Almost hidden, just header visible
            default: vh * 0.25,                         // 25vh base allocation
            expanded: vh * 0.90                         // Expanded to full screen
        };
    }

    function onTouchStart(e) {
        if (window.innerWidth > 768) return;
        
        // Prevent drawer swipe logic from stealing focus when interacting with the time slider
        if (e.target.closest('.slider-container')) return;
        
        startY = e.touches ? e.touches[0].clientY : e.clientY;
        currentY = startY;
        initialHeight = sidebar.offsetHeight;
        isDragging = true;
        sidebar.classList.add('dragging');
    }

    function onTouchMove(e) {
        if (!isDragging) return;
        
        currentY = e.touches ? e.touches[0].clientY : e.clientY;
        const deltaY = startY - currentY; 
        const newHeight = initialHeight + deltaY;
        
        const vh = window.innerHeight;
        const minH = sidebarHeader.offsetHeight;
        const maxH = vh * 0.95;
        
        if (newHeight >= minH && newHeight <= maxH) {
            sidebar.style.height = `${newHeight}px`;
        }
        
        if (e.cancelable) {
            e.preventDefault();
        }
    }

    function onTouchEnd() {
        if (!isDragging) return;
        isDragging = false;
        sidebar.classList.remove('dragging');
        
        const finalHeight = sidebar.offsetHeight;
        const snaps = getSnapHeights();
        
        const distCollapsed = Math.abs(finalHeight - snaps.collapsed);
        const distDefault = Math.abs(finalHeight - snaps.default);
        const distExpanded = Math.abs(finalHeight - snaps.expanded);
        
        let targetHeight = snaps.default;
        
        // Snap based on proximity
        if (distCollapsed < distDefault && distCollapsed < distExpanded) {
            targetHeight = snaps.collapsed;
        } else if (distExpanded < distDefault && distExpanded < distCollapsed) {
            targetHeight = snaps.expanded;
        }
        
        // Override if deliberate fast swipe distance was achieved
        const totalDelta = startY - currentY;
        if (Math.abs(totalDelta) > 40) {
            if (totalDelta > 40) {
                // Swiped Up
                targetHeight = finalHeight > snaps.default ? snaps.expanded : snaps.default;
            } else {
                // Swiped Down
                targetHeight = finalHeight < snaps.default ? snaps.collapsed : snaps.default;
            }
        }
        
        sidebar.style.height = `${targetHeight}px`;
        
        setTimeout(() => {
            map.invalidateSize();
        }, 350);
    }

    sidebarHeader.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    
    sidebarHeader.addEventListener('mousedown', onTouchStart);
    window.addEventListener('mousemove', onTouchMove);
    window.addEventListener('mouseup', onTouchEnd);

    // ==========================================
    // Mobile Collapsible Legend Binding
    // ==========================================
    const mapLegend = document.getElementById('map-legend');
    if (mapLegend) {
        const legendHeader = mapLegend.querySelector('h4');
        if (legendHeader) {
            legendHeader.addEventListener('click', () => {
                mapLegend.classList.toggle('collapsed');
            });
        }
    }
});
