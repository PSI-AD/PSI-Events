/**
 * traveldesk/types.ts
 * All TypeScript types and interfaces for the Corporate Travel Desk feature.
 */

export type AgentBookingStatus =
    | 'approved'      // Manager approved — awaiting flight search
    | 'searching'     // Agent opened search UI
    | 'confirmed'     // Flight booked + expense injected
    | 'rejected';     // Not attending

export interface ApprovedAgent {
    id: string;
    name: string;
    email: string;
    branch: string;
    tier: 'Gold' | 'Silver' | 'Bronze';
    status: AgentBookingStatus;
    bookedFlight?: FlightOption;
    bookedAt?: string;
    expenseRef?: string;
}

export interface FlightRoute {
    from: string;   // IATA e.g. DXB
    fromCity: string;
    to: string;     // IATA e.g. LHR
    toCity: string;
    date: string;   // ISO date
    returnDate?: string;
}

export interface TravelBudget {
    maxPerAgent: number;   // AED
    currency: 'AED';
}

export interface FlightOption {
    id: string;
    airline: string;
    airlineCode: string;  // e.g. EK
    flightNumber: string; // e.g. EK512
    logo: string;         // emoji fallback
    departure: string;    // HH:MM
    arrival: string;      // HH:MM
    durationMins: number;
    stops: 0 | 1 | 2;
    stopCity?: string;
    price: number;        // AED
    cabinClass: 'Economy' | 'Business';
    baggageKg: number;
    refundable: boolean;
    rating: number;       // 1-5
    seatsLeft: number;
}

export interface EventTravelConfig {
    eventId: string;
    eventName: string;
    route: FlightRoute;
    budget: TravelBudget;
    agents: ApprovedAgent[];
}
