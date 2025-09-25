const inputFontSize = document.getElementById('inputFontSize');
const demoFonte = document.getElementById('demoFonte');

inputFontSize.addEventListener('input', function(){
    demoFonte.style.fontSize = inputFontSize.value + 'px'
});

inputFontSize.addEventListener('input', function(){
    console.log(inputFontSize.value)
 localStorage.setItem("fontSize", inputFontSize.value);
 localStorage.getItem('fontSize');
})




