const map = L.map('map').setView([-46.51457426020385, -23.5806818462156085], 11);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Carregar os ecopontos
fetch('ecopontos.geojson') // ajuste o caminho se estiver em outra pasta
  .then(response => response.json())
  .then(data => {
    L.geoJSON(data, {
      onEachFeature: (feature, layer) => {
        if (feature.properties && feature.properties.nome) {
          layer.bindPopup(
            `<b>${feature.properties.nome}</b><br>${feature.properties.endereco || ''}`
          );
        }
      }
    }).addTo(map);
  })
  .catch(err => console.error("Erro ao carregar GeoJSON:", err));

// Ativar localização do usuário
map.locate({ setView: true, maxZoom: 16 });

// Evento de localização encontrada
map.on("locationfound", function(e) {
  L.marker(e.latlng).addTo(map)
    .bindPopup("📍 Você está aqui!").openPopup();
});

// Caso não consiga acessar a localização
map.on("locationerror", function() {
  alert("Não foi possível acessar sua localização.");
});
