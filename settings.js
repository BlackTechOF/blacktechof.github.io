const inputFontSize = document.getElementById('inputFontSize');
const demoFonte = document.getElementById('demoFonte');
const btnConfirmFont = document.getElementById('confirmFont');
const selectFont = document.getElementById('selectFont');
const selectCorFont = document.getElementById('selectCorFont');
const checkTextShadow = document.getElementById('inputCheckTextShadow');
const inputCorTextShadow = document.getElementById("inputCorTextShadow");
const shadowTextBorrado = document.getElementById('shadowTextBorrado');
const shadowTextDireita = document.getElementById('shadowTextRight');
const shadowTextBaixo = document.getElementById('shadowTextDown');

const inputsShadowText = document.querySelectorAll('#shadowTextRight, #shadowTextDown, #shadowTextBorrado');

// 🔹 Carregar valores do localStorage
const valorFontSize = localStorage.getItem('fontSize');
const valorFontFamily = localStorage.getItem('fontFamily');
const valorFontColor = localStorage.getItem('fontColor');
const valorSombraText = localStorage.getItem('sombraText');
const valorSombraTextRight = localStorage.getItem('sombraTextDireita');
const valorSombraTextDown = localStorage.getItem('sombraTextBaixo');
const valorSombraTextColor = localStorage.getItem('sombraTextColor');
const getCheckShadowText = localStorage.getItem('inputCheck');

// 🔹 Restaurar valores na interface
if (valorFontSize) {
    inputFontSize.value = valorFontSize;
    demoFonte.style.fontSize = valorFontSize + 'px';
}

if (valorFontFamily) {
    selectFont.value = valorFontFamily;
    demoFonte.style.fontFamily = valorFontFamily;
}

if (valorFontColor) {
    selectCorFont.value = valorFontColor;
    demoFonte.style.color = valorFontColor;
}

if (getCheckShadowText) {
    checkTextShadow.checked = getCheckShadowText === 'true';
}

if (checkTextShadow.checked) {
    inputCorTextShadow.disabled = false;
    inputsShadowText.forEach(input => input.disabled = false);

    // aplica valores salvos da sombra
    if (valorSombraTextColor) inputCorTextShadow.value = valorSombraTextColor;
    if (valorSombraText) shadowTextBorrado.value = valorSombraText;
    if (valorSombraTextRight) shadowTextDireita.value = valorSombraTextRight;
    if (valorSombraTextDown) shadowTextBaixo.value = valorSombraTextDown;

    demoFonte.style.textShadow = `${inputCorTextShadow.value} ${shadowTextDireita.value}px ${shadowTextBaixo.value}px ${shadowTextBorrado.value}px`;
} else {
    inputCorTextShadow.disabled = true;
    inputsShadowText.forEach(input => input.disabled = true);
    demoFonte.style.textShadow = 'none';
}

// 🔹 Eventos
checkTextShadow.addEventListener('input', function () {
    if (checkTextShadow.checked) {
        localStorage.setItem('inputCheck', 'true');
        inputCorTextShadow.disabled = false;
        inputsShadowText.forEach(input => input.disabled = false);
        demoFonte.style.textShadow = `${inputCorTextShadow.value} 1px 2px 1px`;
    } else {
        localStorage.setItem('inputCheck', 'false');
        inputCorTextShadow.disabled = true;
        inputsShadowText.forEach(input => input.disabled = true);
        demoFonte.style.textShadow = 'none';
    }
});

inputsShadowText.forEach(input => {
    input.addEventListener('input', function () {
        demoFonte.style.textShadow = `${inputCorTextShadow.value} ${shadowTextDireita.value}px ${shadowTextBaixo.value}px ${shadowTextBorrado.value}px`;
    });
});

inputCorTextShadow.addEventListener('input', function () {
    demoFonte.style.textShadow = `${inputCorTextShadow.value} ${shadowTextDireita.value}px ${shadowTextBaixo.value}px ${shadowTextBorrado.value}px`;
});

selectFont.addEventListener('change', function () {
    demoFonte.style.fontFamily = selectFont.value;
});

selectCorFont.addEventListener('change', function () {
    demoFonte.style.color = selectCorFont.value;
});

inputFontSize.addEventListener('input', function () {
    demoFonte.style.fontSize = inputFontSize.value + 'px';
});

btnConfirmFont.addEventListener('click', function () {
    localStorage.setItem('fontSize', inputFontSize.value);
    localStorage.setItem('fontFamily', selectFont.value);
    localStorage.setItem('fontColor', selectCorFont.value);
    localStorage.setItem('sombraText', shadowTextBorrado.value);
    localStorage.setItem('sombraTextDireita', shadowTextDireita.value);
    localStorage.setItem('sombraTextBaixo', shadowTextBaixo.value);
    localStorage.setItem('sombraTextColor', inputCorTextShadow.value);
});
