dronedeploy.onload(function(){
  console.log('DroneDeploy Api: ', dronedeploy);
});

//Expandable section
var isExpanded = false;
var upArrow = 'https://s3.amazonaws.com/drone-deploy-plugins/templates/login-example-imgs/arrow-up.svg';
var downArrow = 'https://s3.amazonaws.com/drone-deploy-plugins/templates/login-example-imgs/arrow-down.svg';
var expandArrow = document.querySelector('.expand-arrow');
var expandBody = document.querySelector('.expand-section');
var expandRow = document.querySelector('.expand-row');

expandRow.addEventListener('click', function(){
  isExpanded = !isExpanded
  if (isExpanded){
    expandArrow.src = upArrow;
    expandBody.style.display = 'block';
  } else{
    expandArrow.src = downArrow;
    expandBody.style.display = 'none';
  }
});

function updateGeometry(coordinates){
  new DroneDeploy({
      version: 1
  })
  .then(function(dronedeployApi) {
    return dronedeployApi.Plans.getCurrentlyViewed()
    .then(function(plan){
      var geometry = {geometry: coordinates};
      return dronedeployApi.Plans.update(plan.id, geometry,);
    })
  })
}

function polygonToCoordinates(coordinates){
  var new_coordinates = [];
  var coordinates = coordinates[0];
  for(var i = 0; i < coordinates.length; i++){
    var long = coordinates[i][0];
    var lat = coordinates[i][1];
    new_coordinates.push({'lat': lat, 'lng': long});
  }
  return new_coordinates;
}

function lineStringToCoordinates(coordinates){
  var new_coordinates = [];
  for(var i = 0; i < coordinates.length; i++){
    var long = coordinates[i][0];
    var lat = coordinates[i][1];
    new_coordinates.push({'lat': lat, 'lng': long});
  }
  return new_coordinates;
}


function resetPlaceholder() {
  importLabel.setAttribute('placeholder', 'Import your KML or SHP file');
}

function loadingFilePlaceholder(file) {
  importLabel.setAttribute('placeholder', 'Processing ' + file.name + " file");
}

function fileNamePlaceHolder(file) {
  importLabel.setAttribute('placeholder', file.name);
}

function createNewCoordinates(geoJSON) {
  console.log('geoJSON ', geoJSON)
  if (geoJSON.features) {
    var coordinates = geoJSON.features[0].geometry.coordinates
    var type = geoJSON.features[0].geometry.type
  } else {
    var coordinates = geoJSON.coordinates
    var type = geoJSON.type
  }
  console.log(type)
  if (type === 'LineString') {
    return lineStringToCoordinates(coordinates);
  } else if (type === 'Polygon') {
    return polygonToCoordinates(coordinates);
  } else {
    dronedeploy.Messaging.showToast('Cannot read file.', {timeout: 5000});
  }
}

window.onload = function () {
  console.clear();
  var fileInput = document.getElementById('fileInput');

  fileInput.addEventListener('change', function (e) {
    var file = fileInput.files[0];
    var fileType = file.name.slice(-3).toLowerCase();
    var importLabel = document.getElementById('importLabel');
    importLabel.setAttribute('placeholder', 'Loading');

    if (fileType == 'kml') {
      loadingFilePlaceholder(file);
      var fileReader = new FileReader();
      fileReader.onload = function () {
        content = String(fileReader.result);
        var fileHTML = (new DOMParser()).parseFromString(content, 'text/xml');
        try {
          var geoJSON = toGeoJSON.kml(fileHTML);
        } catch (err) {
          resetPlaceHolder();
          dronedeploy.Messaging.showToast('Cannot read file.', {timeout: 5000});
        }
        try {
          updateGeometry(createNewCoordinates(geoJSON));
        } catch (err) {
          console.error(err, err.stack);
        }
        setTimeout(function () {
          fileNamePlaceHolder(file);
        }, 2000);
      };
      fileReader.readAsText(file);
    }
    else if (fileType === 'shp') {
      loadingFilePlaceholder(file);
      var fileReader = new FileReader();
      fileReader.onload = function (event) {
        try {
          var shape = shp.parseShp(event.target.result)[0];
          try {
            updateGeometry(createNewCoordinates(shape));
          } catch (err) {
            console.error(err, err.stack);
          }
          setTimeout(function () {
            fileNamePlaceHolder(file);
          }, 2000);
        }
        catch (e) {
          resetPlaceHolder();
          window.dronedeploy.Messaging.showToast('Cannot read file.', {timeout: 5000});
        }
      };
      fileReader.readAsArrayBuffer(file);
    }
    else {
      resetPlaceHolder();
      window.dronedeploy.Messaging.showToast('File not supported!', {timeout: 5000});
    }
  });
}
