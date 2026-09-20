/**
 * Where California's cities are, for the delivery map. [latitude, longitude].
 *
 * The shop's delivery zones are CITY NAMES (they come from its Weedmaps
 * listings) and carry no coordinates, and the storefront's security policy
 * allows no third-party geocoder to be called from the page. So the map needs
 * its own gazetteer.
 * It covers every city a Kamui shop delivers to today plus the state's larger
 * cities, so a zone added tomorrow usually gets its pin without a code change.
 * A city that is not here simply has no pin; it is still in the list under the
 * map, which is the authoritative one.
 *
 * Keys are `citySlug()` forms. City-centre precision (two decimals ≈ 1 km) is
 * the honest precision for "we deliver in this city".
 */
export const CA_CITIES: Record<string, readonly [number, number]> = {
  // Sacramento area
  sacramento: [38.58, -121.49], "arden-arcade": [38.6, -121.38], "citrus-heights": [38.71, -121.28], roseville: [38.75, -121.29],
  "granite-bay": [38.76, -121.16], rocklin: [38.79, -121.24], folsom: [38.68, -121.18], "rancho-cordova": [38.59, -121.3],
  carmichael: [38.62, -121.33], antelope: [38.71, -121.36], "fair-oaks": [38.64, -121.27], orangevale: [38.68, -121.23],
  "north-highlands": [38.69, -121.37], lincoln: [38.89, -121.29], "west-sacramento": [38.58, -121.53], "elk-grove": [38.41, -121.37],
  davis: [38.54, -121.74], woodland: [38.68, -121.77], auburn: [38.9, -121.08], "el-dorado-hills": [38.69, -121.08],
  // Central Valley
  fresno: [36.74, -119.79], clovis: [36.83, -119.7], visalia: [36.33, -119.29], tulare: [36.21, -119.35], bakersfield: [35.37, -119.02],
  stockton: [37.96, -121.29], modesto: [37.64, -120.99], merced: [37.3, -120.48], hanford: [36.33, -119.65], madera: [36.96, -120.06],
  porterville: [36.07, -119.02], turlock: [37.49, -120.85], lodi: [38.13, -121.27], tracy: [37.74, -121.43], manteca: [37.8, -121.22],
  // Inland Empire
  chino: [34.01, -117.69], "chino-hills": [33.99, -117.76], corona: [33.88, -117.57], fontana: [34.09, -117.44], "jurupa-valley": [34.0, -117.47],
  ontario: [34.06, -117.65], pomona: [34.06, -117.75], "rancho-cucamonga": [34.11, -117.59], riverside: [33.95, -117.4],
  "san-bernardino": [34.11, -117.29], upland: [34.1, -117.65], eastvale: [33.95, -117.56], norco: [33.93, -117.55], claremont: [34.1, -117.72],
  "moreno-valley": [33.94, -117.23], redlands: [34.06, -117.18], rialto: [34.11, -117.37], colton: [34.07, -117.31], montclair: [34.08, -117.69],
  temecula: [33.49, -117.15], murrieta: [33.55, -117.21], perris: [33.78, -117.23], hemet: [33.75, -116.97], "lake-elsinore": [33.67, -117.33],
  hesperia: [34.43, -117.3], "apple-valley": [34.5, -117.19], victorville: [34.54, -117.29], "palm-springs": [33.83, -116.55],
  // Orange County
  anaheim: [33.84, -117.91], "costa-mesa": [33.64, -117.92], fullerton: [33.87, -117.92], "huntington-beach": [33.66, -118.0],
  irvine: [33.68, -117.83], "la-habra": [33.93, -117.95], "newport-beach": [33.62, -117.93], orange: [33.79, -117.85],
  "santa-ana": [33.75, -117.87], westminster: [33.76, -118.0], "yorba-linda": [33.89, -117.81], "garden-grove": [33.77, -117.94],
  tustin: [33.74, -117.83], "buena-park": [33.87, -118.0], "lake-forest": [33.65, -117.69], "mission-viejo": [33.6, -117.67],
  "laguna-beach": [33.54, -117.78], "san-clemente": [33.43, -117.61], brea: [33.92, -117.9], placentia: [33.87, -117.87],
  cypress: [33.82, -118.04], "fountain-valley": [33.71, -117.95], "seal-beach": [33.74, -118.1], "dana-point": [33.47, -117.7],
  // Los Angeles County
  "los-angeles": [34.05, -118.24], "downtown-la": [34.04, -118.25], "central-la": [34.06, -118.3], "east-la": [34.02, -118.17],
  cerritos: [33.86, -118.06], compton: [33.9, -118.22], "long-beach": [33.77, -118.19], pasadena: [34.15, -118.14], glendale: [34.14, -118.26],
  burbank: [34.18, -118.31], "santa-monica": [34.02, -118.49], venice: [33.99, -118.47], hollywood: [34.1, -118.33], "west-hollywood": [34.09, -118.36],
  "van-nuys": [34.19, -118.45], "north-hollywood": [34.17, -118.38], torrance: [33.84, -118.34], inglewood: [33.96, -118.35], downey: [33.94, -118.13],
  whittier: [33.98, -118.03], norwalk: [33.9, -118.08], "el-monte": [34.07, -118.03], "west-covina": [34.07, -117.94], "santa-clarita": [34.39, -118.54],
  lancaster: [34.7, -118.14], palmdale: [34.58, -118.12], "culver-city": [34.02, -118.4], "beverly-hills": [34.07, -118.4], "san-fernando": [34.28, -118.44],
  // San Diego
  "san-diego": [32.72, -117.16], escondido: [33.12, -117.09], oceanside: [33.2, -117.38], "chula-vista": [32.64, -117.08], carlsbad: [33.16, -117.35],
  "el-cajon": [32.79, -116.96], vista: [33.2, -117.24], "san-marcos": [33.14, -117.17], encinitas: [33.04, -117.29], "la-mesa": [32.77, -117.02],
  // Bay Area and coast
  "san-francisco": [37.77, -122.42], oakland: [37.8, -122.27], "san-jose": [37.34, -121.89], fremont: [37.55, -121.99], hayward: [37.67, -122.08],
  berkeley: [37.87, -122.27], concord: [37.98, -122.03], "santa-rosa": [38.44, -122.71], vallejo: [38.1, -122.26], "santa-cruz": [36.97, -122.03],
  salinas: [36.68, -121.66], "santa-barbara": [34.42, -119.7], ventura: [34.27, -119.23], oxnard: [34.2, -119.18], "thousand-oaks": [34.17, -118.84],
  "san-luis-obispo": [35.28, -120.66], redding: [40.59, -122.39], chico: [39.73, -121.84], eureka: [40.8, -124.16], "yuba-city": [39.14, -121.62],
};
