# tetra-unfold

[English](README.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Deutsch](README.de.md) | [Français](README.fr.md) | **Español** | [Русский](README.ru.md)

> Este documento es una traducción de la versión en inglés. Si hay diferencias, prevalece la [versión en inglés](README.md).

Desplegar toda la esfera sobre un **tetraedro regular** y aplanarla en un rectángulo que **tesela el plano sin costuras**.

La demostración usa un mapa del mundo y se inspira en el [mapa del mundo AuthaGraph](https://www.authagraph.com/) de Hajime Narukawa. No es una implementación de AuthaGraph: su algoritmo está patentado y no se ha publicado, así que este proyecto usa su propia aproximación. El mismo método también sirve para **imágenes de cámaras 360°**, de modo que un modelo de IA pueda ver toda la esfera en una sola imagen plana.

![Demostración: al arrastrar, el Polo Norte se desliza hasta el Polo Sur, y el planificador encuentra el orden más corto para nueve aeropuertos](media/demo.gif)

## Demostraciones

**Pruébalo en línea: <https://iantpe.github.io/tetra-unfold/?lang=es>**

El mapa está disponible en 繁體中文, 简体中文, English, 日本語, 한국어, Deutsch, Français, Español y Русский. Elige automáticamente el idioma del navegador; se puede cambiar con el menú del panel o añadiendo `?lang=` a la dirección (`zh-Hant`, `zh-Hans`, `en`, `ja`, `ko`, `de`, `fr`, `es`, `ru`).

El itinerario, el radio de distancia, el giro del mapa y los ajustes se guardan en la dirección a medida que trabajas, así que puedes guardar la página en favoritos o enviarla y se abrirá exactamente igual. **Copiar enlace para compartir** en el panel copia la dirección. Por ejemplo, [este enlace](https://iantpe.github.io/tetra-unfold/?lang=es&trip=TPE,NRT,LHR,SIN&range=TPE,5000) abre el itinerario Taipéi → Tokio → Londres → Singapur con un radio de 5.000 km alrededor de Taipéi. No se guarda nada en ningún servidor; todo está en la dirección.

El mapa es un solo archivo HTML más `i18n.js` (textos de la interfaz), `airports.json` y `names/<idioma>.json` (nombres de aeropuertos y ciudades). No hay nada que instalar ni compilar. Se necesita conexión a Internet para cargar D3 y los datos de los países.

| Archivo | Contenido |
|---|---|
| [`index.html`](index.html) · [abrir](https://iantpe.github.io/tetra-unfold/?lang=es) | Mapa del mundo tetraédrico. Una arista del tetraedro forma la línea central vertical del mapa a lo largo del meridiano 90° E, con vértices en el centro de los bordes superior e inferior. Al principio el Polo Norte está en el vértice de arriba; al arrastrar hacia arriba y hacia abajo, el globo se desliza a lo largo de esa arista hasta que el Polo Sur queda en el vértice de abajo (los botones **Polo Norte arriba** y **Polo Sur abajo** saltan directamente entre ambos). El arrastre se detiene en esas dos posiciones; una casilla quita el límite para seguir girando el globo. En las dos posiciones, los demás vértices quedan en los océanos. Teselado continuo, giro del globo al arrastrar, corrección de áreas opcional, pliegues del tetraedro y nombres de los países al pasar el ratón. |

Controles:

- Arrastrar: girar el globo (en `index.html`, Mayús + arrastrar desplaza la vista)
- Rueda del ratón: zoom (`index.html`)
- Pasar el ratón: ver el nombre del país y las coordenadas
- En el móvil (`index.html`): un dedo gira el globo y dos dedos acercan y desplazan la vista. Al tocar se ve el nombre. Para añadir un aeropuerto, tócalo y pulsa **Añadir al itinerario**. Los ajustes y el itinerario están en la barra de la parte inferior de la pantalla: tócala o desliza hacia arriba para abrirla

### Planificar un viaje con varias paradas (`index.html`)

El mapa es útil para comprobar las direcciones de vuelo: con la corrección de áreas desactivada (por defecto), cada cara triangular es una proyección gnomónica, así que una ruta ortodrómica es una línea recta dentro de una cara y solo se quiebra donde cruza un pliegue.

- Los aeropuertos se añaden haciendo clic en los puntos del mapa o escribiendo un código IATA, una ciudad, un nombre de aeropuerto o un país, en el idioma elegido o en inglés (por ejemplo `TPE`, `London`, `Londres`, `ロンドン`). Si una ciudad tiene varios aeropuertos, aparece primero el que tiene más pasajeros. Al acercar el zoom también se ven los aeropuertos medianos.
- Cada tramo se dibuja como una ruta ortodrómica, con su distancia y el total del viaje. Marca **Volver al punto de partida** para un viaje de ida y vuelta.
- **Calcular el mejor orden** mantiene la primera parada como salida, y busca para las demás el orden de menor distancia total. Un viaje puede tener hasta 30 paradas: hasta 16, el resultado es realmente el más corto; con más, es aproximado y puede no ser el más corto.
- Cuando parte de la ruta no se ve, el mapa gira para agruparla lo mejor posible, con el norte siempre arriba. Ocurre al añadir una parada o calcular el orden, y al abrir un enlace sin un giro guardado. **Centrar la ruta** hace lo mismo en cualquier momento. Un viaje alrededor del mundo no puede evitar cortarse: su salida aparece entonces a ambos lados del mapa.
- Las distancias son ortodrómicas, sobre una esfera de 6371 km de radio. Las rutas reales suelen ser algo más largas.

#### Comparar billetes con un asistente de IA en el navegador

El mapa encuentra el orden con la menor distancia, pero no los vuelos más baratos ni los más rápidos. De eso puede encargarse un asistente de IA que maneje tu navegador, como Claude in Chrome o el agente de ChatGPT: lee el orden en el mapa, busca cada tramo en un sitio como Google Vuelos y compara las combinaciones. Por ejemplo:

> Abre https://iantpe.github.io/tetra-unfold/ y planifica un viaje desde Taipéi (TPE) a Tokio, Singapur y Londres, con regreso a Taipéi. Compara el orden que encuentra el mapa con los demás órdenes. Después busca en Google Vuelos billetes de ida en clase turista para el 1, 4, 7 y 10 de diciembre, y enumera para cada orden el precio total y el tiempo total de viaje.

Una prueba con exactamente este viaje (precios mostrados en noviembre de 2026, un adulto, clase turista, billetes de ida con impuestos, en nuevos dólares taiwaneses):

| Orden de visita (regreso a Taipéi) | Distancia ortodrómica | Vuelos encontrados | Precio total | Tiempo total |
|---|---:|---|---:|---:|
| Tokio → Singapur → Londres | 28.206 km | Tramo a Londres vía Shanghái | NT$49.198 | 47 h 30 min |
| Tokio → Singapur → Londres | 28.206 km | Tramo a Londres vía Doha | NT$50.509 | 44 h 05 min |
| Tokio → Londres → Singapur (el orden del mapa) | 25.878 km | Vía Shanghái y Múnich | NT$50.779 | 45 h 50 min |

- **El orden más corto no siempre es el más barato.** El orden del mapa ahorró 2.328 km (8,3 %), pero en estas fechas sus vuelos costaron algo más. Los precios dependen sobre todo de qué aerolíneas vuelan cada ruta.
- **La escala puede importar tanto como el orden.** Hacer escala en Doha en vez de en Shanghái entre Singapur y Londres costó NT$1.311 más, pero ahorró 3 h 25 min.
- **Los vuelos nocturnos acortan las estancias**, algo que el mapa no puede mostrar.

Así que usa el mapa para descartar los órdenes que dan vueltas y deja que el asistente compare los precios de los pocos órdenes que quedan. El asistente solo busca; reserva y paga tú. Los precios cambian constantemente, y un billete multidestino puede salir más barato que varios billetes de ida por separado, así que pídele que lo compruebe también.

### Radio de distancia (`index.html`)

Elige un centro (código de aeropuerto, ciudad o la primera parada del itinerario) y un radio en kilómetros u horas de vuelo. El mapa colorea todos los lugares que quedan dentro de esa distancia ortodrómica y enumera las ciudades con aeropuertos grandes dentro del círculo, de la más cercana a la más lejana. Al pasar el ratón por cualquier punto se ve su distancia al centro.

En el globo la zona es un círculo, pero en este mapa no: dentro de una cara es un óvalo suave y se dobla al cruzar un pliegue. Por ejemplo, un círculo de 5.000 km alrededor de Taipéi alcanza Delhi (4.373 km) y Darwin (4.298 km), pero se queda justo antes de Bombay (5.002 km). Las horas de vuelo se convierten con una media de 800 km/h, así que son solo una estimación.

## Cómo funciona

### Por qué tesela sin costuras

El plano se cubre con una malla de triángulos equiláteros de lado 1. Si se agrupan los puntos de la malla `(i, j)` según la paridad de `i` y `j`, salen exactamente 4 clases, una por cada vértice del tetraedro, y cada triángulo pequeño se convierte en una cara del tetraedro.

En cada vértice de un tetraedro regular se juntan tres caras, así que el ángulo total alrededor de un vértice es 3 × 60° = **180°**. Por eso todo el plano es la superficie del tetraedro repetida mediante giros de 180° alrededor de cada punto de la malla. El rectángulo `[0, 2] × [0, √3/2]` contiene exactamente un mapa completo. Las filas vecinas están giradas 180°, de modo que las copias del mapa encajan infinitamente en todas las direcciones. `index.html` gira esta malla 90° para que una arista quede vertical: su mapa es el rectángulo `√3 × 1`, con un vértice en el punto medio de cada lado y ninguno en el interior, que también es exactamente un mapa completo.

### Del plano a la esfera

Cada píxel se calcula así:

1. Buscar el triángulo pequeño que contiene el píxel y calcular sus coordenadas baricéntricas.
2. Con esas coordenadas, tomar un punto en la cara correspondiente del tetraedro.
3. Llevar ese punto a la esfera, en uno de dos modos:
   - **Sin corrección (gnomónica)**: proyectar en línea recta desde el centro de la esfera. Cada cara parece la imagen de una cámara estenopeica de gran angular extremo, y **las rectas siguen siendo rectas**.
   - **Con corrección de áreas**: redistribuir las distancias a lo largo de cada rayo que sale del centro de la cara, para que las áreas del mapa sean aproximadamente proporcionales a las de la esfera.
4. Aplicar la matriz de rotación para obtener la longitud y la latitud, y tomar el color de una textura equirrectangular.

Como cada píxel se calcula a la inversa, no hace falta recortar polígonos, y el teselado y la rotación salen casi gratis.

### La distorsión en los vértices es inevitable

Alrededor de un vértice del tetraedro solo hay 180°, pero alrededor de cualquier punto de una esfera hay 360°. Por eso la zona cercana a cada uno de los 4 vértices se estira aproximadamente al doble, sea cual sea la fórmula. AuthaGraph tiene la misma distorsión y coloca sus vértices en los océanos.

## Aplicación: cámaras 360°, reconocimiento con IA y actitud de drones

Las cámaras 360° suelen exportar imágenes equirrectangulares (panorámicas 2:1). Es el mismo formato que la textura del mapa del mundo usada aquí, así que el método funciona sustituyendo la textura por una foto 360°.

Comparado con los formatos habituales:

- **Equirrectangular**: los objetos se cortan en los bordes izquierdo y derecho, y los polos quedan muy estirados.
- **Cubemap (6 caras)**: cada cara parece una foto normal, pero hay muchas costuras, y los objetos que las cruzan requieren un tratamiento aparte.
- **Desplegado tetraédrico**: una sola imagen rectangular de toda la esfera, sin cortes, que se puede pasar directamente a los modelos de imagen habituales. El inconveniente es la distorsión cerca de los 4 vértices.

### Disposición de horizonte

[`unfold360.py`](unfold360.py) usa la misma red `√3 × 1` que `index.html` (una arista del tetraedro atraviesa el centro en vertical), orientada de modo que, con la cámara nivelada:

- **La línea central horizontal es el horizonte.** La mitad superior de la imagen es todo cielo y la mitad inferior todo suelo, cada una exactamente media esfera.
- El centro de la imagen mira hacia delante. Justo detrás queda en las cuatro esquinas, y el horizonte continúa por los bordes izquierdo y derecho.
- El cénit está a 1/4 y 3/4 del borde superior, y el nadir en los mismos puntos del borde inferior.
- Los 4 vértices del tetraedro están en el centro de los bordes superior e inferior (54,7° por encima y por debajo del horizonte, hacia delante) y en el punto medio de los bordes izquierdo y derecho (sobre el horizonte, a 125,3° a cada lado).

Como la distorsión de los vértices no se puede evitar, la imagen puede **desplegarse dos veces, en dos orientaciones**, y cada dirección se lee en la imagen en la que queda más lejos de un vértice. **B es A girado 180°** alrededor del eje vertical. Los 4 vértices de A son simétricos por encima y por debajo del horizonte, así que tras el giro los de B caen justo en el lado opuesto a los de A, en el centro de cada cara de A, donde A tiene menos distorsión. En ambas imágenes el cielo queda arriba. Así, toda dirección queda al menos a 35,3° de un vértice en una de las dos imágenes, incluido cada punto del horizonte:

| Giro de B | Dirección más desfavorable, distancia a un vértice |
|---|---|
| 180° | 35,3° |
| 150° | 20,3° |
| 90° | 9,8° |
| 0° | 0° (imágenes idénticas) |

```
pip install numpy pillow
python unfold360.py photo.jpg out/
```

### Actitud de drones: distinguir el cielo del suelo

Un dron sabe dónde está arriba gracias a su IMU (giroscopio y acelerómetro). Pero el acelerómetro mide la gravedad **más la aceleración propia del dron**, así que durante ráfagas de viento, choques, vuelcos o maniobras bruscas el «abajo» que indica es erróneo, y el giroscopio por sí solo deriva con el tiempo. El magnetómetro también se ve alterado fácilmente por interferencias electromagnéticas.

El límite entre cielo y suelo en una imagen 360° es una **referencia independiente**: no le afectan las interferencias electromagnéticas ni la aceleración del dron. La idea es **combinarla con la IMU**: usar la IMU normalmente y, cuando el dron sufre perturbaciones y no se puede confiar en el acelerómetro, corregir la actitud con la dirección hacia arriba que se ve en la imagen. Esto es especialmente importante para drones que deben seguir volando bajo interferencias.

La disposición de horizonte se presta a ello:

- Una sola imagen sin costuras cubre toda la esfera, así que el cielo nunca queda partido por los bordes de la imagen, gire como gire el dron.
- Con el dron nivelado, la mitad superior es cielo y la inferior suelo, lo que facilita el etiquetado para entrenar un modelo de segmentación de cielo y suelo.
- En el modo con corrección de áreas, cada píxel cubre el mismo ángulo sólido, así que las direcciones de los píxeles se pueden promediar directamente.

#### Prueba

[`drone_attitude.py`](drone_attitude.py) simula un dron en 300 actitudes aleatorias por foto, incluso boca abajo. Para cada una, despliega la imagen 360° en el sistema de referencia del propio dron (128 × 74 píxeles, con corrección de áreas) y estima «arriba» con una regla deliberadamente sencilla:

- Los píxeles claros y azulados son cielo. El umbral se elige automáticamente para cada imagen (método de Otsu).
- Se ignoran las zonas negras «sin datos».
- La dirección hacia arriba es la dirección media de los píxeles de cielo menos la de los píxeles de suelo.

Se probó con seis panorámicas aéreas 360° de Wikimedia Commons (de Gunther Tschuch, CC BY-SA 4.0):

| Terreno | Boca abajo | Error (mediana) | Error (90 %) | Peor | Tiempo por estimación |
|---|---|---|---|---|---|
| Tierras de cultivo (Sebnitz) | 0 / 300 | 5,4° | 8,5° | 10,7° | 0,9 ms |
| Ciudad (Bad Karlshafen) | 0 / 300 | 6,6° | 10,7° | 13,9° | 0,9 ms |
| Ciudad en un valle fluvial (Hirschhorn) | 0 / 300 | 7,6° | 11,4° | 16,7° | 0,9 ms |
| Costa de una isla (Skye) | 0 / 300 | 11,1° | 16,1° | 20,5° | 0,9 ms |
| Lago (Loch Tay) | 0 / 300 | 11,5° | 16,2° | 18,4° | 0,9 ms |
| Costa y montañas (Mull) | 0 / 300 | 13,6° | 18,1° | 22,3° | 0,9 ms |

| Nivelado | Inclinado 70° | Vuelto a nivelar con la estimación |
|---|---|---|
| ![Nivelado](examples/aerial_level.jpg) | ![Inclinado](examples/aerial_tilted.jpg) | ![Estabilizado](examples/aerial_stabilized.jpg) |

Resultados:

- **En 1800 actitudes aleatorias, el cielo y el suelo nunca se invirtieron.** La dirección se desvió entre 5 y 14° (mediana), como máximo 22°, y cada estimación tardó menos de 1 ms en Python en la CPU de un ordenador de sobremesa.
- El agua que refleja el cielo (lagos, costas) produce los mayores errores.
- **La cámara tiene que poder ver el cielo.** Estas panorámicas son negras por encima de unos 25° de elevación, porque la cámara cuelga debajo del dron. Antes de excluir las zonas negras, la mayoría de las actitudes salían boca abajo. Un dron que use este método necesita cámaras que cubran también el hemisferio superior, por ejemplo una cámara 360° con objetivos por encima y por debajo del fuselaje.
- Las panorámicas tomadas desde el suelo (1,5 m) no son representativas de un dron en vuelo: los árboles y los edificios tapan gran parte del cielo.

Limitaciones:

- Los vuelcos se simulan girando una panorámica fija. No se han probado el desenfoque de movimiento, los cambios bruscos de exposición, las hélices dentro del encuadre ni el contraluz.
- La regla de brillo falla de noche, sobre nieve y por encima de las nubes. Haría falta un modelo entrenado de segmentación de cielo y suelo, que además debería reducir el error de 5–14°.
- La combinación de la estimación con la IMU no está implementada.

## Comprobaciones numéricas

El código de proyección se ha comprobado con Node.js:

- El error de teselado tras traslación y giro de 180° es de unos 10⁻¹⁵ (los bordes coinciden exactamente), y el mapa no está reflejado.
- El error de ida y vuelta entre coordenadas del mapa y coordenadas esféricas es inferior a 10⁻¹² en ambos modos.
- Distorsión de áreas (área en el mapa ÷ área real):

| Modo | Rango |
|---|---|
| Sin corrección | 0,13× – 3,3× |
| Con corrección de áreas | 0,55× – 1,4× |

- Distorsión de formas (cociente entre el estiramiento máximo y el mínimo) en el modo sin corrección: unas 2,4× a menos de 10° de un vértice y 1,5× o menos más allá de 35°.

## Proyecciones relacionadas

Desplegar el globo sobre un tetraedro no es nuevo. Los trabajos anteriores más cercanos:

- **[La proyección tetraédrica conforme de Lee](https://en.wikipedia.org/wiki/Lee_conformal_world_in_a_tetrahedron)** (L. P. Lee, 1965). También proyecta el globo sobre un tetraedro regular y tesela el plano, y su tesela se puede reorganizar en el mismo rectángulo `√3 × 1`. El original está centrado en el Polo Sur, que queda sobre un vértice. Es conforme (las formas locales son correctas), así que los círculos máximos son curvos. Está disponible en D3 como [`d3.geoTetrahedralLee`](https://unpkg.com/browse/d3-geo-polygon@1.9.0/README.md), normalmente dibujada como un triángulo con el polo en el centro.
- **[La tarjeta con mapa tetraédrico de Doug McIlroy](https://cs.dartmouth.edu/~doug/cards/page1983.pdf)** (1983) usa la proyección de Lee con los polos en el punto medio de dos aristas opuestas y los cuatro vértices en los océanos.
- **[AuthaGraph](https://en.wikipedia.org/wiki/AuthaGraph_projection)** (Hajime Narukawa) es un mapa tetraédrico rectangular que tesela sin costuras, con sus vértices en los océanos. Su algoritmo está patentado y no se ha publicado.

Lo que este proyecto hace de forma distinta:

- Una arista atraviesa verticalmente el centro del mapa, y al arrastrar el globo se desliza a lo largo de ella, entre el Polo Norte en el vértice de arriba y el Polo Sur en el de abajo.
- Cada cara es una proyección gnomónica, así que las rutas aéreas ortodrómicas son rectas dentro de una cara.
- Incluye un planificador de viajes sobre el mapa: búsqueda de aeropuertos en nueve idiomas, rutas, distancias y el orden de visita más corto.

## Herramientas relacionadas para planificar viajes

Otras herramientas web también dibujan rutas aéreas con varias paradas y suman distancias ortodrómicas:

| | Qué se ve | Rutas | Útil para |
|---|---|---|---|
| [Great Circle Map](https://www.greatcirclemap.com/) | Un globo 3D que se puede girar (también hay un mapa de Mercator); el globo solo muestra media Tierra a la vez | Arcos ortodrómicos correctos; distancias sobre el elipsoide | Uno o unos pocos tramos |
| [RapidToolset Multi-City Flight Planner](https://rapidtoolset.com/en/tool/multi-city-flight-planner) | Todo el mundo en un mapa plano convencional | Arcos entre las paradas; las rutas de latitudes altas quedan estiradas y cuesta juzgar su dirección real | Sumar distancias |
| Este mapa | Todo el mundo en un solo mapa plano que tesela sin costuras | Rectas dentro de cada cara, solo se quiebran en los pliegues | Planificar el **orden** de un viaje complejo por varios países |

Un globo muestra bien las direcciones, pero nunca el viaje completo a la vez; un mapa convencional muestra el viaje completo, pero con direcciones engañosas. Este mapa muestra el viaje completo con direcciones cercanas a las reales, y puede encontrar el orden de visita más corto.

Aquí las distancias se calculan sobre una esfera (radio de 6371 km). Difieren en menos de un 0,4 % de las distancias sobre el elipsoide, como las de Great Circle Map (por ejemplo, Taipéi–Londres: 9783 km frente a 9802 km). Es mucho menos que la diferencia entre órdenes de visita distintos, así que no cambia cuál es el más corto.

## Créditos

- [D3.js](https://d3js.org/) 7.9.0: proyección equirrectangular y dibujo de fronteras
- [TopoJSON](https://github.com/topojson/topojson) 3.0.2
- [world-atlas](https://github.com/topojson/world-atlas) 2.0.2: fronteras de los países procedentes de [Natural Earth](https://www.naturalearthdata.com/) (1:50m)
- [OurAirports](https://ourairports.com/data/): lista de aeropuertos (`airports.json`, aeropuertos con vuelos regulares y código IATA), dominio público
- [Wikidata](https://www.wikidata.org/): nombres de aeropuertos y ciudades en chino, japonés, coreano, alemán, francés, español y ruso, y número de pasajeros usado para ordenar los resultados de búsqueda, CC0. Los nombres chinos se convirtieron a escritura tradicional (uso de Taiwán) o simplificada con [OpenCC](https://github.com/BYVoid/OpenCC). Los nombres de los países proceden de las traducciones integradas en el navegador (`Intl.DisplayNames`)
- [Wikimedia Commons](https://commons.wikimedia.org/): panorámicas aéreas 360° de Gunther Tschuch (PaulT), CC BY-SA 4.0, usadas en la prueba de drones: [Sebnitz Ottendorf](https://commons.wikimedia.org/wiki/File:Sebnitz_Ottendorf_Aerial_Pan360.jpg), [Kassel Bad Karlshafen](https://commons.wikimedia.org/wiki/File:Kassel_Bad_Karlshafen_Aerial_Pan360.jpg), [Hirschhorn (Neckar)](https://commons.wikimedia.org/wiki/File:Hirschhorn_(Neckar)_Aerial_Pan360.jpg), [Skye Dun Beag](https://commons.wikimedia.org/wiki/File:Skye_Dun_Beag_Aerial_Pan360.jpg), [Perth and Kinross Loch Tay](https://commons.wikimedia.org/wiki/File:Perth_and_Kinross_Loch_Tay_Aerial_Pan360.jpg), [Mull Lochbuie](https://commons.wikimedia.org/wiki/File:Mull_Lochbuie_Aerial_Pan360.jpg). `examples/aerial_*.jpg` son adaptaciones de la panorámica Sebnitz Ottendorf y tienen licencia CC BY-SA 4.0
- AuthaGraph es una obra y marca registrada de Hajime Narukawa. Este proyecto no está afiliado a ella.

## Licencia

[PolyForm Noncommercial 1.0.0](LICENSE). El uso personal, el estudio, la investigación, los proyectos por afición y el uso por parte de escuelas, organizaciones benéficas, organismos públicos de investigación y administraciones públicas son gratuitos.

**El uso comercial requiere una licencia de pago aparte.** Contacto: ertiach@gmail.com.

- La licencia cubre el código de este repositorio. Las bibliotecas y los datos citados arriba (D3, TopoJSON, world-atlas / Natural Earth, OurAirports, Wikidata) mantienen sus propias licencias. `examples/aerial_*.jpg` tienen licencia CC BY-SA 4.0 (véase Créditos).
- Solo es vinculante el texto en inglés del archivo LICENSE; esta descripción es meramente informativa.
