function resetFontSize() {
    const inputFontSize = document.getElementById('inputFontSize')
    inputFontSize.value = 16
    demoFonte.style.fontSize = inputFontSize.value + 'px'
}

function resetFontFamily() {
    const selectFonte = document.getElementById('selectFont')
    selectFonte.value = ''
    demoFonte.style.fontFamily = selectFonte.value
}

function resetFontColor() {
    const selectCorFont = document.getElementById('selectCorFont')
    selectCorFont.value = ''
    demoFonte.style.color = selectCorFont.value
}

function resetFontStyles() {
    const inputCorTextShadow = document.getElementById("inputCorTextShadow");
    const inputsShadowText = document.querySelectorAll('#shadowTextRight, #shadowTextDown, #shadowTextBorrado')
    const inputCheckTextShadow = document.getElementById('inputCheckTextShadow')
    inputCheckTextShadow.checked = false;
    inputsShadowText.forEach(input => input.disabled = true);
    inputsShadowText.forEach(input => input.value = 0);
    inputCorTextShadow.disabled = true
    inputCorTextShadow.classList.add('inputDisabled')
    demoFonte.style.textShadow = 'none'
}