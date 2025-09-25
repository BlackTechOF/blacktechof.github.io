const inputFontSize = document.getElementById('inputFontSize');
const demoFonte = document.getElementById('demoFonte');

inputFontSize.addEventListener('keydown', function(e){
  if (e.key === 'Enter') {
    console.log(inputFontSize.value)
  }
})
console.log(inputFontSize.value)

inputFontSize.addEventListener('input', function(){
    demoFonte.style.fontSize = inputFontSize.value + 'px'
})

const setarFontSize = localStorage.setItem("fontSize", inputFontSize.value);

const fonteSalva = localStorage.getItem('fontSize');


