// Tema
const toggle = document.getElementById("toggleTheme");
toggle.onclick = () => document.body.classList.toggle("dark");

// Formulário (protótipo funcional)
document.getElementById("form").addEventListener("submit", function(e){
    e.preventDefault();
    document.getElementById("msg").innerText = "Formulário enviado! (Protótipo)";
});
