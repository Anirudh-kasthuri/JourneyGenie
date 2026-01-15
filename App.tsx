import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Page, TripPlan, TripFormData, DailyPlan, ItineraryItem, Coordinates, ClimateAnalysis } from './types';
import { generateItinerary, analyzeClimateForTrip } from './services/geminiService';
import { ICONS } from './constants';
import { OPENROUTESERVICE_API_KEY } from './config';

declare global {
    interface Window {
        L: any;
    }
}

// --- Helper & UI Components (Defined outside App to prevent re-creation on re-renders) ---

const LoadingSpinner: React.FC<{ message?: string }> = ({ message = "Crafting your masterpiece..." }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center z-[999]">
        <div className="w-16 h-16 border-4 border-t-blue-500 border-gray-200 rounded-full animate-spin"></div>
        <p className="text-white text-lg mt-4 font-semibold">{message}</p>
        <p className="text-gray-300 text-sm mt-1">This can take a moment.</p>
    </div>
);

const Footer: React.FC = () => (
    <footer className="w-full bg-white dark:bg-gray-800 shadow-inner mt-auto py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500 dark:text-gray-400">
            <p>&copy; {new Date().getFullYear()} UCEOU. All rights reserved.</p>
        </div>
    </footer>
);

interface ClimateSuggestionModalProps {
    suggestion: ClimateAnalysis;
    onConfirm: () => void;
    onCancel: () => void;
    isLoading: boolean;
}

const ButtonSpinner: React.FC = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);


