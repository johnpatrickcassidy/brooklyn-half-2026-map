const closuresData = [
    {
        id: 1,
        street: "EASTERN PARKWAY",
        segment: "Grand Army Plaza to Bedford Avenue",
        noParking: "Thursday, May 14, 6:00 AM – Saturday, May 16, 11:30 AM (Varies by service roads)",
        closure: "Saturday, May 16, 12:00 AM – 12:30 PM",
        startMin: 0,
        endMin: 750,
        latlngs: [[40.6728, -73.9701], [40.6708, -73.9572]]
    },
    {
        id: 2,
        street: "PRESIDENT STREET AND UNION STREET",
        segment: "Classon Avenue to Franklin Avenue",
        noParking: "Friday, May 15, 6:00 AM – Saturday, May 16, 11:30 AM",
        closure: "Saturday, May 16, 12:00 AM – 12:30 PM",
        startMin: 0,
        endMin: 750,
        latlngs: [
            [[40.6715, -73.9605], [40.6705, -73.9580]], // President
            [[40.6722, -73.9610], [40.6712, -73.9585]]  // Union
        ]
    },
    {
        id: 3,
        street: "WASHINGTON AVENUE",
        segment: "Eastern Parkway to Empire Boulevard",
        noParking: "Friday, May 15, 6:00 AM – Saturday, May 16, 11:30 AM",
        closure: "Saturday, May 16, 12:00 AM – 12:30 PM",
        startMin: 0,
        endMin: 750,
        latlngs: [[40.6718, -73.9625], [40.6645, -73.9615]]
    },
    {
        id: 4,
        street: "EMPIRE BOULEVARD",
        segment: "Washington Ave to Flatbush Avenue",
        noParking: "Friday, May 15, 4:00 PM – Saturday, May 16, 11:00 AM",
        closure: "Saturday, May 16, 6:00 AM – 11:00 AM",
        startMin: 360,
        endMin: 660,
        latlngs: [[40.6645, -73.9615], [40.6630, -73.9610]]
    },
    {
        id: 5,
        street: "FLATBUSH AVENUE",
        segment: "Empire Boulevard to Grand Army Plaza",
        noParking: "Friday, May 15, 4:00 PM – Saturday, May 16, 11:30 AM",
        closure: "Saturday, May 16, 6:00 AM – 11:30 AM",
        startMin: 360,
        endMin: 690,
        latlngs: [[40.6630, -73.9610], [40.6728, -73.9701]]
    },
    {
        id: 6,
        street: "OCEAN AVENUE",
        segment: "Flatbush Avenue to Parkside Avenue",
        noParking: "Friday, May 15, 4:00 PM – Saturday, May 16, 11:30 AM",
        closure: "Saturday, May 16, 6:00 AM – 11:30 AM",
        startMin: 360,
        endMin: 690,
        latlngs: [[40.6630, -73.9610], [40.6560, -73.9615]]
    },
    {
        id: 7,
        street: "PARKSIDE AVENUE",
        segment: "Ocean Avenue to Park Circle",
        noParking: "Friday, May 15, 4:00 PM – Saturday, May 16, 12:00 PM",
        closure: "Saturday, May 16, 6:00 AM – 12:00 PM",
        startMin: 360,
        endMin: 720,
        latlngs: [[40.6560, -73.9615], [40.6530, -73.9710]]
    },
    {
        id: 8,
        street: "OCEAN PARKWAY",
        segment: "Park Circle to Surf Avenue",
        noParking: "Friday, May 15, 4:00 PM – Saturday, May 16, 2:00 PM",
        closure: "Saturday, May 16, 5:00 AM – 2:00 PM (Starts 6AM north of Shore Pkwy)",
        startMin: 300,
        endMin: 840,
        latlngs: [[40.6530, -73.9710], [40.5840, -73.9670], [40.5760, -73.9700]]
    },
    {
        id: 9,
        street: "OCEAN PARKWAY SERVICE ROAD",
        segment: "Neptune Avenue to West Brighton Avenue",
        noParking: "Friday, May 15, 4:00 PM – Saturday, May 16, 2:00 PM",
        closure: "Saturday, May 16, 5:00 AM – 2:00 PM",
        startMin: 300,
        endMin: 840,
        latlngs: [[40.5800, -73.9685], [40.5780, -73.9695]]
    },
    {
        id: 10,
        street: "WEST BRIGHTON AVENUE",
        segment: "Ocean Parkway to West 2nd Street",
        noParking: "Saturday, May 16, 12:00 AM – 2:00 PM",
        closure: "Saturday, May 16, 3:00 AM – 2:00 PM",
        startMin: 180,
        endMin: 840,
        latlngs: [[40.5780, -73.9690], [40.5775, -73.9715]]
    },
    {
        id: 11,
        street: "SEA BREEZE AVENUE",
        segment: "West 5th Street to Ocean Parkway",
        noParking: "Saturday, May 16, 12:00 AM – 2:00 PM",
        closure: "Saturday, May 16, 3:00 AM – 2:00 PM",
        startMin: 180,
        endMin: 840,
        latlngs: [[40.5765, -73.9730], [40.5770, -73.9695]]
    },
    {
        id: 12,
        street: "WEST 2ND STREET",
        segment: "West Brighton Avenue to Sea Breeze Avenue",
        noParking: "Friday, May 15, 4:00 PM – Saturday, May 16, 2:00 PM",
        closure: "Saturday, May 16, 3:00 AM – 2:00 PM",
        startMin: 180,
        endMin: 840,
        latlngs: [[40.5775, -73.9715], [40.5765, -73.9720]]
    },
    {
        id: 13,
        street: "WEST 5TH STREET",
        segment: "Surf Avenue to West Brighton Avenue",
        noParking: "Saturday, May 16, 12:00 AM – 2:00 PM",
        closure: "Saturday, May 16, 3:00 AM – 2:00 PM",
        startMin: 180,
        endMin: 840,
        latlngs: [[40.5755, -73.9740], [40.5770, -73.9730]]
    },
    {
        id: 14,
        street: "SURF AVENUE",
        segment: "Ocean Parkway to West 20th Street",
        noParking: "Friday, May 15, 4:00 PM – Saturday, May 16, 2:30 PM",
        closure: "Saturday, May 16, 7:00 AM – 2:30 PM",
        startMin: 420,
        endMin: 870,
        latlngs: [[40.5760, -73.9700], [40.5740, -73.9850]]
    },
    {
        id: 15,
        street: "WEST 10TH STREET",
        segment: "Surf Avenue to Boardwalk",
        noParking: "Friday, May 15, 12:00 AM – Saturday, May 16, 2:30 PM",
        closure: "Saturday, May 16, 12:00 AM – 2:30 PM",
        startMin: 0,
        endMin: 870,
        latlngs: [[40.5750, -73.9780], [40.5730, -73.9775]]
    },
    {
        id: 16,
        street: "STILLWELL AVENUE",
        segment: "Surf Avenue to Boardwalk",
        noParking: "Friday, May 15, 12:00 AM – Saturday, May 16, 2:30 PM",
        closure: "Saturday, May 16, 12:00 AM – 2:30 PM",
        startMin: 0,
        endMin: 870,
        latlngs: [[40.5748, -73.9800], [40.5725, -73.9795]]
    },
    {
        id: 17,
        street: "WEST 12TH STREET",
        segment: "Surf Avenue to Boardwalk",
        noParking: "Friday, May 15, 12:00 AM – Saturday, May 16, 2:30 PM",
        closure: "Saturday, May 16, 12:00 AM – 2:30 PM",
        startMin: 0,
        endMin: 870,
        latlngs: [[40.5745, -73.9810], [40.5722, -73.9805]]
    },
    {
        id: 18,
        street: "WEST 15TH STREET",
        segment: "Surf Avenue to Boardwalk",
        noParking: "Friday, May 15, 12:00 AM – Sunday, May 17, 3:00 PM",
        closure: "Saturday, May 16, 12:00 AM – 3:00 PM",
        startMin: 0,
        endMin: 900,
        latlngs: [[40.5742, -73.9830], [40.5720, -73.9825]]
    },
    {
        id: 19,
        street: "WEST 16TH STREET",
        segment: "Surf Avenue to Boardwalk",
        noParking: "Friday, May 15, 12:00 AM – Saturday, May 16, 4:00 PM",
        closure: "Saturday, May 16, 12:00 AM – 3:00 PM",
        startMin: 0,
        endMin: 900,
        latlngs: [[40.5740, -73.9840], [40.5718, -73.9835]]
    }
];

