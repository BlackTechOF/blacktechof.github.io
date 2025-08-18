if ("geolocation" in navigator) {
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      const map = L.map('map').setView([latitude, longitude], 12);

      console.log(`Latitude: ${latitude}`)
      console.log(`Longitude: ${longitude}`)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      L.marker([latitude, longitude]).addTo(map)
        .bindPopup("📍 Você está aqui!").openPopup();

      fetch('ecopontos.geojson')
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
    },
    () => {
      alert("Não foi possível acessar sua localização.");
    }
  );
} else {
  alert("Geolocalização não é suportada no seu navegador.");
}