export interface Coordinates {
  lat: number;
  lng: number;
}

export interface ItineraryItem {
  time: string;
  activity: string;
  location: string;
  description: string;
  coordinates: Coordinates;
}

export interface NearbyAttraction {
  name: string;
  rating: number;
  description: string;
  coordinates: Coordinates;
}

export interface DailyPlan {
  day: number;
  date: string;
  title: string;
  location: string; // The city for this day's plan
  itinerary: ItineraryItem[];
  nearbyAttractions: NearbyAttraction[];
}

export interface TripPlan {
  destination: string; // This will now be an overall trip title
  totalDays: number;
  estimatedBudget: string;
  dailyPlans: DailyPlan[];
}

export interface TripFormData {
  startCity: string;
  destinations: string[];
  startDate: string;
  endDate: string;
  budget: string;
  travelStyle: string;
}

export interface ClimateAnalysis {
  isIdeal: boolean;
  analysis: string;
  suggestedStartDate?: string;
  suggestedEndDate?: string;
}

export type Page = 'welcome' | 'setup' | 'upgrade' | 'visualization' | 'dayDetails' | 'about';
