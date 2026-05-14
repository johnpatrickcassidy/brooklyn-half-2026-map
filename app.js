document.addEventListener('DOMContentLoaded', async () => {
    await google.maps.importLibrary("maps");
    const { Map: GoogleMap, Polyline, InfoWindow, OverlayView, LatLng, LatLngBounds } = google.maps;

    class StreetDetailsOverlay extends OverlayView {
        constructor() {
            super();
            this.latLng = null;
            this.contentHtml = '';
            this.container = document.createElement('div');
            this.container.className = 'custom-street-overlay-container';
            this.container.style.position = 'absolute';
            this.container.style.pointerEvents = 'auto';
            
            // Close overlay when close button is clicked
            this.container.addEventListener('click', (e) => {
                if (e.target.classList.contains('overlay-close-btn')) {
                    this.close();
                }
            });
        }
        onAdd() {
            const panes = this.getPanes();
            if (panes && panes.overlayMouseTarget) {
                panes.overlayMouseTarget.appendChild(this.container);
            }
        }
        draw() {
            const projection = this.getProjection();
            if (!projection || !this.latLng) return;
            const point = projection.fromLatLngToDivPixel(this.latLng);
            if (point) {
                this.container.style.left = point.x + 'px';
                this.container.style.top = point.y + 'px';
            }
        }
        onRemove() {
            if (this.container.parentNode) {
                this.container.parentNode.removeChild(this.container);
            }
        }
        setContent(html) {
            this.contentHtml = html;
            this.container.innerHTML = html;
        }
        setPosition(latLng) {
            this.latLng = latLng;
            this.draw();
        }
        open(map) {
            this.setMap(map);
            // Redraw immediately to prevent flickering
            setTimeout(() => this.draw(), 0);
        }
        close() {
            this.setMap(null);
        }
    }

    // Persistent Onboarding Display Logic
    const onboardingCompleted = localStorage.getItem('onboarding-completed') === 'true';
    if (!onboardingCompleted) {
        // Defer initialization slightly to allow full page rendering
        setTimeout(() => {
            if (typeof initOnboarding === 'function') {
                initOnboarding();
            }
        }, 200);
    }

    const lightGrayStyle = [
        { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
        { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
        { featureType: "administrative.land_parcel", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
        { featureType: "poi", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
        { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
        { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#e5e5e5" }] },
        { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
        { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
        { featureType: "road.arterial", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
        { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#dadada" }] },
        { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
        { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
        { featureType: "transit.line", elementType: "geometry", stylers: [{ color: "#e5e5e5" }] },
        { featureType: "transit.station", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
        { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9c9c9" }] },
        { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] }
    ];

    const map = new GoogleMap(document.getElementById('map'), {
        center: { lat: 40.63806, lng: -73.96357 },
        zoom: 14,
        styles: lightGrayStyle,
        mapTypeControl: false,
        streetViewControl: false,
        gestureHandling: 'greedy'
    });

    const listContainer = document.getElementById('closure-list');
    const layersMap = new Map(); // id -> { polylines: [], content: string }
    const sharedInfoWindow = new StreetDetailsOverlay();

    // Style options for Solid Lines
    const solidStyle = {
        strokeColor: '#d93025',
        strokeWeight: 4,
        strokeOpacity: 1.0,
        zIndex: 2
    };

    function fetchAndPlotRoute(item, latlngArray, targetPolylinesArray) {
        const waypoints = latlngArray.map(coord => `${coord[1]},${coord[0]}`).join(';');
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${waypoints}?overview=full&geometries=geojson`;

        fetch(osrmUrl)
            .then(response => response.json())
            .then(data => {
                if (data.routes && data.routes[0]) {
                    const path = data.routes[0].geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] }));
                    const polyline = new Polyline({
                        path: path,
                        ...solidStyle,
                        map: map
                    });
                    polyline.addListener('click', (e) => {
                        sharedInfoWindow.setContent(layersMap.get(item.id).content);
                        sharedInfoWindow.setPosition(e.latLng);
                        sharedInfoWindow.open(map);
                    });
                    targetPolylinesArray.push(polyline);
                } else {
                    plotStraightFallback(item, latlngArray, targetPolylinesArray);
                }
            })
            .catch(() => {
                plotStraightFallback(item, latlngArray, targetPolylinesArray);
            });
    }

    function plotStraightFallback(item, latlngArray, targetPolylinesArray) {
        const path = latlngArray.map(c => ({ lat: c[0], lng: c[1] }));
        const polyline = new Polyline({
            path: path,
            ...solidStyle,
            map: map
        });
        polyline.addListener('click', (e) => {
            sharedInfoWindow.setContent(layersMap.get(item.id).content);
            sharedInfoWindow.setPosition(e.latLng);
            sharedInfoWindow.open(map);
        });
        targetPolylinesArray.push(polyline);
    }

    closuresData.forEach(item => {
        const itemPolylines = [];
        
        if (item.id === 8) {
            // Force straight fallback for Ocean Parkway to avoid OSRM veering to Coney Island Ave
            if (Array.isArray(item.latlngs[0][0])) {
                item.latlngs.forEach(subPath => {
                    plotStraightFallback(item, subPath, itemPolylines);
                });
            } else {
                plotStraightFallback(item, item.latlngs, itemPolylines);
            }
        } else {
            if (Array.isArray(item.latlngs[0][0])) {
                item.latlngs.forEach(subPath => {
                    fetchAndPlotRoute(item, subPath, itemPolylines);
                });
            } else {
                fetchAndPlotRoute(item, item.latlngs, itemPolylines);
            }
        }
        
        const popupContent = `
            <div class="dark-alert-card">
                <button class="overlay-close-btn">&times;</button>
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

        layersMap.set(item.id, { polylines: itemPolylines, content: popupContent });

        const li = document.createElement('li');
        li.dataset.id = item.id;
        li.innerHTML = `
            <h3>${item.street}</h3>
            <p>${item.segment}</p>
        `;

        li.addEventListener('click', () => {
            document.querySelectorAll('#closure-list li').forEach(el => el.classList.remove('active'));
            li.classList.add('active');

            const bounds = new LatLngBounds();
            let hasPoints = false;
            itemPolylines.forEach(poly => {
                poly.getPath().forEach(latLng => {
                    bounds.extend(latLng);
                    hasPoints = true;
                });
            });

            if (hasPoints) {
                map.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 });
                sharedInfoWindow.setContent(popupContent);
                sharedInfoWindow.setPosition(bounds.getCenter());
                sharedInfoWindow.open(map);
            }
        });

        listContainer.appendChild(li);
    });

    // Time Slider Logic
    const slider = document.getElementById('time-slider');
    const timeDisplay = document.getElementById('time-display');

    function formatTime(minutes) {
        let adjustedMins = minutes;
        let daySuffix = '';
        
        if (minutes < 0) {
            adjustedMins = minutes + 24 * 60;
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
            const layerData = layersMap.get(item.id);
            const li = document.querySelector(`#closure-list li[data-id="${item.id}"]`);
            const isActive = currentMin >= item.startMin && currentMin <= item.endMin;

            if (layerData && layerData.polylines) {
                layerData.polylines.forEach(poly => {
                    poly.setMap(isActive ? map : null);
                });
            }
            
            if (li) {
                li.style.opacity = isActive ? '1' : '0.3';
                li.style.pointerEvents = isActive ? 'auto' : 'none';
            }
        });
    }

    slider.addEventListener('input', (e) => {
        updateFilter(parseInt(e.target.value, 10));
    });

    setTimeout(() => {
        updateFilter(parseInt(slider.value, 10));
    }, 6000);


    // ==========================================
    // Option 1: Route Particle Swarm Integration
    // ==========================================

    class HTMLMarker extends OverlayView {
        constructor(latLng, element, paneName = 'overlayMouseTarget') {
            super();
            this.latLng = latLng;
            this.element = element;
            this.element.style.position = 'absolute';
            this.element.style.transform = 'translate(-50%, -50%)';
            this.paneName = paneName;
        }
        onAdd() {
            const panes = this.getPanes();
            if (panes && panes[this.paneName]) {
                panes[this.paneName].appendChild(this.element);
            }
        }
        draw() {
            const projection = this.getProjection();
            if (!projection) return;
            const pos = projection.fromLatLngToDivPixel(this.latLng);
            if (pos) {
                this.element.style.left = pos.x + 'px';
                this.element.style.top = pos.y + 'px';
            }
        }
        onRemove() {
            if (this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }
        }
    }

    class RunnerCanvasOverlay extends OverlayView {
        constructor() {
            super();
            this._canvas = document.createElement('canvas');
            this._canvas.style.position = 'absolute';
            this._canvas.style.top = 0;
            this._canvas.style.left = 0;
            this._canvas.style.pointerEvents = 'none';
        }
        onAdd() {
            const panes = this.getPanes();
            panes.overlayLayer.appendChild(this._canvas);
        }
        onRemove() {
            if (this._canvas.parentNode) {
                this._canvas.parentNode.removeChild(this._canvas);
            }
        }
        draw() {
            const mapDiv = this.getMap().getDiv();
            if (this._canvas.width !== mapDiv.offsetWidth || this._canvas.height !== mapDiv.offsetHeight) {
                this._canvas.width = mapDiv.offsetWidth;
                this._canvas.height = mapDiv.offsetHeight;
            }
        }
        getCanvas() {
            return this._canvas;
        }
    }

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

    const overlayLayer = new RunnerCanvasOverlay();
    overlayLayer.setMap(map);

    async function mountRunnerSwarm() {
        // Bypass OSRM fetch as it is unreliable and erroneously routes Ocean Parkway down Coney Island Ave
        courseCoords = raceCourseRoute;

        const metrics = computeCourseMetrics(courseCoords);
        courseCumDist = metrics.cumDist;

        // Race Course Ribbon
        const gMapsPath = courseCoords.map(c => ({ lat: c[0], lng: c[1] }));

        // Outer glow
        new Polyline({
            path: gMapsPath,
            strokeColor: '#002b49',
            strokeWeight: 9,
            strokeOpacity: 0.25,
            zIndex: 1,
            map: map
        });

        // Inner core
        new Polyline({
            path: gMapsPath,
            strokeColor: '#ffffff',
            strokeWeight: 4,
            strokeOpacity: 1.0,
            zIndex: 1,
            map: map
        });

        // Start Flag
        const startDiv = document.createElement('div');
        startDiv.style.cssText = 'background: #FDB813; color: #0B1B3D; padding: 4px 10px; border-radius: 4px; font-weight: 900; font-size: 0.75rem; border: 2px solid #0B1B3D; text-transform: uppercase; font-family: sans-serif; white-space: nowrap;';
        startDiv.textContent = 'Start';
        const startPt = getPointAtDistance(0, courseCoords, courseCumDist);
        const startMarker = new HTMLMarker(new LatLng(startPt[0], startPt[1]), startDiv);
        startMarker.setMap(map);

        // Finish Flag
        const finishDiv = document.createElement('div');
        finishDiv.style.cssText = 'background: #FDB813; color: #0B1B3D; padding: 4px 10px; border-radius: 4px; font-weight: 900; font-size: 0.75rem; border: 2px solid #0B1B3D; text-transform: uppercase; font-family: sans-serif; white-space: nowrap;';
        finishDiv.textContent = 'Finish';
        const finishPt = getPointAtDistance(13.1, courseCoords, courseCumDist);
        const finishMarker = new HTMLMarker(new LatLng(finishPt[0], finishPt[1]), finishDiv);
        finishMarker.setMap(map);

        // Mile Markers
        for (let m = 1; m <= 13; m++) {
            const pt = getPointAtDistance(m, courseCoords, courseCumDist);
            const mDiv = document.createElement('div');
            mDiv.style.cssText = 'background: #0B1B3D; color: #FDB813; padding: 3px 8px; border-radius: 4px; font-weight: 900; font-size: 0.7rem; border: 1px solid #FDB813; text-align: center; font-family: sans-serif; white-space: nowrap;';
            mDiv.textContent = `Mile ${m}`;
            const mileMarker = new HTMLMarker(new LatLng(pt[0], pt[1]), mDiv);
            mileMarker.setMap(map);
        }

        function getGaussianRandom() {
            let u = 0, v = 0;
            while(u === 0) u = Math.random();
            while(v === 0) v = Math.random();
            return Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
        }

        try {
            const resRes = await fetch('brooklyn_half_2025_results.json');
            const results = await resRes.json();
            for (let i = 0; i < results.length; i++) {
                const mins = parseRunnerTime(results[i].overallTime);
                if (mins > 0) {
                    swarmRunners.push({ speed: 13.1 / mins, scatterX: getGaussianRandom() * 0.25, scatterY: getGaussianRandom() * 0.25 });
                }
            }
        } catch (e) {
            for (let i = 0; i < 27000; i++) {
                const finishMins = Math.max(65, 130 + getGaussianRandom() * 30);
                swarmRunners.push({ speed: 13.1 / finishMins, scatterX: getGaussianRandom() * 0.25, scatterY: getGaussianRandom() * 0.25 });
            }
        }

        // Continuous Flow Parameters
        const numWaves = 4;
        const waveInterval = 30;
        const waveSpread = 30;

        // Sort runners by speed descending (fastest first)
        swarmRunners.sort((a, b) => b.speed - a.speed);

        const numRunners = swarmRunners.length;
        const quarter = Math.floor(numRunners / numWaves);
        
        for (let i = 0; i < numRunners; i++) {
            const waveIndex = Math.floor(i / quarter);
            const baseDelay = waveIndex * waveInterval;
            
            // Implement the "uniform" release crossing distribution:
            const crossingDelay = Math.random() * waveSpread;
            
            swarmRunners[i].waveDelay = baseDelay + crossingDelay;
        }

        isSwarmInitialized = true;
        requestAnimationFrame(renderLoop);
    }

    function renderLoop() {
        if (isSwarmInitialized && overlayLayer.getCanvas()) {
            const projection = overlayLayer.getProjection();
            if (!projection) {
                requestAnimationFrame(renderLoop);
                return;
            }

            const canvas = overlayLayer.getCanvas();
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const mapDiv = map.getDiv();
            if (canvas.width !== mapDiv.offsetWidth || canvas.height !== mapDiv.offsetHeight) {
                canvas.width = mapDiv.offsetWidth;
                canvas.height = mapDiv.offsetHeight;
            }

            const bounds = map.getBounds();
            if (!bounds) {
                requestAnimationFrame(renderLoop);
                return;
            }
            const northWest = new LatLng(bounds.getNorthEast().lat(), bounds.getSouthWest().lng());
            const topLeft = projection.fromLatLngToDivPixel(northWest);
            
            canvas.style.left = topLeft.x + 'px';
            canvas.style.top = topLeft.y + 'px';

            const currentSliderMin = parseInt(slider.value, 10);
            const raceElapsedMins = currentSliderMin - 420;

            if (raceElapsedMins > 0) {
                ctx.fillStyle = 'rgba(253, 184, 19, 1)';
                const scatterFactor = 0.0015;
                const laneBias = 0.15;
                const tailLength = 16;
                const currentZoom = map.getZoom();
                const activeNodeSize = Math.max(0.5, 1.0 * Math.pow(1.8, currentZoom - 13));
                const rRadius = activeNodeSize / 2;

                for (let i = 0; i < swarmRunners.length; i++) {
                    const r = swarmRunners[i];
                    const runnerElapsedMins = raceElapsedMins - r.waveDelay;

                    if (runnerElapsedMins >= 0) {
                        const dist = r.speed * runnerElapsedMins;

                        if (dist > 0 && dist <= 13.1) {
                            const state = getRouteStateAtDistance(dist, courseCoords, courseCumDist);
                            const compositeScatter = (r.scatterX + laneBias) * scatterFactor;
                            const lat = state.pt[0] + state.normal[0] * compositeScatter;
                            const lng = state.pt[1] + state.normal[1] * compositeScatter;

                            const layerPt = projection.fromLatLngToDivPixel(new LatLng(lat, lng));
                            const pixelX = layerPt.x - topLeft.x;
                            const pixelY = layerPt.y - topLeft.y;

                            if (pixelX >= -10 && pixelX <= canvas.width + 10 &&
                                pixelY >= -10 && pixelY <= canvas.height + 10) {
                                
                                const fLat = lat + state.forward[0] * 0.0002;
                                const fLng = lng + state.forward[1] * 0.0002;
                                const fPixel = projection.fromLatLngToDivPixel(new LatLng(fLat, fLng));
                                let pdx = fPixel.x - layerPt.x;
                                let pdy = fPixel.y - layerPt.y;
                                const plen = Math.sqrt(pdx*pdx + pdy*pdy);
                                if (plen > 0) { pdx /= plen; pdy /= plen; }

                                ctx.beginPath();
                                ctx.strokeStyle = 'rgba(253, 184, 19, 0.4)';
                                ctx.lineWidth = activeNodeSize;
                                ctx.moveTo(pixelX, pixelY);
                                ctx.lineTo(pixelX - pdx * tailLength, pixelY - pdy * tailLength);
                                ctx.stroke();

                                ctx.beginPath();
                                ctx.fillStyle = '#FDB813';
                                ctx.arc(pixelX, pixelY, rRadius, 0, Math.PI * 2);
                                ctx.fill();
                            }
                        }
                    }
                }
            }
        }
        requestAnimationFrame(renderLoop);
    }

    mountRunnerSwarm();

    // Mobile Bottom Sheet Drawer Logic
    const sidebar = document.getElementById('sidebar');
    const sidebarHeader = sidebar.querySelector('header');
    
    let startY = 0;
    let currentY = 0;
    let initialHeight = 0;
    let isDragging = false;
    let dragMode = 'none'; // 'header', 'sheet', 'pending-collapse'
    let initialScrollTop = 0;

    function getSnapHeights() {
        const vh = window.innerHeight;
        
        // Read safe area bottom from CSS custom property, fallback to 16
        const safeAreaStr = getComputedStyle(document.documentElement).getPropertyValue('--safe-area-bottom').trim();
        let safeAreaBottom = 0;
        if (safeAreaStr) {
            const parsed = parseInt(safeAreaStr);
            if (!isNaN(parsed)) {
                safeAreaBottom = parsed;
            } else {
                safeAreaBottom = 16; // Fallback if unresolved env()
            }
        } else {
            safeAreaBottom = 16;
        }
        
        const collapsedBuffer = 60; // Matching selected configuration
        
        return {
            collapsed: sidebarHeader.offsetHeight + safeAreaBottom + collapsedBuffer,
            default: vh * 0.25,
            expanded: vh * 0.85
        };
    }

    function onTouchStart(e) {
        if (window.innerWidth > 768) return;
        if (e.target.closest('.slider-container')) return;
        
        startY = e.touches ? e.touches[0].clientY : e.clientY;
        currentY = startY;
        initialHeight = sidebar.offsetHeight;
        initialScrollTop = listContainer ? listContainer.scrollTop : 0;
        const snaps = getSnapHeights();
        
        if (e.target.closest('header')) {
            isDragging = true;
            dragMode = 'header';
            sidebar.classList.add('dragging');
        } else if (e.target.closest('#closure-list')) {
            if (initialHeight < snaps.expanded - 10) {
                isDragging = true;
                dragMode = 'sheet';
                sidebar.classList.add('dragging');
            } else if (initialScrollTop === 0) {
                isDragging = true;
                dragMode = 'pending-collapse';
                sidebar.classList.add('dragging');
            }
        }
    }

    function onTouchMove(e) {
        if (!isDragging) return;
        currentY = e.touches ? e.touches[0].clientY : e.clientY;
        const deltaY = startY - currentY; // positive means drag up
        const snaps = getSnapHeights();
        
        if (dragMode === 'pending-collapse') {
            if (deltaY < -5) { // Dragging down
                dragMode = 'sheet';
            } else if (deltaY > 5) { // Dragging up, let list scroll natively
                isDragging = false;
                sidebar.classList.remove('dragging');
                return;
            }
        }
        
        if (dragMode === 'header' || dragMode === 'sheet') {
            const newHeight = initialHeight + deltaY;
            const minH = snaps.collapsed;
            const maxH = snaps.expanded;
            
            const heightVal = Math.max(minH, Math.min(maxH, newHeight));
            sidebar.style.height = `${heightVal}px`;
            document.documentElement.style.setProperty('--sheet-height', `${heightVal}px`);
            if (e && e.cancelable) e.preventDefault();
        }
    }

    function onTouchEnd() {
        if (!isDragging) return;
        isDragging = false;
        sidebar.classList.remove('dragging');
        if (dragMode === 'pending-collapse') return;
        
        const finalHeight = sidebar.offsetHeight;
        const snaps = getSnapHeights();
        const distCollapsed = Math.abs(finalHeight - snaps.collapsed);
        const distDefault = Math.abs(finalHeight - snaps.default);
        const distExpanded = Math.abs(finalHeight - snaps.expanded);
        
        let targetHeight = snaps.default;
        if (distCollapsed < distDefault && distCollapsed < distExpanded) targetHeight = snaps.collapsed;
        else if (distExpanded < distDefault && distExpanded < distCollapsed) targetHeight = snaps.expanded;
        
        const totalDelta = startY - currentY;
        if (Math.abs(totalDelta) > 40) {
            if (totalDelta > 40) targetHeight = finalHeight > snaps.default ? snaps.expanded : snaps.default;
            else targetHeight = finalHeight < snaps.default ? snaps.collapsed : snaps.default;
        }
        
        if (targetHeight === snaps.collapsed) {
            sidebar.classList.add('collapsed');
        } else {
            sidebar.classList.remove('collapsed');
        }
        
        sidebar.style.height = `${targetHeight}px`;
        document.documentElement.style.setProperty('--sheet-height', `${targetHeight}px`);
        setTimeout(() => {
            google.maps.event.trigger(map, 'resize');
        }, 350);
    }

    sidebar.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    sidebar.addEventListener('mousedown', onTouchStart);
    window.addEventListener('mousemove', onTouchMove);
    window.addEventListener('mouseup', onTouchEnd);

    const mapLegend = document.getElementById('map-legend');
    if (mapLegend) {
        const legendHeader = mapLegend.querySelector('h4');
        if (legendHeader) {
            legendHeader.addEventListener('click', () => {
                mapLegend.classList.toggle('collapsed');
            });
        }
    }

    // ==========================================
    // Sleek Minimalist Onboarding Logic
    // ==========================================
    function initOnboarding() {
        const overlay = document.getElementById('onboarding-overlay');
        if (!overlay) return;

        const phase1 = document.getElementById('onboarding-phase-1');
        const phase2 = document.getElementById('onboarding-phase-2');
        const phase3 = document.getElementById('onboarding-phase-3');
        const timeIndicator = document.getElementById('onboarding-time-indicator');
        const ctaBtn = document.getElementById('onboarding-cta-btn');
        
        const flatbush = document.getElementById('onboarding-closure-flatbush');
        const opNorth = document.getElementById('onboarding-closure-op-north');
        const opSouth = document.getElementById('onboarding-closure-op-south');
        const swarmParticles = document.getElementById('onboarding-swarm-particles');
        
        // Locked Pixel-Matched Physics Parameters
        const particleCount = 530;
        const dispersion = 20;
        const tailSkew = 80;
        const speedVariance = 0.23;
        const dotSizeMin = 1.9;
        const dotSizeMax = 8.0;
        const opacityMin = 0.1;
        const opacityMax = 0.95;

        // Master Timeline Schedule (Choreographed)
        const masterRoadsClosingTime = 390;        // 6:30 AM
        const masterRunnersSwarmLaunchTime = 460;   // 7:40 AM
        const masterRoadsReopeningTime = 840;       // 2:00 PM

        const particles = [];
        let currentTime = masterRoadsClosingTime; // Starts at master closing commencement
        let isPaused = false;
        let loopInterval = null;

        function generateParticles() {
            if (!swarmParticles) return;
            swarmParticles.innerHTML = '';
            
            for (let i = 0; i < particleCount; i++) {
                let dx, dy, speedFactor = 1.0;
                
                // Box-Muller transforms for Gaussian Normal Distributions
                let u = 0, v = 0;
                while(u === 0) u = Math.random();
                while(v === 0) v = Math.random();
                let normalX = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
                
                u = 0, v = 0;
                while(u === 0) u = Math.random();
                while(v === 0) v = Math.random();
                let normalY = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
                
                // 1. Core Gaussian offsets
                dx = normalX * dispersion;
                dy = (normalY * dispersion) + (Math.abs(normalX) * (tailSkew * 0.5));
                
                // 2. Independent velocity distributions
                if (speedVariance > 0) {
                    u = 0, v = 0;
                    while(u === 0) u = Math.random();
                    while(v === 0) v = Math.random();
                    let speedNormal = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
                    speedFactor = 1.0 + (speedNormal * speedVariance);
                    speedFactor = Math.max(0.5, Math.min(1.8, speedFactor));
                }
                
                const size = dotSizeMin + Math.random() * (dotSizeMax - dotSizeMin);
                const opacity = opacityMin + Math.random() * (opacityMax - opacityMin);
                
                particles.push({ dx, dy, size, opacity, speedFactor });
                
                // Build SVG Line nodes in namespace representing streaking dots
                const ns = 'http://www.w3.org/2000/svg';
                const line = document.createElementNS(ns, 'line');
                line.setAttribute('stroke', '#FDB813'); // True map-gold runner swarm
                line.setAttribute('stroke-width', size / 1.5);
                line.setAttribute('stroke-linecap', 'round');
                line.setAttribute('opacity', 0); // hidden initially
                swarmParticles.appendChild(line);
            }
        }
        
        function formatTimeText(minutes) {
            let hours = Math.floor(minutes / 60);
            let mins = minutes % 60;
            let ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12;
            return `${hours}:${mins < 10 ? '0' : ''}${mins} ${ampm}`;
        }

        function getPositionAlongCourse(currentTimeVal) {
            const startMin = masterRunnersSwarmLaunchTime;
            const endMin = masterRoadsReopeningTime;
            const totalDuration = endMin - startMin;
            
            let p = (currentTimeVal - startMin) / totalDuration;
            p = Math.max(0, Math.min(1, p));
            
            // Hermite S-Curve Easing wave progression
            const t = p * p * (3 - 2 * p);
            
            let x, y, headingX = 0, headingY = 0;
            // Vector vectors matching course geometry
            if (t < 0.3) {
                let t1 = t / 0.3;
                x = 440 - (440 - 320) * t1;
                y = 120 + (260 - 120) * t1;
                headingX = -(440 - 320);
                headingY = 260 - 120;
            } else if (t < 0.8) {
                let t2 = (t - 0.3) / 0.5;
                x = 320 - (320 - 200) * t2;
                y = 260 + (550 - 260) * t2;
                headingX = -(320 - 200);
                headingY = 550 - 260;
            } else {
                let t3 = (t - 0.8) / 0.2;
                x = 200 - (200 - 180) * t3;
                y = 550 + (750 - 550) * t3;
                headingX = -(200 - 180);
                headingY = 750 - 550;
            }
            
            const len = Math.sqrt(headingX * headingX + headingY * headingY);
            if (len > 0) {
                headingX /= len;
                headingY /= len;
            }
            return { x, y, headingX, headingY, t };
        }
        
        function updateMockMap(minutes) {
            if (timeIndicator) timeIndicator.textContent = formatTimeText(minutes);
            
            // 1. Closure Segments Opacities (#d93025)
            if (flatbush) {
                const start = masterRoadsClosingTime;
                const end = masterRoadsReopeningTime - 150;
                let op = 0;
                if (minutes >= start && minutes <= end) {
                    const fade = (end - start) * 0.5;
                    op = minutes > (end - fade) ? Math.max(0, 1 - (minutes - (end - fade)) / fade) : 1;
                }
                flatbush.style.strokeOpacity = op;
            }
            if (opNorth) {
                const start = masterRoadsClosingTime + 30;
                const end = masterRoadsReopeningTime - 60;
                opNorth.style.strokeOpacity = (minutes >= start && minutes <= end) ? 1 : 0;
            }
            if (opSouth) {
                const start = masterRoadsClosingTime + 60;
                const end = masterRoadsReopeningTime;
                opSouth.style.strokeOpacity = (minutes >= start && minutes <= end) ? 1 : 0;
            }
            
            // 2. Independent Swarm Physics Updates
            if (swarmParticles) {
                const children = swarmParticles.children;
                for (let i = 0; i < particles.length; i++) {
                    const p = particles[i];
                    const node = children[i];
                    if (!node) continue;
                    
                    // Calculate custom timeline progression for this runner
                    const pTime = 420 + (minutes - 420) * p.speedFactor;
                    const pos = getPositionAlongCourse(pTime);
                    
                    // Hide element if not started or already finished course
                    if (pos.t <= 0 || pos.t >= 1.0) {
                        node.setAttribute('opacity', 0);
                        continue;
                    }
                    
                    // Softly fade opacity as they cross finish line
                    let opacity = p.opacity;
                    if (pos.t > 0.92) {
                        opacity = p.opacity * (1 - (pos.t - 0.92) / 0.08);
                    }
                    
                    const x = pos.x + p.dx;
                    const y = pos.y + p.dy;
                    
                    // Streaking Line geometry aligned backwards to segment vector
                    node.setAttribute('x1', x);
                    node.setAttribute('y1', y);
                    node.setAttribute('x2', x - pos.headingX * (p.size * 2.5));
                    node.setAttribute('y2', y - pos.headingY * (p.size * 2.5));
                    node.setAttribute('opacity', opacity);
                }
            }

            // 3. Passive Phase Highlights sync
            // Phase 1: Closures (7:00am - 9:15am)
            if (minutes < 555) {
                if (phase1) phase1.classList.add('active');
                if (phase2) phase2.classList.remove('active');
                if (phase3) phase3.classList.remove('active');
            } 
            // Phase 2: Swarm (9:15am - 11:45am)
            else if (minutes >= 555 && minutes < 705) {
                if (phase1) phase1.classList.remove('active');
                if (phase2) phase2.classList.add('active');
                if (phase3) phase3.classList.remove('active');
            } 
            // Phase 3: Reopening (11:45am - 1:00pm)
            else {
                if (phase1) phase1.classList.remove('active');
                if (phase2) phase2.classList.remove('active');
                if (phase3) phase3.classList.add('active');
            }
        }
        
        // 3x Speed timeline loop: ticks by 9 minutes every 100ms (4.0s full cycle)
        function startTimelineLoop() {
            loopInterval = setInterval(() => {
                if (isPaused) return;
                
                currentTime += 9;
                if (currentTime > masterRoadsReopeningTime) {
                    currentTime = masterRoadsClosingTime; // loop back to master closing commencement
                }
                updateMockMap(currentTime);
            }, 100);
        }

        if (ctaBtn) {
            ctaBtn.addEventListener('click', () => {
                clearInterval(loopInterval);
                overlay.classList.add('fade-out');
                localStorage.setItem('onboarding-completed', 'true');
                
                setTimeout(() => {
                    overlay.style.display = 'none';
                    if (typeof google !== 'undefined' && google.maps) {
                        google.maps.event.trigger(map, 'resize');
                    }
                }, 600);
            });
        }
        
        // Initialize particles, state elements, and start auto timeline loop
        generateParticles();
        updateMockMap(currentTime);
        startTimelineLoop();
    }
});
