var app = angular.module('wri', []);

app.controller('MapCtrl', function ($scope, $http) {
    $scope.apiURL = window.API_URL;

    $scope.mdiv = document.getElementById("map");
    $scope.mdiv.style.height = window.innerHeight + "px";
    $scope.mdiv.style.width = window.innerWidth + "px";
    /*intialize map*/
    $scope.map = L.map('map').setView([41.83, -71.41], 13);

    var osmUrl='http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    var ridemUrl = "http://maps.edc.uri.edu/arcgis/rest/services/Atlas_imageryBaseMapsEarthCover/2011_RIDEM/MapServer/tile/{z}/{y}/{x}";

    var ridem = L.tileLayer(ridemUrl, { attribution: '', maxZoom: 18});
    var osm = L.tileLayer(osmUrl, { attribution: '', maxZoom: 18});
    var esri = L.esri.basemapLayer("Gray").addTo($scope.map);
    var baseMaps = {
        "OpenStreetMap": osm,
        "RIDEM (hi-rez)": ridem,
        "Esri":esri
    };

    L.control.layers(baseMaps, null, {
     position:"bottomright"               
                    
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
            f.addTo($scope.map);
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
                    Name:data[i].Name,
                    Restrictions:data[i].Restriction
                }
                layers.push(L.geoJson(feature,{
                    onEachFeature:function(feature, layer){
                        var str = "<b>"+feature.properties.Name+ "</b>"
                        if(feature.properties.Restrictions != "") {
                            str += "<br/><small>Restrictions: "+ feature.properties.Restrictions +"</small>";
                        }
                        layer.bindPopup(str);

                    }
                }));    
            }
            var f = L.featureGroup(layers);
            f.addTo($scope.map);

        }).
        error(function(data, status, headers, config) {
            console.log(data, status);
        });

    }

       
    $scope.getLakes();

    


});
