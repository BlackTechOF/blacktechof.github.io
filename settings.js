const inputFontSize = document.getElementById('inputFontSize');
const demoFonte = document.getElementById('demoFonte');

inputFontSize.addEventListener('input', function(){
    demoFonte.style.fontSize = inputFontSize.value + 'px'
});

inputFontSize.addEventListener('keydown', function(e){
  if (e.key === 'Enter') {
    console.log(inputFontSize.value)
 localStorage.setItem("fontSize", inputFontSize.value);
 localStorage.getItem('fontSize');
  }
})



