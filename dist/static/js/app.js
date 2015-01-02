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
    $scope.access_search_params = {};
    $scope.loadedGeoms = 0;
    $scope.gids = [];
    /*intialize map*/
    $scope.map = L.map('map',{zoomControl: false }).setView([41.83, -71.41], 13);
    new L.Control.Zoom({ position: 'topright' }).addTo($scope.map);
    $scope.mapLayers = {};
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
        collapsed: false,
    });

    $scope.control.addTo($scope.map);

    
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
    
    $scope.updateLakeGeoms = function() {
        $scope.gids = []; // we use this too create chunks
        $scope.loadedGeoms = 0;
        var chunkSize = 1000;
        var chunks = [];
        var chunk;

        var lp = $scope.getOverlayLayer($scope.control,"Lakes and Ponds");
        if(lp != null){
            $scope.control.removeLayer(lp.layer);
            $scope.map.removeLayer($scope.mapLayers["lp"]);
        }
        var f = L.featureGroup([]);
        $scope.map.addLayer(f);
        $scope.mapLayers["lp"] = f;

        for(var l in $scope.lakes) {
            $scope.gids.push($scope.lakes[l].Gid);
        }
        $scope.gidsLen = $scope.gids.length;
        // make chunks for geoms request
        for(var i=0; i<$scope.gids.length; i+=chunkSize){
            chunk = $scope.gids.slice(i, i+chunkSize);
            chunks.push(chunk);
        }
        
        for(var i in chunks) {
            var gidsStr = "&g=";
            gidsStr += chunks[i].join("&g=");
            
            $http({method: 'GET', url: $scope.apiURL + "/geom?t=l" + gidsStr}).
            success(function(data, status, headers, config) {
                var feature = null;
                $scope.loadedGeoms += data.length;
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

                $scope.control.addOverlay($scope.mapLayers['lp'], "Lakes and Ponds");
                $scope.lakes_ponds_available = true;

            }).
            error(function(data, status, headers, config) {
            });
        }
    }
    $scope.updateRiversGeoms = function() {
        $scope.gids = []; // we use this too create chunks
        $scope.loadedGeoms = 0;
        var chunkSize = 1000;
        var chunks = [];
        var chunk;

        var lp = $scope.getOverlayLayer($scope.control,"Rivers and Streams");
        if(lp != null){
            $scope.control.removeLayer(lp.layer);
            $scope.map.removeLayer($scope.mapLayers["rs"]);
        }
        var f = L.featureGroup([]);
        $scope.map.addLayer(f);
        $scope.mapLayers["rs"] = f;

        for(var l in $scope.rivers) {
            $scope.gids.push($scope.rivers[l].Gid);
        }
        $scope.gidsLen = $scope.gids.length;
        // make chunks for geoms request
        for(var i=0; i<$scope.gids.length; i += chunkSize){
            chunk = $scope.gids.slice(i, i+chunkSize);
            chunks.push(chunk);
        }
        
        for(var i in chunks) {
            var gidsStr = "&g=";
            gidsStr += chunks[i].join("&g=");
            
            $http({method: 'GET', url: $scope.apiURL + "/geom?t=r" + gidsStr}).
            success(function(data, status, headers, config) {
                var feature = null;
                $scope.loadedGeoms += data.length;
                for(var i in data) {
                    feature = JSON.parse(data[i].Geom);
                    feature.properties = {
                        name: data[i].Name,
                        gid: data[i].Gid
                    }
                    $scope.mapLayers['rs'].addLayer(L.geoJson(feature,{
                        style: {
                            "color": "#1E74FF",
                            "weight": 2,
                            "opacity": .5,
                        },
                        onEachFeature: function(feature, layer) {
                            var popUpStr = "";
                            popUpStr += "<h3>" + feature.properties.name + "</h3>";
                            layer.bindPopup(popUpStr);

                        }
                    }));
                }

                $scope.control.addOverlay($scope.mapLayers['rs'], "Rivers and Streams");
                $scope.rivers_streams_available = true;


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

    $scope.getLakes = function() {
        $http({
            method: 'GET', 
            url: $scope.apiURL + "/lakes",
            params: $scope.lp_search_params
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

    $scope.getRiversStreams = function() {
        $http({
            method: 'GET', 
            url: $scope.apiURL + "/rivers",
            params: $scope.rs_search_params
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

    $scope.getAccessPoints = function(fitbounds) {
        if(fitbounds == undefined) {
            fitbounds = false;
        }
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
    $scope.getLakes();
    $scope.getRiversStreams();
    $scope.getAccessPoints();
    
    angular.element(document).ready(function(){
        angular.element( window ).resize(function() {

            $scope.resizeMap();
        });
    });

});
