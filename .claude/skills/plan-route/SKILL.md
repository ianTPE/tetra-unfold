---
name: plan-route
description: Finds the shortest visiting order for a multi-stop flight trip, with great-circle distances and a shareable tetrahedral map link. Use when the user wants to plan or compare a multi-city route, or asks 排行程, 最短順序 or 飛行距離. Not for fares, schedules or booking.
---

# Plan a route

Run this from the repository root. It needs Node.js and no other install:

```
node plan_route.js [--one-way] [--keep-order] [--lang=<language>] <stop> <stop> ...
```

- The first stop stays the starting point. If the user names none, ask where they start.
- A stop can be an IATA code, a city, an airport name or a country, in any of the map's languages. Quote names with spaces: `"New York"`.
- 3 or more stops return to the start by default. Add `--one-way` if the user does not want to come back.
- Add `--keep-order` to measure an order the user has already chosen.
- Set `--lang` to the user's language so the link and names match: `zh-Hant`, `zh-Hans`, `en`, `ja`, `ko`, `de`, `fr`, `es` or `ru`.
- A trip can have up to 30 stops.

## Check the matched airports first

The output starts with the airport chosen for each stop. A city or country gives its busiest airport, and `also` lists others that matched. A `name contains` match can be wrong.

- If a match looks wrong, or the user may have meant another airport, rerun with the IATA code.
- Tell the user which airport you used when the city has several, for example Tokyo gives HND, not NRT.

## Report the result

Give the order, the leg distances, the total, the saving if any, and the `Map:` link. Give the link as it is printed, because it carries the whole trip.

Be accurate about what the numbers mean:

- Distances are great-circle distances on a sphere. Real flight paths are usually longer.
- `exact shortest` (up to 16 stops) is the true shortest order. `approximate` (17 to 30 stops) may not be, so say so.
- The shortest order is not always the cheapest or fastest, and it ignores whether a direct flight exists. Do not state fares or flight availability from this tool.
