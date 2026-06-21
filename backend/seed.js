/* ============================================================
   WANDERLUST — Backend Seed Script (Realistic India Data)
   Run: node backend/seed.js
   Seeds Destinations, Packages, Hotels, Restaurants
   ============================================================ */

'use strict';
require('dotenv').config();
const mongoose = require('mongoose');

// Models
const Destination = require('./models/Destination');
const Package = require('./models/Package');
const Hotel = require('./models/Hotel');
const Restaurant = require('./models/Restaurant');

const destinations = [
    { name: 'Goa', country: 'India', region: 'South Asia', image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800&q=80', description: 'Sun, sand, and sea. The perfect beach getaway with vibrant nightlife and Portuguese heritage.', rating: 4.8, reviewCount: 5200, startingPrice: 15000, featured: true },
    { name: 'Jaipur', country: 'India', region: 'South Asia', image: 'https://images.unsplash.com/photo-1599661555350-53bc770333b6?w=800&q=80', description: 'The Pink City of Rajasthan, known for its royal palaces, forts, and rich cultural heritage.', rating: 4.7, reviewCount: 4100, startingPrice: 12000, featured: true },
    { name: 'Munnar', country: 'India', region: 'South Asia', image: 'https://images.unsplash.com/photo-1593693397690-362cb9666fc2?w=800&q=80', description: 'Breathtaking tea plantations, misty mountains, and serene backwaters in Kerala.', rating: 4.9, reviewCount: 3800, startingPrice: 18000, featured: true },
    { name: 'Rishikesh', country: 'India', region: 'South Asia', image: 'https://images.unsplash.com/photo-1605640840469-80e2270d10b7?w=800&q=80', description: 'The Yoga Capital of the World. Perfect for spiritual retreats and river rafting adventures.', rating: 4.8, reviewCount: 3100, startingPrice: 9000, featured: true },
    { name: 'Somnath', country: 'India', region: 'South Asia', image: 'https://images.unsplash.com/photo-1624505374823-380d32c949a3?w=800&q=80', description: 'Home to the first among the twelve Jyotirlinga shrines of Shiva. A deeply spiritual pilgrimage.', rating: 4.9, reviewCount: 2900, startingPrice: 8000, featured: false },
    { name: 'Varanasi', country: 'India', region: 'South Asia', image: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?w=800&q=80', description: 'The spiritual heart of India. Experience the mesmerizing Ganga Aarti and ancient ghats.', rating: 4.8, reviewCount: 4500, startingPrice: 10000, featured: false }
];

const packages = [
    {
        title: 'Goa Beach Escape',
        badge: 'Bestseller',
        duration: { days: 5, nights: 4 },
        groupSize: { min: 2, max: 20 },
        price: 25000,
        description: 'Experience the ultimate beach holiday with water sports, sunset cruises, and vibrant nightlife.',
        inclusions: ['4-star beachfront resort', 'Daily breakfast & dinner', 'Airport transfers', 'Half-day sightseeing', 'Sunset cruise'],
        exclusions: ['Flights', 'Lunch', 'Personal expenses'],
        itinerary: [
            { day: 1, title: 'Arrival in Goa', description: 'Transfer to hotel. Relax by the beach.' },
            { day: 2, title: 'North Goa Tour', description: 'Visit Baga, Calangute, and Fort Aguada.' },
            { day: 3, title: 'Water Sports', description: 'Parasailing and jet skiing at Anjuna Beach.' },
            { day: 4, title: 'South Goa & Cruise', description: 'Visit old Goa churches and evening Mandovi river cruise.' },
            { day: 5, title: 'Departure', description: 'Check-out and transfer to airport.' }
        ],
        featured: true
    },
    {
        title: 'Royal Rajasthan Tour',
        badge: 'Heritage',
        duration: { days: 7, nights: 6 },
        groupSize: { min: 2, max: 15 },
        price: 45000,
        description: 'Explore the majestic forts, palaces, and vibrant culture of Jaipur, Jodhpur, and Udaipur.',
        inclusions: ['Heritage hotel stays', 'Daily breakfast', 'Intercity AC transport', 'Guided fort tours'],
        exclusions: ['Flights', 'Meals not mentioned', 'Monument entry fees'],
        itinerary: [
            { day: 1, title: 'Arrive in Jaipur', description: 'Welcome to the Pink City. Chokhi Dhani visit.' },
            { day: 2, title: 'Jaipur Sightseeing', description: 'Amber Fort, Hawa Mahal, and City Palace.' },
            { day: 3, title: 'Drive to Jodhpur', description: 'Transfer to the Blue City. Evening market visit.' },
            { day: 4, title: 'Jodhpur Tour', description: 'Mehrangarh Fort and Jaswant Thada.' },
            { day: 5, title: 'Drive to Udaipur', description: 'En route visit Ranakpur Jain Temples.' },
            { day: 6, title: 'Udaipur Sightseeing', description: 'City Palace and boat ride on Lake Pichola.' },
            { day: 7, title: 'Departure', description: 'Transfer to Udaipur airport.' }
        ],
        featured: true
    },
    {
        title: 'Kerala Backwaters & Hills',
        badge: 'Nature',
        duration: { days: 6, nights: 5 },
        groupSize: { min: 2, max: 12 },
        price: 35000,
        description: 'Discover the lush green tea gardens of Munnar and the tranquil backwaters of Alleppey.',
        inclusions: ['Premium resorts & Houseboat', 'All meals on houseboat', 'Breakfast at resorts', 'Private cab'],
        exclusions: ['Flights', 'Personal expenses'],
        itinerary: [
            { day: 1, title: 'Cochin to Munnar', description: 'Scenic drive to Munnar. View Cheeyappara waterfalls.' },
            { day: 2, title: 'Munnar Sightseeing', description: 'Eravikulam National Park and Tea Museum.' },
            { day: 3, title: 'Drive to Thekkady', description: 'Spice plantation tour and Periyar lake boating.' },
            { day: 4, title: 'Alleppey Houseboat', description: 'Check-in to a traditional houseboat. Cruise the backwaters.' },
            { day: 5, title: 'Drive to Cochin', description: 'Fort Kochi, Chinese fishing nets, and Jewish Synagogue.' },
            { day: 6, title: 'Departure', description: 'Transfer to Cochin airport.' }
        ],
        featured: true
    },
    {
        title: 'Spiritual Somnath & Dwarka',
        badge: 'Pilgrimage',
        duration: { days: 5, nights: 4 },
        groupSize: { min: 2, max: 30 },
        price: 18000,
        description: 'A deeply spiritual journey covering the sacred shrines of Dwarka and the majestic Somnath temple.',
        inclusions: ['3-star accommodation/Dharamshalas', 'Daily vegetarian breakfast & dinner', 'AC transport'],
        exclusions: ['Flights/Trains', 'Special pooja tickets'],
        itinerary: [
            { day: 1, title: 'Arrive in Rajkot/Ahmedabad', description: 'Drive to Dwarka. Evening Aarti at Dwarkadhish Temple.' },
            { day: 2, title: 'Dwarka Sightseeing', description: 'Visit Bet Dwarka, Nageshwar Jyotirlinga, and Rukmini Temple.' },
            { day: 3, title: 'Drive to Somnath', description: 'En route visit Porbandar (Kirti Mandir). Evening Aarti at Somnath.' },
            { day: 4, title: 'Somnath & Diu', description: 'Morning darshan. Optional half-day trip to Diu beaches.' },
            { day: 5, title: 'Departure', description: 'Return journey.' }
        ],
        featured: false
    }
];

const hotels = [
    {
        name: 'The Leela Goa',
        slug: 'the-leela-goa',
        type: 'resort',
        starRating: 5,
        description: 'A luxurious beach resort offering a perfect blend of Indian heritage and Portuguese architecture, set amidst 75 acres of lush gardens and pristine lagoons.',
        shortDescription: 'Luxury beach resort in South Goa with lagoons and private beach access.',
        location: {
            address: 'Mobor Beach, Cavelossim',
            city: 'Goa',
            state: 'Goa',
            country: 'India',
            coordinates: { lat: 15.1583, lng: 73.9453 }
        },
        contact: { phone: '+91 832 662 1234', email: 'reservations@theleela.goa' },
        coverImage: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80',
        images: ['https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80'],
        amenities: ['Pool', 'Spa', 'Private Beach', 'Fine Dining', 'Gym', 'WiFi'],
        isActive: true,
        approvalStatus: 'approved',
        startingPrice: 18000
    },
    {
        name: 'Taj Lake Palace',
        slug: 'taj-lake-palace',
        type: 'hotel',
        starRating: 5,
        description: 'Set on an island in the middle of Lake Pichola, this heritage hotel offers breathtaking views, exquisite architecture, and royal Rajasthani hospitality.',
        shortDescription: 'Iconic heritage hotel floating on Lake Pichola.',
        location: {
            address: 'Lake Pichola',
            city: 'Udaipur',
            state: 'Rajasthan',
            country: 'India',
            coordinates: { lat: 24.5764, lng: 73.6795 }
        },
        contact: { phone: '+91 294 242 8800', email: 'lakepalace@tajhotels.com' },
        coverImage: 'https://images.unsplash.com/photo-1542314831-c6a4d1424b40?w=800&q=80',
        images: ['https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&q=80'],
        amenities: ['Heritage Property', 'Boat Transfers', 'Spa', 'Fine Dining', 'Pool'],
        isActive: true,
        approvalStatus: 'approved',
        startingPrice: 35000
    },
    {
        name: 'Somnath Trust Dharamshala',
        slug: 'somnath-trust-dharamshala',
        type: 'dharamshala',
        starRating: 3,
        description: 'Clean, serene, and comfortable accommodation managed by the Somnath Temple Trust. Located within walking distance of the main temple.',
        shortDescription: 'Affordable and serene stay near Somnath Temple.',
        location: {
            address: 'Near Somnath Temple',
            city: 'Somnath',
            state: 'Gujarat',
            country: 'India',
            coordinates: { lat: 20.8879, lng: 70.4013 }
        },
        contact: { phone: '+91 2876 231 200', email: 'stay@somnath.org' },
        coverImage: 'https://images.unsplash.com/photo-1585827552668-d062e5b7dfb2?w=800&q=80',
        images: ['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80'],
        amenities: ['Pure Veg Restaurant', 'AC Rooms', 'Temple View', 'Parking'],
        isActive: true,
        approvalStatus: 'approved',
        startingPrice: 800
    },
    {
        name: 'Parmarth Niketan Ashram',
        slug: 'parmarth-niketan-ashram',
        type: 'dharamshala',
        starRating: 3,
        description: 'The largest ashram in Rishikesh, situated on the holy banks of Mother Ganga. A true spiritual haven offering yoga, meditation, and daily Ganga Aarti.',
        shortDescription: 'Spiritual ashram retreat on the banks of the Ganges.',
        location: {
            address: 'Swargashram',
            city: 'Rishikesh',
            state: 'Uttarakhand',
            country: 'India',
            coordinates: { lat: 30.1171, lng: 78.3129 }
        },
        contact: { phone: '+91 135 244 0077', email: 'info@parmarth.com' },
        coverImage: 'https://images.unsplash.com/photo-1605640840469-80e2270d10b7?w=800&q=80',
        images: [],
        amenities: ['Yoga Classes', 'Meditation Hall', 'Satvik Food', 'Ganga Ghat Access'],
        isActive: true,
        approvalStatus: 'approved',
        startingPrice: 600
    },
    {
        name: 'Munnar Tea Country Resort',
        slug: 'munnar-tea-country-resort',
        type: 'resort',
        starRating: 4,
        description: 'Nestled amidst the sprawling tea gardens, offering panoramic valley views, luxury cottages, and a tranquil escape from city life.',
        shortDescription: 'Serene resort surrounded by tea estates in Munnar.',
        location: {
            address: 'Chithirapuram',
            city: 'Munnar',
            state: 'Kerala',
            country: 'India',
            coordinates: { lat: 10.0380, lng: 77.0435 }
        },
        contact: { phone: '+91 4865 263 200', email: 'info@teacountry.com' },
        coverImage: 'https://images.unsplash.com/photo-1585409677983-0f6c4150611a?w=800&q=80',
        images: [],
        amenities: ['Spa', 'Mountain View', 'Restaurant', 'WiFi', 'Guided Treks'],
        isActive: true,
        approvalStatus: 'approved',
        startingPrice: 6500
    }
];

const restaurants = [
    {
        name: 'Indian Accent',
        slug: 'indian-accent',
        type: 'restaurant',
        cuisine: ['Modern Indian', 'Fusion'],
        description: 'Award-winning restaurant offering an inventive approach to Indian cuisine by exploring global ingredients and techniques with traditional flavors.',
        shortDescription: 'World-renowned fine dining modern Indian cuisine.',
        location: {
            address: 'The Lodhi, Lodhi Road',
            city: 'New Delhi',
            state: 'Delhi',
            country: 'India',
            coordinates: { lat: 28.5917, lng: 77.2384 }
        },
        contact: { phone: '+91 11 6617 5151' },
        coverImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80',
        features: ['Fine Dining', 'Bar', 'Valet Parking', 'Reservations Required'],
        isActive: true,
        approvalStatus: 'approved',
        avgCostForTwo: 5000,
        rating: 4.9
    },
    {
        name: 'Brittos',
        slug: 'brittos',
        type: 'cafe',
        cuisine: ['Goan', 'Seafood', 'Continental'],
        description: 'An iconic beach shack on Baga Beach famous for its lively atmosphere, fresh seafood, and traditional Goan vindaloo.',
        shortDescription: 'Legendary Goan beach shack and seafood restaurant.',
        location: {
            address: 'Baga Beach',
            city: 'Goa',
            state: 'Goa',
            country: 'India',
            coordinates: { lat: 15.5654, lng: 73.7554 }
        },
        contact: { phone: '+91 832 227 6291' },
        coverImage: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80',
        features: ['Beachfront', 'Live Music', 'Bar', 'Outdoor Seating'],
        isActive: true,
        approvalStatus: 'approved',
        avgCostForTwo: 1500,
        rating: 4.6
    },
    {
        name: 'Kesar Da Dhaba',
        slug: 'kesar-da-dhaba',
        type: 'restaurant',
        cuisine: ['North Indian', 'Punjabi', 'Vegetarian'],
        description: 'Historic dhaba serving authentic, rich Punjabi vegetarian food. Famous for its slow-cooked dal makhani and crisp parathas.',
        shortDescription: 'Legendary 100-year-old vegetarian dhaba.',
        location: {
            address: 'Chowk Passian, Near Town Hall',
            city: 'Amritsar',
            state: 'Punjab',
            country: 'India',
            coordinates: { lat: 31.6288, lng: 74.8723 }
        },
        contact: { phone: '+91 183 252 7777' },
        coverImage: 'https://images.unsplash.com/photo-1589302168068-964664d93cb0?w=800&q=80',
        features: ['Pure Veg', 'Historic', 'Casual'],
        isActive: true,
        approvalStatus: 'approved',
        avgCostForTwo: 600,
        rating: 4.8
    }
];

async function seed() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Wipe old data
        await Destination.deleteMany({});
        await Package.deleteMany({});
        await Hotel.deleteMany({});
        await Restaurant.deleteMany({});
        console.log('🗑️  Cleared existing Destinations, Packages, Hotels, and Restaurants');

        // Insert Destinations
        const savedDests = await Destination.insertMany(destinations);
        console.log(`✅ Seeded ${savedDests.length} destinations`);

        // Attach corresponding destinations to packages
        const getDestId = (name) => savedDests.find(d => d.name === name)?._id;
        
        packages[0].destination = getDestId('Goa');
        packages[1].destination = getDestId('Jaipur');
        packages[2].destination = getDestId('Munnar');
        packages[3].destination = getDestId('Somnath');

        const savedPackages = await Package.insertMany(packages);
        console.log(`✅ Seeded ${savedPackages.length} packages`);

        // Insert Hotels
        const savedHotels = await Hotel.insertMany(hotels);
        console.log(`✅ Seeded ${savedHotels.length} properties (Hotels/Resorts/Dharamshalas)`);

        // Insert Restaurants
        const savedRests = await Restaurant.insertMany(restaurants);
        console.log(`✅ Seeded ${savedRests.length} restaurants`);

        console.log('\n🎉 Authentic Indian Data seeded successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seed error:', err.message);
        process.exit(1);
    }
}

seed();
