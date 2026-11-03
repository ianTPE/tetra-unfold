# tetra-unfold

**English** | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Deutsch](README.de.md) | [Français](README.fr.md) | [Español](README.es.md) | [Русский](README.ru.md)

Unfold the whole sphere onto a **regular tetrahedron**, then flatten it into a rectangle that **tiles the plane seamlessly**.

The demo uses a world map and is inspired by the [AuthaGraph world map](https://www.authagraph.com/) by Hajime Narukawa. It is not an implementation of AuthaGraph: that algorithm is patented and unpublished, so this project uses its own approximation. The same method can also be applied to **360° camera images**, so that an AI model can see the entire sphere in a single flat image.

![Demo: dragging slides the North Pole to the South Pole, and the trip planner finds the shortest order for nine airports](media/demo.gif)

## Demos

**Try it online: <https://iantpe.github.io/tetra-unfold/>**

The map is available in 繁體中文, 简体中文, English, 日本語, 한국어, Deutsch, Français, Español and Русский. It picks your browser's language automatically; use the menu in the panel to switch, or add `?lang=` to the address (`zh-Hant`, `zh-Hans`, `en`, `ja`, `ko`, `de`, `fr`, `es`, `ru`), for example <https://iantpe.github.io/tetra-unfold/?lang=ja>.

The map is a single HTML file plus `i18n.js` (interface text), `airports.json` and `names/<language>.json` (airport and city names). There is nothing to install or build. An internet connection is needed to load D3 and the country data.

| File | What it shows |
|---|---|
| [`index.html`](index.html) · [live](https://iantpe.github.io/tetra-unfold/) | Tetrahedral world map. One tetrahedron edge runs down the vertical centre line along 90°E, with corners at the top and bottom centre. By default the North Pole is on the top corner; dragging up and down slides the globe along that edge until the South Pole is on the bottom corner (the **North Pole up** and **South Pole down** buttons jump between the two). Dragging stops at these two positions; a checkbox removes the limit so the globe can keep turning. The other corners stay in the oceans in both positions. Seamless tiling, drag to rotate the globe, optional area correction, tetrahedron fold lines, and country names on hover. |

Controls:

- Drag: rotate the globe (in `index.html`, Shift + drag pans the view)
- Mouse wheel: zoom (`index.html`)
- Hover: show the country name and coordinates

### Planning a multi-stop trip (`index.html`)

The map is handy for checking flight directions: with area correction off (the default), each triangular face is a gnomonic projection, so a great-circle route is a straight line within a face and only bends where it crosses a fold line.

- Add airports by clicking the dots on the map, or by typing an IATA code, a city, an airport name or a country, in the selected language or in English (for example `TPE`, `London`, `ロンドン`, `Londres`). When a city has several airports, the busiest one comes first. Zoom in to also see medium-sized airports.
- Each leg is drawn as a great-circle route, with its distance and the trip total. Tick **return to the start** for a round trip.
- **Find the smoothest order** keeps the first stop as the starting point and tries every order of the others (up to 10 stops), then picks the shortest total distance.
- Distances are great-circle distances on a sphere of radius 6,371 km. Real flight paths are usually somewhat longer.

#### Checking fares with an AI browser assistant

The map finds the order with the shortest distance, but not the cheapest or fastest flights. An AI assistant that can use your browser, such as Claude in Chrome or ChatGPT's agent, can do that part: it reads the order from the map, searches each leg on a flight search site such as Google Flights, and compares the combinations. For example:

> Open https://iantpe.github.io/tetra-unfold/ and plan a trip from Taipei (TPE) to Tokyo, Singapore and London, returning to Taipei. Compare the order the map finds with the other orders. Then search one-way economy fares on Google Flights for 1, 4, 7 and 10 December, and list the total fare and total travel time for each order.

In a test with exactly this trip (fares as shown in November 2026, one adult, economy, one-way tickets including taxes):

| Visiting order (back to Taipei) | Great-circle distance | Flights found | Total fare | Total travel time |
|---|---:|---|---:|---:|
| Tokyo → Singapore → London | 28,206 km | London leg via Shanghai | NT$49,198 | 47 h 30 min |
| Tokyo → Singapore → London | 28,206 km | London leg via Doha | NT$50,509 | 44 h 05 min |
| Tokyo → London → Singapore (the map's order) | 25,878 km | Via Shanghai and Munich | NT$50,779 | 45 h 50 min |

- **The shortest order is not always the cheapest.** The map's order saved 2,328 km (8.3%), but with these dates its flights cost slightly more. Fares depend mostly on which airlines fly each route.
- **The connection can matter as much as the order.** Changing the Singapore–London connection from Shanghai to Doha cost NT$1,311 more but saved 3 h 25 min.
- **Overnight flights shorten your stays**, which the map cannot show.

So use the map to rule out orders that double back, and let the assistant compare fares for the few orders that are left. The assistant only searches; book and pay yourself. Fares change constantly, and a multi-city ticket can be cheaper than separate one-way tickets, so ask the assistant to check that as well.

## How it works

### Why it tiles seamlessly

The plane is covered by a lattice of equilateral triangles with side length 1. Grouping the lattice points `(i, j)` by the parity of `i` and `j` gives exactly 4 classes, one for each vertex of the tetrahedron, and every small triangle becomes one face of the tetrahedron.

Three faces meet at each vertex of a regular tetrahedron, so the total angle around a vertex is 3 × 60° = **180°**. This means the whole plane is the tetrahedron's surface repeated by 180° rotations about every lattice point. The rectangle `[0, 2] × [0, √3/2]` holds exactly one complete map. Neighbouring rows are rotated by 180°, so copies of the map tile infinitely in every direction. `index.html` turns this lattice by 90° so that one edge is vertical: its map is the `√3 × 1` rectangle with a corner at the midpoint of each side and none inside, which is also exactly one complete map.

### From the plane to the sphere

Each pixel is computed as follows:

1. Find the small triangle that contains the pixel and compute its barycentric coordinates.
2. Use the barycentric coordinates to pick a point on the matching face of the tetrahedron.
3. Push that point onto the sphere, in one of two modes:
   - **Uncorrected (gnomonic)**: project straight out from the centre of the sphere. Each face looks like an ultra-wide pinhole camera image, and **straight lines stay straight**.
   - **Area-corrected**: redistribute distances along each ray from the face centre so that areas on the map are roughly proportional to areas on the sphere.
4. Apply the rotation matrix to get longitude and latitude, then sample the colour from an equirectangular texture.

Because every pixel is looked up in reverse, there is no polygon clipping to deal with, and tiling and rotation come almost for free.

### Corner distortion is unavoidable

A tetrahedron vertex has only 180° around it, but every point on a sphere has 360°. The area near each of the 4 vertices must therefore be stretched by about 2×, whatever formula is used. AuthaGraph has the same distortion and places its corners in the oceans.

## Dual-orientation unfolding

Since corner distortion cannot be removed, unfold the sphere **twice, in two orientations**, so the corners of the two maps fall in different places:

- **Orientation A**: the 4 corners sit in the Pacific, the North Atlantic, the South Atlantic and the Indian Ocean.
- **Orientation B**: the globe is rotated a further 180° about its axis before unfolding.

The 4 corners of A are symmetric about the equator. After a 180° rotation, B's corners land exactly opposite A's corners, at the centre of each of A's faces, where A has the least distortion. North points the same way in both maps, so neither is upside down.

For each place, use whichever map puts it further from a corner. The table shows how far the worst place on Earth is from a corner, depending on how far B is rotated:

| B rotated by | Worst place, distance from a corner |
|---|---|
| 180° | 35.2° |
| 150° | 20.3° |
| 90° | 9.9° |
| 0° | 0° (both maps identical, no benefit) |

## Application: 360° cameras, AI recognition and drone attitude

360° cameras usually export equirectangular images (2:1 panoramas). That is the same format as the world map texture used here, so the method works by swapping the texture for a 360° photo.

Compared with common formats:

- **Equirectangular**: objects are cut at the left and right edges, and the poles are heavily stretched.
- **Cubemap (6 faces)**: each face looks like an ordinary photo, but there are many seams, and objects across seams need extra handling.
- **Tetrahedral unfolding**: one rectangular image of the whole sphere with no cuts, which can be fed directly to standard image models. The drawback is distortion near the 4 corners.

### Horizon layout

[`unfold360.py`](unfold360.py) uses the same `√3 × 1` net as `index.html` (one tetrahedron edge runs vertically down the centre), turned so that when the camera is level:

- **The horizontal centre line is the horizon.** The top half of the image is entirely sky and the bottom half entirely ground, each exactly half of the sphere.
- The centre of the image looks straight ahead. Straight behind is at the four corners, and the horizon continues along the left and right edges.
- The zenith is at 1/4 and 3/4 of the top edge, and the nadir at the same places on the bottom edge.
- The 4 tetrahedron corners are at the top and bottom centre (54.7° above and below the horizon, straight ahead) and at the midpoints of the left and right edges (on the horizon, 125.3° to either side).

For dual-orientation unfolding, **B is A rotated 180°** about the vertical axis. Every direction is then at least 35.3° from a corner in one of the two images, including every point on the horizon:

| B rotated by | Worst direction, distance from a corner |
|---|---|
| 180° | 35.3° |
| 150° | 20.3° |
| 90° | 9.8° |
| 0° | 0° (both images identical) |

```
pip install numpy pillow
python unfold360.py photo.jpg out/
```

### Drone attitude: telling sky from ground

A drone knows which way is up from its IMU (gyroscope and accelerometer). But the accelerometer measures gravity **plus the drone's own acceleration**, so during gusts, collisions, tumbling or hard manoeuvres the "down" it reports is wrong, and the gyroscope on its own drifts over time. The magnetometer is also easily upset by electromagnetic interference.

The boundary between sky and ground in a 360° image is an **independent reference**: it is not affected by electromagnetic interference or by the drone's acceleration. The idea is to **combine it with the IMU**: use the IMU normally, and when the drone is disturbed and the accelerometer cannot be trusted, correct the attitude with the up direction seen in the image. This matters most for drones that must keep flying under interference.

The horizon layout suits this:

- One seamless image covers the whole sphere, so the sky is never split across image borders, however the drone is turned.
- When the drone is level, the top half is sky and the bottom half is ground, which makes labels for training a sky/ground segmentation model simple.
- In area-corrected mode every pixel covers the same solid angle, so pixel directions can be averaged directly.

#### Test

[`drone_attitude.py`](drone_attitude.py) simulates a drone in 300 random attitudes per photo, including upside down. For each one it unfolds the 360° image in the drone's own frame (128 × 74 pixels, area-corrected) and estimates "up" with a deliberately simple rule:

- Bright, bluish pixels are sky. The threshold is chosen automatically for each image (Otsu's method).
- Black "no data" areas are ignored.
- The up direction is the average direction of sky pixels minus that of ground pixels.

It was run on six aerial 360° panoramas from Wikimedia Commons (by Gunther Tschuch, CC BY-SA 4.0):

| Terrain | Upside down | Error (median) | Error (90%) | Worst | Time per estimate |
|---|---|---|---|---|---|
| Farmland (Sebnitz) | 0 / 300 | 5.4° | 8.5° | 10.7° | 0.9 ms |
| Town (Bad Karlshafen) | 0 / 300 | 6.6° | 10.7° | 13.9° | 0.9 ms |
| River valley town (Hirschhorn) | 0 / 300 | 7.6° | 11.4° | 16.7° | 0.9 ms |
| Island coast (Skye) | 0 / 300 | 11.1° | 16.1° | 20.5° | 0.9 ms |
| Lake (Loch Tay) | 0 / 300 | 11.5° | 16.2° | 18.4° | 0.9 ms |
| Coast and mountains (Mull) | 0 / 300 | 13.6° | 18.1° | 22.3° | 0.9 ms |

| Level | Tilted 70° | Turned back level using the estimate |
|---|---|---|
| ![Level](examples/aerial_level.jpg) | ![Tilted](examples/aerial_tilted.jpg) | ![Stabilized](examples/aerial_stabilized.jpg) |

What we found:

- **In 1,800 random attitudes the sky and ground were never swapped.** The direction was off by 5–14° (median) and at most 22°, and each estimate took under 1 ms in Python on a desktop CPU.
- Water that reflects the sky (lakes, coasts) gives the largest errors.
- **The camera must be able to see the sky.** These panoramas are black above about 25° elevation, because the camera hangs under the drone. Before the black areas were excluded, most attitudes came out upside down. A drone using this needs cameras covering the upper hemisphere too, for example a 360° camera with lenses above and below the body.
- Panoramas taken from the ground (1.5 m) are not representative of a flying drone: trees and buildings hide much of the sky.

Limitations:

- The tumbling is simulated by rotating a still panorama. Motion blur, sudden exposure changes, propellers in view and sun glare are not tested.
- The brightness rule fails at night, over snow and above clouds. A trained sky/ground segmentation model would be needed, and should also reduce the 5–14° error.
- Combining the estimate with the IMU is not implemented.

## Numerical checks

The projection code has been checked with Node.js:

- Tiling error after translation and 180° rotation is about 10⁻¹⁵ (the edges match exactly), and the map is not mirrored.
- Round-trip error between map coordinates and sphere coordinates is below 10⁻¹² in both modes.
- Area distortion (map area ÷ true area):

| Mode | Range |
|---|---|
| Uncorrected | 0.13× – 3.3× |
| Area-corrected | 0.55× – 1.4× |

- Shape distortion (ratio of maximum to minimum stretch) in uncorrected mode: about 2.4× within 10° of a corner, and 1.5× or less beyond 35°.

## Related projections

Unfolding the globe onto a tetrahedron is not new. The closest earlier work:

- **[Lee's conformal tetrahedral projection](https://en.wikipedia.org/wiki/Lee_conformal_world_in_a_tetrahedron)** (L. P. Lee, 1965). It also maps the globe onto a regular tetrahedron and tiles the plane, and its tile can be rearranged into the same `√3 × 1` rectangle. The original is centred on the South Pole, which sits on a vertex. It is conformal (local shapes are right), so great circles are curved. It is available in D3 as [`d3.geoTetrahedralLee`](https://unpkg.com/browse/d3-geo-polygon@1.9.0/README.md), usually drawn as a triangle with the pole at its centre.
- **[Doug McIlroy's tetrahedral map card](https://cs.dartmouth.edu/~doug/cards/page1983.pdf)** (1983) uses Lee's projection with the poles at the midpoints of two opposite edges and all four vertices in the oceans.
- **[AuthaGraph](https://en.wikipedia.org/wiki/AuthaGraph_projection)** (Hajime Narukawa) is a rectangular, seamlessly tiling tetrahedral map with its corners in the oceans. Its algorithm is patented and unpublished.

What this project does differently:

- One edge runs vertically down the centre of the map, and dragging slides the globe along it between the North Pole on the top corner and the South Pole on the bottom corner.
- Each face is a gnomonic projection, so great-circle flight routes are straight within a face.
- It includes a trip planner on top of the map: airport search in nine languages, routes, distances and the shortest visiting order.

## Related tools for trip planning

Other web tools also draw multi-stop flight routes and add up great-circle distances:

| | What you see | Routes | Good for |
|---|---|---|---|
| [Great Circle Map](https://www.greatcirclemap.com/) | A 3D globe you can turn (a Mercator map is also available); the globe shows only half the Earth at a time | Correct great-circle arcs; distances on the ellipsoid | One leg or a few legs |
| [RapidToolset Multi-City Flight Planner](https://rapidtoolset.com/en/tool/multi-city-flight-planner) | The whole world on a conventional flat map | Arcs between stops; high-latitude routes are stretched, so their real direction is hard to judge | Adding up distances |
| This map | The whole world on one flat, seamlessly tiling map | Straight within each face, bending only at fold lines | Planning the **order** of a complex multi-country trip |

A globe shows directions correctly but never the whole trip at once; a conventional map shows the whole trip but with misleading directions. This map shows the whole trip with directions that stay close to true, and can try every visiting order to find the shortest one.

Distances here use a sphere (radius 6,371 km). They differ from ellipsoid distances, such as Great Circle Map's, by less than 0.4% (for example Taipei–London: 9,783 km vs 9,802 km). That is far smaller than the gap between different visiting orders, so it does not change which order is shortest.

## Credits

- [D3.js](https://d3js.org/) 7.9.0: equirectangular projection and border rendering
- [TopoJSON](https://github.com/topojson/topojson) 3.0.2
- [world-atlas](https://github.com/topojson/world-atlas) 2.0.2: country boundaries derived from [Natural Earth](https://www.naturalearthdata.com/) (1:50m)
- [OurAirports](https://ourairports.com/data/): airport list (`airports.json`, airports with scheduled service and an IATA code), public domain
- [Wikidata](https://www.wikidata.org/): airport and city names in Chinese, Japanese, Korean, German, French, Spanish and Russian, and passenger counts used for ranking search results, CC0. Chinese names were converted to Traditional (Taiwan usage) or Simplified script with [OpenCC](https://github.com/BYVoid/OpenCC); Traditional Chinese names were then checked for Taiwan-standard transliterations. Country names come from the browser's built-in translations (`Intl.DisplayNames`)
- [Wikimedia Commons](https://commons.wikimedia.org/): aerial 360° panoramas by Gunther Tschuch (PaulT), CC BY-SA 4.0, used for the drone test: [Sebnitz Ottendorf](https://commons.wikimedia.org/wiki/File:Sebnitz_Ottendorf_Aerial_Pan360.jpg), [Kassel Bad Karlshafen](https://commons.wikimedia.org/wiki/File:Kassel_Bad_Karlshafen_Aerial_Pan360.jpg), [Hirschhorn (Neckar)](https://commons.wikimedia.org/wiki/File:Hirschhorn_(Neckar)_Aerial_Pan360.jpg), [Skye Dun Beag](https://commons.wikimedia.org/wiki/File:Skye_Dun_Beag_Aerial_Pan360.jpg), [Perth and Kinross Loch Tay](https://commons.wikimedia.org/wiki/File:Perth_and_Kinross_Loch_Tay_Aerial_Pan360.jpg), [Mull Lochbuie](https://commons.wikimedia.org/wiki/File:Mull_Lochbuie_Aerial_Pan360.jpg). `examples/aerial_*.jpg` are adapted from the Sebnitz Ottendorf panorama and are licensed CC BY-SA 4.0
- AuthaGraph is the work and registered trademark of Hajime Narukawa. This project is not affiliated with it.

## License

[PolyForm Noncommercial 1.0.0](LICENSE). Personal use, study, research, hobby projects, and use by schools, charities, public research and government organisations are free.

**Commercial use needs a separate paid license.** Contact ertiach@gmail.com.

- The license covers the code in this repository. The libraries and data listed above (D3, TopoJSON, world-atlas / Natural Earth, OurAirports, Wikidata) keep their own licenses. `examples/aerial_*.jpg` are licensed CC BY-SA 4.0 (see Credits).
