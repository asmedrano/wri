var app = angular.module('wri', []);
app.config(function($interpolateProvider){
        $interpolateProvider.startSymbol('{[').endSymbol(']}');
});
app.config(['$httpProvider', function($httpProvider) {
        $httpProvider.defaults.useXDomain = true;
        delete $httpProvider.defaults.headers.common['X-Requested-With'];
    }
]);

app.controller('MapCtrl', function ($scope, $http, $timeout, $interval) {
    $scope.apiURL = window.API_URL;
    $scope.mdiv = document.getElementById("map");
    $scope.mdiv.style.height = window.innerHeight + "px";
    $scope.mdiv.style.width = window.innerWidth + "px";
    $scope.lp_search_params = {};
    $scope.rs_search_params = {};
    $scope.access_search_params = {};
    $scope.gids = {
        lakes:{},
        rivers:{}
    };
    $scope.fGroups = {};
    /*intialize map*/
    $scope.map = L.map('map',{zoomControl: false }).setView([41.83, -71.41], 13);
    new L.Control.Zoom({ position: 'topright' }).addTo($scope.map);
    $scope.mapLayers = {};
    $scope.mapMemLayers = {};
    $scope.w_cat_types = ["1", "2", "3", "4A", "4B", "4C", "5"];
    $scope.typing = null;

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
        collapsed: true,
    });

    $scope.control.addTo($scope.map);

    /*TODO move these to somewhere that makes sense*/

    $scope.disableLayers = function(layer_key) {
        $scope.mapMemLayers[layer_key] = $scope.mapLayers[layer_key].getLayers();
        $scope.mapLayers[layer_key].clearLayers();
    }

    $scope.enableLayers = function(layer_key) {

        for(var i = 0; i< $scope.mapMemLayers[layer_key].length; i++) {
            $scope.mapLayers[layer_key].addLayer($scope.mapMemLayers[layer_key][i]);
        }
    }
    $scope.map.on('zoomstart', function() {
        $scope.disableLayers('rs');
        $scope.disableLayers('lp');
        $scope.disableLayers('dm');
        $scope.disableLayers('pa');
    });

    $scope.map.on('zoomend', function() {
        $scope.enableLayers('rs');
        $scope.enableLayers('lp');
        $scope.enableLayers('dm');
        $scope.enableLayers('pa');

        $scope.getMapItems();
    });
    
    $scope.map.on('dragstart', function() {
        $scope.disableLayers('rs');
        $scope.disableLayers('lp');
        $scope.disableLayers('dm');
        $scope.disableLayers('pa');
    });

    $scope.map.on('dragend', function() {
        $scope.enableLayers('rs');
        $scope.enableLayers('lp');
        $scope.enableLayers('dm');
        $scope.enableLayers('pa');

        $scope.getMapItems();
    });

    $scope.getMapItems = function() {
        $scope.mapBounds = $scope.map.getBounds();
        $scope.getLakes();
        $scope.getRiversStreams();
    }
    
    $scope.getLakes = function() {
        var params = $scope.lp_search_params;
        if(angular.isDefined($scope.mapBounds)) {
           params["gq"] = JSON.stringify($scope.mapBounds);
        }
        $http({
            method: 'GET', 
            url: $scope.apiURL + "/lakes",
            params:params
        }).
        success(function(data, status, headers, config) {
            $scope.lakes = data;
            $scope.lakes_count = Object.keys($scope.lakes).length
            // always fetch geoms when lakes are updated;
            if($scope.lakes_count > 0){
                $scope.updateLakeGeoms();
            }
        }).
        error(function(data, status, headers, config) {
            console.log(data, status);
        });
    }

    $scope.updateLakeGeoms = function() {
        var newGids = [];
        var lp = $scope.getOverlayLayer($scope.control,"Lakes and Ponds");
        if (!$scope.fGroups.hasOwnProperty('lakes')) {
            $scope.fGroups.lakes = L.featureGroup([]);
            $scope.map.addLayer($scope.fGroups.lakes);
            $scope.mapLayers["lp"] = $scope.fGroups.lakes;
            $scope.control.addOverlay($scope.mapLayers['lp'], "Lakes and Ponds");
        }

        for(var l in $scope.lakes) {
            if(!$scope.gids.lakes.hasOwnProperty($scope.lakes[l].Gid)) {
                newGids.push($scope.lakes[l].Gid);
                $scope.gids.lakes[$scope.lakes[l].Gid] = 0;
            }
        }
        if( newGids.length >1 ) {
            var gidsStr = "&g=";
            gidsStr += newGids.join("&g=");
            $http({method: 'GET', url: $scope.apiURL + "/geom?t=l" + gidsStr}).
            success(function(data, status, headers, config) {
                var feature = null;
                for(var i in data) {
                    feature = JSON.parse(data[i].Geom);
                    feature.properties = {
                        name: data[i].Name,
                        gid: data[i].Gid
                    }
                    $scope.mapLayers['lp'].addLayer(L.geoJson(feature,{
                        style: {
                            "color": "#1E74FF",
                            "weight": 1,
                            "opacity": .8
                        },
                        onEachFeature:$scope.featureClkHandler
                    }));
                }
            }).
            error(function(data, status, headers, config) {
        });
        }
    }

    /*
    // add events for the overlays
    $scope.map.on('overlayadd', function(layer) {
        if(layer.name == "Public Fishing Access") {
            $scope.pub_fish_acc_available = true;
        }
        if(layer.name == "Lakes and Ponds") {
            $scope.lakes_ponds_available = true;
        }
        $timeout(function(){
            $scope.$apply();
        }, 100);

    });

    $scope.map.on('overlayremove', function(layer) {
        if(layer.name == "Public Fishing Access") {
            $scope.pub_fish_acc_available = false;
        }
        if(layer.name == "Lakes and Ponds") {
            $scope.lakes_ponds_available = false;
        }
        $timeout(function(){
            $scope.$apply();
        }, 100);
    });

    L.control.scale({
        position: "bottomright"
    }).addTo($scope.map);
    */

    $scope.getRiversStreams = function() {
        var params = $scope.rs_search_params;
        if(angular.isDefined($scope.mapBounds)) {
           params["gq"] = JSON.stringify($scope.mapBounds);
        }

        $http({
            method: 'GET', 
            url: $scope.apiURL + "/rivers",
            params: params
        }).
        success(function(data, status, headers, config) {
            $scope.rivers = data;
            $scope.rivers_count = Object.keys($scope.rivers).length
            // always fetch geoms when lakes are updated;
            if($scope.rivers_count > 0){
                $scope.updateRiversGeoms();
            }
        }).
        error(function(data, status, headers, config) {
            console.log(data, status);
        });
    }

    $scope.updateRiversGeoms = function() {
        var newGids = [];
        var lp = $scope.getOverlayLayer($scope.control,"Rivers and Streams");
       
        if (!$scope.fGroups.hasOwnProperty('rivers')) {
            $scope.fGroups.rivers = L.featureGroup([]);
            $scope.map.addLayer($scope.fGroups.rivers);
            $scope.mapLayers["rs"] = $scope.fGroups.rivers;
            $scope.control.addOverlay($scope.mapLayers['rs'], "Rivers and Streams");
        }


        for(var l in $scope.rivers) {
            if(!$scope.gids.rivers.hasOwnProperty($scope.rivers[l].Gid)) {
                newGids.push($scope.rivers[l].Gid);
                $scope.gids.rivers[$scope.rivers[l].Gid] = 0;
            }
        }
        if( newGids.length >1 ) {
            var gidsStr = "&g=";
            gidsStr += newGids.join("&g=");
            
            $http({method: 'GET', url: $scope.apiURL + "/geom?t=r" + gidsStr}).
            success(function(data, status, headers, config) {
                var feature = null;
                for(var i in data) {
                    feature = JSON.parse(data[i].Geom);
                    feature.properties = {
                        name: data[i].Name,
                        gid: data[i].Gid
                    }
                    $scope.mapLayers['rs'].addLayer(L.geoJson(feature,{
                        style: {
                            "color": "#1E74FF",
                            "weight": 3,
                            "opacity": .5,
                        },
                        onEachFeature: function(feature, layer) {
                            var popUpStr = "";
                            popUpStr += "<h3>" + feature.properties.name + "</h3>";
                            layer.bindPopup(popUpStr);
                        }
                    }));
                }
            }).
            error(function(data, status, headers, config) {
            });
        }
    }

    $scope.featureClkHandler = function(feature, layer) {
        var props = $scope.lakes[feature.properties.gid.toString()];

        var popUpStr = "";
        popUpStr += "<h3>" + props.Name + "</h3>";
        popUpStr += "<small><b>Acres: </b>" + props.Acres +  "</small>";

        if(props.PubAcc == 'Y' || props.PubAcc == 'Yes') {
            popUpStr += "<small><b>Public Access: </b>Yes</small>";
        }
        
        if(props.PubAcc != 'Y' && props.PubAcc != 'Yes'){
           popUpStr += "<small><b>Public Access: </b>No</small>"

        }    

        if(props.TroutStk == 'Y' || props.TroutStk == 'Yes'){
            popUpStr += "<small><b>Trout Stocked:</b> Yes</small>";
        }

        if(props.TroutStk != 'Y' && props.TroutStk != 'Yes') {
            popUpStr += "<small><b>Trout Stocked:</b> No</small>";
        }
        if(props.BoatRamp == 'Y' || props.BoatRamp == 'Yes'){
            popUpStr += "<small><b>Boat Ramp:</b> Yes</small>";
        }

        if(props.BoatRamp != 'Y' && props.BoatRamp != 'Yes'){
            popUpStr += "<small><b>Boat Ramp: No</b></small>";
        }
        popUpStr += "<small><b>Restrictions:</b> " + props.Restriction + "</small>";

        layer.bindPopup(popUpStr);
    }

    $scope.getAccessPoints = function(fitbounds) {
        if(fitbounds == undefined) {
            fitbounds = false;
        }
        var params = $scope.access_search_params;
        if(angular.isDefined($scope.mapBounds)) {
           params["gq"] = JSON.stringify($scope.mapBounds);
        }

        $http({
            method: 'GET',
            url: $scope.apiURL + "/access",
            params: params
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
            $scope.map.addLayer(f);
            if(fitbounds) {
                $scope.map.fitBounds(f.getBounds());
            }
        }).
        error(function(data, status, headers, config) {
            console.log(data, status);
        });

    }

    $scope.getDams = function(fitbounds) {
        if(fitbounds == undefined) {
            fitbounds = false;
        }
        var params = $scope.dams_search_params;

        $http({
            method: 'GET',
            url: $scope.apiURL + "/dams",
            params: params
        }).
        success(function(data, status, headers, config) {
            $scope.access = data;
            var layers =[];
            var feature;
            for(var i in data) {
                feature = JSON.parse(data[i].Geom);
                
                feature.properties = {
                    Lat : data[i].Lat,
                    Lon : data[i].Lon,
                    Name: data[i].Name,
                    DamType: data[i].DamType
                }
                layers.push(L.geoJson(feature,{
                    pointToLayer: function (feature, latlng) {
                        return L.circleMarker(latlng, {
                            radius: 4,
                            fillColor: "#7C8381",
                            color: "#999",
                            weight: 1,
                            opacity: 1,
                            fillOpacity: 0.8
                        });
                    },
                    onEachFeature:function(feature, layer){
                        var str = "<h3>"+feature.properties.Name+ "</h3>"
                        var latlon = feature.coordinates[1].toString() + "," + feature.coordinates[0].toString();

                        if(feature.properties.DamType != "") {
                            str += "<small><b>Dam Type: </b>"+ feature.properties.DamType +"</small>";
                        }
                        
                        str += "<small><a target='blank' href='http://maps.google.com/maps?f=q&hl=en&geocode=&q=LATLON&ie=UTF8&z=17&iwloc=addr&om=0'>View On Google Maps</a></small>".replace("LATLON", latlon )

                        layer.bindPopup(str);
                    }
                }));    
            }

            var lp = $scope.getOverlayLayer($scope.control,"Dams");
            if(lp != null){
                $scope.control.removeLayer(lp.layer);
                $scope.map.removeLayer($scope.mapLayers["pa"]);
            }

            var f = L.featureGroup(layers);
            $scope.mapLayers['dm'] = f;
            $scope.control.addOverlay(f, "Dams");
            $scope.map.addLayer(f);
            if(fitbounds) {
                $scope.map.fitBounds(f.getBounds());
            }
        }).
        error(function(data, status, headers, config) {
            console.log(data, status);
        });

    }

    $scope.hideLakesLayer = function(){
        // uncheck lakes layer
        var e = angular.element(".leaflet-control-layers-selector")
                .parent()
                .children("span:contains('Lakes and Ponds')")
                .parent()
                .children("input:checked").click();
    }
    $scope.showLakesLayer = function(){
        // uncheck lakes layer
        var e = angular.element(".leaflet-control-layers-selector")
                .parent()
                .children("span:contains('Lakes and Ponds')")
                .parent()
                .children("input").click();
    }

    $scope.hideAccessPointsLayer = function(){
        // uncheck lakes layer
        var e = angular.element(".leaflet-control-layers-selector")
                .parent()
                .children("span:contains('Public Fishing Access')")
                .parent()
                .children("input:checked").click();
    }

    $scope.nameSearchText = function(t) {
        var acc_was;
        var lp_was;
        if($scope.typing == null) {
            // start a timer
            $scope.typing = $interval(function() {
                if($scope.lakes_search_name != lp_was) {
                    lp_was = $scope.lakes_search_name;
                    acc_was = $scope.acc_search_name;
                }else{
                    // stop the timer and do the search
                    $interval.cancel($scope.typing);
                    $scope.typing = null;
                    if(t == "lakes_ponds") {
                        $scope.searchLakesMap();
                    }else if(t == "fish_acc") {
                        $scope.searchAccessPointsMap();
                    }
                    
                }
            }, 400);
        }   
    }

    $scope.searchLakesMap = function() {
        $scope.lp_search_params = {}; // always reset search params
        

        if($scope.lakes_search_name != undefined && $scope.lakes_search_name != "") {
            $scope.lp_search_params["n"] = $scope.lakes_search_name;
        }

        if($scope.lakes_trt_stk != undefined && $scope.lakes_trt_stk == true) {
            $scope.lp_search_params["t"] = "Y";
        }

        if($scope.lakes_boat_rmp != undefined && $scope.lakes_boat_rmp == true) {
            $scope.lp_search_params["br"] = "Yes";
        }

        if($scope.lakes_pub_acc != undefined && $scope.lakes_pub_acc == true) {
            $scope.lp_search_params["pa"] = "Yes";
        }

        if($scope.w_cat != undefined) {
            $scope.lp_search_params["cat"] = $scope.w_cat;
        }

        $scope.getLakes();
    }

    $scope.searchAccessPointsMap = function(e) {
        $scope.access_search_params = {};

        if($scope.acc_search_name != undefined && $scope.acc_search_name != "") {
            $scope.access_search_params["n"] = $scope.acc_search_name;
        }

        if($scope.acc_trt_stk != undefined && $scope.acc_trt_stk == true) {
            $scope.access_search_params["t"] = "Y";
        }

        if($scope.acc_boat_rmp != undefined && $scope.acc_boat_rmp == true) {
            $scope.access_search_params["br"] = "Y";
        }

        if($scope.acc_slt_wtr != undefined && $scope.acc_slt_wtr == true) {
            $scope.access_search_params["wt"] = "salt";
        }

        $scope.getAccessPoints();
    }

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
    // intial data fetch
    $scope.resizeMap = function() {
        angular.element("#map").css({
            height: window.innerHeight - angular.element(".navbar").height(),
            width: window.innerWidth
        });

        try{
            $scope.map.fitBounds($scope.mapLayers['lp'].getBounds());
        }catch(e){
            //..pass
        }

    }
    $scope.resizeMap();
    $scope.getMapItems();
    $scope.getAccessPoints();
    $scope.getDams();
    
    angular.element(document).ready(function(){
        angular.element( window ).resize(function() {

            $scope.resizeMap();
        });
    });

});
