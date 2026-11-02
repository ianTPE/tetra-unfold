# tetra-unfold

[English](README.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | **Deutsch** | [Français](README.fr.md) | [Español](README.es.md) | [Русский](README.ru.md)

> Dies ist eine Übersetzung der englischen Fassung. Bei Abweichungen gilt die [englische Fassung](README.md).

Die gesamte Kugeloberfläche wird auf ein **regelmäßiges Tetraeder** abgewickelt und dann zu einem Rechteck ausgebreitet, mit dem sich die Ebene **nahtlos kacheln** lässt.

Die Demo verwendet eine Weltkarte und ist von der [AuthaGraph-Weltkarte](https://www.authagraph.com/) von Hajime Narukawa inspiriert. Sie ist keine Implementierung von AuthaGraph: Dessen Algorithmus ist patentiert und nicht veröffentlicht, daher verwendet dieses Projekt eine eigene Annäherung. Dieselbe Methode lässt sich auch auf **Bilder von 360°-Kameras** anwenden, sodass ein KI-Modell die gesamte Kugel in einem einzigen flachen Bild sieht.

## Demos

**Online ausprobieren: <https://iantpe.github.io/tetra-unfold/?lang=de>**

Die Karte gibt es auf 繁體中文, 简体中文, English, 日本語, 한국어, Deutsch, Français, Español und Русский. Die Sprache des Browsers wird automatisch gewählt; über das Menü im Bedienfeld lässt sie sich wechseln, oder man hängt `?lang=` an die Adresse an (`zh-Hant`, `zh-Hans`, `en`, `ja`, `ko`, `de`, `fr`, `es`, `ru`).

Die Karte besteht aus einer einzigen HTML-Datei sowie `i18n.js` (Oberflächentexte), `airports.json` und `names/<Sprache>.json` (Flughafen- und Städtenamen). Es muss nichts installiert oder gebaut werden. Zum Laden von D3 und den Ländergrenzen ist eine Internetverbindung nötig.

| Datei | Inhalt |
|---|---|
| [`index.html`](index.html) · [öffnen](https://iantpe.github.io/tetra-unfold/?lang=de) | Tetraeder-Weltkarte. Eine Tetraederkante verläuft entlang 90° Ost senkrecht durch die Mitte der Karte, mit Ecken in der Mitte des oberen und des unteren Rands. Anfangs liegt der Nordpol auf der oberen Ecke; Ziehen nach oben und unten verschiebt den Globus entlang dieser Kante, bis der Südpol auf der unteren Ecke liegt (die Schaltflächen **Nordpol oben** und **Südpol unten** springen direkt zwischen beiden). Das Ziehen stoppt an diesen beiden Stellungen; ein Kontrollkästchen hebt die Begrenzung auf, sodass sich der Globus weiterdrehen lässt. In beiden Stellungen liegen die übrigen Ecken im Meer. Nahtloses Kacheln, Drehen des Globus durch Ziehen, abschaltbare Flächenkorrektur, Faltlinien des Tetraeders und Ländernamen beim Überfahren mit der Maus. |

Bedienung:

- Ziehen: Globus drehen (in `index.html` verschiebt Umschalt + Ziehen die Ansicht)
- Mausrad: zoomen (`index.html`)
- Mauszeiger darüber: Ländername und Koordinaten anzeigen

### Eine Reise mit mehreren Stationen planen (`index.html`)

Die Karte eignet sich gut, um Flugrichtungen zu prüfen: Bei ausgeschalteter Flächenkorrektur (Standard) ist jede Dreiecksfläche eine gnomonische Projektion. Eine Großkreisroute ist daher innerhalb einer Fläche eine Gerade und knickt nur dort ab, wo sie eine Faltlinie überquert.

- Flughäfen fügt man hinzu, indem man auf die Punkte in der Karte klickt oder einen IATA-Code, eine Stadt, einen Flughafennamen oder ein Land in der gewählten Sprache oder auf Englisch eingibt (zum Beispiel `TPE`, `London`, `München`, `Londres`). Hat eine Stadt mehrere Flughäfen, steht der mit den meisten Passagieren vorn. Beim Hineinzoomen erscheinen auch mittelgroße Flughäfen.
- Jede Etappe wird als Großkreisroute gezeichnet, mit ihrer Entfernung und der Gesamtstrecke. Mit **Am Ende zum Start zurückkehren** wird eine Rundreise berechnet.
- **Beste Reihenfolge berechnen** behält den ersten Halt als Start, probiert alle Reihenfolgen der übrigen (bis zu 10 Halte) und wählt die mit der kürzesten Gesamtstrecke.
- Entfernungen sind Großkreisentfernungen auf einer Kugel mit 6.371 km Radius. Tatsächliche Flugwege sind meist etwas länger.

## Funktionsweise

### Warum sich die Karte nahtlos kacheln lässt

Die Ebene wird mit einem Gitter aus gleichseitigen Dreiecken der Seitenlänge 1 überdeckt. Teilt man die Gitterpunkte `(i, j)` nach der Parität von `i` und `j` ein, ergeben sich genau 4 Klassen, eine für jede Ecke des Tetraeders, und jedes kleine Dreieck wird zu einer Fläche des Tetraeders.

An jeder Ecke eines regelmäßigen Tetraeders treffen drei Flächen zusammen, der Gesamtwinkel um eine Ecke beträgt also 3 × 60° = **180°**. Die ganze Ebene ist daher die Oberfläche des Tetraeders, wiederholt durch 180°-Drehungen um jeden Gitterpunkt. Das Rechteck `[0, 2] × [0, √3/2]` enthält genau eine vollständige Karte. Benachbarte Reihen sind um 180° gedreht, sodass sich Kopien der Karte in jede Richtung unendlich aneinanderfügen. `index.html` dreht dieses Gitter um 90°, damit eine Kante senkrecht steht: Die Karte ist dann das Rechteck `√3 × 1` mit je einer Ecke in der Mitte jeder Seite und keiner im Inneren, und auch das ist genau eine vollständige Karte.

### Von der Ebene zur Kugel

Jedes Pixel wird so berechnet:

1. Das kleine Dreieck finden, das das Pixel enthält, und seine baryzentrischen Koordinaten bestimmen.
2. Mit den baryzentrischen Koordinaten einen Punkt auf der passenden Fläche des Tetraeders wählen.
3. Diesen Punkt auf die Kugel bringen, in einem von zwei Modi:
   - **Unkorrigiert (gnomonisch)**: geradlinig vom Kugelmittelpunkt nach außen projizieren. Jede Fläche sieht aus wie das Bild einer extremen Weitwinkel-Lochkamera, und **Geraden bleiben gerade**.
   - **Flächenkorrigiert**: Entfernungen entlang jedes Strahls vom Flächenmittelpunkt neu verteilen, sodass Flächen auf der Karte ungefähr proportional zu Flächen auf der Kugel sind.
4. Mit der Rotationsmatrix Länge und Breite berechnen und die Farbe aus einer Textur in quadratischer Plattkarte holen.

Da jedes Pixel rückwärts nachgeschlagen wird, ist kein Polygon-Clipping nötig, und Kacheln und Drehen gibt es fast umsonst.

### Verzerrung an den Ecken ist unvermeidlich

Um eine Tetraederecke herum liegen nur 180°, um jeden Punkt einer Kugel aber 360°. Die Umgebung jeder der 4 Ecken muss daher um etwa das Doppelte gedehnt werden, gleich mit welcher Formel. AuthaGraph hat dieselbe Verzerrung und legt seine Ecken in die Ozeane.

## Abwicklung in zwei Ausrichtungen

Da sich die Verzerrung an den Ecken nicht beseitigen lässt, wird die Kugel **zweimal in zwei Ausrichtungen** abgewickelt, sodass die Ecken der beiden Karten an verschiedenen Stellen liegen:

- **Ausrichtung A**: Die 4 Ecken liegen im Pazifik, im Nordatlantik, im Südatlantik und im Indischen Ozean.
- **Ausrichtung B**: Der Globus wird vor dem Abwickeln zusätzlich um 180° um seine Achse gedreht.

Die 4 Ecken von A liegen symmetrisch zum Äquator. Nach einer 180°-Drehung landen die Ecken von B genau gegenüber denen von A, in der Mitte jeder Fläche von A, wo A am wenigsten verzerrt ist. In beiden Karten zeigt Norden in dieselbe Richtung, keine steht also auf dem Kopf.

Für jeden Ort nimmt man die Karte, in der er weiter von einer Ecke entfernt ist. Die Tabelle zeigt, wie weit der ungünstigste Ort der Erde von einer Ecke entfernt ist, je nachdem, wie weit B gedreht wird:

| B gedreht um | Ungünstigster Ort, Abstand zu einer Ecke |
|---|---|
| 180° | 35,2° |
| 150° | 20,3° |
| 90° | 9,9° |
| 0° | 0° (beide Karten gleich, kein Nutzen) |

## Anwendung: 360°-Kameras, KI-Erkennung und Fluglage von Drohnen

360°-Kameras geben meist Bilder in quadratischer Plattkarte aus (Panoramen im Format 2:1). Das ist dasselbe Format wie die hier verwendete Weltkartentextur, die Methode funktioniert also, indem man die Textur durch ein 360°-Foto ersetzt.

Im Vergleich mit gängigen Formaten:

- **Quadratische Plattkarte**: Objekte werden am linken und rechten Rand zerschnitten, und die Pole sind stark gedehnt.
- **Cubemap (6 Flächen)**: Jede Fläche sieht aus wie ein gewöhnliches Foto, aber es gibt viele Nähte, und Objekte über Nähte hinweg brauchen eine Sonderbehandlung.
- **Tetraeder-Abwicklung**: ein einziges rechteckiges Bild der ganzen Kugel ohne Schnitte, das sich direkt in gängige Bildmodelle einspeisen lässt. Der Nachteil ist die Verzerrung nahe den 4 Ecken.

### Horizont-Anordnung

[`unfold360.py`](unfold360.py) verwendet dasselbe `√3 × 1`-Netz wie `index.html` (eine Tetraederkante verläuft senkrecht durch die Mitte), so gedreht, dass bei waagrechter Kamera gilt:

- **Die waagrechte Mittellinie ist der Horizont.** Die obere Bildhälfte ist vollständig Himmel, die untere vollständig Boden, jede genau die Hälfte der Kugel.
- Die Bildmitte blickt geradeaus. Direkt hinten liegt in den vier Ecken, und der Horizont setzt sich entlang des linken und rechten Rands fort.
- Der Zenit liegt bei 1/4 und 3/4 des oberen Rands, der Nadir an denselben Stellen des unteren Rands.
- Die 4 Tetraederecken liegen in der Mitte des oberen und unteren Rands (54,7° über und unter dem Horizont, geradeaus) und in der Mitte des linken und rechten Rands (auf dem Horizont, 125,3° zu jeder Seite).

Bei der Abwicklung in zwei Ausrichtungen ist **B gleich A, um 180°** um die senkrechte Achse gedreht. Dann ist jede Richtung in einem der beiden Bilder mindestens 35,3° von einer Ecke entfernt, auch jeder Punkt auf dem Horizont:

| B gedreht um | Ungünstigste Richtung, Abstand zu einer Ecke |
|---|---|
| 180° | 35,3° |
| 150° | 20,3° |
| 90° | 9,8° |
| 0° | 0° (beide Bilder gleich) |

```
pip install numpy pillow
python unfold360.py photo.jpg out/
```

### Test mit einem Innenraumfoto

Getestet mit dem Panorama [Art Studio](https://polyhaven.com/a/art_studio) von Poly Haven (die roten Linien sind die Faltlinien des Tetraeders):

| Originalbild in quadratischer Plattkarte |
|---|
| ![Originalbild in quadratischer Plattkarte](examples/art_studio_equirect.jpg) |

| Ausrichtung A | Ausrichtung B (um 180° gedreht) |
|---|---|
| ![Ausrichtung A](examples/art_studio_A.jpg) | ![Ausrichtung B](examples/art_studio_B.jpg) |

Beobachtungen:

- Der ganze Raum passt ohne Schnitte in ein Bild. Die Decke füllt die obere Hälfte, der Boden die untere; der Horizont (Augenhöhe) verläuft entlang der Mittellinie.
- Jede Dreiecksfläche ist eine eigene Perspektivansicht, daher knicken Geraden wie Raumecken dort ab, wo sie eine Faltlinie überqueren.
- In Ausrichtung A liegt das große Wandbild neben der Ecke am rechten Rand und ist gedehnt. Ausrichtung B zeigt es links unversehrt und aufrecht – genau deshalb nimmt man das Bild, in dem ein Objekt weiter von einer Ecke entfernt ist.
- Links und rechts stimmen mit dem Originalfoto überein; das Bild ist nicht gespiegelt.

Vorgeschlagener Ablauf für die Objekterkennung: das Modell auf A und B anwenden, jede Erkennung in Kugelkoordinaten zurückrechnen und das Ergebnis aus dem Bild behalten, in dem das Objekt weiter von einer Ecke entfernt ist. Die Rückrechnung ist noch nicht implementiert, und die Objekterkennung wurde mit dieser Anordnung noch nicht ausgewertet. (Ein kurzer YOLO-Test an drei Innenraumpanoramen mit einer früheren Anordnung zeigte keinen Vorteil gegenüber dem einfachen Bild in Plattkarte: Objekte in Innenräumen liegen nahe am Horizont, wo die Plattkarte kaum verzerrt.)

### Fluglage von Drohnen: Himmel und Boden unterscheiden

Eine Drohne weiß über ihre IMU (Gyroskop und Beschleunigungsmesser), wo oben ist. Der Beschleunigungsmesser misst aber die Schwerkraft **plus die eigene Beschleunigung der Drohne**. Bei Böen, Zusammenstößen, Überschlägen oder harten Manövern ist das „Unten“, das er meldet, daher falsch, und das Gyroskop allein driftet mit der Zeit. Auch das Magnetometer lässt sich leicht durch elektromagnetische Störungen beeinflussen.

Die Grenze zwischen Himmel und Boden in einem 360°-Bild ist eine **unabhängige Referenz**: Sie wird weder von elektromagnetischen Störungen noch von der Beschleunigung der Drohne beeinflusst. Die Idee ist, sie **mit der IMU zu kombinieren**: normalerweise die IMU verwenden und, wenn die Drohne gestört wird und dem Beschleunigungsmesser nicht zu trauen ist, die Lage mit der im Bild erkannten Richtung nach oben korrigieren. Das ist vor allem für Drohnen wichtig, die auch unter Störungen weiterfliegen müssen, etwa militärische Drohnen.

Die Horizont-Anordnung eignet sich dafür:

- Ein nahtloses Bild deckt die ganze Kugel ab, sodass der Himmel nie über Bildränder hinweg zerteilt wird, wie auch immer die Drohne gedreht ist.
- Bei waagrechter Drohne ist die obere Hälfte Himmel und die untere Boden, was die Beschriftung zum Trainieren eines Segmentierungsmodells für Himmel und Boden einfach macht.
- Im flächenkorrigierten Modus deckt jedes Pixel denselben Raumwinkel ab, Pixelrichtungen lassen sich also direkt mitteln.

#### Test

[`drone_attitude.py`](drone_attitude.py) simuliert pro Foto eine Drohne in 300 zufälligen Lagen, auch kopfüber. Für jede Lage wird das 360°-Bild im eigenen Koordinatensystem der Drohne abgewickelt (128 × 74 Pixel, flächenkorrigiert) und „oben“ mit einer bewusst einfachen Regel geschätzt:

- Helle, bläuliche Pixel sind Himmel. Der Schwellenwert wird für jedes Bild automatisch gewählt (Otsu-Verfahren).
- Schwarze Bereiche „ohne Daten“ werden ignoriert.
- Die Richtung nach oben ist die mittlere Richtung der Himmelspixel minus die der Bodenpixel.

Getestet wurde mit sechs 360°-Luftpanoramen von Wikimedia Commons (von Gunther Tschuch, CC BY-SA 4.0):

| Gelände | Kopfüber | Fehler (Median) | Fehler (90 %) | Größter | Zeit pro Schätzung |
|---|---|---|---|---|---|
| Ackerland (Sebnitz) | 0 / 300 | 5,4° | 8,5° | 10,7° | 0,9 ms |
| Stadt (Bad Karlshafen) | 0 / 300 | 6,6° | 10,7° | 13,9° | 0,9 ms |
| Stadt im Flusstal (Hirschhorn) | 0 / 300 | 7,6° | 11,4° | 16,7° | 0,9 ms |
| Inselküste (Skye) | 0 / 300 | 11,1° | 16,1° | 20,5° | 0,9 ms |
| See (Loch Tay) | 0 / 300 | 11,5° | 16,2° | 18,4° | 0,9 ms |
| Küste und Berge (Mull) | 0 / 300 | 13,6° | 18,1° | 22,3° | 0,9 ms |

| Waagrecht | Um 70° geneigt | Mit der Schätzung wieder waagrecht gedreht |
|---|---|---|
| ![Waagrecht](examples/aerial_level.jpg) | ![Geneigt](examples/aerial_tilted.jpg) | ![Stabilisiert](examples/aerial_stabilized.jpg) |

Ergebnisse:

- **In 1.800 zufälligen Lagen wurden Himmel und Boden nie vertauscht.** Die Richtung lag im Median 5–14° daneben, höchstens 22°, und jede Schätzung dauerte in Python auf einer Desktop-CPU weniger als 1 ms.
- Wasser, das den Himmel spiegelt (Seen, Küsten), verursacht die größten Fehler.
- **Die Kamera muss den Himmel sehen können.** Diese Panoramen sind oberhalb von etwa 25° Höhe schwarz, weil die Kamera unter der Drohne hängt. Bevor die schwarzen Bereiche ausgeschlossen wurden, kamen die meisten Lagen kopfüber heraus. Eine Drohne, die das nutzt, braucht Kameras, die auch die obere Halbkugel abdecken, zum Beispiel eine 360°-Kamera mit Objektiven über und unter dem Rumpf.
- Vom Boden aus (1,5 m) aufgenommene Panoramen sind für eine fliegende Drohne nicht repräsentativ: Bäume und Gebäude verdecken einen großen Teil des Himmels.

Einschränkungen:

- Der Überschlag wird durch Drehen eines unbewegten Panoramas simuliert. Bewegungsunschärfe, plötzliche Belichtungswechsel, Propeller im Bild und Gegenlicht wurden nicht getestet.
- Die Helligkeitsregel versagt nachts, über Schnee und über Wolken. Dafür wäre ein trainiertes Segmentierungsmodell für Himmel und Boden nötig, das auch den Fehler von 5–14° verringern sollte.
- Die Kombination der Schätzung mit der IMU ist nicht implementiert.

## Numerische Prüfungen

Der Projektionscode wurde mit Node.js geprüft:

- Der Kachelfehler nach Verschiebung und 180°-Drehung beträgt etwa 10⁻¹⁵ (die Ränder passen exakt), und die Karte ist nicht gespiegelt.
- Der Hin-und-zurück-Fehler zwischen Karten- und Kugelkoordinaten liegt in beiden Modi unter 10⁻¹².
- Flächenverzerrung (Kartenfläche ÷ wahre Fläche):

| Modus | Bereich |
|---|---|
| Unkorrigiert | 0,13× – 3,3× |
| Flächenkorrigiert | 0,55× – 1,4× |

- Formverzerrung (Verhältnis von größter zu kleinster Dehnung) im unkorrigierten Modus: etwa 2,4× innerhalb von 10° um eine Ecke und höchstens 1,5× jenseits von 35°.

## Verwandte Projektionen

Den Globus auf ein Tetraeder abzuwickeln ist nicht neu. Die nächsten Vorläufer:

- **[Lees winkeltreue Tetraederprojektion](https://en.wikipedia.org/wiki/Lee_conformal_world_in_a_tetrahedron)** (L. P. Lee, 1965). Sie bildet den Globus ebenfalls auf ein regelmäßiges Tetraeder ab und kachelt die Ebene; ihre Kachel lässt sich zum selben `√3 × 1`-Rechteck umordnen. Das Original ist auf den Südpol zentriert, der auf einer Ecke liegt. Sie ist winkeltreu (lokale Formen stimmen), daher sind Großkreise gekrümmt. In D3 gibt es sie als [`d3.geoTetrahedralLee`](https://unpkg.com/browse/d3-geo-polygon@1.9.0/README.md), meist als Dreieck mit dem Pol in der Mitte gezeichnet.
- **[Doug McIlroys Tetraeder-Kartengrußkarte](https://cs.dartmouth.edu/~doug/cards/page1983.pdf)** (1983) verwendet Lees Projektion mit den Polen in der Mitte zweier gegenüberliegender Kanten und allen vier Ecken in den Ozeanen.
- **[AuthaGraph](https://en.wikipedia.org/wiki/AuthaGraph_projection)** (Hajime Narukawa) ist eine rechteckige, nahtlos kachelnde Tetraederkarte mit den Ecken in den Ozeanen. Ihr Algorithmus ist patentiert und nicht veröffentlicht.

Was dieses Projekt anders macht:

- Eine Kante verläuft senkrecht durch die Kartenmitte, und Ziehen verschiebt den Globus entlang dieser Kante zwischen Nordpol auf der oberen Ecke und Südpol auf der unteren.
- Jede Fläche ist eine gnomonische Projektion, Großkreis-Flugrouten sind innerhalb einer Fläche also gerade.
- Auf der Karte ist ein Reiseplaner eingebaut: Flughafensuche in neun Sprachen, Routen, Entfernungen und die kürzeste Besuchsreihenfolge.

## Verwandte Werkzeuge für die Reiseplanung

Auch andere Webwerkzeuge zeichnen Flugrouten mit mehreren Stationen und addieren Großkreisentfernungen:

| | Was man sieht | Routen | Geeignet für |
|---|---|---|---|
| [Great Circle Map](https://www.greatcirclemap.com/) | Ein drehbarer 3D-Globus (auch eine Mercator-Karte ist verfügbar); der Globus zeigt immer nur die halbe Erde | Korrekte Großkreisbögen; Entfernungen auf dem Ellipsoid | Eine oder wenige Etappen |
| [RapidToolset Multi-City Flight Planner](https://rapidtoolset.com/en/tool/multi-city-flight-planner) | Die ganze Welt auf einer herkömmlichen flachen Karte | Bögen zwischen den Stationen; Routen in hohen Breiten sind gedehnt, ihre wahre Richtung ist schwer einzuschätzen | Entfernungen addieren |
| Diese Karte | Die ganze Welt auf einer flachen, nahtlos kachelnden Karte | Gerade innerhalb jeder Fläche, Knicke nur an Faltlinien | Die **Reihenfolge** einer komplexen Reise durch mehrere Länder planen |

Ein Globus zeigt Richtungen korrekt, aber nie die ganze Reise auf einmal; eine herkömmliche Karte zeigt die ganze Reise, aber mit irreführenden Richtungen. Diese Karte zeigt die ganze Reise mit nahezu wahren Richtungen und kann alle Besuchsreihenfolgen durchprobieren, um die kürzeste zu finden.

Die Entfernungen werden hier auf einer Kugel (Radius 6.371 km) berechnet. Sie weichen von Entfernungen auf dem Ellipsoid, wie bei Great Circle Map, um weniger als 0,4 % ab (zum Beispiel Taipeh–London: 9.783 km gegenüber 9.802 km). Das ist weit weniger als der Unterschied zwischen verschiedenen Reihenfolgen und ändert nicht, welche Reihenfolge die kürzeste ist.

## Quellen

- [D3.js](https://d3js.org/) 7.9.0: quadratische Plattkarte und Darstellung der Grenzen
- [TopoJSON](https://github.com/topojson/topojson) 3.0.2
- [world-atlas](https://github.com/topojson/world-atlas) 2.0.2: Ländergrenzen aus [Natural Earth](https://www.naturalearthdata.com/) (1:50m)
- [OurAirports](https://ourairports.com/data/): Flughafenliste (`airports.json`, Flughäfen mit Linienverkehr und IATA-Code), gemeinfrei
- [Wikidata](https://www.wikidata.org/): Flughafen- und Städtenamen auf Chinesisch, Japanisch, Koreanisch, Deutsch, Französisch, Spanisch und Russisch sowie Passagierzahlen zum Sortieren der Suchergebnisse, CC0. Chinesische Namen wurden mit [OpenCC](https://github.com/BYVoid/OpenCC) in traditionelle (Taiwaner Gebrauch) oder vereinfachte Schrift umgewandelt. Ländernamen stammen aus den eingebauten Übersetzungen des Browsers (`Intl.DisplayNames`)
- [Poly Haven](https://polyhaven.com/a/art_studio): 360°-Testfoto „Art Studio“ von Oliksiy Yakovlyev, CC0
- [Wikimedia Commons](https://commons.wikimedia.org/): 360°-Luftpanoramen von Gunther Tschuch (PaulT), CC BY-SA 4.0, für den Drohnentest: [Sebnitz Ottendorf](https://commons.wikimedia.org/wiki/File:Sebnitz_Ottendorf_Aerial_Pan360.jpg), [Kassel Bad Karlshafen](https://commons.wikimedia.org/wiki/File:Kassel_Bad_Karlshafen_Aerial_Pan360.jpg), [Hirschhorn (Neckar)](https://commons.wikimedia.org/wiki/File:Hirschhorn_(Neckar)_Aerial_Pan360.jpg), [Skye Dun Beag](https://commons.wikimedia.org/wiki/File:Skye_Dun_Beag_Aerial_Pan360.jpg), [Perth and Kinross Loch Tay](https://commons.wikimedia.org/wiki/File:Perth_and_Kinross_Loch_Tay_Aerial_Pan360.jpg), [Mull Lochbuie](https://commons.wikimedia.org/wiki/File:Mull_Lochbuie_Aerial_Pan360.jpg). `examples/aerial_*.jpg` sind Bearbeitungen des Panoramas Sebnitz Ottendorf und stehen unter CC BY-SA 4.0
- AuthaGraph ist ein Werk und eingetragenes Markenzeichen von Hajime Narukawa. Dieses Projekt steht in keiner Verbindung dazu.

## Lizenz

[PolyForm Noncommercial 1.0.0](LICENSE). Private Nutzung, Studium, Forschung, Hobbyprojekte sowie die Nutzung durch Schulen, gemeinnützige Organisationen, öffentliche Forschungseinrichtungen und Behörden sind kostenlos.

**Für kommerzielle Nutzung ist eine gesonderte, kostenpflichtige Lizenz nötig.** Kontakt: ertiach@gmail.com.

- Die Lizenz gilt für den Code in diesem Repository. Die oben genannten Bibliotheken und Daten (D3, TopoJSON, world-atlas / Natural Earth, OurAirports, Wikidata, das Poly-Haven-Foto) behalten ihre eigenen Lizenzen. `examples/aerial_*.jpg` stehen unter CC BY-SA 4.0 (siehe Quellen).
- Maßgeblich ist der englische Wortlaut in der Datei LICENSE; diese Beschreibung dient nur zur Information.
