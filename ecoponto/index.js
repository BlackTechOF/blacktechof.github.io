const inputBairros = document.getElementById('inputBairros')
let ecopontosLayer;
let map;

if ("geolocation" in navigator) {
  navigator.geolocation.watchPosition(
    (position) => {
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      console.log(`latitude: ${latitude} \n longitude: ${longitude}`)

      if (!map) {
      map = L.map('map', {
        center: [latitude, longitude],
        zoom: 11.5,
        zoomControl: false
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);
    }

      L.marker([latitude, longitude]).addTo(map)
        .bindPopup("📍 Você está aqui!").openPopup();

      const ecoIcon = L.icon({
        iconUrl: '../imagens/LocalReciclagem.png',
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40]
      });

      fetch('./ecopontos.geojson')
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

          const btnEcopontosProximos = document.getElementById('btnEcopontosProximos');

          btnEcopontosProximos.addEventListener('click', () => {
            if (!navigator.geolocation) {
              alert("Geolocalização não é suportada no seu navegador.");
              return;
            }

            navigator.geolocation.getCurrentPosition(position => {
              const userLat = position.coords.latitude;
              const userLng = position.coords.longitude;
              const raioKm = 3;

              const ecopontosProximos = [];

              ecopontosLayer.eachLayer(layer => {
                const ecoLat = layer.getLatLng().lat;
                const ecoLng = layer.getLatLng().lng;
                const distancia = calcularDistancia(userLat, userLng, ecoLat, ecoLng);

                if (distancia <= raioKm) {
                  ecopontosProximos.push({
                    nome: layer.feature.properties.nome,
                    distancia: distancia.toFixed(2),
                    latlng: layer.getLatLng()
                  });
                }
              });

              ecopontosProximos.sort((a, b) => a.distancia - b.distancia);

              const listaBairros = document.getElementById("listaBairros");
              const listaEcopontos = document.getElementById("listaEcopontos");
              const tituloBairros = document.getElementById("tituloBairros");
              const tituloEcopontos = document.getElementById("tituloEcopontos");
              const voltarBtn = document.getElementById("voltarBtn");

              listaBairros.style.display = "none";
              tituloBairros.style.display = "none";
              listaEcopontos.style.display = "";
              tituloEcopontos.style.display = "";
              voltarBtn.style.display = "";

              listaEcopontos.innerHTML = "";

              if (ecopontosProximos.length === 0) {
                listaEcopontos.innerHTML = "<li>Nenhum ecoponto encontrado nas proximidades.</li>";
                return;
              }

              ecopontosProximos.forEach(eco => {
                const li = document.createElement("li");
                li.textContent = `${eco.nome} - ${eco.distancia} km`;
                li.addEventListener('click', () => {
                  map.setView(eco.latlng, 17);
                });
                listaEcopontos.appendChild(li);
              });

              map.setView([userLat, userLng], 14);
            });
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
            listaBairros.style.display = "";
            tituloBairros.style.display = "";
            listaEcopontos.style.display = "none";
            tituloEcopontos.style.display = "none";
            voltarBtn.style.display = "none";
          }

          function mostrarEcopontos(bairro) {
            listaBairros.style.display = "none";
            tituloBairros.style.display = "none";
            listaEcopontos.style.display = "";
            tituloEcopontos.style.display = "";
            voltarBtn.style.display = "";

            listaEcopontos.innerHTML = "";

            bairros[bairro].forEach(f => {
              const liEco = document.createElement("li");
              liEco.textContent = f.properties.nome;
              liEco.addEventListener("click", () => {
                const [lng, lat] = f.geometry.coordinates;
                const latlng = [lat, lng];
                map.setView(latlng, 20);
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
          });

          inputBairros.addEventListener('input', function() {
            const valor = inputBairros.value.toLowerCase();
            listaBairros.innerHTML = "";

            const bairrosFiltrados = Object.keys(bairros).filter(b => 
              b.toLowerCase().includes(valor)
            );

            bairrosFiltrados.forEach(classe => {
              const li = document.createElement("li");
              li.textContent = classe;
              li.addEventListener("click", () => {
                mostrarEcopontos(classe);
              });
              listaBairros.appendChild(li);
            });

            if (valor === "") {
              Object.keys(bairros).sort().forEach(classe => {
                const li = document.createElement("li");
                li.textContent = classe;
                li.addEventListener("click", () => {
                  mostrarEcopontos(classe);
                });
                listaBairros.appendChild(li);
              });
            }
          });

          mostrarBairros();

          const pesquisaInput = document.getElementById('pesquisaInput');
const inputEcoPonto = document.getElementById('inputEcoPonto');

          pesquisaInput.addEventListener('click', function () {
              const nomeBusca = inputEcoPonto.value.toLowerCase();
              ecopontosLayer.eachLayer(function (layer) {
                const nomeEcoponto = layer.feature.properties.nome.toLowerCase();
                if (nomeEcoponto.includes(nomeBusca)) {
                  map.setView(layer.getLatLng(), 17);
                  layer.openPopup();
                }  

                if (nomeBusca === '') {
                  map.setView([latitude, longitude], 17)
                }
              });
            }
      );
        })
        .catch(err => console.error("Erro ao carregar GeoJSON:", err));
    },
    () => {
      alert("Não foi possível acessar sua localização.");
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
} else {
  alert("Geolocalização não é suportada no seu navegador.");
}


function calcularDistancia(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

document.getElementById('zoomInBtn').addEventListener('click', (e) => {
  e.preventDefault();
  map.zoomIn();
});
document.getElementById('zoomOutBtn').addEventListener('click', (e) => {
  e.preventDefault();
  map.zoomOut();
});
