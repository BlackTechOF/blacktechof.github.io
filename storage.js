// Toggle Dark Mode
document.getElementById("darkModeToggle").addEventListener("click", () => {
  document.body.classList.toggle("dark");

  // opcional: salvar preferência no navegador
  if (document.body.classList.contains("dark")) {
    localStorage.setItem("theme", "dark");
  } else {
    localStorage.setItem("theme", "light");
  }
});

// aplicar preferência salva
window.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark");
  }
});

const chatContainer = document.getElementById('chat-container');
const botMsg = document.querySelector('.bot')
const messages = document.querySelector('.message')

function fontPrefs() {
  const injetaFontSize = localStorage.getItem('fontSize');
  if (!injetaFontSize) return;

  document.querySelectorAll('.message.bot, .message.user').forEach(el => {
    el.style.fontSize = injetaFontSize + 'px' || "16px";
  });

  const injetaFontFamily = localStorage.getItem('fontFamily');
  if (!injetaFontFamily) return;

   document.querySelectorAll('.message.bot, .message.user').forEach(el => {
    el.style.fontFamily = injetaFontFamily ;
  });
}

window.onload = fontPrefs;
