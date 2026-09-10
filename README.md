Pokédex Web App
Una aplicación web moderna, rápida y responsiva construida con HTML5, CSS3 y JavaScript vanilla. La aplicación consume la API pública de PokéAPI para explorar y buscar información detallada sobre los primeros 151 Pokémon de la primera generación.
✨ Características principales
Carga paralela eficiente: Consume la PokéAPI para obtener datos en tiempo real de los 151 Pokémon iniciales de manera optimizada.
Búsqueda en tiempo real: Permite filtrar Pokémon de forma instantánea por nombre o por número/ID (#001, Pikachu, etc.).
Diseño retro-moderno: Estética inspirada en la Pokédex clásica con degradados de color rojo, bordes redondeados y efectos visuales de elevación al pasar el cursor.
Badges dinámicos de tipos: Identificación visual inmediata con esquemas de color específicos para cada tipo de Pokémon (Fuego, Agua, Planta, Eléctrico, etc.).
100% Responsiva: Adaptada completamente para pantallas de escritorio, tablets y dispositivos móviles utilizando CSS Grid y Flexbox.
Cero dependencias externas: Desarrollada completamente con JavaScript puro (ES6+), sin requerir frameworks ni librerías adicionales.
🚀 Tecnologías utilizadas
Tecnología
Uso y Descripción
 
HTML5
Estructura semántica de la interfaz y contenedor de la aplicación.
CSS3
Estilos personalizados, variables de color, layout dinámico con Grid/Flexbox y animaciones.
JavaScript (ES6+)
Lógica de consumo de API (fetch, async/await), manipulación del DOM y sistema de filtrado.
PokéAPI
API REST pública utilizada como fuente de datos de los Pokémon.

📁 Estructura del Proyecto
pokedex-app/
├── pokedex.html    # Archivo principal con HTML, CSS e integración de JS
└── README.md       # Documentación del proyecto


🔧 Instalación y Uso
Clonar o descargar el repositorio:
git clone https://github.com/tu-usuario/pokedex-web.git
Abrir la aplicación:
Simplemente abre el archivo pokedex.html en tu navegador web preferido. No requiere servidor local ni instalación de paquetes de Node.js.
💡 Cómo funciona la aplicación
Al cargar la página, se ejecuta una consulta fetch a la PokéAPI para listar los primeros 151 Pokémon.
Se procesan en paralelo las peticiones individuales de cada Pokémon para obtener su ilustración oficial (official-artwork), ID y tipos.
Los datos recopilados se almacenan en memoria local dentro de la aplicación, lo que permite realizar búsquedas instantáneas sin necesidad de hacer peticiones adicionales a la red.
