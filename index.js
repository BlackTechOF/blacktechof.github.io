if ("geolocation" in navigator) {
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      const map = L.map('map').setView([longitude, latitude], 11.5);

      console.log(`Latitude: ${latitude}`)
      console.log(`Longitude: ${longitude}`)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      L.marker([latitude, longitude]).addTo(map)
        .bindPopup("📍 Você está aqui!").openPopup();

         const ecoIcon = L.icon({
        iconUrl: 'imagens/LocalReciclagem.png', 
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40]
      });

      fetch('ecopontos.geojson')
        .then(response => response.json())
        .then(data => {
          L.geoJSON(data, {
            pointToLayer: (feature, latlng) => {
              return L.marker(latlng, { icon: ecoIcon });
            },
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