// Demo dataset of candidate "sites" near Salt Lake City so the map ships with
// something recognisable. Two of these are marked as route endpoints (origin +
// destination) — the rest are pins the user can select from the sites table.
export const MAP_CENTER = { lat: 40.7608, lng: -111.891 }

export const MAP_SITES = [
  {
    id: 'site-1',
    name: 'Downtown Trailhead',
    address: '200 S Main St, Salt Lake City, UT',
    position: { lat: 40.7608, lng: -111.891 },
    role: 'origin',
  },
  {
    id: 'site-2',
    name: 'City Creek Overlook',
    address: '155 N State St, Salt Lake City, UT',
    position: { lat: 40.7738, lng: -111.888 },
    role: 'site',
  },
  {
    id: 'site-3',
    name: 'Ensign Peak Base',
    address: 'Ensign Peak Nature Park, Salt Lake City, UT',
    position: { lat: 40.7912, lng: -111.8865 },
    role: 'site',
  },
  {
    id: 'site-4',
    name: 'Memory Grove Park',
    address: '300 Canyon Rd, Salt Lake City, UT',
    position: { lat: 40.7742, lng: -111.878 },
    role: 'site',
  },
  {
    id: 'site-5',
    name: 'The Avenues Lookout',
    address: '11th Ave & N St, Salt Lake City, UT',
    position: { lat: 40.7805, lng: -111.868 },
    role: 'site',
  },
  {
    id: 'site-6',
    name: 'Liberty Park North Gate',
    address: '600 E 900 S, Salt Lake City, UT',
    position: { lat: 40.7462, lng: -111.8735 },
    role: 'destination',
  },
]
