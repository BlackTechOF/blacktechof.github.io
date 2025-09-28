function fontPrefs() {
  const injetaFontSize = localStorage.getItem('fontSize');
  if (injetaFontSize) {
    document.querySelectorAll('.message.bot, .message.user').forEach(el => {
      el.style.fontSize = injetaFontSize + 'px';
    });
  }

  const injetaFontFamily = localStorage.getItem('fontFamily');
  if (injetaFontFamily) {
    document.querySelectorAll('.message.bot, .message.user').forEach(el => {
      el.style.fontFamily = injetaFontFamily;
    });
  }

  const injetaFontColor = localStorage.getItem('fontColor');
  if (injetaFontColor) {
    document.querySelectorAll('.message.bot, .message.user').forEach(el => {
      el.style.color = injetaFontColor;
    });
  }

  // sombra
  const valorSombraText = localStorage.getItem('sombraText') || 0;
  const valorSombraTextRight = localStorage.getItem('sombraTextDireita') || 0;
  const valorSombraTextDown = localStorage.getItem('sombraTextBaixo') || 0;
  const valorSombraTextColor = localStorage.getItem('sombraTextColor') || "#000000";

  const sombraChecked = localStorage.getItem('inputCheck');
  if (sombraChecked === 'true') {
    document.querySelectorAll('.message.bot, .message.user').forEach(el => {
      el.style.textShadow = `${valorSombraTextColor} ${valorSombraTextRight}px ${valorSombraTextDown}px ${valorSombraText}px`;
    });
  } else {
    document.querySelectorAll('.message.bot, .message.user').forEach(el => {
      el.style.textShadow = `none`;
    });
  }
}

window.addEventListener("DOMContentLoaded", fontPrefs);