const trafficSegmentsData = [
    {
        id: 'flatbush_north',
        name: 'Flatbush Ave (North of Plaza)',
        type: 'Feeder Route',
        latlngs: [[40.6850, -73.9790], [40.6730, -73.9705]],
        defaultLevel: 'heavy'
    },
    {
        id: 'eastern_pkwy_east',
        name: 'Eastern Parkway (East of Start)',
        type: 'Feeder Route',
        latlngs: [[40.6700, -73.9550], [40.6680, -73.9350]],
        defaultLevel: 'moderate'
    },
    {
        id: 'bedford_ave',
        name: 'Bedford Avenue',
        type: 'Parallel (East)',
        latlngs: [[40.6700, -73.9550], [40.5850, -73.9400]],
        defaultLevel: 'heavy'
    },
    {
        id: 'coney_island_ave',
        name: 'Coney Island Avenue',
        type: 'Parallel (East)',
        latlngs: [[40.6500, -73.9680], [40.5800, -73.9600]],
        defaultLevel: 'severe'
    },
    {
        id: 'mcdonald_ave',
        name: 'McDonald Avenue',
        type: 'Parallel (West)',
        latlngs: [[40.6450, -73.9790], [40.5800, -73.9750]],
        defaultLevel: 'moderate'
    },
    {
        id: 'caton_ave',
        name: 'Caton Avenue',
        type: 'Cross Street',
        latlngs: [[40.6500, -73.9850], [40.6520, -73.9550]],
        defaultLevel: 'severe'
    },
    {
        id: 'church_ave',
        name: 'Church Avenue',
        type: 'Cross Street',
        latlngs: [[40.6450, -73.9900], [40.6480, -73.9500]],
        defaultLevel: 'heavy'
    },
    {
        id: 'kings_hwy',
        name: 'Kings Highway',
        type: 'Cross Street',
        latlngs: [[40.6050, -73.9900], [40.6150, -73.9400]],
        defaultLevel: 'heavy'
    },
    {
        id: 'neptune_ave',
        name: 'Neptune Avenue',
        type: 'Finish Area Feeder',
        latlngs: [[40.5800, -73.9900], [40.5820, -73.9500]],
        defaultLevel: 'severe'
    }
];
