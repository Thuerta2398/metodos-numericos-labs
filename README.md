# Laboratorios interactivos · Métodos Numéricos (SCC-1017)

TecNM Campus Ensenada · Ingeniería en Sistemas Computacionales · Dr. T. Huerta

Página de inicio (enlaces a cada sesión) y verificador común, publicados con GitHub Pages: **https://thuerta2398.github.io/metodos-numericos-labs/**

| Ruta | Contenido |
|---|---|
| `sesion1/` | Redirige al sitio independiente https://thuerta2398.github.io/mn-u4-sesion1/ |
| `sesion2/` | Redirige al sitio independiente https://thuerta2398.github.io/mn-u4-sesion2/ |
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

Cada sesión vive en su propio repositorio (`mn-u4-sesion1`, `mn-u4-sesion2`) como un solo `index.html` autocontenido. Para una nueva: copiar ese repositorio, cambiar `window.LAB` (clave de almacenamiento, `labId`, etapas, huecos y reto) y agregar el `labId` al diccionario `LABS` de `verificar/index.html`.