const ClimateSuggestionModal: React.FC<ClimateSuggestionModalProps> = ({ suggestion, onConfirm, onCancel, isLoading }) => (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[1000]">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full mx-4 text-center">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">Climate Suggestion 💡</h2>
            <p className="text-lg text-gray-700 dark:text-gray-200 mb-4 bg-yellow-50 dark:bg-yellow-900/50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
                {suggestion.analysis}
            </p>
            {suggestion.suggestedStartDate && suggestion.suggestedEndDate && (
                <div className="mb-6">
                    <p className="font-semibold text-gray-800 dark:text-gray-100">We suggest traveling from:</p>
                    <p className="text-blue-600 dark:text-blue-400 font-bold text-lg">
                        {new Date(suggestion.suggestedStartDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        {' to '}
                        {new Date(suggestion.suggestedEndDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                </div>
            )}
            <div className="flex justify-center space-x-4">
                <button
                    onClick={onCancel}
                    disabled={isLoading}
                    className="px-6 py-3 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-100 dark:hover:bg-gray-500 font-semibold transition-colors flex items-center justify-center disabled:opacity-50"
                >
                    {isLoading && <ButtonSpinner />}
                    Continue Anyway
                </button>
                <button
                    onClick={onConfirm}
                    disabled={isLoading}
                    className="px-6 py-3 rounded-lg text-white bg-blue-500 hover:bg-blue-600 font-semibold transition-colors flex items-center justify-center disabled:opacity-50"
                >
                     {isLoading && <ButtonSpinner />}
                    Use Suggested Dates
                </button>
            </div>
        </div>
    </div>
);


// --- Page Components ---

interface PageProps {
    navigateTo: (page: Page) => void;
}

interface NavbarProps extends PageProps {
    theme: 'light' | 'dark';
    toggleTheme: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ navigateTo, theme, toggleTheme }) => (
    <nav className="fixed top-0 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-md z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
                <button onClick={() => navigateTo('welcome')} className="flex items-center space-x-2">
                    <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">✈️ JourneyGenie</span>
                </button>
                <div className="flex items-center space-x-4">
                    <div className="hidden md:flex items-baseline space-x-4">
                        <button onClick={() => navigateTo('welcome')} className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium transition-colors">Home</button>
                        <button onClick={() => navigateTo('setup')} className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium transition-colors">Plan Trip</button>
                        <button onClick={() => navigateTo('visualization')} className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium transition-colors">My Itinerary</button>
                        <button onClick={() => navigateTo('about')} className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium transition-colors">About</button>
                    </div>
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none"
                        aria-label="Toggle theme"
                    >
                        {theme === 'light' ? ICONS.moon : ICONS.sun}
                    </button>
                </div>
            </div>
        </div>
    </nav>
);

const WelcomePage: React.FC<PageProps> = ({ navigateTo }) => (
    <div className="bg-gradient-to-br from-blue-600 to-purple-700 min-h-screen flex items-center justify-center relative overflow-hidden">
        <div className="absolute top-20 left-10 text-6xl opacity-20 animate-pulse">🏖️</div>
        <div className="absolute top-40 right-20 text-4xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }}>🏔️</div>
        <div className="absolute bottom-20 left-20 text-5xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}>🏛️</div>
        
        <div className="text-center text-white z-10 max-w-4xl mx-auto px-4">
            <h1 className="text-5xl md:text-7xl font-extrabold mb-6 animate-fade-in-down">Your Journey, Reimagined</h1>
            <p className="text-lg md:text-xl mb-8 opacity-90 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                Craft unforgettable travel experiences with AI-powered planning, interactive maps, and personalized itineraries.
            </p>
            <div className="animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
                <button onClick={() => navigateTo('setup')} className="bg-white text-purple-600 px-8 py-4 rounded-full text-lg font-semibold hover:bg-yellow-100 transition-all duration-300 transform hover:scale-105 shadow-lg">
                    Start Planning Your Adventure
                </button>
            </div>
        </div>
    </div>
);

interface SetupPageProps extends PageProps {
    onGeneratePlan: (formData: TripFormData) => void;
    userPlan: 'free' | 'pro';
}

const SetupPage: React.FC<SetupPageProps> = ({ navigateTo, onGeneratePlan, userPlan }) => {
    const [formData, setFormData] = useState<Omit<TripFormData, 'destinations'>>({
        startCity: '', startDate: '', endDate: '', budget: '', travelStyle: ''
    });
    const [destinations, setDestinations] = useState<string[]>(['']);
    const [error, setError] = useState('');

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
        if (id === 'startDate' && value) {
            setFormData(prev => ({...prev, endDate: ''}));
        }
    };
    
    const handleTravelStyleChange = (style: string) => {
        setFormData(prev => ({ ...prev, travelStyle: style }));
    };

    const handleDestinationChange = (index: number, value: string) => {
        const newDestinations = [...destinations];
        newDestinations[index] = value;
        setDestinations(newDestinations);
    };

    const addDestination = () => {
        if (userPlan === 'free' && destinations.length >= 4) {
            document.getElementById('upgradePrompt')?.classList.remove('hidden');
            return;
        }
        setDestinations([...destinations, '']);
    };

    const removeDestination = (index: number) => {
        if (destinations.length > 1) {
            setDestinations(destinations.filter((_, i) => i !== index));
        }
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const { startCity, startDate, endDate, budget, travelStyle } = formData;
        const filledDestinations = destinations.filter(d => d.trim() !== '');

        if (!startCity || filledDestinations.length === 0 || !startDate || !endDate || !budget || !travelStyle) {
            setError('Please fill in all fields, including a start city and at least one destination.');
            return;
        }
        setError('');
        onGeneratePlan({ ...formData, destinations: filledDestinations });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-purple-900/50 pt-24 pb-12">
            <div className="max-w-4xl mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-4xl font-bold text-gray-800 dark:text-gray-100 mb-4">Plan Your Perfect Trip</h2>
                    <p className="text-xl text-gray-600 dark:text-gray-300">Tell us your dream, and we'll craft the journey.</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && <p className="text-red-500 bg-red-100 dark:bg-red-900/50 dark:text-red-300 p-3 rounded-lg">{error}</p>}
                        
                        <div>
                            <label className="block text-lg font-semibold text-gray-700 dark:text-gray-200 mb-3">Where is your journey starting from?</label>
                            <input type="text" id="startCity" placeholder="e.g., Mumbai, India" value={formData.startCity} onChange={handleInputChange} className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:border-blue-500 focus:outline-none transition-colors text-lg" />
                        </div>
                        
                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <label className="text-lg font-semibold text-gray-700 dark:text-gray-200">Destinations</label>
                                <span className="text-sm text-gray-500 dark:text-gray-400">{userPlan === 'free' ? 'Up to 4 cities' : 'Unlimited'}</span>
                            </div>
                            <div id="destinationsContainer" className="space-y-3">
                                {destinations.map((destination, index) => (
                                    <div key={index} className="flex items-center space-x-3">
                                        <input type="text" placeholder={`Destination ${index + 1}`} value={destination} onChange={(e) => handleDestinationChange(index, e.target.value)} className="flex-1 px-4 py-3 border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:border-blue-500 focus:outline-none transition-colors" />
                                        {destinations.length > 1 && <button type="button" onClick={() => removeDestination(index)} className="bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-300 px-3 py-3 rounded-lg hover:bg-red-200 dark:hover:bg-red-900 transition-colors">✕</button>}
                                    </div>
                                ))}
                            </div>
                            <button type="button" onClick={addDestination} className="mt-3 text-blue-600 dark:text-blue-400 font-semibold hover:text-blue-800 dark:hover:text-blue-300">+ Add another destination</button>
                            <div id="upgradePrompt" className="hidden mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/50 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-yellow-800 dark:text-yellow-200 font-medium">Want to add more destinations?</p>
                                        <p className="text-yellow-600 dark:text-yellow-400 text-sm">Upgrade to Pro for unlimited cities.</p>
                                    </div>
                                    <button type="button" onClick={() => navigateTo('upgrade')} className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors">Upgrade</button>
                                </div>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-lg font-semibold text-gray-700 dark:text-gray-200 mb-3">Start Date</label>
                                <input type="date" id="startDate" min={new Date().toISOString().split('T')[0]} value={formData.startDate} onChange={handleInputChange} className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:border-blue-500 focus:outline-none transition-colors" />
                            </div>
                            <div>
                                <label className="block text-lg font-semibold text-gray-700 dark:text-gray-200 mb-3">End Date</label>
                                <input type="date" id="endDate" min={formData.startDate || new Date().toISOString().split('T')[0]} value={formData.endDate} onChange={handleInputChange} className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:border-blue-500 focus:outline-none transition-colors" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-lg font-semibold text-gray-700 dark:text-gray-200 mb-3">Budget (in Rupees)</label>
                            <select id="budget" value={formData.budget} onChange={handleInputChange} className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:border-blue-500 focus:outline-none transition-colors text-lg">
                                <option value="">Select your budget</option>
                                <option value="budget">Budget-Friendly (₹)</option>
                                <option value="moderate">Moderate (₹₹)</option>
                                <option value="luxury">Luxury (₹₹₹)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-lg font-semibold text-gray-700 dark:text-gray-200 mb-3">Travel Style</label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {Object.entries(ICONS).filter(([key]) => ['adventure', 'culture', 'relaxation', 'foodie'].includes(key)).map(([style, icon]) => (
                                    <div key={style} onClick={() => handleTravelStyleChange(style)} className={`flex flex-col items-center p-4 border-2 rounded-lg cursor-pointer transition-all duration-300 ${formData.travelStyle === style ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/50 dark:border-blue-400' : 'border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md hover:-translate-y-1'}`}>
                                        {icon}
                                        <span className="text-sm font-medium capitalize text-gray-800 dark:text-gray-200">{style}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <button type="submit" className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-4 rounded-lg text-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg">
                            Create My Itinerary ✨
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

interface UpgradePageProps extends PageProps {
    onUpgrade: () => void;
}

const UpgradePage: React.FC<UpgradePageProps> = ({ navigateTo, onUpgrade }) => (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-pink-900/50 pt-24 pb-12">
        <div className="max-w-4xl mx-auto px-4">
            <div className="text-center mb-12">
                <h2 className="text-4xl font-bold text-gray-800 dark:text-gray-100 mb-4">Unlock Your Ultimate Travel Companion</h2>
                <p className="text-xl text-gray-600 dark:text-gray-300">Go Pro to elevate your planning experience.</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-2xl shadow-xl p-8 transform scale-105">
                <h3 className="text-3xl font-bold mb-2 text-center">Pro Plan</h3>
                <p className="text-center text-yellow-300 font-semibold mb-6">MOST POPULAR</p>
                <div className="text-center text-5xl font-bold mb-8">$9.99<span className="text-lg font-normal">/month</span></div>
                <ul className="space-y-4 mb-10 text-lg">
                    <li className="flex items-center"><span className="text-yellow-300 mr-3 text-2xl">✓</span> Unlimited destinations</li>
                    <li className="flex items-center"><span className="text-yellow-300 mr-3 text-2xl">✓</span> AI-powered recommendations</li>
                    <li className="flex items-center"><span className="text-yellow-300 mr-3 text-2xl">✓</span> Premium restaurant suggestions</li>
                    <li className="flex items-center"><span className="text-yellow-300 mr-3 text-2xl">✓</span> Offline map access</li>
                    <li className="flex items-center"><span className="text-yellow-300 mr-3 text-2xl">✓</span> Priority customer support</li>
                </ul>
                <button onClick={onUpgrade} className="w-full bg-white text-purple-600 py-4 rounded-lg text-lg font-semibold hover:bg-yellow-100 transition-colors">Upgrade to Pro</button>
            </div>
             <div className="text-center mt-8">
                <button onClick={() => navigateTo('setup')} className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 underline">← Back to Trip Planning</button>
            </div>
        </div>
    </div>
);


interface VisualizationPageProps extends PageProps {
    tripPlan: TripPlan;
    onSelectDay: (day: DailyPlan) => void;
}

const VisualizationPage: React.FC<VisualizationPageProps> = ({ tripPlan, onSelectDay, navigateTo }) => (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-24 pb-12">
        <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-8">
                <h2 className="text-4xl font-bold text-gray-800 dark:text-gray-100 mb-4">{tripPlan.destination}</h2>
                <p className="text-xl text-gray-600 dark:text-gray-300">An interactive overview of your adventure.</p>
            </div>
            <div className="grid lg:grid-cols-2 gap-8">
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 sticky top-24">
                        <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">Trip Timeline</h3>
                        <div className="relative">
                            <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gray-200 dark:bg-gray-700"></div>
                            {tripPlan.dailyPlans.map((day, index) => (
                                <div key={index} onClick={() => onSelectDay(day)} className="relative pl-10 py-2 cursor-pointer group rounded-md transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <div className="absolute left-1.5 top-3.5 w-5 h-5 bg-white dark:bg-gray-800 border-4 border-blue-500 rounded-full transition-all group-hover:scale-125 group-hover:border-purple-500"></div>
                                    <h4 className="font-bold text-gray-800 dark:text-gray-100 group-hover:text-purple-600 dark:group-hover:text-purple-400">Day {day.day}: <span className="font-medium">{day.location}</span></h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-300">{day.title} <span className="text-xs text-gray-500 dark:text-gray-400">({new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})</span></p>
                                    <p className="text-sm text-blue-600 dark:text-blue-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">View details →</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 sticky top-24">
                        <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">Trip Summary</h3>
                        <div className="grid grid-cols-1 gap-4">
                            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/50 rounded-lg"><div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{tripPlan.totalDays}</div><div className="text-sm text-gray-600 dark:text-gray-300">Days</div></div>
                            <div className="text-center p-4 bg-green-50 dark:bg-green-900/50 rounded-lg"><div className="text-2xl font-bold text-green-600 dark:text-green-400">{tripPlan.dailyPlans.flatMap(d => d.itinerary).length}</div><div className="text-sm text-gray-600 dark:text-gray-300">Activities</div></div>
                            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/50 rounded-lg"><div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{tripPlan.estimatedBudget}</div><div className="text-sm text-gray-600 dark:text-gray-300">Budget</div></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

interface DayDetailsPageProps extends PageProps {
    dayPlan: DailyPlan;
    destination: string;
    theme: 'light' | 'dark';
}

interface OpenRouteServiceMapProps {
    locations: ItineraryItem[];
    theme: 'light' | 'dark';
}

const OpenRouteServiceMap: React.FC<OpenRouteServiceMapProps> = ({ locations, theme }) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);
    const tileLayerRef = useRef<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Effect for handling theme changes on the tile layer
    useEffect(() => {
        if (!mapInstance.current) return;

        // Remove old tile layer
        if (tileLayerRef.current) {
            mapInstance.current.removeLayer(tileLayerRef.current);
        }

        const tileUrl = theme === 'dark' 
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        const attribution = theme === 'dark'
            ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
        
        // FIX: Explicitly set the attribution property to resolve potential shorthand property errors.
        tileLayerRef.current = window.L.tileLayer(tileUrl, { attribution: attribution });
        mapInstance.current.addLayer(tileLayerRef.current);

    }, [theme]);

    // Effect for map initialization and plotting route/markers
    useEffect(() => {
        if (!mapContainer.current || !window.L) return;
        if (mapInstance.current) {
             // If map already exists, just clear markers and routes for re-render
            mapInstance.current.eachLayer((layer: any) => {
                if (layer instanceof window.L.Marker || layer instanceof window.L.Polyline) {
                    mapInstance.current.removeLayer(layer);
                }
            });
        } else {
            mapInstance.current = window.L.map(mapContainer.current).setView([20, 0], 2);
        }
        
        // This will be set by the theme effect, but we need a default for initial load
        if (!tileLayerRef.current) {
            const initialTileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
            const initialAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
            // FIX: Use the 'initialAttribution' variable, which is in scope, instead of 'attribution'.
            tileLayerRef.current = window.L.tileLayer(initialTileUrl, { attribution: initialAttribution }).addTo(mapInstance.current);
        }

        const plotMarkers = (fit = true) => {
            const markers = locations.map((location, index) => {
                const marker = window.L.marker([location.coordinates.lat, location.coordinates.lng])
                    .addTo(mapInstance.current)
                    .bindPopup(`<b>${index + 1}. ${location.activity}</b><br>${location.location}`);
                return marker;
            });
            if (fit && markers.length > 0) {
                const group = window.L.featureGroup(markers);
                mapInstance.current.fitBounds(group.getBounds().pad(0.2));
            }
        };

        const fetchRoute = async () => {
            if (locations.length < 2) {
                setIsLoading(false);
                if (locations.length === 1) plotMarkers();
                return;
            }

            try {
                const coordinates = locations.map(l => [l.coordinates.lng, l.coordinates.lat]);
                
                const response = await fetch('https://api.openrouteservice.org/v2/directions/driving-car', {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8',
                        'Content-Type': 'application/json',
                        'Authorization': OPENROUTESERVICE_API_KEY
                    },
                    body: JSON.stringify({ coordinates })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                const routeCoordinates = data.features[0].geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);
                
                const polyline = window.L.polyline(routeCoordinates, { color: theme === 'dark' ? '#60a5fa' : 'blue' }).addTo(mapInstance.current);
                mapInstance.current.fitBounds(polyline.getBounds().pad(0.2));
                plotMarkers(false);

            } catch (err) {
                console.error("Failed to fetch route:", err);
                plotMarkers();
            } finally {
                setIsLoading(false);
            }
        };

        if (OPENROUTESERVICE_API_KEY && OPENROUTESERVICE_API_KEY !== "YOUR_OPENROUTESERVICE_API_KEY_HERE") {
            fetchRoute();
        } else {
            console.error("OpenRouteService API key not provided in config.ts.");
            plotMarkers();
            setIsLoading(false);
        }

        return () => {
            if (mapInstance.current) {
                mapInstance.current.remove();
                mapInstance.current = null;
                tileLayerRef.current = null;
            }
        };
    }, [locations]);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">Today's Route Map</h3>
            <div ref={mapContainer} style={{ height: '400px', borderRadius: '12px' }} className="bg-gray-200 dark:bg-gray-700">
                 {isLoading && (
                    <div className="h-full flex flex-col items-center justify-center">
                        <div className="w-8 h-8 border-2 border-t-blue-500 border-gray-200 rounded-full animate-spin"></div>
                        <p className="mt-4 text-gray-600 dark:text-gray-300">Loading map and route...</p>
                    </div>
                )}
            </div>
        </div>
    );
};


const DayDetailsPage: React.FC<DayDetailsPageProps> = ({ dayPlan, theme, navigateTo }) => (
     <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-24 pb-12">
        <div className="max-w-4xl mx-auto px-4">
            <div className="mb-8">
                <button onClick={() => navigateTo('visualization')} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-4 flex items-center font-semibold">
                    {ICONS.backArrow} Back to Trip Overview
                </button>
                <p className="text-lg font-semibold text-purple-600 dark:text-purple-400 mb-1">{dayPlan.location}</p>
                <h2 className="text-4xl font-bold text-gray-800 dark:text-gray-100 mb-2">{`Day ${dayPlan.day}: ${dayPlan.title}`}</h2>
                <p className="text-xl text-gray-600 dark:text-gray-300">{dayPlan.date}</p>
            </div>
            <div className="space-y-8">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">Today's Itinerary</h3>
                    <div className="space-y-4">
                        {dayPlan.itinerary.map((item, i) => (
                             <a 
                                key={i} 
                                href={`https://www.google.com/search?q=${encodeURIComponent(`${item.location}, ${dayPlan.location}`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:shadow-md hover:bg-white dark:hover:bg-gray-700 transition-all duration-200 group"
                            >
                                <div className="flex items-start space-x-4">
                                    <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium min-w-max mt-1 group-hover:bg-purple-500 transition-colors">{item.time}</div>
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-gray-800 dark:text-gray-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">{item.activity}</h4>
                                        <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">{item.location}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{item.description}</p>
                                    </div>
                                    <div className="text-gray-400 dark:text-gray-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-opacity opacity-0 group-hover:opacity-100">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                          <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
                
                <OpenRouteServiceMap locations={dayPlan.itinerary} theme={theme} />

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">Nearby Attractions</h3>
                    <div className="grid gap-4">
                        {dayPlan.nearbyAttractions.map((attraction, i) => (
                            <div key={i} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:shadow-md hover:bg-white dark:hover:bg-gray-700 transition-shadow">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h5 className="font-medium text-gray-800 dark:text-gray-200">{attraction.name}</h5>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{attraction.description}</p>
                                    </div>
                                    <span className="text-sm font-bold text-yellow-500 bg-yellow-100 dark:bg-yellow-900/50 dark:text-yellow-400 px-2 py-1 rounded-full ml-2">⭐ {attraction.rating}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    </div>
);

const AboutPage: React.FC<PageProps> = ({ navigateTo }) => (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-24 pb-12">
        <div className="max-w-4xl mx-auto px-4">
            <div className="text-center mb-12">
                <h2 className="text-4xl font-bold text-gray-800 dark:text-gray-100 mb-4">About JourneyGenie AI</h2>
                <p className="text-xl text-gray-600 dark:text-gray-300">Your Personal AI-Powered Travel Planner</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 space-y-6 text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
                <p>
                    <strong>JourneyGenie</strong> is a revolutionary travel planning application designed to transform your dream vacation into a meticulously planned reality. We harness the power of Google's cutting-edge Gemini AI to create personalized, day-by-day itineraries that are tailored to your unique interests, budget, and travel style.
                </p>
                <p>
                    Our mission is to eliminate the stress and complexity of travel planning. Instead of spending hours researching destinations, booking hotels, and coordinating activities, you can simply tell JourneyGenie your desires, and our AI will do the heavy lifting. From adventure and cultural exploration to relaxation and culinary journeys, we craft a seamless experience just for you.
                </p>
                <div className="bg-blue-50 dark:bg-blue-900/50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                    <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-2">How It Works</h3>
                    <p>
                        Our intelligent system takes your input—starting city, destinations, dates, budget, and travel style—and communicates with the Gemini AI. The AI analyzes your request to generate a comprehensive itinerary.
                    </p>
                </div>
                <p>
                    We believe that the journey begins the moment you start planning. With JourneyGenie, that beginning is inspiring, effortless, and filled with excitement for the adventure that lies ahead.
                </p>
                <div className="text-center pt-4">
                     <button onClick={() => navigateTo('setup')} className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg text-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg">
                        Plan Your First Trip
                    </button>
                </div>
            </div>
        </div>
    </div>
);

// --- Main App Component ---

const App: React.FC = () => {
    const [page, setPage] = useState<Page>('welcome');
    const [userPlan, setUserPlan] = useState<'free' | 'pro'>('free');
    const [tripPlan, setTripPlan] = useState<TripPlan | null>(null);
    const [selectedDay, setSelectedDay] = useState<DailyPlan | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingMessage, setLoadingMessage] = useState<string>("Crafting your masterpiece...");
    const [error, setError] = useState<string | null>(null);
    const [climateSuggestion, setClimateSuggestion] = useState<ClimateAnalysis | null>(null);
    const [pendingFormData, setPendingFormData] = useState<TripFormData | null>(null);
    const [isSuggestionLoading, setIsSuggestionLoading] = useState<boolean>(false);
    const [theme, setTheme] = useState<'light' | 'dark'>('light');

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
    };
    
    const navigateTo = useCallback((newPage: Page) => {
      if (newPage === 'visualization' && !tripPlan) {
        setPage('setup');
        return;
      }
      setPage(newPage);
      window.scrollTo(0, 0);
    }, [tripPlan]);

    const proceedToGenerateItinerary = useCallback(async (formData: TripFormData) => {
        setIsLoading(true);
        setError(null);
        setClimateSuggestion(null); // Hide the modal
        try {
            setLoadingMessage("Generating your itinerary...");
            const plan = await generateItinerary(formData);
            setTripPlan(plan);
            navigateTo('visualization');
        } catch (e) {
            const err = e as Error;
            setError(err.message || "An unknown error occurred.");
            navigateTo('setup'); // Go back to setup page on error
        } finally {
            setIsLoading(false);
            setPendingFormData(null);
            setIsSuggestionLoading(false);
        }
    }, [navigateTo]);

    const handlePlanGeneration = useCallback(async (formData: TripFormData) => {
        setIsLoading(true);
        setError(null);
        setLoadingMessage("Checking climate...");
        
        try {
            const climateAnalysis = await analyzeClimateForTrip(formData);
            if (climateAnalysis.isIdeal) {
                await proceedToGenerateItinerary(formData);
            } else {
                setPendingFormData(formData);
                setClimateSuggestion(climateAnalysis);
                setIsLoading(false); // Turn off loader to show the modal
            }
        } catch (e) {
            const err = e as Error;
            setError(err.message || "An unknown error occurred during climate check.");
            setIsLoading(false);
        }
    }, [proceedToGenerateItinerary]);

    const handleConfirmSuggestion = useCallback(() => {
        if (pendingFormData && climateSuggestion?.suggestedStartDate && climateSuggestion?.suggestedEndDate) {
            setIsSuggestionLoading(true);
            const updatedFormData = {
                ...pendingFormData,
                startDate: climateSuggestion.suggestedStartDate,
                endDate: climateSuggestion.suggestedEndDate,
            };
            proceedToGenerateItinerary(updatedFormData);
        }
    }, [pendingFormData, climateSuggestion, proceedToGenerateItinerary]);

    const handleCancelSuggestion = useCallback(() => {
        if (pendingFormData) {
            setIsSuggestionLoading(true);
            proceedToGenerateItinerary(pendingFormData);
        }
    }, [pendingFormData, proceedToGenerateItinerary]);

    const handleSelectDay = useCallback((day: DailyPlan) => {
        setSelectedDay(day);
        navigateTo('dayDetails');
    }, [navigateTo]);
    
    const handleUpgrade = useCallback(() => {
        setUserPlan('pro');
        alert('Welcome to JourneyGenie Pro! You now have access to unlimited stops and premium features.');
        navigateTo('setup');
    }, [navigateTo]);

    const renderPage = () => {
        switch (page) {
            case 'welcome':
                return <WelcomePage navigateTo={navigateTo} />;
            case 'setup':
                return <SetupPage navigateTo={navigateTo} onGeneratePlan={handlePlanGeneration} userPlan={userPlan} />;
            case 'upgrade':
                return <UpgradePage navigateTo={navigateTo} onUpgrade={handleUpgrade} />;
            case 'visualization':
                if (tripPlan) {
                    return <VisualizationPage tripPlan={tripPlan} onSelectDay={handleSelectDay} navigateTo={navigateTo} />;
                }
                return null;
            case 'dayDetails':
                if (selectedDay && tripPlan) {
                    // FIX: Pass the required 'destination' prop from the trip plan.
                    return <DayDetailsPage dayPlan={selectedDay} destination={tripPlan.destination} navigateTo={navigateTo} theme={theme} />;
                }
                return null;
            case 'about':
                return <AboutPage navigateTo={navigateTo} />;
            default:
                return <WelcomePage navigateTo={navigateTo} />;
        }
    };
    
    return (
        <div className="flex flex-col min-h-screen">
            {isLoading && !climateSuggestion && <LoadingSpinner message={loadingMessage} />}
            {climateSuggestion && (
                 <ClimateSuggestionModal 
                    suggestion={climateSuggestion}
                    onConfirm={handleConfirmSuggestion}
                    onCancel={handleCancelSuggestion}
                    isLoading={isSuggestionLoading}
                />
            )}
            <Navbar navigateTo={navigateTo} theme={theme} toggleTheme={toggleTheme} />
            <main className="flex-grow">
                {error && page === 'setup' && (
                    <div className="bg-red-500 text-white p-4 text-center fixed top-16 w-full z-40">
                       <p><strong>Oops!</strong> {error} Please try again.</p>
                    </div>
                )}
                {renderPage()}
            </main>
            <Footer />
        </div>
    );
};

export default App;