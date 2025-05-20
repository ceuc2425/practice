
let mostrado = false;
const limpiarMensaje = () => {
  setTimeout(() => {
    const elem = document.getElementById("mensaje-mov");
    const elem2 = document.getElementById("motivacion");
    if (elem) elem.innerHTML = "";
    if (elem2) elem2.innerHTML = "";
  }, 50000);
}


export const msgK = (page) => {
    let msg;
    switch (page) {
        case 1:
            msg = "Te quiero mucho. ¡Espero ganes tus exámenes! Besos de parte de Carlitos ❤️, selecciona un tema de estudio y comienz a apracticar tus tests, las preguntas salieron de los temas que me diste";
            break;
        case 2:
            msg = "Te voy hacer la cena porque te quiero y d everdad te deseo lo mejor";
            break;
        case 3:
            msg = "Ya casi terminas el test tu puedes!";
            break;
        case 4:
            msg = "Tengo ganas de...";
            break;
        case 5:
            msg = "Darte un beso lo siento por hacerte cabrear";
            break;
        default:
            msg = "Te quiero mucho. ¡Espero ganes tus exámenes! Besos de parte de Carlitos ❤️, selecciona un tema de estudio y comienz a apracticar tus tests, las preguntas salieron de los temas que me diste";
            break;
    }
    limpiarMensaje ();
  
    return msg;  // <-- agregar return aquí
}
