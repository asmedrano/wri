var app = angular.module('wri', []);

app.controller('MapCtrl', function ($scope, $http) {
    $scope.apiURL = window.API_URL;

    $scope.mdiv = document.getElementById("map");
    $scope.mdiv.style.height = window.innerHeight + "px";
    $scope.mdiv.style.width = window.innerWidth + "px";
    /*intialize map*/
    $scope.map = L.map('map').setView([41.83, -71.41], 13);

    var osmUrl='http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    var ridem = L.esri.tiledMapLayer("http://maps.edc.uri.edu/arcgis/rest/services/Atlas_imageryBaseMapsEarthCover/2011_RIDEM/MapServer", {});
    var osm = L.tileLayer(osmUrl, { attribution: '', maxZoom: 18});
    var esri = L.esri.basemapLayer("Gray").addTo($scope.map);

    $scope.baseMaps = {
        "OpenStreetMap": osm,
        "RIDEM (hi-rez)": ridem,
        "Esri":esri
    };

    $scope.overlays = {};

    $scope.control = L.control.layers($scope.baseMaps, $scope.overlays, {
        position:"bottomleft",
        collapsed: false,
    }).addTo($scope.map);
        
    $scope.updateGeoms = function() {
        var gids = [];
        var gidsStr = "?g=";
        for(var l in $scope.lakes) {
            gids.push($scope.lakes[l].Gid);
        }
        gidsStr += gids.join("&g=");
        
        $http({method: 'GET', url: $scope.apiURL + "/lakes/geom" + gidsStr}).
        success(function(data, status, headers, config) {
            // TODO: this could potentially be a big request 
            // how can I fix it
            var feature = null;
            var layers =[];
            for(var i in data) {
                feature = JSON.parse(data[i].Geom);
                feature.properties = {
                    name: data[i].Name,
                    gid: data[i].Gid
                }
                layers.push(L.geoJson(feature,{
                    style: {
                        "color": "#1E74FF",
                        "weight": 1,
                        "opacity": .8
                    },
                    onEachFeature:$scope.featureClkHandler
                }));
            }
            var f = L.featureGroup(layers);
            $scope.control.addOverlay(f, "Lakes and Ponds");
            $scope.map.fitBounds(f.getBounds());

            $scope.getAccessPoints();
            
        }).
        error(function(data, status, headers, config) {
        });
    }
    
    $scope.featureClkHandler = function(feature, layer) {
        var props;
        layer.on('click', function(e){
            $scope.map.fitBounds(layer.getBounds());
            props = e.target.feature.geometry.properties;
            $scope.lake = $scope.lakes[props.gid.toString()];
            $scope.$apply();
        });
        layer.on('mouseover', function(e){
            props = e.target.feature.geometry.properties;
            $scope.lake = $scope.lakes[props.gid.toString()];
            $scope.$apply();
        });
        layer.on('mouseout', function(e){
            $scope.lake = null;
            
            $scope.$apply();
        });

    }

    $scope.getLakes = function() {
        $http({method: 'GET', url: $scope.apiURL + "/lakes"}).
        success(function(data, status, headers, config) {
            $scope.lakes = data;
            // always fetch geoms when lakes are updated;
            $scope.updateGeoms();
        }).
        error(function(data, status, headers, config) {
            console.log(data, status);
        });
    }

    $scope.getAccessPoints = function() {
        $http({method: 'GET', url: $scope.apiURL + "/access"}).
        success(function(data, status, headers, config) {
            $scope.access = data;
            var layers =[];
            var feature;
            for(var i in data) {
                feature = JSON.parse(data[i].Geom);
                
                feature.properties = {
                    Name : data[i].Name,
                    Restrictions :data[i].Restriction,
                    Park : $scope.capitalizeFirstLetter(data[i].Park),
                    Type : $scope.toTitleCase(data[i].Type),
                    Lat : data[i].Lat,
                    Lon : data[i].Lon,
                    WaterType : $scope.capitalizeFirstLetter(data[i].Wat_ttp),
                }
                layers.push(L.geoJson(feature,{
                    onEachFeature:function(feature, layer){
                        var str = "<b>"+feature.properties.Name+ "</b>"
                        var latlon = "";
                        if(feature.properties.Restrictions != "") {
                            str += "<br/><small><b>Restrictions:</b> "+ feature.properties.Restrictions +"</small>";
                        }

                        if(feature.properties.Park != "") {
                            str += "<br/><small><b>Parking: </b> "+ feature.properties.Park +"</small>";
                        }

                        if(feature.properties.Type != "") {
                            str += "<br/><small><b>Acces Type: </b>"+ feature.properties.Type +"</small>";
                        }

                        if(feature.properties.Type != "") {
                            str += "<br/><small><b>Water Type: </b>"+ feature.properties.WaterType +"</small>";
                        }
                        latlon = feature.properties.Lat.toString() + "," + feature.properties.Lon.toString();
                        str += "<br/><a target='blank' href='http://maps.google.com/maps?f=q&hl=en&geocode=&q=LATLON&ie=UTF8&z=17&iwloc=addr&om=0'>View On Google Maps</a>".replace("LATLON", latlon )

                        layer.bindPopup(str);

                    }
                }));    
            }
            var f = L.featureGroup(layers);
            $scope.control.addOverlay(f, "Public Fishing Access Points");
        }).
        error(function(data, status, headers, config) {
            console.log(data, status);
        });

    }

       
    $scope.getLakes();

    $scope.toTitleCase = function(str){
        return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
    }   

    $scope.capitalizeFirstLetter = function(string){
        return string.charAt(0).toUpperCase() + string.slice(1);
    }


});
