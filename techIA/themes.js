const sidebar = document.querySelector(".sidebar");

function darkMode() {
          document.body.classList.toggle("dark");
        if (document.body.classList.contains("dark")) {
          localStorage.setItem('theme', 'dark')
        } else {
          localStorage.setItem('theme', 'light')
        }
      }
      
