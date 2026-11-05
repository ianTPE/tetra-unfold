---
name: plan-route
description: Finds the shortest visiting order for a multi-stop flight trip, with great-circle distances and a shareable tetrahedral map link, then can look up real flights and a total price on Google Flights. Use when the user wants to plan or compare a multi-city route, or asks 排行程, 最短順序, 飛行距離, 查航班 or 機票總價. Not for booking.
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

## Look up flights and a total price

Do this only when the user asks for real flights or a total price. It needs a browser you can control. Without one, say so. Web search only gives rough price ranges, so never present those as live fares.

1. Get the dates or length of each stay, the number of passengers, the cabin and any checked bags. Ask if they are missing. For a test, you may pick sample dates, and say that you did.
2. Run `plan_route.js`, then use the printed airport codes in the printed order.
3. Open Google Flights and choose the multi-city trip type. Fill in every leg on the page, because a multi-city trip in the URL's `q` parameter opens the home page instead of results. The `hl` and `curr` parameters set the language and currency.
4. Select each leg in turn until you reach the summary page. Prices shown while selecting are for the whole trip, so do not add them together. Take the total from the summary page.

The first result may have a connection or a long layover, even when a direct flight exists. Tell the user whether you chose the cheapest flight or the cheapest direct flight.

Do not sign in, enter passenger or payment details, or book. If a CAPTCHA appears, stop and tell the user.

### Report the flights

For each leg, give the date, airline, flight number, local departure and arrival times, duration, and stops. Then give the total with its currency, the number of passengers, the cabin, the number of separate tickets, what bags each leg includes, the date you checked and a link to the search.

Point out what affects the trip:

- A next-day arrival or a night departure can shorten a stay. Work out the real time at each stop.
- Tickets bought separately usually do not protect a connection if an earlier flight is late.
- Fares change, and the booking page may add bag or other fees.
- Say "lowest" only for what you compared, and name it. Do not say the shortest order is the cheapest unless you priced other orders.
