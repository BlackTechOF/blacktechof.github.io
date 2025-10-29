
const inputBairros = document.getElementById('inputBairros');
let map;
let userMarker;
let ecopontosLayer;
let bairros = {};

if ("geolocation" in navigator) {
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      iniciarMapa(latitude, longitude);
      iniciarWatcher();
      carregarEcopontos();
    },
    () => alert("Não foi possível acessar sua localização."),
    { enableHighAccuracy: true, maximumAge: 0 }
  );
} else {
  alert("Geolocalização não é suportada no seu navegador.");
}

function iniciarMapa(lat, lng) {
  map = L.map('map', {
    center: [lat, lng],
    zoom: 12,
    zoomControl: false
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  userMarker = L.marker([lat, lng])
    .addTo(map)
    .bindPopup("📍 Você está aqui!")
    .openPopup();
}

function iniciarWatcher() {
  navigator.geolocation.watchPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      userMarker.setLatLng([lat, lng]);
    },
    (err) => console.warn("Erro no watchPosition:", err),
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

function carregarEcopontos() {
  const ecoIcon = L.icon({
    iconUrl: '../imagens/LocalReciclagem.png',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40]
  });

  fetch('./ecopontos.geojson')
    .then(r => r.json())
    .then(data => {
      ecopontosLayer = L.geoJSON(data, {
        pointToLayer: (feature, latlng) => L.marker(latlng, { icon: ecoIcon }),
        onEachFeature: (feature, layer) => {
          if (feature.properties?.nome) {
            layer.bindPopup(`<b>${feature.properties.nome}</b><br>${feature.properties.endereco || ''}`);
          }
        }
      }).addTo(map);

      data.features.forEach(f => {
        const bairro = f.properties.classe || "Sem bairro";
        if (!bairros[bairro]) bairros[bairro] = [];
        bairros[bairro].push(f);
      });

      configurarSidebar(data);
    })
    .catch(err => console.error("Erro ao carregar GeoJSON:", err));
}

let buscaProximosAbortada = false;
let buscaEmAndamento = false
 const interromperBuscaEcopontos = document.getElementById('interromperBuscaEcopontos')

function abortarEcopontosProximos() {
  if (!buscaEmAndamento) return;

  buscaProximosAbortada = true;
  buscaEmAndamento = false;
 

  const feedback = document.getElementById('feedback-proximidade');
  if (feedback) feedback.style.display = 'none';

  const btnEcopontosProximos = document.getElementById('btnEcopontosProximos');

  interromperBuscaEcopontos.style.display = 'none'
  btnEcopontosProximos.style.display = ''


  console.log("Busca de ecopontos próximos cancelada.");
}


function configurarSidebar(data) {
  const btnEcopontosProximos = document.getElementById('btnEcopontosProximos');
  const sidebar = document.getElementById("sidebar");
  const listaBairros = document.getElementById("listaBairros");
  const listaEcopontos = document.getElementById("listaEcopontos");
  const tituloBairros = document.getElementById("tituloBairros");
  const tituloEcopontos = document.getElementById("tituloEcopontos");
  const voltarBtn = document.getElementById("voltarBtn");
  const fecharBtn = document.getElementById("fecharSidebar");
  const abrirBtn = document.getElementById("abrirSideBar");
  const pesquisaInput = document.getElementById('pesquisaInput');
  const inputEcoPonto = document.getElementById('inputEcoPonto');

  btnEcopontosProximos.addEventListener('click', () => {

    if (buscaEmAndamento) {
      console.log("Já existe uma busca em andamento.");
      return;
    }

    buscaProximosAbortada = false;
    buscaEmAndamento = true;

    sidebar.style.display = '';
    if (!navigator.geolocation) {
      alert("Geolocalização não é suportada no seu navegador.");
      buscaEmAndamento = false;
      return;
    }

    const feedbackProximidade = document.getElementById('feedback-proximidade');
    btnEcopontosProximos.style.display = 'none'
    interromperBuscaEcopontos.style.display = ''

    feedbackProximidade.style.display = '';

    navigator.geolocation.getCurrentPosition(position => {

      if (buscaProximosAbortada) {
        console.log("Busca abortada");
        buscaEmAndamento = false;
        return;
      }

      const userLat = position.coords.latitude;
      const userLng = position.coords.longitude;
      const raioKm = 3;

      const ecopontosProximos = [];

      ecopontosLayer.eachLayer(layer => {
        if (buscaProximosAbortada) return;
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

      if (buscaProximosAbortada) {
        console.log("Busca abortada após cálculo.");
        interromperBuscaEcopontos.style.display ='none';
        btnEcopontosProximos.style.display = '';
        buscaEmAndamento = false;
        return;
      }

      feedbackProximidade.style.display = 'none'
      mostrarListaEcopontos(ecopontosProximos, listaBairros, listaEcopontos, tituloBairros, tituloEcopontos, voltarBtn, userLat, userLng);

      interromperBuscaEcopontos.style.display = 'none'
       btnEcopontosProximos.style.display = ''
       buscaEmAndamento = false;
        }, err => {
    console.error("Erro ao obter localização:", err);
    buscaEmAndamento = false;
    });
  });

  Object.keys(bairros).sort().forEach(bairro => {
    const li = document.createElement("li");
    li.textContent = bairro;
    li.addEventListener("click", () => mostrarEcopontos(bairro));
    listaBairros.appendChild(li);
  });

  voltarBtn.addEventListener("click", mostrarBairros);
  fecharBtn.addEventListener("click", () => sidebar.style.display = "none");
  abrirBtn.addEventListener("click", () => {
    sidebar.style.display = sidebar.style.display === 'none' ? '' : 'none';
  });

  pesquisaInput.addEventListener('click', () => {
    const nomeBusca = inputEcoPonto.value.toLowerCase();
    if (nomeBusca === '') {
      map.setView(userMarker.getLatLng(), 15);
      userMarker.openPopup();
      return;
    }

    ecopontosLayer.eachLayer(layer => {
      const nomeEcoponto = layer.feature.properties.nome.toLowerCase();
      if (nomeEcoponto.includes(nomeBusca)) {
        map.setView(layer.getLatLng(), 17);
        layer.openPopup();
      }
    });
  });

  inputBairros.addEventListener('input', function () {
    const valor = inputBairros.value.toLowerCase();
    listaBairros.innerHTML = "";

    const bairrosFiltrados = Object.keys(bairros).filter(b => b.toLowerCase().includes(valor));

    bairrosFiltrados.forEach(classe => {
      const li = document.createElement("li");
      li.textContent = classe;
      li.addEventListener("click", () => mostrarEcopontos(classe));
      listaBairros.appendChild(li);
    });

    if (valor === "") mostrarBairros();
  });

  mostrarBairros();
}

function mostrarListaEcopontos(
  ecopontosProximos,
  listaBairros,
  listaEcopontos,
  tituloBairros,
  tituloEcopontos,
  voltarBtn,
  userLat,
  userLng
) {
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

  ecopontosProximos.sort((a, b) => a.distancia - b.distancia);

  ecopontosProximos.forEach(eco => {
    const li = document.createElement("li");
    li.textContent = `${eco.nome} - ${eco.distancia} km`;

    li.addEventListener('click', () => {

      map.setView(eco.latlng, 17);

      ecopontosLayer.eachLayer(layer => {
        if (layer.feature.properties.nome === eco.nome) {
          layer.openPopup();
        }
      });
    });

    listaEcopontos.appendChild(li);
  });

  map.setView([userLat, userLng], 14);
}


function mostrarBairros() {
  document.getElementById("listaBairros").style.display = "";
  document.getElementById("tituloBairros").style.display = "";
  document.getElementById("listaEcopontos").style.display = "none";
  document.getElementById("tituloEcopontos").style.display = "none";
  document.getElementById("voltarBtn").style.display = "none";
}

function mostrarEcopontos(bairro) {
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

function calcularDistancia(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

document.getElementById('zoomInBtn').addEventListener('click', e => {
  e.preventDefault();
  map.zoomIn();
});

document.getElementById('zoomOutBtn').addEventListener('click', e => {
  e.preventDefault();
  map.zoomOut();
});
