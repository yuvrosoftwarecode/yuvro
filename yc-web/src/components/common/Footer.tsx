import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface FooterLink {
    label: string;
    to?: string;
}

interface FooterProps {
    variant?: 'marketing' | 'compact';
    compactLinks?: FooterLink[];
}

const DEFAULT_COUNTRY = 'United States';

const DEFAULT_COMPACT_LINKS: FooterLink[] = [
    { label: 'Help Center' },
    { label: 'Jobs', to: '/recruiter/jobs' },
    { label: 'Terms' },
    { label: 'Privacy Policy' }
];

const resolveCountryFromLocale = (): string => {
    if (typeof navigator === 'undefined') return DEFAULT_COUNTRY;

    const locale = navigator.languages?.[0] || navigator.language || 'en-US';
    let regionCode: string | undefined;

    try {
        const localeInfo = new Intl.Locale(locale);
        regionCode = localeInfo.region || localeInfo.maximize().region;
    } catch {
        const regionMatch = locale.match(/-([A-Za-z]{2})$/);
        regionCode = regionMatch?.[1]?.toUpperCase();
    }

    if (!regionCode) return DEFAULT_COUNTRY;

    try {
        const regionNames = new Intl.DisplayNames([locale], { type: 'region' });
        return regionNames.of(regionCode) || DEFAULT_COUNTRY;
    } catch {
        return DEFAULT_COUNTRY;
    }
};

const resolveCountryFromGeolocation = async (): Promise<string | null> => {
    if (typeof navigator === 'undefined' || !navigator.geolocation || !navigator.permissions) {
        return null;
    }

    try {
        const permission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        if (permission.state !== 'granted') return null;
    } catch {
        return null;
    }

    const position = await new Promise<GeolocationPosition | null>((resolve) => {
        navigator.geolocation.getCurrentPosition(
            (pos) => resolve(pos),
            () => resolve(null),
            { enableHighAccuracy: false, timeout: 4000, maximumAge: 300000 }
        );
    });

    if (!position) return null;

    try {
        const { latitude, longitude } = position.coords;
        const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
        );
        if (!response.ok) return null;

        const data = await response.json();
        return data?.countryName || null;
    } catch {
        return null;
    }
};

const Footer: React.FC<FooterProps> = ({ variant = 'marketing', compactLinks = DEFAULT_COMPACT_LINKS }) => {
    const year = new Date().getFullYear();
    const [country, setCountry] = useState(DEFAULT_COUNTRY);

    useEffect(() => {
        let cancelled = false;

        const detectCountry = async () => {
            const geoCountry = await resolveCountryFromGeolocation();
            const fallbackCountry = resolveCountryFromLocale();
            if (!cancelled) {
                setCountry(geoCountry || fallbackCountry);
            }
        };

        detectCountry();

        return () => {
            cancelled = true;
        };
    }, []);

    if (variant === 'compact') {
        return (
            <footer className="border-t border-gray-200 bg-white px-6 py-3">
                <div className="flex items-center gap-2 text-xs text-gray-600 whitespace-nowrap overflow-x-auto">
                    <span>{`Copyright \u00A9 ${year}`}</span>
                    <span>|</span>
                    <span>Empowering the next generation of developers</span>
                    {compactLinks.map((item, index) => (
                        <React.Fragment key={`${item.label}-${index}`}>
                            <span>|</span>
                            {item.to ? (
                                <Link to={item.to} className="hover:text-gray-900 transition-colors">
                                    {item.label}
                                </Link>
                            ) : (
                                <span>{item.label}</span>
                            )}
                        </React.Fragment>
                    ))}
                    <span>|</span>
                    <span className="text-gray-500">{country}</span>
                </div>
            </footer>
        );
    }

    return (
        <footer className="bg-gray-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="text-center">
                    <div className="text-2xl font-bold text-white mb-4">Yuvro Code</div>
                    <p className="text-gray-400 mb-8">
                        Empowering the next generation of developers
                    </p>
                    <div className="flex justify-center space-x-6">
                        <a href="#" className="text-gray-400 hover:text-white transition-colors">Contact</a>
                        <a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy</a>
                        <a href="#" className="text-gray-400 hover:text-white transition-colors">Terms</a>
                        <a href="#" className="text-gray-400 hover:text-white transition-colors">Support</a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
