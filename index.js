let ecopontosLayer;
let map;

if ("geolocation" in navigator) {
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      map = L.map('map', {
  center: [latitude, longitude],
  zoom: 11.5,
  zoomControl: false
});

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
          ecopontosLayer = L.geoJSON(data, {
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

          const bairros = {};
          data.features.forEach(f => {
            const bairro = f.properties.classe || "Sem bairro";
            if (!bairros[bairro]) bairros[bairro] = [];
            bairros[bairro].push(f);
          });

          const sidebar = document.getElementById("sidebar");
          const listaBairros = document.getElementById("listaBairros");
          const listaEcopontos = document.getElementById("listaEcopontos");
          const tituloBairros = document.getElementById("tituloBairros");
          const tituloEcopontos = document.getElementById("tituloEcopontos");
          const voltarBtn = document.getElementById("voltarBtn");
          const fecharBtn = document.getElementById("fecharSidebar");
          const abrirBtn = document.getElementById("abrirSideBar");

          function mostrarBairros() {
            listaBairros.style.display = "block";
            tituloBairros.style.display = "block";
            listaEcopontos.style.display = "none";
            tituloEcopontos.style.display = "none";
            voltarBtn.style.display = "none";
          }

          function mostrarEcopontos(bairro) {
            listaBairros.style.display = "none";
            tituloBairros.style.display = "none";
            listaEcopontos.style.display = "block";
            tituloEcopontos.style.display = "block";
            voltarBtn.style.display = "block";

            listaEcopontos.innerHTML = "";

            bairros[bairro].forEach(f => {
              const liEco = document.createElement("li");
              liEco.textContent = f.properties.nome;
              liEco.addEventListener("click", () => {
                const [lng, lat] = f.geometry.coordinates;
                const latlng = [lat, lng];
                map.setView(latlng, 16);
                ecopontosLayer.eachLayer(layer => {
                  if (layer.feature.properties.nome === f.properties.nome) {
                    layer.openPopup();
                  }
                });
              });
              listaEcopontos.appendChild(liEco);
            });
          }

          Object.keys(bairros).sort().forEach(bairro => {
            const li = document.createElement("li");
            li.textContent = bairro;
            li.addEventListener("click", () => {
              mostrarEcopontos(bairro);
            });
            listaBairros.appendChild(li);
          });

          voltarBtn.addEventListener("click", mostrarBairros);

          fecharBtn.addEventListener("click", () => {
            sidebar.style.display = "none";
          });

          abrirBtn.addEventListener('click', function(){
            if (sidebar.style.display === 'none') {
            sidebar.style.display = ''
            } else {
              sidebar.style.display = 'none'
            }
          })

          mostrarBairros();

          document.getElementById('inputEcoPonto').addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
              const nomeBusca = this.value.toLowerCase();
              ecopontosLayer.eachLayer(function (layer) {
                const nomeEcoponto = layer.feature.properties.nome.toLowerCase();
                if (nomeEcoponto.includes(nomeBusca)) {
                  map.setView(layer.getLatLng(), 16);
                  layer.openPopup();
                }
              });
            }
          });
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

document.getElementById('zoomInBtn').addEventListener('click', (e) => {
  e.preventDefault();
  map.zoomIn();
});
document.getElementById('zoomOutBtn').addEventListener('click', (e) => {
  e.preventDefault();
  map.zoomOut();
});