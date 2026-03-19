import React from 'react';

const baseIconClass = 'text-3xl mb-2';

const ArrowIcon = (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5 mr-2"
        viewBox="0 0 20 20"
        fill="currentColor"
    >
        <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
        />
    </svg>
);

const MoonIcon = (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
        />
    </svg>
);

const SunIcon = (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
        />
    </svg>
);

export const ICONS = {
    adventure: <span className={baseIconClass}>🏔️</span>,
    culture: <span className={baseIconClass}>🏛️</span>,
    relaxation: <span className={baseIconClass}>🏖️</span>,
    foodie: <span className={baseIconClass}>🍽️</span>,
    days: <span className={baseIconClass}>📅</span>,
    stops: <span className={baseIconClass}>📍</span>,
    budget: <span className={baseIconClass}>💰</span>,
    backArrow: ArrowIcon,
    moon: MoonIcon,
    sun: SunIcon
};
