document.addEventListener('DOMContentLoaded', async () => {
    await google.maps.importLibrary("maps");
    const { Map: GoogleMap, Polyline, InfoWindow, OverlayView, LatLng, LatLngBounds } = google.maps;

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
    const sharedInfoWindow = new InfoWindow();

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
        
        if (Array.isArray(item.latlngs[0][0])) {
            item.latlngs.forEach(subPath => {
                fetchAndPlotRoute(item, subPath, itemPolylines);
            });
        } else {
            fetchAndPlotRoute(item, item.latlngs, itemPolylines);
        }
        
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

    const fallbackRoute = [
        [40.6712, -73.9628], [40.6680, -73.9620], [40.6645, -73.9615],
        [40.6630, -73.9610],
        [40.6680, -73.9650], [40.6728, -73.9701],
        [40.6680, -73.9650], [40.6630, -73.9610],
        [40.6590, -73.9612], [40.6560, -73.9615], [40.6545, -73.9662], [40.6530, -73.9710],
        [40.6560, -73.9670], [40.6600, -73.9650], [40.6650, -73.9655], [40.6700, -73.9680],
        [40.6660, -73.9730], [40.6600, -73.9750], [40.6550, -73.9740], [40.6530, -73.9710],
        [40.6400, -73.9700], [40.6200, -73.9690], [40.6000, -73.9680], [40.5840, -73.9670], [40.5760, -73.9700],
        [40.5755, -73.9740], [40.5750, -73.9780], [40.5730, -73.9775], [40.5725, -73.9800]
    ];

    const overlayLayer = new RunnerCanvasOverlay();
    overlayLayer.setMap(map);

    async function mountRunnerSwarm() {
        try {
            const wpStr = "-73.9628,40.6712;-73.9615,40.6645;-73.9610,40.6630;-73.9701,40.6728;-73.9610,40.6630;-73.9615,40.6560;-73.9710,40.6530;-73.9650,40.6620;-73.9680,40.6700;-73.9750,40.6600;-73.9710,40.6530;-73.9670,40.5840;-73.9700,40.5760;-73.9780,40.5750;-73.9775,40.5730;-73.9800,40.5725";
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
            mDiv.textContent = `M${m}`;
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
            for (let i = 0; i < 25000; i++) {
                const finishMins = Math.max(65, 130 + (Math.random() + Math.random() + Math.random() - 1.5) * 40);
                swarmRunners.push({ speed: 13.1 / finishMins, scatterX: getGaussianRandom() * 0.25, scatterY: getGaussianRandom() * 0.25 });
            }
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
                    const dist = r.speed * raceElapsedMins;

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
        return {
            collapsed: sidebarHeader.offsetHeight + 10 + (vh * 0.05),
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
            
            sidebar.style.height = `${Math.max(minH, Math.min(maxH, newHeight))}px`;
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
        
        sidebar.style.height = `${targetHeight}px`;
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
});
