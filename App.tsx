import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
    Page,
    TripPlan,
    TripFormData,
    DailyPlan,
    ItineraryItem,
    ClimateAnalysis
} from './types';
import { generateItinerary, analyzeClimateForTrip } from './services/geminiService';
import { ICONS } from './constants';
import { OPENROUTESERVICE_API_KEY } from './config';

declare global {
    interface Window {
        L: any;
    }
}



const LoadingSpinner: React.FC<{ message?: string }> = ({
    message = 'Crafting your masterpiece...'
}) => (
    <div className="fixed inset-0 bg-black/50 flex flex-col items-center justify-center z-[999]">
        <div className="w-16 h-16 border-4 border-t-blue-500 border-gray-200 rounded-full animate-spin" />
        <p className="text-white text-lg mt-4 font-semibold">{message}</p>
        <p className="text-gray-300 text-sm mt-1">This can take a moment.</p>
    </div>
);

const Footer: React.FC = () => (
    <footer className="w-full bg-white dark:bg-gray-800 shadow-inner mt-auto py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 dark:text-gray-400">
            <p>&copy; {new Date().getFullYear()} UCEOU. All rights reserved.</p>
        </div>
    </footer>
);

const ButtonSpinner: React.FC = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
        <path
            fill="currentColor"
            className="opacity-75"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
    </svg>
);


interface ClimateSuggestionModalProps {
    suggestion: ClimateAnalysis;
    onConfirm: () => void;
    onCancel: () => void;
    isLoading: boolean;
}

const ClimateSuggestionModal: React.FC<ClimateSuggestionModalProps> = ({
    suggestion,
    onConfirm,
    onCancel,
    isLoading
}) => {
    const formatDate = (d: string) =>
        new Date(d).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000]">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                <h2 className="text-2xl font-bold mb-4">Climate Suggestion 💡</h2>

                <p className="text-lg mb-4 bg-yellow-50 dark:bg-yellow-900/50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
                    {suggestion.analysis}
                </p>

                {suggestion.suggestedStartDate && suggestion.suggestedEndDate && (
                    <div className="mb-6">
                        <p className="font-semibold">Suggested travel window:</p>
                        <p className="text-blue-600 font-bold text-lg">
                            {formatDate(suggestion.suggestedStartDate)} →{' '}
                            {formatDate(suggestion.suggestedEndDate)}
                        </p>
                    </div>
                )}

                <div className="flex justify-center gap-4">
                    <button
                        onClick={onCancel}
                        disabled={isLoading}
                        className="px-6 py-3 rounded-lg bg-gray-200 dark:bg-gray-600 font-semibold flex items-center disabled:opacity-50"
                    >
                        {isLoading && <ButtonSpinner />}
                        Continue Anyway
                    </button>

                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="px-6 py-3 rounded-lg bg-blue-500 text-white font-semibold flex items-center disabled:opacity-50"
                    >
                        {isLoading && <ButtonSpinner />}
                        Use Suggested Dates
                    </button>
                </div>
            </div>
        </div>
    );
};



interface PageProps {
    navigateTo: (page: Page) => void;
}

interface NavbarProps extends PageProps {
    theme: 'light' | 'dark';
    toggleTheme: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ navigateTo, theme, toggleTheme }) => (
    <nav className="fixed top-0 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-md z-50">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center h-16">
            <button onClick={() => navigateTo('welcome')} className="font-bold text-2xl">
                ✈️ JourneyGenie
            </button>

            <div className="flex items-center gap-4">
                <div className="hidden md:flex gap-4 text-sm">
                    {['welcome', 'setup', 'visualization', 'about'].map(p => (
                        <button
                            key={p}
                            onClick={() => navigateTo(p as Page)}
                            className="hover:text-blue-600"
                        >
                            {p === 'welcome'
                                ? 'Home'
                                : p === 'setup'
                                ? 'Plan Trip'
                                : p === 'visualization'
                                ? 'My Itinerary'
                                : 'About'}
                        </button>
                    ))}
                </div>

                <button onClick={toggleTheme} className="p-2">
                    {theme === 'light' ? ICONS.moon : ICONS.sun}
                </button>
            </div>
        </div>
    </nav>
);


