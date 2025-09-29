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
const borderText = document.getElementById('borderText');
const backgroundText = document.getElementById('backgroundText');
const userText = document.getElementById('user')
const botText = document.getElementById('bot')

const inputsShadowText = document.querySelectorAll('#shadowTextRight, #shadowTextDown, #shadowTextBorrado');

const valorFontSize = localStorage.getItem('fontSize');
const valorFontFamily = localStorage.getItem('fontFamily');
const valorFontColor = localStorage.getItem('fontColor');
const valorSombraText = localStorage.getItem('sombraText');
const valorSombraTextRight = localStorage.getItem('sombraTextDireita');
const valorSombraTextDown = localStorage.getItem('sombraTextBaixo');
const valorSombraTextColor = localStorage.getItem('sombraTextColor');
const getCheckShadowText = localStorage.getItem('inputCheck');

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

backgroundText.addEventListener('input', function(){
    if (backgroundText.checked === true) {
      userText.style.background = '#edebeb'
      localStorage.setItem('backgroundText', 'true')
    } else {
        userText.style.background = 'none'
      localStorage.setItem('backgroundText', 'false')
    }
}); 

borderText.addEventListener('input', function(){
    if (borderText.checked === true) {
        userText.style.border = 'solid black'
        localStorage.setItem('borderText', 'true')
    } else {
        userText.style.border = 'none'
        localStorage.setItem('borderText', 'false')
    }
})

checkTextShadow.addEventListener('input', function () {
    if (checkTextShadow.checked) {
        localStorage.setItem('inputCheck', 'true');
        inputCorTextShadow.disabled = false;
        inputsShadowText.forEach(input => input.disabled = false);
        inputCorTextShadow.classList.remove('inputDisabled')
        demoFonte.style.textShadow = `${inputCorTextShadow.value} 1px 2px 1px`;
    } else {
        localStorage.setItem('inputCheck', 'false');
        inputCorTextShadow.disabled = true;
        inputsShadowText.forEach(input => input.disabled = true);
        inputCorTextShadow.classList.add('inputDisabled')
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
    console.log('Alterações Salvas');
    localStorage.setItem('fontSize', inputFontSize.value);
    localStorage.setItem('fontFamily', selectFont.value);
    localStorage.setItem('fontColor', selectCorFont.value);
    localStorage.setItem('sombraText', shadowTextBorrado.value);
    localStorage.setItem('sombraTextDireita', shadowTextDireita.value);
    localStorage.setItem('sombraTextBaixo', shadowTextBaixo.value);
    localStorage.setItem('sombraTextColor', inputCorTextShadow.value);
});
