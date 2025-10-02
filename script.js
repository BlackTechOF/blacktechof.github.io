const btnLupaMapa = document.getElementById('ativarInput');
const inputEcoPonto = document.getElementById('inputEcoPonto');

let inputativo = false;

btnLupaMapa.addEventListener('click', function () {
  inputativo = !inputativo;

  if (inputativo) {
    inputEcoPonto.style.display = 'block';
    inputEcoPonto.classList.remove('inputEcoPontoDesativa');
    inputEcoPonto.classList.add('inputEcoPontoAtiva');
  } else {
    inputEcoPonto.classList.remove('inputEcoPontoAtiva');
    inputEcoPonto.classList.add('inputEcoPontoDesativa');

    inputEcoPonto.addEventListener("animationend", function esconder() {
      if (!inputativo) { 
        inputEcoPonto.style.display = 'none';
      }
      inputEcoPonto.removeEventListener("animationend", esconder);
    });
  }
});

document.getElementById('inputEcoPonto').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    const nomeBusca = this.value.trim().toLowerCase();


    if (nomeBusca === '') {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;
             
      map.setView([latitude, longitude], 13, zoomControl);
    })
  }}
    ecopontosLayer.eachLayer(function(layer) {
      const nomeEcoponto = layer.feature.properties.nome.toLowerCase();
      if (nomeEcoponto.includes(nomeBusca)) {
        map.setView(layer.getLatLng(), 15);
        layer.openPopup();
      }
    });
  }
});