interface SetupPageProps extends PageProps {
    onGeneratePlan: (formData: TripFormData) => void;
    userPlan: 'free' | 'pro';
}

const SetupPage: React.FC<SetupPageProps> = ({
    navigateTo,
    onGeneratePlan,
    userPlan
}) => {
    const [formData, setFormData] = useState<Omit<TripFormData, 'destinations'>>({
        startCity: '',
        startDate: '',
        endDate: '',
        budget: '',
        travelStyle: ''
    });

    const [destinations, setDestinations] = useState<string[]>(['']);
    const [error, setError] = useState('');

    const updateField = (id: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [id]: value,
            ...(id === 'startDate' ? { endDate: '' } : {})
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const filled = destinations.filter(Boolean);

        if (
            !formData.startCity ||
            !formData.startDate ||
            !formData.endDate ||
            !formData.budget ||
            !formData.travelStyle ||
            filled.length === 0
        ) {
            setError('Please complete all required fields.');
            return;
        }

        setError('');
        onGeneratePlan({ ...formData, destinations: filled });
    };

    return (
        <div className="pt-24 pb-12 max-w-4xl mx-auto px-4">
            <form onSubmit={handleSubmit} className="space-y-6">
                {error && <p className="text-red-500">{error}</p>}

                <input
                    placeholder="Start city"
                    value={formData.startCity}
                    onChange={e => updateField('startCity', e.target.value)}
                    className="w-full border p-3 rounded"
                />

                {destinations.map((d, i) => (
                    <input
                        key={i}
                        placeholder={`Destination ${i + 1}`}
                        value={d}
                        onChange={e => {
                            const copy = [...destinations];
                            copy[i] = e.target.value;
                            setDestinations(copy);
                        }}
                        className="w-full border p-3 rounded"
                    />
                ))}

                <button
                    type="button"
                    onClick={() => {
                        if (userPlan === 'free' && destinations.length >= 4) {
                            return;
                        }
                        setDestinations(prev => [...prev, '']);
                    }}
                >
                    + Add destination
                </button>

                <button className="w-full bg-blue-500 text-white p-3 rounded">
                    Create My Itinerary
                </button>
            </form>
        </div>
    );
};


interface OpenRouteServiceMapProps {
    locations: ItineraryItem[];
    theme: 'light' | 'dark';
}

const OpenRouteServiceMap: React.FC<OpenRouteServiceMapProps> = ({
    locations,
    theme
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const tileLayerRef = useRef<any>(null);
    const [loading, setLoading] = useState(true);

    // Handle theme switch (tile layer swap)
    useEffect(() => {
        if (!mapRef.current) return;

        if (tileLayerRef.current) {
            mapRef.current.removeLayer(tileLayerRef.current);
        }

        const url =
            theme === 'dark'
                ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

        tileLayerRef.current = window.L.tileLayer(url, {
            attribution: '&copy; OpenStreetMap contributors'
        });

        mapRef.current.addLayer(tileLayerRef.current);
    }, [theme]);

    // Initialize + draw route
    useEffect(() => {
        if (!containerRef.current || !window.L) return;

        if (!mapRef.current) {
            mapRef.current = window.L.map(containerRef.current).setView([20, 0], 2);
        }

        const addMarkers = () => {
            locations.forEach((loc, i) => {
                window.L.marker([loc.coordinates.lat, loc.coordinates.lng])
                    .addTo(mapRef.current)
                    .bindPopup(`${i + 1}. ${loc.activity}`);
            });
        };

        const fetchRoute = async () => {
            if (locations.length < 2) {
                addMarkers();
                setLoading(false);
                return;
            }

            try {
                const coords = locations.map(l => [
                    l.coordinates.lng,
                    l.coordinates.lat
                ]);

                const res = await fetch(
                    'https://api.openrouteservice.org/v2/directions/driving-car',
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: OPENROUTESERVICE_API_KEY
                        },
                        body: JSON.stringify({ coordinates: coords })
                    }
                );

                const data = await res.json();

                const points = data.features[0].geometry.coordinates.map(
                    ([lng, lat]: [number, number]) => [lat, lng]
                );

                window.L.polyline(points).addTo(mapRef.current);
                addMarkers();
            } catch (err) {
                console.error('Route fetch failed', err);
                addMarkers();
            } finally {
                setLoading(false);
            }
        };

        fetchRoute();

        return () => {
            mapRef.current?.remove();
            mapRef.current = null;
        };
    }, [locations]);

    return (
        <div>
            <div ref={containerRef} style={{ height: 400 }} />
            {loading && <p>Loading map...</p>}
        </div>
    );
};

