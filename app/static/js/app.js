var app = angular.module('wri', []);

app.controller('MapCtrl', function ($scope, $http) {
    $scope.apiURL = window.API_URL;
    $scope.mdiv = document.getElementById("map");
    $scope.mdiv.style.height = window.innerHeight + "px";
    $scope.mdiv.style.width = window.innerWidth + "px";
    $scope.lp_search_params = {};
    $scope.access_search_params = {};
    /*intialize map*/
    $scope.map = L.map('map').setView([41.83, -71.41], 13);
    $scope.mapLayers = {};

    var osmUrl='http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    var ridem = L.esri.tiledMapLayer("http://maps.edc.uri.edu/arcgis/rest/services/Atlas_imageryBaseMapsEarthCover/2011_RIDEM/MapServer", {});
    var osm = L.tileLayer(osmUrl, { attribution: '', maxZoom: 18});
    var esri = L.esri.basemapLayer("Gray").addTo($scope.map);

    $scope.baseMaps = {
        "OpenStreetMap": osm,
        "RIDEM (hi-rez)": ridem,
        "ESRI(Gray)":esri
    };

    $scope.overlays = {};

    $scope.control = L.control.layers($scope.baseMaps, $scope.overlays, {
        position:"bottomleft",
        collapsed: false,
    }).addTo($scope.map);

    L.control.scale({
        position: "bottomright"
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
            var lp = $scope.getOverlayLayer($scope.control,"Lakes and Ponds");
            if(lp != null){
                $scope.control.removeLayer(lp.layer);
                $scope.map.removeLayer($scope.mapLayers["lp"]);
            }
            var f = L.featureGroup(layers);
            $scope.mapLayers["lp"] = f;
            $scope.control.addOverlay(f, "Lakes and Ponds");
            $scope.map.addLayer(f);
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
        $http({
            method: 'GET', 
            url: $scope.apiURL + "/lakes",
            params: $scope.lp_search_params
        }).
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
        $http({
            method: 'GET',
            url: $scope.apiURL + "/access",
            params:$scope.access_search_params
        }).
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
                        var str = "<h3>"+feature.properties.Name+ "</h3>"
                        var latlon = "";
                        if(feature.properties.Restrictions != "") {
                            str += "<small><b>Restrictions:</b> "+ feature.properties.Restrictions +"</small>";
                        }

                        if(feature.properties.Park != "") {
                            str += "<small><b>Parking: </b> "+ feature.properties.Park +"</small>";
                        }

                        if(feature.properties.Type != "") {
                            str += "<small><b>Access Type: </b>"+ feature.properties.Type +"</small>";
                        }

                        if(feature.properties.Type != "") {
                            str += "<small><b>Water Type: </b>"+ feature.properties.WaterType +"</small>";
                        }
                        latlon = feature.properties.Lat.toString() + "," + feature.properties.Lon.toString();
                        str += "<small><a target='blank' href='http://maps.google.com/maps?f=q&hl=en&geocode=&q=LATLON&ie=UTF8&z=17&iwloc=addr&om=0'>View On Google Maps</a></small>".replace("LATLON", latlon )

                        layer.bindPopup(str);

                    }
                }));    
            }

            var lp = $scope.getOverlayLayer($scope.control,"Public Fishing Access");
            if(lp != null){
                $scope.control.removeLayer(lp.layer);
                $scope.map.removeLayer($scope.mapLayers["pa"]);
            }

            var f = L.featureGroup(layers);
            $scope.mapLayers['pa'] = f;
            $scope.control.addOverlay(f, "Public Fishing Access");
        }).
        error(function(data, status, headers, config) {
            console.log(data, status);
        });

    }

    $scope.searchMap = function(e) {
        $scope.lp_search_params = {}; // always reset search params
        $scope.access_search_params = {};

        if($scope.search_name != undefined && $scope.search_name != "") {
            $scope.lp_search_params["n"] = $scope.search_name;
            $scope.access_search_params["n"] = $scope.search_name;
        }

        if($scope.trt_stk != undefined && $scope.trt_stk == true) {
            $scope.lp_search_params["t"] = "Y";
            $scope.access_search_params["t"] = "Y";
        }
        $scope.getLakes();
    }

       
    $scope.getLakes();

    $scope.toTitleCase = function(str){
        return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
    }   

    $scope.capitalizeFirstLetter = function(string){
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
    
    $scope.getOverlayLayer = function(control, name) {
        var layer = null;
        for(var l in control._layers){
            if(control._layers[l].name == name){
                
                layer = control._layers[l];
                break;
            }
        }

        return layer;
    }
});
