define(["google.maps", "knockout", 'config'], function (gmap, ko, config) {
    var DistanceMeasurer = function () {
        var self = this;
        this.rulers = [];
        this.distance = ko.observable(0);
        this.isEnabled = ko.observable(false);
        this.distanceLabel = ko.computed(function () {
            return self.distance().toFixed(2) + ' km';
        });

        this.isEnabled.subscribe(function (isEnabled) {
            self[isEnabled ? 'enable' : 'disable']();
        })
    };

    DistanceMeasurer.prototype.appendControl = function (map) {
        this.map = map;
        var self = this,
            controlDiv = document.createElement('div');
        controlDiv.innerHTML = this.templates.control;

        map.controls[gmap.ControlPosition.LEFT_TOP].push(controlDiv);
        ko.applyBindings(this, controlDiv);

        gmap.event.addDomListener(controlDiv, 'click', function (e) {
            self.isEnabled(!self.isEnabled());
            e.preventDefault();
        })
    };

    DistanceMeasurer.prototype.enable = function () {
        this.rulerpoly = new gmap.Polyline(config.distanceMeasurer.lineStyle);
        this.gmapClickListener = gmap.event.addListener(this.map, 'click', this.clickHandler.bind(this));
        this.rulerpoly.setMap(this.map);
    };

    DistanceMeasurer.prototype.disable = function () {
        gmap.event.removeListener(this.gmapClickListener);
        this.rulers.forEach(function (ruler) {
            ruler.setMap(null)
        });
        this.rulers.length = 0;
        this.clearPolyline();
        this.distance(0);
    };

    DistanceMeasurer.prototype.clearPolyline = function () {
        this.rulerpoly.setPath([]);
    };

    DistanceMeasurer.prototype.clickHandler = function (e) {
        this.rulers.push(this.createRuler(e.latLng));
        this.updatePolyline();
    };

    DistanceMeasurer.prototype.updatePolyline = function () {
        if (this.rulers.length > 1) {
            this.drawRulerPolyline();
            this.distance(this.calcDistance());
        } else {
            this.clearPolyline();
            this.distance(0);
        }
    };

    function setRulerIcon(ruler, icon) {
        return function () {
            ruler.setIcon(config.distanceMeasurer.icons[icon])
        }
    }

    DistanceMeasurer.prototype.createRuler = function (latLng) {
        var self = this,
            ruler = new google.maps.Marker({
                position: latLng,
                map: this.map,
                draggable: true,
                icon: config.distanceMeasurer.icons.normal
            });

        gmap.event.addListener(ruler, 'mouseover', setRulerIcon(ruler, 'cross'));

        gmap.event.addListener(ruler, 'mouseout', setRulerIcon(ruler, 'normal'));

        gmap.event.addListener(ruler, 'drag', function () {
            self.updatePolyline();
        });

        gmap.event.addListener(ruler, 'click', function () {

            ruler.setMap(null);
            var rulerIndex = self.rulers.indexOf(ruler);
            self.rulers.splice(rulerIndex, 1);
            self.updatePolyline();
        });

        return ruler;
    };

    DistanceMeasurer.prototype.drawRulerPolyline = function () {
        this.rulerpoly.setPath(this.getRulersPositions());
    };

    DistanceMeasurer.prototype.getRulersPositions = function () {
        return this.rulers.map(function (ruler) {
            return ruler.position
        });
    };

    DistanceMeasurer.prototype.calcDistance = function () {
        var totalDistance = 0;
        this.rulers.reduce(function (ruler1, ruler2) {
            totalDistance += DistanceMeasurer.distance(ruler1.getPosition().lat(), ruler1.getPosition().lng(), ruler2.getPosition().lat(), ruler2.getPosition().lng());
            return ruler2;
        });
        return totalDistance;
    };

    DistanceMeasurer.distance = function (lat1, lon1, lat2, lon2) {
        var R = 6371;
        var dLat = (lat2 - lat1) * Math.PI / 180;
        var dLon = (lon2 - lon1) * Math.PI / 180;
        var a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        var d = R * c;
        return d;
    };

    DistanceMeasurer.prototype.domInit = function (element, params) {
        var self = this;
        this.modalWindow = params.modalWindow;
        if(this.modalWindow) {
            this.modalWindow.on('close', function () {
                self.isEnabled(false);
                self.disable();
            });
        }
    };

    DistanceMeasurer.prototype.templates = ["main", "control"];
    return DistanceMeasurer;
});
