/* ============================================================
   WANDERLUST — Backend Seed Script
   Run: node backend/seed.js
   Seeds Destinations, Packages (and clears old data first)
   ============================================================ */

'use strict';
require('dotenv').config();
const mongoose = require('mongoose');
const Destination = require('./models/Destination');
const Package = require('./models/Package');

const destinations = [
    { name: 'Santorini', country: 'Greece', region: 'Europe', image: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800&q=80', description: 'Iconic white-washed villages perched on volcanic cliffs above the caldera.', rating: 4.9, reviewCount: 2340, startingPrice: 85000, featured: true },
    { name: 'Kyoto', country: 'Japan', region: 'Asia', image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80', description: 'Ancient temples, cherry blossom gardens, and vibrant street markets.', rating: 4.8, reviewCount: 3110, startingPrice: 72000, featured: true },
    { name: 'Maldives', country: 'Maldives', region: 'Asia', image: 'https://images.unsplash.com/photo-1499678329028-101435549a4e?w=800&q=80', description: 'Crystal-clear turquoise waters and overwater bungalows in paradise.', rating: 4.9, reviewCount: 1850, startingPrice: 120000, featured: true },
    { name: 'Machu Picchu', country: 'Peru', region: 'Americas', image: 'https://images.unsplash.com/photo-1587595431973-160d0d94add1?w=800&q=80', description: 'The legendary Inca citadel set high in the Andes mountains.', rating: 4.8, reviewCount: 2780, startingPrice: 95000, featured: true },
    { name: 'Safari Kenya', country: 'Kenya', region: 'Africa', image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80', description: 'Experience the Great Migration across the Masai Mara reserve.', rating: 4.9, reviewCount: 1230, startingPrice: 140000, featured: false },
    { name: 'Swiss Alps', country: 'Switzerland', region: 'Europe', image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80', description: 'Breathtaking mountain scenery with world-class skiing and hiking.', rating: 4.7, reviewCount: 1980, startingPrice: 110000, featured: false },
    { name: 'Bali', country: 'Indonesia', region: 'Asia', image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80', description: 'Tropical paradise with rice terraces, temples, and surf beaches.', rating: 4.6, reviewCount: 4200, startingPrice: 45000, featured: false },
    { name: 'Dubai', country: 'UAE', region: 'Middle East', image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&q=80', description: 'Ultra-modern skyline, luxury shopping, and desert adventure.', rating: 4.7, reviewCount: 3300, startingPrice: 80000, featured: false },
    { name: 'Patagonia', country: 'Argentina', region: 'Americas', image: 'https://images.unsplash.com/photo-1478827536114-da961b7f86d2?w=800&q=80', description: 'Wild glaciers, mountains, and untouched landscapes at the end of the world.', rating: 4.8, reviewCount: 890, startingPrice: 160000, featured: false },
    { name: 'Petra', country: 'Jordan', region: 'Middle East', image: 'https://images.unsplash.com/photo-1548199569-3e1c6aa8f469?w=800&q=80', description: 'The rose-red ancient Nabataean city carved into desert cliffs.', rating: 4.8, reviewCount: 1540, startingPrice: 68000, featured: false },
];

const packages = [
    {
        title: 'Greek Island Odyssey',
        badge: 'Bestseller',
        duration: { days: 8, nights: 7 },
        groupSize: { min: 2, max: 16 },
        price: 89999,
        description: 'Island-hop through Santorini, Mykonos, and Crete. Includes ferry transfers, sunset dinners, and a private catamaran cruise.',
        inclusions: ['Round-trip flights from major cities', 'Hotel accommodation (4-star)', 'Daily breakfast & 3 dinners', 'Private catamaran cruise', 'Expert guide throughout'],
        exclusions: ['Personal shopping & expenses', 'Travel insurance', 'Alcoholic beverages', 'Optional excursions'],
        itinerary: [
            { day: 1, title: 'Athens Arrival', description: 'Meet your guide, private transfer to hotel, welcome dinner.' },
            { day: 2, title: 'Athens Sightseeing', description: 'Acropolis, Parthenon, Monastiraki — ancient history comes alive.' },
            { day: 3, title: 'Ferry to Santorini', description: 'High-speed ferry to Santorini, sunset watch from Oia.' },
            { day: 4, title: 'Santorini Full Day', description: 'Caldera hike, wine tasting, private catamaran cruise.' },
            { day: 5, title: 'Mykonos Arrival', description: 'Ferry to Mykonos, beach clubs, windmills at Little Venice.' },
            { day: 6, title: 'Mykonos & Delos', description: 'Day trip to sacred Delos island, evening party strip.' },
            { day: 7, title: 'Crete Adventure', description: 'Samaria Gorge hike, old Venetian harbour dinner.' },
            { day: 8, title: 'Departure', description: 'Transfer to Athens airport, fond farewells.' },
        ],
        guide: { name: 'Nikos Papadopoulos', experience: 14, languages: ['English', 'Hindi', 'Greek'], image: 'https://randomuser.me/api/portraits/men/32.jpg' },
        featured: true,
    },
    {
        title: 'Maldives Luxury Escape',
        badge: 'Luxury',
        duration: { days: 6, nights: 5 },
        groupSize: { min: 2, max: 4 },
        price: 129999,
        description: 'Stay in an overwater bungalow, snorkel pristine reefs, enjoy sunrise yoga, and private beach dinners.',
        inclusions: ['Direct flights', 'Overwater villa (5-star)', 'All meals & drinks', 'Snorkelling & diving sessions', 'Sunset dolphin cruise'],
        exclusions: ['Spa treatments', 'Premium alcohol', 'Personal items'],
        itinerary: [
            { day: 1, title: 'Seaplane Transfer', description: 'Scenic seaplane to your private island, villa check-in.' },
            { day: 2, title: 'Snorkelling & Reef Dive', description: 'Morning reef snorkel, afternoon dive lesson, sunset cocktails.' },
            { day: 3, title: 'Sunrise Yoga & Spa', description: 'Yoga on the ocean deck, spa, beach BBQ dinner.' },
            { day: 4, title: 'Dolphin Cruise', description: 'Dolphin watching, night fishing, bioluminescent beach walk.' },
            { day: 5, title: 'Island Hopping', description: 'Visit local fishing village, sandbank picnic, farewell dinner.' },
            { day: 6, title: 'Departure', description: 'Seaplane back to Malé, transfer to airport.' },
        ],
        guide: { name: 'Aisha Rasheed', experience: 9, languages: ['English', 'Dhivehi', 'Hindi'], image: 'https://randomuser.me/api/portraits/women/44.jpg' },
        featured: true,
    },
    {
        title: 'Japan Cultural Immersion',
        badge: 'Cultural',
        duration: { days: 10, nights: 9 },
        groupSize: { min: 4, max: 12 },
        price: 74999,
        description: 'From Tokyo\'s neon streets to Kyoto\'s bamboo groves — experience Japan\'s ancient and modern soul.',
        inclusions: ['Japan Rail Pass', 'Ryokan & hotel stays', 'Daily breakfast', 'Tea ceremony', 'Mount Fuji day trip'],
        exclusions: ['International flights', 'Lunch & dinner (most days)', 'Personal expenses'],
        itinerary: [
            { day: 1, title: 'Tokyo Arrival', description: 'Check-in, Shinjuku evening walk, welcome ramen dinner.' },
            { day: 2, title: 'Tokyo Highlights', description: 'Shibuya crossing, Harajuku, Meiji Shrine, TeamLab digital art.' },
            { day: 3, title: 'Mount Fuji', description: 'Day trip to Fuji 5th Station, Hakone onsen in evening.' },
            { day: 4, title: 'Hakone Ryokan', description: 'Traditional ryokan, kaiseki dinner, open-air onsen bath.' },
            { day: 5, title: 'Bullet Train to Kyoto', description: 'Shinkansen journey, afternoon Fushimi Inari torii gates.' },
            { day: 6, title: 'Kyoto Temples', description: 'Kinkaku-ji, Arashiyama bamboo grove, tea ceremony.' },
            { day: 7, title: 'Nara & Osaka', description: 'Deer park in Nara, Dotonbori street food in Osaka.' },
            { day: 8, title: 'Osaka Adventure', description: 'Osaka Castle, Kuromon market, takoyaki cooking class.' },
            { day: 9, title: 'Hiroshima & Miyajima', description: 'Peace Memorial Museum, floating torii gate at Miyajima.' },
            { day: 10, title: 'Departure', description: 'Train to Osaka/Tokyo airport, farewell.' },
        ],
        guide: { name: 'Yuki Tanaka', experience: 11, languages: ['Japanese', 'English', 'Hindi'], image: 'https://randomuser.me/api/portraits/women/26.jpg' },
        featured: true,
    },
];

async function seed() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        await Destination.deleteMany({});
        await Package.deleteMany({});
        console.log('🗑️  Cleared existing data');

        const savedDests = await Destination.insertMany(destinations);
        console.log(`✅ Seeded ${savedDests.length} destinations`);

        // Attach first destination to each package
        const packagesWithDest = packages.map((p, i) => ({
            ...p,
            destination: savedDests[i % savedDests.length]._id,
        }));
        const savedPackages = await Package.insertMany(packagesWithDest);
        console.log(`✅ Seeded ${savedPackages.length} packages`);

        console.log('\n🎉 Database seeded successfully! Restart your server.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seed error:', err.message);
        process.exit(1);
    }
}

seed();
