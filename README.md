# Laboratorios interactivos · Métodos Numéricos (SCC-1017)

TecNM Campus Ensenada · Ingeniería en Sistemas Computacionales · Dr. T. Huerta

Sitio estático publicado con GitHub Pages: **https://thuerta2398.github.io/metodos-numericos-labs/**

| Ruta | Contenido |
|---|---|
| `sesion1/` | Unidad 4, Sesión 1: derivada centrada, Richardson, trapecio y Simpson 1/3 |
| `sesion2/` | Unidad 4, Sesión 2: Romberg, Gauss-Legendre, cuadratura adaptativa y Simpson 3/8 + 1/3 con datos |
| `verificar/` | Verificador de constancias (uso docente) |
| `assets/integridad.js` | Registro de integridad, código de verificación y folio |
| `assets/motor.js` | Motor común: rompecabezas de Parsons, completar código, constancia PNG |

Cada laboratorio tiene tres niveles: rompecabezas de Parsons (Nivel 1), completar código con verificación numérica de expresiones (Nivel 2) y un reto opcional (Nivel 3). Al terminar el Nivel 2 se genera la constancia PNG y un código de verificación.

## Registro de integridad

- **Salidas de la ventana**: cambio de pestaña o de aplicación (más de 0.8 s), con el tiempo fuera. Con más de **4** salidas aparece un aviso permanente y la constancia queda marcada **CON INCIDENCIAS**.
- **Pegado**: se bloquea cualquier pegado o arrastre de más de **5** caracteres y se registra el intento.
- **Captura de pantalla**: se detecta la tecla Impr Pant y los atajos que llegan al navegador; en macOS y en celulares el sistema no lo informa (suele registrarse como salida de la ventana).
- **Reinicios**: reiniciar la actividad borra el avance, pero no el registro de integridad.

El folio y el código de verificación incluyen nombre, número de control, tiempos, intentos, pistas y el registro de integridad; cualquier modificación invalida el folio en `verificar/`. Es un control disuasivo del lado del cliente, no una garantía criptográfica.

## Para agregar un laboratorio

Copiar `sesion1/index.html`, cambiar `window.LAB` (clave de almacenamiento, `labId`, etapas, huecos y reto) y agregar el `labId` al diccionario `LABS` de `verificar/index.html`.
