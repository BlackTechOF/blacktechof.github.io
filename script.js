const btnLupaMapa = document.getElementById('ativarInput');
const inputEcoPonto = document.getElementById('inputEcoPonto');

btnLupaMapa.addEventListener('click', function () {
    
    inputEcoPonto.style.display = 'block';
   inputEcoPonto.classList.add('inputEcoPontoAtiva');
  });
  
