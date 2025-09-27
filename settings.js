const inputFontSize = document.getElementById('inputFontSize');
const demoFonte = document.getElementById('demoFonte');
const btnConfirmFont = document.getElementById('confirmFont');
const selectFont = document.getElementById('selectFont');
const selectCorFont = document.getElementById('selectCorFont');

// Pega os valores salvos no localStorage ao carregar a página
const valorFontSize = localStorage.getItem('fontSize');
const valorFontFamily = localStorage.getItem('fontFamily')
const valorFontColor = localStorage.getItem('fontColor');
;

// Adiciona um event listener para atualizar o estilo e o localStorage quando o valor da fonte mudar
selectFont.addEventListener('change', function(){
    demoFonte.style.fontFamily = selectFont.value;
});

selectCorFont.addEventListener('change', function(){
    demoFonte.style.color = selectCorFont.value;
})

// Adiciona um event listener para atualizar o estilo quando o valor do tamanho da fonte mudar
inputFontSize.addEventListener('input', function(){
    demoFonte.style.fontSize = inputFontSize.value + 'px';
});

// Adiciona um event listener para salvar no localStorage quando o botão for clicado
btnConfirmFont.addEventListener('click', function(){
    console.log(inputFontSize.value);
    localStorage.setItem("fontSize", inputFontSize.value);
    localStorage.setItem('fontFamily', selectFont.value);
    localStorage.setItem('fontColor', selectCorFont.value)
});

// Define os valores iniciais dos inputs e da demoFonte com os dados do localStorage (se existirem)
if (valorFontSize) {
    inputFontSize.value = valorFontSize;
    demoFonte.style.fontSize = valorFontSize + 'px'; // Aplica o estilo na demoFonte
}

if (valorFontFamily) {
    selectFont.value = valorFontFamily;
    demoFonte.style.fontFamily = valorFontFamily; // Aplica o estilo na demoFonte
}