const App: React.FC = () => {
    const [page, setPage] = useState<Page>('welcome');
    const [tripPlan, setTripPlan] = useState<TripPlan | null>(null);
    const [selectedDay, setSelectedDay] = useState<DailyPlan | null>(null);

    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('Working...');
    const [error, setError] = useState<string | null>(null);

    const [climateSuggestion, setClimateSuggestion] =
        useState<ClimateAnalysis | null>(null);
    const [pendingForm, setPendingForm] = useState<TripFormData | null>(null);

    const [theme, setTheme] = useState<'light' | 'dark'>('light');

    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
    }, [theme]);

    const navigateTo = useCallback(
        (p: Page) => {
            if (p === 'visualization' && !tripPlan) {
                setPage('setup');
                return;
            }
            setPage(p);
            window.scrollTo(0, 0);
        },
        [tripPlan]
    );

    const generatePlan = useCallback(
        async (form: TripFormData) => {
            setLoading(true);
            setError(null);
            setClimateSuggestion(null);

            try {
                setLoadingMessage('Generating itinerary...');
                const plan = await generateItinerary(form);
                setTripPlan(plan);
                navigateTo('visualization');
            } catch (err: any) {
                setError(err.message || 'Failed to generate plan');
                navigateTo('setup');
            } finally {
                setLoading(false);
                setPendingForm(null);
            }
        },
        [navigateTo]
    );

    const handlePlan = useCallback(
        async (form: TripFormData) => {
            setLoading(true);
            setLoadingMessage('Checking climate...');

            try {
                const analysis = await analyzeClimateForTrip(form);

                if (analysis.isIdeal) {
                    await generatePlan(form);
                } else {
                    setPendingForm(form);
                    setClimateSuggestion(analysis);
                    setLoading(false);
                }
            } catch (err: any) {
                setError(err.message);
                setLoading(false);
            }
        },
        [generatePlan]
    );

    const confirmSuggestion = () => {
        if (!pendingForm || !climateSuggestion) return;

        generatePlan({
            ...pendingForm,
            startDate: climateSuggestion.suggestedStartDate!,
            endDate: climateSuggestion.suggestedEndDate!
        });
    };

    const cancelSuggestion = () => {
        if (pendingForm) generatePlan(pendingForm);
    };

    return (
        <div className="flex flex-col min-h-screen">
            {loading && !climateSuggestion && (
                <LoadingSpinner message={loadingMessage} />
            )}

            {climateSuggestion && (
                <ClimateSuggestionModal
                    suggestion={climateSuggestion}
                    onConfirm={confirmSuggestion}
                    onCancel={cancelSuggestion}
                    isLoading={loading}
                />
            )}

            <Navbar
                navigateTo={navigateTo}
                theme={theme}
                toggleTheme={() =>
                    setTheme(t => (t === 'light' ? 'dark' : 'light'))
                }
            />

            <main className="flex-grow">
                {page === 'setup' && (
                    <SetupPage
                        navigateTo={navigateTo}
                        onGeneratePlan={handlePlan}
                        userPlan="free"
                    />
                )}
            </main>

            <Footer />
        </div>
    );
};

export default App;
