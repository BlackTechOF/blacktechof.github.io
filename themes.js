document.addEventListener("DOMContentLoaded", () => {
      const darkToggle = document.getElementById("darkModeToggle");
      if (darkToggle) {
        darkToggle.addEventListener("click", () => {
          document.body.classList.toggle("dark");
        });
      }
    });

function darkModeAuth() {
    document.body.classList.toggle("dark");
}