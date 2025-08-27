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
