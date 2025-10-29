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

function messageStylesPrefs() {
const valorBackgroundText = localStorage.getItem('backgroundText');

  if (valorBackgroundText === 'true') {
     document.querySelectorAll('.message.bot, .message.user').forEach(el => {
      el.style.background = '#edebeb';
    })
  } else {
    document.querySelectorAll('.message.bot, .message.user').forEach(el => {
      el.style.background = 'none';
  })
}
}

const setarTema = localStorage.getItem('theme');

if (setarTema === 'dark') {
  document.body.classList.add('dark');
} else {
  document.body.classList.remove('dark')
}

window.addEventListener("DOMContentLoaded", messageStylesPrefs);
window.addEventListener("DOMContentLoaded", fontPrefs);


